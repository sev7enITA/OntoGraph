"""Optional pilot receiver. Run from the repository root with -m examples.hub_pilot.palo."""

import argparse
import hashlib
import io
import json
from datetime import timedelta
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from ontograph.__main__ import load
from ontograph.exchange import verify_release
from ontograph.model import digest, require, timestamp


def read(path):
    with path.open(encoding="utf-8") as stream:
        return load(stream)


def verify_admission(release, status, signal, artifact_bytes):
    """Bind this signal's dictionary fields to the observed admission at the recorded pilot time."""
    app_id = "review-intake"
    app = next((row for row in status["applications"] if row["application"] == app_id), None)
    require(app and app["state"] == "verified", "Intake observations are incomplete")
    scoped_digest = release["manifest"]["deliveries"][app_id]
    require(app["receipt"] and app["receipt"]["actual_digest"] == scoped_digest, "Scoped receipt mismatch")
    check = next((probe for probe in app["probes"] if probe["probe"] == "matched"), None)
    require(check and check["result"] == "verified" and check["expected"] == "allow"
            and check["observation"], "Missing independently observed intake admission")
    observed = check["observation"]
    checksum = hashlib.sha256(artifact_bytes).hexdigest()
    require(observed["artifact_sha256"] == checksum and observed["artifact_ref"] == "urn:sha256:" + checksum,
            "Intake observation artifact digest mismatch")
    artifact = load(io.BytesIO(artifact_bytes))
    require(artifact["case"] == check["probe"] and artifact["synthetic_mutation"] is False,
            "The review requires the observed, original signal case")
    require(artifact.get("signal_sha256") == digest(signal),
            "Presented signal differs from the full observed signal")
    result = artifact["response"]
    require(result["signal_id"] == signal["signalId"] and result["release"] == release["release"]
            and result["activation"] == observed["activation"] == status["activation"]
            and result["delivery_sha256"] == observed["actual_digest"] == scoped_digest
            and result["outcome"] == observed["actual_outcome"] == "allow"
            and result["native_valid"] is True and result["review_status"] == "pending-human-review",
            "The signal, activation or review outcome differs from the observation")
    fields = {}
    for node in release["payload"]["nodes"]:
        if node["kind"] == "field":
            pointer = node["aliases"][0]
            require(pointer.startswith("/"), "Invalid pilot dictionary path")
            value = signal
            for key in pointer[1:].split("/"):
                require(type(value) is dict and key in value, "Required signal field is missing")
                value = value[key]
            fields[node["id"]] = value
    declared = next(p for p in release["payload"]["probes"]
                    if p["id"] == check["probe"] and p["application"] == app_id)
    require(fields == result["facts"] == declared["facts"], "Signal facts differ from admitted probe facts")


def project_case(release, status, signal, artifact_bytes):
    release_id = verify_release(release)
    payload = release["payload"]
    require(status["release"] == release_id and status["manifest"] == release["manifest"],
            "Registry status and frozen release differ")
    require(type(status["activation"]) is int and status["activation"] > 0
            and status["phase"] == "activate" and status["activation_state"] == "published",
            "The intake pilot requires a published activation")
    applications = status["applications"]
    require(len(applications) == len(release["manifest"]["deliveries"])
            and {row["application"] for row in applications} == set(release["manifest"]["deliveries"]),
            "Incomplete status application coverage")
    for row in applications:
        expected = {probe["id"]: probe["expected"] for probe in payload["probes"]
                    if probe["application"] == row["application"]}
        require(row["phase"] == "activate" and len(row["probes"]) == len(expected)
                and {p["probe"]: p["expected"] for p in row["probes"]} == expected,
                "Status probes differ from the release")
        for probe in row["probes"]:
            obs = probe["observation"]
            if obs:
                require((obs["activation"], obs["phase"], obs["application"], obs["probe"]) ==
                        (status["activation"], row["phase"], row["application"], probe["probe"]),
                        "Observation belongs to another activation, phase, application or probe")
    verify_admission(release, status, signal, artifact_bytes)
    change = signal["extensions"]["policyWatcherRecord"]["changeId"]
    linked = [entry for entry in payload["evidence"] if entry.get("upstream", {}).get("provider") == "PolicyWatcher"
              and entry["upstream"]["id"] == change and entry["uri"] == signal["source"]["url"]]
    require(len(linked) == 1, "The release and monitoring signal must identify the same PolicyWatcher record")
    entry = linked[0]
    require(any(rule["evidence"] == entry["id"] for rule in payload["rules"]),
            "The monitoring source must support a rule in this release")
    at = status["as_of"]
    next_review = (timestamp(at) + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "format": "palo-case-file", "schemaVersion": "1.0.0", "caseId": "case-ontograph-" + release_id[:24],
        "title": "Ontology release evidence for PALO Measure review", "status": "review", "createdAt": at,
        "updatedAt": at, "owner": payload["owner"],
        "context": {"domain": payload["domain"], "intendedUse": payload["purpose"],
                    "exampleStatus": "educational-non-production",
                    "decisionQuestion": "Which source, control and observed effects should the reviewer examine?",
                    "declaredAuthority": {"allowed": ["Queue the evidence for human review"],
                                          "prohibited": ["Approve applicability or production activation"]},
                    "verificationMethod": "Check the release export, observations and source against the originals."},
        "assessments": [],
        "evidence": [{"evidenceId": "ontograph-release-" + release_id, "title": "Frozen release and probe observations",
                      "kind": "ontology-release-evidence", "status": "open", "recordedAt": at,
                      "content": {"release": release_id, "activation": status["activation"],
                                  "payloadSha256": release["manifest"]["payload_sha256"],
                                  "statusSha256": digest(status), "graph": release["graph"],
                                  "source": entry, "rules": payload["rules"], "applications": applications}}],
        "sources": [{"sourceId": entry["id"], "title": signal["source"]["title"], "url": entry["uri"],
                     "publisher": "PolicyWatcher", "sourceType": "monitoring-signal", "checkedAt": entry["observed_at"],
                     "freshness": {"status": "review-due", "reviewIntervalDays": 1, "nextReviewAt": next_review}}],
        "incidents": [], "handoffs": [],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("release", "status", "signal", "palo-root", "output"):
        parser.add_argument("--" + name, type=Path, required=True)
    parser.add_argument("--observation", type=Path, help="matched probe artifact (defaults to the status directory)")
    args = parser.parse_args()
    artifact = args.observation or args.status.with_name("probe-matched.json")
    case = project_case(read(args.release), read(args.status), read(args.signal), artifact.read_bytes())
    output = args.output.resolve()
    if output.exists():
        parser.error("Choose a fresh output directory")
    output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=output.parent) as temp:
        stage = Path(temp) / "palo"
        stage.mkdir()
        (stage / "case-input.json").write_text(json.dumps(case, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        subprocess.run(["node", str(Path(__file__).with_name("palo-browser.cjs")),
                        str(args.palo_root.resolve()), str(args.signal.resolve()), str(stage)], check=True)
        stage.rename(output)


if __name__ == "__main__":
    main()
