import copy
import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from examples.devops.run_stage import fixture_receipt
from ontograph.aurora import NOW, example, prepare
from ontograph.github_policy import fetch_receipt
from ontograph.model import Rejected, canonical
from ontograph.store import Registry, verify_events


class DevOpsReleaseTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.registry = Registry(Path(directory.name) / "registry.sqlite", clock=lambda: NOW)
        self.tokens = prepare(self.registry)

    def propose(self, ci_required=True):
        return self.registry.propose(self.tokens["author"], example(), 0, ["steward"], 1,
                                     "Test semantic release handoff", ci_required=ci_required)

    def approve(self, release):
        self.registry.review(self.tokens["steward"], release, "approve", "Checked the evidence")

    def receipt(self, release):
        bundle = self.registry.export_policy(self.tokens["auditor"], release)
        return fixture_receipt({"release": release, "bundle_sha256": bundle["bundle_sha256"],
                                "artifact_sha256": "3" * 64, "opa_version": "1.21.2", "test_count": 11})

    def test_approval_evidence_and_observation_stay_separate(self):
        release = self.propose()
        with self.assertRaisesRegex(Rejected, "Approval quorum"):
            self.receipt(release)
        self.approve(release)
        receipt = self.receipt(release)
        with self.assertRaisesRegex(Rejected, "CI evidence"):
            self.registry.publish(self.tokens["publisher"], release, 0)
        with self.assertRaises(Rejected):
            self.registry.record_ci(self.tokens["publisher"], release, receipt)
        with self.assertRaisesRegex(Rejected, "does not match"):
            self.registry.record_ci(self.tokens["auditor"], release, {**receipt, "bundle_sha256": "0" * 64})
        with self.assertRaisesRegex(Rejected, "every generated"):
            self.registry.record_ci(self.tokens["auditor"], release, {**receipt, "test_count": 1})

        evidence = self.registry.record_ci(self.tokens["auditor"], release, receipt)
        self.assertEqual(self.registry.record_ci(self.tokens["auditor"], release, copy.deepcopy(receipt)), evidence)
        with self.assertRaisesRegex(Rejected, "run attempt"):
            self.registry.record_ci(self.tokens["auditor"], release, {**receipt, "artifact_sha256": "4" * 64})
        activation = self.registry.publish(self.tokens["publisher"], release, 0)
        delivered = self.registry.consumer_release(self.tokens["crm"])
        self.assertEqual(delivered["policy_artifact_sha256"], receipt["artifact_sha256"])
        self.registry.acknowledge(self.tokens["crm"], activation, "activate", delivered["delivery_sha256"])
        active = self.registry.status(self.tokens["auditor"], activation)
        self.assertEqual(active["ci"], evidence)
        self.assertTrue(all(app["state"] == "unproven" for app in active["applications"]))
        self.assertEqual(self.registry.ci_status(self.tokens["auditor"], release)["evidence"], evidence)

        self.registry.withdraw(self.tokens["supervisor"], activation, "Use the withdrawal protocol")
        self.assertIsNone(self.registry.consumer_release(self.tokens["crm"])["payload"])
        withdrawn = self.registry.status(self.tokens["auditor"], activation)
        self.assertEqual(withdrawn["ci"], evidence)
        self.assertTrue(all(app["state"] == "unproven" for app in withdrawn["applications"]))
        ledger = self.registry.events(self.tokens["auditor"])
        self.assertEqual(verify_events(ledger), ledger[-1]["hash"])
        self.assertEqual(len([event for event in ledger if event["kind"] == "release.ci_recorded"]), 1)

    def test_legacy_release_uses_the_original_protocol(self):
        release = self.propose(ci_required=False)
        self.approve(release)
        self.assertNotIn("ci_required", self.registry.export(self.tokens["author"], release)["manifest"])
        self.registry.publish(self.tokens["publisher"], release, 0)
        self.assertNotIn("ci", self.registry.status(self.tokens["auditor"]))
        self.assertEqual(self.registry.ci_status(self.tokens["auditor"], release),
                         {"release": release, "required": False, "evidence": None})

    def test_github_confirmation_requires_success_and_matching_hosted_artifact(self):
        release = self.propose()
        self.approve(release)
        bundle = self.registry.export_policy(self.tokens["auditor"], release)
        artifact = b"fixture OPA deployment archive"
        receipt = {**self.receipt(release), "artifact_sha256": hashlib.sha256(artifact).hexdigest()}
        repository = "example/ontograph-fixture"
        run = {"id": 1, "run_attempt": 1, "status": "completed", "conclusion": "success",
               "event": "push", "head_branch": "main", "head_sha": receipt["commit"],
               "path": ".github/workflows/policy-pilot.yml", "head_repository": {"full_name": repository},
               "repository": {"full_name": repository}}

        def provider(operation, *args):
            if operation == "api":
                return canonical(run).encode()
            folder = Path(args[args.index("--dir") + 1])
            (folder / "receipt.json").write_text(canonical(receipt), encoding="utf-8")
            (folder / "bundle.tar.gz").write_bytes(artifact)

        with patch("ontograph.github_policy.github", side_effect=provider):
            self.assertEqual(fetch_receipt(bundle, repository, 1), receipt)
            run["conclusion"] = "failure"
            with self.assertRaisesRegex(Rejected, "completed successfully"):
                fetch_receipt(bundle, repository, 1)
            run["conclusion"] = "success"
            run["head_branch"] = "untrusted"
            with self.assertRaisesRegex(Rejected, "outside the expected"):
                fetch_receipt(bundle, repository, 1)
            run["head_branch"] = "main"
            artifact = b"altered archive after validation"
            with self.assertRaisesRegex(Rejected, "recorded SHA-256"):
                fetch_receipt(bundle, repository, 1)
