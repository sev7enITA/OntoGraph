# Assess a change to a Finance WBS mapping

A Finance controller preparing month-end close wants to know which processes depend on the meaning of the ledger WBS field. In this synthetic case a wrong mapping could have a severe consequence, while only two sample rows support it. The default example also contains a spreadsheet dependency awaiting assessment.

[Interactive English walkthrough](https://openontograph.org/weights/) · [简体中文](https://openontograph.org/weights/zh/) · [Comparison and practitioner evidence](../../docs/WEIGHTED-RELATIONSHIPS-MARKET.md)

## Run it

From the repository root, use Python 3.10 or later.

```sh
python3 -m ontograph validate examples/weighted/finance-close.json
python3 -m ontograph weighted-impact examples/weighted/finance-close.json posting-object
python3 -m ontograph studio --model examples/weighted/finance-close.json
```

Open Semantic Studio at `http://127.0.0.1:8765/governance`. Inspect the relationship from `ledger-wbs` to `posting-object` and edit the assessment. Choose the posting object as the origin of the impact analysis. Follow the steps to `finance-close` and inspect each relationship. Validate and export the model to keep your changes. Comparing versions identifies assessment edits. A formal release uses the registry approval workflow.

## Choose the two grades

**Criticality** is the consequence of relying on an incorrect relationship in the stated scope. For a first team workshop, use 1 for limited local rework, 3 for a business process needing intervention, and 5 for a major decision or close requiring escalation. Agree on intermediate grades, accountable owners and local criteria before using the ranking across teams. **Confidence** expresses the assessor's degree of support for that relationship, from 0 to 1. The numbers are judgments. An empirical error rate requires sample definitions, observations and calibration.

The optional `assessment` on one edge contains five required fields. `evidence` references an evidence record in the same release with a source URI, excerpt, digest and observation time. `assessor` is a declared attribution. The authenticated votes in the registry are separate. An absent assessment means unknown. Zero is an explicit grade.

```json
{
  "source": "ledger-wbs",
  "predicate": "mapsTo",
  "target": "posting-object",
  "assessment": {
    "confidence": 0.35,
    "criticality": 5,
    "evidence": "finance-sample",
    "assessor": "Finance data steward",
    "rationale": "A wrong posting object can affect close. Two examples leave the legacy mapping uncertain."
  }
}
```

## Interpret the result

The declared impact chain runs from the changed concept to the field that maps to it and then to the process that depends on that field. For the close path, the engine takes the maximum known criticality across steps (5) and the minimum confidence (0.35). When a new source supports a 0.95 mapping grade, the downstream checklist becomes the weakest step at 0.90. Confirming a mapping does not change the business cost of a mistake.

For local reconciliation the worksheet dependency has no assessment. Confidence is unknown across that path, and the maximum shown covers only the known steps. Removing the mapping assessment has a different effect from assigning confidence zero. Marking a source disputed calls for review. The registry checks evidence and votes before publication. Consumer probes and withdrawal observations establish separate facts about runtime behavior.

This release designates `posting-object` in `required_assessment_origins`. All operational relationships reachable from that origin must have complete assessments with confirmed evidence. The low-confidence close branch can be fully documented while the missing worksheet assessment blocks publication of the candidate. Try **All dependencies assessed** to satisfy this requirement; normal human approval and optional CI verification still apply. In the CLI report, `coverage` counts distinct reachable edges, including cycle closures and edges beyond the displayed routes; `assessments` preserves the recorded grades and source details for the displayed edges.

The analyzer reports simple path prefixes. Overlapping paths can share steps; adding their criticalities or counting them as separate incidents would double-count exposure. For dense graphs the response advertises its limits and whether enumeration was truncated. A partial listing can omit high-criticality paths. Restrict the model to an appropriate decision scope for exhaustive review.

## Reproduce the public cases

Run `python3 -m examples.weighted.build_demo` from the checkout. The script derives the initial, corroborated, missing, disputed and fully assessed model/report pairs under `site/weights/`. Each report includes the canonical input model digest. Changing a selector on the public site reads the corresponding real engine output. Download the JSON to edit a custom input in Studio or run the CLI.
