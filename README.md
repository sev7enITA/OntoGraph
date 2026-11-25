# OntoGraph

**Govern semantic changes and verify how applications behave after release.**

A change to a policy or business definition can leave two applications making different decisions while both report the same version. OntoGraph ties together source evidence, semantic impact, independent approval, per-application delivery and behavioral observations. It is a standalone governance framework with an executable reference implementation and a synthetic case for buyer evaluation.

## Run Aurora 21

Requires Python 3.10 or later with the standard SQLite module. No model, network connection, package install or external service is required.

```sh
python3 -m ontograph demo
mkdir -p out
python3 -m ontograph demo --report out/aurora.json --html out/aurora.html
python3 -m unittest discover -s tests -v
```

Open `out/aurora.html` to inspect the observations. A run produces fresh output files. Choose new output paths for subsequent runs.

| Step | CRM | PMS |
| --- | --- | --- |
| Baseline | Behavior verified on the declared cases | Behavior verified on the declared cases |
| New requirement | Correct | Declares the expected digest and returns the previous decision on a discriminating case |
| Withdrawal while PMS is unreachable | Withdrawal verified | Unproven |
| Reconciliation | Withdrawal verified | Withdrawal verified |
| Recovery with a newly approved candidate | Behavior verified | Behavior verified |

All of Aurora 21 is synthetic. The two applications are simulators. Verification is scoped to observed cases and its freshness window. The report keeps business outcome unassessed.

## What is implemented

- Dictionary and taxonomy with stable IDs. A typed dependency graph links concepts, limited ontology classes, physical fields, processes, controls, contracts and applications.
- Case-scoped evidence with an excerpt hash, origin, observation time and a recorded applicability judgment. Local import of a PolicyWatcher evidence packet creates a draft requiring human review.
- Deterministic rule, scope and probe validation. Releases include positive and negative probes. A changed rule shared with the prior release requires a case per app that distinguishes their behavior.
- Frozen release candidates, an auditable review quorum, separate publish authority and transactional compare-and-swap. An objection or insufficient source evidence blocks activation.
- Per-app rule delivery. Consumer assertions remain separate from independent, expiring behavioral observations. A withdrawal stops delivery immediately. Observation confirms whether behavior at each consumer stopped.
- Offline JSON package and JSON-LD graph projection using SKOS, OWL/RDFS and PROV-O terms. Release and audit hashes can be checked against independently retained checkpoints.

## Operator guide

[Framework and controls](docs/FRAMEWORK.md) · [Protocol and CLI](docs/PROTOCOL.md) · [Market proposal and pilot](docs/MARKET.md) · [Cross-model reviews](docs/REVIEWS.md)

This reference uses one local registry per workspace and trusts the host operator and named observers. Production tenancy, identity federation, independent probe adapters, external attestations, high availability and a recovery rehearsal require a deployment design and qualification. The framework does not make legal determinations or certify compliance. The demo and the test suite show the reference behavior.
