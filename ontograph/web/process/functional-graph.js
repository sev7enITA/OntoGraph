/* Functional graph contract and inert code generators, shared by browser and server. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DGFunctionalGraph = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const LIMITS = Object.freeze({nodes:500, edges:1000, coordinate:100000, label:500, description:4000, condition:2000});
  const KINDS = ['start','task','decision','end','note'];
  const TITLES = {start:'Inizio',task:'Attività',decision:'Decisione',end:'Fine',note:'Nota'};
  const BAD = new Set(['__proto__','prototype','constructor']);
  const ID = /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const object = o => o !== null && typeof o === 'object' && !Array.isArray(o) && [Object.prototype,null].includes(Object.getPrototypeOf(o));
  const safeId = id => typeof id === 'string' && ID.test(id) && !BAD.has(id);
  const textLength = s => Array.from(s).length;
  function validateGraph(graph, process) {
    const errors=[], warnings=[], seen=new WeakSet();
    function safe(v, depth=0) {
      if (!v || typeof v !== 'object') return;
      if (depth > 8 || seen.has(v)) { errors.push('Grafo: struttura ciclica o troppo profonda.'); return; }
      seen.add(v);
      if (!Array.isArray(v) && !object(v)) { errors.push('Grafo: oggetto non JSON.'); return; }
      for (const k of Object.keys(v)) {
        if (BAD.has(k)) errors.push('Grafo: proprietà non sicura '+k+'.');
        safe(v[k],depth+1);
      }
      seen.delete(v);
    }
    safe(graph);
    function shape(o, allowed, required, where) {
      if (!object(o)) { errors.push(where+': oggetto richiesto.'); return false; }
      for (const k of Object.keys(o)) if (!allowed.includes(k)) errors.push(where+': proprietà non ammessa '+k+'.');
      for (const k of required) if (!own(o,k)) errors.push(where+': manca '+k+'.');
      return true;
    }
    function text(o,k,max,where) {
      if (own(o,k) && (typeof o[k] !== 'string' || textLength(o[k])>max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(o[k]))) errors.push(where+': '+k+' deve essere testo valido (massimo '+max+' caratteri).');
    }
    if (!shape(graph,['version','nodes','edges','layout'],['version','nodes','edges','layout'],'Grafo')) return {errors,warnings};
    if (graph.version!==1) errors.push('Grafo: versione non supportata.');
    if (!Array.isArray(graph.nodes) || graph.nodes.length>LIMITS.nodes) errors.push('Grafo: nodes deve contenere al massimo '+LIMITS.nodes+' nodi.');
    if (!Array.isArray(graph.edges) || graph.edges.length>LIMITS.edges) errors.push('Grafo: edges deve contenere al massimo '+LIMITS.edges+' collegamenti.');
    const nodes=Array.isArray(graph.nodes)?graph.nodes.slice(0,LIMITS.nodes+1):[], edges=Array.isArray(graph.edges)?graph.edges.slice(0,LIMITS.edges+1):[];
    const ids=new Set(), edgeIds=new Set(), tasks=new Set(), subprocesses=new Set((process?.subprocesses||[]).map(s=>s.id));
    for (const n of nodes) {
      if (!shape(n,['id','kind','subprocess_id','label','description'],['id','kind'],'Nodo')) continue;
      const where='Nodo '+String(n.id);
      if (!safeId(n.id) || ids.has(n.id)) errors.push(where+': ID non valido o duplicato.');
      ids.add(n.id);
      if (!KINDS.includes(n.kind)) errors.push(where+': tipo non ammesso.');
      if (n.kind==='task') {
        if (typeof n.subprocess_id!=='string' || !subprocesses.has(n.subprocess_id)) errors.push(where+': sottoprocesso non presente in questo processo.');
        if (tasks.has(n.subprocess_id)) errors.push(where+': sottoprocesso già presente nel grafo.');
        tasks.add(n.subprocess_id);
        if (own(n,'label') || own(n,'description')) errors.push(where+': nome e proprietà attività si modificano nel censimento.');
      } else {
        if (own(n,'subprocess_id')) errors.push(where+': subprocess_id ammesso solo per attività.');
        text(n,'label',LIMITS.label,where); text(n,'description',LIMITS.description,where);
      }
    }
    for (const e of edges) {
      if (!shape(e,['id','from','to','label','condition'],['id','from','to'],'Collegamento')) continue;
      const where='Collegamento '+String(e.id);
      if (!safeId(e.id) || edgeIds.has(e.id) || ids.has(e.id)) errors.push(where+': ID non valido o duplicato.');
      edgeIds.add(e.id);
      if (!ids.has(e.from) || !ids.has(e.to)) errors.push(where+': nodo origine o destinazione sconosciuto.');
      text(e,'label',LIMITS.label,where); text(e,'condition',LIMITS.condition,where);
    }
    if (shape(graph.layout,['positions'],['positions'],'Layout') && shape(graph.layout.positions,Object.keys(graph.layout.positions||{}),[],'Posizioni')) {
      for (const [id,pos] of Object.entries(graph.layout.positions)) {
        if (!safeId(id) || !ids.has(id)) errors.push('Posizione '+id+': nodo sconosciuto.');
        if (shape(pos,['x','y'],['x','y'],'Posizione '+id)) for (const k of ['x','y']) if (typeof pos[k]!=='number' || !Number.isFinite(pos[k]) || Math.abs(pos[k])>LIMITS.coordinate) errors.push('Posizione '+id+': '+k+' non valida.');
      }
    }
    if (!errors.length && nodes.length) {
      if (!nodes.some(n=>n.kind==='start')) warnings.push('Lo schema non contiene un nodo Inizio.');
      if (!nodes.some(n=>n.kind==='end')) warnings.push('Lo schema non contiene un nodo Fine.');
      for (const n of nodes) {
        const outgoing=edges.filter(e=>e.from===n.id), incoming=edges.filter(e=>e.to===n.id);
        if (n.kind!=='note' && !outgoing.length && !incoming.length) warnings.push('Nodo '+n.id+': non collegato.');
        if (n.kind==='decision' && outgoing.length<2) warnings.push('Decisione '+n.id+': meno di due uscite.');
        if (n.kind==='decision' && outgoing.some(e=>!e.condition?.trim() && !e.label?.trim())) warnings.push('Decisione '+n.id+': descrivere le alternative in uscita.');
        if (n.kind==='start' && incoming.length) warnings.push('Inizio '+n.id+': contiene collegamenti in ingresso.');
        if (n.kind==='end' && outgoing.length) warnings.push('Fine '+n.id+': contiene collegamenti in uscita.');
      }
      if (subprocesses.size>tasks.size) warnings.push('Alcuni passi censiti non sono presenti nello schema.');
    }
    return {errors,warnings};
  }
  function validateModel(model) {
    const result={errors:[],warnings:[]};
    for (const p of model.processes||[]) if (own(p,'functional_graph')) {
      const r=validateGraph(p.functional_graph,p);
      for (const key of ['errors','warnings']) result[key].push(...r[key].map(x=>p.id+': '+x));
    }
    return result;
  }
  function seed(process) {
    const nodes=[{id:'start',kind:'start',label:'Inizio'}, ...(process.subprocesses||[]).map((s,i)=>({id:'task_'+(i+1),kind:'task',subprocess_id:s.id})), {id:'end',kind:'end',label:'Fine'}];
    const positions={}, edges=[];
    nodes.forEach((n,i)=>{positions[n.id]={x:100+(i%4)*260,y:100+Math.floor(i/4)*180}; if(i)edges.push({id:'edge_'+i,from:nodes[i-1].id,to:n.id});});
    const graph={version:1,nodes,edges,layout:{positions}};
    assertValid(process,graph);
    return graph;
  }
  function assertValid(process,graph) { const r=validateGraph(graph,process); if(r.errors.length)throw new Error(r.errors.join('\n')); }
  function nodeLabel(process,node) { return node.kind==='task' ? (process.subprocesses||[]).find(s=>s.id===node.subprocess_id)?.name || node.subprocess_id : node.label || TITLES[node.kind] || node.id; }
  function nodeText(process,node) {
    if(node.kind!=='task')return [nodeLabel(process,node),node.description].filter(Boolean).join('\n');
    const sp=(process.subprocesses||[]).find(s=>s.id===node.subprocess_id);
    return [sp.id+': '+sp.name,'Tipo: '+(sp.type||''),'Sistemi: '+(sp.systems||[]).join(', '),'Owner: '+(sp.data_owner||''),'Trigger: '+(sp.trigger||'')].join('\n');
  }
  const diagramId=id=>'F_'+Array.from(id).map(c=>c.codePointAt(0).toString(16)).join('_');
  // Escape syntax, markup and directives as literal characters. No user text becomes code.
  const escapeMermaid=s=>Array.from(String(s)).map(c=>c==='\n'?'<br/>':/[A-Za-z0-9 \u0080-\uFFFF]/u.test(c)&&c!=='\u2028'&&c!=='\u2029'?c:'#'+c.codePointAt(0)+';').join('');
  const escapePlantUML=s=>Array.from(String(s)).map(c=>c==='\n'?'\\n':/[A-Za-z0-9 \u0080-\uFFFF]/u.test(c)&&c!=='\u2028'&&c!=='\u2029'?c:'&#'+c.codePointAt(0)+';').join('');
  const edgeText=e=>[e.label,e.condition?'Condizione: '+e.condition:''].filter(Boolean).join('\n');
  function toMermaid(process,graph=process.functional_graph) {
    assertValid(process,graph);
    const lines=['flowchart TD','  %% Schema funzionale documentale: condizioni non eseguite.'];
    for(const n of graph.nodes) {
      const t=escapeMermaid(nodeText(process,n)), id=diagramId(n.id);
      const shape=n.kind==='decision'?`{"${t}"}`:['start','end'].includes(n.kind)?`(["${t}"])`:`["${t}"]`;
      lines.push('  '+id+shape+(n.kind==='note'?':::note':''));
    }
    for(const e of graph.edges) { const t=edgeText(e); lines.push('  '+diagramId(e.from)+(t?' -->|"'+escapeMermaid(t)+'"| ':' --> ')+diagramId(e.to)); }
    lines.push('  classDef note fill:#fff7db,stroke:#987b2a,stroke-dasharray:4 3;');
    return lines.join('\n');
  }
  function toPlantUML(process,graph=process.functional_graph) {
    assertValid(process,graph);
    const lines=['@startuml','hide empty description','skinparam shadowing false','title '+escapePlantUML(process.id+': '+process.name),"' Schema funzionale documentale: condizioni non eseguite."];
    for(const n of graph.nodes) {
      const id=diagramId(n.id), t=escapePlantUML(nodeText(process,n)), stereotype={start:'start',decision:'choice',end:'end'}[n.kind];
      if(stereotype) {lines.push('state '+id+' <<'+stereotype+'>>');lines.push('note right of '+id+' : '+t);}
      else lines.push((n.kind==='note'?'note':'state')+' "'+t+'" as '+id);
    }
    for(const e of graph.edges)lines.push(diagramId(e.from)+' --> '+diagramId(e.to)+(edgeText(e)?' : '+escapePlantUML(edgeText(e)):''));
    lines.push('@enduml');return lines.join('\n');
  }
  function semanticGraph(graph) { return {version:graph.version,nodes:graph.nodes,edges:graph.edges}; }
  function generatedFiles(model) {
    const files={};
    for(const p of model.processes||[])if(own(p,'functional_graph')) {
      if(!/^P\d+$/.test(p.id))throw new Error('ID processo non valido per esportazione.');
      const g=p.functional_graph;assertValid(p,g);
      files['diagrams/functional/'+p.id+'.json']=JSON.stringify(g,null,2)+'\n';
      files['diagrams/functional/'+p.id+'.mmd']=toMermaid(p,g);
      files['diagrams/functional/'+p.id+'.puml']=toPlantUML(p,g);
    }
    return files;
  }
  const GRAPH_SHEETS = {
    Schemi:['Processo','Versione'],
    SchemaNodi:['Processo','ID','Tipo','SottoProcesso','Etichetta','Descrizione','X','Y','Campi presenti'],
    SchemaCollegamenti:['Processo','ID','Da','A','Etichetta','Condizione','Campi presenti']
  };
  const GRAPH_HELP = {
    Schemi:'Un processo per riga, anche se lo schema è vuoto. Versione del formato: 1. Fogli opzionali per gli schemi funzionali.',
    SchemaNodi:'Tipi: start, task, decision, end, note. I task riferiscono un SottoProcesso. X/Y sono coordinate. Campi presenti conserva proprietà testuali vuote.',
    SchemaCollegamenti:'Da e A riferiscono ID di nodi dello stesso processo. Condizione è testo documentale, non codice eseguito.'
  };
  function graphRows(model) {
    const rows=Object.fromEntries(Object.keys(GRAPH_SHEETS).map(k=>[k,[]]));
    for(const p of model.processes||[])if(own(p,'functional_graph')) {
      const g=p.functional_graph;assertValid(p,g);
      rows.Schemi.push({Processo:p.id,Versione:g.version});
      for(const n of g.nodes) {
        const pos=g.layout.positions[n.id]||{};
        rows.SchemaNodi.push({Processo:p.id,ID:n.id,Tipo:n.kind,SottoProcesso:n.subprocess_id||'',Etichetta:n.label??'',Descrizione:n.description??'',X:pos.x??'',Y:pos.y??'','Campi presenti':['label','description'].filter(k=>own(n,k)).join(';')});
      }
      for(const e of g.edges)rows.SchemaCollegamenti.push({Processo:p.id,ID:e.id,Da:e.from,A:e.to,Etichetta:e.label??'',Condizione:e.condition??'','Campi presenti':['label','condition'].filter(k=>own(e,k)).join(';')});
    }
    return rows;
  }
  function applyGraphRows(model,rows) {
    const report={errors:[],warnings:[]}, processes=new Map(model.processes.map(p=>[p.id,p])), graphs=new Map();
    for(const r of rows.Schemi||[]) {
      const pid=r.Processo;
      if(!processes.has(pid)||graphs.has(pid)){report.errors.push('Schemi: processo sconosciuto o duplicato '+pid);continue;}
      graphs.set(pid,{version:Number(r.Versione)===1?1:null,nodes:[],edges:[],layout:{positions:{}}});
    }
    for(const name of ['SchemaNodi','SchemaCollegamenti'])for(const r of rows[name]||[]) {
      const g=graphs.get(r.Processo);
      if(!g){report.errors.push(name+': processo senza dichiarazione nel foglio Schemi.');continue;}
      const isNode=name==='SchemaNodi', item={id:r.ID};
      if(isNode){item.kind=r.Tipo;if(r.SottoProcesso)item.subprocess_id=r.SottoProcesso;}
      else {item.from=r.Da;item.to=r.A;}
      const fields=String(r['Campi presenti']||'').split(';').map(x=>x.trim()).filter(Boolean);
      const allowed=isNode?{label:'Etichetta',description:'Descrizione'}:{label:'Etichetta',condition:'Condizione'};
      if(fields.some(k=>!own(allowed,k)))report.errors.push(name+': Campi presenti non validi.');
      for(const [k,col] of Object.entries(allowed))if(r[col]||fields.includes(k))item[k]=r[col]||'';
      g[isNode?'nodes':'edges'].push(item);
      if(isNode&&(r.X!==''||r.Y!=='')) {
        const pos={x:r.X===''?null:Number(r.X),y:r.Y===''?null:Number(r.Y)};
        if(!safeId(item.id)){report.errors.push(name+': ID posizione non valido.');continue;}
        if(own(g.layout.positions,item.id))report.errors.push(name+': posizione duplicata.');
        g.layout.positions[item.id]=pos;
      }
    }
    for(const [pid,g] of graphs)processes.get(pid).functional_graph=g;
    const validation=validateModel(model);
    for(const key of ['errors','warnings'])report[key].push(...validation[key]);
    return report;
  }
  return {GRAPH_SHEETS,GRAPH_HELP,graphRows,applyGraphRows,LIMITS,KINDS,safeId,seed,validateGraph,validateModel,nodeLabel,nodeText,semanticGraph,toMermaid,toPlantUML,generatedFiles};
});
