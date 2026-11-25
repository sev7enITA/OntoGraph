Based on static review of `index.html`, `puzzle.css`, and `puzzle.js`, here are the 4 highest-priority audit findings, ranked by governance and buyer-trust risk.

---

### 1. Unbuilt assumptions and unexercised models look identical to the exercised CI fixture
- **Concrete toggles:**
  1. Click **Incumbent + Drools** (`custom`, `ci`, `drools`, `bridge`, `first`, `second`) vs **Standalone** (`og`, `ci`, `opa`, `first`, `second`) on Aurora 21.
  2. In **Incumbent + Drools**, toggle **Drools adapter** (`bridge`) off/on; also test toggling `bridge` while `opa` is active.
  3. Click **Semantic stack** (adds `pw`, `palo`, `nv`, `ob`, `sd`) or switch **Company data model** to **Procurement · purchase approval**.
- **Expected vs actual:**
  - *Expected:* The UI should visibly separate the one exercised path (Standalone Aurora OPA/CI) from unbuilt assumptions (`custom`, `bridge`), the separate offline human-review pilot (`pw`/`palo`), and the illustrative Procurement case.
  - *Actual:* **Incumbent + Drools** outputs the exact same green verification metrics (`3/3`, `2/2`, `1/2`, `0/2` at Activation; `2/2` verified on withdrawal) and identical proof strings (`"Withdrawal verified by probe."`) as **Standalone**, even though neither `custom` nor `bridge` was exercised. Clicking a preset clears `lastChange`, so the assumption wording on `custom`/`bridge` only appears in hover-only `title` tooltips or inside the collapsed `<details>` at the bottom. Worse, `bridge` has a `null` source URL and is silently omitted from `#sources` (`rows.filter(r=>r[5])`), while `custom` links only to generic GitHub Actions deployment docs. Selecting **Semantic stack** lights up `pw` and `palo` as active pieces even though their pilot stops at human review and toggling them changes zero metrics.
  - *Intentional?* Dropping proof to `0/2` (`"Missing tested runtime"`) when `bridge` is removed in Incumbent + Drools (and making `bridge` a no-op when `opa` already satisfies `runtime`) is **intentional** gate logic. Hiding the exercised-vs-assumed distinction inside a collapsed `<details>` and displaying identical "proven" readouts across exercised and assumed stacks is **not** defensible UX.
- **Risk:** A skeptical buyer or auditor will read this as overclaiming—presenting hypothetical Drools/incumbent parity, unintegrated upstream pilots, and an illustrative procurement model with the same authority as CI-verified evidence.
- **Smallest actionable fix:** Add a visible **Evidence basis** badge directly inside `.readout` (e.g., `Exercised CI fixture` only when Aurora + `og` + `ci` + `opa` without `custom`/`bridge`; `Assumed equivalence` when `custom` or `bridge` satisfies a gate; `Illustrative model` for Procurement), surface the one-sentence counterfactual/scope disclaimer above `#meters` instead of hiding it inside collapsed `<details>`, and list `bridge` in `#sources` explicitly as an unbuilt assumption.

---

### 2. Category bias and unjustified product equivalence in `KPI · semantic capabilities`
- **Concrete toggles:**
  1. From an empty board, toggle **OntoBricks** (`ob`) alone (`KPI · semantic capabilities` jumps `0/5 → 4/5`).
  2. Compare **Standalone** (`og` gives `1/5`) vs **Incumbent + Drools** (`custom` gives `0/5`).
  3. Toggle **Stardog** (`sd`), **Apache Jena** (`jena`), or **OntoBricks** (`ob`) individually—all equally satisfy `"RDF query service or toolkit"`.
  4. Toggle **PolicyWatcher** (`pw`), **PALO Framework** (`palo`), or **TopBraid EDG** (`edg`) on/off in **Semantic stack**.
- **Expected vs actual:**
  - *Expected:* Capability credits should match each product's documented role, distinguish managed graph servers from SDK libraries and lakehouse mappers, and treat `og` and `custom` neutrally.
  - *Actual:* In `upstream`, **OntoBricks** (`ob`, described only as `"Ontology-to-table mapping and registry promotion · 0.9.3"`) is credited with **4 of 5** capabilities (`Lakehouse mapping`, `Vocabulary curation`, `RDF query service or toolkit`, `OWL graph visualization`), so `nv + ob` alone max out `5/5` and render `sd`, `edg`, `vb`, `nine` redundant. **OnToGraPh** (`og`, described as manifest/compiler/activation/withdrawal history) receives `"Vocabulary curation"` credit alongside TopBraid EDG and VocBench, giving Standalone a `1/5` edge over `custom` (`0/5`). `"Lakehouse mapping"` is a single-vendor slot only `ob` satisfies; `"RDF query service or toolkit"` equates enterprise stores (`sd`, `gdb`) with Java toolkits (`jena`, `rdf`) and `ob`; and `pw`/`palo` contribute to zero KPIs/KRIs (`"leaves the indicators unchanged"`).
  - *Intentional?* Counting each capability once across multiple tools is **intentional**, but crediting `ob` with 4/5 roles and `og` with vocabulary curation contradicts the file's own row descriptions and looks like accidental stack-tailoring bias.
- **Risk:** Enterprise architects and buyers will spot the inflated `ob`/`og` credits and false equivalence between libraries and servers immediately, eroding trust in the rest of the benchmark.
- **Smallest actionable fix:** Restrict `ob` in `upstream` to `Lakehouse mapping` (unless its own cited release proves RDF query, curation, and OWL visualization), remove `og` from `Vocabulary curation` (keeping Layer 2 governance distinct from Layer 1 curation), separate or qualify `"RDF store / virtual graph"` vs `"RDF library"`, and explicitly tag `pw`/`palo` as `"Offline human-review handoff (unscored in CI)"` so their zero delta isn't confusing.

---

### 3. KPI/KRI math obscures blind spots on PMS probe removal, CI gate removal, and withdrawal timeout
- **Concrete toggles:**
  1. Aurora 21, `Activation` (`phase = 0`), **Standalone**: remove **PMS probe** (`second`) → `evidence coverage` `2/2 → 1/2`, `detected divergence` `1/2 → 0/2`, `unproven` `0/2 → 1/2`.
  2. Aurora 21, `Activation` (`phase = 0`), **Standalone**: remove **Git / CI** (`ci`) → `build prerequisites` `3/3 → 2/3`, `evidence coverage` `2/2 → 0/2`, `detected divergence` `1/2 → 0/2`, `unproven` `0/2 → 2/2`.
  3. Aurora 21, `Withdrawal · first probe` (`phase = 1`), **Standalone**: remove **PMS probe** (`second`) → **all 5 metrics remain `[3, 1, 0, 1, 1]`** and `#impact` reports `"leaves the indicators unchanged"`.
- **Expected vs actual:**
  - *Expected:* Removing observability or CI verification should clearly signal loss of assurance rather than looking like divergence dropped; an unreachable probe during withdrawal should remain distinguishable in metrics from a disconnected probe.
  - *Actual:*
    - Removing **PMS probe** or **Git / CI** at Activation drops `KRI · detected divergence` by `-1` (`1/2 → 0/2`). Both behaviors are **intentional** per the formulas (`Observed mismatches / in scope`) and `#scope` (*"In this CI-required scenario, missing proof leaves the underlying business outcome unknown"*), offset by `KRI · unproven` increasing (`+1` or `+2`). However, `#impact` prints `KRI · detected divergence -1` in the same neutral style without warning that the mismatch was hidden rather than fixed, and the CI-required rule is buried in collapsed `<details>`.
    - At `phase = 1` (`Withdrawal · first probe`), `evidence()` encodes PMS's failed probe as the same `'unknown'` state as a disconnected probe. Removing the PMS probe at `phase = 1` therefore yields **zero metric change** and tells the user the removal had no impact—even though you lost the probe required to retry and verify recovery.
  - *Intentional?* The CI hard-gate collapse and strict "observed mismatch" definition are **intentional**; collapsing a runtime probe failure (`unreachable`) with a disconnected probe (`!active('second')`) so disconnecting the probe reports zero delta is a **modeling bug**.
- **Risk:** Executives misread `-1 detected divergence` as risk reduction when controls are removed, and operators cannot distinguish an endpoint outage (`unreachable`) from missing instrumentation.
- **Smallest actionable fix:** Split `'unknown'` into `'uninstrumented'` (probe/gate missing) vs `'probe_failed'` (probe ran, consumer unreachable) so removing `second` at `phase = 1` visibly changes state/impact; when `unproven` increases while `detected divergence` drops, append an explicit warning in `#impact` (e.g., `"Mismatch unverified—not resolved"`) and note the CI-binding rule inline when `ci` is off.

---

### 4. Broken repeat-withdrawal story in Procurement and stale/drifted phase details in Aurora
- **Concrete toggles:**
  1. Select **Procurement · purchase approval** (`caseIndex = 1`) and cycle **Evidence checkpoint** across `Activation` (`0`), `Withdrawal · first probe` (`1`), and `Withdrawal · repeat probe` (`2`).
  2. Select **Aurora 21 · CRM & PMS** (`caseIndex = 0`) and switch from `Activation` (`0`) to `Withdrawal · first probe` (`1`) and `Withdrawal · repeat probe` (`2`).
- **Expected vs actual:**
  - *Expected:* Every selectable checkpoint should reflect a distinct state for the active model, and Aurora's text should track the phase and real fixture facts (two receipts; CRM holds, PMS clears; withdrawal: CRM verified, PMS initially unreachable then verified).
  - *Actual:*
    - In **Procurement**, the divergence/retry logic is hardcoded to Aurora (`if (caseIndex === 0 && i === 1 && phase < 2)`). As a result, `Withdrawal · first probe` and `Withdrawal · repeat probe` are **100% identical** (`3/3`, `2/2`, `0/2`, `0/2`, both consumers showing `"Withdrawal verified by probe."`), making the repeat-probe checkpoint meaningless and leaving `KRI · detected divergence` permanently `0/2`.
    - In **Aurora 21**, `#case` stays frozen on the Activation scenario (*"CRM holds it; PMS clears it under the old rule"*) during both withdrawal phases, never explains what withdrawal verifies, mentions `"Receipt matches"` only for PMS (omitting CRM's receipt), and narrows `"initially unreachable"` to `"timed out"`.
  - *Intentional?* Having Procurement show a clean Activation happy path as a contrast case is **likely intentional**, but exposing an identical no-op `"repeat probe"` phase in Procurement and keeping Activation copy frozen during Aurora withdrawals are **defects**.
- **Risk:** Buyers exploring the second model and withdrawal phases see hardcoded Aurora behavior and redundant dropdown states, undercutting confidence that the governance model generalizes beyond one canned demo.
- **Smallest actionable fix:** Make `#case` phase-aware (adding withdrawal descriptions for Aurora that reflect both receipts and `"unreachable"` rather than `"timed out"`), and for Procurement either disable/hide `Withdrawal · repeat probe` (since first probe already verified both consumers) or define a distinct, explicitly illustrative divergence/retry step for `caseIndex === 1`.
