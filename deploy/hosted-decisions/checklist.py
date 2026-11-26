"""Revision-scoped checklist progress and synthetic reference checks."""
from datetime import datetime, timezone
import json

from ontograph.model import consumer_bundle, evaluate, require


STEPS = ("draft", "inspect", "exercise")
OUTCOMES = {"unrecorded", "matched", "different", "unavailable"}


def empty(revision):
    return {
        "draft_revision": revision, "version": 0, "completed": [],
        "outcome": "unrecorded", "note": "", "observed_at": None,
    }


def read(db, user, workspace, revision):
    row = db.execute(
        "SELECT version, record FROM case_checklists WHERE user_id=? AND workspace=? AND draft_revision=?",
        (user, workspace, revision),
    ).fetchone()
    return {**json.loads(row[1]), "version": row[0]} if row else empty(revision)


def write(db, user, workspace, revision, payload, conflict):
    version = payload.get("version")
    require(type(version) is int and version >= 0, "Invalid checklist version")
    current = read(db, user, workspace, revision)
    if current["version"] != version:
        raise conflict("Checklist changed in another session.")
    steps = payload.get("completed")
    require(type(steps) is list and len(steps) <= len(STEPS)
            and all(step in STEPS for step in steps), "Invalid checklist steps")
    outcome = payload.get("outcome")
    require(type(outcome) is str and outcome in OUTCOMES, "Invalid observation")
    note = payload.get("note")
    require(type(note) is str and len(note) <= 1000, "Checklist note must be at most 1000 characters")
    note = note.strip()
    require(outcome == "unrecorded" or bool(note), "Add the basis for the observation")
    unchanged = outcome == current["outcome"] and note == current["note"]
    observed_at = None
    if outcome != "unrecorded":
        observed_at = (current["observed_at"] if unchanged
                       else datetime.now(timezone.utc).isoformat(timespec="seconds"))
    record = {
        "draft_revision": revision, "completed": [step for step in STEPS if step in steps],
        "outcome": outcome, "note": note, "observed_at": observed_at,
    }
    next_version = version + 1
    db.execute(
        "INSERT INTO case_checklists (user_id, workspace, draft_revision, version, record) VALUES (?,?,?,?,?) "
        "ON CONFLICT(user_id, workspace, draft_revision) DO UPDATE SET version=excluded.version, record=excluded.record",
        (user, workspace, revision, next_version, json.dumps(record, ensure_ascii=False)),
    )
    return {**record, "version": next_version}


def compare(model, starter, revision):
    applications = {node["id"]: {rule["id"]: rule for rule in consumer_bundle(model, node["id"])["rules"]}
                    for node in model["nodes"] if node["kind"] == "application"}
    checks = []
    for probe in starter["probes"]:
        rule = applications.get(probe["application"], {}).get(probe["rule"])
        result = evaluate(rule, probe["facts"]) if rule else None
        checks.append({
            "id": probe["id"], "application": probe["application"], "expected": probe["expected"],
            "result": result, "match": result == probe["expected"],
        })
    return {"draft_revision": revision, "checks": checks}


def handle(db, operation, user, workspace, payload, case, conflict):
    if operation == "checklist-save":
        db.execute("BEGIN IMMEDIATE")
    row = db.execute("SELECT revision,model FROM drafts WHERE user_id=? AND workspace=?", (user, workspace)).fetchone()
    revision = row[0] if row else 0
    if operation == "checklist":
        return read(db, user, workspace, revision)
    requested = payload.get("draft_revision")
    require(type(requested) is int and requested >= 0, "Invalid draft revision")
    if requested != revision:
        raise conflict("The saved draft changed.")
    if operation == "checklist-save":
        require(revision > 0, "A private saved draft is required")
        return write(db, user, workspace, revision, payload, conflict)
    starter = json.loads(case.read_text())
    return compare(json.loads(row[1]) if row else starter, starter, revision)
