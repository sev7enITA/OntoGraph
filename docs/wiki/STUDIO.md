[OnToGraPh Wiki](README.md)

# OnToGraPh Visual Studio

Run from the repository root:

```sh
python3 -m ontograph studio
```

Open [OnToGraPh Studio](http://127.0.0.1:8765/). The local server uses a synthetic starting dataset and runs without a language model, portal account or cloud service.

## Start in the process modeler

The first screen reuses the code, structure and workflow of the PolicyAsCode workbench. It includes the process inventory, block, sequence and entity views, an editable canvas, shape palette, live properties, source panel and exports. The browser saves draft changes and layout. Export the modeler workbook to transfer the draft with its nodes and links, then reload it using the import control.

[Process modeler preview](../../assets/studio/process-modeler.png)

## Move from a process to a control

1. Open **Semantic Studio** from the process modeler.
2. In **Structure**, select a process and the control to associate with it. This creates an explicit reference in the governance draft. Continue editing the detailed inventory and layout in the modeler.
3. Select an object or edge in **Graph**. Linked references are navigable. The inspector opens nested objects, lists and values and displays their paths. Edit a value with its typed control or use the JSON editor for the same document.
4. Use **Validate** to run engine checks. **Save version** stores a working copy with a note in this browser. In **Versions**, compare properties and affected IDs with the baseline or an earlier version.
5. In **Evidence**, follow Aurora 21. The report concerns the two built-in simulators. Use model validation to analyze your own draft.

The link between the workspaces is an explicit projection of a process. Release documents and process inventories use distinct formats and each has its own editor.

[Graph and property inspector preview](../../assets/studio/semantic-studio.png)

## Formats and local registry

| Workspace | Import and export |
| --- | --- |
| Process modeler | PolicyAsCode/OnToGraPh Excel workbooks based on the modeler's template. JSON, Mermaid, PlantUML, SVG and ZIP exports. |
| Semantic Studio | Release JSON and the `OntoGraph Release` workbook with individual paths, types and values. JSON-LD, XLSX, Mermaid, PlantUML, SVG and ZIP exports. |

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
