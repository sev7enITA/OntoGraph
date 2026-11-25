const PHASES = [
  ["baseline", "Baseline"],
  ["drift", "New rule"],
  ["unreachable", "Withdrawal requested"],
  ["withdrawn", "Withdrawal verified"],
  ["restored", "Recovery"],
];

const LABELS = {
  verified: "Verified on test cases",
  mismatch: "Mismatch",
  unproven: "Unproven",
  withdrawal_verified: "Withdrawal verified",
  allow: "Allow",
  hold: "Hold",
  out_of_scope: "Out of scope",
  unobservable: "Unreachable",
  inactive: "Inactive",
  active: "Active",
  missing: "Missing",
  inconclusive: "Inconclusive",
  stale: "Stale",
};
const PROBE_PRIORITY = {mismatch: 0, inconclusive: 1, missing: 1, stale: 1, verified: 2};

function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== null) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  return node;
}

function badge(state) {
  return element("span", LABELS[state] || state, {class: "state-badge " + state});
}

function facts(entries, className = "proof-facts") {
  const list = element("dl", null, {class: className});
  for (const [label, value, technical] of entries) {
    const item = element("div", null);
    const detail = element("dd", null);
    detail.append(technical ? element("code", value) : document.createTextNode(value));
    item.append(element("dt", label), detail);
    list.append(item);
  }
  return list;
}

function digestLabel(value, empty) {
  return value ?? empty;
}

function drawProbe(probe) {
  const observation = probe.observation;
  const disclosure = element("details", null, {class: "proof-probe"});
  const summary = element("summary", null);
  const head = element("span", null, {class: "proof-probe-title"});
  head.append(element("strong", probe.probe), badge(probe.result));
  const decisions = element("span", null, {class: "proof-probe-decisions"});
  decisions.append(
    element("span", "Expected " + (LABELS[probe.expected] || probe.expected)),
    element("span", "Observed " + (observation ? LABELS[observation.actual_outcome] || observation.actual_outcome : "pending")),
  );
  summary.append(head, decisions);
  disclosure.append(summary);
  if (observation) {
    disclosure.append(facts([
      ["Activation", String(observation.activation), true],
      ["Phase", observation.phase],
      ["Observer", observation.observer],
      ["Captured at", observation.captured_at, true],
      ["Event sequence", String(observation.seq), true],
      ["Observed delivery SHA-256", digestLabel(observation.actual_digest, "No active digest reported"), true],
      ["Artifact locator", observation.artifact_ref, true],
      ["Artifact SHA-256", observation.artifact_sha256, true],
    ]));
  } else {
    disclosure.append(element("p", "No observation was recorded for this case.", {class: "proof-muted"}));
  }
  return disclosure;
}

export function renderEvidence(root, report) {
  const phases = PHASES.filter(([id]) => report[id]);
  if (!phases.length) {
    root.replaceChildren(element("p", "No simulation evidence is available.", {role: "status"}));
    return;
  }

  let phase = phases.find(([id]) => id === "drift") || phases[0];
  const startingApps = report[phase[0]].applications;
  let application = startingApps.find(app => app.state === "mismatch")?.application || startingApps[0]?.application;

  const toolbar = element("div", null, {class: "proof-toolbar"});
  const phaseList = element("div", null, {class: "proof-phase-list", role: "group", "aria-label": "Simulation phase"});
  const scope = element("p", "Synthetic simulation · Business outcome unassessed", {class: "proof-overline"});
  const assist = element("p", "", {class: "visually-hidden", role: "status"});
  const applications = element("div", null, {
    class: "proof-applications", role: "group", "aria-label": "Inspect a simulated application",
  });
  const inspection = element("section", null, {class: "proof-inspection", "aria-label": "Selected application evidence"});
  const offline = element("a", "Open complete evidence report ↗", {
    href: "./evidence-report", target: "_blank", rel: "noopener", class: "proof-report-link",
  });
  toolbar.append(scope, offline);

  const phaseButtons = phases.map(([id, label]) => {
    const control = element("button", label, {type: "button", "aria-pressed": "false"});
    control.addEventListener("click", () => {
      phase = [id, label];
      renderPhase();
    });
    return [id, control];
  });
  phaseList.append(...phaseButtons.map(([, control]) => control));

  function renderInspection() {
    const data = report[phase[0]];
    const app = data.applications.find(item => item.application === application);
    const expected = app && (app.phase === "withdraw" ? null : data.manifest.deliveries[application]);
    for (const control of applications.querySelectorAll("button")) {
      control.setAttribute("aria-pressed", String(control.dataset.application === application));
    }
    if (!app) {
      inspection.replaceChildren(element("p", "This phase has no application records.", {class: "proof-muted"}));
      assist.textContent = phase[1] + ". No application records.";
      return;
    }

    const receipt = app.receipt;
    const header = element("div", null, {class: "proof-detail-heading"});
    const title = element("div", null);
    title.append(
      element("h3", application.toUpperCase() + " · " + phase[1]),
      element("p", "Activation " + data.activation + " · " + data.as_of, {class: "proof-mono proof-muted"}),
    );
    header.append(title, badge(app.state));

    const delivery = element("div", null, {class: "proof-delivery"});
    const expectedPanel = element("section", null, {class: "proof-layer"});
    expectedPanel.append(
      element("h4", "Expected delivery"),
      facts([["Delivery SHA-256", digestLabel(expected, "Inactive delivery expected"), true]]),
    );
    const declaredPanel = element("section", null, {class: "proof-layer"});
    declaredPanel.append(element("h4", "Declared receipt"));
    if (receipt) {
      declaredPanel.append(facts([
        ["Declared SHA-256", digestLabel(receipt.actual_digest, "No active digest reported"), true],
        ["Received at", receipt.observed_at, true],
        ["Receipt sequence", String(receipt.seq), true],
      ]));
    } else {
      declaredPanel.append(element("p", "No receipt recorded.", {class: "proof-muted"}));
    }
    delivery.append(expectedPanel, declaredPanel);

    const observationLayer = element("section", null, {class: "proof-layer proof-observations"});
    observationLayer.append(element("h4", "Observed results"));
    if (receipt && expected !== null && receipt.actual_digest === expected && app.state === "mismatch") {
      observationLayer.append(element("p", "The declared digest matches. At least one observed result differs from the expected case outcome.", {class: "proof-finding proof-finding-mismatch"}));
    } else if (app.phase === "withdraw" && app.state === "unproven") {
      observationLayer.append(element("p", "Withdrawal remains unproven for this application.", {class: "proof-finding proof-finding-unproven"}));
    }
    const probes = [...app.probes].sort((left, right) => PROBE_PRIORITY[left.result] - PROBE_PRIORITY[right.result]);
    for (const probe of probes) observationLayer.append(drawProbe(probe));
    inspection.replaceChildren(header, delivery, observationLayer);
    assist.textContent = phase[1] + ". " + app.application.toUpperCase() + ". " + (LABELS[app.state] || app.state);
  }

  function renderPhase() {
    const data = report[phase[0]];
    if (!data.applications.some(app => app.application === application)) application = data.applications[0]?.application;
    for (const [id, control] of phaseButtons) control.setAttribute("aria-pressed", String(id === phase[0]));

    applications.replaceChildren(...data.applications.map(app => {
      const control = element("button", null, {
        type: "button", "data-application": app.application, "aria-pressed": "false",
      });
      control.append(element("strong", app.application.toUpperCase()), badge(app.state));
      control.addEventListener("click", () => {
        application = app.application;
        renderInspection();
      });
      return control;
    }));
    renderInspection();
  }

  root.replaceChildren(toolbar, phaseList, applications, inspection, assist);
  renderPhase();
}
