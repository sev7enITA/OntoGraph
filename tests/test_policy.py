import json
import shutil
import subprocess
import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

from ontograph.aurora import NOW, example, prepare
from ontograph.model import Rejected, canonical, digest, evaluate
from ontograph.policy import build_bundle, verify_bundle
from ontograph.store import Registry


class PolicyBundleTests(unittest.TestCase):
    def compile(self, payload):
        with tempfile.TemporaryDirectory() as directory:
            db = Registry(Path(directory) / "registry.sqlite", clock=lambda: NOW)
            tokens = prepare(db)
            release = db.propose(tokens["author"], payload, 0, ["steward"], 1, "Synthetic policy")
            db.review(tokens["steward"], release, "approve", "Reviewed this synthetic policy")
            return build_bundle(db.export(tokens["auditor"], release))

    def test_bundle_rebuilds_byte_for_byte_and_catches_tampering(self):
        bundle = self.compile(example())
        self.assertEqual(bundle, self.compile(example()))
        self.assertEqual(verify_bundle(bundle, bundle["release"]), bundle["bundle_sha256"])
        with self.assertRaisesRegex(Rejected, "Unexpected release"):
            verify_bundle(bundle, "0" * 64)
        for name, contents in bundle["files"].items():
            with self.subTest(file=name):
                altered = deepcopy(bundle)
                altered["files"][name] = contents + "\n"
                altered["bundle_sha256"] = digest({k: v for k, v in altered.items() if k != "bundle_sha256"})
                with self.assertRaisesRegex(Rejected, "does not match"):
                    verify_bundle(altered)
        polluted = {**bundle, "files": {**bundle["files"], "../new.rego": "extra"}}
        with self.assertRaisesRegex(Rejected, "Invalid OPA source files"):
            verify_bundle(polluted)

    def test_opa_matches_python_on_typed_nested_facts_and_scope(self):
        opa = shutil.which("opa")
        if opa is None:
            self.skipTest("OPA is optional outside the policy CI workflow")
        payload = example()
        rule = payload["rules"][0]
        rule["applies"]["crm-property"] = None
        expected = {"items": [1.0, -0.0, [], {}, True, None], "precision": 1e16,
                    "position": 0, "large_id": 10 ** 100}
        rule["requires"]["inspection"] = expected
        for probe in payload["probes"]:
            facts = probe["facts"]
            facts["crm-property"] = None
            if facts["inspection"] is True:
                facts["inspection"] = deepcopy(expected)
            probe["expected"] = evaluate(rule, facts)

        # An additional rule is reachable only through a contract that PMS consumes.
        def node_copy(source, target):
            return {**next(node for node in payload["nodes"] if node["id"] == source), "id": target}

        payload["nodes"].extend([node_copy("dossier-check", "pms-check"),
                                 node_copy("dossier-contract", "pms-contract")])
        payload["edges"].extend([
            {"source": "pms-check", "predicate": "implements", "target": "pms-contract"},
            {"source": "pms", "predicate": "consumes", "target": "pms-contract"},
        ])
        payload["rules"].append({**rule, "id": "pms-only", "control": "pms-check"})
        probes = [dict(probe, id=f"extra-{probe['id']}", rule="pms-only")
                  for probe in payload["probes"] if probe["application"] == "pms"]
        payload["probes"].extend(probes)
        bundle = self.compile(payload)

        base = {"asset-type": "building", "crm-property": None, "declaration": True, "inspection": expected}
        facts_cases = [
            base,
            {**base, "asset-type": "unit"},
            {"asset-type": "unit", "inspection": expected},
            {**base, "inspection": {**expected, "items": [1, -0.0, [], {}, True, None]}},
            {**base, "inspection": {**expected, "items": [1.0, 0.0, [], {}, True, None]}},
            {**base, "inspection": {**expected, "items": [True, -0.0, [], {}, True, None]}},
            {**base, "inspection": {**expected, "other": 1}},
            {**base, "inspection": {**expected, "items": [1.0, -0.0, [], [], True, None]}},
            {**base, "inspection": {**expected, "large_id": 10 ** 100 + 1}},
        ]
        with tempfile.TemporaryDirectory() as folder:
            files = Path(folder)
            for key, content in bundle["files"].items():
                if key != "release.json":
                    (files / key).write_text(content, encoding="utf-8")
            subprocess.run([opa, "check", "--strict", folder], check=True, capture_output=True, timeout=20)
            subprocess.run([opa, "test", folder], check=True, capture_output=True, timeout=20)

            def decide(text):
                proc = subprocess.run([opa, "eval", "--format=raw", "--stdin-input", "-d", folder,
                                       "data.ontograph.decision"],
                                      input=text, text=True, capture_output=True, check=True, timeout=20)
                return proc.stdout.strip()

            for facts in facts_cases:
                with self.subTest(facts=facts):
                    self.assertEqual(decide(canonical({"application": "crm", "rule": rule["id"], "facts": facts})),
                                     evaluate(rule, facts))
            raw = canonical({"application": "pms", "rule": "pms-only", "facts": base})
            human_authored = (raw.replace("1.0", "1e0", 1).replace("1e+16", "10000000000000000.000001")
                              .replace('"position":0', '"position":-0'))
            self.assertEqual(decide(human_authored), evaluate(rule, json.loads(human_authored)["facts"]))
            self.assertEqual(decide(raw), "allow")
            self.assertEqual(decide(raw.replace('"application":"pms"', '"application":"crm"')), "hold")
            self.assertEqual(decide(raw.replace("1e+16", "1e400")), "hold")


if __name__ == "__main__":
    unittest.main()
