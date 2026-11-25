import {createGraph} from "./graph.js";
import {renderInspector} from "./inspector.js";

const $ = id => document.getElementById(id);
const own = (object, key) => object != null && Object.hasOwn(object, key);
const clone = value => structuredClone(value);
const show = value => JSON.stringify(value, null, 2);
const labels = {
  concept: "Concetto", class: "Classe", field: "Campo", process: "Processo", control: "Controllo",
  contract: "Contratto", application: "Applicazione", evidence: "Evidenza", rules: "Regole",
  probes: "Casi", edges: "Relazioni", model: "Progetto", broader: "Più generale", subClassOf: "Sottoclasse",
  mapsTo: "Mappa a", dependsOn: "Dipende da", implements: "Implementa", consumes: "Consuma",
};
const groups = ["nodes", "edges", "evidence", "rules", "probes"];
const identifier = /^[a-z][a-z0-9_-]{0,63}$/;

function el(tag, text, attrs = {}) {
  const element = document.createElement(tag);
  if (text !== null) element.textContent = text;
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}
function button(text, action, attrs = {}) {
  const item = el("button", text, {type: "button", ...attrs});
  item.addEventListener("click", action);
  return item;
}
function field(text, input) {
  const label = el("label", null);
  label.append(el("span", text), input);
  return label;
}
function option(value, text) {
  return el("option", text, {value});
}
function selectInput(name, pairs) {
  const select = el("select", null, {name, required: ""});
  select.replaceChildren(...pairs.map(([value, text]) => option(value, text)));
  return select;
}
function describe(item, group) {
  if (group === "edges") return [item.source, item.predicate, item.target].join(" → ");
  return item.label || item.id || "Senza nome";
}
function look(object, path) {
  return path.reduce((value, key) => own(value, key) ? value[key] : undefined, object);
}
function set(object, key, value) {
  Object.defineProperty(object, key, {value, enumerable: true, configurable: true, writable: true});
}
function tell(message, tone = "info") {
  $("status").textContent = message;
  $("status").dataset.tone = tone;
}
function download(data, filename, media = "application/json") {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], {type: media}));
  const link = el("a", null, {href: url, download: filename});
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function call(path, body, options = {}) {
  const response = await fetch(path, body === undefined ? undefined : {
    method: "POST",
    body: body instanceof Blob ? body : JSON.stringify(body),
    headers: {"Content-Type": options.type || "application/json", ...(options.headers || {})},
  });
  if (!response.ok) {
    let reason = response.statusText;
    try {
      reason = (await response.json()).error || reason;
    } catch {
      // Keep the HTTP error if the server did not return JSON.
    }
    throw new Error(reason);
  }
  return options.binary ? await response.blob() : await response.json();
}
async function checksum(text) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}
function entryShape(model) {
  return model?.format === "ontograph.release/1" && identifier.test(model.domain || "")
    && groups.every(group => Array.isArray(model[group]) && model[group].every(row => row && typeof row === "object" && !Array.isArray(row)));
}

let model, base, capabilities, storageKey;
let selection = [], view = "graph", checked = null, activeCheck = 0, sourceDirty = false;
let versions = [], past = [], future = [], compareIndex = "seed";
let evidence = null;
const graph = createGraph($("graph"), select);

function safeLoad(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({model, versions}));
  } catch {
    tell("Spazio del browser esaurito. Esporta la bozza per conservarla.", "warn");
  }
}
function bind(boot) {
  capabilities = boot;
  base = boot.base;
  storageKey = "ontograph-studio/1/" + boot.model.domain + "/" + boot.model.effective_at;
  const saved = safeLoad(storageKey);
  model = entryShape(saved?.model) && saved.model.domain === boot.model.domain ? saved.model : boot.model;
  versions = Array.isArray(saved?.versions) ? saved.versions.filter(item => entryShape(item.model) && item.model.domain === model.domain).slice(0, 12) : [];
  for (const tag of [...boot.kinds, "edges", "evidence", "rules", "probes"]) {
    $("kind-filter").append(option(tag, labels[tag] || tag));
  }
  const first = model.nodes.findIndex(node => node.kind === "control");
  selection = first === -1 ? [] : ["nodes", first];
  renderRegistry();
  renderBridge();
  render();
  void validateCurrent();
}

function select(path) {
  selection = [...path];
  if (view !== "graph") switchView("graph");
  render();
}
function switchView(next) {
  view = next;
  document.querySelectorAll("[data-panel]").forEach(panel => panel.hidden = panel.dataset.panel !== view);
  $("view-select").querySelectorAll("button[data-view]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.view === view)));
  render();
  if (next === "versions") void validateCurrent(false);
  if (next === "evidence" && !evidence) void showDemo();
}
function changed(draft, path = selection) {
  if (show(draft) === show(model)) return;
  past.push(model);
  if (past.length > 30) past.shift();
  future = [];
  replace(draft, path);
}
function replace(draft, path = selection) {
  model = draft;
  selection = look(model, path) === undefined ? [] : [...path];
  checked = null;
  activeCheck += 1;
  persist();
  render();
}
function undoRedo(redo) {
  const from = redo ? future : past;
  if (!from.length || sourceDirty) return;
  (redo ? past : future).push(model);
  replace(from.pop());
  tell(redo ? "Modifica ripristinata." : "Modifica annullata.");
}
function canChange() {
  if (sourceDirty) throw new Error("Applica il JSON in modifica prima di aggiornare la bozza visuale.");
}
function confirmDiscard() {
  return !sourceDirty || window.confirm("Sostituire il JSON in modifica con la nuova bozza?");
}
function renameReferences(draft, group, old, next) {
  if (group === "nodes") {
    for (const edge of draft.edges) {
      if (edge.source === old) edge.source = next;
      if (edge.target === old) edge.target = next;
    }
    for (const rule of draft.rules) {
      if (rule.control === old) rule.control = next;
      for (const domain of [rule.applies, rule.requires]) {
        if (own(domain, old)) {
          set(domain, next, domain[old]);
          delete domain[old];
        }
      }
    }
    for (const probe of draft.probes) {
      if (probe.application === old) probe.application = next;
      if (own(probe.facts, old)) {
        set(probe.facts, next, probe.facts[old]);
        delete probe.facts[old];
      }
    }
  } else if (group === "evidence") {
    draft.rules.forEach(rule => { if (rule.evidence === old) rule.evidence = next; });
  } else if (group === "rules") {
    draft.probes.forEach(probe => { if (probe.rule === old) probe.rule = next; });
  }
}
async function update(path, value) {
  try {
    canChange();
    const active = model;
    const draft = clone(model);
    if (!path.length) {
      if (!entryShape(value) || value.domain !== model.domain) return "Usa Importa per un documento di un altro dominio.";
      changed(clone(value));
      return;
    }
    const owner = look(draft, path.slice(0, -1));
    const key = path.at(-1);
    if (!owner || typeof owner !== "object") return "Il percorso non è presente.";
    if (path.length === 1 && ["format", "domain"].includes(key)) return "Questo campo identifica il workspace.";
    const isId = path.length === 3 && key === "id";
    if (isId) {
      if (typeof value !== "string" || !identifier.test(value) || draft[path[0]].some((entry, i) => i !== path[1] && entry.id === value)) {
        return "Scegli un ID valido e univoco.";
      }
      renameReferences(draft, path[0], owner.id, value);
    }
    set(owner, key, value);
    if (path[0] === "evidence" && path.length === 3 && key === "excerpt" && typeof value === "string") {
      owner.sha256 = await checksum(value);
      owner.status = "insufficient";
      if (model !== active) return "La bozza è cambiata durante il calcolo del digest. Riprova.";
    }
    if (!entryShape(draft)) return "Mantieni le collezioni del modello come elenchi di oggetti.";
    changed(draft);
  } catch (error) {
    return error.message;
  }
}
function remove(path) {
  try {
    canChange();
    if (path.length < 2 || (path.length === 3 && path[2] === "id")) return "Il campo è obbligatorio.";
    const draft = clone(model);
    const owner = look(draft, path.slice(0, -1));
    const key = path.at(-1);
    if (!own(owner, key)) return "Il percorso non è presente.";
    if (path.length === 2 && path[0] !== "edges") {
      const entry = owner[key];
      const id = entry.id;
      const linked = path[0] === "nodes" && (
        draft.edges.some(edge => edge.source === id || edge.target === id)
        || draft.rules.some(rule => rule.control === id || own(rule.applies, id) || own(rule.requires, id))
        || draft.probes.some(probe => probe.application === id || own(probe.facts, id))
      );
      if (linked || (path[0] === "rules" && draft.probes.some(probe => probe.rule === id))
          || (path[0] === "evidence" && draft.rules.some(rule => rule.evidence === id))) {
        return "Rimuovi prima i riferimenti a questo oggetto.";
      }
    }
    if (Array.isArray(owner)) owner.splice(Number(key), 1);
    else delete owner[key];
    if (!entryShape(draft)) return "Il modello richiede tutte le collezioni principali.";
    const location = path.length === 2 && selection[0] === path[0] ? [] : selection;
    changed(draft, location);
  } catch (error) {
    return error.message;
  }
}

function itemButton(item, group, index) {
  const active = selection[0] === group && selection[1] === index;
  const navigator = button(null, () => select([group, index]), {
    "data-object-id": item.id || "", class: "object-row",
    ...(active ? {"aria-current": "true"} : {}),
    "data-kind": group === "nodes" ? item.kind || "node" : group,
  });
  navigator.append(el("span", describe(item, group), {class: "object-name"}),
    el("small", labels[item.kind || group] || group));
  return navigator;
}
function renderNavigator() {
  const find = $("search").value.trim().toLocaleLowerCase();
  const filter = $("kind-filter").value;
  const objects = [
    button("Proprietà del progetto", () => select([]), {class: "object-row",
      ...(!selection.length ? {"aria-current": "true"} : {})}),
  ];
  if (find || filter !== "all") objects.length = 0;
  for (const group of groups) {
    model[group].forEach((item, index) => {
      const kind = group === "nodes" ? item.kind : group;
      if (filter !== "all" && filter !== kind) return;
      if (find && ![describe(item, group), item.id, item.kind, item.definition].join(" ").toLocaleLowerCase().includes(find)) return;
      objects.push(itemButton(item, group, index));
    });
  }
  $("nav-list").replaceChildren(...(objects.length ? objects : [el("p", "Nessun oggetto corrisponde alla ricerca.")]));
}
function renderStudio() {
  const rows = el("div", null, {class: "item-list"});
  for (const group of groups) {
    const section = el("details", null, group === "nodes" ? {open: ""} : {});
    section.append(el("summary", `${labels[group] || "Oggetti"} · ${model[group].length}`));
    model[group].forEach((item, index) => section.append(itemButton(item, group, index)));
    rows.append(section);
  }
  $("studio-list").replaceChildren(rows);
}
function render() {
  if (!model) return;
  $("model-title").textContent = model.domain === "aurora-21" ? "Aurora 21" : model.domain;
  $("model-scope").textContent = typeof model.scope === "string" ? model.scope : "";
  const count = [
    [model.nodes.length, "oggetto", "oggetti"], [model.edges.length, "relazione", "relazioni"],
    [model.rules.length, "regola", "regole"], [model.probes.length, "caso", "casi"],
  ];
  $("summary-strip").replaceChildren(...count.map(([value, singular, plural]) => {
    const span = el("span", null, {class: "summary-chip"});
    span.append(el("strong", String(value)), document.createTextNode(" " + (value === 1 ? singular : plural)));
    return span;
  }));
  $("undo").disabled = !past.length || sourceDirty;
  $("redo").disabled = !future.length || sourceDirty;
  $("apply-code").disabled = !sourceDirty;
  $("discard-code").disabled = !sourceDirty;
  if (!sourceDirty) $("code-editor").value = show(model);
  if (view === "graph") {
    renderNavigator();
    graph.render({document: model, selection, mode: $("graph-mode").value});
    renderInspector($("inspector"), {document: model, path: selection, onSelect: select, onUpdate: update, onDelete: remove});
    synchronizeZoom();
  } else if (view === "studio") {
    renderStudio();
  } else if (view === "versions") {
    renderVersions();
  }
}

function compareModel() {
  return compareIndex === "seed" ? base : versions.find(item => item.id === compareIndex)?.model || base;
}
function renderVersions() {
  $("compare-base").replaceChildren(option("seed", base.domain === model.domain ? "Baseline iniziale" : "Baseline"),
    ...versions.map(item => option(item.id, item.note)));
  $("compare-base").value = compareIndex;
  const history = el("div", null, {class: "item-list"});
  for (const version of versions) {
    const row = el("div", null, {class: "diff-row"});
    row.append(el("strong", version.note), el("time", version.date.slice(0, 16).replace("T", " ")),
      button("Carica come bozza", () => {
        if (!confirmDiscard()) return;
        sourceDirty = false;
        changed(clone(version.model), []);
        render();
        tell("Versione caricata come bozza.");
        void validateCurrent(false);
      }));
    history.append(row);
  }
  if (!versions.length) history.append(el("p", "Nessuna versione locale salvata."));
  $("versions-list").replaceChildren(history);
  renderComparison();
}
function renderComparison() {
  const root = $("compare-result");
  root.replaceChildren();
  if (!checked) {
    root.append(el("p", "Valida la bozza per visualizzare il confronto."));
    return;
  }
  root.append(el("p", `${checked.diff.total} modifiche · ${checked.impact.length} ID potenzialmente interessati`));
  if (checked.impact.length) root.append(el("p", checked.impact.join(", "), {class: "diff-path"}));
  if (checked.blockers.length) root.append(...checked.blockers.map(item => el("p", item, {class: "status-warning"})));
  for (const row of checked.diff.items) {
    const line = el("div", null, {class: "diff-row"});
    line.append(el("code", "/" + row.path.map(section => String(section).replaceAll("~", "~0").replaceAll("/", "~1")).join("/")),
      el("pre", ("before" in row ? show(row.before) : "∅") + "\n→\n" + ("after" in row ? show(row.after) : "∅")));
    root.append(line);
  }
}
async function validateCurrent(announce = true) {
  const epoch = ++activeCheck;
  try {
    if (sourceDirty) throw new Error("Applica il JSON in modifica prima di validare la bozza.");
    const result = await call("./api/validate", {model, base: compareModel()});
    if (activeCheck !== epoch) return null;
    checked = result;
    if (view === "versions") renderComparison();
    if (announce) {
      tell(result.blockers.length
        ? `Modello valido. ${result.blockers.length} punti da riesaminare per il rilascio.`
        : `Modello valido · ${result.probes.length} casi coerenti con le regole.`, result.blockers.length ? "warn" : "ok");
    }
    return result;
  } catch (error) {
    if (activeCheck === epoch) {
      tell(error.message, "error");
      if (view === "versions") $("compare-result").replaceChildren(el("p", error.message, {class: "status-warning"}));
    }
    return null;
  }
}
async function saveVersion() {
  const note = $("version-note").value.trim();
  if (!note) {
    $("version-note").focus();
    tell("Descrivi la modifica prima di salvare la versione.", "warn");
    return;
  }
  if (!(await validateCurrent(false))) return;
  versions.unshift({id: crypto.randomUUID(), note, date: new Date().toISOString(), model: clone(model)});
  versions = versions.slice(0, 12);
  $("version-note").value = "";
  persist();
  render();
  tell("Versione salvata in questo browser.", "ok");
}
async function importFile(file) {
  if (!file || !confirmDiscard()) return;
  if (file.size > 8_000_000) throw new Error("Il file supera il limite di 8 MB.");
  const parsed = /\.xlsx$/i.test(file.name)
    ? (await call("./api/import-workbook", file, {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})).model
    : JSON.parse(await file.text());
  await call("./api/validate", {model: parsed});
  if (parsed.domain !== model.domain) {
    base = clone(parsed);
    versions = [];
    past = [];
    future = [];
    comparisonReset();
    storageKey = "ontograph-studio/1/" + parsed.domain + "/" + parsed.effective_at;
    sourceDirty = false;
    replace(parsed, []);
    renderBridge();
  } else {
    sourceDirty = false;
    changed(parsed, []);
    render();
  }
  tell("Importazione valida. Il documento è ora una bozza.", "ok");
}
function comparisonReset() {
  compareIndex = "seed";
  $("version-note").value = "";
}
async function applyCode() {
  const draft = JSON.parse($("code-editor").value);
  if (draft?.domain !== model.domain) throw new Error("Usa Importa per aprire un altro workspace.");
  await call("./api/validate", {model: draft});
  sourceDirty = false;
  changed(draft, []);
  render();
  tell("JSON validato e applicato alla bozza.", "ok");
}
async function exportFile() {
  canChange();
  const format = $("export-format").value;
  if (format === "svg") {
    const markup = graph.toSvg();
    if (!markup) throw new Error("Apri il grafo prima di esportare SVG.");
    download(markup, "ontograph-graph.svg", "image/svg+xml");
  } else {
    const suffixes = {json: "json", jsonld: "jsonld", xlsx: "xlsx", zip: "zip", mermaid: "mmd", plantuml: "puml"};
    const file = await call("./api/export", {format, model}, {binary: true});
    download(file, model.domain + "." + suffixes[format]);
  }
  tell("Esportazione pronta.");
}
function openDialog(title, build) {
  canChange();
  const dialog = $("edit-dialog"), body = $("edit-dialog-content");
  const form = el("form", null, {class: "form-stack"});
  const error = el("p", "", {role: "status"});
  const action = el("button", "Aggiungi", {type: "submit", class: "button primary"});
  $("edit-dialog-title").textContent = title;
  body.replaceChildren(form);
  const task = build(form);
  form.append(error, action);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    action.disabled = true;
    try {
      await task(new FormData(form));
      dialog.close();
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      action.disabled = false;
    }
  });
  dialog.showModal();
  form.querySelector("input,select")?.focus();
}
function createObject() {
  openDialog("Aggiungi oggetto", form => {
    const types = [...capabilities.kinds, "evidence", "rules", "probes"];
    const kind = selectInput("kind", types.map(key => [key, labels[key] || key]));
    const id = el("input", null, {name: "id", pattern: identifier.source.slice(1, -1), required: "", maxlength: "64"});
    const label = el("input", null, {name: "label", required: "", maxlength: "500"});
    const definition = el("textarea", null, {name: "definition", required: "", rows: "3"});
    const owner = el("input", null, {name: "owner", required: "", value: model.owner || ""});
    form.append(field("Tipo", kind), field("Identificativo", id), field("Nome", label),
      field("Definizione o testo dell’evidenza", definition), field("Responsabile", owner));
    return async data => {
      const type = data.get("kind");
      const group = ["evidence", "rules", "probes"].includes(type) ? type : "nodes";
      const key = data.get("id").trim();
      if (!identifier.test(key) || model[group].some(item => item.id === key)) throw new Error("ID non valido o già presente.");
      const draft = clone(model);
      const text = data.get("definition").trim();
      let item = {id: key, kind: type, label: data.get("label").trim(), definition: text, owner: data.get("owner").trim()};
      if (group === "evidence") {
        item = {id: key, excerpt: text, uri: `urn:ontograph:${model.domain}:${key}`, sha256: await checksum(text),
          observed_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), status: "insufficient", applicability: "Da riesaminare"};
      } else if (group === "rules") {
        item = {id: key, control: draft.nodes.find(node => node.kind === "control")?.id || "",
          evidence: draft.evidence[0]?.id || "", applies: {}, requires: {}};
      } else if (group === "probes") {
        item = {id: key, application: draft.nodes.find(node => node.kind === "application")?.id || "",
          rule: draft.rules[0]?.id || "", facts: {}, expected: "hold"};
      }
      draft[group].push(item);
      changed(draft, [group, draft[group].length - 1]);
      switchView("graph");
      tell("Oggetto aggiunto alla bozza.");
    };
  });
}
function createRelation() {
  if (model.nodes.length < 2) throw new Error("Aggiungi almeno due nodi.");
  openDialog("Collega due oggetti", form => {
    const choices = model.nodes.map(node => [node.id, node.label || node.id]);
    const from = selectInput("source", choices);
    const to = selectInput("target", choices);
    const predicate = selectInput("predicate", capabilities.relations.map(key => [key, labels[key] || key]));
    predicate.value = "dependsOn";
    if (selection[0] === "nodes") from.value = model.nodes[selection[1]].id;
    to.selectedIndex = choices.findIndex(([key]) => key !== from.value);
    form.append(field("Da", from), field("Relazione", predicate), field("A", to));
    return data => {
      const edge = Object.fromEntries(data);
      if (edge.source === edge.target || model.edges.some(other => other.source === edge.source
          && other.predicate === edge.predicate && other.target === edge.target)) throw new Error("Relazione ripetuta o autoreferenziale.");
      const draft = clone(model);
      draft.edges.push(edge);
      changed(draft, ["edges", draft.edges.length - 1]);
      $("graph-mode").value = "all";
      switchView("graph");
      tell("Relazione aggiunta alla bozza.");
    };
  });
}
const evidenceLabels = {
  verified: "Verificato sui casi", mismatch: "Divergenza", unproven: "Da verificare",
  withdrawal_verified: "Ritiro verificato", allow: "Consenti", hold: "Sospendi",
  out_of_scope: "Fuori ambito", unobservable: "Irraggiungibile", inactive: "Inattivo",
};
async function showDemo() {
  const root = $("evidence-result");
  root.replaceChildren(el("p", "Caricamento della simulazione…", {role: "status"}));
  try {
    evidence ||= await call("./api/demo");
    const rows = el("div", null, {class: "item-list"});
    const phases = [
      ["baseline", "Baseline"], ["drift", "Nuova regola"], ["unreachable", "Ritiro richiesto"],
      ["withdrawn", "Ritiro verificato"], ["restored", "Ripristino"],
    ];
    for (const [key, title] of phases) {
      const section = el("details", null, key === "drift" ? {open: ""} : {});
      section.append(el("summary", title));
      for (const application of evidence[key].applications) {
        const row = el("div", null, {class: "diff-row"});
        row.append(el("strong", application.application.toUpperCase()),
          el("span", evidenceLabels[application.state] || application.state, {class: "state-badge", "data-state": application.state}));
        for (const probe of application.probes) {
          const observation = probe.observation?.actual_outcome;
          row.append(el("p", `${probe.probe} · atteso ${evidenceLabels[probe.expected] || probe.expected} · osservato ${evidenceLabels[observation] || observation || "in attesa"}`));
        }
        section.append(row);
      }
      rows.append(section);
    }
    root.replaceChildren(el("p", "Aurora 21 · CRM e PMS simulati. Le modifiche alla tua bozza non alimentano questo report."),
      rows, el("a", "Apri il report offline", {href: "./evidence-report", target: "_blank", rel: "noopener"}));
  } catch (error) {
    root.replaceChildren(el("p", error.message, {role: "status"}));
  }
}

function renderBridge() {
  const container = $("bridge-panel");
  if (!container) return;
  const legacy = safeLoad("ontograph-process-draft")?.model;
  const processes = Array.isArray(legacy?.processes) ? legacy.processes : [];
  if (!processes.length) {
    container.hidden = true;
    return;
  }
  container.hidden = false;
  const form = el("form", null, {class: "form-stack"});
  const control = selectInput("control", model.nodes.filter(node => node.kind === "control")
    .map(node => [node.id, node.label || node.id]));
  const process = selectInput("process", processes.map((item, index) => [String(index), item.name || item.id]));
  const feedback = el("p", "", {role: "status"});
  form.append(field("Processo dal modellatore", process), field("Controllo da collegare", control),
    el("button", "Collega come nodo alla bozza", {type: "submit", class: "button"}), feedback);
  container.replaceChildren(el("h3", "Dal modellatore al grafo semantico"),
    el("p", "Collega esplicitamente un processo a un controllo. I dettagli operativi restano nel Modellatore processi."), form);
  form.addEventListener("submit", event => {
    event.preventDefault();
    try {
      canChange();
      const item = processes[Number(process.value)];
      const target = control.value;
      if (!item || !model.nodes.some(node => node.id === target && node.kind === "control")) {
        throw new Error("Seleziona un processo e un controllo.");
      }
      const slug = String(item.id).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug) throw new Error("Il processo deve avere un identificativo.");
      const id = "process-" + slug.slice(0, 55);
      const draft = clone(model);
      let index = draft.nodes.findIndex(node => node.id === id);
      if (index !== -1 && draft.nodes[index].kind !== "process") throw new Error("ID già usato da un altro tipo di nodo.");
      if (index === -1) {
        index = draft.nodes.length;
        draft.nodes.push({id, kind: "process", label: String(item.name || item.id).slice(0, 500),
          definition: `Processo ${item.id} del Modellatore processi. ${item.subprocesses?.length || 0} attività censite.`,
          owner: String(item.owner || model.owner || "Da assegnare").slice(0, 500)});
      }
      if (draft.edges.some(edge => edge.source === id && edge.predicate === "dependsOn" && edge.target === target)) {
        feedback.textContent = "Il collegamento è già presente.";
        return;
      }
      draft.edges.push({source: id, predicate: "dependsOn", target});
      changed(draft, ["nodes", index]);
      tell("Processo collegato al controllo nella bozza semantica.", "ok");
      switchView("graph");
    } catch (error) {
      feedback.textContent = error.message;
    }
  });
}

function renderRegistry() {
  if (!capabilities.registry) return;
  const root = $("registry-panel");
  root.hidden = false;
  const form = el("form", null, {class: "form-stack"});
  const token = el("input", null, {type: "password", autocomplete: "off", required: "", name: "token"});
  const action = selectInput("action", [
    ["status", "Stato attivazione"], ["propose", "Prepara candidata"], ["review", "Registra voto"],
    ["publish", "Pubblica candidata"], ["withdraw", "Avvia ritiro"], ["export", "Esporta candidata"], ["events", "Audit"],
  ]);
  const parameters = el("div", null, {class: "form-stack"});
  const result = el("pre", "", {tabindex: "0", role: "status"});
  let knownHead = 0;
  let knownRelease = "";
  const send = el("button", "Esegui operazione", {type: "submit", class: "button"});
  form.append(field("Token del tuo ruolo", token), field("Operazione", action), parameters, send);
  root.replaceChildren(el("h3", "Registro locale"),
    el("p", "Il token resta in questa pagina. Le operazioni rispettano i ruoli e il quorum del registro."), form, result);
  const param = (key, label, attributes = {}) => {
    const input = el("input", null, {name: key, required: "", ...attributes});
    parameters.append(field(label, input));
  };
  function renderParameters() {
    parameters.replaceChildren();
    if (["review", "publish", "export"].includes(action.value)) {
      param("release_id", "Digest candidata", {value: knownRelease, pattern: "[0-9a-f]{64}"});
    }
    if (action.value === "propose") {
      param("base", "Attivazione di base", {type: "number", min: "0", value: String(knownHead)});
      param("reviewers", "ID revisori, separati da virgola");
      param("quorum", "Quorum", {type: "number", min: "1", value: "1"});
    }
    if (action.value === "review") parameters.append(field("Voto", selectInput("choice", [
      ["approve", "Approva"], ["object", "Obiezione"],
    ])));
    if (["publish", "withdraw"].includes(action.value)) param("expected_head", "Attivazione corrente attesa",
      {type: "number", min: "0", value: String(knownHead)});
    if (["propose", "withdraw"].includes(action.value)) param("reason", "Motivazione");
    if (action.value === "review") param("rationale", "Motivazione del voto");
  }
  action.addEventListener("change", renderParameters);
  renderParameters();
  form.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      send.disabled = true;
      const {token: secret, action: key, ...args} = Object.fromEntries(new FormData(form));
      if (key === "propose") {
        canChange();
        args.payload = model;
        args.reviewers = args.reviewers.split(",").map(value => value.trim()).filter(Boolean);
      }
      for (const number of ["base", "quorum", "expected_head"]) if (number in args) args[number] = Number(args[number]);
      const response = (await call("./api/registry", {action: key, arguments: args}, {
        headers: {Authorization: "Bearer " + secret},
      })).result;
      result.textContent = show(response) ?? "Operazione registrata.";
      if (key === "propose") knownRelease = response;
      if (key === "status") knownHead = response.activation;
      if (key === "publish") knownHead = response;
      if (key === "export") download(show(response), "ontograph-candidate.json");
    } catch (error) {
      result.textContent = error.message;
    } finally {
      send.disabled = false;
    }
  });
}

function synchronizeZoom() {
  $("graph-zoom").textContent = `${Math.round(graph.zoomValue * 100)}%`;
}
function action(id, task) {
  $(id).addEventListener("click", async () => {
    try {
      if (model) await task();
    } catch (error) {
      tell(error.message, "error");
    }
  });
}
action("validate", validateCurrent);
action("save-version", saveVersion);
action("undo", () => undoRedo(false));
action("redo", () => undoRedo(true));
action("apply-code", applyCode);
action("discard-code", () => {
  sourceDirty = false;
  render();
  tell("Sorgente ripristinata dalla bozza visuale.");
});
action("export-button", exportFile);
action("demo-button", () => switchView("evidence"));
action("add-object", createObject);
action("add-relation", createRelation);
action("graph-fit", () => { graph.fit(); synchronizeZoom(); });
action("graph-reset", () => { graph.reset(); synchronizeZoom(); });
action("graph-zoom-in", () => { graph.zoom(1.2); synchronizeZoom(); });
action("graph-zoom-out", () => { graph.zoom(1 / 1.2); synchronizeZoom(); });
$("graph-mode").addEventListener("change", render);
$("search").addEventListener("input", () => { if (model) renderNavigator(); });
$("kind-filter").addEventListener("change", () => { if (model) renderNavigator(); });
$("compare-base").addEventListener("change", () => { compareIndex = $("compare-base").value; void validateCurrent(); });
$("view-select").addEventListener("click", event => {
  const pressed = event.target.closest("button[data-view]");
  if (model && pressed) switchView(pressed.dataset.view);
});
$("import-input").addEventListener("change", async event => {
  const file = event.target.files[0];
  event.target.value = "";
  try {
    if (model) await importFile(file);
  } catch (error) {
    tell(error.message, "error");
  }
});
$("code-editor").addEventListener("input", () => {
  sourceDirty = model !== undefined && $("code-editor").value !== show(model);
  $("apply-code").disabled = !sourceDirty;
  $("discard-code").disabled = !sourceDirty;
  $("undo").disabled = !past.length || sourceDirty;
  $("redo").disabled = !future.length || sourceDirty;
  if (sourceDirty) tell("JSON modificato. Applica per sincronizzarlo con il grafo.", "warn");
});
window.addEventListener("beforeunload", event => {
  if (sourceDirty) event.preventDefault();
});
window.addEventListener("keydown", event => {
  if ((!event.metaKey && !event.ctrlKey) || event.key.toLowerCase() !== "z"
      || event.target.closest("input,textarea,select,[contenteditable='true']")) return;
  event.preventDefault();
  undoRedo(event.shiftKey);
});

call("./api/bootstrap").then(boot => {
  bind(boot);
  if (new URLSearchParams(location.search).get("from") === "processi") switchView("studio");
}).catch(error => tell(error.message, "error"));
