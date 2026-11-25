"""Data-only exchange for externally sourced evidence and frozen releases."""

import re
from datetime import datetime, timezone

from .model import (
    consumer_bundle, digest, equal, identifier, jsonld, nonempty, require, text_digest, validate,
)

PW_SCHEMA = "https://policywatcher.online/schemas/evidence-packet/v1"


def policywatcher_evidence(packet, excerpt):
    """Create a review draft from a locally supplied evidence packet and excerpt."""
    require(type(packet) is dict and packet.get("schema") == PW_SCHEMA
            and packet.get("schemaVersion") in {"1.0.0", "1.1.0"}, "Unsupported evidence packet")
    require(packet.get("publicationGate") == "published", "PolicyWatcher packet is withheld")
    confidence = packet.get("sourceConfidence")
    require(type(confidence) is dict and confidence.get("state") == "verified-retrieval"
            and confidence.get("publicSnapshotEvidence") is True, "PolicyWatcher source requires review")
    snapshots = packet.get("snapshots")
    current = snapshots.get("current") if type(snapshots) is dict else None
    require(type(current) is dict, "PolicyWatcher current snapshot is missing")
    snapshot_hash = current.get("sha256")
    require(isinstance(snapshot_hash, str) and re.fullmatch(r"[0-9a-f]{64}", snapshot_hash),
            "Invalid PolicyWatcher snapshot digest")
    change = packet.get("changeId")
    source_hash = packet.get("contentDigest")
    require(isinstance(change, str) and re.fullmatch(r"[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}", change)
            and isinstance(source_hash, str) and re.fullmatch(r"[0-9a-f]{64}", source_hash),
            "Invalid PolicyWatcher change ID or packet digest")
    uri = f"https://policywatcher.online/change/{change}"
    require(packet.get("changeUrl") == uri, "Unexpected PolicyWatcher change URL")
    when = datetime.fromisoformat(nonempty(current.get("capturedAt"), "snapshot capture time").replace("Z", "+00:00"))
    require(when.tzinfo is not None, "Snapshot capture time requires a time zone")
    when = when.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    excerpt = nonempty(excerpt, "authorized excerpt")
    return {"id": identifier("pw-" + change), "uri": uri, "excerpt": excerpt,
            "sha256": text_digest(excerpt), "observed_at": when, "status": "insufficient",
            "applicability": "Pending human confirmation of source passage, applicability and effective date",
            "upstream": {"provider": "PolicyWatcher", "id": change, "reported_sha256": source_hash,
                         "reported_snapshot_sha256": snapshot_hash}}


def verify_release(bundle, expected_release=None):
    require(type(bundle) is dict, "Release package must be a JSON object")
    payload = validate(bundle["payload"])
    manifest = bundle["manifest"]
    release_id = bundle["release"]
    require(manifest["format"] == "ontograph.manifest/1" and release_id == digest(manifest),
            "Manifest digest mismatch")
    require(expected_release is None or release_id == expected_release, "Unexpected release ID")
    require(manifest["workspace"] == payload["domain"] and manifest["payload_sha256"] == digest(payload),
            "Payload digest or scope mismatch")
    deliveries = {node["id"]: digest(consumer_bundle(payload, node["id"]))
                  for node in payload["nodes"] if node["kind"] == "application"}
    require(deliveries == manifest["deliveries"], "Scoped delivery digest mismatch")
    require(equal(bundle["graph"], jsonld(payload, manifest["workspace"], release_id)),
            "Graph projection mismatch")
    return release_id
