# Reference protocol

## Files and identity

The authority for a release is `ontograph.release/1` JSON. Run `python3 -m ontograph example` for the runnable specimen and `validate FILE` for the normative executable validator. Each document declares purpose, owner, scope, effective time, evidence, nodes, edges, rules and application-scoped probes. Source excerpts are interpreted as data. Inputs are validated before storage.

Nodes have workspace-local identifiers and typed links. `source dependsOn target` means the source may be affected when the target changes. `control implements contract` connects results to a contract. `application consumes contract` routes delivery to the correct app. `mapsTo` is a directed physical-field mapping. `broader` and `subClassOf` are separately acyclic. No edge grants access to the linked data.

The reference evaluator uses exact equality on declared JSON facts. Missing scope facts produce `hold`. A known outside scope produces `out_of_scope`. Missing or nonmatching requirements produce `hold`. Conditions are data, with no code injection or network execution. Rich policy languages such as Rego can be used by a qualified adapter and observed with the same evidence contract.

The registry binds the exact base activation, payload hash, reviewers, quorum, scope, per-app delivery hashes, expected cases and freshness in a frozen candidate. The release ID is the SHA-256 of the manifest. The hash profile uses UTF-8 with sorted JSON keys, compact separators and finite JSON values. Preserve array order and number representation when producing digests across languages. RFC 8785 compatibility is not claimed. A different hash profile requires a new manifest format.

## Release sequence

1. An author proposes a candidate against base activation **0** initially, then the last activation sequence.
2. Assigned reviewers record `approve` or `object` with a rationale. The latest vote per reviewer counts. Disabled approvers no longer count toward quorum. Existing objections persist.
3. A publisher activates the candidate with the expected head sequence. SQLite serializes concurrent writes. The committed activation and audit event are one transaction. Activation can only occur at or after the effective time.
4. Each consumer requests its scoped delivery and records a receipt for the applied bundle. The observer records the expected probe ID, actual digest, actual outcome, captured UTC time and artifact reference and SHA-256. In a real system the observer runs against the application rather than the registry's rule evaluator.
5. A supervisor withdraws the current activation. It immediately stops serving the rule bundle. The record remains unproven per app until its receipt and an independent explicit inactivity observation arrive. The conservative reference requires reconciliation of every former app before a new activation. This profile prioritizes fail-closed recovery and permits downtime. A deployment that needs rolling adoption or offline operation requires a separate policy that bounds cached use and verifies replacement app by app.
6. To recover a previous payload, create a new candidate based on the current activation and review it again. Previous activation and withdrawal observations remain inspectable by phase. Recovery does not undo external side effects.

### Evaluation states

Consumer receipt and observer result are independent. A relevant observed mismatch is shown as `mismatch`. A matching receipt alone yields `unproven`. After a new declaration, fresh probes must be recorded after that receipt and have a capture time no earlier than it. The receipt and every observation are subject to the candidate freshness window (default one hour). `unobservable`, missing or stale evidence keeps the app unproven. Positive findings only cover the registered cases and time window. Independent authenticity of an external artifact is established by the deployment's observer and evidence custody process.

`status` can request `phase: "activate"` for a past activation, or `phase: "withdraw"` after a withdrawal. It reports the collected evidence with an assessment as of the clock at query time. Demo snapshots show the status observed at each step. The business outcome remains a separate field.

## CLI operations

Run locally with one SQLite file per workspace. Store tokens outside version control and give each principal a separate identity. Tokens are displayed once during enrollment and stored as hashes. Application users should use an authenticated broker or equivalent operating-system boundary for a distributed deployment. A user with direct write access to SQLite is inside the trusted host perimeter.

```sh
mkdir -p out
python3 -m ontograph init out/aurora.sqlite aurora-21 local-admin
# In a secure invocation environment, set ONTOGRAPH_TOKEN to the administrator credential.
printf '%s\n' '{"principal":"steward","role":"reviewer"}' |
  python3 -m ontograph call out/aurora.sqlite add-principal
```

Every `call` takes a JSON object on stdin and uses the role bound to `ONTOGRAPH_TOKEN`. Keep enrollment output in appropriate secret storage.

| Operation | Role | JSON fields |
| --- | --- | --- |
| `add-principal`, `disable-principal` | admin | `principal`. Enrollment adds `role` and `application` for a consumer |
| `propose` | author | `payload`, `base`, `reviewers`, `quorum`, `reason`, optional `observation_max_age_seconds` |
| `review` | assigned reviewer | `release_id`, `choice`, `rationale` |
| `publish` | publisher | `release_id`, `expected_head` |
| `consumer-release` | consumer | empty object |
| `acknowledge` | consumer | `activation`, `phase`, `actual_digest` |
| `observe` | observer | `activation`, `application`, `phase`, `probe_id`, `actual_digest`, `actual_outcome`, `captured_at`, `artifact_ref`, `artifact_sha256` |
| `withdraw` | supervisor | `expected_head`, `reason` |
| `export`, `status` | workspace staff | `release_id` for export, optional `activation` and `phase` for status |
| `events` | auditor, admin or supervisor | empty object |

For an activation, use probe IDs declared in the payload and report one of `allow`, `hold`, `out_of_scope`, `unobservable`. For a withdrawal, use probe ID `withdrawal` with `inactive`, `active` or `unobservable`. An inactive app reports a null digest. New declarations are meaningful observations of the consumer's current load and require fresh independent confirmation.

### Inputs and optional adapters

Run `python3 -m ontograph policywatcher-draft PACKET.json AUTHORIZED-EXCERPT.txt`. The adapter checks the packet family, publication gate, verified-retrieval state, public snapshot, ID and change URL. It retains the upstream **reported** packet and snapshot digests separately from the computed excerpt hash. It creates `insufficient` evidence pending human confirmation. The adapter accepts a locally supplied packet and excerpt and does not fetch sources, authenticate to PolicyWatcher or assert a verified upstream digest. [PolicyWatcher Evidence Packet](https://policywatcher.online/schemas/evidence-packet/v1)

NVIDIA or a catalog can propose mappings as a separate application of this schema. A steward resolves identifiers, intended grain and applicability. Automated actions and publish permissions are outside the proposed adapter contract. The JSON-LD graph is a derived view, while the frozen JSON remains suitable for offline verification.

### Verify outside the registry

Export with `call DATABASE export` and preserve the manifest digest in a channel controlled by the audit owner. Run `python3 -m ontograph verify-release EXPORT.json --release EXPECTED_DIGEST`. Check the event chain with `python3 -m ontograph verify-ledger EVENTS.json --tip EXPECTED_TIP`. The checkpoint must be retained independently to detect removal of the log tail. The outputs confirm hash consistency and package scope. Inspect source applicability and application behavior independently.

For an independent RDF interpreter check on the synthetic output, run
`uv run --with rdflib python examples/verify_projection.py out/aurora.json`.
This optional test parses JSON-LD, round-trips the graph via N-Triples, queries the taxonomy in SPARQL and checks the PROV-O derivation. The core runtime remains dependency-free.
