// Functional modelling workspace. Graph state is explicit and stored in the census.
const DGFunctionalEditor = (() => {
  const G = DGFunctionalGraph, host = $('#functional-editor');
  const clone = value => JSON.parse(JSON.stringify(value));
  let boundModel = null, boundProcess = null, signature = '', past = [], future = [], selected = null;
  let ownChange = false, connecting = false, origin = null, drag = null, suppressClick = false;
  let view = { x: 0, y: 0, w: 1100, h: 600 }, drafts = new Map(), mergeKey = null, mergeTime = 0;
  const editable = () => true;
  const graph = () => proc()?.functional_graph;
  const snapshot = () => JSON.stringify(proc() || null);
  const pending = () => drafts.has(pid);
  const name = node => G.nodeLabel(proc(), node);
  const button = (action, label, extra = '') => `<button type="button" class="btn small" data-fe="${action}" ${extra}>${label}</button>`;
  host.innerHTML = `<div class="fe-heading"><div><p class="eyebrow">From model to code</p><h2>Process Modeler</h2><p>Refine the diagram, properties, and links in the current model.</p></div><span id="fe-access" class="fe-access"></span></div>
    <div class="fe-command"><label class="f fe-process">Process<select id="fe-process"></select></label><div class="fe-history">${button('undo','↶ Undo','data-fe-edit id="fe-undo"')}${button('redo','↷ Redo','data-fe-edit id="fe-redo"')}${button('layout','Auto-layout','data-fe-edit')}${button('fit','Fit')}${button('actual','100%','aria-label="View diagram at 100%"')}<span class="fe-zoom-set">${button('out','−','aria-label="Zoom out"')}<output id="fe-zoom">100%</output>${button('in','+','aria-label="Zoom in"')}</span></div></div>
    <div class="fe-layout"><aside class="fe-palette" aria-label="Modeler tools"><h3>Elements</h3><div class="fe-tools">${button('add-start','○ Start','data-fe-edit')}${button('add-task','▭ Activity','data-fe-edit')}${button('add-decision','◇ Decision','data-fe-edit')}${button('add-end','◉ End','data-fe-edit')}${button('add-note','▤ Note','data-fe-edit')}</div><label class="f">Existing inventory step<select id="fe-existing"></select></label>${button('existing','Add to canvas','data-fe-edit id="fe-add-existing"')}<hr>${button('connect','↗ Connect','data-fe-edit id="fe-connect" aria-pressed="false"')}${button('delete','Remove from canvas','data-fe-edit id="fe-delete"')}<p class="fe-small">Removing an activity from the canvas keeps its inventory step.</p><details><summary>Keyboard shortcuts</summary><p class="fe-small">Tab moves between elements. Use the arrows to move a node, or hold Shift to move it by 20 px. In Connect mode, press Enter to select the source and target. Delete removes the selection. Esc cancels a connection. Ctrl/⌘+Z undoes the change. Shift+Ctrl/⌘+Z redoes it. Drag the background to pan.</p></details></aside>
    <div class="fe-stage"><div id="fe-canvas" tabindex="0" role="region" aria-label="Process diagram canvas"></div><p id="fe-status" class="fe-status" role="status" aria-live="polite"></p><p class="fe-small">Conditions describe the process for review. The canvas models actions on external systems.</p></div>
    <aside class="fe-inspector" aria-label="Live properties"><div class="fe-inspector-title"><h3>Live properties</h3><span id="fe-kind"></span></div><div id="fe-properties"></div></aside></div>
    <details id="fe-validation" class="fe-validation"><summary id="fe-validation-title">Diagram validation</summary><ul id="fe-validation-list"></ul></details>
    <section class="fe-code" aria-label="Code and snippets"><div class="fe-code-heading"><div><h3>Code and snippets</h3><p class="fe-small">JSON preserves coordinates. Mermaid and PlantUML compute their own layouts. The ZIP includes the model, diagrams, and workbook for transfer.</p></div><div class="row">${button('zip','Export project ZIP')}${button('svg','Download SVG')}</div></div><div class="fe-code-toolbar"><label class="f">Format<select id="fe-format"><option value="json">Editable JSON</option><option value="mermaid">Mermaid</option><option value="plantuml">PlantUML</option></select></label><div class="row">${button('copy','Copy snippet')}${button('download','Download snippet')}${button('apply','Apply JSON','data-fe-edit id="fe-apply"')}${button('discard-json','Discard JSON edits','data-fe-edit id="fe-discard"')}</div></div><label class="sr-only" for="fe-source">Diagram source</label><textarea id="fe-source" spellcheck="false" wrap="off"></textarea><p id="fe-code-state" role="status"></p></section>`;
  const status = message => { $('#fe-status').textContent = message; };
  const sourceText = () => !graph() ? '' : $('#fe-format').value === 'mermaid' ? G.toMermaid(proc(), graph()) : $('#fe-format').value === 'plantuml' ? G.toPlantUML(proc(), graph()) : JSON.stringify(graph(), null, 2);
  function permissions() {
    if (!host) return;
    const edit = editable(), exists = !!graph();
    host.querySelectorAll('[data-fe-edit]').forEach(b => b.disabled = !edit || (!exists && !['seed'].includes(b.dataset.fe)));
    $('#fe-undo').disabled = !edit || !past.length || pending(); $('#fe-redo').disabled = !edit || !future.length || pending();
    $('#fe-delete').disabled = !edit || !selected || pending(); $('#fe-add-existing').disabled = !edit || !exists || !$('#fe-existing').value || pending();
    $('#fe-apply').disabled = !edit || !pending() || $('#fe-format').value !== 'json'; $('#fe-discard').disabled = !edit || !pending();
    $('#fe-source').readOnly = !edit || $('#fe-format').value !== 'json' || !exists;
    $('#fe-properties').querySelectorAll('input,select,textarea').forEach(el => el.disabled = !edit || pending());
    $('#fe-access').textContent = edit ? 'Editable draft' : 'Read only'; $('#fe-access').classList.toggle('readonly', !edit);
  }
  function code() {
    $('#fe-source').value = $('#fe-format').value === 'json' && pending() ? drafts.get(pid) : sourceText();
    $('#fe-code-state').textContent = pending() ? 'Unapplied JSON edits stay available when you switch processes. Apply or discard them before editing the canvas, saving, or exporting.' : graph() ? 'Source for the current model. The browser saves applied changes.' : 'Create a diagram to generate source.';
    permissions();
  }
  function sync() {
    if (!model) return;
    if (boundModel !== model) { boundModel = model; boundProcess = null; drafts.clear(); }
    if (boundProcess !== pid || (!ownChange && signature !== snapshot())) { past = []; future = []; selected = null; origin = null; connecting = false; mergeKey = null; drag = null; view = { x: 0, y: 0, w: 1100, h: 600 }; }
    boundProcess = pid; signature = snapshot();
    $('#fe-process').innerHTML = model.processes.map(p => `<option value="${esc(p.id)}" ${pid === p.id ? 'selected' : ''}>${esc(p.id)} · ${esc(p.name)}</option>`).join('');
    const used = new Set((graph()?.nodes || []).filter(n => n.kind === 'task').map(n => n.subprocess_id));
    $('#fe-existing').innerHTML = '<option value="">Select a step</option>' + (proc()?.subprocesses || []).filter(sp => !used.has(sp.id)).map(sp => `<option value="${esc(sp.id)}">${esc(sp.id)} · ${esc(sp.name)}</option>`).join('');
    canvas(); inspector(); code(); validate(); permissions();
  }
  function mutation(fn, key = null, keepInspector = false) {
    if (!editable()) return status('This version is read only.');
    if (pending()) return status('Apply or discard JSON edits before editing the canvas.');
    if (!proc()) return;
    const before = snapshot(), now = Date.now();
    try { fn(); } catch (error) { const p = proc(); Object.keys(p).forEach(k => delete p[k]); Object.assign(p, JSON.parse(before)); status('Could not apply change: ' + error.message); return false; }
    const check = graph() ? G.validateGraph(graph(), proc()) : { errors: [] };
    if (check.errors.length) { Object.keys(proc()).forEach(k => delete proc()[k]); Object.assign(proc(), JSON.parse(before)); status(check.errors.join(' ')); return false; }
    if (before === snapshot()) return false;
    if (!key || key !== mergeKey || now - mergeTime > 900) { past.push(before); if (past.length > 60) past.shift(); }
    future = []; mergeKey = key; mergeTime = now;
    changed(keepInspector); return true;
  }
  function changed(keepInspector = false) {
    ownChange = true; signature = snapshot();
    recompute(); renderKpis(); renderSteps(); renderDiagram(); renderVerdicts(); renderCode(); save();
    ownChange = false; canvas(); if (!keepInspector) inspector(); code(); validate(); permissions();
  }
  function validate() {
    const result = graph() ? G.validateGraph(graph(), proc()) : { errors: [], warnings: [] };
    $('#fe-validation-title').textContent = result.errors.length ? `${result.errors.length} diagram errors` : result.warnings.length ? `${result.warnings.length} completeness warnings` : 'Diagram matches the inventory';
    $('#fe-validation-list').innerHTML = [...result.errors, ...result.warnings].map(s => `<li>${esc(s)}</li>`).join('') || '<li>No structural errors. Human review is required.</li>';
  }
  function position(node, i) { return graph().layout.positions[node.id] || { x: 70 + i % 4 * 250, y: 70 + Math.floor(i / 4) * 150 }; }
  function bounds() {
    const ps = (graph()?.nodes || []).map(position); if (!ps.length) return { x: 0, y: 0, w: 1100, h: 600 };
    const x = Math.min(...ps.map(p => p.x)) - 110, y = Math.min(...ps.map(p => p.y)) - 110;
    return { x, y, w: Math.max(450, Math.max(...ps.map(p => p.x)) - x + 265), h: Math.max(320, Math.max(...ps.map(p => p.y)) - y + 165) };
  }
  const wrap = (s, width = 23) => { const words = String(s).split(/\s+/), rows = []; let row = ''; for (const word of words) { if ((row + ' ' + word).trim().length > width && row) { rows.push(row); row = ''; } row += (row ? ' ' : '') + word; } if (row) rows.push(row); return rows.slice(0, 3).map((r,i,a) => i === 2 && rows.length > 3 ? r.slice(0,21)+'…' : r); };
  function svgMarkup(exporting = false) {
    const g = graph(); if (!g) return ''; const box = exporting ? bounds() : view;
    const map = new Map(g.nodes.map((n,i) => [n.id, { n, ...position(n,i) }]));
    const edges = g.edges.map(edge => {
      const a = map.get(edge.from), b = map.get(edge.to); if (!a || !b) return '';
      const x1 = a.x + 200, y1 = a.y + 46, x2 = b.x, y2 = b.y + 46;
      const loop = edge.from === edge.to, bend = Math.max(70, Math.abs(x2-x1)*.45);
      const d = loop ? `M ${a.x+100} ${a.y} C ${a.x+100} ${a.y-85} ${a.x+265} ${a.y-85} ${a.x+200} ${a.y+46}` : `M ${x1} ${y1} C ${x1+bend} ${y1} ${x2-bend} ${y2} ${x2} ${y2}`;
      const label = [edge.label, edge.condition].filter(Boolean).join(': '), lx = loop ? a.x+180 : (x1+x2)/2, ly = loop ? a.y-45 : (y1+y2)/2-9;
      return `<g ${exporting ? '' : `data-fe-edge="${esc(edge.id)}" tabindex="0" role="button" aria-label="Connection ${esc(label || edge.id)}"`}><path d="${d}" fill="none" stroke="transparent" stroke-width="18"/><path d="${d}" fill="none" stroke="${!exporting && selected?.id === edge.id ? '#67e8f9' : '#7697ad'}" stroke-width="${!exporting && selected?.id === edge.id ? 3 : 2}" marker-end="url(#fe-arrow)"/>${label ? `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="12" fill="#cfe7f4" stroke="#081321" stroke-width="5" paint-order="stroke">${esc(label.slice(0,60))}</text>` : ''}<title>${esc(label || edge.id)}</title></g>`;
    }).join('');
    const nodes = g.nodes.map((n,i) => {
      const p = position(n,i), chosen = !exporting && selected?.id === n.id, st = n.kind === 'task' ? (proc().subprocesses || []).find(s => s.id === n.subprocess_id) : null;
      const color = n.kind === 'decision' ? '#342f24' : n.kind === 'note' ? '#1c3040' : '#132b3f';
      const outline = chosen || (!exporting && origin === n.id) ? '#67e8f9' : n.kind === 'decision' ? '#e6bb75' : '#5e8aa6';
      const shape = n.kind === 'decision' ? '<polygon points="100,0 200,46 100,92 0,46"/>' : `<rect width="200" height="92" rx="${['start','end'].includes(n.kind) ? 44 : n.kind === 'note' ? 0 : 6}"/>${n.kind === 'end' ? '<rect x="6" y="6" width="188" height="80" rx="39" fill="none"/>' : ''}`;
      const lines = wrap(name(n), n.kind === 'decision' ? 17 : 24), labelY = 42 - (lines.length-1)*8;
      const caption = st ? `${st.type || ''} · ${st.master?.[0]?.system || 'lead system unassigned'}` : ({start:'START',end:'END',decision:'DECISION',note:'NOTE'}[n.kind]);
      return `<g transform="translate(${p.x} ${p.y})" ${exporting ? '' : `data-fe-node="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc(name(n))}, ${esc(n.kind)}" aria-pressed="${chosen}"`}><title>${esc(name(n))}</title><g fill="${color}" stroke="${outline}" stroke-width="${chosen ? 3 : 1.5}">${shape}</g><text x="100" y="${labelY}" text-anchor="middle" fill="#e7f1fa" font-size="13" font-weight="600">${lines.map((line,j) => `<tspan x="100" dy="${j ? 16 : 0}">${esc(line)}</tspan>`).join('')}</text><text x="100" y="77" text-anchor="middle" fill="#aabfd2" font-size="10">${esc(caption)}</text></g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}" ${exporting ? `width="${Math.ceil(box.w)}" height="${Math.ceil(box.h)}"` : ''} aria-label="${esc(proc()?.name || 'Process diagram')}" font-family="sans-serif"><defs><marker id="fe-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#7697ad"/></marker></defs>${exporting ? `<metadata>${esc(JSON.stringify({process:pid,project:model.meta.project,source:'functional_graph',exportedAt:new Date().toISOString()}))}</metadata><rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" fill="#081321"/>` : ''}${edges}${nodes}</svg>`;
  }
  function canvas() {
    const focusId = document.activeElement?.dataset?.feNode, focused = document.activeElement?.closest('#fe-canvas');
    const g = graph();
    $('#fe-canvas').innerHTML = !proc() ? '<div class="fe-empty"><strong>No process</strong><p>Add a process in the Inventory view.</p></div>' : !g ? `<div class="fe-empty"><span class="fe-empty-symbol">◇</span><strong>Create a process diagram</strong><p>Generate a diagram from the inventory steps, then add decisions and paths.</p>${button('seed','Create diagram from steps','data-fe-edit class="btn primary"')}</div>` : svgMarkup() + (!g.nodes.length ? '<div class="fe-empty fe-empty-passive"><strong>Empty canvas</strong><p>Add elements using the modeler tools.</p></div>' : '');
    $('#fe-connect').setAttribute('aria-pressed', String(connecting)); $('#fe-canvas').classList.toggle('connecting', connecting);
    $('#fe-zoom').textContent = `${Math.round(100 * ($('#fe-canvas').clientWidth || 900) / view.w)}%`;
    if (focused && focusId) host.querySelector(`[data-fe-node="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true});
    permissions();
  }
  function inspector() {
    const g = graph(), n = selected?.type === 'node' && g?.nodes.find(n => n.id === selected.id), edge = selected?.type === 'edge' && g?.edges.find(e => e.id === selected.id);
    const field = (label, key, value, type = 'input', options = '') => `<label class="f">${label}${type === 'select' ? `<select data-fe-field="${key}">${options}</select>` : type === 'textarea' ? `<textarea data-fe-field="${key}" rows="3" maxlength="${key === 'condition' ? 2000 : 4000}">${esc(value || '')}</textarea>` : `<input data-fe-field="${key}" value="${esc(value || '')}" maxlength="500">`}</label>`;
    $('#fe-kind').textContent = n ? ({start:'Start',task:'Activity',decision:'Decision',end:'End',note:'Note'}[n.kind]) : edge ? 'Connection' : '';
    if (!n && !edge) { $('#fe-properties').innerHTML = '<p class="fe-small">Select an element or connection. Property changes update the model and source immediately.</p>'; return; }
    if (edge) { $('#fe-properties').innerHTML = `<p class="fe-id">${esc(edge.id)}</p><p class="fe-small">${esc(name(g.nodes.find(n => n.id === edge.from)))} → ${esc(name(g.nodes.find(n => n.id === edge.to)))}</p>${field('Label','label',edge.label)}${field('Descriptive condition','condition',edge.condition,'textarea')}<p class="fe-small">Text for process documentation.</p>`; }
    else if (n.kind === 'task') {
      const sp = proc().subprocesses.find(s => s.id === n.subprocess_id), options = (entries,value) => '<option value="">Unassigned</option>' + entries.map(([id,label]) => `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(label)}</option>`).join('');
      $('#fe-properties').innerHTML = `<p class="fe-id">${esc(n.id)} · step ${esc(sp.id)}</p>${field('Activity name','name',sp.name)}${field('Trigger','trigger',sp.trigger)}${field('Type C / T / R','type',sp.type,'select',['C','T','R'].map(t=>`<option ${t===sp.type?'selected':''}>${t}</option>`).join(''))}${field('Primary lead system','master',null,'select',options(Object.entries(model.systems).map(([k,s])=>[k,s.label || k]),sp.master?.[0]?.system))}${field('Data owner','data_owner',null,'select',options(Object.entries(model.owners).map(([k,o])=>[k,o.responsible || k]),sp.data_owner))}${button('open-step','Open full step details')}<p class="fe-small">The diagram references the inventory step for its name, trigger, and ownership.</p>`;
    } else $('#fe-properties').innerHTML = `<p class="fe-id">${esc(n.id)}</p>${field('Label','label',n.label)}${field('Description','description',n.description,'textarea')}`;
    permissions();
  }
  function unique(prefix, ids) { let i = 1; while (ids.has(prefix+i)) i++; return prefix+i; }
  function add(kind, subprocessId = null) {
    if (!graph()) return;
    mutation(() => {
      const p = proc(), g = graph();
      if (kind === 'task' && !subprocessId) {
        const ids = new Set(model.processes.flatMap(p=>p.subprocesses.map(s=>s.id))), id = unique(p.id.slice(1)+'.',ids), sys = Object.keys(model.systems)[0];
        p.subprocesses.push({id,name:'New activity',type:'C',trigger:'',systems:sys?[sys]:[],flows:[],master:sys?[{system:sys,role:''}]:[],entities_in:[],entities_out:[],data_owner:p.area || '',criticality:{open:false,text:''},open_points:[],extra_system_steps:[],verified:false}); subprocessId = id;
      }
      if (kind === 'task' && (!p.subprocesses.some(s=>s.id===subprocessId) || g.nodes.some(n=>n.subprocess_id===subprocessId))) return;
      const id = unique('N',new Set([...g.nodes,...g.edges].map(n=>n.id))), node = {id,kind}; if (kind==='task') node.subprocess_id=subprocessId; else node.label = {start:'Start',decision:'Decision',end:'End',note:'Note'}[kind];
      let spot; const occupied=g.nodes.map(position), columns=Math.max(1,Math.floor((view.w-80)/240)); for(let i=0;i<=g.nodes.length*4+1;i++){spot={x:Math.round(view.x+40+(i%columns)*240),y:Math.round(view.y+40+Math.floor(i/columns)*130)};if(!occupied.some(p=>Math.abs(p.x-spot.x)<220&&Math.abs(p.y-spot.y)<110))break;} g.nodes.push(node); g.layout.positions[id] = spot; selected={type:'node',id}; view.x=spot.x-view.w*.35;view.y=spot.y-view.h*.35;
    });
  }
  function selectNode(id) {
    if (connecting && editable() && !pending()) {
      if (!origin) { origin=id; status('Select a target node. Press Esc to cancel.'); canvas(); return; }
      const from=origin; const added=mutation(()=>{const g=graph();g.edges.push({id:unique('E',new Set([...g.nodes,...g.edges].map(e=>e.id))),from,to:id});}); origin=null;connecting=false;if(added)status('Connection added. Select it to set its label and condition.');canvas(); return;
    }
    selected={type:'node',id};canvas();inspector();
  }
  function remove() { if (!selected) return; mutation(()=>{const g=graph(); if(selected.type==='node'){g.nodes=g.nodes.filter(n=>n.id!==selected.id);g.edges=g.edges.filter(e=>e.from!==selected.id&&e.to!==selected.id);delete g.layout.positions[selected.id];}else g.edges=g.edges.filter(e=>e.id!==selected.id); selected=null;}); }
  function fit() { view=bounds(); const ratio=($('#fe-canvas').clientWidth||900)/($('#fe-canvas').clientHeight||500); if(view.w/view.h>ratio)view.h=view.w/ratio;else view.w=view.h*ratio;canvas(); }
  function initialViewport() {
    if (!graph()) return;
    const stage = $('#fe-canvas');
    if (!window.matchMedia('(max-width: 680px)').matches || !stage.clientWidth) {
      fit();
      return;
    }
    const box = bounds(), readableScale = .6;
    view = { x: box.x+80, y: box.y+75, w: stage.clientWidth/readableScale, h: stage.clientHeight/readableScale };
    canvas();
  }
  function undo(redo=false) { if(!editable()||pending())return;const from=redo?future:past,to=redo?past:future;if(!from.length)return;to.push(snapshot());const restored=JSON.parse(from.pop()),p=proc();Object.keys(p).forEach(k=>delete p[k]);Object.assign(p,restored);selected=null;mergeKey=null;changed(); }
  function canExport(){if(pending()){status('Apply or discard JSON edits before exporting.');return false;}return !!graph();}
  host.addEventListener('click', async e => {
    const action=e.target.closest('[data-fe]')?.dataset.fe;
    if(!action)return;
    if(action==='seed'){mutation(()=>{proc().functional_graph=G.seed(proc());});fit();}
    else if(action.startsWith('add-'))add(action.slice(4));
    else if(action==='existing')add('task',$('#fe-existing').value);
    else if(action==='delete')remove();
    else if(action==='connect'){if(!editable()||pending())return;connecting=!connecting;origin=null;status(connecting?'To connect nodes, select the source and then the target.':'Selection mode.');canvas();}
    else if(action==='undo'||action==='redo')undo(action==='redo');
    else if(action==='layout'){mutation(()=>graph().nodes.forEach((n,i)=>{graph().layout.positions[n.id]={x:70+(i%4)*260,y:70+Math.floor(i/4)*160};}));fit();}
    else if(action==='fit')fit();
    else if(action==='actual'){const b=bounds();view={x:b.x,y:b.y,w:$('#fe-canvas').clientWidth||900,h:$('#fe-canvas').clientHeight||500};canvas();}
    else if(action==='in'||action==='out'){const f=action==='in'?.8:1.25;view.w=Math.max(200,Math.min(20000,view.w*f));view.h=view.w*($('#fe-canvas').clientHeight||500)/($('#fe-canvas').clientWidth||900);canvas();}
    else if(action==='open-step'){const n=graph().nodes.find(n=>n.id===selected.id);sel=n.subprocess_id;setVisible(false);renderSteps();$('#steps').querySelector(`[data-id="${CSS.escape(sel)}"]`)?.scrollIntoView({block:'center'});}
    else if(action==='apply'){
      if(!editable()||!pending())return;
      let candidate;try{candidate=JSON.parse(drafts.get(pid));}catch(error){$('#fe-code-state').textContent='Invalid JSON: '+error.message;return;}
      const result=G.validateGraph(candidate,proc());if(result.errors.length){$('#fe-code-state').textContent='No changes applied: '+result.errors.join(' ');return;}
      drafts.delete(pid);if(!mutation(()=>{proc().functional_graph=candidate;})){if(snapshot()===signature)code();}status('JSON applied to the model.');
    } else if(action==='discard-json'){if(!editable())return;drafts.delete(pid);code();inspector();}
    else if(['copy','download','svg','zip'].includes(action)){
      if(!canExport())return;
      if(action==='zip'){$('#dl-code').click();return;}
      const format=$('#fe-format').value,text=action==='svg'?svgMarkup(true):sourceText(),ext={json:'json',mermaid:'mmd',plantuml:'puml'}[format];
      if(action==='copy'){try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text);status('Snippet copied.');}catch(_){$('#fe-source').focus();$('#fe-source').select();status('The source is selected. Press Ctrl/⌘+C to copy it.');}return;}
      await saveFile(`${String(pid).replace(/[^a-zA-Z0-9_.-]/g,'_')}-funzionale.${action==='svg'?'svg':ext}`,new Blob([text],{type:action==='svg'?'image/svg+xml;charset=utf-8':'text/plain;charset=utf-8'}));
    }
  });
  $('#fe-properties').addEventListener('input',e=>{
    const key=e.target.dataset.feField;if(!key||!editable()||pending())return;const val=e.target.value;
    mutation(()=>{const g=graph();if(selected.type==='edge'){g.edges.find(x=>x.id===selected.id)[key]=val;return;}const n=g.nodes.find(x=>x.id===selected.id);if(n.kind!=='task'){n[key]=val;return;}const sp=proc().subprocesses.find(s=>s.id===n.subprocess_id);if(key==='master'){sp.master=sp.master||[];if(val){if(sp.master[0])sp.master[0].system=val;else sp.master.push({system:val,role:''});if(!sp.systems.includes(val))sp.systems.push(val);}else sp.master.shift();}else sp[key]=val;},`property:${selected.id}:${key}`,true);
  });
  $('#fe-process').addEventListener('change',e=>{pid=e.target.value;sel=null;renderProcSelect();renderSteps();renderDiagram();renderVerdicts();sync();});
  $('#fe-format').addEventListener('change',code);$('#fe-existing').addEventListener('change',permissions);
  $('#fe-source').addEventListener('input',()=>{if(!editable()||$('#fe-format').value!=='json'||!graph())return;const raw=$('#fe-source').value;if(raw===JSON.stringify(graph(),null,2))drafts.delete(pid);else drafts.set(pid,raw);$('#fe-code-state').textContent=pending()?'Use Apply JSON to validate and update the model.':'Source matches the model.';permissions();});
  const world=e=>{const svg=$('#fe-canvas svg');if(!svg)return null;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
  $('#fe-canvas').addEventListener('pointerdown',e=>{if(e.button!==0||!graph())return;const hit=e.target.closest('[data-fe-node]'),p=world(e);if(!p)return;if(hit){if(!editable()||pending()||connecting)return;const n=graph().nodes.find(n=>n.id===hit.dataset.feNode);drag={id:n.id,start:p,base:clone(position(n,graph().nodes.indexOf(n))),before:snapshot(),moved:false,pointer:e.pointerId};selected={type:'node',id:n.id};}else if(!e.target.closest('[data-fe-edge]'))drag={start:p,base:clone(view),pan:true,moved:false,pointer:e.pointerId};if(drag){$('#fe-canvas').setPointerCapture(e.pointerId);e.preventDefault();}});
  $('#fe-canvas').addEventListener('pointermove',e=>{if(!drag)return;const p=world(e);if(!p)return;if(drag.pan){const scale=view.w/($('#fe-canvas').clientWidth||900);if(!drag.client){drag.client={x:e.clientX,y:e.clientY};return;}view.x-=(e.clientX-drag.client.x)*scale;view.y-=(e.clientY-drag.client.y)*scale;drag.client={x:e.clientX,y:e.clientY};drag.moved=true;canvas();return;}if(!editable()||pending()){drag=null;return;}const dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(Math.abs(dx)+Math.abs(dy)<3&&!drag.moved)return;drag.moved=true;graph().layout.positions[drag.id]={x:Math.max(-99900,Math.min(99900,Math.round(drag.base.x+dx))),y:Math.max(-99900,Math.min(99900,Math.round(drag.base.y+dy)))};canvas();});
  function endDrag(cancel=false){if(!drag)return;const d=drag;drag=null;suppressClick=d.moved;if(!d.pan&&d.moved){if(cancel||!editable()){const p=proc(),old=JSON.parse(d.before);Object.keys(p).forEach(k=>delete p[k]);Object.assign(p,old);canvas();return;}past.push(d.before);if(past.length>60)past.shift();future=[];mergeKey=null;changed();}else if(!d.pan){selected={type:'node',id:d.id};inspector();}setTimeout(()=>suppressClick=false,0);}
  $('#fe-canvas').addEventListener('pointerup',()=>endDrag());$('#fe-canvas').addEventListener('pointercancel',()=>endDrag(true));
  $('#fe-canvas').addEventListener('click',e=>{if(suppressClick)return;const n=e.target.closest('[data-fe-node]'),edge=e.target.closest('[data-fe-edge]');if(n)selectNode(n.dataset.feNode);else if(edge){selected={type:'edge',id:edge.dataset.feEdge};canvas();inspector();}});
  $('#fe-canvas').addEventListener('keydown',e=>{
    const n=e.target.closest('[data-fe-node]'),edge=e.target.closest('[data-fe-edge]');
    if(e.key==='Enter'||e.key===' '){if(n){e.preventDefault();selectNode(n.dataset.feNode);}else if(edge){e.preventDefault();selected={type:'edge',id:edge.dataset.feEdge};canvas();inspector();}return;}
    if(e.key==='Escape'){connecting=false;origin=null;selected=null;canvas();inspector();return;}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(n)selected={type:'node',id:n.dataset.feNode};if(edge)selected={type:'edge',id:edge.dataset.feEdge};remove();return;}
    if(e.key.startsWith('Arrow')&&n){e.preventDefault();if(!editable()||pending())return;const id=n.dataset.feNode,delta=e.shiftKey?20:5;selected={type:'node',id};mutation(()=>{const node=graph().nodes.find(n=>n.id===id),p=position(node,graph().nodes.indexOf(node));graph().layout.positions[id]={x:p.x+(e.key==='ArrowLeft'?-delta:e.key==='ArrowRight'?delta:0),y:p.y+(e.key==='ArrowUp'?-delta:e.key==='ArrowDown'?delta:0)};},'move:'+id);}
  });
  host.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();undo(e.shiftKey);}});
  $('#fe-canvas').addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey)||!graph())return;e.preventDefault();const f=Math.exp(e.deltaY*.002);view.w=Math.max(200,Math.min(20000,view.w*f));view.h=view.w*$('#fe-canvas').clientHeight/$('#fe-canvas').clientWidth;canvas();},{passive:false});
  let canvasWidth = 0; new ResizeObserver(() => { const box=$('#fe-canvas'); if(!box.clientWidth || box.clientWidth===canvasWidth)return; canvasWidth=box.clientWidth; view.h=view.w*box.clientHeight/box.clientWidth; canvas(); }).observe($('#fe-canvas'));
  function setVisible(visible) {
    host.hidden = !visible;
    host.closest('main').classList.toggle('functional-mode', visible);
    $('#open-modeler').setAttribute('aria-pressed', String(visible));
    $('#close-modeler').setAttribute('aria-pressed', String(!visible));
    if (visible) { sync(); requestAnimationFrame(() => { if (!host.hidden) initialViewport(); }); }
  }
  function confirmLeave(){if(!drafts.size)return true;if(!window.confirm('Discard unapplied JSON edits and continue?'))return false;drafts.clear();return true;}
  for (const id of ['dl-code','dl-xlsx']) $('#'+id)?.addEventListener('click', e => { if(drafts.size){e.stopImmediatePropagation();e.preventDefault();toast('Apply or discard JSON edits before exporting the model.');} }, true);
  const oldSave=save;save=function(){oldSave();if(!ownChange)sync();};
  const oldRender=renderAll;renderAll=function(){oldRender();sync();};
  const oldProc=renderProcSelect;renderProcSelect=function(){oldProc();if(!ownChange)sync();};
  $('#open-modeler')?.addEventListener('click',()=>setVisible(true));
  $('#close-modeler')?.addEventListener('click',()=>setVisible(false));
  window.addEventListener('beforeunload',e=>{if(drafts.size){e.preventDefault();e.returnValue='';}});
  return {sync,permissions,setVisible,hasDraft:()=>drafts.size>0,confirmLeave,canEdit:editable};
})();
