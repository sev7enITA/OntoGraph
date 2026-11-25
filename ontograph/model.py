"""Portable release payload, deterministic checks and graph projection."""

import hashlib
import json
import re
from datetime import datetime, timezone
from urllib.parse import quote

KINDS = {"concept", "class", "field", "process", "control", "contract", "application"}
RELATIONS = {"broader", "subClassOf", "mapsTo", "dependsOn", "implements", "consumes"}
DECISIONS = {"allow", "hold", "out_of_scope"}
RELATION_TYPES = {
    "broader": ({"concept"}, {"concept"}),
    "subClassOf": ({"class"}, {"class"}),
    "mapsTo": ({"field"}, {"concept", "class"}),
    "implements": ({"control"}, {"contract"}),
    "consumes": ({"application"}, {"contract"}),
}
EVIDENCE_STATES = {"confirmed", "disputed", "insufficient"}


class Rejected(ValueError):
    """An input or operation violates a declared governance condition."""


def require(condition, reason):
    if not condition:
        raise Rejected(reason)


def canonical(value):
    try:
        return json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":"))
    except (ValueError, TypeError) as error:
        raise Rejected("Value must be representable as finite JSON") from error


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def text_digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def identifier(value):
    require(isinstance(value, str) and re.fullmatch(r"[a-z][a-z0-9_-]{0,63}", value), "Invalid identifier")
    return value


def timestamp(value):
    require(isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", value),
            "Use UTC timestamps with second precision")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise Rejected("Invalid timestamp") from error


def utcnow():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def record(value, required, label, optional=()):
    require(type(value) is dict and set(required) <= value.keys() <= set(required) | set(optional),
            f"Invalid fields in {label}")
    return value


def nonempty(value, label):
    require(isinstance(value, str) and 0 < len(value.strip()) <= 8192, f"Missing or oversized {label}")
    return value


def indexed(items, label):
    require(type(items) is list and len(items) <= 2000, f"Invalid {label} list")
    out = {}
    for item in items:
        require(type(item) is dict, f"Invalid {label} record")
        key = identifier(item.get("id"))
        require(key not in out, f"Duplicate {label} ID: {key}")
        out[key] = item
    return out


def equal(left, right):
    return canonical(left) == canonical(right)


def evaluate(rule, facts):
    require(type(facts) is dict, "Probe facts must be an object")
    scope = rule["applies"]
    if not scope.keys() <= facts.keys():
        return "hold"
    if any(not equal(facts[key], value) for key, value in scope.items()):
        return "out_of_scope"
    return "allow" if all(key in facts and equal(facts[key], value)
                          for key, value in rule["requires"].items()) else "hold"


def acyclic(edges, predicate):
    adjacency = {}
    for edge in edges:
        if edge["predicate"] == predicate:
            adjacency.setdefault(edge["source"], set()).add(edge["target"])
            adjacency.setdefault(edge["target"], set())
    while adjacency:
        roots = {node for node, parents in adjacency.items() if not parents}
        require(roots, f"Cycle in {predicate}")
        adjacency = {node: parents - roots for node, parents in adjacency.items() if node not in roots}


def validate(document):
    record(document, ("format", "domain", "purpose", "owner", "scope", "effective_at",
                      "evidence", "nodes", "edges", "rules", "probes"), "release")
    require(document["format"] == "ontograph.release/1", "Unsupported release format")
    require(len(canonical(document).encode()) <= 2_000_000, "Release too large")
    identifier(document["domain"])
    nonempty(document["purpose"], "purpose")
    nonempty(document["owner"], "owner")
    nonempty(document["scope"], "scope")
    effective = timestamp(document["effective_at"])
    evidence = indexed(document["evidence"], "evidence")
    require(evidence, "At least one evidence record is required")
    for entry in evidence.values():
        record(entry, ("id", "uri", "excerpt", "sha256", "observed_at", "status", "applicability"), "evidence", ("upstream",))
        uri = nonempty(entry["uri"], "evidence URI")
        require(uri.startswith(("https://", "urn:")), "Evidence URI must use HTTPS or URN")
        require(text_digest(nonempty(entry["excerpt"], "excerpt")) == entry["sha256"], "Evidence checksum mismatch")
        require(timestamp(entry["observed_at"]) <= effective, "Evidence observed after effective time")
        require(entry["status"] in EVIDENCE_STATES, "Invalid evidence status")
        nonempty(entry["applicability"], "applicability finding")
        if "upstream" in entry:
            meta = record(entry["upstream"], ("provider", "id", "reported_sha256"), "upstream locator",
                          ("reported_snapshot_sha256",))
            nonempty(meta["provider"], "provider")
            nonempty(meta["id"], "upstream ID")
            for field in ("reported_sha256", "reported_snapshot_sha256"):
                if field in meta:
                    require(isinstance(meta[field], str) and re.fullmatch(r"[0-9a-f]{64}", meta[field]),
                            "Invalid upstream digest")
    nodes = indexed(document["nodes"], "node")
    for node in nodes.values():
        record(node, ("id", "kind", "label", "definition", "owner"), "node", ("aliases",))
        require(node["kind"] in KINDS, "Unknown node kind")
        for key in ("label", "definition", "owner"):
            nonempty(node[key], key)
        aliases = node.get("aliases", [])
        require(type(aliases) is list and len(aliases) <= 100, "Invalid aliases list")
        for alias in aliases:
            nonempty(alias, "alias")
    edges = document["edges"]
    require(type(edges) is list and len(edges) <= 4000, "Invalid edges list")
    triples = set()
    for edge in edges:
        record(edge, ("source", "predicate", "target"), "edge")
        left, right, relation = identifier(edge["source"]), identifier(edge["target"]), edge["predicate"]
        require(left in nodes and right in nodes and left != right, "Dangling reference or self edge")
        require(relation in RELATIONS and (left, relation, right) not in triples, "Invalid or duplicate edge")
        triples.add((left, relation, right))
        if relation in RELATION_TYPES:
            sources, targets = RELATION_TYPES[relation]
            require(nodes[left]["kind"] in sources and nodes[right]["kind"] in targets,
                    f"Invalid source or target for {relation}")
    acyclic(edges, "broader")
    acyclic(edges, "subClassOf")

    rules = indexed(document["rules"], "rule")
    for rule in rules.values():
        record(rule, ("id", "control", "evidence", "applies", "requires"), "rule")
        require(nodes.get(identifier(rule["control"]), {}).get("kind") == "control", "Rule requires a control")
        require(identifier(rule["evidence"]) in evidence, "Rule requires an evidence reference")
        require(type(rule["applies"]) is dict and type(rule["requires"]) is dict and rule["requires"],
                "Rule requires explicit scope and conditions")
        for key in rule["applies"].keys() | rule["requires"].keys():
            require(nodes.get(key, {}).get("kind") == "field", "Rule facts require declared field IDs")
        require(not (rule["applies"].keys() & rule["requires"].keys()),
                "Scope and requirements must refer to distinct fields")

    applications = {key for key, node in nodes.items() if node["kind"] == "application"}
    require(applications and rules, "Release requires applications and rules")
    decisions = {(app, rule["id"]): set() for app in applications
                 for rule in consumer_bundle(document, app)["rules"]}
    require({app for app, _ in decisions} == applications, "Every application requires a governed contract")
    for probe in indexed(document["probes"], "probe").values():
        record(probe, ("id", "application", "rule", "facts", "expected"), "probe")
        app, rule_id = identifier(probe["application"]), identifier(probe["rule"])
        require((app, rule_id) in decisions, "Probe rule is not delivered to this application")
        require(type(probe["facts"]) is dict and all(nodes.get(key, {}).get("kind") == "field"
                                                    for key in probe["facts"]), "Unknown probe fact field")
        expected = probe["expected"]
        require(expected in DECISIONS and evaluate(rules[rule_id], probe["facts"]) == expected,
                f"Probe contradicts rule: {probe['id']}")
        decisions[app, rule_id].add(expected)
    for (app, rule_id), covered in decisions.items():
        require({"allow", "hold"} <= covered, f"Missing positive or negative probe for {app}/{rule_id}")
    return document


def verify_discrimination(before, after):
    if before is None:
        return
    for app in {probe["application"] for probe in after["probes"]}:
        old = indexed(consumer_bundle(before, app)["rules"], "old rule")
        new = indexed(consumer_bundle(after, app)["rules"], "new rule")
        changed = {key for key in old.keys() & new.keys()
                   if any(old[key][field] != new[key][field] for field in ("applies", "requires"))}
        for key in changed:
            require(any(probe["application"] == app and probe["rule"] == key
                        and evaluate(old[key], probe["facts"]) != probe["expected"]
                        for probe in after["probes"]),
                    f"Changed rule requires a version-discriminating probe for {app}/{key}")


def consumer_bundle(document, application):
    contracts = {edge["target"] for edge in document["edges"]
                 if edge["source"] == application and edge["predicate"] == "consumes"}
    controls = {edge["source"] for edge in document["edges"]
                if edge["predicate"] == "implements" and edge["target"] in contracts}
    return {"application": application, "effective_at": document["effective_at"],
            "rules": [rule for rule in document["rules"] if rule["control"] in controls]}


def impact(before, after):
    left = before or {key: [] for key in ("nodes", "edges", "rules", "evidence", "probes")}
    seeds = set()
    for group, anchor in (("nodes", "id"), ("rules", "control"), ("probes", "application")):
        old, new = indexed(left[group], group), indexed(after[group], group)
        for key in old.keys() | new.keys():
            if old.get(key) != new.get(key):
                seeds.update(item[anchor] for item in (old.get(key), new.get(key)) if item)
    old_edges = {(x["source"], x["predicate"], x["target"]) for x in left["edges"]}
    new_edges = {(x["source"], x["predicate"], x["target"]) for x in after["edges"]}
    for source, _, target in old_edges ^ new_edges:
        seeds.update((source, target))
    if left["evidence"] != after["evidence"] or any(left.get(key) != after[key]
                                                  for key in ("purpose", "owner", "scope", "effective_at")):
        seeds.update(rule["control"] for state in (left, after) for rule in state["rules"])
    affected = set(seeds)
    while True:
        next_set = affected | {source for source, predicate, target in old_edges | new_edges
                               if target in affected and predicate in {"dependsOn", "consumes", "mapsTo"}} | {
            target for source, predicate, target in old_edges | new_edges
            if source in affected and predicate == "implements"
        }
        if next_set == affected:
            return sorted(affected)
        affected = next_set


def jsonld(document, workspace, release_digest):
    prefix = f"urn:ontograph:{quote(workspace, safe='')}:"
    context = {
        "og": "https://github.com/sev7enITA/OntoGraph#",
        "skos": "http://www.w3.org/2004/02/skos/core#",
        "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
        "owl": "http://www.w3.org/2002/07/owl#",
        "prov": "http://www.w3.org/ns/prov#",
        "dct": "http://purl.org/dc/terms/",
    }
    labels = {"concept": "skos:Concept", "class": "owl:Class"}
    predicates = {"broader": "skos:broader", "subClassOf": "rdfs:subClassOf"}
    graph = {}
    scheme = {"@id": prefix + "scheme", "@type": "skos:ConceptScheme",
              "dct:title": document["domain"]}
    for node in document["nodes"]:
        graph[node["id"]] = {"@id": prefix + "node:" + node["id"],
                             "@type": labels.get(node["kind"], "og:" + node["kind"].title()),
                             "skos:prefLabel": node["label"], "skos:definition": node["definition"],
                             "skos:altLabel": node.get("aliases", []), "og:owner": node["owner"]}
        if node["kind"] == "concept":
            graph[node["id"]]["skos:inScheme"] = {"@id": scheme["@id"]}
    for edge in document["edges"]:
        property_id = predicates.get(edge["predicate"], "og:" + edge["predicate"])
        graph[edge["source"]].setdefault(property_id, []).append({"@id": graph[edge["target"]]["@id"]})
    sources = [{"@id": prefix + "evidence:" + digest(item), "@type": "prov:Entity",
                "dct:source": {"@id": item["uri"]}, "og:sha256": item["sha256"],
                "og:status": item["status"],
                **({"og:upstreamReportedSha256": item["upstream"]["reported_sha256"]}
                   if "upstream" in item else {})} for item in document["evidence"]]
    release = {"@id": prefix + "release:" + release_digest, "@type": "prov:Entity",
               "prov:wasDerivedFrom": [{"@id": source["@id"]} for source in sources],
               "og:sha256": release_digest}
    return {"@context": context, "@graph": [release, scheme, *graph.values(), *sources]}
