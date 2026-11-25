"""Run the optional PolicyWatcher -> OnToGraPh -> PALO review-routing pilot."""

import argparse
import hashlib
import json
import subprocess
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory

from ontograph.exchange import policywatcher_evidence, verify_release
from ontograph.model import Rejected, canonical, digest, require, text_digest, utcnow
from ontograph.store import Registry, verify_events

from .policywatcher import reverse_lookup, verify_inputs

PALO_REV = "8cce101a653572cc9ec7f888a2422806536a93d1"
GATE_HASH = "b8978bb6cf9dfae5e7091a6439b7baaf3969b9905606be79423f21717a7f3d04"
APP = "review-intake"
GATE = "measure"


def save(path, obj):
    data = (json.dumps(obj, indent=2, ensure_ascii=False) + "\n").encode()
    with path.open("xb") as file:
        file.write(data)
    return hashlib.sha256(data).hexdigest()


def blocked(operation, expected):
    try:
        operation()
    except Rejected as error:
        require(str(error) == expected, f"Unexpected rejection: {error}")
        return str(error)
    raise RuntimeError(f"Expected rejection: {expected}")


def release_model(draft, gate, signal, now):
    owner = "Local pilot reviewer"
    def node(key, kind, label, definition, path=None):
        row = dict(id=key, kind=kind, label=label, definition=definition, owner=owner)
        if path:
            row["aliases"] = [path]
        return row

    def edge(left, relation, right):
        return dict(source=left, predicate=relation, target=right)

    nodes = [
        node("evidence", "concept", "Evidence", "Information offered for review"),
        node("monitoring", "concept", "Monitoring signal", "A non-authoritative observation"),
        node("case-key", "concept", "Case identity", "Identity of the reviewed public change"),
        node("change-ref", "field", "Source change ID", "PolicyWatcher change identifier",
             "/extensions/policyWatcherRecord/changeId"),
        node("source-link", "field", "Change URL", "Public evidence locator", "/source/url"),
        node("authority", "field", "Signal authority", "Claim made by the source", "/authority/status"),
        node("route", "process", gate["label"], gate["purpose"]),
        node("ctrl-decision-trace", "control", "Decision trace", "Bind a signal to its reviewed source"),
        node("intake-contract", "contract", "Review admission", "Admission opens human review"),
        node(APP, "application", "Local review intake", "Pilot adapter to the PALO signal importer"),
    ]
    edges = [edge("monitoring", "broader", "evidence"), edge("change-ref", "mapsTo", "case-key"),
             edge("source-link", "mapsTo", "case-key"), edge("authority", "mapsTo", "monitoring"),
             edge("route", "dependsOn", "ctrl-decision-trace"),
             edge("ctrl-decision-trace", "implements", "intake-contract"),
             edge(APP, "consumes", "intake-contract")]
    fields = ("change-ref", "source-link", "authority")
    edges.extend(edge("ctrl-decision-trace", "dependsOn", field) for field in fields)
    expected = dict(zip(fields, (draft["upstream"]["id"], draft["uri"], "non-authoritative-monitoring-signal")))
    positive = {"id": "matched", "application": APP, "rule": "route-signal", "expected": "allow",
                "facts": expected.copy()}
    probes = [positive]
    for key, field, value in [("wrong-case", "change-ref", "other-pilot-case"),
                              ("false-authority", "authority", "approved")]:
        probes.append({**positive, "id": key, "expected": "hold", "facts": {**expected, field: value}})
    require(GATE in signal["suggestedHandoff"]["reviewGateIds"]
            and "ctrl-decision-trace" in gate["requiredControlIds"], "Unexpected Measure gate contract")
    return {"format": "ontograph.release/1", "domain": "hub-review-pilot", "owner": owner,
            "scope": "Isolated integration pilot. Admit evidence for human review only.",
            "purpose": "Trace a published monitoring signal to the PALO Measure review queue.",
            "effective_at": now, "nodes": nodes, "edges": edges, "probes": probes,
            "rules": [{"id": "route-signal", "control": "ctrl-decision-trace", "evidence": draft["id"],
                       "applies": {}, "requires": expected}],
            "evidence": [draft, {"id": "palo-measure", "status": "confirmed",
                                 "uri": f"https://github.com/sev7enITA/PALOframework/blob/{PALO_REV}/data/decision-gates.json",
                                 "excerpt": gate["purpose"], "sha256": text_digest(gate["purpose"]),
                                 "observed_at": now, "applicability": "Pinned PALO catalogue defines the pilot review gate."}]}


def run(packet_path, signal_path, palo, output, db):
    proof = verify_inputs(packet_path, signal_path)
    packet = json.loads(packet_path.read_bytes())
    original = json.loads(signal_path.read_bytes())
    gates = (palo / "data/decision-gates.json").read_bytes()
    require(hashlib.sha256(gates).hexdigest() == GATE_HASH, "Unexpected PALO gate catalogue")
    gate, = [g for g in json.loads(gates)["gates"] if g["gateId"] == GATE]
    draft = policywatcher_evidence(packet, proof["excerpt"])
    model = release_model(draft, gate, original, utcnow())
    admin = db.initialize(model["domain"], "admin")
    roles = {}
    for role in ("author", "reviewer", "publisher", "consumer", "observer", "auditor"):
        roles[role] = db.add_principal(admin, role, role, APP if role == "consumer" else None)

    def propose():
        return db.propose(roles["author"], model, 0, ["reviewer"], 1, "Isolated pilot of review admission")

    pending = propose()
    db.review(roles["reviewer"], pending, "approve", "Test whether a vote can override insufficient evidence")
    insufficient = blocked(lambda: db.publish(roles["publisher"], pending, 0),
                           "Disputed or insufficient evidence blocks publication")
    draft.update(status="confirmed", applicability="Scripted pilot check of source identity and review routing only.")
    rid = propose()
    quorum = blocked(lambda: db.publish(roles["publisher"], rid, 0), "Approval quorum not met")
    db.review(roles["reviewer"], rid, "approve", "Scripted approval limited to the local integration test")
    activation = db.publish(roles["publisher"], rid, 0)
    release = db.export(roles["auditor"], rid)
    verify_release(release, rid)
    save(output / "release.json", release)
    reverse, signal = reverse_lookup(release, packet_path, rid)
    save(output / "reverse-lookup.json", reverse)
    save(output / "resolved-signal.json", signal)
    delivery = db.consumer_release(roles["consumer"])
    graph = release["payload"]
    require(delivery["release"] == rid and delivery["activation"] == activation, "Wrong activation")
    inputs = {"delivery": delivery, "model": graph, "gate": GATE}
    def observe(candidate_signal):
        response = subprocess.run(["node", str(Path(__file__).with_name("intake.cjs")),
                                   str(palo / "assets/palo-policywatcher-signal.js")],
                                  input=json.dumps({**inputs, "signal_json": canonical(candidate_signal)}), text=True,
                                  capture_output=True, timeout=20)
        require(response.returncode == 0, f"Pilot intake failed: {response.stderr.strip()}")
        result = json.loads(response.stdout)
        require(result["signal_sha256"] == digest(candidate_signal) and result["release"] == rid
                and result["activation"] == activation
                and result["delivery_sha256"] == delivery["delivery_sha256"], "Unbound response")
        return result

    loaded = observe(signal)
    db.acknowledge(roles["consumer"], activation, "activate", loaded["delivery_sha256"])
    receipt_only = db.status(roles["auditor"])["applications"][0]["state"]
    require(receipt_only == "unproven", "Receipt alone qualified the intake")
    cases = {}
    for probe in graph["probes"]:
        key = probe["id"]
        specimen = deepcopy(signal)
        if key == "wrong-case":
            specimen["extensions"]["policyWatcherRecord"]["changeId"] = "other-pilot-case"
        if key == "false-authority":
            specimen["authority"]["status"] = "approved"
        result = observe(specimen)
        artifact = {"case": key, "synthetic_mutation": key != "matched",
                    "signal_sha256": result.pop("signal_sha256"), "response": result}
        sha = save(output / f"probe-{key}.json", artifact)
        db.observe(roles["observer"], activation, APP, "activate", key, result["delivery_sha256"],
                   result["outcome"], utcnow(), f"urn:sha256:{sha}", sha)
        require(result["facts"] == probe["facts"] and result["outcome"] == probe["expected"],
                f"Actual input or outcome diverged for {key}")
        cases[key] = {"outcome": result["outcome"], "native_signal_valid": result["native_valid"]}
    require(cases["wrong-case"]["native_signal_valid"] and not cases["false-authority"]["native_signal_valid"],
            "Unexpected PALO negative controls")
    status = db.status(roles["auditor"])
    require(status["applications"][0]["state"] == "verified", "Intake observations incomplete")
    save(output / "status.json", status)
    events = db.events(roles["auditor"])
    save(output / "events.json", events)
    summary = {"release": rid, "activation": activation, "verified_at": status["as_of"],
               "release_gate_rejections": [insufficient, quorum], "receipt_alone": receipt_only,
               "cases": cases, "review_status": loaded["review_status"], "gates": loaded["reopened_gates"],
               "source": proof, "palo_revision": PALO_REV, "palo_gate_catalogue_sha256": GATE_HASH,
               "ledger_tip": verify_events(events), "events": len(events), "business_outcome": "not_assessed"}
    save(output / "report.json", summary)
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("packet", "signal", "palo-root", "output"):
        parser.add_argument("--" + name, required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    require(not any(args.output.iterdir()), "Use an empty output directory for a new run")
    with TemporaryDirectory() as temp:
        result = run(args.packet, args.signal, args.palo_root, args.output, Registry(Path(temp) / "pilot.sqlite"))
    print(json.dumps({key: result[key] for key in ("release", "cases", "review_status")}, indent=2))
