import tempfile
import unittest
from pathlib import Path

from examples.wbs_pilot.consumers import HERE, tools
from examples.wbs_pilot.evidence import package, verify
from examples.wbs_pilot.run import run


class WbsPilotTests(unittest.TestCase):
    def check_outcomes(self, summary):
        def pair(label, name):
            row = next(s for s in summary["steps"] if s["step"] == label)["applications"][name]
            return row["state"], row["eligible"]
        self.assertTrue(summary["unresolved_candidate_block"])
        self.assertEqual(pair("baseline", "finance"), ("verified", 475))
        self.assertEqual(pair("stale_workbook", "finance"), ("verified", 125))
        self.assertEqual(pair("stale_workbook", "pmo"), ("mismatch", 2000))
        self.assertEqual(pair("qualified", "pmo"), ("verified", 800))
        self.assertEqual(pair("withdrawal_still_active", "pmo"), ("mismatch", 800))
        self.assertEqual(pair("source_unavailable", "pmo"), ("unproven", None))
        for app in ("finance", "pmo"):
            self.assertEqual(pair("withdrawn", app), ("withdrawal_verified", 0))
        self.assertEqual(pair("restored", "pmo"), ("verified", 2000))
        self.assertEqual(pair("restored", "finance"), ("verified", 475))

    def test_published_evidence_matches_observations(self):
        import json
        summary = json.loads((HERE / "observed-summary.json").read_text())
        self.assertEqual(verify(HERE / "observed-evidence.zip", summary["ledger_tip"]), summary)
        self.check_outcomes(summary)

    def test_two_native_applications(self):
        try:
            tools()
        except FileNotFoundError as exc:
            self.skipTest(str(exc))
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / "pilot"
            summary = run(folder)
            self.check_outcomes(summary)
            archive = Path(tmp) / "evidence.zip"
            package(folder, archive)
            self.assertEqual(verify(archive, summary["ledger_tip"]), summary)
