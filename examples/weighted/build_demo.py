"""Build the public what-if snapshots from the same Python analyzer used by Studio."""
import hashlib
import json
from copy import deepcopy
from pathlib import Path

from ontograph.model import Rejected, check_required_assessments, digest, weighted_impact

ROOT = Path(__file__).resolve().parents[2]
DESTINATION = ROOT / "site" / "weights"
ENTRY = "posting-object"


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def build():
    initial = json.loads((ROOT / "examples/weighted/finance-close.json").read_text())
    for scenario in ("initial", "corroborated", "missing", "disputed", "complete"):
        model = deepcopy(initial)
        edge = next(edge for edge in model["edges"] if edge["source"] == "ledger-wbs")
        if scenario in ("corroborated", "complete"):
            source = deepcopy(next(item for item in model["evidence"] if item["id"] == "finance-sample"))
            excerpt = "In this training scenario Finance reconciled old and new project formats against the ledger."
            source.update(id="finance-reconciliation", uri="urn:example:wbs-finance:reconciliation",
                          excerpt=excerpt, sha256=hashlib.sha256(excerpt.encode()).hexdigest())
            model["evidence"].append(source)
            edge["assessment"].update(confidence=0.95, evidence=source["id"],
                                      rationale="Legacy and current formats reconciled in the synthetic sample.")
        elif scenario == "missing":
            del edge["assessment"]
        elif scenario == "disputed":
            next(item for item in model["evidence"] if item["id"] == "finance-sample")["status"] = "disputed"
        if scenario == "complete":
            worksheet = next(edge for edge in model["edges"] if edge["source"] == "local-reconciliation")
            worksheet["assessment"] = dict(confidence=0.80, criticality=3, evidence="worksheet-review",
                                           assessor="Finance operations",
                                           rationale="The reconciliation team documented its fallback.")
            record = deepcopy(model["evidence"][-1])
            excerpt = "The synthetic worksheet owner reviewed the WBS dependency and recorded a manual fallback."
            record.update(id="worksheet-review", uri="urn:example:wbs-finance:worksheet",
                          excerpt=excerpt, sha256=hashlib.sha256(excerpt.encode()).hexdigest())
            model["evidence"].append(record)
        try:
            check_required_assessments(model)
            gate = {"complete": True}
        except Rejected as error:
            gate = {"complete": False, "reason": str(error)}
        report = weighted_impact(model, ENTRY)
        write_json(DESTINATION / (scenario + "-model.json"), model)
        write_json(DESTINATION / (scenario + "-report.json"), {"model_sha256": digest(model), "assessment_gate": gate, **report})


if __name__ == "__main__":
    build()
