# Use OnToGraPh for your app, file exchange or Copilot agent

English · [简体中文](README.zh-Hans.md)

Start with a decision your software needs to make. Which physical copy can I lend? What does the WBS column in this export identify? Model the smallest set of terms, relationships and checks needed to answer that question. The architecture puzzle explores alternative stacks. You edit the actual model in **Semantic Studio**.

## Open a working example

With Git and Python 3.10 or later installed, clone the repository once and start Studio. If you already have a checkout, run the last command from its root.

```sh
git clone https://github.com/sev7enITA/OntoGraph.git
cd OntoGraph
python3 -m ontograph studio
```

Open [Semantic Studio](http://127.0.0.1:8765/governance). The root opens the Process Modeler, where **Semantic Studio** takes you to the same place. Select **Import** and choose [personal-library.json](personal-library.json) or [department-wbs.json](department-wbs.json). In **Graph**, search for an object, select it and inspect its definition, owner, aliases and relationships. Use **+ Object** to add a concept or a field and **+ Relationship** to map a field to a concept with `mapsTo`. **Validate** checks model structure and expected test cases. **Save version** keeps a working copy in this browser. **Export → JSON** saves the portable model with rules and tests. Use **Versions** to compare edits.

## Personal project · build a lending app

1. **Decide what has its own identity.** Two physical copies may share an ISBN. Create an *Edition* concept for the publication and a *Physical copy* concept for the item on your shelf. Keep a separate `copy_id` for each item. The loan screen selects a copy. Search for `copy-id` in the example to see where the loan field points.
2. **Give the application one rule.** In the JSON view, find `lend-copy`. It permits the loan when the selected copy's `available` fact is true. The three probes cover an available copy, one already on loan, and missing availability. The last two return `hold`. Your application reads the availability from its own records.
3. **Use the model in code.** From the repository root, run the example below. It prints the concept label for the form, then evaluates the same rule for two copies of one edition. Change only the availability of COPY-02 and rerun. For a real loan, your application must also persist it and reserve the copy atomically to handle concurrent requests.
4. **Change the vocabulary safely.** In Graph, edit the display label of `physical-copy` to “Shelf copy”, keep the ID, validate and export JSON. Point the snippet at your exported file. The form label changes while the loan rule still uses `available`. Use JSON-LD export for a graph consumer. The release JSON carries the rules and probes used below.

```python
import json
from pathlib import Path
from ontograph.model import evaluate, validate

model = validate(json.loads(Path("examples/adoption/personal-library.json").read_text()))
nodes = {node["id"]: node for node in model["nodes"]}
print(nodes["physical-copy"]["label"])
rule = next(rule for rule in model["rules"] if rule["id"] == "lend-copy")
for copy_id, available in [("COPY-01", True), ("COPY-02", False)]:
    print(copy_id, evaluate(rule, {"available": available}))
```

## Enterprise · reconcile file exchanges between silos

The same column heading and even the same value can identify different things. These three sample rows are fictional local conventions. Read `0017` as text.

| Source and custodian | Incoming field and value | Meaning in this model | Stable concept ID |
| --- | --- | --- | --- |
| PMO scheduler | schedule.csv / WBS / 0017 | A work breakdown structure element in the project schedule | project-work-package |
| Finance ERP | ledger.csv / WBS / 0017 | The account assignment object that receives a posting | posting-object |
| Warehouse application | batch.csv / WBS / 0017 | A picking document called a Work Batch Sheet in this warehouse | batch-sheet |

1. **Collect one real exchange.** The sender supplies the file layout and sample rows. The recipient shows how it uses the value. Each department names a steward who can confirm the definition, grain and exceptions. Record the source system, layout version, department and column. In the example all three concepts carry the alias WBS.
2. **Agree on the mapping.** Open the WBS model in Studio. Follow each source field's `mapsTo` relationship. Mapping a field to its concept answers “what does this column mean?” Matching a particular work package to a Finance object requires a business crosswalk with the project, local keys, effective dates, cardinality and approving owners. A package may fund several posting objects. Keep these two decisions separate.
3. **Put a check before the receiver's import.** The existing integration job reads CSV or Excel, preserves original text and looks up the approved mapping by system, layout, department and field. For the declared v1 layout, `PMO / schedule.csv / WBS / 0017` yields `project-work-package / 0017`. A file from an unknown system with only `WBS=0017` goes to review. A missing or ambiguous business crosswalk also goes to review whenever the target needs an instance-level join.
4. **Record the outcome.** For each row keep batch ID, source row, original value, concept ID, mapping version, destination and reason. Reconcile accepted + held rows to input count and identify retried rows by batch and source row ID. The importer computes the boolean fact `resolved` for semantic staging. The sample rule `admit-row` returns `allow` for true and `hold` for false or missing. It does not parse a vendor file or verify a join. The receiving application's import receipt and an independent readback establish which records actually arrived.
5. **Hand over a controlled change.** Export the validated model. For formal approval use a configured registry, distinct reviewers and a publisher. Link the approved release to its source mappings and the batch. Repeat a known-good, ambiguous and unknown-layout row against the receiving application. Track held rows / rows received and independently checked target rows / accepted rows. A missing readback stays unproven. [Registry and DevOps guide](../devops/README.md)

**File formats.** The operational CSV/XLSX goes to your staging job. Studio imports a release JSON or an OnToGraPh semantic workbook. Use its **Export → Excel** to get the editable workbook with Path, Type and Value columns. **Validate** checks the model. Business data, ETL schedules, crosswalk approvals and receiver readbacks belong to the organization's integration process.

## Microsoft 365 Copilot · ground answers in the company dictionary

A SharePoint list is one practical publication route. The steward publishes a readable projection of the approved dictionary, and an authenticated Copilot agent uses that list as knowledge. This is a manual integration pattern. The supplied [glossary CSV](wbs-glossary.csv) is a synthetic training projection with three rows.

1. **Prepare a list.** Use the CSV to create or populate a SharePoint list for a test. Set ConceptID, SourceField and ExampleCode to text so `0017` keeps its leading zeros. Keep the three rows separate even though their Title is WBS. Verify definitions and all three codes after import. For production, add steward, approval status, effective date and an accessible source link. Replace training references with the actual approved release identifier and link. Publish only current approved records in the knowledge source; keep retired records in a separate archive. Permissions follow the intended audience.
2. **Connect a named agent.** In Microsoft Copilot Studio open your agent, go to **Knowledge → Add knowledge → SharePoint**, select the list, add a description such as “Current definitions by department, concept ID and source field”, then **Add to agent**. Use Microsoft authentication. Share the agent with a test group after checking its members' access to the list and the tenant's licensing and sharing settings. This configures that agent's answers. Other Copilot conversations retain their own sources. [SharePoint knowledge](https://learn.microsoft.com/en-us/microsoft-copilot-studio/knowledge-add-sharepoint) · [Microsoft 365 agent knowledge and licensing](https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/knowledge-sources)
3. **Give the agent a resolution rule.** “For a business acronym, look up the current glossary. Use the department, source system or file name to select a meaning. Give the concept ID and cite the source. If the context fits several records, ask which department or file the user means. If no accessible record supports an answer, say so. Never infer that two records refer to the same object from the acronym or code alone.”
4. **Test before sharing.** Use the lab cases below. Record the prompt, user role, answer, cited source, expected concept and release. For the permissions test use an account with no access to the test list and no alternative source containing the training entry. An answer citing a retired release, choosing a meaning without context, or revealing a restricted definition fails. After an approved change, update the list and rerun the cases with a fresh conversation. Retain the old test report for comparison.

| Ask the agent | Passing behavior |
| --- | --- |
| “What does WBS mean?” | Asks for department, source or file before selecting one. |
| “What does WBS 0017 in Finance's ledger.csv identify?” | Returns posting-object and cites the glossary. A definition alone cannot identify a specific posting in the ERP. |
| “In the warehouse batch.csv, what is WBS?” | Returns batch-sheet and cites the warehouse definition. |
| “PMO and Finance both export 0017. Can I join the rows?” | Requests the approved project-specific crosswalk. |
| User without access asks for the warehouse's internal definition | Provides no restricted definition or protected record content. |

For a first pilot, report correct concept and citation / unambiguous questions, clarification requests / ambiguous questions, and restricted disclosures / access-denied tests. Run the same questions before and after connecting the glossary with the same user roles. The acceptance cases above are expected results; each tenant needs its own observed answers.

## Assess the WBS mapping

Extend the departmental exercise by assessing how a wrong Finance mapping could affect month-end close. Try a disputed source and an unassessed spreadsheet dependency. [Interactive case](https://openontograph.org/weights/)

## Two teams, one WBS mapping

Try a model with two attributed and conflicting assessments, record a decision in the authenticated Studio and verify actual application outputs through withdrawal. [Walkthrough and sample models](https://openontograph.org/wbs/)
