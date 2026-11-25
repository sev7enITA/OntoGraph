const ARMS = [
  ["incumbent", "Incumbent"],
  ["ontograph", "OnToGraPh"],
];
const SCENARIOS = {
  conforming: ["Conforming decision", "verified"],
  stale_decision: ["Stale decision", "mismatch"],
  withdrawal_unreachable: ["Unreachable on withdrawal", "unproven"],
  withdrawal_inactive: ["Confirmed inactivity", "withdrawal_verified"],
};
const VERDICTS = {
  verified: "Verified",
  mismatch: "Mismatch",
  unproven: "Unproven",
  withdrawal_verified: "Withdrawal verified",
};
const EFFORT_FIELDS = {
  review_minutes: "Review",
  first_adapter_minutes: "First adapter",
  second_adapter_minutes: "Second adapter",
  maintenance_minutes: "Maintenance",
};
const DECISIONS = {
  incomplete: ["Comparison incomplete", "unproven"],
  reject: ["Reject the pilot", "mismatch"],
  "investigate-gap": ["Investigate a coverage gap", "unproven"],
  "ontograph-lower-effort": ["Equivalent checks, lower recorded effort", "verified"],
  "incumbent-viable": ["Incumbent remains viable", "verified"],
};
const MAX_CASES = 80;

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== null) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function action(label, handler, className) {
  const button = element("button", label, {type: "button", class: className ?? ""});
  button.addEventListener("click", handler);
  return button;
}

function input(label, value, apply, attributes = {}) {
  const control = element("input", null, attributes);
  control.value = value ?? "";
  control.addEventListener("input", () => apply(control));
  const wrapper = element("label", label);
  wrapper.append(control);
  return wrapper;
}

function selection(label, value, choices, apply) {
  const control = element("select", null);
  for (const [key, title] of choices) control.append(element("option", title, {value: key}));
  control.value = value;
  control.addEventListener("change", () => apply(control));
  const wrapper = element("label", label);
  wrapper.append(control);
  return wrapper;
}

function blankEffort() {
  return Object.fromEntries(Object.keys(EFFORT_FIELDS).map(key => [key, null]));
}

function blankCase(id, scenario = "conforming") {
  return {id, scenario, application: "", instance: "", release_ref: "", activations: {incumbent: "", ontograph: ""}};
}

function blankPilot(scope) {
  const cases = Object.keys(SCENARIOS).map(scenario => blankCase(scenario.replaceAll("_", "-"), scenario));
  return {
    format: "ontograph.pilot/1",
    title: "Paired verification trial",
    scope,
    cases,
    arms: Object.fromEntries(ARMS.map(([key]) => [key, {outcomes: [], effort: blankEffort()}])),
  };
}

function textFields(record, fields) {
  return record && fields.every(field => typeof record[field] === "string");
}

function validDraft(value) {
  return value?.format === "ontograph.pilot/1"
    && typeof value.title === "string"
    && ["synthetic", "customer"].includes(value.scope)
    && Array.isArray(value.cases)
    && value.cases.length <= MAX_CASES
    && value.cases.every(item => textFields(item, ["id", "application", "instance", "release_ref"])
      && textFields(item.activations, ["incumbent", "ontograph"]) && Object.hasOwn(SCENARIOS, item.scenario))
    && ARMS.every(([key]) => Array.isArray(value.arms?.[key]?.outcomes)
      && value.arms[key].outcomes.every(item => item && typeof item.case_id === "string")
      && value.arms[key].effort && typeof value.arms[key].effort === "object" && !Array.isArray(value.arms[key].effort));
}

function badge(text, tone) {
  return element("span", text, {class: "state-badge " + tone});
}

function resultCell(result) {
  if (result.status === "missing") return badge("Pending", "unproven");
  const mismatch = result.status === "mismatch";
  const description = (VERDICTS[result.verdict] || result.verdict) + (mismatch ? " · Unexpected" : " · Matches");
  const tone = mismatch ? "mismatch" : result.verdict === "unproven" ? "unproven" : "verified";
  return badge(description, tone);
}

function drawAssessment(assessment, panel) {
  const [headline, tone] = DECISIONS[assessment.decision] || [assessment.decision, "unproven"];
  const heading = element("div", null, {class: "proof-detail-heading"});
  heading.append(
    element("h3", "Pilot assessment"),
    badge(headline, tone),
  );
  const source = element("p", assessment.scope === "synthetic" ? "Synthetic exercise"
    : "Customer scope · Outcomes entered by the operator", {class: "proof-overline"});
  const reasons = element("ul", null, {class: "item-list"});
  reasons.append(...assessment.reasons.map(reason => element("li", reason)));

  const matrix = element("div", null, {class: "pilot-matrix"});
  const table = element("table", null, {class: "data-table", role: "table", "aria-label": "Paired case results"});
  const header = element("thead", null, {role: "rowgroup"});
  const titles = element("tr", null, {role: "row"});
  for (const title of ["Case", "Expected", ...ARMS.map(([, label]) => label)]) {
    titles.append(element("th", title, {scope: "col", role: "columnheader"}));
  }
  header.append(titles);
  const body = element("tbody", null, {role: "rowgroup"});
  for (const item of assessment.cases) {
    const row = element("tr", null, {role: "row"});
    row.append(
      element("th", SCENARIOS[item.scenario][0] + (item.application ? " · " + item.application.toUpperCase() : ""),
        {scope: "row", role: "rowheader", title: item.id}),
    );
    function addColumn(label, content) {
      const cell = element("td", null, {role: "cell"});
      cell.append(element("span", label, {class: "pilot-cell-label", "aria-hidden": "true"}), content);
      row.append(cell);
    }
    addColumn("Expected", VERDICTS[item.expected] || item.expected);
    for (const [key, label] of ARMS) addColumn(label, resultCell(item[key]));
    body.append(row);
  }
  table.append(header, body);
  matrix.append(table);

  const effort = element("dl", null, {class: "proof-facts pilot-effort-summary"});
  const stats = assessment.effort;
  for (const [label, minutes] of [
    ["Incumbent effort", stats.incumbent_minutes], ["OnToGraPh effort", stats.ontograph_minutes],
    ["Incumbent − OnToGraPh", stats.delta_minutes],
  ]) {
    const pair = element("div", null);
    pair.append(element("dt", label), element("dd", minutes == null ? "Pending" : minutes + " min"));
    effort.append(pair);
  }
  const integrity = element("details", null, {class: "proof-probe"});
  integrity.append(element("summary", "Assessed dossier SHA-256"), element("code", assessment.dossier_sha256));
  panel.replaceChildren(heading, source, reasons, matrix, effort, integrity);
  panel.hidden = false;
}

export function createPilot(root, request, download) {
  let draft = blankPilot("customer");
  let assessed = null;
  let revision = 0;
  let dirty = false;
  let busy = false;

  const toolbar = element("div", null, {class: "proof-toolbar pilot-toolbar"});
  const status = element("p", "", {class: "pilot-status", role: "status", "aria-atomic": "true"});
  const assessmentPanel = element("section", null, {class: "pilot-assessment proof-inspection", tabindex: "-1", "aria-label": "Pilot assessment", hidden: ""});
  const editor = element("div", null, {class: "pilot-editor"});
  const file = element("input", null, {type: "file", accept: "application/json,.json", "aria-label": "Import pilot JSON"});
  const fileLabel = element("label", "Import JSON", {class: "button file-button"});
  fileLabel.append(file);

  function tell(message, tone = "info") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function updateButtons() {
    for (const control of [exampleButton, blankButton, file, draftButton, compareButton]) control.disabled = busy;
    assessedButton.disabled = busy || !assessed;
  }

  function markEdited() {
    revision++;
    dirty = true;
    if (assessed) {
      assessed = null;
      assessmentPanel.hidden = true;
      tell("Inputs changed. Run a new comparison to assess this draft.");
      updateButtons();
    }
  }

  function replaceDraft(value) {
    revision++;
    draft = value;
    dirty = false;
    assessed = null;
    assessmentPanel.hidden = true;
    drawEditor();
    updateButtons();
  }

  function confirmReplace() {
    return !dirty || window.confirm("Replace this edited pilot draft?");
  }

  async function compare(focus = true) {
    const snapshot = structuredClone(draft);
    const submitted = revision;
    busy = true;
    updateButtons();
    tell("Comparing recorded cases and effort…");
    try {
      const assessment = await request("./api/pilot/assess", snapshot);
      if (submitted !== revision) {
        tell("Inputs changed during the comparison. Run it again to assess this draft.");
        return;
      }
      assessed = {dossier: snapshot, assessment};
      drawAssessment(assessment, assessmentPanel);
      tell("Assessment ready.");
      if (focus) assessmentPanel.focus();
    } catch (error) {
      tell(error.message, "error");
    } finally {
      busy = false;
      updateButtons();
    }
  }

  async function loadExample() {
    if (!confirmReplace()) return;
    const opened = revision;
    busy = true;
    updateButtons();
    tell("Loading synthetic cases…");
    try {
      const example = await request("./api/pilot-example");
      if (!validDraft(example)) throw new Error("The example does not contain a pilot dossier.");
      if (opened !== revision) throw new Error("Inputs changed while the example loaded. The current draft was kept.");
      replaceDraft(example);
      await compare(false);
    } catch (error) {
      tell(error.message, "error");
    } finally {
      busy = false;
      updateButtons();
    }
  }

  async function readImport() {
    const source = file.files[0];
    file.value = "";
    if (!source || !confirmReplace()) return;
    const opened = revision;
    busy = true;
    updateButtons();
    try {
      if (source.size > 8_000_000) throw new Error("Pilot JSON exceeds 8 MB.");
      const imported = JSON.parse(await source.text());
      const value = imported?.dossier ?? imported;
      if (!validDraft(value)) throw new Error("Expected an ontograph.pilot/1 dossier.");
      if (opened !== revision) throw new Error("Inputs changed while the file loaded. The current draft was kept.");
      replaceDraft(value);
      tell("Pilot imported. Run the comparison to verify its recorded cases.");
    } catch (error) {
      tell(error.message, "error");
    } finally {
      busy = false;
      updateButtons();
    }
  }

  function drawCase(item, list) {
    const disclosure = element("details", null, {class: "pilot-case"});
    const summary = element("summary", null);
    const heading = element("strong", "");
    const expected = badge("", "unproven");
    summary.append(heading, expected);
    function showSummary() {
      heading.textContent = (item.application ? item.application.toUpperCase() + " · " : "") + SCENARIOS[item.scenario][0];
      expected.textContent = "Expected " + VERDICTS[SCENARIOS[item.scenario][1]];
    }
    showSummary();
    disclosure.append(summary);

    const inputs = element("div", null, {class: "pilot-fields"});
    function textField(label, field, target, refresh = false) {
      return input(label, target[field], control => {
        target[field] = control.value;
        if (refresh) showSummary();
        markEdited();
      });
    }
    inputs.append(
      selection("Scenario", item.scenario, Object.entries(SCENARIOS).map(([key, [title]]) => [key, title]), control => {
        item.scenario = control.value;
        showSummary();
        markEdited();
      }),
      textField("Application", "application", item, true),
      textField("Exact app instance", "instance", item),
      textField("Shared release reference", "release_ref", item),
      ...ARMS.map(([key, label]) => textField(label + " activation", key, item.activations)),
    );
    const body = element("div", null, {class: "pilot-case-content"});
    body.append(element("code", item.id, {class: "proof-muted"}), inputs);
    const outcomes = element("div", null, {class: "pilot-arm-grid"});
    for (const [key, label] of ARMS) outcomes.append(drawOutcome(item, key, label));
    body.append(outcomes);
    const remove = action("Remove case", () => {
      const hasOutcome = ARMS.some(([key]) => draft.arms[key].outcomes.some(outcome => outcome.case_id === item.id));
      if (hasOutcome && !window.confirm("Remove this case and its recorded outcomes?")) return;
      draft.cases = draft.cases.filter(row => row !== item);
      for (const [key] of ARMS) {
        draft.arms[key].outcomes = draft.arms[key].outcomes.filter(outcome => outcome.case_id !== item.id);
      }
      markEdited();
      disclosure.remove();
      const addCase = editor.querySelector("#pilot-add-case");
      addCase.disabled = false;
      const other = list.querySelector("summary") ?? addCase;
      other.focus();
    });
    body.append(remove);
    disclosure.append(body);
    return disclosure;
  }

  function drawOutcome(item, arm, label) {
    const fieldset = element("fieldset", null, {class: "pilot-outcome"});
    fieldset.append(element("legend", label));
    const records = draft.arms[arm].outcomes;
    let outcome = records.find(record => record.case_id === item.id);
    const metadata = element("div", null, {class: "pilot-fields"});
    function drawDetails() {
      metadata.hidden = !outcome;
      if (!outcome) return;
      const fields = [
        ["Observed instance", "instance", {}],
        ["Observed activation", "activation", {}],
        ["Observer", "observer", {}],
        ["Captured at (UTC)", "captured_at", {placeholder: "YYYY-MM-DDTHH:mm:ssZ"}],
        ["Artifact locator", "artifact_ref", {}],
        ["Artifact SHA-256", "artifact_sha256", {maxlength: "64", spellcheck: "false"}],
        ["Custody reference", "custody_ref", {}],
      ];
      metadata.replaceChildren(...fields.map(([name, key, attributes]) =>
        input(name, outcome[key], control => {
          outcome[key] = control.value;
          markEdited();
        }, attributes)));
    }
    fieldset.append(selection("Verdict", outcome?.verdict ?? "",
      [["", "Pending"], ...Object.entries(VERDICTS)], control => {
        if (control.value && !outcome) {
          outcome = {case_id: item.id, instance: "", activation: "", verdict: "", observer: "",
            captured_at: "", artifact_ref: "", artifact_sha256: "", custody_ref: ""};
          records.push(outcome);
        }
        if (control.value) {
          outcome.verdict = control.value;
        } else if (outcome) {
          if (!window.confirm("Clear the recorded verdict and evidence for this arm?")) {
            control.value = outcome.verdict;
            return;
          }
          records.splice(records.indexOf(outcome), 1);
          outcome = null;
        }
        markEdited();
        drawDetails();
      }), metadata);
    drawDetails();
    return fieldset;
  }

  function drawEditor() {
    const setup = element("div", null, {class: "pilot-fields pilot-setup"});
    setup.append(input("Pilot title", draft.title, control => {
      draft.title = control.value;
      markEdited();
    }), selection("Evidence scope", draft.scope,
      [["synthetic", "Synthetic exercise"], ["customer", "Customer record"]], control => {
        if (!window.confirm("Start a blank dossier for the selected scope?")) {
          control.value = draft.scope;
          return;
        }
        replaceDraft(blankPilot(control.value));
        editor.querySelector("select").focus();
        tell("Blank pilot ready.");
      }));

    const cases = element("section", null, {class: "pilot-cases", "aria-label": "Paired cases"});
    const head = element("div", null, {class: "proof-detail-heading"});
    const list = element("div", null, {class: "pilot-case-list"});
    const add = action("Add case", () => {
      let id = draft.cases.length + 1;
      while (draft.cases.some(item => item.id === "case-" + id)) id++;
      const item = blankCase("case-" + id);
      draft.cases.push(item);
      const disclosure = drawCase(item, list);
      disclosure.open = true;
      list.append(disclosure);
      add.disabled = draft.cases.length >= MAX_CASES;
      disclosure.querySelector("select").focus();
      markEdited();
    });
    add.id = "pilot-add-case";
    add.disabled = draft.cases.length >= MAX_CASES;
    head.append(element("h3", "Paired cases"), add);
    cases.append(head, list);
    for (const [index, item] of draft.cases.entries()) {
      const disclosure = drawCase(item, list);
      disclosure.open = index === 0;
      list.append(disclosure);
    }

    const effort = element("section", null, {class: "pilot-effort", "aria-label": "Recorded effort"});
    const grid = element("div", null, {class: "pilot-arm-grid"});
    effort.append(element("h3", "Recorded effort (minutes)"),
      element("p", "Use the same measurement period for both arms. Record 0 when a category required no effort.", {class: "proof-muted"}), grid);
    for (const [key, label] of ARMS) {
      const group = element("fieldset", null, {class: "pilot-outcome"});
      group.append(element("legend", label));
      const values = draft.arms[key].effort;
      const measurements = element("div", null, {class: "pilot-fields"});
      for (const [name, fieldLabel] of Object.entries(EFFORT_FIELDS)) {
        measurements.append(input(fieldLabel, values[name], control => {
          values[name] = control.value === "" ? null : control.valueAsNumber;
          markEdited();
        }, {type: "number", min: "0", step: "1", inputmode: "numeric"}));
      }
      group.append(measurements);
      grid.append(group);
    }
    editor.replaceChildren(setup, cases, effort);
  }

  const exampleButton = action("Load Aurora 21 example", loadExample, "accent-button");
  const blankButton = action("New blank pilot", () => {
    if (!confirmReplace()) return;
    replaceDraft(blankPilot("customer"));
    tell("Blank pilot ready. Enter case bindings and evidence for both arms.");
  });
  const draftButton = action("Export draft", () => {
    download(JSON.stringify(draft, null, 2), "ontograph-pilot-draft.json");
    dirty = false;
  });
  const assessedButton = action("Export assessment", () => {
    if (assessed) download(JSON.stringify(assessed, null, 2), "ontograph-pilot-assessment.json");
  });
  const compareButton = action("Run comparison", () => compare(), "primary-button");
  file.addEventListener("change", readImport);
  toolbar.append(exampleButton, blankButton, fileLabel, draftButton, compareButton, assessedButton);
  root.replaceChildren(toolbar, element("p",
    "Pair the same cases on both arms. The offline comparison checks recorded bindings and outcomes. Observer identity and custody require separate verification.",
    {class: "proof-muted pilot-guide"}), status, assessmentPanel, editor);
  drawEditor();
  updateButtons();
}
