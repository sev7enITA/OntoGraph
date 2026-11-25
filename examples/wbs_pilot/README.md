# One WBS change, two independent business applications

[简体中文](README.zh-Hans.md) · [Observed results](observed-summary.json) · [Download the evidence](observed-evidence.zip)

A known WBS code, `0017`, qualifies under the baseline rule. Finance treats it as an account assignment and PMO uses it as a work package. The reviewed change also requires the source department to match. Beancount/Beanquery calculates eligible EUR ledger postings from a native journal. LibreOffice Calc calculates an eligible EUR planning budget in a separate OpenDocument workbook. The observer runs each application and reads the monetary result for three records, including a positive and a negative control. Neither native runtime reads the registry's expected answers.

Finance attests that its mapping is usable in its ledger context (confidence 0.85, consequence 4/5). PMO challenges the interpretation of an unqualified code (confidence 0.30, consequence 5/5). Both excerpts are authentic records of what the fictional departments asserted. Their difference blocks the designated release even after two approving votes. A new candidate retains both assertions and records the steward's selection, rationale, time and basis digest. The steward accepts Finance's assessment under the stricter department rule and votes again on that candidate. The estimates express steward judgments.

## What happened

| Checkpoint | Beancount close report | Calc budget report |
| --- | ---: | ---: |
| Baseline | EUR 475 eligible | EUR 2,000 eligible |
| Baseline withdrawn | EUR 0 verified | EUR 0 verified |
| New package acknowledged | EUR 125, verified | EUR 2,000, mismatch. The importer deliberately reopened the baseline workbook. |
| Correct workbook installed | EUR 125, verified | EUR 800, verified |
| Withdrawal acknowledged | EUR 0, verified | EUR 800, mismatch. The old formula is still admitting records. |
| Workbook file taken offline | Previous EUR 0 observation retained | Unknown. The observer could not read the workbook. |
| Workbook comes back and withdrawal applied | EUR 0, verified | EUR 0, verified |
| Baseline published again under new approval | EUR 475, verified | EUR 2,000, verified |

Each department measures a different monetary quantity. Compare each column with its own approved behavior. The withdrawal check recalculates native output, verifies that all three positive-valued source records are still present, and requires the eligible total to be zero. Restoring the earlier rule is a separate reviewed release. The capture contains 15 observation artifacts, 70 hash-linked registry events and four immutable release candidates. The PMO outage is deliberately created by moving the active workbook out of its expected location, and the recovery invokes LibreOffice again.

## Verify the capture

From the repository root use Python 3.10 or later. The archive verifier uses only the standard library and the OnToGraPh checkout.

```sh
python3 -m examples.wbs_pilot.evidence examples/wbs_pilot/observed-evidence.zip \
  --expected-tip fcca37d9398ddc451708e6d98f2843244c83259e3cff5cba1ee751e9ca6e9424
```

To inspect a result, match a checkpoint in `summary.json` to its `artifact_sha256` under `artifacts/`. Its JSON lists the original file names and content hashes. Use those hashes to open the native ledger and query or workbook and CSV export. The chain binds these captures to the release, application, observer and observation time. An independently retained checkpoint is needed for protection against replacing the entire archive.

## Run both applications

Install LibreOffice Calc with its headless `soffice` executable on the PATH or at the standard macOS application location. In a Python 3.12 virtual environment install the tested Beancount packages. From the repository root:

```sh
python3.12 -m venv /tmp/wbs-pilot-env
. /tmp/wbs-pilot-env/bin/activate
python -m pip install beancount==3.2.3 beanquery==0.2.0
python -m examples.wbs_pilot.run out/my-first-wbs-pilot
python -m examples.wbs_pilot.evidence out/my-first-wbs-evidence.zip --package out/my-first-wbs-pilot
```

Use a new output directory for every execution. Each run has a local SQLite governance registry, separate native inputs, a dedicated Calc profile and real observation times. Fresh release and observation digests will vary. The two applications run as separate programs on the same workstation under one OS account. The registry creates distinct role-bound principals for each consumer, author, reviewer, publisher, supervisor and observer. The role actions are scripted. The data, discrepancy and outage are synthetic. This run establishes local application behavior on the three records, with no customer data, financial posting, independent human sign-off or externally attested production identity. A customer deployment must qualify its own identities and observers.
