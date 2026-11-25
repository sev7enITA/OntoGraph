# OntoGraph Governance Framework 0.1

## Decision scope

OntoGraph governs a change to the meaning or use of a data concept, contractual interface or executable control. Its output is a release and a record of how each registered consumer behaved on a bounded set of cases. The accountable domain owner decides applicability and acceptable residual risk. Affected users and counterparties need a route to raise a correction to the relevant owner. This release implements a local steward workflow. Formal appeal and organizational remedy procedures belong to the deployment.

The local pilot boundary is a single workspace, a register of agents and people represented by role-bound credentials, and one explicit set of application contracts. A deployment records data categories, retention, prohibited uses, owners, decision authority and intended effects before a candidate enters review. Source contents and business cases must be minimized to the text or fixture authorized for the purpose.

## The six gates

The phases follow the [published PALO lifecycle](https://paloframework.org/). The release protocol is specific to OntoGraph. PALO applicability and evidence are reviewed for each deployment.

| Phase | Decision | Evidence or control | Status in the reference |
| --- | --- | --- | --- |
| **Frame** | What is changing and who owns it? | Domain, purpose, scope, owner and effective time. PALO `ctrl-purpose-boundary`. | Required fields and date. Real affected stakeholders and prohibited uses are part of onboarding. |
| **Classify** | Which concepts, applications and people might be affected? | Typed edges, field mappings, dependency closure and explicit control scope. | Graph diff and impact implemented. Legal classification remains a human task. |
| **Assess** | Is the evidence sufficient and applicable? | Source reference, exact excerpt hash, observed time, applicability rationale and known contradictions. PALO `ctrl-data-provenance`. | Disputed or insufficient evidence blocks activation. Source authority and completeness involve human judgment. |
| **Control** | May this version become available to the applications? | Candidate hash, independent assigned reviewers, quorum, unresolved objections, active reviewer identities, compare-and-swap and role-bound publish. PALO `ctrl-human-review`, `ctrl-change-gate`. | Enforced in the registry. A confirmed evidence flag is reviewed within the frozen candidate. |
| **Measure** | Did the release behave as intended on the selected cases? | Expected cases and separate receipt and observation. Scope, bundle digest, timestamps and expiry. PALO `ctrl-decision-trace`. | Implemented. Adapter identity or production source verification depends on deployment. |
| **Prove & Review** | Can a reviewer reconstruct the release or establish that its use stopped? | Exported manifest, events, a retained checkpoint, independent withdrawal checks, and a newly approved recovery candidate. PALO `ctrl-incident-response`. | Reference withdrawal and recovery exercised. Business outcome requires separate evidence. |

Sources for the lifecycle, control requirements and traceability include the [PALO v3.1 Governance Control Plane](https://paloframework.org/docs/palo-v3.1-governance-control-plane.html) and [From Permission to Proof](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7352318). OntoGraph 0.1 is an independently versioned project.

## Authority and accountability

| Power | Who | What the interface records |
| --- | --- | --- |
| Prepare a proposal | Author or steward working as author | Source references, rationale, base activation, impacts and tests. Results from an LLM or external catalog enter as untrusted inputs. |
| Approve or object | Assigned independent reviewer | A vote on the frozen digest and a reason. An unresolved objection stays blocking even if the reviewer credential is disabled. |
| Publish | Publisher | Comparison against the exact base activation, quorum, evidence state, activation time and resolved objections. |
| Declare a loaded version | Consumer | Its own app scope and the delivered package digest. |
| Observe an effect | Observer | Time, independent artifact locator and digest, app, case, observed bundle and result. |
| Withdraw | Supervisor | Identity, scope, reason and time. An unreachable app remains unproven. |
| Inspect or challenge evidence | Auditor or domain owner | Read-only evidence review and timeline. Organizational escalation continues outside the pilot. |
| Enroll principals | Registry administrator | Role and binding. The host administrator and registry database are trusted in this version. |

Human **in the loop** approves or objects. Human **on the loop** inspects observed behavior and evidence freshness. Human **over the loop** withdraws and reviews the effects of that action. A compensation or replacement is a fresh proposal. A timeout can leave an unknown effect and is not a signal to retry a write.

## Data and portability

- A concept's reference is based on its workspace and stable ID. Labels and aliases can change. A mapping from a field to a term remains distinct from a taxonomy parent or class relationship.
- The projection uses [SKOS](https://www.w3.org/TR/skos-reference/) for concepts and schemes, a small [OWL/RDFS](https://www.w3.org/TR/owl2-overview/) vocabulary for classes, [PROV-O](https://www.w3.org/TR/prov-o/) for source derivation and [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/) for exchange. The release JSON remains the lossless authoritative package, including rules and probes. The graph is a documented projection.
- Model validation enforces reference integrity, typed relations, acyclic taxonomies, scoped contract delivery and reference evaluator consistency. Optional graph-engine integration can add [SHACL](https://www.w3.org/TR/shacl/), RDF canonicalization, SPARQL and profile-based inference. The 0.1 runtime uses Python checks and a limited declarative policy operator, with explicit JSON semantics.
- A digest binds bytes to a reference. The expected digest comes from a separately trusted channel to detect replacement. Attribution and observation assurance depend on authenticated principals, artifact custody and the test source. The audit log is hash chained under the local trust perimeter.
- Evidence collection and authorization remain explicit. JSON-LD context is embedded. No external loader or network fetch runs in the core.

## Example risks and evidence to collect

| Failure | Pilot control | Deployment proof |
| --- | --- | --- |
| Glossary overload, homonyms or different granularity | Stable IDs, context, typed mappings, out-of-scope case | Human review of the critical field-to-concept mappings and their integration test |
| Old logic returns plausible results | At least one differentiating case for a changed rule per applicable app | Independent request, fixture and result trace that reaches the app's actual execution surface |
| Good result sampled once and then lost | Observation window and drift state | Repeat all critical probes over time and after app deployments, capture runtime identity |
| Stopped publisher, active offline consumer | No active delivery, explicit withdrawal and independent negative readback | Bound lease expiry and isolation on the actual consumer, demonstrated while offline |
| Reviewer bias or false exclusion | Independent voting and blocking objections | Named owner, dissent, escalation, evaluation of affected groups and remedy plan where relevant |
| Evidence retained beyond purpose | Manual scoped excerpt selection, no source crawl | Retention policy, deletion and audit retention tests for the customer deployment |

Review source selection, accessibility, stakeholder notice and quality-of-service impacts as part of a customer case. The first commercial qualification measures adapter effort and failure recovery before any claim about availability, scale or reliability.

## Decision impact

The steward rates the consequence of a wrong dependency and confidence in its supporting evidence. The reviewer inspects dependent processes, unknowns and disputed sources. The publisher verifies the designated assessment scope, review votes and applicable CI requirements. The observer records the consumer outcome separately. [Interactive case](https://openontograph.org/weights/)
