# Design cross-checks

On 25 November 2026, the models reviewed the synthetic scenario and the technical invariants. The registry and demo run without a model. The review checked model findings against requirements and local tests.

| Model and environment | Contribution | Decision and verification |
| --- | --- | --- |
| Gemini 4 Neon **High**, Antigravity | Transactional consistency of quorum and base activation, three interoperability checks and first-adapter cost | Frozen manifests with per-app digests, concurrent compare-and-swap, export and offline verification. The canonicalization profile is specific to this project. RDFLib independently verified a projection of 83 triples, SKOS/PROV-O and SPARQL. Jena, Oxigraph and RDF canonicalization remain additional checks. |
| **GLM-5.4 Max**, ZCode | A case that distinguishes the old version, observation freshness, objections that survive reviewer deactivation and the distinction between suspending delivery and verifying withdrawal | Changed rules require a distinguishing case for each app. Tests cover expiry, objections, timeouts and downstream withdrawal checks. Observations apply to the tested sample. |
| **Qwen 3.8 27B Uncensored**, LM Studio | Distinguish matching hashes from observed behavior, measure divergence and verify offline recovery | The demo compares the simulators' responses. The proposed automatic rollback was declined. An unreachable consumer remains unproven after withdrawal. |
| **Inkling 2 Mini Uncensored**, LM Studio | Two checks, the second covering a newly declared receipt with the same digest and observations that were still fresh | The registry assesses the latest receipt. Observations must have a later sequence and a capture time at or after the receipt. The test demonstrates `verified → unproven → verified` after redeclaration and fresh observation. Binding to a real runtime instance needs a qualified adapter. |

Review of the offline report found that its first version attributed a result to the old rule without demonstrating the link in the displayed evidence. The report now shows both digests and compares the observed and expected outcomes. A separate Chromium check verified keyboard navigation, layouts from 320 to 1440 px and offline rendering.

## Market challenge

On 25 November 2026, we challenged the positioning against the buyer's incumbent stack. Gemini and GLM received the same description of the synthetic case, published vendor workflows and unqualified production dependencies. The question was what would justify a purchase and what would make a buyer decline. The findings below are summaries of the responses.

| Model and environment | Challenge | Decision |
| --- | --- | --- |
| **Gemini 4 Neon High**, Antigravity | The simulation establishes a mechanism. The map can suggest comparable production maturity if the offline reference is presented like a vendor deployment. Run a paired pilot and count both missed failures and adapter effort. | Label the evidence on the plotted OnToGraPh entry. In a real pilot, inject stale decisions behind matching receipts and unreachable consumers after withdrawal. Reject any missed case or falsely verified withdrawal. |
| **GLM-5.4 Max**, ZCode | A correct result is only as reliable as the identity of the consumer instance and the custody of the observation. A well-configured Git/CI pipeline may match the whole workflow. | Require results bound to the exact app instance and activation and retain evidence under accountable custody. Compare both stacks on the same blinded cases. Equivalent assurance can still justify adoption if the buyer observes materially lower total effort. |
| **Inkling 2 Mini Uncensored**, LM Studio (local inference) | A buyer with governed Git/CI can reasonably decline a second governance layer until a real-instance test establishes receipt, decision and withdrawal under auditable custody. Compare stale-decision detection, false withdrawal confirmations and reviewer verification time. | Publish the counterargument alongside the offer. Account for maintenance, evidence custody and the people responsible for each adapter when comparing the costs. |

These model reviews challenged the proposed claims and pilot design. The project’s observed evidence remains the Aurora 21 simulation. [Counterargument for buyers](https://www.fabriziodegni.com/OnToGraPh/#skeptics)

## Studio implementation

- Gemini's distinction between a simulation and operational evidence is visible in the Evidence layer and the paired pilot's scope. The seeded dossier leaves the incumbent unmeasured.
- GLM's identity and custody challenge becomes a case binding that the paired pilot checks against each submitted result. The pilot requires an observer, capture time, artifact hash and custody reference. An operator still has to verify them against the actual system.
- Inkling's incumbent case becomes an assessment outcome. When both arms match the preregistered cases and the incumbent's total recorded effort is equal or lower, the assessor reports the incumbent as viable.

[Studio workflow](wiki/STUDIO.md) · [Shared governance hub](wiki/HUB.md)
