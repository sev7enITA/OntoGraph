[OnToGraPh Wiki](README.md)

# Market position and standards

**OnToGraPh verifies what each application does after a shared rule changes.** The first buyer is a data governance, AI governance or operational risk lead accountable for one control used by two applications with distinct owners. The buyer can keep the existing catalog, graph engine and deployment pipeline. [Interactive competitive landscape](https://openontograph.org/#market)

## How the quadrant works

This is an OnToGraPh editorial assessment of selected workflows documented on **25 November 2026**. The quadrant format takes inspiration from research visualizations. OnToGraPh defines and applies its own qualitative criteria. Use the map to shortlist workflow fit and evaluate operating maturity, security, integration effort and price during procurement. [Format reference from Gartner](https://www.gartner.com/en/research/magic-quadrant)

| Axis | One end | Other end |
| --- | --- | --- |
| **Scope of semantic tooling** | **Focused workflow.** A specific task such as exploring an OWL file or governing a bounded semantic release. | **Dedicated semantic tooling.** The selected workflow covers ontology design and curation, dynamic analytical semantics, or a graph engine with inference or federation. |
| **Scope of verification** | **Model and platform checks.** The reviewed workflow covers exploration, authoring, review, publication, query checks or agent evaluation in the documented product scope. | **Consumer behavior after release.** The assessed workflow links each consumer's receipt to separate observations on the same activation and preserves whether withdrawal is verified, discrepant or unproven. |

Placements refer to the evaluated workflows in the sources below. A product can support additional workflows, integrations or custom verification. OnToGraPh's position is based on its **offline reference and synthetic CRM/PMS scenario**. A combined-stack pilot is a procurement option. Git and CI span multiple positions depending on the customer's configuration.

## Competitors and alternatives

| When this is the job | Choose or assess | Evidence and scope |
| --- | --- | --- |
| Give analysts and AI agents governed business context | **Databricks Genie** | Genie Ontology combines curated Unity Catalog semantics with learned context and can expose that context to other agents via the Genie One MCP server. Genie Agent benchmarks evaluate responses, including comparison to an expected SQL result in chat mode. [Ontology](https://docs.databricks.com/aws/en/genie/genie-ontology/) · [Benchmarks and monitoring](https://docs.databricks.com/gcp/en/genie-agents/monitor) |
| Derive analytical semantics from existing data and manage their publication | **NVIDIA Auto Ontology** | The documented publication workflow re-exports the same scope, checks model parity, runs positive and negative question and query probes, and verifies rollback where supported. [Architecture](https://github.com/NVIDIA/auto-ontology/blob/main/docs/architecture.md) · [Publication and rollback](https://github.com/NVIDIA/auto-ontology/blob/main/skills/nvidia-ontology-management/references/publication.md) |
| Design an ontology and map it to lakehouse assets | **OntoBricks** | The guide covers ontology design, mapping data assets, graph synchronization and domain version control. [User guide](https://www.ontobricks.org/documentation/user-guide.html) |
| Coordinate governance and approval of semantic assets | **TopBraid EDG** | Asset collections have isolated working copies, review and authorized commits to production copies. [Workflow documentation](https://docs.topquadrant.com/classic/latest/user_guide/workflows/index.html) |
| Query connected enterprise sources | **Stardog** | Virtual graphs map and query external data. [Virtual graphs](https://docs.stardog.com/virtual-graphs/) |
| Store and query RDF with inference | **GraphDB** | The dedicated graph engine provides RDF/SPARQL query and reasoning capabilities. [GraphDB](https://graphwise.ai/components/graphdb/) |
| Visualize an OWL ontology | **NinePts/OntoGraph** | An independently maintained OWL graphing project. [Repository](https://github.com/NinePts/OntoGraph) |
| Meet a bespoke assurance contract with the incumbent pipeline | **Git/CI + application tests** | GitHub Actions, for example, supports deployment approvals and protection rules. A team can add its own application probes, evidence receipts and withdrawal checks. Use that implementation as the primary economic baseline. [Deployment controls](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments) |
| Trace a shared rule to an observed decision and verify the effect of withdrawing it | **OnToGraPh** | A source-linked candidate is reviewed, distributed by application and checked through separate receipts and observations. The synthetic case shows a matching receipt with a divergent decision and an unreachable consumer whose withdrawal remains unproven. Real consumers require qualified adapters and evidence custody. [Aurora 21](AURORA-21.md) · [Release protocol](../PROTOCOL.md) |

## Blue Ocean hypothesis

The opportunity is **verifiable semantic change across separate application owners**. The buyer may already have a catalog, a graph, and a CI pipeline. The question is what it costs to show the chain from the changed field and approved rule to the outcome in each application, including after withdrawal. The proposed entry point is a fixed-scope pilot for a single control. [Four Actions Framework by Kim and Mauborgne](https://www.blueoceanstrategy.com/tools/four-actions-framework/)

| Four Actions | Choice for the initial offer |
| --- | --- |
| **Eliminate** | Treat the release receipt and observed effect as separate facts when deciding whether a change can close. |
| **Reduce** | Keep existing query and catalog infrastructure in place. Test whether stewards spend less time reconciling evidence across tickets, releases and apps. |
| **Raise** | Give the supervisor a clear withdrawal authority and preserve the field, source, decision and application links for review. |
| **Create** | Produce per-consumer evidence for the applied release and withdrawal. Keep an unreachable or unobserved consumer visible as unproven. |

The trade-off is narrower semantic infrastructure and the cost of independent probes and adapters. The thesis is worth pursuing if it reveals a material divergence the buyer's existing workflow misses or lowers the cost of obtaining equivalent evidence. The synthetic case demonstrates the mechanism. Customer tests establish operational effectiveness and willingness to pay. [Market proposal](../MARKET.md)

PolicyWatcher contributes change evidence and PALO Framework contributes the governance lifecycle. OnToGraPh supplies versioned semantics and per-application evidence that can support both projects. The first pilot should qualify the handoff from a verified source change, through an authorized rule, to what each application actually does. [Relationship to both projects](README.md#how-policywatcher-and-palo-benefit)

## Standards and interoperability

| Technology | Role in the project |
| --- | --- |
| **JSON-LD and RDF** | Independent tools can read the graph projection. The release JSON package also carries rules and expected cases. [JSON-LD](https://www.w3.org/TR/json-ld11/) |
| **SKOS, RDFS and OWL** | SKOS represents concepts, alternate labels and taxonomy. The projection uses a subset of OWL/RDFS for classes and subclasses. Connected engines can provide reasoning and formal authoring. [SKOS](https://www.w3.org/TR/skos-reference/) · [OWL](https://www.w3.org/TR/owl2-overview/) |
| **PROV-O** | Links a release to the evidence it derives from. An applicability decision has a recorded rationale and author. [PROV-O](https://www.w3.org/TR/prov-o/) |
| **SHACL** | Validates RDF graph structure in a compatible engine. OnToGraPh 0.1 uses native declarative checks and verifies consumer behavior after deployment. [SHACL](https://www.w3.org/TR/shacl/) |
| **Ossie and PALO** | Ossie provides an interchange format for analytical semantics and is a potential future input. PALO informs roles, gates and the distinction between authorization and verified effects. [Apache Ossie](https://ossie.apache.org/) · [PALO](https://paloframework.org/docs/palo-v3.1-governance-control-plane.html) |

## How to decide whether to pay

1. **Pre-register the comparison.** Agree with the control owner on one rule, one valid exception, two independently owned applications, expected behavior and a time window. Use equivalent cases and access in both the incumbent workflow and the pilot.
2. **Test failure modes.** Include a correct digest with a stale decision and a consumer unreachable after withdrawal. Confirm that the exception still succeeds and that timeouts remain unproven until a fresh observation arrives.
3. **Measure evidence and effort.** Report time from release to confirmed discrepancy, time from withdrawal request to observed inactivity by consumer, and evidence coverage as verified required app/case pairs divided by all required app/case pairs. Require a record bound to the application instance, activation and case, with the observer and artifact custody auditable. Record unresolved pairs and compare analyst, steward and engineering hours. Measure the second adapter separately to test repeatability.
4. **Make the investment decision.** Estimate annual labor benefit from the observed hours saved per comparable change, times annual change volume and loaded hourly cost. Compare this with annual operating and maintenance costs plus first-year adapter and rollout costs. Use low, expected and high change-volume assumptions. Track newly visible material risk separately, with an accountable buyer's valuation. Proceed when required evidence coverage is met and the buyer approves the economics or the observed risk improvement. Keep the incumbent if it provides equivalent evidence at comparable or lower effort.

[Market proposal and pilot criteria](../MARKET.md)

## When to keep your current stack

A skeptical buyer is right to keep Git/CI and the catalog if they already connect an approved release to observed decisions and verified withdrawal in each application. Introducing a second governance layer creates new ownership, adapter maintenance and evidence custody work. A paired test on real instances can change that decision when the evidence is auditable and OnToGraPh surfaces a material gap or reduces the cost of equivalent assurance.

This counterargument is adapted from **Inkling 2 Mini Uncensored**, run locally in LM Studio after challenges from **Gemini 4 Neon High** and **GLM-5.4 Max**. [Market challenge and decisions](../REVIEWS.md#market-challenge)
