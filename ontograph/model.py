"""Portable release payload, deterministic checks and graph projection."""

import hashlib
import json
import re
from collections import defaultdict, deque
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
# A change propagates from the dependency to its dependent, or from a control
# to the contract it implements. Hierarchy links do not imply runtime impact.
IMPACT_REVERSE = {"dependsOn", "consumes", "mapsTo"}
IMPACT_MAX_DEPTH = 12
IMPACT_MAX_PATHS = 256
MAX_REQUIRED_ORIGINS = 8
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
                      "evidence", "nodes", "edges", "rules", "probes"), "release", ("required_assessment_origins",))
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
    origins = document.get("required_assessment_origins", [])
    require(type(origins) is list and len(origins) <= MAX_REQUIRED_ORIGINS,
            f"Required assessment origins must be a list of at most {MAX_REQUIRED_ORIGINS} node IDs")
    for origin in origins:
        require(identifier(origin) in nodes, "Required assessment origin must name an existing node")
    require(len(set(origins)) == len(origins), "Duplicate required assessment origin")
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
        record(edge, ("source", "predicate", "target"), "edge", ("assessment",))
        left, right, relation = identifier(edge["source"]), identifier(edge["target"]), edge["predicate"]
        require(left in nodes and right in nodes and left != right, "Dangling reference or self edge")
        require(relation in RELATIONS and (left, relation, right) not in triples, "Invalid or duplicate edge")
        triples.add((left, relation, right))
        if "assessment" in edge:
            assessment = record(edge["assessment"], ("confidence", "criticality", "evidence", "rationale", "assessor"),
                                "edge assessment")
            confidence, criticality = assessment["confidence"], assessment["criticality"]
            require(type(confidence) in (float, int) and 0 <= confidence <= 1,
                    "Edge confidence must be a number from 0 through 1")
            require(type(criticality) is int and 1 <= criticality <= 5,
                    "Edge criticality must be an integer from 1 through 5")
            require(identifier(assessment["evidence"]) in evidence, "Edge assessment requires an evidence reference")
            nonempty(assessment["rationale"], "edge assessment rationale")
            nonempty(assessment["assessor"], "edge assessor")
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


def edge_key(edge):
    return edge["source"], edge["predicate"], edge["target"]


def impact_adjacency(triples):
    adjacency = defaultdict(list)
    for triple in sorted(triples):
        source, predicate, target = triple
        if predicate in IMPACT_REVERSE:
            adjacency[target].append((source, triple))
        elif predicate == "implements":
            adjacency[source].append((target, triple))
    return adjacency


def impact(before, after):
    left = before or {key: [] for key in ("nodes", "edges", "rules", "evidence", "probes")}
    seeds = set(left.get("required_assessment_origins", [])) ^ set(after.get("required_assessment_origins", []))
    for group, anchor in (("nodes", "id"), ("rules", "control"), ("probes", "application")):
        old, new = indexed(left[group], group), indexed(after[group], group)
        for key in old.keys() | new.keys():
            if old.get(key) != new.get(key):
                seeds.update(item[anchor] for item in (old.get(key), new.get(key)) if item)
    old = {edge_key(edge): edge.get("assessment") for edge in left["edges"]}
    new = {edge_key(edge): edge.get("assessment") for edge in after["edges"]}
    edges = old.keys() | new.keys()
    previous = indexed(left["evidence"], "evidence")
    current = indexed(after["evidence"], "evidence")
    changed_evidence = {key for key in previous.keys() | current.keys() if previous.get(key) != current.get(key)}
    for triple in edges:
        annotations = (old.get(triple), new.get(triple))
        if (triple not in old or triple not in new or not equal(*annotations)
                or any(a and a["evidence"] in changed_evidence for a in annotations)):
            seeds.update((triple[0], triple[2]))
    if left["evidence"] != after["evidence"] or any(left.get(key) != after[key]
                                                  for key in ("purpose", "owner", "scope", "effective_at")):
        seeds.update(rule["control"] for state in (left, after) for rule in state["rules"])
    affected = set(seeds)
    pending = list(seeds)
    adjacency = impact_adjacency(edges)
    while pending:
        for target, _ in adjacency[pending.pop()]:
            if target not in affected:
                affected.add(target)
                pending.append(target)
    return sorted(affected)


def edge_reference(triple):
    source, predicate, target = triple
    return {"source": source, "predicate": predicate, "target": target}


def impact_coverage(origin, adjacency, assessments, evidence):
    """Count unique reachable edges, including cycle closures and undrawn routes."""
    pending, seen = [origin], {origin}
    reachable = []
    while pending:
        for dependent, triple in adjacency[pending.pop()]:
            reachable.append(triple)
            if dependent not in seen:
                seen.add(dependent)
                pending.append(dependent)
    missing, review, criticalities = [], [], []
    for triple in sorted(reachable):
        a = assessments[triple]
        if a is None:
            missing.append(triple)
        else:
            criticalities.append(a["criticality"])
            if evidence[a["evidence"]]["status"] != "confirmed":
                review.append(triple)
    first_review = None
    if review:
        first_review = {**edge_reference(review[0]), "evidence": assessments[review[0]]["evidence"]}
    return {"reachable_nodes": len(seen) - 1, "reachable_edges": len(reachable),
            "unassessed_edges": len(missing), "review_edges": len(review),
            "max_known_criticality": max(criticalities, default=None),
            "first_unassessed": edge_reference(missing[0]) if missing else None,
            "first_review_required": first_review}


def weighted_impact(document, node_id):
    """Explain bounded, directed dependency paths from a changed node.

    Each simple path prefix reports the highest known criticality, and minimum
    confidence only when every step was assessed. Neither is a probability of
    loss. Steps retain the source orientation of the ontology. A disputed or
    insufficient source overrides the path status to review_required; missing
    annotations are counted independently. Enumeration is breadth first with
    lexical edge tie breaks; truncated means the displayed paths are partial.
    """
    validate(document)
    require(identifier(node_id) in {n["id"] for n in document["nodes"]}, "Unknown impact origin")
    return _weighted_impact(document, node_id)


def _weighted_impact(document, node_id):
    assessments = {edge_key(edge): edge.get("assessment") for edge in document["edges"]}
    evidence = indexed(document["evidence"], "evidence")
    adjacency = impact_adjacency(assessments)
    pending = deque([([node_id], [])])
    paths = []
    shown = set()
    truncated = False
    while pending:
        nodes, steps = pending.popleft()
        for target, triple in adjacency[nodes[-1]]:
            if target in nodes:
                continue
            if len(steps) >= IMPACT_MAX_DEPTH:
                truncated = True
                break
            if len(paths) >= IMPACT_MAX_PATHS:
                truncated = True
                pending.clear()
                break
            shown.add(triple)
            trail = steps + [triple]
            route = nodes + [target]
            known = [assessments[key] for key in trail if assessments[key] is not None]
            missing = len(trail) - len(known)
            review = sorted({a["evidence"] for a in known if evidence[a["evidence"]]["status"] != "confirmed"})
            status = "unassessed" if missing else "assessed"
            paths.append({"nodes": route,
                          "steps": [edge_reference(step) for step in trail],
                          "criticality": max((a["criticality"] for a in known), default=None),
                          "confidence": None if missing else min(a["confidence"] for a in known),
                          "status": "review_required" if review else status,
                          "unassessed_edges": missing, "review_evidence": review})
            pending.append((route, trail))
    # Flag the limits explicitly: sorting the returned paths cannot rank any
    # possible omitted routes. Never impute zero confidence for a missing value.
    paths.sort(key=lambda p: (-(p["criticality"] or 0), p["confidence"] is not None,
                              p["confidence"] if p["confidence"] is not None else 0, p["nodes"]))
    metadata = []
    for triple in sorted(shown):
        a = assessments[triple]
        if a is not None:
            source = evidence[a["evidence"]]
            metadata.append({**edge_reference(triple), "assessment": dict(a),
                             "status": source["status"], "observed_at": source["observed_at"]})
    result = {"origin": node_id, "paths": paths, "truncated": truncated, "assessments": metadata,
              "coverage": impact_coverage(node_id, adjacency, assessments, evidence),
              "limits": {"max_depth": IMPACT_MAX_DEPTH, "max_paths": IMPACT_MAX_PATHS},
              "required": node_id in document.get("required_assessment_origins", [])}
    result["assessment_issue"] = _assessment_issue(result)
    return result


def _assessment_issue(result):
    origin = result["origin"]
    if not result["paths"]:
        return f"Assessment origin {origin} has no operational impact path"
    if result["truncated"]:
        return f"Impact path limits reached at {origin}; narrow or revise the mandatory scope"
    missing = result["coverage"]["first_unassessed"]
    if missing:
        return (f"Required assessment from {origin} is missing on "
                f"{missing['source']} {missing['predicate']} {missing['target']}")
    contested = result["coverage"]["first_review_required"]
    if contested:
        return (f"Required assessment from {origin} references unconfirmed evidence {contested['evidence']} "
                f"on {contested['source']} {contested['predicate']} {contested['target']}")
    return None


def check_required_assessments(document):
    """Reject incomplete mandatory impact scopes before publication or OPA export."""
    origins = document.get("required_assessment_origins", [])
    if origins == []:
        return
    validate(document)
    for origin in sorted(origins):
        issue = _weighted_impact(document, origin)["assessment_issue"]
        if issue:
            raise Rejected(issue)


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
    assessments = []
    evidence_ids = {item["id"]: prefix + "evidence:" + digest(item) for item in document["evidence"]}
    for edge in document["edges"]:
        property_id = predicates.get(edge["predicate"], "og:" + edge["predicate"])
        subject = {"@id": graph[edge["source"]]["@id"]}
        target = {"@id": graph[edge["target"]]["@id"]}
        graph[edge["source"]].setdefault(property_id, []).append(target)
        if "assessment" in edge:
            a = edge["assessment"]
            assessments.append({
                "@id": prefix + "assessment:" + digest([release_digest, *edge_key(edge)]),
                "@type": ["rdf:Statement", "og:RelationshipAssessment"],
                "rdf:subject": subject, "rdf:predicate": {"@id": property_id}, "rdf:object": target,
                "og:confidence": a["confidence"], "og:criticality": a["criticality"],
                "og:rationale": a["rationale"], "og:assessor": a["assessor"],
                "prov:wasDerivedFrom": {"@id": evidence_ids[a["evidence"]]},
            })
    sources = [{"@id": evidence_ids[item["id"]], "@type": "prov:Entity",
                "dct:source": {"@id": item["uri"]}, "og:sha256": item["sha256"],
                "og:status": item["status"],
                **({"og:upstreamReportedSha256": item["upstream"]["reported_sha256"]}
                   if "upstream" in item else {})} for item in document["evidence"]]
    release = {"@id": prefix + "release:" + release_digest, "@type": "prov:Entity",
               "prov:wasDerivedFrom": [{"@id": source["@id"]} for source in sources],
               "og:sha256": release_digest}
    if document.get("required_assessment_origins"):
        release["og:requiredAssessmentOrigin"] = [
            {"@id": graph[origin]["@id"]} for origin in document["required_assessment_origins"]]
    if assessments:
        context["rdf"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
        release["og:assessment"] = [{"@id": item["@id"]} for item in assessments]
    return {"@context": context, "@graph": [release, scheme, *graph.values(), *sources, *assessments]}
