const PROCESS_DRAFT_KEY = "ontograph-process-draft";
const C = DGCensus, { evaluateNode } = DGPolicy;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const STATUS_IT = C.STATUS_IT;
let model, rules, report = { errors: [], warnings: [] }, pid = null, sel = null, kind = "swimlane", facts = {}, decisions = {}, lastSvg = "";
let update, load;
let toastT; const toast = (m) => { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200); };
const deep = (o) => JSON.parse(JSON.stringify(o));

load = function (m, r, rep) { model = deep(m); rules = deep(r); report = rep || { errors: [], warnings: [] }; pid = model.processes[0]?.id || null; sel = null; recompute(); renderAll(); save(); };
function save() { try { localStorage.setItem(PROCESS_DRAFT_KEY, JSON.stringify({ model, rules })); } catch (_) {} }
function recompute() {
  facts = C.buildFacts(model); decisions = {};
  const data = { systems: model.systems, glossary: model.glossary, rules };
  for (const [id, f] of Object.entries(facts)) decisions[id] = evaluateNode(f.node, data);
}
const proc = () => model?.processes.find(p => p.id === pid);
const studioCanEdit = () => { if (typeof DGFunctionalEditor !== 'undefined' && DGFunctionalEditor.hasDraft()) { toast('Applica o scarta le bozze JSON prima di modificare il censimento.'); return false; } return true; };
const sysOpts = (v) => Object.entries(model.systems).map(([k, s]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(s.label)}</option>`).join("");
const srcOpts = (v) => `<option value=""> </option><option value="manuale" ${v === "manuale" ? "selected" : ""}>Utente (manuale)</option><option value="cantiere" ${v === "cantiere" ? "selected" : ""}>Cantiere</option><option value="fornitore" ${v === "fornitore" ? "selected" : ""}>Fornitore</option><option value="bidding" ${v === "bidding" ? "selected" : ""}>Bidding</option>` + sysOpts(v);
const canonOpts = (v) => `<option value=""> </option>` + (model.glossary || []).map(g => `<option value="${esc(g.canonical)}" ${g.canonical === v ? "selected" : ""}>${esc(g.canonical)}</option>`).join("");

function renderAll() { renderKpis(); renderProcSelect(); renderSteps(); renderSystems(); renderReport(); renderDiagram(); renderVerdicts(); }
function renderKpis() {
  const c = { ok: 0, warn: 0, err: 0 };
  for (const d of Object.values(decisions)) { if (d.status === "approved") c.ok++; else if (d.status === "pending_open_point") c.warn++; else c.err++; }
  $("#kpis").innerHTML = `<span class="kpi ok">${c.ok} pronti</span><span class="kpi warn">${c.warn} in attesa</span><span class="kpi err">${c.err} in revisione</span>`;
  $("#sub").textContent = `${model.meta.project || "RE-DEMO"} · ${model.meta.domain || ""} · modello ${model.meta.model_version || ""} · ${Object.keys(facts).length} passi · ${Object.keys(model.systems).length} sistemi · ${report.errors.length} errori · ${report.warnings.length} avvisi`;
}
function renderProcSelect() {
  $("#proc").innerHTML = model.processes.map(p => `<option value="${esc(p.id)}" ${p.id === pid ? "selected" : ""}>${esc(p.id)} · ${esc(p.name)}</option>`).join("");
  const p = proc(); if (!p) return;
  $("#p-name").value = p.name; $("#p-area").innerHTML = Object.entries(model.owners).map(([k, o]) => `<option value="${esc(k)}" ${k === p.area ? "selected" : ""}>${esc(o.responsible || k)} · ${esc(o.area)}</option>`).join("");
}
function stepCard(sp) {
  const d = decisions[sp.id] || { status: "not_evaluated" }; const open = sel === sp.id;
  return `<article class="step s-${d.status}" data-id="${esc(sp.id)}">
    <div class="step-h" role="button" tabindex="0" aria-expanded="${open}" data-toggle="${esc(sp.id)}"><span class="id">${esc(sp.id)}</span><span class="nm">${esc(sp.name || "(senza nome)")}</span><span class="st ${d.status}">${STATUS_IT[d.status]}</span></div>
    ${open ? `<div class="step-b">
      <div class="row">
        <label class="f w90">ID<input data-f="id" value="${esc(sp.id)}"></label>
        <label class="f grow">Nome<input data-f="name" value="${esc(sp.name)}"></label>
        <label class="f w90">Tipo<select data-f="type"><option ${sp.type === "C" ? "selected" : ""}>C</option><option ${sp.type === "T" ? "selected" : ""}>T</option><option ${sp.type === "R" ? "selected" : ""}>R</option></select></label>
      </div>
      <div class="row">
        <label class="f grow">Trigger<input data-f="trigger" value="${esc(sp.trigger || "")}"></label>
        <label class="f w120">Data Owner<select data-f="data_owner"><option value=""> </option>${Object.entries(model.owners).map(([k, o]) => `<option value="${esc(k)}" ${k === sp.data_owner ? "selected" : ""}>${esc(o.responsible || k)}</option>`).join("")}</select></label>
      </div>
      <div class="sub"><h3>Sistemi coinvolti</h3><div class="chips">${Object.entries(model.systems).map(([k, s]) => `<button class="chip" type="button" data-sys="${esc(k)}" aria-pressed="${sp.systems.includes(k)}">${esc(s.label)}</button>`).join("")}</div></div>
      <div class="sub"><h3>Sistema master (corsia) <button class="btn small" data-add="master" type="button">+ master</button></h3><div class="lines">${(sp.master || []).map((m, i) => `<div class="line ent"><select data-m="${i}" data-k="system">${sysOpts(m.system)}</select><input data-m="${i}" data-k="role" value="${esc(m.role || "")}" placeholder="ruolo (es. sistema di record)"><span></span><button class="x" data-del="master" data-i="${i}" type="button" aria-label="Rimuovi">✕</button></div>`).join("") || `<div class="muted" style="font-size:.78rem">Nessun master: la policy lo segnalerà.</div>`}</div></div>
      <div class="sub"><h3>Flussi tra sistemi <button class="btn small" data-add="flow" type="button">+ flusso</button></h3><div class="lines">${(sp.flows || []).map((f, i) => `<div class="line"><select data-fl="${i}" data-k="from">${sysOpts(f.from)}</select><select data-fl="${i}" data-k="to">${sysOpts(f.to)}</select><input data-fl="${i}" data-k="payload" value="${esc(f.payload || "")}" placeholder="cosa passa (entità / documento)"><button class="x" data-del="flow" data-i="${i}" type="button" aria-label="Rimuovi">✕</button></div>`).join("") || `<div class="muted" style="font-size:.78rem">Nessun flusso: nel diagramma di sequenza comparirà un messaggio interno al sistema master.</div>`}</div></div>
      <div class="sub"><h3>Entità in ingresso <button class="btn small" data-add="in" type="button">+ entità</button></h3><div class="lines">${(sp.entities_in || []).map((e, i) => `<div class="line ent"><input data-in="${i}" data-k="name" value="${esc(e.name)}" placeholder="nome"><select data-in="${i}" data-k="source">${srcOpts(e.source)}</select><span></span><button class="x" data-del="in" data-i="${i}" type="button" aria-label="Rimuovi">✕</button></div>`).join("")}</div></div>
      <div class="sub"><h3>Entità prodotte <button class="btn small" data-add="out" type="button">+ entità</button></h3><div class="lines">${(sp.entities_out || []).map((e, i) => `<div class="line ent"><input data-out="${i}" data-k="name" value="${esc(e.name)}" placeholder="nome"><select data-out="${i}" data-k="system">${sysOpts(e.system)}</select><select data-out="${i}" data-k="canonical">${canonOpts(e.canonical)}</select><button class="x" data-del="out" data-i="${i}" type="button" aria-label="Rimuovi">✕</button></div>`).join("")}</div></div>
      <div class="row"><button class="btn small" data-move="-1" type="button">↑ Sposta su</button><button class="btn small" data-move="1" type="button">↓ Sposta giù</button><button class="btn small danger" data-del="step" type="button" style="margin-left:auto">Elimina passo</button></div>
    </div>` : ""}
  </article>`;
}
function renderSteps() { const p = proc(); $("#steps").innerHTML = p ? p.subprocesses.map(stepCard).join("") || `<div class="muted">Nessun passo. Aggiungine uno.</div>` : ""; }
function renderSystems() {
  $("#systems").innerHTML = Object.entries(model.systems).map(([k, s]) => `<div class="line ent"><span class="mono">${esc(k)}</span><input data-sysf="${esc(k)}" data-k="label" value="${esc(s.label)}"><select data-sysf="${esc(k)}" data-k="adoption">${["full", "wide", "partial", "implementing", "on_demand"].map(a => `<option ${s.adoption === a ? "selected" : ""}>${a}</option>`).join("")}</select><select data-sysf="${esc(k)}" data-k="scope">${["in", "open", "support", "external", "downstream"].map(a => `<option ${s.scope === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>`).join("");
}
function renderReport() {
  const r = report; $("#report").innerHTML = [...r.errors.map(e => `<div class="e">✗ ${esc(e)}</div>`), ...r.warnings.map(w => `<div class="w">⚠ ${esc(w)}</div>`)].join("") || `<div class="muted">Nessun errore né avviso nell'ultimo caricamento.</div>`;
}
function currentSource() {
  const p = proc(); if (!p) return "";
  if (kind === "class") return C.classMermaid(model);
  return kind === "sequence" ? C.sequenceMermaid(p, model.systems, decisions) : C.swimlaneMermaid(p, model.systems, decisions);
}
// Viewing state is deliberately separate from model, decisions, and saved versions.
let renderSeq = 0, diagramViewport = null, diagramAssociations = [], diagramRelated = null;
let diagramFitMode = true, diagramDrag = null, diagramPointers = new Map(), diagramSuppressClick = false;
const diagramStatus = id => decisions[id]?.status || 'not_evaluated';
const allDiagramSteps = () => (model?.processes || []).flatMap(p => (p.subprocesses || []).map(sp => ({ p, sp })));
function diagramContext() {
  return { project: model?.meta?.project || 'progetto', version: `modello-${model?.meta?.model_version || 'locale'}`,
    draft: true, process: kind === 'class' ? 'entita-progetto' : pid || 'nessun-processo', kind };
}
function refreshDiagramProvenance() {
  const context = diagramContext();
  $('#diagram-provenance').textContent = `${context.project} · ${context.version} · BOZZA LOCALE`;
}
function setDiagramExports(enabled) {
  $('#dl-svg').disabled = !enabled;
  $('#cp-mmd').disabled = !enabled;
  $('#cp-puml').disabled = !enabled || kind === 'class';
  $('#cp-puml').title = kind === 'class' ? 'Esportazione PlantUML non disponibile per la vista Entità; usa Mermaid o SVG.' : 'Copia il sorgente della vista corrente';
}
function invalidateDiagram(message = 'Generazione del diagramma…') {
  ++renderSeq; lastSvg = ''; diagramViewport = null; diagramFitMode = true; diagramAssociations = []; diagramPointers.clear(); diagramDrag = null;
  setDiagramExports(false);
  $('#diagram').setAttribute('aria-busy', 'true');
  $('#diagram').classList.remove('is-panning');
  $('#diagram').innerHTML = `<div class="diagram-state">${esc(message)}</div>`;
  $('#diagram-zoom').textContent = ' '; $('#dstat').textContent = '';
}
function currentDiagramMatches(sp) {
  const filter = $('#diagram-filter').value, status = diagramStatus(sp.id);
  return filter === 'all' || (filter === 'pending' ? !['approved', 'not_evaluated'].includes(status) : status === filter);
}
function searchDiagram() {
  const query = $('#diagram-search').value.trim().toLocaleLowerCase('it');
  const results = $('#diagram-results'); results.hidden = !query;
  const matched = allDiagramSteps().filter(({ sp }) => {
    const systems = [...new Set([...(sp.systems || []), ...(sp.master || []).map(m => m.system), ...(sp.flows || []).flatMap(f => [f.from, f.to])])];
    return [sp.id, sp.name, ...systems.flatMap(s => [s, model.systems[s]?.label])].join(' ').toLocaleLowerCase('it').includes(query);
  });
  if (query) results.innerHTML = matched.length ? matched.map(({ p, sp }) => `<button type="button" class="diagram-result" data-diagram-step="${esc(sp.id)}" aria-pressed="${sel === sp.id}"><strong>${esc(sp.id)}</strong><span>${esc(sp.name)}<small>${esc(p.id)} · ${esc(p.name)} · ${esc(STATUS_IT[diagramStatus(sp.id)] || 'Non valutato')}</small></span></button>`).join('') : '<p class="muted" style="padding:12px">Nessun passo corrispondente. Prova con un ID, un nome o un sistema.</p>';
  const steps = kind === 'class' ? allDiagramSteps().map(x => x.sp) : proc()?.subprocesses || [];
  const count = steps.filter(currentDiagramMatches).length;
  $('#diagram-filter-note').textContent = `${query ? `${matched.length} risultati nel progetto. ` : ''}${$('#diagram-filter').value === 'all' ? 'Tutti gli elementi visibili.' : `${count} di ${steps.length} passi evidenziati; gli altri restano visibili in trasparenza.`} ${kind === 'class' ? 'Entità: vista trasversale a tutti i processi.' : ''}`;
  syncDiagramSelection();
}
function selectDiagramStep(id, focus = false) {
  const found = allDiagramSteps().find(x => x.sp.id === id);
  if (!found) return;
  const change = pid !== found.p.id; pid = found.p.id; sel = id; diagramRelated = null;
  renderProcSelect(); renderSteps(); renderVerdicts();
  if (typeof renderExecutive === 'function') renderExecutive();
  if (change && kind !== 'class') renderDiagram().then(() => { if (focus && sel === id) centerSelectedDiagram(); });
  else { searchDiagram(); if (focus) centerSelectedDiagram(); }
}
function relatedDiagramSteps(ids, label) {
  if (ids.length === 1) return selectDiagramStep(ids[0]);
  sel = null; diagramRelated = { ids, label }; renderSteps(); renderVerdicts(); searchDiagram();
}
function syncDiagramSelection() {
  for (const { el, ids } of diagramAssociations) {
    const selected = !!sel && ids.includes(sel);
    el.classList.toggle('diagram-selected', selected);
    el.setAttribute('aria-pressed', String(selected));
    const matches = ids.some(id => { const sp = facts[id]?.node; return sp && currentDiagramMatches(sp); });
    el.classList.toggle('diagram-muted', ids.length > 0 && !matches);
  }
  $('#diagram-deselect').disabled = !sel && !diagramRelated;
}
function bindDiagramSelection(svg) {
  diagramAssociations = [];
  const bind = (el, ids, label) => {
    if (!el) return;
    const unique = [...new Set(ids)];
    el.dataset.diagramSelect = 'true'; el.tabIndex = 0; el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
    el.setAttribute('aria-label', label); diagramAssociations.push({ el, ids: unique });
    const select = () => relatedDiagramSteps(unique, label);
    el.addEventListener('click', e => { if (diagramSuppressClick) return; e.stopPropagation(); select(); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(); } });
  };
  const findNode = id => [...svg.querySelectorAll('.node')].find(n => n.id === id || n.dataset.id === id || n.id.includes(`-${id}-`));
  if (kind === 'swimlane') {
    for (const sp of proc()?.subprocesses || []) bind(findNode(C.diagramId(sp.id)), [sp.id], `${sp.id} · ${sp.name}`);
  } else if (kind === 'sequence') {
    // Wrapped notes contain several text.noteText elements. The note group, not a text line,
    // is the semantic unit. Validate both cardinality and generated ID/name before binding.
    const notes = [...svg.querySelectorAll('g[data-et="note"]')], steps = proc()?.subprocesses || [];
    const compact = text => String(text).replace(/\s+/g, '');
    const matches = (note, step) => compact(note.textContent).startsWith(compact(`${step.id} ${step.name}`.replace(/:/g, '-').replace(/;/g, ',')));
    if (notes.length === steps.length && notes.every((note, i) => matches(note, steps[i]))) {
      notes.forEach((note, i) => bind(note, [steps[i].id], `${steps[i].id} · ${steps[i].name}`));
    }
  } else {
    for (const g of model.glossary || []) {
      const ids = allDiagramSteps().filter(({ sp }) => [...(sp.entities_in || []), ...(sp.entities_out || [])].some(e => e.canonical === g.canonical)).map(x => x.sp.id);
      bind(findNode(C.diagramId(g.canonical, 'C')), ids, `Entità ${g.canonical} · passi che la utilizzano o la producono`);
    }
    for (const [system, data] of Object.entries(model.systems)) {
      const ids = allDiagramSteps().filter(({ sp }) => (sp.entities_out || []).some(e => e.canonical && e.system === system)).map(x => x.sp.id);
      bind(findNode(C.diagramId(system, 'S')), ids, `Sistema ${data.label || system} · passi che vi producono entità canoniche`);
    }
  }
  syncDiagramSelection();
}
function applyDiagramViewport() {
  if (!diagramViewport) return;
  const { svg, x, y, w, h } = diagramViewport;
  svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  $('#diagram-zoom').textContent = `${Math.round(100 * $('#diagram').clientWidth / w)}%`;
}
function fitDiagram() {
  // Keep the fit request pending while a new project is still hidden. ResizeObserver
  // will apply it when the viewport acquires real dimensions.
  diagramFitMode = true;
  if (!diagramViewport) return;
  const v = diagramViewport, box = $('#diagram');
  if (!(box.clientWidth > 0) || !(box.clientHeight > 0)) return;
  const ratio = box.clientWidth / box.clientHeight;
  v.w = Math.max(v.natural.w * 1.08, v.natural.h * ratio * 1.08); v.h = v.w / ratio;
  v.x = v.natural.x + (v.natural.w - v.w) / 2; v.y = v.natural.y + (v.natural.h - v.h) / 2;
  applyDiagramViewport();
}
function resetDiagram() {
  if (!diagramViewport) return;
  const v = diagramViewport, box = $('#diagram');
  v.w = box.clientWidth; v.h = box.clientHeight;
  v.x = v.natural.x + (v.natural.w - v.w) / 2; v.y = v.natural.y + (v.natural.h - v.h) / 2;
  diagramFitMode = false; applyDiagramViewport();
}
function zoomDiagram(factor, clientX, clientY) {
  if (!diagramViewport) return;
  const v = diagramViewport, rect = $('#diagram').getBoundingClientRect();
  const fx = clientX === undefined ? .5 : (clientX - rect.left) / rect.width, fy = clientY === undefined ? .5 : (clientY - rect.top) / rect.height;
  // Relative limits retain a usable fit even for very large diagrams.
  const min = Math.min(rect.width / 5, v.natural.w / 20), max = Math.max(v.natural.w * 8, rect.width * 10);
  const w = Math.max(min, Math.min(max, v.w / factor)), h = w * rect.height / rect.width;
  v.x += (v.w - w) * fx; v.y += (v.h - h) * fy; v.w = w; v.h = h;
  diagramFitMode = false; applyDiagramViewport();
}
function centerSelectedDiagram() {
  if (!diagramViewport || !sel) return;
  const hit = diagramAssociations.find(x => x.ids.length === 1 && x.ids[0] === sel);
  if (!hit) { $('#diagram').focus({ preventScroll: true }); return; }
  const rect = hit.el.getBoundingClientRect(), p = diagramViewport.svg.createSVGPoint(); p.x = rect.left + rect.width / 2; p.y = rect.top + rect.height / 2;
  const c = p.matrixTransform(diagramViewport.svg.getScreenCTM().inverse());
  diagramViewport.x = c.x - diagramViewport.w / 2; diagramViewport.y = c.y - diagramViewport.h / 2; diagramFitMode = false; applyDiagramViewport(); hit.el.focus({ preventScroll: true });
}
async function toggleDiagramFullscreen() {
  const workspace = $('#diagram-workspace');
  if (document.fullscreenElement === workspace) await document.exitFullscreen();
  else if (workspace.classList.contains('is-expanded')) workspace.classList.remove('is-expanded');
  else if (workspace.requestFullscreen) { try { await workspace.requestFullscreen(); } catch (_) { workspace.classList.add('is-expanded'); } }
  else workspace.classList.add('is-expanded');
  syncDiagramFullscreen();
}
function syncDiagramFullscreen() {
  const full = document.fullscreenElement === $('#diagram-workspace') || $('#diagram-workspace').classList.contains('is-expanded');
  const button = $('[data-viewport="fullscreen"]'); button.setAttribute('aria-pressed', String(full)); button.textContent = full ? 'Esci da schermo intero' : 'Schermo intero';
  requestAnimationFrame(fitDiagram);
}
async function renderDiagram() {
  const src = currentSource(); $('#src').textContent = src;
  invalidateDiagram(); const my = renderSeq, view = $('#diagram'); diagramRelated = null;
  refreshDiagramProvenance(); searchDiagram();
  $('#diagram-semantics').textContent = kind === 'swimlane' ? 'Linea continua: ordine dei passi nel censimento. Linea tratteggiata: flusso tra sistemi. I blocchi raggruppano per sistema master; non descrivono un motore di esecuzione BPMN.' : kind === 'sequence' ? 'Messaggi: flussi censiti; in assenza di flussi è mostrato un messaggio interno. Seleziona l’intestazione di un passo o usa la ricerca.' : 'Entità canoniche, residenza nei sistemi e dipendenze dichiarate. Una stessa entità può riferirsi a più passi: il dettaglio ne mostra l’elenco.';
  if (!src || (kind !== 'class' && !proc()?.subprocesses?.length)) {
    view.innerHTML = '<div class="diagram-state"><strong>Nessun passo da visualizzare</strong>Seleziona un processo oppure importa un censimento con passi strutturati.</div>'; view.setAttribute('aria-busy', 'false'); return;
  }
  if (kind === 'class' && !(model.glossary || []).length && !allDiagramSteps().some(({sp}) => (sp.entities_out || []).some(e => e.canonical))) {
    view.innerHTML = '<div class="diagram-state"><strong>Nessuna entità canonica</strong>Le associazioni compariranno quando saranno censite nel modello.</div>'; view.setAttribute('aria-busy', 'false'); return;
  }
  try {
    if (!window.mermaid) throw new Error('Il motore grafico locale non è disponibile. Ricarica la pagina.');
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', themeVariables: { darkMode: true, textColor: '#e7f1fa', titleColor: '#e7f1fa', background: '#081321', primaryColor: '#142a3e', primaryTextColor: '#e7f1fa', primaryBorderColor: '#64c2d4', lineColor: '#8aa9be', secondaryColor: '#102c38', tertiaryColor: '#101f32', clusterBkg: '#0e1a2c', clusterBorder: '#3b536b', actorBkg: '#142a3e', actorTextColor: '#e7f1fa', actorBorder: '#64c2d4', signalColor: '#aabfd2', signalTextColor: '#e7f1fa', noteBkgColor: '#233342', noteTextColor: '#e7f1fa', noteBorderColor: '#7292a5', labelTextColor: '#e7f1fa', edgeLabelBackground: '#081321' }, fontFamily: 'system-ui, sans-serif', flowchart: { htmlLabels: true }, sequence: { wrap: true, width: 180, actorMargin: 55, messageMargin: 40 } });
    const { svg } = await mermaid.render('st-' + my, src);
    if (my !== renderSeq) return;
    view.innerHTML = svg;
    const node = view.querySelector('svg'), vb = node?.viewBox?.baseVal;
    if (!node || !vb || !(vb.width > 0) || !(vb.height > 0)) throw new Error('Il diagramma non ha una dimensione valida.');
    // Keep renderer labels readable in both the canvas and standalone SVG exports.
    node.querySelectorAll('.nodeLabel, .edgeLabel, .cluster-label').forEach(label => { label.style.color = '#e7f1fa'; });
    node.querySelectorAll('text').forEach(label => { label.style.fill = '#e7f1fa'; });
    lastSvg = serializeDiagramSvg(node);
    diagramViewport = { svg: node, natural: { x: vb.x, y: vb.y, w: vb.width, h: vb.height }, x: vb.x, y: vb.y, w: vb.width, h: vb.height };
    node.setAttribute('width', '100%'); node.setAttribute('height', '100%'); node.style.maxWidth = 'none'; node.style.width = '100%';
    node.setAttribute('aria-label', `${kind === 'class' ? 'Entità del progetto' : proc()?.name || pid} · ${kind === 'swimlane' ? 'diagramma a blocchi' : kind === 'sequence' ? 'sequenza' : 'classi'}`);
    bindDiagramSelection(node); fitDiagram(); setDiagramExports(true);
    view.setAttribute('aria-busy', 'false'); refreshDiagramProvenance();
    $('#dstat').textContent = `${kind === 'class' ? 'Tutto il progetto' : pid} · ${diagramAssociations.length} elementi ispezionabili`;
  } catch (e) {
    if (my !== renderSeq) return;
    lastSvg = ''; diagramViewport = null; diagramAssociations = []; setDiagramExports(false);
    view.innerHTML = `<div class="diagram-state" role="alert"><strong>Diagramma non disponibile</strong><span>Il modello resta disponibile. Verifica il sorgente e riprova.</span><pre>${esc(String(e.message).slice(0, 500))}</pre><button type="button" class="btn" id="diagram-retry">Riprova</button></div>`;
    $('#diagram-retry').addEventListener('click', renderDiagram); view.setAttribute('aria-busy', 'false'); $('#dstat').textContent = 'Rendering non riuscito · esportazione disabilitata';
  }
}
function renderInspector() {
  const box = $('#diagram-inspector');
  if (diagramRelated && !sel) {
    const { ids, label } = diagramRelated;
    box.innerHTML = `<p class="inspector-title">${esc(label)}</p><p class="muted">${ids.length ? `${ids.length} passi associati. Scegli il passo da esaminare.` : 'Nessun passo associato in modo esplicito nel censimento.'}</p><div class="diagram-association-list">${ids.map(id => `<button type="button" data-diagram-step="${esc(id)}"><span class="mono">${esc(id)}</span> · ${esc(facts[id]?.node?.name || '')}</button>`).join('')}</div>`;
    return;
  }
  const node = sel && facts[sel]?.node;
  if (!node) { box.innerHTML = '<p class="muted">Seleziona un blocco o cerca un passo per leggerne responsabilità, flussi ed evidenze.</p>'; return; }
  const list = (items, formatter) => items?.length ? `<ul>${items.map(x => `<li>${formatter(x)}</li>`).join('')}</ul>` : '<span class="muted">Non censito</span>';
  const system = code => esc(model.systems[code]?.label || code || 'Non specificato');
  const rows = [
    ['Sistema master', list(node.master, m => `${system(m.system)}${m.role ? ' · ' + esc(m.role) : ''}`)],
    ['Sistemi coinvolti', list(node.systems, system)],
    ['Responsabilità', node.data_owner ? esc([node.data_owner.responsible, node.data_owner.area].filter(Boolean).join(' · ') || node.data_owner.key) : '<span class="muted">Da assegnare</span>'],
    ['Trigger', esc(node.trigger || 'Non censito')],
    ['Ingressi', list(node.entities_in, e => `${esc(e.name)} · ${system(e.source)}${e.canonical ? ' · ' + esc(e.canonical) : ''}`)],
    ['Uscite', list(node.entities_out, e => `${esc(e.name)} · ${system(e.system)}${e.canonical ? ' · ' + esc(e.canonical) : ''}`)],
    ['Flussi tra sistemi', list(node.flows, f => `${system(f.from)} → ${system(f.to)}${f.payload ? ' · ' + esc(f.payload) : ''}`)],
    ['Punti aperti e chiarimenti', list(node.open_points, op => `<strong>${esc(op.id || '')} ${esc(op.title || '')}</strong>${op.status ? ' · ' + esc(op.status) : ''}${op.detail ? '<br>' + esc(op.detail) : ''}${op.next_step ? '<br>Prossimo passo: ' + esc(op.next_step) : ''}`)],
    ['Criticità', node.criticality?.open ? esc(node.criticality.text || 'Criticità aperta senza dettaglio') : 'Nessuna criticità aperta dichiarata'],
  ];
  box.innerHTML = `<div class="inspector-id">${esc(node.process)} / ${esc(sel)}</div><h4 class="inspector-title">${esc(node.name)}</h4><dl class="inspector-facts">${rows.map(([k,v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}
function renderVerdicts() {
  renderInspector(); syncDiagramSelection(); refreshDiagramProvenance();
  const d = sel && decisions[sel], box = $('#verdicts'); $('#vsel').textContent = sel ? `· ${sel}` : '';
  if (!sel) { box.innerHTML = '<div class="muted">Seleziona un passo per consultarne gli esiti.</div>'; return; }
  if (!d) { box.innerHTML = '<span class="st not_evaluated">Non valutato</span><p class="muted">Questa versione non contiene un esito salvato per il passo. L’assenza di un esito non equivale a un’approvazione.</p>'; return; }
  const li = (arr, cls, key) => (arr || []).map(x => `<div class="verdict ${cls}"><span class="c">${esc(x.code)}</span><span>${esc(x[key])}</span></div>`).join('');
  const c = diagramContext();
  box.innerHTML = `<div class="row"><span class="st ${esc(d.status)}">${esc(STATUS_IT[d.status] || 'Non valutato')}</span>${d.enforcement ? `<span class="mono muted">${esc(d.enforcement)}</span>` : ''}</div><p class="muted" style="font-size:.69rem;margin:3px 0">${c.draft ? 'Anteprima locale della bozza.' : `Esiti conservati con la versione ${esc(c.version)}.`} La revisione umana è separata.</p>` + li(d.violations, 'v', 'message') + li(d.required_actions, 'a', 'action') + li(d.warnings, 'w', 'message') + (![...(d.violations || []), ...(d.required_actions || []), ...(d.warnings || [])].length ? '<div class="muted">Nessuna segnalazione registrata.</div>' : '');
}
function validatedDiagramXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'image/svg+xml'), svg = doc.documentElement;
  if (doc.querySelector('parsererror') || svg?.localName !== 'svg' || svg.namespaceURI !== 'http://www.w3.org/2000/svg') throw new Error('Il diagramma esportato non è un documento SVG valido.');
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[ ,]+/).map(Number);
  if (vb.length !== 4 || !vb.every(Number.isFinite) || !(vb[2] > 0) || !(vb[3] > 0)) throw new Error('Il diagramma esportato non ha un’area di disegno valida.');
  return { doc, svg, vb };
}
function serializeDiagramSvg(node) {
  // Mermaid returns HTML-compatible foreignObject labels, including non-self-closing <br>.
  // The browser has already parsed their correct HTML/SVG namespaces. Serialize that DOM,
  // before adding selection/filter/viewport state, to retain all labels as valid XML.
  const clone = node.cloneNode(true);
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) if (attr.name === 'xmlns' || attr.prefix === 'xmlns' || attr.name.startsWith('xmlns:')) el.removeAttributeNode(attr);
  }
  // XMLSerializer recreates the namespace declarations from DOM namespaceURI values.
  const xml = new XMLSerializer().serializeToString(clone);
  validatedDiagramXml(xml);
  return xml;
}
function diagramExport() {
  if (!lastSvg) return null;
  try {
    const c = diagramContext(), { doc, svg, vb } = validatedDiagramXml(lastSvg);
    const label = `${c.project} · ${c.version}${c.draft ? ' · BOZZA' : ''} · ${c.process} · ${c.kind}`;
    const ns = 'http://www.w3.org/2000/svg';
    const title = doc.createElementNS(ns, 'title'); title.textContent = label; svg.prepend(title);
    const meta = doc.createElementNS(ns, 'metadata'); meta.textContent = JSON.stringify({ ...c, source: 'OntoGraph · modello strutturato', exportedAt: new Date().toISOString(), policyMeaning: 'Esiti automatici separati dalla revisione umana', presentation: 'diagramma completo; filtri e navigazione esclusi' }); svg.prepend(meta);
    const headerHeight = 50, width = Math.max(vb[2], 620, label.length * 7 + 24);
    svg.setAttribute('viewBox', `${vb[0]} ${vb[1] - headerHeight} ${width} ${vb[3] + headerHeight}`); svg.setAttribute('width', String(width)); svg.setAttribute('height', String(vb[3] + headerHeight));
    svg.style.width = ''; svg.style.height = ''; svg.style.maxWidth = 'none'; svg.style.background = '#081321';
    const backdrop = doc.createElementNS(ns, 'rect'); backdrop.setAttribute('x', String(vb[0])); backdrop.setAttribute('y', String(vb[1] - headerHeight)); backdrop.setAttribute('width', String(width)); backdrop.setAttribute('height', String(vb[3] + headerHeight)); backdrop.setAttribute('fill', '#081321'); svg.prepend(backdrop);
    const text = doc.createElementNS(ns, 'text'); text.setAttribute('x', String(vb[0] + 12)); text.setAttribute('y', String(vb[1] - 18)); text.setAttribute('fill', '#e7f1fa'); text.setAttribute('font-family', 'system-ui, sans-serif'); text.setAttribute('font-size', '13'); text.textContent = label; svg.append(text);
    const clean = value => String(value).replace(/[^a-zA-Z0-9_.-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'modello';
    return { filename: [c.project, c.version, c.process, c.kind, c.draft ? 'BOZZA' : 'salvata'].map(clean).join('_') + '.svg', svg: serializeDiagramSvg(svg) };
  } catch (error) {
    lastSvg = ''; setDiagramExports(false);
    $('#dstat').textContent = 'Esportazione SVG non disponibile: rigenera il diagramma.';
    toast(error.message); return null;
  }
}
$('#diagram-search').addEventListener('input', searchDiagram);
$('#diagram-clear').addEventListener('click', () => { $('#diagram-search').value = ''; searchDiagram(); $('#diagram-search').focus(); });
$('#diagram-filter').addEventListener('change', searchDiagram);
$('#diagram-workspace').addEventListener('click', e => {
  const step = e.target.closest('[data-diagram-step]'); if (step) selectDiagramStep(step.dataset.diagramStep, true);
  const action = e.target.closest('[data-viewport]')?.dataset.viewport;
  if (action === 'in') zoomDiagram(1.25); if (action === 'out') zoomDiagram(.8); if (action === 'fit') fitDiagram(); if (action === 'reset') resetDiagram(); if (action === 'fullscreen') toggleDiagramFullscreen();
});
$('#diagram-deselect').addEventListener('click', () => { sel = null; diagramRelated = null; renderSteps(); renderVerdicts(); searchDiagram(); });
$('#steps').addEventListener('keydown', e => { const h = e.target.closest('[data-toggle]'); if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); h.click(); } });
$('#diagram').addEventListener('wheel', e => { if (!diagramViewport || !(e.ctrlKey || e.metaKey)) return; e.preventDefault(); zoomDiagram(Math.exp(-e.deltaY * .002), e.clientX, e.clientY); }, { passive: false });
$('#diagram').addEventListener('pointerdown', e => {
  if (!diagramViewport || (e.pointerType === 'mouse' && e.button !== 0)) return;
  diagramPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (e.target.closest('[data-diagram-select]') && e.pointerType !== 'touch') return;
  $('#diagram').setPointerCapture(e.pointerId); diagramDrag = { x: e.clientX, y: e.clientY, moved: false }; diagramSuppressClick = false;
  if (diagramPointers.size > 1) { const [a,b] = [...diagramPointers.values()]; diagramDrag.distance = Math.hypot(a.x - b.x, a.y - b.y); }
});
$('#diagram').addEventListener('pointermove', e => {
  if (!diagramViewport || !diagramDrag || !diagramPointers.has(e.pointerId)) return;
  const prior = diagramPointers.get(e.pointerId); diagramPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (diagramPointers.size > 1) {
    const [a,b] = [...diagramPointers.values()], distance = Math.hypot(a.x-b.x,a.y-b.y);
    if (diagramDrag.distance > 0) zoomDiagram(distance / diagramDrag.distance, (a.x+b.x)/2, (a.y+b.y)/2);
    diagramDrag.distance = distance; diagramDrag.moved = true; diagramSuppressClick = true; return;
  }
  const dx = e.clientX-prior.x, dy = e.clientY-prior.y;
  if (!diagramDrag.moved && Math.hypot(e.clientX-diagramDrag.x,e.clientY-diagramDrag.y) < 4) return;
  diagramDrag.moved = true; diagramSuppressClick = true; $('#diagram').classList.add('is-panning');
  const rect = $('#diagram').getBoundingClientRect(); diagramViewport.x -= dx*diagramViewport.w/rect.width; diagramViewport.y -= dy*diagramViewport.h/rect.height; diagramFitMode = false; applyDiagramViewport();
});
const finishDiagramPointer = e => {
  const tap = diagramDrag && !diagramDrag.moved && e.pointerType === 'touch';
  diagramPointers.delete(e.pointerId);
  if (tap) { const target = document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-diagram-select]'), item = diagramAssociations.find(x => x.el === target); if (item) relatedDiagramSteps(item.ids, target.getAttribute('aria-label')); }
  if (!diagramPointers.size) { diagramDrag = null; $('#diagram').classList.remove('is-panning'); setTimeout(() => { diagramSuppressClick = false; }, 0); }
  else if (diagramDrag) { diagramDrag.distance = null; }
};
$('#diagram').addEventListener('pointerup', finishDiagramPointer); $('#diagram').addEventListener('pointercancel', finishDiagramPointer);
$('#diagram').addEventListener('keydown', e => {
  if (!diagramViewport || e.target.closest('input,select,textarea,button')) return;
  const v = diagramViewport;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0','f','F'].includes(e.key)) e.preventDefault();
  if (e.key === '+' || e.key === '=') zoomDiagram(1.25); if (e.key === '-') zoomDiagram(.8); if (e.key === '0') resetDiagram(); if (e.key.toLowerCase() === 'f') fitDiagram();
  if (e.key.startsWith('Arrow')) { if (e.key === 'ArrowLeft') v.x -= v.w*.1; if (e.key === 'ArrowRight') v.x += v.w*.1; if (e.key === 'ArrowUp') v.y -= v.h*.1; if (e.key === 'ArrowDown') v.y += v.h*.1; diagramFitMode = false; applyDiagramViewport(); }
});
document.addEventListener('keydown', e => { if (e.key !== 'Escape' || $('#diagram-workspace').closest('[hidden]')) return; if ($('#diagram-workspace').classList.contains('is-expanded')) { $('#diagram-workspace').classList.remove('is-expanded'); syncDiagramFullscreen(); } else if (!document.fullscreenElement) { sel = null; diagramRelated = null; renderSteps(); renderVerdicts(); searchDiagram(); } });
document.addEventListener('fullscreenchange', syncDiagramFullscreen);
new ResizeObserver(() => { if (!diagramViewport || !$('#diagram').clientWidth) return; if (diagramFitMode) fitDiagram(); else { const v = diagramViewport; v.h = v.w * $('#diagram').clientHeight / $('#diagram').clientWidth; applyDiagramViewport(); } }).observe($('#diagram'));

update = function () { recompute(); renderKpis(); renderSteps(); renderDiagram(); renderVerdicts(); save(); };

// ---------- editing
$("#proc").addEventListener("change", e => { pid = e.target.value; sel = null; renderProcSelect(); renderSteps(); renderDiagram(); renderVerdicts(); });
$("#p-name").addEventListener("input", e => { if (!studioCanEdit()) return; const p = proc(); if (p) { p.name = e.target.value; renderProcSelect(); update(); } });
$("#p-area").addEventListener("change", e => { if (!studioCanEdit()) return; const p = proc(); if (p) { p.area = e.target.value; update(); } });
$("#add-proc").addEventListener("click", () => { if (!studioCanEdit()) return; let n = 1; while (model.processes.some(p => p.id === `P${n}`)) n++; const id = `P${n}`; model.processes.push({ id, name: "Nuovo processo", subtitle: "", area: Object.keys(model.owners)[0] || "", systems: [], verified: false, subprocesses: [] }); pid = id; sel = null; recompute(); renderAll(); save(); });
$("#del-proc").addEventListener("click", () => { if (!studioCanEdit()) return; if (!proc()) return; model.processes = model.processes.filter(p => p.id !== pid); pid = model.processes[0]?.id || null; sel = null; recompute(); renderAll(); save(); });
$("#add-step").addEventListener("click", () => { if (!studioCanEdit()) return; const p = proc(); if (!p) return; let n = 1; while (model.processes.some(p2 => p2.subprocesses.some(s => s.id === `${p.id.replace("P", "")}.${n}`))) n++; const id = `${p.id.replace("P", "")}.${n}`; const sys = Object.keys(model.systems)[0] || ""; p.subprocesses.push({ id, name: "Nuovo passo", systems: sys ? [sys] : [], flows: [], type: "C", trigger: "", entities_in: [], entities_out: [], master: sys ? [{ system: sys, role: "" }] : [], data_owner: p.area || "", criticality: { open: false, text: "" }, open_points: [], extra_system_steps: [], verified: false }); sel = id; update(); });
$("#steps").addEventListener("click", e => {
  const h = e.target.closest("[data-toggle]"); if (h) { const id = h.dataset.toggle; sel = sel === id ? null : id; diagramRelated = null; renderSteps(); renderVerdicts(); searchDiagram(); return; }
  if (!studioCanEdit()) return; const card = e.target.closest(".step"); if (!card) return; const p = proc(); const sp = p.subprocesses.find(s => s.id === card.dataset.id); if (!sp) return;
  const chip = e.target.closest(".chip[data-sys]"); if (chip) { const k = chip.dataset.sys; sp.systems = sp.systems.includes(k) ? sp.systems.filter(x => x !== k) : [...sp.systems, k]; update(); return; }
  const add = e.target.closest("[data-add]"); if (add) { const k = add.dataset.add; const sys = sp.systems[0] || Object.keys(model.systems)[0]; if (k === "flow") sp.flows.push({ from: sys, to: sys, payload: "" }); if (k === "in") sp.entities_in.push({ name: "", source: "" }); if (k === "out") sp.entities_out.push({ name: "", system: sys }); if (k === "master") sp.master.push({ system: sys, role: "" }); update(); return; }
  const del = e.target.closest("[data-del]"); if (del) { const k = del.dataset.del, i = +del.dataset.i; if (k === "flow") sp.flows.splice(i, 1); if (k === "in") sp.entities_in.splice(i, 1); if (k === "out") sp.entities_out.splice(i, 1); if (k === "master") sp.master.splice(i, 1); if (k === "step") { if (p.functional_graph?.nodes.some(n => n.subprocess_id === sp.id)) return toast("Rimuovi prima l’attività dal modellatore, poi elimina il passo dal censimento."); p.subprocesses = p.subprocesses.filter(s => s !== sp); sel = null; } update(); return; }
  const mv = e.target.closest("[data-move]"); if (mv) { const i = p.subprocesses.indexOf(sp), j = i + (+mv.dataset.move); if (j < 0 || j >= p.subprocesses.length) return; [p.subprocesses[i], p.subprocesses[j]] = [p.subprocesses[j], p.subprocesses[i]]; update(); }
});
$("#steps").addEventListener("input", e => {
  if (!studioCanEdit()) return; const card = e.target.closest(".step"); if (!card) return; const p = proc(); const sp = p.subprocesses.find(s => s.id === card.dataset.id); if (!sp) return; const t = e.target;
  if (t.dataset.f) { if (t.dataset.f === "id") { if (e.type === "input") return; } sp[t.dataset.f] = t.value; if (t.dataset.f === "id") sel = t.value; }
  if (t.dataset.fl !== undefined) sp.flows[+t.dataset.fl][t.dataset.k] = t.value;
  if (t.dataset.in !== undefined) sp.entities_in[+t.dataset.in][t.dataset.k] = t.value;
  if (t.dataset.out !== undefined) { const o = sp.entities_out[+t.dataset.out]; o[t.dataset.k] = t.value; if (t.dataset.k === "canonical" && !t.value) delete o.canonical; }
  if (t.dataset.m !== undefined) sp.master[+t.dataset.m][t.dataset.k] = t.value;
  invalidateDiagram('Aggiornamento anteprima…');
  clearTimeout(window._deb); window._deb = setTimeout(() => { recompute(); renderKpis(); renderDiagram(); renderVerdicts(); save(); if (t.tagName === "SELECT") renderSteps(); }, 350);
});
$("#steps").addEventListener("change", e => { if (!studioCanEdit()) return; const t = e.target; if (t.dataset.f === "id") { const card = t.closest(".step"), p = proc(), sp = p.subprocesses.find(s => s.id === card.dataset.id), next = t.value.trim(); if (!next || model.processes.some(p => p.subprocesses.some(s => s !== sp && s.id === next))) { t.value = sp.id; return toast("Usa un ID non vuoto e univoco nel progetto."); } for (const n of p.functional_graph?.nodes || []) if (n.subprocess_id === sp.id) n.subprocess_id = next; sp.id = next; sel = next; update(); } });
$("#systems").addEventListener("input", e => { if (!studioCanEdit()) return; const t = e.target; if (!t.dataset.sysf) return; model.systems[t.dataset.sysf][t.dataset.k] = t.value; invalidateDiagram('Aggiornamento anteprima…'); clearTimeout(window._deb2); window._deb2 = setTimeout(() => { recompute(); renderKpis(); renderDiagram(); renderVerdicts(); save(); }, 350); });
$("#add-sys").addEventListener("click", () => { if (!studioCanEdit()) return; const code = $("#sys-code").value.trim().toUpperCase().replace(/\W/g, "_"), name = $("#sys-name").value.trim(); if (!code || !name) return toast("Servono codice e nome"); if (model.systems[code]) return toast("Codice già usato"); model.systems[code] = { label: name, role: "", kind: "", adoption: "full", scope: "in" }; $("#sys-code").value = ""; $("#sys-name").value = ""; recompute(); renderAll(); save(); });
document.querySelectorAll(".tab[data-kind]").forEach(b => {
  b.tabIndex = b.dataset.kind === kind ? 0 : -1;
  b.addEventListener("click", () => { kind = b.dataset.kind; document.querySelectorAll(".tab[data-kind]").forEach(x => { x.setAttribute("aria-selected", String(x === b)); x.tabIndex = x === b ? 0 : -1; }); renderDiagram(); renderVerdicts(); });
  b.addEventListener("keydown", e => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return; e.preventDefault(); const tabs = [...document.querySelectorAll(".tab[data-kind]")], i = tabs.indexOf(b), next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; tabs[next].click(); tabs[next].focus(); });
});

// ---------- load / export
$("#file").addEventListener("change", async e => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || !DGFunctionalEditor.confirmLeave()) return;
  if (!window.XLSX) return toast("Libreria Excel locale non disponibile. Ricarica la pagina.");
  try {
    if (!file.name.toLowerCase().endsWith(".xlsx") || file.size > 10_000_000) {
      throw new Error("Usa un workbook .xlsx di censimento fino a 10 MB.");
    }
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheets = Object.create(null);
    for (const name of Object.keys(C.SHEETS)) {
      const sheet = workbook.Sheets[name];
      if (!sheet || !Object.hasOwn(workbook.Sheets, name)) continue;
      const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
      if (range.e.r > 5000 || range.e.c > 63) throw new Error(`Dimensione eccessiva del foglio ${name}.`);
      if (Object.values(sheet).some(cell => cell && typeof cell === "object" && ("f" in cell || "F" in cell))) {
        throw new Error(`Il foglio ${name} contiene formule. Usa valori statici.`);
      }
      sheets[name] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: name === "SchemaNodi" });
    }
    const parsed = C.parseWorkbook(sheets);
    if (parsed.errors.length) {
      report = parsed;
      renderReport();
      $("#report").closest("details").open = true;
      return toast(`${parsed.errors.length} errori nel censimento. Consulta il report.`);
    }
    sourceName = file.name;
    load(parsed.model, parsed.rules, parsed);
    toast(`Caricato ${file.name}: ${Object.keys(facts).length} passi`);
  } catch (error) {
    toast(`Excel non importato. ${error instanceof Error ? error.message : "Workbook non riconosciuto."}`);
  }
});

async function saveFile(filename, data) {
  try {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    return true;
  } catch (_) {
    toast("Download non disponibile in questa vista. Usa Copia.");
    return false;
  }
}
$("#dl-xlsx").addEventListener("click", async () => {
  if (!window.XLSX) return toast("Libreria Excel non caricata");
  const wb = XLSX.utils.book_new(); for (const [n, rows] of Object.entries(C.modelToSheets(model, rules))) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), n);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  if (await saveFile(`OntoGraph-Aurora21_${(model.meta.model_version || "x").replace(/\./g, "_")}.xlsx`, buf)) toast("Excel del modello esportato");
});
$("#dl-svg").addEventListener("click", async () => { const file = diagramExport(); if (!file) return; if (await saveFile(file.filename, new Blob([file.svg], { type: "image/svg+xml;charset=utf-8" }))) toast("SVG completo salvato con riferimento alla versione"); });
const copy = async (t, m) => { try { if (!navigator.clipboard) throw new Error("Clipboard non disponibile"); await navigator.clipboard.writeText(t); toast(m); } catch (_) { $("#src").textContent = t; $("#src").closest("details").open = true; toast("Copia non consentita: sorgente mostrato sotto il diagramma"); } };
$("#cp-mmd").addEventListener("click", () => copy(currentSource(), "Sorgente Mermaid copiato"));
$("#cp-puml").addEventListener("click", () => { const p = proc(); if (!p || !lastSvg || kind === "class") return; copy(kind === "sequence" ? C.sequencePlantUML(p, model.systems, decisions) : C.swimlanePlantUML(p, model.systems, decisions), "PlantUML della vista corrente copiato"); });
$("#reset").addEventListener("click", () => { if (!DGFunctionalEditor.confirmLeave()) return; try { localStorage.removeItem(PROCESS_DRAFT_KEY); } catch (_) {} load(SEED.model, SEED.rules, { errors: [], warnings: [] }); toast("Ripristinata la demo sintetica Aurora 21"); });

// ---------- codice generato dal censimento
let sourceName = "OntoGraph-Aurora21.xlsx";
const codeFiles = () => C.generatedCode(model, rules, decisions, sourceName);
function renderCode() {
  const files = codeFiles(); const sel = $("#code-file"); const cur = sel.value;
  sel.innerHTML = Object.keys(files).map(k => `<option ${k === cur ? "selected" : ""}>${esc(k)}</option>`).join("");
  $("#code-view").textContent = files[sel.value] || "";
}
$("#code-file").addEventListener("change", renderCode);
const _update = update; update = function () { _update(); renderCode(); };
const _load = load; load = function (m, r, rep) { _load(m, r, rep); renderCode(); };
function excelBuffer() { const wb = XLSX.utils.book_new(); for (const [n, rows] of Object.entries(C.modelToSheets(model, rules))) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), n); return XLSX.write(wb, { type: "array", bookType: "xlsx" }); }
$("#dl-code").addEventListener("click", async () => {
  if (!window.JSZip) return toast("Libreria zip non caricata");
  const zip = new JSZip(); for (const [k, v] of Object.entries(codeFiles())) zip.file(k, v);
  if (window.XLSX) zip.file(`templates/OntoGraph-Aurora21.xlsx`, excelBuffer());
  const blob = await zip.generateAsync({ type: "blob" });
  if (await saveFile(`${(model.meta.project || "modello").toLowerCase().replace(/[^a-z0-9_-]+/g,"-")}-codice-${(model.meta.model_version || "x").replace(/\./g, "_")}.zip`, blob)) toast("Codice esportato per la revisione locale");
});
