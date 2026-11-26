"""Verify the revision and account boundaries of hosted semantic drafts."""
import json
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


    def test_guided_cases_seed_once_and_reopen_the_saved_draft(self):
        sources = {
            "journey-personal-library": "guide/personal-library.json",
            "journey-department-wbs": "wbs/unresolved.json",
            "journey-copilot-glossary": "guide/department-wbs.json",
            "journey-policy-change": "journey/models/policy-change.json",
        }
        with TemporaryDirectory() as directory:
            root = Path(directory)
            database = root / "drafts.sqlite"
            seed = ROOT / "examples/weighted/finance-close.json"

            def request(user, workspace, operation="bootstrap", data=None):
                return service.handle(operation, user, workspace, data or {}, database, seed, root)

            self.assertEqual(set(sources), service.JOURNEY_WORKSPACES)
            for workspace, path in sources.items():
                blob = (ROOT / "site" / path).read_text()
                (root / (workspace + ".json")).write_text(blob)
                expected = service.validate(json.loads(blob))
                preview = request("editor", workspace)
                self.assertEqual(preview, {"revision": 0, "model": expected, "starter": True})
                prepared = request("editor", workspace, "prepare")
                self.assertEqual(prepared, {"revision": 1, "model": expected})
                self.assertEqual(request("editor", workspace, "prepare"), prepared)
                edited = dict(prepared["model"], scope="Private edits retained")
                request("editor", workspace, "save", {"revision": 1, "model": edited})
                self.assertEqual(request("editor", workspace, "prepare"), {"revision": 2, "model": edited})
                self.assertEqual(request("editor", workspace), {"revision": 2, "model": edited})
                self.assertEqual(request("viewer", workspace), preview)
            with self.assertRaises(service.Rejected):
                request("editor", "ordinary-project", "prepare")


    def test_checklist_records_breakouts_on_saved_revision_and_checks_fixed_reference_cases(self):
        from copy import deepcopy
        with TemporaryDirectory() as directory:
            root = Path(directory)
            workspace = "journey-personal-library"
            model = ROOT / "site/guide/personal-library.json"
            (root / (workspace + ".json")).write_bytes(model.read_bytes())

            def request(operation, payload=None, user="editor"):
                return service.handle(operation, user, workspace, payload or {},
                                      root / "drafts.sqlite", model, root)

            draft = request("prepare")["model"]
            self.assertEqual(request("checklist")["draft_revision"], 1)
            run = request("checklist-run", {"draft_revision": 1})
            self.assertEqual(len(run["checks"]), 3)
            self.assertTrue(all(check["match"] for check in run["checks"]))
            observation = {"draft_revision": 1, "version": 0, "completed": ["draft", "inspect"],
                           "outcome": "different", "note": "The fixture used a different copy."}
            with self.assertRaises(service.Rejected):
                request("checklist-save", dict(observation, note=" "))
            stored = request("checklist-save", observation)
            self.assertEqual(stored, request("checklist"))
            self.assertEqual(stored["outcome"], "different")
            self.assertEqual(request("checklist", user="viewer")["outcome"], "unrecorded")
            with self.assertRaises(service.Conflict):
                request("checklist-save", observation)
            modified = deepcopy(draft)
            modified["rules"][0]["id"] = "lend-copy-revised"
            for probe in modified["probes"]:
                probe["rule"] = "lend-copy-revised"
            request("save", {"revision": 1, "model": modified})
            self.assertEqual(request("checklist")["outcome"], "unrecorded")
            with self.assertRaises(service.Conflict):
                request("checklist-save", dict(observation, version=1))
            new_run = request("checklist-run", {"draft_revision": 2})
            self.assertTrue(all(not check["match"] and check["result"] is None for check in new_run["checks"]))
