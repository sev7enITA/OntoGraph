"""A public browser proposal must remain importable by the authenticated Studio."""
import json
from pathlib import Path
import shutil
import subprocess
import unittest

from ontograph.model import validate


@unittest.skipUnless(shutil.which("node"), "Node is required for browser generator checks")
class PersonalCase(unittest.TestCase):
    def test_proposals_preserve_brief_and_generate_typed_relations(self):
        briefs = [
            ('Our app assigns volunteers to shelters. Track the “night shift”.', False),
            ('我们将志愿者分配到避难所，追踪“夜班”。', True),
            ('A library lends physical copies and tracks the ISBN of each book.', False),
            ('“星潮值”是指每小时记录的潮位。“星潮值”属于“读数”。“读数”依赖于“传感器”。', True),
        ]
        module = Path(__file__).resolve().parents[1] / "site/assets/case-model.js"
        script = """
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const src = fs.readFileSync(process.argv[1]).toString('base64');
const {propose} = await import('data:text/javascript;base64,'+src);
const briefs = JSON.parse(fs.readFileSync(0,'utf8'));
const models = [];
for (const [brief,zh] of briefs) models.push((await propose(brief,zh,'case-test')).model);
console.log(JSON.stringify(models));
"""
        run = subprocess.run(["node", "--input-type=module", "-e", script, str(module)],
                             input=json.dumps(briefs), text=True, check=True, capture_output=True)
        models = json.loads(run.stdout)
        for model, (brief, _) in zip(models, briefs):
            validate(model)
            self.assertEqual(model["evidence"][0]["excerpt"], brief)
            self.assertEqual(model["evidence"][0]["status"], "insufficient")
            self.assertTrue(any(e["predicate"] == "broader" for e in model["edges"]))
            self.assertTrue(any(n["id"].startswith("risk-") for n in model["nodes"]))
        for model in models[:2]:
            self.assertEqual({e["target"] for e in model["edges"] if e["source"] == "assignment"
                              and e["predicate"] == "dependsOn"}, {"participant-0", "participant-1"})
        self.assertTrue(any(n["id"] == "isbn" for n in models[2]["nodes"]))
        by_label = {n["label"]: n for n in models[3]["nodes"]}
        self.assertEqual(by_label["星潮值"]["definition"], "每小时记录的潮位")
        for source, predicate, target in (("星潮值", "broader", "读数"), ("读数", "dependsOn", "传感器")):
            self.assertIn({"source": by_label[source]["id"], "predicate": predicate, "target": by_label[target]["id"]}, models[3]["edges"])
