[OnToGraPh Wiki](README.md)

# OnToGraPh Visual Studio

Run from the repository root:

```sh
python3 -m ontograph studio
```

Open [OnToGraPh Studio](http://127.0.0.1:8765/). The local server uses a synthetic starting dataset and runs without a language model, portal account or cloud service.

## Start in the process modeler

The native Process Modeler is the first screen. It includes the process inventory, block, sequence and entity views, an editable canvas, shape palette, live properties, source panel and exports. The browser saves draft changes and layout. Export the modeler workbook to transfer the draft with its nodes and links, then reload it using the import control.

[Process modeler preview](../../assets/studio/process-modeler.png)

## Move from a process to a control

1. Open **Semantic Studio** from the process modeler.
2. In **Structure**, select a process and the control to associate with it. This creates an explicit reference in the governance draft. Continue editing the detailed inventory and layout in the modeler.
3. Select an object or edge in **Graph**. Linked references are navigable. The inspector opens nested objects, lists and values and displays their paths. Edit a value with its typed control or use the JSON editor for the same document.
4. Use **Validate** to run engine checks. **Save version** stores a working copy with a note in this browser. In **Versions**, compare properties and affected IDs with the baseline or an earlier version.
5. In **Evidence**, follow Aurora 21. The report concerns the two built-in simulators. Use model validation to analyze your own draft.

The link between the workspaces is an explicit projection of a process. Release documents and process inventories use distinct formats and each has its own editor.

[Graph and property inspector preview](../../assets/studio/semantic-studio.png)

## Follow a change across layers

Use **Semantics**, **Controls and delivery**, or **Sources and tests** on the graph. The selected layer is emphasized and related context remains visible. The graph scope controls the visible dependencies. Everything stays linked to the same editable model and field-level inspector.

In **Structure**, use **Import PolicyWatcher evidence** with a published evidence packet and an authorized excerpt. Set the draft’s UTC effective time to cover the new and existing captures. The source opens in the inspector pending human review. The offline intake preserves the upstream references and computes the local excerpt hash.

In **Evidence**, choose a release phase and application. Compare the expected package with the declared receipt, then open the observed case and its artifact reference, hash, observer and capture time. Aurora 21 labels the simulated systems. An unreachable app stays unproven and business outcome remains unassessed.

[Evidence workbench preview](../../assets/studio/evidence-workbench.png)

## Compare two pilot arms

Open **Paired pilot** to compare OnToGraPh and the incumbent using the same preregistered cases. Record each arm's activation for a case and the exact consuming instance. Enter the observer, UTC capture time, artifact SHA-256 and laboratory or customer custody reference. Use the same measurement window for review, first and second adapter and maintenance effort.

Load Aurora 21 to rehearse the workflow. Only OnToGraPh's synthetic outcomes are filled. Run the review against a second arm when its measurements are available. A false withdrawal confirmation fails the assessment. Export the dossier and its assessment together, or re-import the dossier to continue editing.

The assessor checks consistency of the submitted bindings and calculates outcomes from the declared cases. Verify actual instance identity, artifact bytes and custody with the operator responsible for the pilot.

## Formats and local registry

| Workspace | Import and export |
| --- | --- |
| Process modeler | OnToGraPh Excel workbooks, including earlier inventories based on the modeler's template. JSON, Mermaid, PlantUML, SVG and ZIP exports. |
| Semantic Studio | Release JSON and the `OntoGraph Release` workbook with individual paths, types and values. JSON-LD, XLSX, Mermaid, PlantUML, SVG and ZIP exports. |

## Deliver a reviewed rule through CI

Start the standalone Studio with `--registry` and open **Semantic Studio → Release → Registry & CI**. Choose whether a candidate requires CI evidence to activate. After the required reviews, export its deterministic OPA package. The package ties the Rego policy, scoped data and tests to the frozen release digest.

GitHub Actions and Azure Pipelines use the same verification command. An auditor can record the resulting evidence before activation. The release status then shows its commit, run and artifact alongside each application's separate observations.

[DevOps quickstart and reproducible pilot](../../examples/devops/README.md)

Keep the **Path**, **Type** and **Value** columns in the semantic workbook. Edit values in their declared type. Workbook import uses the same validator as JSON import.

Start with your own semantic document:

```sh
python3 -m ontograph studio --model examples/aurora-21.json
```

Operate a release using an **existing local registry**:

```sh
python3 -m ontograph studio --registry path/to/registry.sqlite
```

The **Local registry** panel in **Evidence** uses a role token to prepare a candidate, record a vote, publish, withdraw and inspect the audit trail. The registry enforces identity, quorum and operation validity. Enter tokens in the panel at the time of use. The panel is available on the configured local server.

[Release protocol](../PROTOCOL.md) · [Aurora 21](AURORA-21.md)
