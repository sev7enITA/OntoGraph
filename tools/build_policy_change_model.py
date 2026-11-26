"""Rebuild the importable training model derived from the integration pilot.

Run python3 -m tools.build_policy_change_model from the repository root. All
source text and identifiers in the packaged model are synthetic.
"""
import json
from pathlib import Path

from examples.hub_pilot.run import release_model
from ontograph.model import text_digest, validate


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "site/journey/models/policy-change.json"
TIME = "2026-11-25T12:00:00Z"
CHANGE = "training-policy-change"


def evidence(id_, excerpt):
    return {
        "id": id_,
        "uri": f"urn:ontograph:training:policy-change:{id_}",
        "excerpt": excerpt,
        "sha256": text_digest(excerpt),
        "observed_at": TIME,
        "status": "confirmed",
        "applicability": "Verified only against this fictional training scenario.",
    }


def model():
    draft = evidence("training-monitoring", "A fictional service now retains support transcripts for 30 days.")
    review = evidence("palo-measure", "Review the source and evidence before deciding how to handle a monitoring signal.")
    gate = {"label": "Measure review (training)", "purpose": review["excerpt"],
            "requiredControlIds": ["ctrl-decision-trace"]}
    signal = {"suggestedHandoff": {"reviewGateIds": ["measure"]}}
    release = release_model({**draft, "upstream": {"id": CHANGE}}, gate, signal, TIME)
    release.update(
        domain="policy-change-training",
        owner="Training reviewer",
        purpose="Route a fictional PolicyWatcher-style observation to a PALO-style human review queue.",
        scope="Synthetic training only. A matching observation is eligible for review.",
        evidence=[draft, review],
    )
    return validate(release)


if __name__ == "__main__":
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(model(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
