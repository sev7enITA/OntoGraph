"""Single-request worker for the authenticated hosted relationship workspace."""
import json
import os
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JOURNEY_WORKSPACES = frozenset({
    "journey-personal-library", "journey-department-wbs", "journey-copilot-glossary", "journey-policy-change",
})
sys.path.insert(0, str(ROOT))
from ontograph.model import Rejected, canonical, require, validate, weighted_impact
from ontograph.studio import basis_for_request, parse_json
import checklist


def handle(operation, user, workspace, payload, database, seed, case_dir=None):
    if operation == "basis":
        return basis_for_request(payload)
    if operation == "impact":
        return weighted_impact(payload["model"], payload["origin"])
    if operation == "validate":
        validate(payload["model"])
        return {"valid": True}
    guided = {"checklist", "checklist-save", "checklist-run"}
    require(operation in {"bootstrap", "prepare", "save"} | guided, "Unknown operation")
    case = None
    if case_dir and workspace in JOURNEY_WORKSPACES:
        case = case_dir / (workspace + ".json")
    require(operation not in guided | {"prepare"} or case is not None, "Unknown guided case")
    with closing(sqlite3.connect(database, timeout=5)) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS drafts (user_id TEXT, workspace TEXT, revision INTEGER NOT NULL,"
                   "model TEXT NOT NULL, PRIMARY KEY(user_id, workspace))")
        if operation in guided:
            db.execute("CREATE TABLE IF NOT EXISTS case_checklists (user_id TEXT, workspace TEXT, "
                       "draft_revision INTEGER, version INTEGER NOT NULL, record TEXT NOT NULL, "
                       "PRIMARY KEY(user_id, workspace, draft_revision))")
            return checklist.handle(db, operation, user, workspace, payload, case, Conflict)
        if operation in {"bootstrap", "prepare"}:
            if operation == "prepare":
                starter = canonical(validate(json.loads(case.read_text())))
                db.execute("INSERT OR IGNORE INTO drafts VALUES(?,?,1,?)", (user, workspace, starter))
            row = db.execute("SELECT revision,model FROM drafts WHERE user_id=? AND workspace=?",
                             (user, workspace)).fetchone()
            return {"revision": row[0], "model": json.loads(row[1])} if row else {
                "revision": 0, "model": validate(json.loads((case or seed).read_text())), "starter": case is not None}
        revision = payload["revision"]
        require(type(revision) is int and revision >= 0, "Invalid revision")
        model = canonical(validate(payload["model"]))
        if revision == 0:
            result = db.execute("INSERT OR IGNORE INTO drafts VALUES(?,?,1,?)", (user, workspace, model))
        else:
            result = db.execute("UPDATE drafts SET revision=revision+1, model=? WHERE user_id=? AND workspace=? "
                                "AND revision=?", (model, user, workspace, revision))
        if result.rowcount != 1:
            raise Conflict("Another session saved a newer draft. Reload before saving.")
        return {"revision": revision + 1}


class Conflict(ValueError):
    pass


if __name__ == "__main__":
    import resource
    os.umask(0o077)
    resource.setrlimit(resource.RLIMIT_CPU, (10, 12))
    resource.setrlimit(resource.RLIMIT_AS, (384 * 1024**2, 384 * 1024**2))
    try:
        request = parse_json(sys.stdin.buffer.read(5 * 1024**2 + 1))
        output = handle(request["operation"], request["user"], request["workspace"], request["payload"],
                        ROOT.parent / "decision-drafts.sqlite", ROOT / "finance-close.json", ROOT / "case-models")
        response = [200, output]
    except Conflict as exc:
        response = [409, {"error": str(exc)}]
    except (Rejected, ValueError, TypeError, KeyError, OverflowError, RecursionError) as exc:
        response = [400, {"error": str(exc)[:500]}]
    print(json.dumps(response, allow_nan=False))
