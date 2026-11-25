# Repository Guidelines

## Architecture

OntoGraph is a dependency-free Python and SQLite reference engine. The release payload is the portable source of truth. The model module validates the payload, computes dependency impact, renders the JSON-LD projection and shares the deterministic policy evaluator with the synthetic simulator. The registry authenticates role-bound principals, freezes candidate manifests and commits events with the changes they describe.

Consumer receipts, observer results and business outcome are separate states. Keep per-application scope and digests consistent between manifest, delivery and observation. The observer evaluates a case bound to an activation and its phase. Freshness and the previous activation reference are part of the correctness model.

## Build and development

Run `python3 -m ontograph demo` from the root. Run `python3 -m unittest discover -s tests -v` for the suite or `python3 -m unittest discover -s tests -k compare_and_swap -v` for the publication race case. Generate a real reference payload with `python3 -m ontograph example` and verify existing fixtures using `python3 -m ontograph validate examples/aurora-21.json`.

The Aurora case declares synthetic scenario time by injection. The normal CLI uses UTC. Tests exercise both positive and adverse behavior through the real registry, including disagreement between a receipt and a probe. Database files, runtime credentials and generated local reports belong outside tracked project paths.

## Documentation

Update the protocol when a public argument, transition, hash boundary or role semantics changes. Document examples with their evidence scope. The market brief distinguishes executable behavior from pilot hypotheses. Keep fixture diffs focused and test changes where they affect the release or observation boundary.
