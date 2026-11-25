const KINDS = {
  concept: "Concetto", class: "Classe", field: "Campo", process: "Processo",
  control: "Controllo", contract: "Contratto", application: "Applicazione"
};
const COLLECTIONS = {
  nodes: "Nodo", edges: "Relazione", evidence: "Evidenza", rules: "Regola", probes: "Prova"
};
const PROPERTY_NAMES = {
  domain: "Dominio", purpose: "Finalità", owner: "Responsabile", scope: "Ambito",
  effective_at: "Decorrenza", nodes: "Nodi", edges: "Relazioni", evidence: "Evidenza",
  rules: "Regole", probes: "Prove", label: "Etichetta", definition: "Definizione", kind: "Tipo",
  aliases: "Sinonimi", source: "Origine", target: "Destinazione", predicate: "Predicato",
  observed_at: "Osservata il", applicability: "Applicabilità", status: "Stato",
  excerpt: "Estratto", upstream: "Fonte a monte", control: "Controllo",
  applies: "Ambito della regola", requires: "Condizioni richieste",
  application: "Applicazione", rule: "Regola", facts: "Fatti", expected: "Esito atteso"
};
const VALUE_TYPES = {
  string: "Testo", boolean: "Booleano", number: "Numero", null: "Null",
  array: "Lista", object: "Oggetto", undefined: "Assente"
};
const REFERENCES = {
  source: "nodes", target: "nodes", control: "nodes", application: "nodes",
  rule: "rules", evidence: "evidence"
};
const FACT_GROUPS = new Set(["applies", "requires", "facts"]);
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const stateByContainer = new WeakMap();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(className, text) {
  const node = element("button", className, text);
  node.type = "button";
  return node;
}

function pointer(path) {
  return path.map(segment => `/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`).join("");
}

function read(model, path) {
  return path.reduce((value, segment) => {
    return value && typeof value === "object" && Object.hasOwn(value, segment) ? value[segment] : undefined;
  }, model);
}

function nameFor(path) {
  const key = path.at(-1);
  if (typeof key === "number") return `[${key}]`;
  return Object.hasOwn(PROPERTY_NAMES, key) ? PROPERTY_NAMES[key] : key;
}

function valueType(value) {
  if (value === null) return "null";
  return Array.isArray(value) ? "array" : typeof value;
}

function referenceIndex(model) {
  const index = new Map();
  for (const collection of ["nodes", "evidence", "rules", "probes"]) {
    if (!Array.isArray(model?.[collection])) continue;
    model[collection].forEach((record, i) => {
      if (typeof record?.id !== "string") return;
      const key = JSON.stringify([collection, record.id]);
      if (!index.has(key)) index.set(key, { path: [collection, i], label: record.label || record.id });
    });
  }
  return index;
}

function referenceFor(index, path, value) {
  const key = path.at(-1);
  const typed = Object.hasOwn(REFERENCES, key) ? REFERENCES[key] : null;
  if (typed && typeof value === "string") return index.get(JSON.stringify([typed, value]));
  const group = path.at(-2);
  if (!FACT_GROUPS.has(group)) return undefined;
  return index.get(JSON.stringify(["nodes", key])) ?? index.get(JSON.stringify(["nodes", value]));
}

function safeJson(value) {
  return JSON.parse(value, (key, entry) => {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`La chiave "${key}" è riservata.`);
    if (typeof entry === "number" && !Number.isFinite(entry)) throw new Error("Il numero deve essere finito.");
    return entry;
  });
}

export function renderInspector(container, { document: model, path = [], onSelect, onUpdate, onDelete }) {
  const selection = path.slice();
  const selectedPointer = pointer(selection);
  const current = read(model, selection);
  const index = referenceIndex(model);
  const editable = typeof onUpdate === "function";
  const deletable = typeof onDelete === "function";
  const openPointers = stateByContainer.get(container) ?? new Map();
  stateByContainer.set(container, openPointers);

  const heading = element("header", "inspector-heading");
  const recordTitle = current?.label || current?.id;
  const title = typeof recordTitle === "string" ? recordTitle
    : selection.length ? nameFor(selection) : model?.domain || "Documento";
  const kind = Object.hasOwn(KINDS, current?.kind) ? KINDS[current.kind]
    : Object.hasOwn(COLLECTIONS, selection[0]) ? COLLECTIONS[selection[0]] : "Modello";
  heading.append(element("p", "inspector-kind", kind), element("h2", "", title));
  if (typeof current?.id === "string" && current.id !== title) {
    heading.append(element("p", "inspector-id", current.id));
  }
  const address = element("code", "inspector-pointer", selectedPointer || '""');
  address.title = selectedPointer ? "Puntatore JSON" : "Puntatore JSON vuoto della radice";
  heading.append(address);
  const error = element("p", "inspector-error");
  error.role = "alert";
  error.hidden = true;
  const tree = element("div", "inspector-tree");

  function showError(problem) {
    error.textContent = problem instanceof Error ? problem.message : String(problem);
    error.hidden = false;
  }

  async function action(callback) {
    error.hidden = true;
    try {
      const result = await callback();
      if (typeof result === "string" && result) {
        showError(result);
        return false;
      }
      return true;
    } catch (problem) {
      showError(problem);
      return false;
    }
  }

  function addButtonRow(pathToValue, value, group) {
    const itemActions = element("div", "inspector-actions");
    const reference = referenceFor(index, pathToValue, value);
    if (reference && reference.path.some((segment, i) => segment !== selection[i]) && typeof onSelect === "function") {
      const link = button("inspector-ref", `Apri ${reference.label} ↗`);
      link.title = pointer(reference.path);
      link.addEventListener("click", () => onSelect(reference.path));
      itemActions.append(link);
    }
    if (group && editable && pathToValue.length && !pathToValue.some(segment => FORBIDDEN_KEYS.has(segment))) {
      itemActions.append(jsonEditor(pathToValue, value, { replace: true }));
    }
    if (deletable && pathToValue.length && !pathToValue.some(segment => FORBIDDEN_KEYS.has(segment))) {
      const remove = button("inspector-remove", "Rimuovi");
      remove.title = `Rimuovi ${pointer(pathToValue)}`;
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        await action(() => onDelete(pathToValue));
        remove.disabled = false;
      });
      itemActions.append(remove);
    }
    return itemActions;
  }

  function renderLeaf(pathToValue, value) {
    const row = element("div", "inspector-field");
    row.dataset.path = pointer(pathToValue);
    const label = element("label", "inspector-label");
    label.append(element("span", "", nameFor(pathToValue) ?? "Valore"));
    label.title = row.dataset.path;
    const type = valueType(value);
    const canEdit = editable && !pathToValue.some(segment => FORBIDDEN_KEYS.has(segment));
    let input;
    if (type === "boolean") {
      input = element("select", "inspector-input");
      for (const choice of ["true", "false"]) {
        const option = element("option", "", choice);
        option.value = choice;
        input.append(option);
      }
      input.value = String(value);
      input.disabled = !canEdit;
    } else {
      const multiline = type === "string" && (/\n/.test(value) || value.length > 75
        || ["excerpt", "definition", "applicability", "purpose", "scope"].includes(pathToValue.at(-1)));
      input = element(multiline ? "textarea" : "input", "inspector-input");
      if (multiline) input.rows = 3;
      else input.type = type === "number" ? "number" : "text";
      if (type === "number") input.step = "any";
      input.value = type === "undefined" ? "" : String(value);
      input.readOnly = !canEdit;
    }
    input.setAttribute("aria-label", nameFor(pathToValue) || "Valore");
    if (canEdit) {
      input.addEventListener("change", async () => {
        const currentValue = input.value;
        await action(() => {
          if (type === "number" && (currentValue === "" || !Number.isFinite(Number(currentValue)))) {
            throw new Error("Inserisci un numero finito.");
          }
          const next = type === "boolean" ? currentValue === "true"
            : type === "number" ? Number(currentValue)
              : type === "null" ? safeJson(currentValue) : currentValue;
          if (Object.is(next, value)) return undefined;
          return onUpdate(pathToValue, next);
        });
      });
    }
    label.append(input);
    row.append(label);
    const actions = addButtonRow(pathToValue, value, false);
    if (canEdit && pathToValue.length) actions.prepend(jsonEditor(pathToValue, value, { replace: true }));
    if (actions.childElementCount) row.append(actions);
    return row;
  }

  function jsonEditor(parentPath, value, { replace = false } = {}) {
    const wrapper = element("details", "inspector-add");
    const isArray = Array.isArray(value);
    const summaryText = replace ? "Modifica come JSON" : isArray ? "Aggiungi elemento" : "Aggiungi proprietà";
    const form = element("form", "inspector-add-form");
    let keyInput;
    if (!replace && !isArray) {
      const keyLabel = element("label", "inspector-label", "Chiave");
      keyInput = element("input", "inspector-input");
      keyInput.type = "text";
      keyLabel.append(keyInput);
      form.append(keyLabel);
    }
    const valueLabel = element("label", "inspector-label", "Valore JSON");
    const input = element("textarea", "inspector-input");
    input.rows = 2;
    input.required = true;
    input.spellcheck = false;
    input.placeholder = 'Esempi: "testo", 12, true, [], {}';
    if (replace && !["object", "array"].includes(valueType(value))) input.value = JSON.stringify(value) ?? "null";
    if (replace && input.value === "") {
      wrapper.addEventListener("toggle", () => {
        if (wrapper.open && !input.value) input.value = JSON.stringify(value, null, 2);
      });
    }
    valueLabel.append(input);
    const submit = element("button", "inspector-submit", replace ? "Salva valore" : "Aggiungi");
    submit.type = "submit";
    form.append(valueLabel, submit);
    form.addEventListener("submit", async event => {
      event.preventDefault();
      submit.disabled = true;
      const saved = await action(() => {
        if (replace) return onUpdate(parentPath, safeJson(input.value));
        const property = isArray ? value.length : keyInput.value;
        if (typeof property === "string" && FORBIDDEN_KEYS.has(property)) {
          throw new Error(`La chiave "${property}" è riservata.`);
        }
        if (!isArray && Object.hasOwn(value, property)) throw new Error("La chiave è già presente.");
        return onUpdate([...parentPath, property], safeJson(input.value));
      });
      submit.disabled = false;
      if (saved) wrapper.open = false;
    });
    wrapper.append(element("summary", "", summaryText), form);
    return wrapper;
  }

  function renderChildren(host, pathToValue, value) {
    const entries = Object.entries(value);
    for (const [key, item] of entries) {
      const property = Array.isArray(value) ? Number(key) : key;
      host.append(renderBranch([...pathToValue, property], item));
    }
    if (entries.length === 0) host.append(element("p", "inspector-empty", "Nessuna proprietà"));
    if (editable && !pathToValue.some(segment => FORBIDDEN_KEYS.has(segment))) {
      host.append(jsonEditor(pathToValue, value));
    }
  }

  function renderBranch(pathToValue, value) {
    const type = valueType(value);
    if (type !== "object" && type !== "array") return renderLeaf(pathToValue, value);
    const group = element("details", "inspector-group");
    const address = pointer(pathToValue);
    const count = Object.keys(value).length;
    const summary = element("summary", "inspector-summary");
    const recordLabel = typeof value?.id === "string" ? value.label || value.id : null;
    summary.append(element("span", "", recordLabel || nameFor(pathToValue) || "Valore"));
    summary.append(element("span", "inspector-count", `${VALUE_TYPES[type]} · ${count}`));
    summary.title = address;
    const children = element("div", "inspector-children");
    let populated = false;
    function populate() {
      if (populated) return;
      populated = true;
      renderChildren(children, pathToValue, value);
      const actions = addButtonRow(pathToValue, value, true);
      if (actions.childElementCount) children.append(actions);
    }
    group.dataset.path = address;
    group.open = openPointers.get(address) ?? (pathToValue.length === selection.length + 1 && count < 6);
    if (group.open) populate();
    group.addEventListener("toggle", () => {
      openPointers.set(address, group.open);
      if (group.open) populate();
    });
    group.append(summary, children);
    return group;
  }

  if (current === undefined) {
    tree.append(element("p", "inspector-empty", "L’elemento selezionato non è disponibile."));
  } else if (["array", "object"].includes(valueType(current))) {
    renderChildren(tree, selection, current);
    if (selection.length) {
      const actions = addButtonRow(selection, current, true);
      if (actions.childElementCount) tree.append(actions);
    }
  } else {
    tree.append(renderLeaf(selection, current));
  }
  container.replaceChildren(heading, error, tree);
}
