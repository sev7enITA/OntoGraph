import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from copy import deepcopy
from pathlib import Path

from ontograph.aurora import NOW, example, prepare, run, summary
from ontograph.exchange import PW_SCHEMA, policywatcher_evidence, verify_release
from ontograph.model import Rejected, digest, evaluate, impact, validate
from ontograph.store import Registry, verify_events


class GovernanceTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.path = Path(directory.name) / "registry.sqlite"
        self.now = NOW
        self.db = Registry(self.path, clock=lambda: self.now)
        self.tokens = prepare(self.db)

    def propose(self, version=2, base=0, **options):
        payload = options.pop("payload", example(version))
        return self.db.propose(self.tokens["author"], payload, base, ["steward", "owner"], 2,
                               "Synthetic evaluation", **options)

    def approve(self, candidate):
        for actor in ("steward", "owner"):
            self.db.review(self.tokens[actor], candidate, "approve", "Reviewed the exact digest")

    def publish(self, candidate, base=0):
        return self.db.publish(self.tokens["publisher"], candidate, base)

    def observe(self, activation, application, phase, probe, observed_digest, result, **kw):
        return self.db.observe(self.tokens["observer"], activation, application, phase, probe,
                               observed_digest, result, kw.get("time", self.now), "urn:test:capture", "a" * 64)

    def test_end_to_end_mismatch_timeout_withdrawal_and_restore(self):
        report = run()
        result = summary(report)
        self.assertEqual(result["drift"], {"crm": "verified", "pms": "mismatch"})
        self.assertEqual(result["unreachable"]["pms"], "unproven")
        self.assertEqual(set(result["withdrawn"].values()), {"withdrawal_verified"})
        self.assertEqual(set(result["restored"].values()), {"verified"})
        self.assertEqual(report["drift"]["business_outcome"], "not_assessed")
        pms = report["drift"]["applications"][1]
        self.assertEqual(pms["receipt"]["actual_digest"], report["drift"]["manifest"]["deliveries"]["pms"])
        self.assertEqual([p["probe"] for p in pms["probes"] if p["result"] == "mismatch"], ["pms-negative"])

    def test_assigned_independent_roles_and_required_quorum(self):
        attempt = self.propose()
        with self.assertRaisesRegex(Rejected, "Role"):
            self.db.review(self.tokens["author"], attempt, "approve", "I prepared this")
        with self.assertRaisesRegex(Rejected, "Role"):
            self.db.publish(self.tokens["admin"], attempt, 0)
        for _ in range(2):
            self.db.review(self.tokens["steward"], attempt, "approve", "Reviewer repeated a vote")
        with self.assertRaisesRegex(Rejected, "quorum"):
            self.publish(attempt)
        self.approve(attempt)
        self.assertGreater(self.publish(attempt), 0)
        with self.assertRaisesRegex(Rejected, "closed"):
            self.db.review(self.tokens["owner"], attempt, "object", "Release already activated")

    def test_objection_survives_review_deactivation(self):
        release = self.propose()
        self.approve(release)
        self.db.review(self.tokens["owner"], release, "object", "Scope remains disputed")
        self.db.disable_principal(self.tokens["admin"], "owner")
        with self.assertRaisesRegex(Rejected, "objection"):
            self.publish(release)

    def test_disputed_evidence_blocks_publication(self):
        payload = example()
        payload["evidence"][0]["status"] = "disputed"
        release = self.propose(payload=payload)
        self.approve(release)
        with self.assertRaisesRegex(Rejected, "evidence"):
            self.publish(release)

    def test_future_release_cannot_be_activated_early(self):
        payload = example()
        payload["effective_at"] = "2026-11-26T16:00:00Z"
        release = self.propose(payload=payload)
        self.approve(release)
        with self.assertRaisesRegex(Rejected, "effective"):
            self.publish(release)

    def test_compare_and_swap_stops_concurrent_publication(self):
        a, b = self.propose(1), self.propose(2)
        self.approve(a)
        self.approve(b)

        def try_publish(candidate):
            try:
                return self.publish(candidate)
            except Rejected:
                return None

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(try_publish, (a, b)))
        self.assertEqual(sum(value is not None for value in outcomes), 1)

    def test_require_discriminating_probe_per_application(self):
        base = self.propose(1)
        self.approve(base)
        activation = self.publish(base)
        changed = example(2)
        changed["probes"] = [item for item in changed["probes"] if item["id"] != "pms-negative"]
        with self.assertRaisesRegex(Rejected, "version-discriminating"):
            self.propose(base=activation, payload=changed)

    def test_receipt_cannot_prove_effect_or_cross_scope(self):
        release = self.propose()
        self.approve(release)
        activation = self.publish(release)
        pms = self.db.consumer_release(self.tokens["pms"])
        crm = self.db.consumer_release(self.tokens["crm"])
        self.assertNotEqual(crm["delivery_sha256"], pms["delivery_sha256"])
        self.assertNotIn("evidence", crm["payload"])
        self.db.acknowledge(self.tokens["pms"], activation, "activate", pms["delivery_sha256"])
        self.assertEqual(self.db.status(self.tokens["auditor"])["applications"][1]["state"], "unproven")
        with self.assertRaisesRegex(Rejected, "Role"):
            self.db.observe(self.tokens["pms"], activation, "pms", "activate", "pms-positive",
                            pms["delivery_sha256"], "allow", NOW, "urn:test", "a" * 64)
        with self.assertRaisesRegex(Rejected, "bound"):
            self.observe(activation, "crm", "activate", "pms-positive", crm["delivery_sha256"], "allow")
        with self.assertRaisesRegex(Rejected, "Role"):
            self.db.export(self.tokens["pms"], release)

    def test_stale_and_future_observations(self):
        release = self.propose(observation_max_age_seconds=60)
        self.approve(release)
        activation = self.publish(release)
        scoped = self.db.consumer_release(self.tokens["crm"])["delivery_sha256"]
        self.db.acknowledge(self.tokens["crm"], activation, "activate", scoped)
        with self.assertRaisesRegex(Rejected, "stale or in the future"):
            self.observe(activation, "crm", "activate", "crm-positive", scoped, "allow",
                         time="2026-11-25T16:00:01Z")
        for case in example()["probes"]:
            if case["application"] == "crm":
                self.observe(activation, "crm", "activate", case["id"], scoped, case["expected"])
        self.assertEqual(self.db.status(self.tokens["auditor"])["applications"][0]["state"], "verified")
        self.now = "2026-11-25T16:01:01Z"
        self.assertEqual(self.db.status(self.tokens["auditor"])["applications"][0]["state"], "unproven")

    def test_a_new_declaration_cannot_reuse_observations_from_an_earlier_load(self):
        release = self.propose()
        self.approve(release)
        activation = self.publish(release)
        scoped = self.db.consumer_release(self.tokens["crm"])["delivery_sha256"]
        cases = [case for case in example()["probes"] if case["application"] == "crm"]

        def record_cases():
            for case in cases:
                self.observe(activation, "crm", "activate", case["id"], scoped, case["expected"])

        self.db.acknowledge(self.tokens["crm"], activation, "activate", scoped)
        record_cases()
        self.assertEqual(self.db.status(self.tokens["auditor"])["applications"][0]["state"], "verified")
        self.db.acknowledge(self.tokens["crm"], activation, "activate", scoped)
        next_state = self.db.status(self.tokens["auditor"])["applications"][0]
        self.assertEqual(next_state["state"], "unproven")
        self.assertEqual({probe["result"] for probe in next_state["probes"]}, {"stale"})
        record_cases()
        self.assertEqual(self.db.status(self.tokens["auditor"])["applications"][0]["state"], "verified")

    def test_withdrawal_quarantine_requires_positive_confirmation(self):
        first = self.propose(1)
        self.approve(first)
        activation = self.publish(first)
        next_release = self.propose(base=activation)
        self.approve(next_release)
        with self.assertRaisesRegex(Rejected, "Withdraw"):
            self.publish(next_release, activation)
        with self.assertRaisesRegex(Rejected, "Role"):
            self.db.withdraw(self.tokens["publisher"], activation, "Invalid role")
        self.db.withdraw(self.tokens["supervisor"], activation, "Change no longer authorized")
        self.assertIsNone(self.db.consumer_release(self.tokens["crm"])["payload"])
        for app in ("crm", "pms"):
            self.db.acknowledge(self.tokens[app], activation, "withdraw", None)
        self.observe(activation, "crm", "withdraw", "withdrawal", None, "inactive")
        self.observe(activation, "pms", "withdraw", "withdrawal", None, "unobservable")
        with self.assertRaisesRegex(Rejected, "independent verification"):
            self.publish(next_release, activation)
        self.observe(activation, "pms", "withdraw", "withdrawal", None, "inactive")
        self.assertGreater(self.publish(next_release, activation), activation)

    def test_manifest_projection_and_audit_can_be_checked_offline(self):
        report = run()
        bundle = report["releases"][1]
        self.assertEqual(verify_release(bundle), bundle["release"])
        damaged = deepcopy(bundle)
        damaged["graph"]["@graph"].pop()
        with self.assertRaisesRegex(Rejected, "Graph projection"):
            verify_release(damaged)
        self.assertEqual(verify_events(report["audit"], report["ledger_tip"]), report["ledger_tip"])
        with self.assertRaisesRegex(Rejected, "tip"):
            verify_events(report["audit"][:-1], report["ledger_tip"])
        report["audit"][0]["payload"]["workspace"] = "tampered"
        with self.assertRaisesRegex(Rejected, "integrity"):
            verify_events(report["audit"])

    def test_frozen_candidate_and_ledger_cannot_be_changed_by_update(self):
        release = self.propose()
        with closing(sqlite3.connect(self.path)) as connection:
            with self.assertRaisesRegex(sqlite3.IntegrityError, "immutable"):
                connection.execute("UPDATE candidates SET payload='{}' WHERE id=?", (release,))
            with self.assertRaisesRegex(sqlite3.IntegrityError, "append-only"):
                connection.execute("DELETE FROM events")

    def test_impact_walks_to_process_contract_and_applications(self):
        self.assertTrue({"diligence", "dossier-check", "dossier-contract", "crm", "pms"} <=
                        set(impact(example(1), example(2))))

    def test_dictionaries_hierarchy_and_out_of_scope(self):
        payload = example()
        self.assertEqual(evaluate(payload["rules"][0], {"asset-type": "unit"}), "out_of_scope")
        self.assertEqual(evaluate(payload["rules"][0], {"inspection": True}), "hold")
        payload["edges"].append({"source": "asset", "predicate": "broader", "target": "building"})
        with self.assertRaisesRegex(Rejected, "Cycle"):
            validate(payload)

    def test_evidence_checksum_and_probe_condition(self):
        sample = example()
        sample["evidence"][0]["excerpt"] += " Altered"
        with self.assertRaisesRegex(Rejected, "checksum"):
            validate(sample)
        sample = example()
        sample["probes"][0]["expected"] = "hold"
        with self.assertRaisesRegex(Rejected, "contradicts"):
            validate(sample)

    def test_policywatcher_packet_can_only_prepare_unreviewed_evidence(self):
        change = "12345678-1234-1234-1234-123456789abc"
        packet = {"schema": PW_SCHEMA, "schemaVersion": "1.1.0", "publicationGate": "published",
                  "sourceConfidence": {"state": "available"}, "changeId": change, "contentDigest": "a" * 64,
                  "changeUrl": "https://policywatcher.online/change/" + change,
                  "screeningDate": "2026-11-24T14:23:12.008Z"}
        evidence = policywatcher_evidence(packet, "A short authorized passage")
        self.assertEqual(evidence["status"], "insufficient")
        self.assertNotEqual(evidence["sha256"], evidence["upstream"]["reported_sha256"])
        packet["publicationGate"] = "withheld"
        with self.assertRaisesRegex(Rejected, "withheld"):
            policywatcher_evidence(packet, "A short authorized passage")

    def test_entry_points_generate_machine_readable_release_package(self):
        report_path = self.path.with_suffix(".json")
        html_path = self.path.with_suffix(".html")
        result = subprocess.run([sys.executable, "-m", "ontograph", "demo", "--report", str(report_path),
                                 "--html", str(html_path)],
                                check=True, capture_output=True, text=True)
        self.assertEqual(json.loads(result.stdout)["drift"]["pms"], "mismatch")
        self.assertIn("pms-negative", html_path.read_text())
        report = json.loads(report_path.read_text())
        self.assertTrue(all(verify_release(item) for item in report["releases"]))
        self.assertEqual(digest(report["observations"][0]["artifact"]), report["observations"][0]["sha256"])
