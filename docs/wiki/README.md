<img src="../../assets/brand/ontograph-wordmark.png" alt="OnToGraPh logo" width="360">

# OnToGraPh Wiki

**When a shared rule changes, which applications are actually applying it?**

OnToGraPh links the source excerpt, the affected control, the approval and the delivered version to the results observed in each application. It is designed for data governance, AI governance and operational risk owners who need to close a change across systems with different owners.

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
| [Visual Studio](STUDIO.md) | The original process modeler, semantic projection, field-level editing and export |
| [Aurora 21](AURORA-21.md) | A rule changes, the PMS declares the expected digest and produces a divergent result |
| [Framework](../FRAMEWORK.md) | Roles, accountability, the six PALO phases and the scope of evidence |
| [Protocol and CLI](../PROTOCOL.md) | Formats, operations, PolicyWatcher exchange, observation and withdrawal |
| [Market proposal](../MARKET.md) | Buyer, first pilot and decision criteria |

## How PolicyWatcher and PALO benefit

- PolicyWatcher monitors policy changes. The OnToGraPh offline adapter carries a locally supplied evidence packet and an authorized excerpt into a draft for human review. Stewards can map the change to affected controls and test its effect in each application. [PolicyWatcher](https://policywatcher.online/) · [Evidence exchange](../PROTOCOL.md#inputs-and-optional-adapters)
- Teams applying PALO Framework can use OnToGraPh as a reference for evidence at governance gates. A semantic change has a source, a recorded decision on a frozen release, observations on specific cases and an auditable withdrawal when needed. [PALO Framework](https://paloframework.org/) · [Lifecycle and controls](../FRAMEWORK.md#the-six-gates)

Version 0.1 is an offline reference implementation. Aurora 21 demonstrates release and verification with two simulated applications. Validation with real consumers and willingness to pay are goals for a customer pilot.

[Public project site](https://www.fabriziodegni.com/OnToGraPh/) · [Repository quick start](../../README.md)
