# Hidden Risks of Vibe Coding

Two physical copies on a shelf can share an ISBN. If a lending app uses ISBN as the key for availability, lending the first copy can also hide the second. The screen can show exactly what the developer asked it to show while the person at the shelf gets the wrong answer. The personal library starter models the edition, the individual copy and the loan. [Open the library case](https://openontograph.org/journey/personal-library/)

## Agent-ready ontology

“Charge this expense to WBS 0017.” Finance uses the code for a posting object. The project management office uses it for a work package. In the film, the agent checks those definitions, asks “Which department do you mean?” and holds the expense. This illustrative dialogue shows how an agent can use the model. Test the missing-department case in your receiving application before enabling a posting action. [Watch the scene at 0:45](https://openontograph.org/launch/#agent-ready) · [Explore the WBS case](https://openontograph.org/journey/department-wbs/)

## Optional integration paths

The four guided cases, the personal app workflow and hosted Studio can all be used standalone. Expand **Optional integrations** to open a recorded branch in another tab. PolicyWatcher can provide read-only evidence for a policy change. PALO can receive a case for human review. Following either link leaves the draft in place and transmits none of its content to those frameworks. [Source intake](https://openontograph.org/pilot/#policywatcher) · [Review handoff](https://openontograph.org/pilot/#palo) · [From hidden risks to verified decisions](https://openontograph.org/launch/)


## Describe your own app

From the [homepage preview](https://openontograph.org/#hidden-risks), play the library or WBS example or jump to [Describe my app](https://openontograph.org/hidden-risks/#my-case). Write 10–3,000 characters about the actors, objects and decision. Try this brief: My app assigns volunteers to shelters and tracks “night shift” separately. Quotation marks help preserve your business terms.

You can also state definitions and typed relationships explicitly. For example, “Night shift” means a duty starting after midnight. “Night shift” is a type of “shift”. “Shift” depends on “volunteer”. Check the resulting definition, hierarchy and dependency in the proposal.

The browser uses bilingual patterns and extracts candidate terms. Four panels show risk questions and suggested tests, dictionary entries linked to words in the brief, a proposed taxonomy, and typed dependencies. Unrecognized vocabulary stays open for classification. The animated chart on the homepage counts items in the selected example.

Choose **Review in Studio** in the same tab. After sign-in, an editor gets a new private workspace for that proposal. Expand the review panels, edit a definition, classification or relationship, choose **Apply proposal edits**, then **Save draft**. Bookmark the workspace URL to reopen the saved revision. Viewers can inspect the proposal. **Download draft JSON** keeps a portable copy for offline use.

Generation runs in your browser. Opening Studio sends the model, including your description, to the authenticated service. The brief starts as insufficient evidence. The example rule and its two probes exercise a human-review condition. The owner still needs to review terms and verify the intended decisions in the receiving app.

## Bring one decision from your prototype

Start with a decision someone will rely on, such as “Can I lend this copy?” Write one case that should pass, one that should be held, and one with a missing input. Someone who does the work can supply all three examples before the team chooses a database or an AI model.

| Question | What to record | Example from the WBS case |
| --- | --- | --- |
| What does this term mean here? | Dictionary entry, definition and owner | Finance uses `0017` for a posting object. PMO uses the same code for a work package. |
| Where does that meaning apply? | Taxonomy and scope | Keep Finance and PMO as distinct departmental contexts. |
| Which decision depends on it? | Typed relationship from the field to the concept, control or application | The same text feeds a ledger eligibility decision and a workbook budget decision. |
| Can we trust this record for that use? | Data checks, source and review action | Preserve the leading zeros, require the department and hold an unqualified mapping for review. |
| What did the application do? | Consumer, model version, input, expected result and independent observation | Recalculate the workbook and compare its eligible budget with the expected budget for that release. |

The business owner names the exception and expected result. The developer models the distinction and runs the cases. They can then compare the saved draft with an observation from the application that actually uses the data. A draft check in Studio and a downstream observation are two separate pieces of evidence.

## Try it with synthetic data

1. Change the department and source in the [interactive WBS example](https://openontograph.org/hidden-risks/#risk-lab). Inspect which records a bare-code match can admit.
2. Open the [departmental WBS journey](https://openontograph.org/journey/department-wbs/). In Studio, inspect the competing evidence in the draft and use the case checklist to verify its decisions.
3. Read the [recorded two-application pilot](https://openontograph.org/wbs/). After acknowledging the new rule, Calc still counted €2,000 in eligible budget. Recalculating the correct workbook yielded €800. Following withdrawal, only a later read of €0 verified that the workbook had stopped counting the records. These amounts come from synthetic records in a local pilot.

[简体中文](https://github.com/sev7enITA/OntoGraph/wiki/Hidden-Risks-zh-Hans)
