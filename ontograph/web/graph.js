const SVG = "http://www.w3.org/2000/svg";
const NODE_WIDTH = 164;
const NODE_HEIGHT = 54;
const ROW_HEIGHT = 72;
const COLUMN_WIDTH = 192;
const PADDING = 22;
let graphCount = 0;

const KINDS = {
  concept: ["Concetto", "#b6a0ed", "C"],
  class: ["Classe", "#a3b7ff", "O"],
  field: ["Campo", "#87c9ed", "F"],
  process: ["Processo", "#9db0c9", "P"],
  control: ["Controllo", "#68e0cb", "✓"],
  contract: ["Contratto", "#9bbdff", "↔"],
  application: ["Applicazione", "#a7d7ac", "A"],
  evidence: ["Evidenza", "#f2c47c", "E"],
  rule: ["Regola", "#83d3c7", "R"],
  probe: ["Prova", "#bfd3a0", "T"]
};
const KIND_ORDER = Object.keys(KINDS);

const RELATIONS = {
  broader: "più generale",
  subClassOf: "sottoclasse di",
  mapsTo: "mappa su",
  dependsOn: "dipende da",
  implements: "attua",
  consumes: "consuma"
};

const STAGES = [
  "Fonti e oggetti", "Regole", "Controlli", "Contratti", "Applicazioni"
];

const STAGE_FOR_KIND = {
  rule: 1, control: 2, contract: 3, application: 4, probe: 4
};

function svgElement(tag, attrs = {}, text) {
  const element = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

function pathKey(path) {
  return JSON.stringify(path);
}

function modelGraph(model) {
  const nodes = new Map();
  const byCollection = new Map();
  const edges = [];
  const putNode = (collection, node, index, kind) => {
    if (!node || typeof node !== "object") return;
    const path = [collection, index];
    const key = pathKey(path);
    const id = typeof node.id === "string" ? node.id : `[${index}]`;
    const label = typeof node.label === "string" ? node.label : id;
    nodes.set(key, { id, key, path, kind, label });
    const identity = pathKey([collection, id]);
    if (!byCollection.has(identity)) byCollection.set(identity, key);
  };
  const lookup = (collection, id) => byCollection.get(pathKey([collection, id]));
  const link = (source, target, label, path, virtual = false) => {
    if (source && target && source !== target) edges.push({ source, target, label, path, virtual });
  };
  for (const [collection, kind] of Object.entries({
    nodes: null, evidence: "evidence", rules: "rule", probes: "probe"
  })) {
    const records = Array.isArray(model?.[collection]) ? model[collection] : [];
    records.forEach((record, index) => {
      const recordKind = Object.hasOwn(KINDS, record?.kind) ? record.kind : "concept";
      putNode(collection, record, index, kind ?? recordKind);
    });
  }
  if (Array.isArray(model?.edges)) {
    model.edges.forEach((edge, index) => {
      if (!edge || typeof edge !== "object") return;
      const label = Object.hasOwn(RELATIONS, edge.predicate) ? RELATIONS[edge.predicate] : "relazione";
      link(lookup("nodes", edge.source), lookup("nodes", edge.target), label, ["edges", index]);
    });
  }
  if (Array.isArray(model?.rules)) {
    model.rules.forEach((rule, index) => {
      const key = pathKey(["rules", index]);
      if (!nodes.has(key)) return;
      link(key, lookup("nodes", rule.control), "regola di", ["rules", index, "control"], true);
      link(key, lookup("evidence", rule.evidence), "fonte", ["rules", index, "evidence"], true);
      for (const [group, label] of [["applies", "ambito"], ["requires", "richiede"]]) {
        for (const field of Object.keys(rule[group] ?? {})) {
          link(key, lookup("nodes", field), label, ["rules", index, group, field], true);
        }
      }
    });
  }
  if (Array.isArray(model?.probes)) {
    model.probes.forEach((probe, index) => {
      const key = pathKey(["probes", index]);
      if (!nodes.has(key)) return;
      link(key, lookup("nodes", probe.application), "verifica", ["probes", index, "application"], true);
      link(key, lookup("rules", probe.rule), "prova la regola", ["probes", index, "rule"], true);
    });
  }
  return { nodes, edges };
}

function focusGraph(graph, selection, previousKey) {
  const { nodes, edges } = graph;
  const selectedNode = nodes.get(pathKey(selection.slice(0, 2)));
  const selectedEdge = edges.find(edge => pathKey(edge.path) === pathKey(selection));
  const candidates = [selectedNode, nodes.get(selectedEdge?.source), nodes.get(selectedEdge?.target)];
  const nearest = edges.find(edge => edge.source === selectedNode?.key && nodes.get(edge.target)?.kind === "control");
  const anchor = candidates.find(node => node?.kind === "control")
    ?? nodes.get(nearest?.target)
    ?? nodes.get(previousKey)
    ?? [...nodes.values()].find(node => node.kind === "control");
  if (!anchor) return { ...graph, anchor: null };

  const included = new Set([anchor.key]);
  const rules = new Set();
  const contracts = new Set();
  for (const edge of edges) {
    if (edge.source !== anchor.key && edge.target !== anchor.key) continue;
    const neighbor = edge.source === anchor.key ? edge.target : edge.source;
    const kind = nodes.get(neighbor)?.kind;
    included.add(neighbor);
    if (kind === "rule") rules.add(neighbor);
    if (kind === "contract") contracts.add(neighbor);
  }
  for (const edge of edges) {
    if (rules.has(edge.source)) included.add(edge.target);
    if (contracts.has(edge.target) && nodes.get(edge.source)?.kind === "application") included.add(edge.source);
  }
  if (selectedNode && !included.has(selectedNode.key)) {
    included.add(selectedNode.key);
    for (const edge of edges) {
      if (edge.source === selectedNode.key) included.add(edge.target);
      if (edge.target === selectedNode.key) included.add(edge.source);
    }
  }
  if (selectedEdge) {
    included.add(selectedEdge.source);
    included.add(selectedEdge.target);
  }
  return {
    anchor: anchor.key,
    nodes: new Map([...nodes].filter(([key]) => included.has(key))),
    edges: edges.filter(edge => included.has(edge.source) && included.has(edge.target))
  };
}

function arrange(nodes) {
  const stages = STAGES.map(() => []);
  for (const node of nodes.values()) stages[STAGE_FOR_KIND[node.kind] ?? 0].push(node);
  const height = Math.max(334, 68 + Math.max(...stages.map(stage => stage.length)) * ROW_HEIGHT);
  const width = PADDING * 2 + (stages.length - 1) * COLUMN_WIDTH + NODE_WIDTH;
  const positions = new Map();
  stages.forEach((stage, column) => {
    stage.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
    const available = height - 68;
    const stack = stage.length * ROW_HEIGHT;
    const top = 56 + (available - stack) / 2;
    stage.forEach((node, row) => positions.set(node.key, {
      x: PADDING + column * COLUMN_WIDTH, y: top + row * ROW_HEIGHT
    }));
  });
  return { height, width, positions, stages };
}

function edgeGeometry(left, right, index) {
  const fromY = left.y + NODE_HEIGHT / 2;
  const toY = right.y + NODE_HEIGHT / 2;
  if (left.x === right.x) {
    const x = left.x + NODE_WIDTH;
    const bend = x + 25 + (index % 3) * 4;
    return {
      line: `M ${x} ${fromY} C ${bend} ${fromY}, ${bend} ${toY}, ${x + 4} ${toY}`,
      x: bend - 4, y: (fromY + toY) / 2 - 6
    };
  }
  const forward = left.x < right.x;
  const fromX = forward ? left.x + NODE_WIDTH : left.x;
  const toX = forward ? right.x - 4 : right.x + NODE_WIDTH + 4;
  const middle = (fromX + toX) / 2;
  return {
    line: `M ${fromX} ${fromY} C ${middle} ${fromY}, ${middle} ${toY}, ${toX} ${toY}`,
    x: middle, y: (fromY + toY) / 2 - 7
  };
}

function shorten(value, max) {
  const letters = Array.from(value);
  return letters.length > max ? `${letters.slice(0, max - 1).join("")}…` : value;
}

function labelLines(value) {
  const normalized = value.trim().replace(/\s+/g, " ");
  const letters = Array.from(normalized);
  if (letters.length <= 19) return [normalized];
  const first = letters.slice(0, 19).join("");
  const breakAt = first.lastIndexOf(" ");
  if (breakAt <= 0) return [shorten(normalized, 19)];
  return [first.slice(0, breakAt), shorten(normalized.slice(breakAt + 1), 19)];
}

function interactive(group, path, label, onSelect) {
  group.setAttribute("data-graph-path", pathKey(path));
  group.setAttribute("tabindex", "0");
  group.setAttribute("role", "button");
  group.setAttribute("aria-label", label);
  group.append(svgElement("title", {}, label));
  group.addEventListener("click", () => onSelect(path));
  group.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect(path);
  });
}

function applySelection(svg, selection) {
  const encoded = pathKey(selection);
  const nodePath = pathKey(selection.slice(0, 2));
  svg.querySelectorAll("[data-graph-path]").forEach(element => {
    const active = element.dataset.graphPath === encoded
      || (element.classList.contains("og-node") && element.dataset.graphPath === nodePath);
    element.setAttribute("aria-pressed", active);
  });
}

const STYLE = `
  .og-graph text { font-family: system-ui, -apple-system, sans-serif; }
  .og-stage { font-weight: 650; font-size: 11px; fill: #a1b0c6; letter-spacing: .045em; }
  .og-stage-line { stroke: #29354a; }
  .og-edge { cursor: pointer; }
  .og-edge path { fill: none; stroke: #6c819b; stroke-width: 1.5px; }
  .og-edge .og-edge-hit { stroke: transparent; stroke-width: 15px; }
  .og-edge.og-reference .og-edge-line { stroke-dasharray: 4 4; }
  .og-edge text { font-size: 9px; font-weight: 600; fill: #b3c5dc; opacity: 0; paint-order: stroke; stroke: #101927; stroke-width: 3.5px; stroke-linejoin: round; pointer-events: none; }
  .og-edge.og-primary text, .og-edge[aria-pressed="true"] text, .og-edge:hover text, .og-edge:focus-visible text { opacity: 1; }
  .og-edge[aria-pressed="true"] .og-edge-line, .og-edge:hover .og-edge-line, .og-edge:focus-visible .og-edge-line { stroke: #80ead3; stroke-width: 2.2px; }
  .og-node { cursor: pointer; }
  .og-node-card { fill: #172235; stroke: #3a4b64; stroke-width: 1px; }
  .og-node[aria-pressed="true"] .og-node-card, .og-node:hover .og-node-card, .og-node:focus-visible .og-node-card { fill: #203348; stroke: var(--node-color); stroke-width: 1.7px; }
  .og-node.og-anchor .og-node-card { fill: #183336; stroke: #57b6ab; }
  .og-node-kind { fill: var(--node-color); font-size: 9.5px; font-weight: 650; letter-spacing: .03em; }
  .og-node-icon-background { fill: var(--node-color); fill-opacity: .15; }
  .og-node-icon { fill: var(--node-color); font-size: 12px; font-weight: 700; }
  .og-node-label { fill: #f0f5fc; font-size: 11.7px; font-weight: 650; }
  .og-node:focus-visible, .og-edge:focus-visible { outline: none; }
  .og-empty { fill: #a1b0c6; font-size: 15px; }
`;

function drawGraph(graph, layout, id, focus, onSelect) {
  const { width, height, positions, stages } = layout;
  const svg = svgElement("svg", {
    viewBox: `0 0 ${width} ${height}`, width, height, role: "group",
    "aria-label": "Grafo delle dipendenze", class: "og-graph"
  });
  svg.style.display = "block";
  svg.append(svgElement("style", {}, STYLE));
  const defs = svgElement("defs");
  const arrowId = `og-arrow-${id}`;
  const arrow = svgElement("marker", {
    id: arrowId, viewBox: "0 0 6 6", refX: "5.5", refY: "3",
    markerWidth: "5", markerHeight: "5", orient: "auto"
  });
  arrow.append(svgElement("path", { d: "M 0 0 L 6 3 L 0 6 Z", fill: "#9bb1cc" }));
  defs.append(arrow);
  svg.append(defs);
  if (graph.nodes.size === 0) {
    svg.append(svgElement("text", { class: "og-empty", x: PADDING, y: 68 }, "Nessun elemento da mostrare"));
    return svg;
  }

  stages.forEach((stage, column) => {
    if (!stage.length) return;
    const x = PADDING + column * COLUMN_WIDTH;
    const name = column === 4 && stage.some(node => node.kind === "probe") ? "Applicazioni e prove" : STAGES[column];
    svg.append(
      svgElement("text", { class: "og-stage", x, y: 32 }, name),
      svgElement("line", { class: "og-stage-line", x1: x, y1: 42, x2: x + NODE_WIDTH, y2: 42 })
    );
  });
  const edgeLayer = svgElement("g");
  graph.edges.forEach((edge, index) => {
    const left = graph.nodes.get(edge.source);
    const right = graph.nodes.get(edge.target);
    const pos = edgeGeometry(positions.get(edge.source), positions.get(edge.target), index);
    const primary = focus && ["attua", "consuma", "regola di"].includes(edge.label);
    const classes = ["og-edge", edge.virtual && "og-reference", primary && "og-primary"].filter(Boolean);
    const group = svgElement("g", { class: classes.join(" ") });
    interactive(group, edge.path, `${left.label} · ${edge.label} · ${right.label}`, onSelect);
    group.append(
      svgElement("path", { class: "og-edge-line", d: pos.line, "marker-end": `url(#${arrowId})` }),
      svgElement("path", { class: "og-edge-hit", d: pos.line }),
      svgElement("text", { x: pos.x, y: pos.y, "text-anchor": "middle" }, edge.label)
    );
    edgeLayer.append(group);
  });
  svg.append(edgeLayer);
  const nodeLayer = svgElement("g");
  for (const node of graph.nodes.values()) {
    const { x, y } = positions.get(node.key);
    const [kind, color, icon] = KINDS[node.kind];
    const group = svgElement("g", {
      class: node.key === graph.anchor ? "og-node og-anchor" : "og-node",
      transform: `translate(${x} ${y})`, "data-kind": node.kind
    });
    group.style.setProperty("--node-color", color);
    interactive(group, node.path, `${kind} · ${node.label}`, onSelect);
    const lines = labelLines(node.label);
    group.append(
      svgElement("rect", { class: "og-node-card", x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT, rx: 7 }),
      svgElement("rect", { class: "og-node-icon-background", x: 10, y: 13, width: 23, height: 23, rx: 5 }),
      svgElement("text", { class: "og-node-icon", x: 21.5, y: 29, "text-anchor": "middle" }, icon),
      svgElement("text", { class: "og-node-kind", x: 40, y: lines.length === 1 ? 20 : 16 }, kind),
      ...lines.map((line, i) => svgElement(
        "text", { class: "og-node-label", x: 40, y: lines.length === 1 ? 37 : 30 + i * 14 }, line
      ))
    );
    nodeLayer.append(group);
  }
  svg.append(nodeLayer);
  return svg;
}

export function createGraph(container, onSelect) {
  const id = ++graphCount;
  let svg;
  let layout;
  let currentMode;
  let anchorKey;
  let drawnSignature;
  let scale = 1;
  let autoWidth = true;
  let fittedWidth = 0;
  let drag;

  if (!container.hasAttribute("tabindex")) container.tabIndex = 0;

  function setScale(value, preserveCenter = true) {
    if (!svg) return;
    const next = Math.min(2.5, Math.max(0.18, value));
    const viewportX = container.clientWidth / 2;
    const viewportY = container.clientHeight / 2;
    const canvasX = (container.scrollLeft + viewportX) / scale;
    const canvasY = (container.scrollTop + viewportY) / scale;
    scale = next;
    svg.setAttribute("width", Math.round(layout.width * scale));
    svg.setAttribute("height", Math.round(layout.height * scale));
    if (preserveCenter) {
      container.scrollLeft = canvasX * scale - viewportX;
      container.scrollTop = canvasY * scale - viewportY;
    }
  }

  function fitWidth(center = false) {
    const width = container.clientWidth;
    if (!svg || width <= 0) return;
    const narrow = width < 540;
    setScale(Math.min(1, Math.max(narrow ? 0.77 : 0.68, width / layout.width)), false);
    if (currentMode === "focus" && narrow && (center || width !== fittedWidth)) {
      const anchor = layout.positions.get(anchorKey);
      if (anchor) container.scrollLeft = (anchor.x + NODE_WIDTH / 2) * scale - width / 2;
    }
    fittedWidth = width;
  }

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => {
      if (autoWidth) fitWidth();
    });
    observer.observe(container);
  }

  container.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch" || event.button !== 0 || event.target.closest("[data-graph-path]")) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY,
      left: container.scrollLeft, top: container.scrollTop };
    container.setPointerCapture(event.pointerId);
    container.classList.add("is-panning");
  });
  container.addEventListener("pointermove", event => {
    if (drag?.id !== event.pointerId) return;
    container.scrollLeft = drag.left - event.clientX + drag.x;
    container.scrollTop = drag.top - event.clientY + drag.y;
  });
  container.addEventListener("lostpointercapture", () => {
    drag = undefined;
    container.classList.remove("is-panning");
  });

  return {
    render({ document: model, selection, mode = "focus" }) {
      const path = Array.isArray(selection) ? selection : selection?.path ?? [];
      const graph = modelGraph(model);
      const visible = mode === "all" ? graph : focusGraph(graph, path, anchorKey);
      const signature = JSON.stringify([mode, visible.anchor, [...visible.nodes.values()], visible.edges]);
      if (svg && drawnSignature === signature) {
        applySelection(svg, path);
        return;
      }
      const focusedPath = container.ownerDocument.activeElement?.dataset.graphPath;
      const newMode = !svg || currentMode !== mode;
      if (newMode) {
        autoWidth = true;
        container.scrollTo(0, 0);
      }
      currentMode = mode;
      anchorKey = visible.anchor ?? anchorKey;
      drawnSignature = signature;
      layout = arrange(visible.nodes);
      svg = drawGraph(visible, layout, id, mode === "focus", onSelect);
      container.replaceChildren(svg);
      applySelection(svg, path);
      setScale(scale, false);
      if (autoWidth) fitWidth(newMode);
      if (focusedPath) {
        [...svg.querySelectorAll("[data-graph-path]")]
          .find(element => element.dataset.graphPath === focusedPath)?.focus({ preventScroll: true });
      }
    },
    zoom(factor) {
      if (typeof factor !== "number" || factor <= 0 || !Number.isFinite(factor)) return;
      autoWidth = false;
      setScale(scale * factor);
    },
    fit() {
      if (!svg || container.clientWidth <= 0 || container.clientHeight <= 0) return;
      autoWidth = false;
      setScale(Math.min(1, container.clientWidth / layout.width, container.clientHeight / layout.height), false);
      container.scrollTo(0, 0);
    },
    reset() {
      autoWidth = false;
      setScale(1, false);
      container.scrollTo(0, 0);
    },
    get zoomValue() {
      return scale;
    },
    toSvg() {
      if (!svg) return "";
      const copy = svg.cloneNode(true);
      copy.setAttribute("width", layout.width);
      copy.setAttribute("height", layout.height);
      const background = svgElement("rect", { width: layout.width, height: layout.height, fill: "#101927" });
      copy.insertBefore(background, copy.querySelector("text, g"));
      return new XMLSerializer().serializeToString(copy);
    }
  };
}
