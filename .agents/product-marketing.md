# OntoGraph product marketing context

Document version v1 · 2026-11-25

## Product

OnToGraPh is an independent open-source framework. It began as the shared ontology layer for PALO Framework and PolicyWatcher. The original software is MIT-licensed.

OnToGraPh verifies how applications behave after a shared rule or definition changes. It links the source, scope, approval and release to the observations made on each application. A withdrawn release can still be active on a consumer, so withdrawal is verified separately.

The current offer is an offline reference implementation and a scoped pilot proposal. The core runtime uses Python and SQLite. A possible business model is a fixed-scope paid pilot, followed by support and connector maintenance. Pricing and willingness to pay require customer evidence.

## Audience and jobs

People who build with AI can start with one business decision and a counterexample. A business owner defines the term in context and the expected outcome. A developer can reuse that distinction in the model and check the receiving app. Use the two-copy library example for personal projects and the departmental WBS pilot for cross-application evidence. This positioning addresses an existing data risk that rapid prototyping can carry into production.

| Role | Job to be done |
| --- | --- |
| Head of Data Governance, AI Governance or Operational Risk | Know whether a cross-application change can be closed with sufficient evidence |
| Data steward and policy owner | Explain what changed, when it applies, and which controls and applications may be affected |
| Application owner and integration lead | Establish which rule the app reports, and prove what it does on discriminating cases |
| Supervisor and auditor | Distinguish a withdrawal request from observed inactivity, and recover the original evidence and review trail |

The first customer hypothesis is a team with one shared policy, two applications with different owners, and an outcome that can be tested. Cross-team evidence collection creates the strongest reason to evaluate OntoGraph. For a single controlled deployment with existing traceable behavioral tests, the current pipeline may already answer the same questions.

## Alternatives and differentiation

NVIDIA Auto Ontology builds analytical semantics from data and usage. Genie uses modeled and learned context to support analytics. TopBraid and OntoBricks have semantic authoring and review workflows. Stardog and GraphDB serve graph queries and reasoning. Git and CI can assemble the same assurance workflow when the customer owns the necessary adapters, observations and audit trail.

The blue-ocean hypothesis is a product around **the behavior of applications after release**, including the gap between a matching receipt and an old decision and the proof of withdrawal at each consumer. The customer should be able to keep their catalog, graph engine and pipeline. Current evidence is a synthetic reference workflow. Deployment portability and measured cost require a customer pilot.

## Buyer objections and switching

| Buyer objection | Response |
| --- | --- |
| «We already have Git and CI.» | Run the same change on the same cases. Compare time to find drift, scope of withdrawal evidence, and work across teams. |
| «We already have an ontological catalog.» | Keep it as the source for semantic authoring. Start with one release on which two applications depend. |
| «The first connector will cost more than the work it replaces.» | Measure implementation effort and follow with a second connector before estimating recurring value. |

Push comes from an unresolved cross-application incident or audit question. Pull comes from one repeatable test and evidence trace. The main friction is integrating an observer with each app and getting the owners to agree on expected results. Existing Git and ticket workflows are a strong baseline.

## Language and proof

Use direct questions such as «What actually changed in each application?» and «Has this version stopped being used?» These are proposed discovery questions, with no customer quotes collected yet.

Write in concrete terms. Name the consumer, version, test case and expected versus observed result. Use qualified language around simulation, sampling and time windows. Reserve compliance, production scale and independence claims for separately verified evidence.

| Evidence | Scope |
| --- | --- |
| Aurora 21 shows a matching PMS digest with the wrong decision | Synthetic CRM/PMS simulators |
| Timeout leaves withdrawal unproven | Demonstrated in the reference workflow |
| JSON-LD export parsed and queried independently using RDFLib | Synthetic projection, 83 triples |
| Release review, receipt freshness and observation tests | Current repository CI. Use the latest run when citing counts externally |

## Goal

Show the synthetic case, then agree on one real change and two applications to evaluate against the customer's Git and CI baseline. Record time to find divergence, hours of adapter work, and whether the buyer will fund a pilot.

## Changelog

- v1 (2026-11-25). Initial context from the repository, buyer hypothesis and Aurora 21 evidence.
