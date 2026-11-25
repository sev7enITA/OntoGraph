"""Verify the revision and account boundaries of hosted semantic drafts."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location("hosted_service", ROOT / "deploy/hosted-decisions/service.py")
service = module_from_spec(spec)
spec.loader.exec_module(service)


class HostedDrafts(unittest.TestCase):
    def test_draft_isolated_by_user_and_workspace_and_stale_saves_conflict(self):
        with TemporaryDirectory() as directory:
            def request(user, workspace, operation="bootstrap", data=None):
                return service.handle(operation, user, workspace, data or {},
                                      Path(directory) / "drafts.sqlite", ROOT / "examples/weighted/finance-close.json")

            original = request("first", "wbs")
            model = original["model"]
            model["scope"] = "Private Finance exercise"
            self.assertEqual(request("first", "wbs", "save", dict(revision=0, model=model)), {"revision": 1})
            self.assertEqual(request("first", "wbs")["model"], model)
            for user, workspace in (("second", "wbs"), ("first", "alternate")):
                boot = request(user, workspace)
                self.assertEqual(boot["revision"], 0)
                self.assertNotEqual(boot["model"]["scope"], model["scope"])
            with self.assertRaises(service.Conflict):
                request("first", "wbs", "save", dict(revision=0, model=model))
            self.assertEqual(request("first", "wbs", "save", dict(revision=1, model=model)), {"revision": 2})
