"""Grade comparable, operator-supplied observations for a paired pilot."""

import re

from .model import digest, identifier, record, require, timestamp

FORMAT = "ontograph.pilot/1"
ARMS = ("incumbent", "ontograph")
EFFORT = ("review_minutes", "first_adapter_minutes", "second_adapter_minutes", "maintenance_minutes")
EXPECTED = {
    "conforming": "verified",
    "stale_decision": "mismatch",
    "withdrawal_unreachable": "unproven",
    "withdrawal_inactive": "withdrawal_verified",
}
OUTCOME_FIELDS = (
    "case_id", "instance", "activation", "verdict", "observer", "captured_at",
    "artifact_ref", "artifact_sha256", "custody_ref",
)


def _text(value, name, limit=256, allow_blank=False):
    require(type(value) is str and value == value.strip() and len(value) <= limit
            and (allow_blank or value), f"Invalid {name}")
    return value


def _reference(value, name):
    _text(value, name, 1024)
    require(re.fullmatch(r"(?:https://|urn:)[^\s]+", value), f"Use an HTTPS or URN {name}")
    return value


def _cases(entries):
    require(type(entries) is list and 0 < len(entries) <= 80, "Provide one to 80 paired cases")
    result = {}
    for entry in entries:
        record(entry, ("id", "scenario", "application", "instance", "release_ref", "activations"), "pilot case")
        case_id = identifier(entry["id"])
        require(case_id not in result, f"Duplicate pilot case: {case_id}")
        require(type(entry["scenario"]) is str and entry["scenario"] in EXPECTED, f"Invalid scenario: {case_id}")
        _text(entry["application"], f"application for {case_id}", allow_blank=True)
        _text(entry["instance"], f"instance for {case_id}", allow_blank=True)
        _text(entry["release_ref"], f"release reference for {case_id}", allow_blank=True)
        record(entry["activations"], ARMS, f"activations for {case_id}")
        for arm in ARMS:
            _text(entry["activations"][arm], f"{arm} activation for {case_id}", allow_blank=True)
        result[case_id] = entry
    return result


def _arm(entries, cases, arm, scope):
    record(entries, ("outcomes", "effort"), f"{arm} arm")
    record(entries["effort"], EFFORT, f"{arm} effort")
    minutes = list(entries["effort"].values())
    require(all(value is None or type(value) is int and 0 <= value <= 525600 for value in minutes),
            f"Use whole nonnegative minutes for {arm} effort")
    outcomes = entries["outcomes"]
    require(type(outcomes) is list and len(outcomes) <= len(cases), f"Invalid {arm} outcomes")
    result = {}
    for outcome in outcomes:
        record(outcome, OUTCOME_FIELDS, f"{arm} observation")
        case_id = identifier(outcome["case_id"])
        require(case_id in cases and case_id not in result, f"Unknown or repeated {arm} case: {case_id}")
        case = cases[case_id]
        require(case["application"] and case["release_ref"], f"Complete the case binding for {case_id}")
        require(_text(outcome["instance"], f"{arm} observed instance") == case["instance"],
                f"{arm} observation for {case_id} has a different application instance")
        require(_text(outcome["activation"], f"{arm} observed activation") == case["activations"][arm],
                f"{arm} observation for {case_id} has a different activation")
        require(type(outcome["verdict"]) is str and outcome["verdict"] in EXPECTED.values(),
                f"Invalid {arm} verdict for {case_id}")
        _text(outcome["observer"], f"{arm} observer")
        timestamp(outcome["captured_at"])
        ref = _reference(outcome["artifact_ref"], "artifact reference")
        custody = _reference(outcome["custody_ref"], "custody reference")
        require(type(outcome["artifact_sha256"]) is str and re.fullmatch(r"[0-9a-f]{64}", outcome["artifact_sha256"]),
                f"Invalid {arm} artifact SHA-256 for {case_id}")
        require(scope == "synthetic" or not any(value.startswith("urn:aurora-21:fixture:")
                                                 for value in (ref, custody)),
                f"Aurora 21 fixture evidence belongs in a synthetic pilot: {case_id}")
        result[case_id] = outcome["verdict"]
    return result, None if None in minutes else sum(minutes)


def _state(expected, verdict):
    return {"verdict": verdict, "status": "missing" if verdict is None else
            "match" if verdict == expected else "mismatch"}


def assess(dossier):
    """Compare two arms using exactly the preregistered cases and submitted metadata."""
    record(dossier, ("format", "title", "scope", "cases", "arms"), "pilot dossier")
    require(dossier["format"] == FORMAT, "Unsupported pilot format")
    _text(dossier["title"], "pilot title")
    scope = dossier["scope"]
    require(scope in ("synthetic", "customer"), "Choose a pilot scope")
    cases = _cases(dossier["cases"])
    record(dossier["arms"], ARMS, "pilot arms")
    arms = {arm: _arm(dossier["arms"][arm], cases, arm, scope) for arm in ARMS}
    rows = []
    for case_id, case in cases.items():
        expected = EXPECTED[case["scenario"]]
        rows.append({
            "id": case_id, "scenario": case["scenario"], "application": case["application"], "expected": expected,
            **{arm: _state(expected, arms[arm][0].get(case_id)) for arm in ARMS},
        })
    incumbent_minutes, ontograph_minutes = (arms[arm][1] for arm in ARMS)
    delta = (incumbent_minutes - ontograph_minutes
             if incumbent_minutes is not None and ontograph_minutes is not None else None)
    suggested, reasons = _decision(cases, rows, delta)
    if scope == "synthetic":
        reasons.insert(0, "Synthetic exercise. Treat the comparison as a rehearsal for a real pilot.")
    else:
        reasons.insert(0, "Operator-supplied evidence. Instance identity, artifact bytes and custody require external review.")
    return {
        "scope": scope, "decision": suggested, "cases": rows,
        "effort": {"incumbent_minutes": incumbent_minutes, "ontograph_minutes": ontograph_minutes,
                   "delta_minutes": delta},
        "reasons": reasons, "dossier_sha256": digest(dossier),
    }


def _decision(cases, rows, delta):
    failures = [row for row in rows if row["ontograph"]["status"] == "mismatch"]
    if failures:
        false_withdrawal = any(row["ontograph"]["verdict"] == "withdrawal_verified"
                               and row["expected"] == "unproven" for row in failures)
        reason = ("A false withdrawal confirmation fails the pilot." if false_withdrawal
                  else "OnToGraPh returned a different result from the preregistered verdict.")
        return "reject", [reason]
    reasons = []
    if {case["scenario"] for case in cases.values()} != set(EXPECTED):
        reasons.append("Preregister conforming, stale decision, unreachable and inactive withdrawal cases.")
    if len({case["application"] for case in cases.values() if case["application"]}) < 2:
        reasons.append("Include at least two applications.")
    if any(row[arm]["status"] == "missing" for row in rows for arm in ARMS):
        reasons.append("Record the result of every preregistered case in both arms.")
    if reasons:
        return "incomplete", reasons
    if any(row["incumbent"]["status"] == "mismatch" for row in rows):
        return "investigate-gap", ["Review the incumbent discrepancies under the same cases and evidence rules."]
    if delta is None:
        return "incomplete", ["Enter comparison effort for both arms over the same measurement window."]
    if delta > 0:
        return "ontograph-lower-effort", ["Both arms match the cases. The recorded effort is lower for OnToGraPh."]
    return "incumbent-viable", ["Both arms match the cases. The recorded incumbent effort is equal or lower."]


def example_from_report(report):
    """Populate only the OnToGraPh arm from the actual Aurora 21 report."""
    cases, observations = [], []
    for phase, app_id, probe_id, scenario in (
        ("drift", "crm", "crm-exception", "conforming"),
        ("drift", "pms", "pms-negative", "stale_decision"),
        ("unreachable", "pms", "withdrawal", "withdrawal_unreachable"),
        ("withdrawn", "pms", "withdrawal", "withdrawal_inactive"),
    ):
        release = report[phase]
        app = next(item for item in release["applications"] if item["application"] == app_id)
        probe = next(item for item in app["probes"] if item["probe"] == probe_id)
        observation = probe["observation"]
        instance = f"aurora-21-simulator-{app_id}"
        activation = str(release["activation"])
        cases.append({
            "id": scenario, "scenario": scenario, "application": app_id, "instance": instance,
            "release_ref": release["release"], "activations": {"incumbent": "", "ontograph": activation},
        })
        observations.append({
            "case_id": scenario, "instance": instance, "activation": activation, "verdict": app["state"],
            "observer": observation["observer"], "captured_at": observation["captured_at"],
            "artifact_ref": observation["artifact_ref"], "artifact_sha256": observation["artifact_sha256"],
            "custody_ref": "urn:ontograph:aurora-21:audit:" + report["ledger_tip"],
        })
    return {
        "format": FORMAT, "title": "Aurora 21 paired pilot rehearsal", "scope": "synthetic", "cases": cases,
        "arms": {arm: {"outcomes": observations if arm == "ontograph" else [], "effort": dict.fromkeys(EFFORT)}
                 for arm in ARMS},
    }
