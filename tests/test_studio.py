"""Integration checks for local Studio and the reused process workbench."""

import json
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from zipfile import ZipFile
from io import BytesIO

from ontograph.aurora import NOW, example, prepare
from ontograph.exchange import PW_SCHEMA
from ontograph.model import digest
from ontograph.store import Registry
from ontograph.studio import StudioServer, changes, inspect
from ontograph.workbook import write_xlsx


@contextmanager
def studio(registry=None):
    with StudioServer(0, registry=registry) as server, ThreadPoolExecutor(max_workers=1) as worker:
        worker.submit(server.serve_forever, 0.02)
        try:
            yield server
        finally:
            server.shutdown()


def request(server, path, value=None, headers=None, binary=None):
    headers = headers or {}
    if value is not None:
        data = json.dumps(value).encode()
        headers = {"Content-Type": "application/json", **headers}
    else:
        data = binary
    try:
        return urlopen(Request(server.url + path, data=data, headers=headers), timeout=3)
    except HTTPError as error:
        error.close()
        raise


class StudioTests(unittest.TestCase):
    def test_landing_preserves_process_workbench_and_links_governance(self):
        with studio() as server:
            with request(server, "/") as response:
                self.assertEqual(response.url, server.url + "/processi/")
                html = response.read().decode()
                self.assertIn("functional-editor.js", html)
                self.assertIn("../governance?from=processi", html)
                self.assertIn("script-src 'self';", response.headers["Content-Security-Policy"])
            with request(server, "/processi/boot.js") as response:
                self.assertTrue(response.read())
            with request(server, "/governance") as response:
                self.assertIn(b'id="inspector"', response.read())
            with self.assertRaises(HTTPError) as hidden:
                request(server, "/processi/../../study.sqlite")
            self.assertEqual(hidden.exception.code, 404)

    def test_server_validates_comparison_and_returns_application_cases(self):
        with studio() as server:
            with request(server, "/api/bootstrap") as response:
                bootstrap = json.load(response)
                self.assertFalse(bootstrap["registry"])
            with request(server, "/api/validate", {"model": bootstrap["model"], "base": bootstrap["base"]}) as response:
                result = json.load(response)
            self.assertEqual(result["digest"], digest(example()))
            self.assertEqual(len(result["probes"]), 8)
            self.assertEqual(result["blockers"], [])
            self.assertIn("pms", result["impact"])
            self.assertIn(["rules", "evidence-present", "requires", "inspection"],
                          [item["path"] for item in result["diff"]["items"]])
            with request(server, "/api/demo") as response:
                demo = json.load(response)
            self.assertEqual(demo["drift"]["applications"][1]["state"], "mismatch")

    def test_paired_trial_leaves_an_unmeasured_incumbent_open_and_rejects_false_withdrawal(self):
        with studio() as server:
            with request(server, "/api/pilot-example") as response:
                dossier = json.load(response)
            with request(server, "/api/pilot/assess", dossier) as response:
                assessment = json.load(response)
            self.assertEqual(assessment["scope"], "synthetic")
            self.assertEqual(assessment["dossier_sha256"], digest(dossier))
            self.assertEqual(assessment["decision"], "incomplete")
            self.assertEqual(dossier["arms"]["incumbent"]["outcomes"], [])

            outcomes = dossier["arms"]["ontograph"]["outcomes"]
            unreachable = next(item for item in outcomes if item["case_id"] == "withdrawal_unreachable")
            self.assertEqual(unreachable["verdict"], "unproven")
            unreachable["verdict"] = "withdrawal_verified"
            with request(server, "/api/pilot/assess", dossier) as response:
                self.assertEqual(json.load(response)["decision"], "reject")
            unreachable["instance"] += "-different"
            with self.assertRaises(HTTPError) as wrong_instance:
                request(server, "/api/pilot/assess", dossier)
            self.assertEqual(wrong_instance.exception.code, 400)

    def test_pilot_uses_complete_paired_effort_only_after_matching_results(self):
        with studio() as server:
            with request(server, "/api/pilot-example") as response:
                dossier = json.load(response)
            for case in dossier["cases"]:
                case["activations"]["incumbent"] = "incumbent-run"
            for arm, minutes in (("incumbent", 45), ("ontograph", 20)):
                dossier["arms"][arm]["effort"] = dict.fromkeys(dossier["arms"][arm]["effort"], minutes)
            dossier["arms"]["incumbent"]["outcomes"] = [
                {**item, "activation": "incumbent-run"} for item in dossier["arms"]["ontograph"]["outcomes"]
            ]
            with request(server, "/api/pilot/assess", dossier) as response:
                assessment = json.load(response)
            self.assertEqual(assessment["decision"], "ontograph-lower-effort")
            self.assertEqual(assessment["effort"]["delta_minutes"], 100)
            dossier["scope"] = "customer"
            with self.assertRaises(HTTPError) as synthetic_relabel:
                request(server, "/api/pilot/assess", dossier)
            self.assertEqual(synthetic_relabel.exception.code, 400)

    def test_policywatcher_intake_returns_a_review_draft_and_rejects_withheld_source(self):
        change_id = "11111111-1111-4111-8111-111111111111"
        packet = {
            "schema": PW_SCHEMA, "schemaVersion": "1.1.0", "publicationGate": "published",
            "sourceConfidence": {"state": "verified-retrieval", "publicSnapshotEvidence": True},
            "snapshots": {"current": {"sha256": "b" * 64, "capturedAt": NOW}},
            "changeId": change_id, "contentDigest": "a" * 64,
            "changeUrl": "https://policywatcher.online/change/" + change_id,
        }
        with studio() as server:
            with request(server, "/api/policywatcher-draft", {"packet": packet, "excerpt": "Synthetic clause."}) as response:
                evidence = json.load(response)["evidence"]
            self.assertEqual(evidence["status"], "insufficient")
            self.assertEqual(evidence["upstream"]["id"], change_id)
            with self.assertRaises(HTTPError) as too_late:
                request(server, "/api/policywatcher-draft", {"packet": packet, "excerpt": "Synthetic clause.",
                                                            "effective_at": "2025-01-01T00:00:00Z"})
            self.assertEqual(too_late.exception.code, 400)
            invalid = json.dumps(packet).replace('"published"', '"published", "publicationGate": "published"')
            with self.assertRaises(HTTPError) as duplicate:
                request(server, "/api/policywatcher-draft", {"packet": invalid, "excerpt": "Synthetic clause."})
            self.assertEqual(duplicate.exception.code, 400)
            packet["publicationGate"] = "withheld"
            with self.assertRaises(HTTPError) as withheld:
                request(server, "/api/policywatcher-draft", {"packet": packet, "excerpt": "Synthetic clause."})
            self.assertEqual(withheld.exception.code, 400)

    def test_nested_diff_and_id_alignment(self):
        before, after = example(), example()
        after["nodes"].reverse()
        after["evidence"][0]["status"] = "insufficient"
        output = changes(before, after)
        self.assertEqual(output, {"items": [{"path": ["evidence", "diligence-rule", "status"],
                                            "op": "replace", "before": "confirmed", "after": "insufficient"}],
                                  "total": 1})
        self.assertTrue(inspect({"model": after})["blockers"])

    def test_workbook_upload_and_export_bundle_use_frozen_source(self):
        model = example()
        with studio() as server:
            with request(server, "/api/export", {"model": model, "format": "zip"}) as response:
                with ZipFile(BytesIO(response.read())) as archive:
                    self.assertEqual(json.loads(archive.read("model.json")), model)
                    self.assertIn("graph.jsonld", archive.namelist())
                    self.assertIn(b"flowchart LR", archive.read("graph.mmd"))
                    workbook = archive.read("model.xlsx")
            with request(server, "/api/import-workbook",
                         headers={"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
                         binary=workbook) as response:
                self.assertEqual(json.load(response)["model"], model)

    def test_cross_origin_and_invalid_model_are_rejected(self):
        with studio() as server:
            with self.assertRaises(HTTPError) as not_local:
                request(server, "/api/validate", {"model": example()}, headers={"Origin": "https://other.example"})
            self.assertEqual(not_local.exception.code, 403)
            with self.assertRaises(HTTPError) as invalid:
                request(server, "/api/validate", {"model": {"format": "not-a-model"}})
            self.assertEqual(invalid.exception.code, 400)

    def test_registry_operations_use_existing_authority(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "local.sqlite"
            registry = Registry(path, clock=lambda: NOW)
            tokens = prepare(registry)
            with studio(path) as server:
                command = {"action": "propose", "arguments": {"payload": example(), "base": 0,
                           "reviewers": ["steward"], "quorum": 1, "reason": "Studio candidate"}}
                with self.assertRaises(HTTPError) as missing_token:
                    request(server, "/api/registry", command)
                self.assertEqual(missing_token.exception.code, 400)
                headers = {"Authorization": "Bearer " + tokens["author"]}
                with request(server, "/api/registry", command, headers) as response:
                    candidate = json.load(response)["result"]
                with self.assertRaises(HTTPError) as wrong_role:
                    request(server, "/api/registry", {"action": "publish", "arguments": {
                        "release_id": candidate, "expected_head": 0,
                    }}, headers)
                self.assertEqual(wrong_role.exception.code, 400)
