"""Reproducible Aurora 21 scenario with two simulated applications."""

from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory

from .model import digest, evaluate, text_digest
from .store import Registry, verify_events

NOW = "2026-11-25T16:00:00Z"


def example(version=2):
    def node(key, kind, label, definition):
        return {"id": key, "kind": kind, "label": label, "definition": definition,
                "owner": "Technical due diligence"}

    def edge(source, predicate, target):
        return {"source": source, "predicate": predicate, "target": target}

    source = ("A technical declaration is sufficient for a building dossier."
              if version == 1 else
              "A building dossier requires both a technical declaration and an inspection report.")
    requirements = {"declaration": True}
    if version == 2:
        requirements["inspection"] = True
    nodes = [
        node("asset", "concept", "Property asset", "Umbrella concept for property assets"),
        node("building", "concept", "Building", "A complete physical building"),
        node("unit", "concept", "Property unit", "A distinct occupiable unit"),
        node("asset-record", "class", "Asset record", "Class of asset records"),
        node("building-record", "class", "Building record", "Class of building dossier records"),
        node("asset-type", "field", "Asset type", "Classification of the dossier subject"),
        node("crm-property", "field", "CRM.property", "Identifier in CRM that denotes a building"),
        node("pms-unit", "field", "PMS.unit", "Identifier in PMS that denotes a unit"),
        node("declaration", "field", "Technical declaration", "Boolean presence of declaration"),
        node("inspection", "field", "Inspection report", "Boolean presence of inspection report"),
        node("diligence", "process", "Due diligence", "Assess an evidence dossier"),
        node("dossier-check", "control", "Evidence completeness", "Evaluates the dossier under the selected scope"),
        node("dossier-contract", "contract", "Dossier decision", "allow, hold or out_of_scope"),
        node("crm", "application", "CRM", "Consumes the dossier decision"),
        node("pms", "application", "PMS", "Consumes the dossier decision"),
    ]
    edges = [
        edge("building", "broader", "asset"), edge("unit", "broader", "asset"),
        edge("building-record", "subClassOf", "asset-record"),
        edge("crm-property", "mapsTo", "building"), edge("pms-unit", "mapsTo", "unit"),
        edge("dossier-check", "dependsOn", "building"), edge("dossier-check", "dependsOn", "inspection"),
        edge("diligence", "dependsOn", "dossier-check"), edge("dossier-check", "implements", "dossier-contract"),
        edge("crm", "consumes", "dossier-contract"), edge("pms", "consumes", "dossier-contract"),
    ]
    tests = [
        ("positive", {"asset-type": "building", "declaration": True, "inspection": True}, "allow"),
        ("negative", {"asset-type": "building", "declaration": True, "inspection": False},
         "hold" if version == 2 else "allow"),
        ("incomplete", {"asset-type": "building", "declaration": False, "inspection": False}, "hold"),
        ("exception", {"asset-type": "unit", "declaration": True, "inspection": False}, "out_of_scope"),
    ]
    return {"format": "ontograph.release/1", "domain": "aurora-21",
            "purpose": "Check evidence completeness for building dossiers",
            "owner": "Technical due diligence", "scope": "Synthetic dataset. Building due diligence.",
            "effective_at": "2026-11-25T15:00:00Z",
            "evidence": [{"id": "diligence-rule", "uri": f"urn:aurora-21:policy:diligence:v{version}",
                          "excerpt": source, "sha256": text_digest(source), "observed_at": "2026-11-25T12:00:00Z",
                          "status": "confirmed", "applicability": "Applies to buildings within the synthetic domain"}],
            "nodes": nodes, "edges": edges,
            "rules": [{"id": "evidence-present", "control": "dossier-check", "evidence": "diligence-rule",
                       "applies": {"asset-type": "building"}, "requires": requirements}],
            "probes": [{"id": f"{app}-{name}", "application": app, "rule": "evidence-present",
                        "facts": facts, "expected": expected}
                       for app in ("crm", "pms") for name, facts, expected in tests]}


def prepare(db):
    tokens = {"admin": db.initialize("aurora-21", "local-admin")}
    for actor, role, app in [
        ("author", "author", None), ("steward", "reviewer", None), ("owner", "reviewer", None),
        ("publisher", "publisher", None), ("observer", "observer", None), ("supervisor", "supervisor", None),
        ("auditor", "auditor", None), ("crm", "consumer", "crm"), ("pms", "consumer", "pms"),
    ]:
        tokens[actor] = db.add_principal(tokens["admin"], actor, role, app)
    return tokens


def run():
    with TemporaryDirectory() as folder:
        db = Registry(Path(folder) / "aurora.sqlite", clock=lambda: NOW)
        tokens = prepare(db)
        steps = []

        def release(payload, base, reason):
            candidate = db.propose(tokens["author"], payload, base, ["steward", "owner"], 2, reason)
            for person in ("steward", "owner"):
                db.review(tokens[person], candidate, "approve", "Approved for this synthetic scenario")
            return db.publish(tokens["publisher"], candidate, base), candidate

        def capture(activation, app, phase, probe, reported, actual):
            artifact = {"scenario": "synthetic", "activation": activation, "application": app,
                        "phase": phase, "probe": probe, "reported": reported, "outcome": actual}
            db.observe(tokens["observer"], activation, app, phase, probe, reported, actual, NOW,
                       "urn:aurora-21:fixture:" + digest(artifact), digest(artifact))
            steps.append({"event": "observation", "artifact": artifact, "sha256": digest(artifact)})

        def exercise(activation, payload, stale_pms=False):
            for app in ("crm", "pms"):
                delivered = db.consumer_release(tokens[app])
                declared = delivered["delivery_sha256"]
                db.acknowledge(tokens[app], activation, "activate", declared)
                old_rules = example(1)["rules"]
                rules = old_rules if app == "pms" and stale_pms else delivered["payload"]["rules"]
                runtime = {rule["id"]: deepcopy(rule) for rule in rules}
                for probe in payload["probes"]:
                    if probe["application"] == app:
                        result = evaluate(runtime[probe["rule"]], probe["facts"])
                        capture(activation, app, "activate", probe["id"], declared, result)
            return db.status(tokens["auditor"])

        def withdraw(activation, simulate_timeout=False):
            db.withdraw(tokens["supervisor"], activation, "Reconcile active version before the next release")
            intermediate = None
            for app in ("crm", "pms"):
                delivery = db.consumer_release(tokens[app])
                assert delivery["phase"] == "withdraw" and delivery["payload"] is None
                if app == "pms" and simulate_timeout:
                    capture(activation, app, "withdraw", "withdrawal", None, "unobservable")
                    intermediate = db.status(tokens["auditor"])
                db.acknowledge(tokens[app], activation, "withdraw", None)
                capture(activation, app, "withdraw", "withdrawal", None, "inactive")
            return intermediate, db.status(tokens["auditor"])

        v1, candidate1 = release(example(1), 0, "Baseline evidence requirement")
        baseline = exercise(v1, example(1))
        withdraw(v1)
        v2, candidate2 = release(example(), v1, "Add inspection report for buildings")
        drift = exercise(v2, example(), stale_pms=True)
        unreachable, withdrawn = withdraw(v2, simulate_timeout=True)
        v3, candidate3 = release(example(1), v2, "Restore the approved baseline after review of the mismatch")
        restored = exercise(v3, example(1))
        ledger = db.events(tokens["auditor"])
        return {"scenario": "Aurora 21 (synthetic)", "baseline": baseline, "drift": drift,
                "unreachable": unreachable, "withdrawn": withdrawn, "restored": restored,
                "releases": [db.export(tokens["auditor"], key) for key in (candidate1, candidate2, candidate3)],
                "observations": steps, "audit": ledger, "ledger_tip": verify_events(ledger)}


def summary(report):
    return {phase: {row["application"]: row["state"] for row in report[phase]["applications"]}
            for phase in ("baseline", "drift", "unreachable", "withdrawn", "restored")}
