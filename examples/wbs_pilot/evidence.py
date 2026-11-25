"""Package an allowlist of public captures or verify a WBS evidence ZIP offline."""
import argparse
import json
import re
from hashlib import sha256
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

from ontograph.model import digest
from ontograph.store import verify_events


def package(folder, destination):
    folder = Path(folder)
    summary = json.loads((folder / "summary.json").read_text())
    allowed = ["summary.json", "audit.json", "readbacks.json"]
    for release in summary["releases"]:
        key = release["candidate"]
        if not re.fullmatch("[a-f0-9]{64}", key):
            raise ValueError("Invalid candidate identifier")
        allowed.append(key + ".json")
    allowed.extend("artifacts/" + p.name for p in (folder / "artifacts").iterdir()
                   if re.fullmatch("[a-f0-9]{64}", p.name) and p.is_file())
    with ZipFile(destination, "x", ZIP_DEFLATED) as archive:
        for filename in sorted(allowed):
            archive.write(folder / filename, filename)


def verify(path, expected_tip=None):
    with ZipFile(path) as archive:
        def read(name):
            return json.loads(archive.read(name))
        summary = read("summary.json")
        events = read("audit.json")
        verify_events(events, expected_tip or summary["ledger_tip"])
        if summary["ledger_tip"] != events[-1]["hash"]:
            raise ValueError("Summary tip mismatch")
        for release in summary["releases"]:
            frozen = read(release["candidate"] + ".json")
            if (digest(frozen["manifest"]) != release["candidate"] or
                    digest(frozen["payload"]) != release["payload_sha256"] or
                    frozen["manifest"]["payload_sha256"] != release["payload_sha256"]):
                raise ValueError("Candidate or model digest mismatch")
        captured = {}
        for reading in read("readbacks.json"):
            capture = dict(reading)
            key = capture.pop("artifact_sha256")
            raw = archive.read("artifacts/" + key)
            if digest(capture) != key or sha256(raw).hexdigest() != key or json.loads(raw) != capture:
                raise ValueError("Native observation manifest mismatch")
            for file_key in capture["files"].values():
                if sha256(archive.read("artifacts/" + file_key)).hexdigest() != file_key:
                    raise ValueError("Native application artifact digest mismatch")
            captured[key] = capture
        observations = [event["payload"] for event in events if event["kind"] == "application.observed"]
        if set(captured) != {entry["artifact_sha256"] for entry in observations}:
            raise ValueError("Captured observations do not match the audit chain")
        for observed in observations:
            key = observed["artifact_sha256"]
            record = captured[key]
            if (observed["artifact_ref"] != "urn:sha256:" + key or observed["actual_digest"] != record["declared_delivery"]
                    or any(observed[k] != record[k] for k in ("captured_at", "phase", "application", "activation"))):
                raise ValueError("Registry record does not bind its source")
            if record["phase"] == "activate":
                case = observed["probe"].removeprefix(record["application"] + "-")
                row = next(r for r in record["rows"] if r["case_id"] == case)
                outcome = "allow" if row["eligible"] else "hold"
            elif record.get("unavailable"):
                outcome = "unobservable"
            else:
                outcome = "active" if any(r["eligible"] for r in record["rows"]) else "inactive"
            if outcome != observed["actual_outcome"]:
                raise ValueError("Recorded outcome differs from native readback")
        for step in summary["steps"]:
            for name, item in step["applications"].items():
                record = captured[item["artifact_sha256"]]
                observed_total = None if record.get("unavailable") else sum(row["eligible"] for row in record["rows"])
                if (observed_total != item["eligible"] or record["application"] != name
                        or record["activation"] != step["activation"] or record["phase"] != step["phase"]):
                    raise ValueError("Reported result differs from bound native readback")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip", type=Path)
    parser.add_argument("--package", type=Path, metavar="RUN_DIRECTORY")
    parser.add_argument("--expected-tip", help="Optional independently retained audit checkpoint")
    args = parser.parse_args()
    if args.package:
        package(args.package, args.zip)
    result = verify(args.zip, args.expected_tip)
    print(f"Verified {result['readbacks']} native readbacks, {result['events']} linked events, audit tip {result['ledger_tip']}")
