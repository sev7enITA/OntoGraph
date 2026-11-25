"""Run from the checkout with python -m examples.wbs_pilot.run <new-evidence-directory>."""
import argparse
import json
from pathlib import Path

from ontograph.model import Rejected, canonical, digest, utcnow
from ontograph.store import Registry, verify_events
from .consumers import APPS, Finance, Pmo, fingerprint, run_cli, tools
from .workflow import model


def run(destination):
    account_bin, office_bin = tools()
    destination = Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=False)
    blobs = destination / "artifacts"
    blobs.mkdir()
    def save(name, value):
        (destination / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")

    db = Registry(destination / "registry.sqlite")
    admin = db.initialize("wbs-dual-app", "admin")
    actors = {name: db.add_principal(admin, name, name, None)
              for name in ("author", "auditor", "supervisor", "publisher", "observer")}
    for name in ("steward", "controller"):
        actors[name] = db.add_principal(admin, name, "reviewer", None)
    for app in APPS:
        actors[app] = db.add_principal(admin, app, "consumer", app)
    applications = {"finance": Finance(destination, account_bin), "pmo": Pmo(destination, office_bin)}
    snapshots, readings, releases = [], [], []

    def stage(payload, base, why):
        candidate = db.propose(actors["author"], payload, base, ["controller", "steward"], 2, why)
        for reviewer in ("controller", "steward"):
            db.review(actors[reviewer], candidate, "approve", "Scripted training vote for " + why)
        release = db.export(actors["auditor"], candidate)
        save(candidate + ".json", release)
        releases.append({"reason": why, "candidate": candidate, "payload_sha256": release["manifest"]["payload_sha256"]})
        return candidate

    def install(activation, phase, name, keep=False):
        item = db.consumer_release(actors[name])
        if item["activation"] != activation or item["phase"] != phase:
            raise RuntimeError("Unexpected delivery")
        declared = applications[name].install(item, keep_old_rules=keep)
        db.acknowledge(actors[name], activation, phase, declared)

    def observe(label, activation, phase, name):
        app = applications[name]
        try:
            report = app.readback()
        except FileNotFoundError:
            if label != "source_unavailable" or name != "pmo":
                raise
            report = {"declared_delivery": None, "unavailable": True, "rows": [], "files": {}}
        for filename, key in report["files"].items():
            raw = (app.folder / filename).read_bytes()
            if fingerprint(raw) != key:
                raise ValueError("Application artifact changed during capture")
            (blobs / key).write_bytes(raw)
        capture = {"step": label, "activation": activation, "phase": phase, "application": name,
                   "captured_at": utcnow(), **report}
        artifact = digest(capture)
        (blobs / artifact).write_bytes(canonical(capture).encode())
        readings.append({**capture, "artifact_sha256": artifact})
        if phase == "activate":
            results = [(name + "-" + row["case_id"], "allow" if row["eligible"] else "hold")
                       for row in report["rows"]]
        else:
            outcome = "unobservable" if report.get("unavailable") else (
                "active" if any(row["eligible"] for row in report["rows"]) else "inactive")
            results = [("withdrawal", outcome)]
        for case, actual in results:
            db.observe(actors["observer"], activation, name, phase, case, report["declared_delivery"], actual,
                       capture["captured_at"], "urn:sha256:" + artifact, artifact)

    def snapshot(label, activation, phase, apps=APPS):
        for name in apps:
            observe(label, activation, phase, name)
        status = db.status(actors["auditor"])
        current = {}
        for row in status["applications"]:
            name = row["application"]
            raw = next(r for r in reversed(readings) if r["application"] == name and r["activation"] == activation and r["phase"] == phase)
            current[name] = {"state": row["state"], "eligible": None if raw.get("unavailable") else
                             sum(entry["eligible"] for entry in raw["rows"]), "artifact_sha256": raw["artifact_sha256"]}
        snapshots.append({"step": label, "activation": activation, "phase": phase, "applications": current})

    basic = model()
    baseline = db.publish(actors["publisher"], stage(basic, 0, "Recognized WBS code"), 0)
    for app in APPS:
        install(baseline, "activate", app)
    snapshot("baseline", baseline, "activate")
    old_workbook = applications["pmo"].source.read_bytes()
    db.withdraw(actors["supervisor"], baseline, "Prepare stricter scoped code")
    for app in APPS:
        install(baseline, "withdraw", app)
    snapshot("baseline_withdrawn", baseline, "withdraw")

    candidate = stage(model(strict=True), baseline, "Unresolved Finance and PMO evidence")
    try:
        db.publish(actors["publisher"], candidate, baseline)
    except Rejected as exc:
        blocked = str(exc)
    else:
        raise AssertionError("Publication unexpectedly accepted unresolved assertions")
    resolved = stage(model(strict=True, adjudicated=True), baseline, "Require department-qualified WBS")
    changed = db.publish(actors["publisher"], resolved, baseline)
    install(changed, "activate", "finance")
    # Inject an importer regression: receiving v2 reopens the saved v1 workbook template.
    applications["pmo"].source.write_bytes(old_workbook)
    install(changed, "activate", "pmo", keep=True)
    snapshot("stale_workbook", changed, "activate")
    install(changed, "activate", "pmo")
    snapshot("qualified", changed, "activate")

    db.withdraw(actors["supervisor"], changed, "Both departments withdraw qualified admission")
    install(changed, "withdraw", "finance")
    install(changed, "withdraw", "pmo", keep=True)
    snapshot("withdrawal_still_active", changed, "withdraw")
    workbook = applications["pmo"].source
    unavailable = workbook.with_suffix(".offline")
    workbook.rename(unavailable)
    try:
        snapshot("source_unavailable", changed, "withdraw", ("pmo",))
    finally:
        unavailable.rename(workbook)
    install(changed, "withdraw", "pmo")
    snapshot("withdrawn", changed, "withdraw")
    restored = db.publish(actors["publisher"], stage(basic, changed, "Explicitly restore baseline after verified withdrawal"), changed)
    for app in APPS:
        install(restored, "activate", app)
    snapshot("restored", restored, "activate")

    events = db.events(actors["auditor"])
    for name, data in (("audit.json", events), ("readbacks.json", readings)):
        save(name, data)
    result = {"format": "ontograph.wbs-pilot/1", "finished_at": utcnow(), "data": "synthetic",
              "applications": {"finance": {"engine": run_cli([account_bin, "--version"]).decode().strip(),
                                          "output": "Eligible ledger postings (EUR)"},
                               "pmo": {"engine": run_cli([office_bin, "--version"]).decode().strip(),
                                       "output": "Eligible work-package budget (EUR)"}},
              "approval": "Two distinct role-bound principals, both scripted in the same isolated test environment.",
              "unresolved_candidate_block": blocked, "releases": releases, "steps": snapshots,
              "readbacks": len(readings), "ledger_tip": verify_events(events), "events": len(events)}
    save("summary.json", result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    result = run(parser.parse_args().destination)
    for step in result["steps"]:
        print(step["step"], {app: (r["state"], r["eligible"]) for app,r in step["applications"].items()})
    print("Verified registry audit tip:", result["ledger_tip"])
