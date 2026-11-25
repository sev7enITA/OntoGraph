# From a reviewed rule to an OPA bundle and CI evidence

This path runs from the **standalone Semantic Studio or CLI** into a Git repository and CI. An OPA bundle evaluates the approved rules. The registry records the CI evidence at activation, then collects separate observations from each consuming application.

| Step | Actor or system | Evidence |
| --- | --- | --- |
| Prepare and approve | Author and assigned reviewers | Frozen release manifest with source, rule scope, per-app delivery hashes and expected probes |
| Verify and package | GitHub Actions or Azure Pipelines | OPA source validation, positive and negative tests, replay of every probe on the deployable archive and its SHA-256 |
| Admit | Auditor and publisher | An auditor records the receipt for the exact release and bundle. The publisher activates it after the CI gate and required reviews. |
| Observe and withdraw | Consumers, observer and supervisor | Consumer receipt and separate observations on activation or withdrawal. Missing independent evidence leaves the application unproven. |

## Run the synthetic pilot locally

Use Python 3.10+ and [OPA 1.21.2](https://github.com/open-policy-agent/opa/releases/tag/v1.21.2) on your path. Run from the root of a checkout.

```sh
work=$(mktemp -d)
python3 -m examples.devops.run_stage prepare "$work/state"
release=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["release"])' "$work/state/bundle.json")
python3 -m ontograph verify-policy "$work/state/bundle.json" --release "$release"
python3 -m ontograph.policy_ci "$work/state/bundle.json" "$work/checks" --expected-release "$release"
python3 -m examples.devops.run_stage finish "$work/state" "$work/checks" --simulate-ci
python3 -m ontograph verify-ledger "$work/checks/pilot-ledger.json"
```

The optional local fixture receipt has a synthetic run URL. The **Verify and package policy** workflow runs the same pilot on GitHub Actions with real run metadata. It publishes `bundle.tar.gz`, `validation.json`, `receipt.json`, `pilot-report.json` and `pilot-ledger.json` under `ontograph-verified-policy-<attempt>`. The state directory holds temporary role credentials and the SQLite registry. Keep it private.

The compiled archive runs in OPA. To check the revised rule for a building with a declaration and a missing inspection report, query the bundle as follows. The expected outcome is `hold`.

```sh
printf '%s\n' '{"application":"crm","rule":"evidence-present","facts":{"asset-type":"building","declaration":true,"inspection":false}}' |
  opa eval --bundle "$work/checks/bundle.tar.gz" --stdin-input --format=raw data.ontograph.decision
```

In the pilot, CRM uses the built archive. PMS reports its expected delivery digest but runs the previous rule and returns `allow` on the discriminating case. During withdrawal, a receipt plus an unavailable PMS keeps it `unproven` until the fixture observer sees inactivity. All applications and their execution environments are synthetic.

## Use your own release

1. Start Studio with `python3 -m ontograph studio --registry "$db"`, open **Semantic Studio → Release → Registry & CI**, and select **Require CI evidence** when preparing a candidate. In the CLI, pass `"ci_required": true` to `call DATABASE propose`. Confirm the source evidence and obtain the required reviewer votes.
2. Export the exact reviewed candidate via **Export OPA bundle**, or use `call DATABASE export-policy` with `{"release_id":"…"}` as input. Retain the reviewed release digest separately. The JSON includes source excerpts and probe facts. Commit it only to a repository authorized to hold those data. The deployable OPA tarball contains the runtime policy and scoped rule data.
3. In GitHub Actions, dispatch **Verify and package policy** with the repository path of the committed bundle and the independently retained release digest. It verifies the input bytes against the checked-out commit. For Azure Pipelines, use [the pipeline template](azure-pipelines.yml) with the same two inputs.
4. After the provider run succeeds, record its receipt with an auditor token. The GitHub command below fetches the exact attempt and artifact, checks the expected repository and branch, the workflow path, the successful conclusion, the commit and the archive hash, and records the evidence. For Azure Pipelines or offline transfer, the auditor checks the successful run and artifact with the provider, then imports the receipt via **Record CI receipt** or `call DATABASE record-ci` with `{"release_id":"…","receipt":{…}}`.
5. Publish using the publisher role. The release status includes the exact CI evidence recorded at activation. Each application must receive the scoped delivery and its actual behavior must be observed. When calling OPA through a shared service, bind `application` to the authenticated consumer in the adapter.

```sh
# Set ONTOGRAPH_TOKEN to the authorized auditor credential.
python3 -m ontograph record-github-ci "$db" "$release" \
  --repository your-organization/your-repository --run 123456789 --attempt 1
```

The GitHub check uses the authenticated `gh` CLI and reads the workflow on `main` by default. Use `--branch` for another trusted branch. It relies on controls over that repository, workflow and artifact. A manually imported receipt is an auditor assertion checked for structure and exact release/bundle binding. The auditor is responsible for checking it against the provider. CI evidence establishes what was built and tested. Runtime evidence establishes what a particular consumer did.

[Reference protocol](../../docs/PROTOCOL.md) · [Studio guide](../../docs/wiki/STUDIO.md)
