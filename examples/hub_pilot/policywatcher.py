"""Optional pilot adapter for PolicyWatcher's public, read-only v1.1 evidence handoff."""

import hashlib
import re
import subprocess
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from ontograph.__main__ import load
from ontograph.exchange import policywatcher_evidence, verify_release
from ontograph.model import require

BASE = "https://policywatcher.online"
CHANGE_ID = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}")
QUESTION = "Do the cited source passages support each displayed reason, KPI value and regional note?"

# PolicyWatcher's TypeScript producer hashes JSON.stringify(packet) before appending contentDigest.
# Preserve the producer's property order, number rendering and Unicode escaping.
PRODUCER_DIGEST = """
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const value = JSON.parse(readFileSync(0, 'utf8'));
delete value.contentDigest;
process.stdout.write(createHash('sha256').update(JSON.stringify(value)).digest('hex'));
"""


def _read(raw):
    return load(StringIO(raw.decode("utf-8")))


def _timestamp(value):
    when = datetime.fromisoformat(value.replace("Z", "+00:00"))
    require(when.utcoffset() is not None, "Missing time zone in upstream capture")
    return when


def _verify_packet(raw):
    packet = _read(raw)
    require(packet.get("schemaVersion") == "1.1.0", "Pilot requires v1.1 capture lineage")
    checksum = subprocess.run(["node", "-e", PRODUCER_DIGEST], input=raw, capture_output=True,
                              check=True, timeout=15).stdout.decode("ascii")
    require(checksum == packet.get("contentDigest"), "PolicyWatcher packet digest mismatch")
    require(QUESTION in packet.get("humanReviewQuestions", []), "Review prompt missing from packet")
    draft = policywatcher_evidence(packet, QUESTION)
    captured = packet["snapshots"]["current"]
    origin = packet["captureLineage"]["current"]
    require(origin["provenance"] == "captured" and origin.get("sourceUrl")
            and origin.get("finalUrl"), "Pilot requires a traced source capture")
    require(_timestamp(origin["capturedAt"]) == _timestamp(captured["capturedAt"]),
            "Snapshot and capture-lineage times disagree")
    require(_timestamp(captured["capturedAt"]) <= datetime.now(timezone.utc),
            "Snapshot capture is in the future")
    lineage = packet.get("analysisLineage", {})
    require(lineage.get("status") == "verified"
            and lineage.get("documents", {}).get("new", {}).get("sha256") == captured["sha256"],
            "Snapshot and verified analysis-input digests disagree")
    return packet, draft


def _verify_pair(packet, signal):
    key = packet["changeId"]
    source = signal["source"]
    record = signal["extensions"]["policyWatcherRecord"]
    require(signal.get("format") == "palo-policywatcher-signal" and signal.get("schemaVersion") == "1.0.0"
            and signal.get("signalId") == f"signal-policywatcher-{key}", "Unexpected signal identity")
    require(source["publisher"] == "PolicyWatcher" and source["sourceId"] == f"policywatcher-change-{key}"
            and source["url"] == packet["changeUrl"] and record["changeId"] == key
            and record["company"]["id"] == packet["company"]["id"]
            and record["policy"]["id"] == packet["policy"]["id"], "Signal points to a different source")
    require(signal["authority"]["status"] == "non-authoritative-monitoring-signal"
            and signal["suggestedHandoff"]["reviewGateIds"] == ["measure", "prove"],
            "Unexpected signal authority or review gates")
    return {
        "change_id": key, "signal_id": signal["signalId"], "excerpt": QUESTION,
        "policy_title": packet["policy"]["name"], "company": packet["company"]["name"],
        "packet_sha256": packet["contentDigest"], "snapshot_sha256": packet["snapshots"]["current"]["sha256"],
        "captured_at": packet["snapshots"]["current"]["capturedAt"],
        "source_url": packet["captureLineage"]["current"]["sourceUrl"],
        "signal_observed_at": signal["observedAt"], "review_gates": signal["suggestedHandoff"]["reviewGateIds"],
    }


def verify_inputs(packet_path, signal_path):
    """Bind two captured responses using native producer integrity and source identity."""
    packet_raw, signal_raw = Path(packet_path).read_bytes(), Path(signal_path).read_bytes()
    packet, _draft = _verify_packet(packet_raw)
    result = _verify_pair(packet, _read(signal_raw))
    result["packet_file_sha256"] = hashlib.sha256(packet_raw).hexdigest()
    result["signal_file_sha256"] = hashlib.sha256(signal_raw).hexdigest()
    return result


def release_source(release_bundle, packet_path, expected_release):
    """Recover the reviewed, rule-bound public evidence in a pinned release."""
    require(isinstance(expected_release, str) and re.fullmatch(r"[0-9a-f]{64}", expected_release),
            "Reverse lookup requires a pinned release digest")
    release_id = verify_release(release_bundle, expected_release)
    packet, draft = _verify_packet(Path(packet_path).read_bytes())
    model = release_bundle["payload"]
    matches = [e for e in model["evidence"] if e.get("upstream") == draft["upstream"]]
    require(len(matches) == 1, "Expected one released evidence record matching the verified source packet")
    evidence = matches[0]
    require(all(evidence[k] == draft[k] for k in ("id", "uri", "excerpt", "sha256", "observed_at")),
            "Released evidence has drifted from its packet")
    bound = sorted(r["id"] for r in model["rules"] if r["evidence"] == evidence["id"])
    require(bound and evidence["status"] == "confirmed", "No reviewed rule binds the selected source")
    key = evidence["upstream"]["id"]
    require(CHANGE_ID.fullmatch(key), "Invalid published change ID")
    return release_id, packet, evidence, bound


def reverse_lookup(release_bundle, packet_path, expected_release):
    """Resolve a rule's PolicyWatcher reference through the public signal service."""
    release_id, packet, evidence, bound = release_source(release_bundle, packet_path, expected_release)
    key = evidence["upstream"]["id"]
    endpoint = BASE + "/api/v1/integrations/palo/signal?" + urlencode({"changeId": key, "lang": "en"})
    with urlopen(Request(endpoint, headers={"Accept": "application/json"}), timeout=20) as response:
        require(response.status == 200 and response.geturl() == endpoint
                and response.headers.get_content_type() == "application/json", "Unexpected signal response")
        raw = response.read(2_000_001)
        require(len(raw) <= 2_000_000, "Signal response exceeded the pilot limit")
    signal = _read(raw)
    result = _verify_pair(packet, signal)
    result.update({"release": release_id, "rules": bound, "evidence_id": evidence["id"],
                   "response_sha256": hashlib.sha256(raw).hexdigest(), "method": "GET",
                   "endpoint": endpoint, "http_status": 200, "retrieved_at": datetime.now(timezone.utc).isoformat()})
    return result, signal
