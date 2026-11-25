"""Synthetic WBS releases with native department-specific meaning and disputed evidence."""
from ontograph.model import assertion_basis, text_digest

EFFECTIVE = "2026-11-25T12:00:00Z"


def model(strict=False, adjudicated=False):
    def source(key, excerpt):
        return {"id": key, "uri": "urn:example:wbs-pilot:" + key, "excerpt": excerpt,
                "sha256": text_digest(excerpt), "observed_at": "2026-11-25T09:00:00Z",
                "status": "confirmed", "applicability": "Synthetic accounting and planning reports only."}

    evidence = [source("finance-note", "In the training ledger the recognized code 0017 is used as a posting object."),
                source("pmo-note", "The same code 0017 can name a PMO work package. A bare code does not establish the department."),
                source("policy", "Eligibility requires a known code" +
                       (" and its department-qualified mapping." if strict else "."))]
    nodes = (
        ("wbs", "concept", "Department-scoped WBS identifier", "Data steward"),
        ("known", "field", "Recognized four-character code", "Finance"),
        ("qualified", "field", "Department matches source-specific mapping", "PMO"),
        ("staging", "control", "Eligibility for this training report", "Controller"),
        ("admission", "contract", "WBS admission decision", "Controller"),
        ("finance", "application", "Beancount close report", "Finance"),
        ("pmo", "application", "LibreOffice Calc work-package budget", "PMO"))
    assertions = [
        {"id": "finance-local", "confidence": 0.85, "criticality": 4, "evidence": "finance-note",
         "assessor": "Finance analyst", "asserted_at": "2026-11-25T10:00:00Z", "stance": "supports",
         "rationale": "Use the recognized code in its ledger context. Keep the source department."},
        {"id": "pmo-dissent", "confidence": 0.30, "criticality": 5, "evidence": "pmo-note",
         "assessor": "PMO analyst", "asserted_at": "2026-11-25T10:30:00Z", "stance": "challenges",
         "rationale": "An unqualified 0017 can be a work package instead of a posting object."}]
    def edge(left, rel, right):
        return {"source": left, "predicate": rel, "target": right, "assessment": {
            "confidence": 0.95, "criticality": 4, "evidence": "policy", "assessor": "Control owner",
            "rationale": "The training contract names the two reports consuming this decision."}}
    edges = [edge("known", "mapsTo", "wbs"), edge("staging", "dependsOn", "known"),
             edge("staging", "implements", "admission"), edge("finance", "consumes", "admission"),
             edge("pmo", "consumes", "admission")]
    if strict:
        edges.append(edge("staging", "dependsOn", "qualified"))
        target = edges[0]
        del target["assessment"]
        target["assertions"] = assertions
        if adjudicated:
            basis = assertion_basis(target, {entry["id"]: entry for entry in evidence})
            target["resolution"] = {"selected": "finance-local", "reviewer": "steward",
                "rationale": "Accept Finance's mapping only with source-specific department qualification. The stricter rule holds bare codes for both applications.",
                "resolved_at": "2026-11-25T11:30:00Z", "basis": basis}
    requires = {"known": True, "qualified": True} if strict else {"known": True}
    cases = (("qualified", True, True, "allow"), ("legacy", True, False, "hold" if strict else "allow"),
             ("unknown", False, True, "hold"))
    return {"format": "ontograph.release/1", "domain": "wbs-dual-app", "purpose": "Test WBS decision delivery and withdrawal.",
            "scope": "Isolated training ledgers and budgets. No external customer records.",
            "effective_at": EFFECTIVE, "owner": "Finance and PMO",
            "nodes": [{"id": key, "kind": kind, "label": label, "definition": label, "owner": owner}
                      for key, kind, label, owner in nodes], "edges": edges, "evidence": evidence,
            "required_assessment_origins": ["wbs"],
            "rules": [{"id": "admit-row", "control": "staging", "evidence": "policy", "applies": {}, "requires": requires}],
            "probes": [{"id": f"{app}-{name}", "application": app, "rule": "admit-row",
                        "facts": {"known": known, "qualified": qualified}, "expected": expected}
                       for app in ("finance", "pmo") for name, known, qualified, expected in cases]}
