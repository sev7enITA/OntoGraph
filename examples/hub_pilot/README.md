# Optional three-framework pilot

A PolicyWatcher monitoring signal can have the right format and identify the wrong change. This pilot asks whether a reviewer can trace an admitted signal to the precise source, rule and release that allowed it into a PALO case. Admission means a human must review the case. It gives the signal no power to approve a policy or deployment.

## What ran on 25 November 2026

| Step | Observed result |
| --- | --- |
| Bottom-up source | A public PolicyWatcher v1.1 packet and its PALO signal identified the same change. The packet digest matched the producer's serialization. The snapshot digest matched the recorded analysis input. The upstream document bytes were outside the test. |
| Top-down mandate | The pinned PALO Measure catalogue requires decision tracing. The pilot mapped the source change ID, URL and authority to dictionary fields and bound them to one release control and intake contract. |
| Release | The local registry blocked an approved candidate with insufficient evidence. It also blocked a source-checked candidate pending its reviewer vote. Distinct scripted test principals then activated the release. |
| Read-back | The optional adapter followed the released rule's source ID to PolicyWatcher's public signal endpoint. PolicyWatcher's native parser accepted the ID and its deployed read-only endpoint returned the signal (HTTP 200). Both rejected a duplicate ID (HTTP 400 from the endpoint). A local operator receipt linked three source fields to the released control and application. |
| Observed intake | A separate Node process read the frozen dictionary and scoped rule. A matched signal opened human review. Changing only its nested change ID left it valid for the native PALO signal validator, and the semantic rule held it. Both checks held a signal that claimed approval. A consumer receipt alone left the registry state unproven. |
| PALO receiver | The unmodified Assessment Path imported the case and signal, reopened Measure and Prove, and preserved the release evidence across a browser reload. It rejected an escalated authority claim without changing the saved case. The native validator issued a receipt for that case. |
| Standalone control | A fresh synthetic calibration laboratory used its own dictionary, taxonomy and rule. An operating-system network denial covered the CLI run. Its independent fixture consumer returned allow, hold and out of scope. After withdrawal, the registry required an observation of inactivity. |

The hub test combines a live, read-only PolicyWatcher service with a local instance of PALO's released client and a temporary OnToGraPh registry. The review principals and adverse inputs are test fixtures. The PALO case remains pending human review. No production service was reconfigured.

## Run the standalone control

From the root of an OnToGraPh checkout, choose a new output directory outside the repository. Only Python and SQLite are required.

```sh
python3 examples/hub_pilot/standalone.py ../calibration-evidence
```

On macOS, the following form also verifies that the operating system denies a loopback connection before the test proceeds.

```sh
sandbox-exec -p '(version 1)(allow default)(deny network*)' \
  python3 examples/hub_pilot/standalone.py ../offline-calibration-evidence --check-network-denial
```

## Repeat the hub test

Run these commands from an OnToGraPh checkout. Use Node 22.18+ or 24 for the optional integration tools. This path accesses public PolicyWatcher endpoints. Keep the original response files because a subsequent upstream retrieval can change the packet digest.

```sh
pilot_dir=$(mktemp -d)
change_id=429e2afa-3202-4708-97b6-1797cf3fca26
curl -fsS "https://policywatcher.online/api/evidence-packet/$change_id?format=json" -o "$pilot_dir/packet.json"
curl -fsS "https://policywatcher.online/api/v1/integrations/palo/signal?changeId=$change_id&lang=en" -o "$pilot_dir/signal.json"

git clone --filter=blob:none --no-checkout https://github.com/sev7enITA/PALOframework.git "$pilot_dir/palo"
git -C "$pilot_dir/palo" sparse-checkout init --no-cone
git -C "$pilot_dir/palo" sparse-checkout set /package.json /package-lock.json /PALO_AssessmentPath.html /assets /schemas /scripts /data/decision-gates.json
git -C "$pilot_dir/palo" checkout --detach 8cce101a653572cc9ec7f888a2422806536a93d1
npm ci --prefix "$pilot_dir/palo" --ignore-scripts
"$pilot_dir/palo/node_modules/.bin/playwright" install chromium

python3 -m examples.hub_pilot.run \
  --packet "$pilot_dir/packet.json" --signal "$pilot_dir/signal.json" \
  --palo-root "$pilot_dir/palo" --output "$pilot_dir/run"
```

The runner verifies the packet, checks the PALO catalogue and client, freezes a release, resolves its source through PolicyWatcher and exercises the native PALO signal importer. It writes the full release, observations, event log and summary. The two negative cases use local mutations. The live signal remains intact.

The PolicyWatcher operator check executes the pinned native TypeScript query parser and compares it with the hosted endpoint. It reconciles rule, control and consuming application locally and retains both native HTTP responses. Use the release digest printed by the previous command as `release_pin`.

```sh
curl -fsS "https://raw.githubusercontent.com/sev7enITA/policywatcher/14135858a4efad975e46d32f94906c355e9c4628/src/lib/paloPolicyWatcherSignal.ts" -o "$pilot_dir/paloPolicyWatcherSignal.ts"
python3 -m examples.hub_pilot.policywatcher_operator \
  --release "$pilot_dir/run/release.json" --release-pin "$release_pin" \
  --packet "$pilot_dir/packet.json" --native-source "$pilot_dir/paloPolicyWatcherSignal.ts" \
  --output "$pilot_dir/run/policywatcher"
```

To exercise the PALO Assessment Path and native validator, run the receiver documented in [the PALO pilot instructions](PALO.md). Keep each run's original artifacts together. A fresh release binds its own clock and activation. Check its exported manifest and event chain with the standard OnToGraPh commands.

```sh
python3 -m ontograph verify-release "$pilot_dir/run/release.json"
python3 -m ontograph verify-ledger "$pilot_dir/run/events.json"
```

The local harness holds the role credentials during the test. An operator can independently retain the release hash and ledger tip and supply them with `--release` and `--tip` when verifying later. All hub-specific code lives in this example. The engine, Studio and ordinary release format use the same interfaces for independent adopters.
