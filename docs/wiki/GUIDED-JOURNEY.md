# Choose a case and open the model in Studio

Start with the decision you need to make. Each case links the relevant topic pages and tools to a downloadable model and a specific task in Semantic Studio. [Start the guided journey](https://openontograph.org/journey/) · [简体中文](https://openontograph.org/zh/journey/)

## Choose your case

| Case | Try this first | Model for Studio |
| --- | --- | --- |
| **Personal library** | Decide whether an available copy can be lent when a different copy of the same title is on loan. Read about operational meaning and model building blocks. [Personal library journey](https://openontograph.org/journey/personal-library/) | [Personal library JSON](https://openontograph.org/guide/personal-library.json) |
| **WBS across departments** | Trace the code `0017` across PMO and Finance. Inspect the assessments on the disputed mapping and compare observed application results during activation and withdrawal. [Department WBS journey](https://openontograph.org/journey/department-wbs/) | [Unresolved WBS JSON](https://openontograph.org/wbs/unresolved.json) · [Department dictionary JSON](https://openontograph.org/guide/department-wbs.json) |
| **Copilot glossary** | Compare the meanings of WBS across departments. Draft a clarification question for an ambiguous request and state what citation would support an answer. [Copilot glossary journey](https://openontograph.org/journey/copilot-glossary/) | [Department dictionary JSON](https://openontograph.org/guide/department-wbs.json) |
| **Policy change** | Follow a source change through PolicyWatcher, a scoped decision in OnToGraPh and human review in PALO. Choose who should review the source and what an application should report. [Policy change journey](https://openontograph.org/journey/policy-change/) | [Policy change JSON](https://openontograph.org/journey/models/policy-change.json) |

The Copilot route includes an optional [training glossary CSV](https://openontograph.org/guide/wbs-glossary.csv) for a SharePoint test list. Import the department dictionary JSON in Studio. Use the CSV during the separate Copilot knowledge-source exercise in your tenant. The policy-change model is a synthetic transfer example for practising the handoff. [Practical guide](https://openontograph.org/guide/)

## Work through the case

1. **Choose the decision.** Open one case and read the task it asks you to complete.
2. **Prepare and try.** Follow the suggested topic explanations and run the tool for your case. The topic collection covers theory, practice, pilot collaboration and project operation. [Browse all 19 topics](https://openontograph.org/explore/)
3. **Get the model.** Download the case JSON in the model step. Open it in online or local Semantic Studio using the steps below.

## Import and keep a draft

- **Online Studio.** Open the Studio link in the case’s model step. If asked to sign in, sign in first, return to the case page and open that link again to enter its named workspace. With editing access, activate **Import model** using Enter or a click and choose the downloaded JSON. **Save draft** keeps your changes under your account.
- **Local Studio.** From the repository root, run `python3 -m ontograph studio`, open **Semantic Studio** and use **Import**. Alternatively, load a downloaded file at startup with `python3 -m ontograph studio --model /path/to/model.json`. Inspect the objects and relationships, then choose **Validate** and **Save version** when you have made a change. [Local Studio](http://127.0.0.1:8765/governance) · [Studio documentation](https://github.com/sev7enITA/OntoGraph/wiki/Visual-Studio)

[GitHub Wiki](https://github.com/sev7enITA/OntoGraph/wiki/Guided-Journey) · [简体中文 Wiki](https://github.com/sev7enITA/OntoGraph/wiki/Guided-Journey-zh-Hans)
