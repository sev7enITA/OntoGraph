# Reference protocol

## Files and identity

The authority for a release is `ontograph.release/1` JSON. Run `python3 -m ontograph example` for the runnable specimen and `validate FILE` for the normative executable validator. Each document declares purpose, owner, scope, effective time, evidence, nodes, edges, rules and application-scoped probes. Source excerpts are interpreted as data. Inputs are validated before storage.

Nodes have workspace-local identifiers and typed links. `source dependsOn target` means the source may be affected when the target changes. `control implements contract` connects results to a contract. `application consumes contract` routes delivery to the correct app. `mapsTo` is a directed physical-field mapping. `broader` and `subClassOf` are separately acyclic. No edge grants access to the linked data.

The reference evaluator uses exact equality on declared JSON facts. Missing scope facts produce `hold`. A known outside scope produces `out_of_scope`. Missing or nonmatching requirements produce `hold`. A reviewed candidate can be compiled to the same bounded decision contract in Rego. The OPA package places conditions in JSON data and checks them against the app's scoped delivery. The consumer adapter continues to own identity and evidence custody.

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
| `propose` | author | `payload`, `base`, `reviewers`, `quorum`, `reason`, optional `observation_max_age_seconds` and `ci_required` |
| `review` | assigned reviewer | `release_id`, `choice`, `rationale` |
| `publish` | publisher | `release_id`, `expected_head` |
| `consumer-release` | consumer | empty object |
| `acknowledge` | consumer | `activation`, `phase`, `actual_digest` |
| `observe` | observer | `activation`, `application`, `phase`, `probe_id`, `actual_digest`, `actual_outcome`, `captured_at`, `artifact_ref`, `artifact_sha256` |
| `withdraw` | supervisor | `expected_head`, `reason` |
| `export`, `status` | workspace staff | `release_id` for export, optional `activation` and `phase` for status |
| `export-policy`, `ci-status` | workspace staff | `release_id`. Policy export requires a reviewed candidate with confirmed evidence or a previously activated release. |
| `record-ci` | auditor | `release_id` and `receipt`. Record provider evidence before activation. Identical retries return the existing record. |
| `events` | auditor, admin or supervisor | empty object |

For an activation, use probe IDs declared in the payload and report one of `allow`, `hold`, `out_of_scope`, `unobservable`. For a withdrawal, use probe ID `withdrawal` with `inactive`, `active` or `unobservable`. An inactive app reports a null digest. New declarations are meaningful observations of the consumer's current load and require fresh independent confirmation.

### Policy compilation and CI evidence

`ci_required: true` is frozen into the candidate manifest. It adds a publication gate after human review. Older manifests and standard candidates omit the field.

- `ontograph.opa-bundle/1` binds the original release, deterministic Rego modules, scoped data and probe tests to a `bundle_sha256`. `verify-policy --release` recreates the expected files and compares the whole bundle against a separately retained release ID.
- `ontograph.ci-receipt/1` adds the CI provider, repository, checkout commit, run URL and attempt, OPA version, test count and SHA-256 of the deployed-form archive. GitHub and Azure templates verify the reviewed release ID and the committed bundle bytes before testing. The GitHub pilot regenerates its synthetic bundle at the workflow commit.
- `record-github-ci` checks a successful attempt of the repository's policy workflow on the selected trusted branch and verifies the archive downloaded from that attempt. An offline `record-ci` relies on the auditor to check the provider before recording the receipt. The registry checks the receipt against the exact candidate and package, logs it, and pins it at activation.
- `status` exposes that pinned evidence under `ci` for both activation and withdrawal. An active `consumer-release` response carries `policy_artifact_sha256` when CI evidence was recorded. The consumer's scoped `delivery_sha256`, receipt, independent observation and business outcome retain their separate meanings.

[DevOps quickstart and pipeline templates](../examples/devops/README.md)

### Inputs and optional adapters

Run `python3 -m ontograph policywatcher-draft PACKET.json AUTHORIZED-EXCERPT.txt`. The adapter checks the packet family, publication gate, verified-retrieval state, public snapshot, ID and change URL. It retains the upstream **reported** packet and snapshot digests separately from the computed excerpt hash. It creates `insufficient` evidence pending human confirmation. The adapter accepts a locally supplied packet and excerpt and does not fetch sources, authenticate to PolicyWatcher or assert a verified upstream digest. [PolicyWatcher Evidence Packet](https://policywatcher.online/schemas/evidence-packet/v1)

NVIDIA or a catalog can propose mappings as a separate application of this schema. A steward resolves identifiers, intended grain and applicability. Automated actions and publish permissions are outside the proposed adapter contract. The JSON-LD graph is a derived view, while the frozen JSON remains suitable for offline verification.

### Verify outside the registry

Export with `call DATABASE export` and preserve the manifest digest in a channel controlled by the audit owner. Run `python3 -m ontograph verify-release EXPORT.json --release EXPECTED_DIGEST`. Check the event chain with `python3 -m ontograph verify-ledger EVENTS.json --tip EXPECTED_TIP`. The checkpoint must be retained independently to detect removal of the log tail. The outputs confirm hash consistency and package scope. Inspect source applicability and application behavior independently.

For an independent RDF interpreter check on the synthetic output, run
`uv run --with rdflib python examples/verify_projection.py out/aurora.json`.

### Paired pilot dossiers

The loopback Studio accepts `ontograph.pilot/1` at `POST /api/pilot/assess`. A dossier preregisters each scenario, application, instance, common release reference and expected activation per arm. A recorded observation binds its case, instance and activation to a verdict, observer, UTC capture time, artifact reference, SHA-256 and custody reference. The assessor compares submitted identities and verdicts to the preregistered cases and hashes the dossier. Accountable operators verify the identities, artifact bytes and custody outside the assessor.

The pilot remains incomplete while either arm has missing results. A false withdrawal confirmation or other missed required result from OnToGraPh rejects the assessment. Compare effort only after both arms meet the same required evidence; retain missing measurements as unknown. The synthetic example fills the OnToGraPh arm from Aurora 21 and leaves the incumbent unmeasured. The assessor works separately from the local registry's release authority and never publishes or withdraws a release.
This optional test parses JSON-LD, round-trips the graph via N-Triples, queries the taxonomy in SPARQL and checks the PROV-O derivation. The core runtime remains dependency-free.

## Relationship assessments and release requirements

Each directed edge can carry a single legacy `assessment` or an array of attributed `assertions`. Both forms use numeric `confidence` from 0 to 1, integer `criticality` from 1 to 5, a local `evidence` ID, an `assessor` and a `rationale`. All grades are explicit. Confidence zero is meaningful. A missing assessment leaves confidence unknown. The reference engine reads and verifies previously frozen models and their original projections. Older strict readers reject payloads carrying new fields. Consumer bundle digests continue to describe the scoped executable rules.

### Several judgments about one relationship

An `assertions` array holds one or more judgments. Each supplies its own edge-local `id` and UTC `asserted_at` timestamp, with second precision. The evidence record must already have been observed when the judgment was made. The judgment must be dated no later than the release effective time. Optional `stance` accepts `supports` (the default) or `challenges`. The supplied source records, including their excerpts, observation times, applicability, status and content digests, remain available for review. Two assessors may cite the same source. Distinct assertions do not establish that the underlying sources are independent.

For example, Finance can rate a WBS mapping at criticality 5 and confidence 0.35, while PMO challenges it at criticality 2 and confidence 0.80. Both can cite confirmed source records. Agreement requires matching grades and supporting stances across all assertions. Different grades on either axis or any explicit challenge require a review. During unresolved disagreement the path shows the highest stated consequence and unknown confidence. The report links the affected original triple and every cited source. No majority, arithmetic mean or default winner determines the result.

To record a decision, copy the edge's `basis` from the current weighted-impact report, choose a supporting assertion and add an edge-level `resolution`:

```json
{
  "selected": "finance",
  "reviewer": "steward",
  "rationale": "For this ledger and reporting period, apply the Finance mapping. Retain PMO's counter-evidence for the project portfolio.",
  "resolved_at": "2026-11-25T15:00:00Z",
  "basis": "<64 lowercase hexadecimal characters from the report>"
}
```

`reviewer` is a registry principal ID. Approval of a released candidate requires that assigned, active reviewer to cast an authenticated approving vote on that candidate, in addition to the ordinary quorum. A draft can contain a proposed resolution before any vote. The resolution must be dated on or after the assertions it covers and no later than the release effective time. The registry also rejects future-dated assertions or resolutions at proposal time. A resolution selects the weights to apply while preserving the other grades and sources. The report retains the confidence and criticality ranges submitted by all assessors alongside the effective grades. Coverage counts distinguish edges with disagreement from those still awaiting a current resolution. All evidence records must still meet the registry's existing confirmed-source condition for publication.

The basis binds the directed triple and the full content of its assertions and referenced evidence. Reordering assertions preserves the adjudication basis. An edit to the rationale, grade or source changes it. A changed basis marks the resolution stale, removes its effective confidence from path summaries and requires a fresh adjudication or explicit removal of the stale resolution before publication. Reviewers can reconstruct an older decision from its frozen release. An expired-evidence policy and calibrated loss estimates require additional domain rules.

For interoperating implementations, sort assertions by ID. Make a copy of each assertion with an explicit stance and replace confidence with the 16 lowercase hex digits of its IEEE 754 binary64 representation in big-endian order. Normalize signed zero to positive zero. For each assertion create a pair holding the normalized assertion and the full referenced evidence record. Hash `[[source, predicate, target], pairs]` using the canonical UTF-8 JSON SHA-256 function described above. The Python helper is `assertion_basis(edge, evidence_by_id)`. The report exposes this value so clients can use the engine result directly.

### Inspect a path and require complete assessments

Run `python3 -m ontograph weighted-impact FILE NODE_ID` or send `{"model": ..., "node_id": "..."}` to `POST /api/weighted-impact` in standalone Studio. For several judgments, each displayed edge's `assessments` entry includes its assertions, sources, effective assessment (or null), basis, recorded resolution, `conflict` and `resolution_state`. The state can be `agreement`, `unresolved_conflict`, `resolved` or `stale_resolution`. The graph follows operational dependency directions, reports maximum known criticality and takes the lowest effective confidence across a fully assessed route. Reports expose bounds, omitted paths and complete reachable edge coverage, including cycle-closing edges.

Set `required_assessment_origins` to designate origins where publication and initial candidate policy export require complete impact assessments. A required origin must have a modeled operational dependency, confirmed evidence and resolved assessments throughout the reachable scope. A truncated traversal fails the requirement. Release quorum, objections and any required CI evidence still apply. An optional origin may carry an unresolved disagreement for inspection. The graph accounts for dependencies declared in the model.

JSON and XLSX round-trip the full model. JSON-LD carries the original semantic triple, a qualified RDF statement, uniquely identified assertions, linked source records and a separate adjudication record with its basis, selected claim, time, reviewer, rationale and currency. Changing any of these fields changes the release digest and requires approvals on a new candidate. [Worked WBS model](../examples/weighted/README.md)
