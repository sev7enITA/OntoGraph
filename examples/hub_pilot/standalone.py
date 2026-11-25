"""Exercise a fresh synthetic customer workspace through the public offline CLI."""

import argparse
import errno
import hashlib
import json
import socket
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory


MODEL = Path(__file__).resolve().with_name("standalone-model.json")
ROOT = MODEL.parents[2]


def save(path, value):
    data = (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode()
    with path.open("xb") as stream:
        stream.write(data)
    return hashlib.sha256(data).hexdigest()


def cli(*args, data=None, token=None, rejection=None):
    env = {"ONTOGRAPH_TOKEN": token} if token else {}
    result = subprocess.run(
        [sys.executable, "-E", "-S", "-B", "-m", "ontograph", *map(str, args)],
        cwd=ROOT, env=env, input=json.dumps(data), capture_output=True, text=True,
    )
    if rejection:
        if result.returncode != 1 or result.stderr.strip() != f"OntoGraph: {rejection}":
            raise RuntimeError(f"Expected {rejection!r}, got {result.stderr!r}")
        return rejection
    result.check_returncode()
    return json.loads(result.stdout)


def bench_decision(loaded, facts):
    """The small fixture consumer interprets the delivered rule independently."""
    if loaded is None:
        return "inactive"
    rule, = loaded["rules"]
    for field, expected in rule["applies"].items():
        if field not in facts:
            return "hold"
        if facts[field] != expected:
            return "out_of_scope"
    return "allow" if all(facts.get(k) == v for k, v in rule["requires"].items()) else "hold"


def check_denial():
    # A closed port returns ECONNREFUSED. Only OS access denial passes this check.
    try:
        with socket.socket() as client:
            code = client.connect_ex(("127.0.0.1", 9))
    except PermissionError as error:
        code = error.errno
    if code not in {errno.EACCES, errno.EPERM}:
        raise RuntimeError(f"Expected network access denial, got errno {code}")
    return code


def run(output, database, offline_check):
    net_errno = check_denial() if offline_check else None
    model = json.loads(MODEL.read_text())
    cli("validate", MODEL)
    admin = cli("init", database, model["domain"], "administrator")["credential"]
    tokens = {}
    for role in ("author", "reviewer", "publisher", "consumer", "observer", "supervisor", "auditor"):
        principal = {"principal": role, "role": role}
        if role == "consumer":
            principal["application"] = "bench"
        tokens[role] = cli("call", database, "add-principal", data=principal, token=admin)

    def call(role, operation, rejection=None, **params):
        return cli("call", database, operation, data=params, token=tokens[role], rejection=rejection)

    release = call("author", "propose", payload=model, base=0, reviewers=["reviewer"], quorum=1,
                   reason="Exercise the synthetic laboratory procedure")
    blocked = call("publisher", "publish", release_id=release, expected_head=0, rejection="Approval quorum not met")
    call("reviewer", "review", release_id=release, choice="approve", rationale="Scripted pilot reviewer approves the fixture")
    activation = call("publisher", "publish", release_id=release, expected_head=0)
    package = call("auditor", "export", release_id=release)
    save(output / "release.json", package)
    cli("verify-release", output / "release.json", "--release", release)
    delivery = call("consumer", "consumer-release")
    loaded = delivery["payload"]
    declared = delivery["delivery_sha256"]
    call("consumer", "acknowledge", activation=activation, phase="activate", actual_digest=declared)

    def state():
        row, = call("auditor", "status")["applications"]
        return row["state"]

    def observe(phase, probe, facts):
        actual = bench_decision(loaded, facts)
        capture = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        evidence = {"activation": activation, "phase": phase, "probe": probe, "facts": facts,
                    "captured_at": capture, "loaded": declared, "actual": actual, "application": "bench"}
        checksum = save(output / f"probe-{probe}.json", evidence)
        call("observer", "observe", activation=activation, application="bench", phase=phase, probe_id=probe,
             actual_digest=declared, actual_outcome=actual, captured_at=capture,
             artifact_ref=f"urn:north-quay:standalone:sha256:{checksum}", artifact_sha256=checksum)
        return actual

    receipt = state()
    decisions = {case["id"]: observe("activate", case["id"], case["facts"]) for case in model["probes"]}
    active = state()
    call("supervisor", "withdraw", expected_head=activation, reason="End of standalone pilot")
    delivery = call("consumer", "consumer-release")
    if delivery["phase"] != "withdraw" or delivery["payload"] is not None:
        raise RuntimeError("Unexpected withdrawal delivery")
    loaded = delivery["payload"]
    declared = None
    call("consumer", "acknowledge", activation=activation, phase="withdraw", actual_digest=declared)
    withdrawal_receipt = state()
    observe("withdraw", "withdrawal", model["probes"][0]["facts"])
    withdrawn = state()
    states = [receipt, active, withdrawal_receipt, withdrawn]
    if states != ["unproven", "verified", "unproven", "withdrawal_verified"]:
        raise RuntimeError(f"Unexpected lifecycle states {states}")
    save(output / "events.json", call("auditor", "events"))
    tip = cli("verify-ledger", output / "events.json")["tip"]
    report = {"domain": model["domain"], "scope": "synthetic local bench, scripted role principals",
              "python": sys.version.split()[0], "site_enabled": False, "network_denial_errno": net_errno,
              "preapproval_rejection": blocked, "activation": activation, "release": release, "decisions": decisions,
              "activation_receipt_only": receipt, "observed_activation": active,
              "withdrawal_receipt_only": withdrawal_receipt, "observed_withdrawal": withdrawn, "ledger_tip": tip}
    save(output / "report.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="new or empty evidence directory")
    parser.add_argument("--check-network-denial", action="store_true", help="require OS network denial")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if any(args.output.iterdir()):
        parser.error("Evidence directory must be empty")
    with TemporaryDirectory() as folder:
        run(args.output, Path(folder) / "registry.sqlite", args.check_network_denial)
