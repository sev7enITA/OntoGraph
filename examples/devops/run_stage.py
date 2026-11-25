"""Exercise a CI-required semantic release against two synthetic consumers."""

import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path

from ontograph.aurora import NOW, example, prepare
from ontograph.model import Rejected, canonical, digest, require
from ontograph.store import Registry, verify_events


def write_json(path, value):
    with path.open("x", encoding="utf-8") as output:
        output.write(canonical(value) + "\n")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def prepare_stage(folder):
    folder.mkdir(mode=0o700)
    registry = Registry(folder / "registry.sqlite", clock=lambda: NOW)
    tokens = prepare(registry)
    previous = registry.propose(tokens["author"], example(1), 0, ["steward"], 1,
                                "Baseline dossier requirement")
    registry.review(tokens["steward"], previous, "approve", "Synthetic baseline")
    prior_activation = registry.publish(tokens["publisher"], previous, 0)
    registry.withdraw(tokens["supervisor"], prior_activation, "Stage the revised rule")
    for app in ("crm", "pms"):
        registry.acknowledge(tokens[app], prior_activation, "withdraw", None)
        fixture = {"phase": "withdraw", "application": app, "outcome": "inactive"}
        registry.observe(tokens["observer"], prior_activation, app, "withdraw", "withdrawal",
                         None, "inactive", NOW, "urn:ontograph:ci-fixture:" + digest(fixture), digest(fixture))

    release = registry.propose(tokens["author"], example(2), prior_activation,
                               ["steward", "owner"], 2, "Require the inspection report", ci_required=True)
    for reviewer in ("steward", "owner"):
        registry.review(tokens[reviewer], release, "approve", "Checked the synthetic cases")
    bundle = registry.export_policy(tokens["auditor"], release)
    previous_bundle = registry.export_policy(tokens["auditor"], previous)
    write_json(folder / "bundle.json", bundle)
    write_json(folder / "previous-bundle.json", previous_bundle)
    write_json(folder / "local-state.json", {"tokens": tokens, "base": prior_activation, "release": release})
    return {"release": release, "bundle_sha256": bundle["bundle_sha256"]}


def decision(opa, arguments, probe):
    request = {"application": probe["application"], "rule": probe["rule"], "facts": probe["facts"]}
    check = subprocess.run([opa, "eval", "--format=raw", "--stdin-input", *arguments,
                            "data.ontograph.decision"], input=canonical(request), capture_output=True,
                           text=True, check=True, timeout=30)
    result = check.stdout.strip()
    require(result in {"allow", "hold", "out_of_scope"}, "Unexpected policy decision")
    return result


def fixture_receipt(validation):
    return {"format": "ontograph.ci-receipt/1", "provider": "github-actions",
            "repository": "https://github.com/example/ontograph-fixture",
            "commit": "0" * 39 + "1", "run_url": "https://github.com/example/ontograph-fixture/actions/runs/1",
            "run_attempt": 1, "release": validation["release"], "bundle_sha256": validation["bundle_sha256"],
            "artifact_sha256": validation["artifact_sha256"], "opa_version": validation["opa_version"],
            "test_count": validation["test_count"]}


def finish_stage(folder, checks, opa, simulate=False):
    state = read_json(folder / "local-state.json")
    tokens, release = state["tokens"], state["release"]
    registry = Registry(folder / "registry.sqlite", clock=lambda: NOW)
    receipt = (fixture_receipt(read_json(checks / "validation.json")) if simulate
               else read_json(checks / "receipt.json"))
    artifact = checks / "bundle.tar.gz"
    actual_sha = hashlib.sha256(artifact.read_bytes()).hexdigest()
    require(actual_sha == receipt["artifact_sha256"], "CI artifact bytes do not match receipt")

    try:
        registry.publish(tokens["publisher"], release, state["base"])
    except Rejected as error:
        require(str(error) == "Approved CI evidence required before activation", str(error))
    else:
        raise Rejected("Activation bypassed the required CI evidence")
    evidence = registry.record_ci(tokens["auditor"], release, receipt)
    activation = registry.publish(tokens["publisher"], release, state["base"])

    prior = read_json(folder / "previous-bundle.json")
    prior_policy, prior_data = folder / "prior.rego", folder / "prior.json"
    for path, name in ((prior_policy, "policy.rego"), (prior_data, "data.json")):
        with path.open("x", encoding="utf-8") as output:
            output.write(prior["files"][name])
    for app in ("crm", "pms"):
        delivery = registry.consumer_release(tokens[app])
        require(delivery["policy_artifact_sha256"] == actual_sha, "Delivery did not retain CI artifact identity")
        registry.acknowledge(tokens[app], activation, "activate", delivery["delivery_sha256"])

    def observe(app, phase, probe_id, claimed, outcome, source):
        sample = {"activation": activation, "application": app, "phase": phase, "probe": probe_id,
                  "declared_delivery_sha256": claimed, "observed_outcome": outcome, "fixture_runtime": source}
        sample_hash = digest(sample)
        registry.observe(tokens["observer"], activation, app, phase, probe_id, claimed, outcome, NOW,
                         "urn:ontograph:ci-fixture:" + sample_hash, sample_hash)
        return sample

    probes = []
    for probe in example(2)["probes"]:
        app = probe["application"]
        delivery = registry.consumer_release(tokens[app])
        if app == "crm":
            outcome = decision(opa, ["--bundle", str(artifact)], probe)
            require(outcome == probe["expected"], "The tested production bundle gave a different outcome")
            source = actual_sha
        else:
            outcome = decision(opa, ["-d", str(prior_policy), "-d", str(prior_data)], probe)
            source = prior["bundle_sha256"]
        probes.append(observe(app, "activate", probe["id"], delivery["delivery_sha256"], outcome, source))
    active = registry.status(tokens["auditor"], activation)
    require({row["application"]: row["state"] for row in active["applications"]}
            == {"crm": "verified", "pms": "mismatch"}, "Expected stale consumer mismatch")

    registry.withdraw(tokens["supervisor"], activation, "Exercise the withdrawal protocol")
    for app in ("crm", "pms"):
        require(registry.consumer_release(tokens[app])["payload"] is None, "Withdrawal still delivers a rule")
        registry.acknowledge(tokens[app], activation, "withdraw", None)
    probes.append(observe("crm", "withdraw", "withdrawal", None, "inactive", "fixture disabled"))
    probes.append(observe("pms", "withdraw", "withdrawal", None, "unobservable", "fixture unavailable"))
    withdrawing = registry.status(tokens["auditor"], activation)
    require({row["application"]: row["state"] for row in withdrawing["applications"]}
            == {"crm": "withdrawal_verified", "pms": "unproven"}, "Receipt is insufficient to prove withdrawal")
    probes.append(observe("pms", "withdraw", "withdrawal", None, "inactive", "fixture disabled"))
    withdrawn = registry.status(tokens["auditor"], activation)
    require(all(row["state"] == "withdrawal_verified" for row in withdrawn["applications"]),
            "The withdrawal was not observed for every application")
    ledger = registry.events(tokens["auditor"])
    require(active["ci"] == withdrawn["ci"] == evidence, "Activation and withdrawal lost the CI evidence")
    report = {"scenario": "Aurora 21 synthetic DevOps pilot", "simulated_ci": simulate,
              "activation": activation, "ci": evidence, "active": active, "withdrawing": withdrawing,
              "withdrawn": withdrawn, "fixture_observations": probes, "ledger_tip": verify_events(ledger)}
    write_json(checks / "pilot-report.json", report)
    write_json(checks / "pilot-ledger.json", ledger)
    return {"release": release, "run_url": receipt["run_url"], "simulated_ci": simulate,
            "active": {"crm": "verified", "pms": "mismatch"},
            "withdrawal": {"crm": "withdrawal_verified", "pms": "withdrawal_verified"}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    stages = parser.add_subparsers(dest="stage", required=True)
    stage = stages.add_parser("prepare")
    stage.add_argument("folder", type=Path)
    stage = stages.add_parser("finish")
    stage.add_argument("folder", type=Path)
    stage.add_argument("checks", type=Path)
    stage.add_argument("--opa", default="opa")
    stage.add_argument("--simulate-ci", action="store_true", help="explicitly mark a local-only fixture receipt")
    args = parser.parse_args()
    os.umask(0o077)
    result = (prepare_stage(args.folder) if args.stage == "prepare" else
              finish_stage(args.folder, args.checks, args.opa, args.simulate_ci))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
