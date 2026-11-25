import tempfile
import unittest
from copy import deepcopy
from pathlib import Path

from ontograph.aurora import NOW, example, prepare
from ontograph.exchange import verify_release
from ontograph.model import Rejected, assertion_basis, check_required_assessments, consumer_bundle, digest, impact, jsonld, validate, weighted_impact
from ontograph.store import Registry
from ontograph.workbook import read_xlsx, write_xlsx


def assessment(confidence=0.8, criticality=4):
    return {"confidence": confidence, "criticality": criticality, "evidence": "diligence-rule",
            "assessor": "Synthetic steward", "rationale": "Test fixture mapping review"}


def annotate(document, source, target, **values):
    edge = next(e for e in document["edges"] if e["source"] == source and e["target"] == target)
    edge["assessment"] = assessment(**values)
    return edge


class WeightedImpactTests(unittest.TestCase):
    def test_old_projection_and_release_remain_byte_compatible(self):
        doc = example(2)
        graph = jsonld(doc, doc["domain"], digest(doc))
        self.assertEqual(digest(graph), "1e21133e0297f4a604eef6804099e53fd1363924f1f8a34b1075109658fb3902")
        for path in weighted_impact(doc, "inspection")["paths"]:
            self.assertEqual(path["status"], "unassessed")
            self.assertIsNone(path["criticality"])
            self.assertIsNone(path["confidence"])

    def test_invalid_weights_and_evidence_are_rejected(self):
        for field, value in [
            ("confidence", True), ("confidence", -0.1), ("confidence", 1.01), ("confidence", "0.9"),
            ("confidence", float("inf")), ("confidence", float("nan")), ("criticality", False),
            ("criticality", 3.0), ("criticality", 0), ("criticality", 6), ("evidence", "nonexistent"),
            ("rationale", "  "), ("assessor", ""), ("unrecognized", True)
        ]:
            with self.subTest(field=field, value=value):
                doc = example(2)
                edge = annotate(doc, "crm", "dossier-contract")
                edge["assessment"][field] = value
                with self.assertRaises(Rejected):
                    validate(doc)
        with self.assertRaisesRegex(Rejected, "origin"):
            weighted_impact(example(2), "missing")

    def test_weakest_confidence_and_peak_criticality_share_one_path(self):
        doc = example(2)
        annotate(doc, "dossier-check", "inspection", confidence=1, criticality=2)
        annotate(doc, "dossier-check", "dossier-contract", confidence=0.2, criticality=3)
        annotate(doc, "crm", "dossier-contract", confidence=0, criticality=5)
        result = weighted_impact(doc, "inspection")
        crm = next(p for p in result["paths"] if p["nodes"][-1] == "crm")
        self.assertEqual(crm["nodes"], ["inspection", "dossier-check", "dossier-contract", "crm"])
        self.assertEqual((crm["status"], crm["confidence"], crm["criticality"]), ("assessed", 0, 5))
        self.assertEqual(crm["steps"][-1], {"source": "crm", "predicate": "consumes", "target": "dossier-contract"})
        pms = next(p for p in result["paths"] if p["nodes"][-1] == "pms")
        self.assertEqual((pms["status"], pms["confidence"], pms["criticality"]), ("unassessed", None, 3))
        self.assertEqual(pms["unassessed_edges"], 1)
        self.assertFalse(result["truncated"])
        # Hierarchies and dependencies have different impact semantics.
        self.assertFalse(weighted_impact(doc, "asset")["paths"])
        self.assertFalse(weighted_impact(doc, "crm")["paths"])

    def test_multiple_paths_stay_distinct_and_disputed_evidence_is_visible(self):
        doc = example(2)
        doc["edges"].append({"source": "crm", "predicate": "dependsOn", "target": "inspection",
                             "assessment": assessment(0.1, 5)})
        annotate(doc, "dossier-check", "inspection", confidence=0.9, criticality=2)
        doc["evidence"][0]["status"] = "disputed"
        first = weighted_impact(doc, "inspection")
        doc["edges"].reverse()
        self.assertEqual(first, weighted_impact(doc, "inspection"))
        paths = [p for p in first["paths"] if p["nodes"][-1] == "crm"]
        self.assertEqual(len(paths), 2)
        self.assertEqual(paths[0]["nodes"], ["inspection", "crm"])
        self.assertEqual(paths[0]["review_evidence"], ["diligence-rule"])
        self.assertEqual(paths[1]["status"], "review_required")
        self.assertEqual(paths[1]["unassessed_edges"], 2)
        self.assertIsNone(paths[1]["confidence"])

    def test_cycles_terminate_and_bounds_expose_incomplete_reports(self):
        doc = example(2)
        def process(key):
            return {"id": key, "kind": "process", "owner": "Test", "label": key, "definition": "Test"}
        previous = "inspection"
        for index in range(13):
            key = f"extra-{index}"
            doc["nodes"].append(process(key))
            doc["edges"].append({"source": key, "predicate": "dependsOn", "target": previous})
            previous = key
        self.assertTrue(weighted_impact(doc, "inspection")["truncated"])
        doc["edges"].append({"source": "extra-0", "predicate": "dependsOn", "target": "extra-12"})
        paths = weighted_impact(doc, "extra-0")
        self.assertFalse(paths["truncated"])
        self.assertTrue(all(len(set(p["nodes"])) == len(p["nodes"]) for p in paths["paths"]))
        for index in range(257):
            key = f"fan-{index}"
            doc["nodes"].append(process(key))
            doc["edges"].append({"source": key, "predicate": "dependsOn", "target": "unit"})
        paths = weighted_impact(doc, "unit")
        self.assertTrue(paths["truncated"])
        self.assertEqual(len(paths["paths"]), paths["limits"]["max_paths"])

    def test_changed_annotation_or_its_evidence_marks_dependent_nodes(self):
        before = example(2)
        after = deepcopy(before)
        annotate(after, "crm-property", "building")
        self.assertIn("crm-property", impact(before, after))
        self.assertIn("crm", impact(before, after))
        self.assertEqual(consumer_bundle(before, "crm"), consumer_bundle(after, "crm"))
        updated = deepcopy(after)
        updated["edges"][3]["assessment"]["rationale"] = "Reviewed new mapping evidence"
        self.assertIn("crm-property", impact(after, updated))
        self.assertIn("crm-property", impact(updated, before))
        updated = deepcopy(after)
        updated["evidence"][0]["status"] = "insufficient"
        self.assertIn("crm-property", impact(after, updated))

    def test_projection_excel_export_receipts_and_release_approval(self):
        doc = example(2)
        annotate(doc, "building", "asset")
        self.assertEqual(read_xlsx(write_xlsx(doc)), doc)
        with tempfile.TemporaryDirectory() as directory:
            registry = Registry(Path(directory) / "registry.sqlite", clock=lambda: NOW)
            tokens = prepare(registry)
            candidate = registry.propose(tokens["author"], doc, 0, ["steward", "owner"], 2, "Test")
            bundle = registry.export(tokens["author"], candidate)
            self.assertEqual(verify_release(bundle), candidate)
            graph = bundle["graph"]["@graph"]
            statement = next(item for item in graph if "rdf:subject" in item)
            self.assertEqual(statement["rdf:predicate"], {"@id": "skos:broader"})
            subject = next(item for item in graph if item["@id"] == statement["rdf:subject"]["@id"])
            self.assertIn(statement["rdf:object"], subject["skos:broader"])
            self.assertEqual(statement["og:assessor"], "Synthetic steward")
            self.assertEqual(statement["og:rationale"], "Test fixture mapping review")
            self.assertEqual(statement["og:confidence"], 0.8)
            self.assertEqual(statement["og:criticality"], 4)
            source = next(item for item in graph if item["@id"] == statement["prov:wasDerivedFrom"]["@id"])
            self.assertEqual(source["dct:source"]["@id"], doc["evidence"][0]["uri"])
            with self.assertRaisesRegex(Rejected, "quorum"):
                registry.publish(tokens["publisher"], candidate, 0)
            altered = deepcopy(bundle)
            altered["payload"]["edges"][0]["assessment"]["criticality"] = 5
            with self.assertRaisesRegex(Rejected, "digest"):
                verify_release(altered, candidate)
            statement["og:criticality"] = 5
            with self.assertRaisesRegex(Rejected, "projection"):
                verify_release(bundle, candidate)


    def test_required_origins_validate_as_draft_and_change_diff_and_projection(self):
        doc = example(2)
        check_required_assessments(doc)
        for invalid in ["inspection", None, [None], ["unknown-id"], ["inspection", "inspection"],
                        [node["id"] for node in doc["nodes"][:9]]]:
            with self.subTest(invalid=invalid), self.assertRaises(Rejected):
                validate(dict(doc, required_assessment_origins=invalid))
        change = dict(doc, required_assessment_origins=["inspection"])
        self.assertEqual(validate(change), change)
        self.assertEqual(read_xlsx(write_xlsx(change)), change)
        self.assertTrue({"inspection", "dossier-check", "crm", "pms"} <= set(impact(doc, change)))
        self.assertEqual(impact(doc, change), impact(change, doc))
        release = jsonld(change, "aurora-21", digest(change))["@graph"][0]
        self.assertEqual(release["og:requiredAssessmentOrigin"], [{"@id": "urn:ontograph:aurora-21:node:inspection"}])
        with self.assertRaisesRegex(Rejected, "missing on"):
            check_required_assessments(change)
        with self.assertRaisesRegex(Rejected, "no operational impact path"):
            check_required_assessments(dict(doc, required_assessment_origins=["crm"]))

    def test_registry_rejects_unassessed_after_quorum_and_allows_reviewed_complete_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            reg = Registry(Path(directory) / "db", clock=lambda: NOW)
            tokens = prepare(reg)
            doc = dict(example(2), required_assessment_origins=["inspection"])
            def propose():
                return reg.propose(tokens["author"], doc, 0, ["steward", "owner"], 2, "Mandatory assessed scope")
            def approve(candidate):
                for account in ["steward", "owner"]:
                    reg.review(tokens[account], candidate, "approve", "Checked candidate")
            def rejected(candidate, reason):
                with self.assertRaisesRegex(Rejected, reason):
                    reg.export_policy(tokens["author"], candidate)
                with self.assertRaisesRegex(Rejected, reason):
                    reg.publish(tokens["publisher"], candidate, 0)
            incomplete = propose()
            approve(incomplete)
            rejected(incomplete, "missing on")
            for edge in doc["edges"]:
                if edge["predicate"] in {"dependsOn", "consumes", "implements"}:
                    edge["assessment"] = assessment(0, 5)
            doc["evidence"][0]["status"] = "disputed"
            disputed = propose()
            approve(disputed)
            rejected(disputed, "unconfirmed evidence diligence-rule")
            doc["evidence"][0]["status"] = "confirmed"
            ready = propose()
            self.assertNotEqual(ready, incomplete)
            self.assertIsNone(check_required_assessments(doc))
            rejected(ready, "quorum")
            approve(ready)
            reg.export_policy(tokens["author"], ready)
            reg.publish(tokens["publisher"], ready, 0)
            reg.export_policy(tokens["author"], ready)

    def test_cycle_closing_edge_is_in_full_coverage_and_blocks_release(self):
        doc = example(2)
        # Starting at inspection -> dossier-check, an unassessed return to
        # inspection is excluded by simple route enumeration but belongs in coverage.
        doc["edges"].append({"source": "inspection", "predicate": "dependsOn", "target": "dossier-check"})
        for edge in doc["edges"][:-1]:
            edge["assessment"] = assessment()
        doc["required_assessment_origins"] = ["inspection"]
        result = weighted_impact(doc, "inspection")
        self.assertTrue(all(p["status"] == "assessed" for p in result["paths"]))
        self.assertEqual(result["coverage"]["first_unassessed"], doc["edges"][-1])
        self.assertIsNotNone(result["assessment_issue"])
        with self.assertRaisesRegex(Rejected, "inspection dependsOn dossier-check"):
            check_required_assessments(doc)
        doc["edges"][-1]["assessment"] = assessment()
        self.assertIsNone(check_required_assessments(doc))
        record = result["assessments"][0]
        self.assertEqual(record["assessment"], assessment())
        self.assertEqual(record["status"], "confirmed")
        self.assertEqual(record["observed_at"], doc["evidence"][0]["observed_at"])

    def test_full_coverage_finds_high_criticality_beyond_route_cap_and_fails_closed(self):
        doc = example(2)
        for index in range(257):
            key = f"fan-{index:03d}"
            doc["nodes"].append({"id": key, "kind": "process", "owner": "Test", "label": key, "definition": "Test"})
            doc["edges"].append({"source": key, "predicate": "dependsOn", "target": "asset",
                                 "assessment": assessment(criticality=5 if index == 256 else 1)})
        doc["required_assessment_origins"] = ["asset"]
        report = weighted_impact(doc, "asset")
        self.assertTrue(report["truncated"])
        self.assertEqual(len(report["paths"]), 256)
        self.assertEqual(max(p["criticality"] for p in report["paths"]), 1)
        self.assertEqual(report["coverage"]["max_known_criticality"], 5)
        self.assertEqual(report["coverage"]["reachable_edges"], 257)
        self.assertEqual(report["coverage"]["unassessed_edges"], 0)
        with self.assertRaisesRegex(Rejected, "limits reached at asset"):
            check_required_assessments(doc)


class AttributedAssertionsTests(unittest.TestCase):
    def setUp(self):
        self.doc = dict(example(2), required_assessment_origins=["dossier-contract"])
        for edge in self.doc["edges"]:
            if edge["predicate"] == "consumes":
                edge["assessment"] = assessment()
        self.edge = next(e for e in self.doc["edges"] if e["source"] == "crm" and e["predicate"] == "consumes")
        del self.edge["assessment"]
        source = dict(self.doc["evidence"][0], id="controller-record", uri="urn:test:controller")
        self.doc["evidence"].append(source)
        self.sources = {s["id"]: s for s in self.doc["evidence"]}
        self.edge["assertions"] = [
            dict(assessment(0.0, 5), id="finance", asserted_at="2026-11-25T13:00:00Z"),
            dict(assessment(1.0, 2), id="controller", evidence="controller-record", assessor="Controller",
                 asserted_at="2026-11-25T14:00:00Z", stance="challenges"),
        ]

    def resolve(self):
        self.edge["resolution"] = {
            "selected": "finance", "reviewer": "steward", "rationale": "Escalate using Finance scope.",
            "resolved_at": self.doc["effective_at"], "basis": assertion_basis(self.edge, self.sources),
        }

    def summary(self):
        report = weighted_impact(self.doc, "dossier-contract")
        return (next(p for p in report["paths"] if p["nodes"][-1] == "crm"),
                next(a for a in report["assessments"] if a["source"] == "crm"))

    def test_conflict_preserves_both_sources_and_requires_current_adjudication(self):
        route, item = self.summary()
        self.assertEqual((route["criticality"], route["confidence"], route["status"]), (5, None, "review_required"))
        self.assertEqual(route["unassessed_edges"], 0)
        self.assertEqual(item["resolution_state"], "unresolved_conflict")
        self.assertEqual({s["id"] for s in item["evidence_records"]}, set(self.sources))
        with self.assertRaisesRegex(Rejected, "unresolved conflict"):
            check_required_assessments(self.doc)
        self.resolve()
        chosen, item = self.summary()
        self.assertEqual((chosen["confidence"], chosen["criticality"], chosen["status"]), (0, 5, "assessed"))
        self.assertTrue(item["conflict"])
        self.assertEqual((item["criticality_range"], item["confidence_range"]), ([2, 5], [0, 1]))
        coverage = weighted_impact(self.doc, "dossier-contract")["coverage"]
        self.assertEqual((coverage["disagreement_edges"], coverage["unresolved_assertion_edges"]), (1, 0))
        self.assertEqual(item["resolution_state"], "resolved")
        self.assertIsNone(check_required_assessments(self.doc))
        self.edge["assertions"].reverse()
        self.assertEqual(self.summary(), (chosen, item))
        self.edge["assertions"][0]["rationale"] = "Updated interpretation of the second source."
        changed, item = self.summary()
        self.assertEqual((changed["confidence"], item["resolution_state"]), (None, "stale_resolution"))
        with self.assertRaisesRegex(Rejected, "stale resolution"):
            check_required_assessments(self.doc)

    def test_agreement_preserves_sources_and_explicit_challenge_requires_review(self):
        for a in self.edge["assertions"]:
            a.update(criticality=2, confidence=0.0, stance="supports")
        path, metadata = self.summary()
        self.assertEqual((path["confidence"], metadata["resolution_state"]), (0, "agreement"))
        self.assertFalse(metadata["conflict"])
        self.edge["assertions"][0]["stance"] = "challenges"
        path, metadata = self.summary()
        self.assertIsNone(path["confidence"])
        self.assertTrue(metadata["conflict"])
        self.resolve()
        with self.assertRaisesRegex(Rejected, "select an existing supporting"):
            validate(self.doc)

    def test_changed_evidence_or_selection_timing_and_export(self):
        self.resolve()
        self.assertEqual(read_xlsx(write_xlsx(self.doc)), self.doc)
        projected = jsonld(self.doc, self.doc["domain"], digest(self.doc))["@graph"]
        assertion_ids = {a["@id"] for a in projected if a["@type"] == "og:WeightAssertion"}
        references = {a["prov:wasDerivedFrom"]["@id"] for a in projected if a["@id"] in assertion_ids}
        self.assertEqual(len(assertion_ids), 2)
        self.assertEqual(len(references), 2)
        self.assertEqual({r["dct:identifier"] for r in projected if r["@id"] in references}, set(self.sources))
        decision = next(r for r in projected if r["@type"] == "og:AssertionResolution")
        self.assertTrue(decision["og:matchesCurrentBasis"])
        self.assertIn(decision["og:selectedAssertion"]["@id"], assertion_ids)
        before = deepcopy(self.doc)
        self.sources["controller-record"]["applicability"] = "The evidence applies to a narrower population."
        self.assertIn("crm", impact(before, self.doc))
        self.assertEqual(self.summary()[1]["resolution_state"], "stale_resolution")
        self.resolve()
        self.edge["resolution"]["resolved_at"] = "2026-11-25T13:59:59Z"
        with self.assertRaisesRegex(Rejected, "predates"):
            validate(self.doc)

    def test_group_validation_identity_and_digests(self):
        self.resolve()
        # Whole-valued JSON numbers and default stance have one adjudication basis in JS/Python.
        before = assertion_basis(self.edge, self.sources)
        self.edge["assertions"][0].update(confidence=0, stance="supports")
        self.assertEqual(assertion_basis(self.edge, self.sources), before)
        mutations = [
            lambda e: e.update(assessment=assessment()),
            lambda e: e.update(assertions=[]),
            lambda e: e["assertions"][1].update(id="finance"),
            lambda e: e["assertions"][0].update(stance=["fake"]),
            lambda e: e["assertions"][0].update(asserted_at="2026-11-25T11:00:00Z"),
            lambda e: e["assertions"][0].update(asserted_at=NOW),
            lambda e: e["assertions"][1].update(evidence="missing"),
            lambda e: e["resolution"].update(basis="unknown"),
            lambda e: e["resolution"].update(selected="unknown"),
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation), self.assertRaises(Rejected):
                model = deepcopy(self.doc)
                mutation(next(e for e in model["edges"] if "assertions" in e))
                validate(model)

    def test_registry_requires_named_reviewers_vote_and_stable_content(self):
        self.resolve()
        with tempfile.TemporaryDirectory() as folder:
            db = Registry(Path(folder) / "db", clock=lambda: NOW)
            tokens = prepare(db)
            def propose():
                return db.propose(tokens["author"], self.doc, 0, ["steward", "owner"], 1, "Adjudication")
            first = propose()
            db.review(tokens["owner"], first, "approve", "Reviewed scope")
            with self.assertRaisesRegex(Rejected, "authenticated approval.*steward"):
                db.export_policy(tokens["author"], first)
            with self.assertRaisesRegex(Rejected, "authenticated approval.*steward"):
                db.publish(tokens["publisher"], first, 0)
            db.review(tokens["steward"], first, "approve", "I accept the selected assessment")
            self.assertEqual(verify_release(db.export(tokens["author"], first)), first)
            self.edge["assertions"][0]["confidence"] = 0.7
            self.doc.pop("required_assessment_origins")
            changed = propose()
            self.assertNotEqual(changed, first)
            db.review(tokens["steward"], changed, "approve", "Reviewed updated candidate")
            with self.assertRaisesRegex(Rejected, "Stale assertion resolution"):
                db.export_policy(tokens["author"], changed)
            activation = db.publish(tokens["publisher"], first, 0)
            self.assertGreater(activation, 0)

    def test_legacy_weighted_projection_still_verifies(self):
        doc = example(2)
        doc["edges"][0]["assessment"] = assessment()
        projection = jsonld(doc, doc["domain"], digest(doc))
        self.assertEqual(digest(projection), "92a537a8e6a051a8838c5fbdbb4eb403458644dd22bf243faf8f1a73cd673308")
