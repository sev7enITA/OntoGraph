<img src="../../assets/brand/github-cover.png" alt="OnToGraPh and the Aurora 21 case: one rule change, two application decisions." width="900">

# OnToGraPh Wiki

**When a shared rule changes, which applications are actually applying it?**

OnToGraPh links the source excerpt, the affected control, the approval and the delivered version to the results observed in each application. It is designed for data governance, AI governance and operational risk owners who need to close a change across systems with different owners.

## Start here

- [Hidden Risks of Vibe Coding](https://openontograph.org/hidden-risks/) · [氛围编程的隐性风险](https://openontograph.org/zh/hidden-risks/). [Field guide](https://github.com/sev7enITA/OntoGraph/wiki/Hidden-Risks) · [中文指南](https://github.com/sev7enITA/OntoGraph/wiki/Hidden-Risks-zh-Hans).
- **Choose a case, try the relevant tools and download a Studio model.** [English](https://openontograph.org/journey/) · [简体中文](https://openontograph.org/zh/journey/) · [Workflow guide](GUIDED-JOURNEY.md) · [简体中文文档](GUIDED-JOURNEY.zh-Hans.md).
- [Try the interactive pilot](https://openontograph.org/pilot/) or [简体中文](https://openontograph.org/pilot/zh/). Follow the PolicyWatcher-to-PALO case or switch to the standalone scenario.
- [Inspect Aurora 21 evidence](https://openontograph.org/demo/). Compare what the simulated CRM and PMS report with their observed decisions.
- [Run the engine and local Studio](../../README.md#run-the-engine-and-studio). Start with the bundled model and inspect individual fields, rules and controls.

## How the framework works

| Principle | What it means in practice |
| --- | --- |
| **O · Operational Ontology** | Dictionaries, taxonomies and typed graph relations connect shared definitions to executable rules and the applications that use them. |
| **T · Traceability to Every Field** | Inspect individual properties and follow their links to source evidence, affected rules and downstream consumers. |
| **G · Governance with Human Authority** | Assigned reviewers approve or object, operators monitor observations, and supervisors can withdraw an activation. |
| **P · Proof of Behavior** | Separate what each consumer declares from what a scoped test observes, including after withdrawal. |

| Page | What it covers |
| --- | --- |
| [Why OnToGraPh exists](WHY-ONTOGRAPH.md) | The problem, who faces it and the questions the project answers |
| [Market position and standards](MARKET-AND-STANDARDS.md) | How the project can complement catalogs, knowledge graphs and Git/CI workflows |
| [Practical guide](https://openontograph.org/guide/) | Importable personal and enterprise models, a Copilot glossary and the [architecture puzzle](https://openontograph.org/architecture/) |
| [Visual Studio](STUDIO.md) | The native Process Modeler, semantic layers, field-level editing and paired pilot |
| [Governance hub](HUB.md) | Top-down PALO authority, bottom-up PolicyWatcher evidence and the shared OnToGraPh engine |
| [Aurora 21](AURORA-21.md) | A rule changes, the PMS declares the expected digest and produces a divergent result |
| [Framework](../FRAMEWORK.md) | Roles, accountability, the six PALO phases and the scope of evidence |
| [Protocol and CLI](../PROTOCOL.md) | Formats, operations, PolicyWatcher exchange, observation and withdrawal |
| [Market proposal](../MARKET.md) | Buyer, first pilot and decision criteria |

## How PolicyWatcher and PALO benefit

OnToGraPh runs independently with your own model and evidence. In the three-framework hub, this spin-off of PolicyWatcher and PALO Framework provides dictionaries, taxonomies, typed relationships and versioned controls. PolicyWatcher provides source evidence from the bottom up. PALO provides authority and review gates from the top down. OnToGraPh links both to a version, application and observed outcome. [Three-framework hub](HUB.md)

| Project | What it contributes | What OnToGraPh can return |
| --- | --- | --- |
| **PolicyWatcher** | A change record, evidence packet and authorized excerpt to import offline for human review. [PolicyWatcher](https://policywatcher.online/) · [Evidence exchange](../PROTOCOL.md#inputs-and-optional-adapters) | A trace from the source change to affected fields, the approved release and the outcome observed in each application. A future feedback adapter could attach those results to the policy change record. |
| **PALO Framework** | Governance roles, lifecycle gates and evidence requirements. [PALO Framework](https://paloframework.org/) · [Lifecycle and controls](../FRAMEWORK.md#the-six-gates) | An executable semantic-release workflow and exportable records of approval, observation and withdrawal that can support a PALO review. |

A live PolicyWatcher packet passed through a local OnToGraPh release into PALO’s Assessment Path. PALO reopened Measure and Prove for human review. A separate calibration laboratory exercised the same engine offline with its own model. [Run the integration and standalone pilots](https://github.com/sev7enITA/OntoGraph/tree/main/examples/hub_pilot)

Version 0.1 is an offline reference implementation. Aurora 21 demonstrates release and verification with two simulated applications. Validation with real consumers and willingness to pay are goals for a customer pilot.

[Public project site](https://openontograph.org/) · [Repository quick start](../../README.md)

[Weighted relationships and decision impact](https://openontograph.org/weights/) · [Comparative research](../WEIGHTED-RELATIONSHIPS-MARKET.md)

## Evidence disagreements and verified withdrawal

[Read the WBS pilot](https://openontograph.org/wbs/) · [简体中文](https://openontograph.org/wbs/zh/) · [Downloadable inputs and reproduction steps](../../examples/wbs_pilot/README.md)
