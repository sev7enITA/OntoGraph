"""Single-request worker for the authenticated hosted relationship workspace."""
import json
import os
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
from ontograph.model import Rejected, canonical, require, validate, weighted_impact
from ontograph.studio import basis_for_request, parse_json


def handle(operation, user, workspace, payload, database, seed):
    if operation == "basis":
        return basis_for_request(payload)
    if operation == "impact":
        return weighted_impact(payload["model"], payload["origin"])
    if operation == "validate":
        validate(payload["model"])
        return {"valid": True}
    require(operation in {"bootstrap", "save"}, "Unknown operation")
    with closing(sqlite3.connect(database, timeout=5)) as db, db:
        db.execute("CREATE TABLE IF NOT EXISTS drafts (user_id TEXT, workspace TEXT, revision INTEGER NOT NULL,"
                   "model TEXT NOT NULL, PRIMARY KEY(user_id, workspace))")
        if operation == "bootstrap":
            row = db.execute("SELECT revision,model FROM drafts WHERE user_id=? AND workspace=?",
                             (user, workspace)).fetchone()
            return {"revision": row[0], "model": json.loads(row[1])} if row else {
                "revision": 0, "model": validate(json.loads(seed.read_text()))}
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
                        ROOT.parent / "decision-drafts.sqlite", ROOT / "finance-close.json")
        response = [200, output]
    except Conflict as exc:
        response = [409, {"error": str(exc)}]
    except (Rejected, ValueError, TypeError, KeyError, OverflowError, RecursionError) as exc:
        response = [400, {"error": str(exc)[:500]}]
    print(json.dumps(response, allow_nan=False))
