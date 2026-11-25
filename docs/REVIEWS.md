# Design cross-checks

On 25 November 2026, the models reviewed the synthetic scenario and the technical invariants. The registry and demo run without a model. The review checked model findings against requirements and local tests.

| Model and environment | Contribution | Decision and verification |
| --- | --- | --- |
| Gemini 4 Neon **High**, Antigravity | Transactional consistency of quorum and base activation, three interoperability checks and first-adapter cost | Frozen manifests with per-app digests, concurrent compare-and-swap, export and offline verification. The canonicalization profile is specific to this project. RDFLib independently verified a projection of 83 triples, SKOS/PROV-O and SPARQL. Jena, Oxigraph and RDF canonicalization remain additional checks. |
| **GLM-5.4 Max**, ZCode | A case that distinguishes the old version, observation freshness, objections that survive reviewer deactivation and the distinction between suspending delivery and verifying withdrawal | Changed rules require a distinguishing case for each app. Tests cover expiry, objections, timeouts and downstream withdrawal checks. Observations apply to the tested sample. |
| **Qwen 3.8 27B Uncensored**, LM Studio | Distinguish matching hashes from observed behavior, measure divergence and verify offline recovery | The demo compares the simulators' responses. The proposed automatic rollback was declined. An unreachable consumer remains unproven after withdrawal. |
| **Inkling 2 Mini Uncensored**, LM Studio | Two checks, the second covering a newly declared receipt with the same digest and observations that were still fresh | The registry assesses the latest receipt. Observations must have a later sequence and a capture time at or after the receipt. The test demonstrates `verified → unproven → verified` after redeclaration and fresh observation. Binding to a real runtime instance needs a qualified adapter. |

Review of the offline report found that its first version attributed a result to the old rule without demonstrating the link in the displayed evidence. The report now shows both digests and compares the observed and expected outcomes. A separate Chromium check verified keyboard navigation, layouts from 320 to 1440 px and offline rendering.
