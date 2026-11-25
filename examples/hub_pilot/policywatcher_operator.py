"""Reconcile a released change through PolicyWatcher's native parser and public GET route."""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from ontograph.__main__ import load
from ontograph.model import consumer_bundle, evaluate, require, utcnow

from .policywatcher import BASE, _read, _verify_pair, release_source

REVISION = "14135858a4efad975e46d32f94906c355e9c4628"
NATIVE_SHA = "2903261e50d29c55e781e087397979ff46446bf4b96b49b755ba466bcc163917"
NATIVE_PATH = "src/lib/paloPolicyWatcherSignal.ts"
RUN_PARSER = """
import { parsePaloPolicyWatcherSignalQuery as parse } from './signal.mts';
import { readFileSync } from 'node:fs';
const queries = JSON.parse(readFileSync(0, 'utf8'));
console.log(JSON.stringify(queries.map(query => parse(new URLSearchParams(query)))));
"""


def native_parse(source, queries):
    code = source.read_bytes()
    require(hashlib.sha256(code).hexdigest() == NATIVE_SHA, "Unrecognized PolicyWatcher parser revision")
    with TemporaryDirectory() as temp:
        folder = Path(temp)
        (folder / "signal.mts").write_bytes(code)
        runner = folder / "parse.mjs"
        runner.write_text(RUN_PARSER, encoding="utf-8")
        process = subprocess.run(["node", "--experimental-strip-types", str(runner)], check=True,
                                 input=json.dumps(queries), text=True, capture_output=True, timeout=15)
    return json.loads(process.stdout)


def observe_route(query):
    endpoint = BASE + "/api/v1/integrations/palo/signal?" + query
    try:
        response = urlopen(Request(endpoint, headers={"Accept": "application/json"}), timeout=20)
    except HTTPError as error:
        response = error
    with response:
        require(response.geturl() == endpoint and response.headers.get_content_type() == "application/json",
                "Unexpected native route response")
        raw = response.read(2_000_001)
        require(len(raw) <= 2_000_000, "Response exceeded operator pilot limit")
        info = {"method": "GET", "url": endpoint, "status": response.status, "retrieved_at": utcnow(),
                "body_sha256": hashlib.sha256(raw).hexdigest()}
        return info, raw


def reconcile(model, signal, rule_ids):
    fields = {n["id"]: n for n in model["nodes"] if n["kind"] == "field"}
    reconciled = []
    for rule in model["rules"]:
        if rule["id"] not in rule_ids:
            continue
        facts = {}
        for key in sorted(rule["applies"].keys() | rule["requires"].keys()):
            pointer, = fields[key]["aliases"]
            require(pointer.startswith("/"), "Missing signal dictionary pointer")
            value = signal
            for token in pointer[1:].split("/"):
                value = value[token.replace("~1", "/").replace("~0", "~")]
            facts[key] = value
        applications = [n["id"] for n in model["nodes"] if n["kind"] == "application"
                        and rule in consumer_bundle(model, n["id"])["rules"]]
        reconciled.append({"rule": rule["id"], "control": rule["control"], "applications": applications,
                           "evidence": rule["evidence"], "facts_from_native_response": facts,
                           "admission": evaluate(rule, facts)})
    return reconciled


def run(release_file, packet_path, release_pin, source, output):
    with release_file.open(encoding="utf-8") as stream:
        release = load(stream)
    rid, packet, evidence, rules = release_source(release, packet_path, release_pin)
    key = evidence["upstream"]["id"]
    query = urlencode({"changeId": key, "lang": "en"})
    duplicate = query + "&" + urlencode({"changeId": key})
    accepted, rejected = native_parse(source, [query, duplicate])
    require(accepted == {"ok": True, "changeId": key, "locale": "en"} and rejected.get("ok") is False,
            "Native source parser results diverged")
    observed, signal_raw = observe_route(query)
    adverse, error_raw = observe_route(duplicate)
    require(observed["status"] == 200 and adverse["status"] == 400
            and _read(error_raw).get("error") == rejected["error"], "Local and hosted route checks diverged")
    signal = _read(signal_raw)
    _verify_pair(packet, signal)
    impact = reconcile(release["payload"], signal, rules)
    require(impact and all(r["admission"] == "allow" for r in impact), "Released policy rejected the source handoff")
    receipt = {
        "issuer": "OnToGraPh local operator pilot", "scope": "Public monitoring signal reconciliation",
        "release": rid, "change_id": key, "signal_id": signal["signalId"], "evidence": evidence["id"],
        "review_status": "pending-human-review", "rules": impact,
        "native_parser": {"revision": REVISION, "path": NATIVE_PATH, "source_sha256": NATIVE_SHA,
                          "valid": accepted, "duplicate_id": rejected},
        "native_get": {**observed, "file": "native-signal.json"},
        "native_duplicate_get": {**adverse, "file": "native-error.json"},
        "native_signal_authority": signal["authority"]["status"],
        "operator_action": "Review the linked source and the listed rule, control and affected applications.",
    }
    output.mkdir(parents=True, exist_ok=True)
    require(not any(output.iterdir()), "Use a fresh operator evidence directory")
    for name, data in (("native-signal.json", signal_raw), ("native-error.json", error_raw),
                       ("receipt.json", (json.dumps(receipt, indent=2, ensure_ascii=False) + "\n").encode())):
        with (output / name).open("xb") as file:
            file.write(data)
    return receipt


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("release", "packet", "native-source", "output"):
        parser.add_argument("--" + flag, type=Path, required=True)
    parser.add_argument("--release-pin", required=True)
    args = parser.parse_args()
    receipt = run(args.release, args.packet, args.release_pin, args.native_source, args.output)
    print(json.dumps({k: receipt[k] for k in ("release", "rules", "review_status")}, indent=2))
