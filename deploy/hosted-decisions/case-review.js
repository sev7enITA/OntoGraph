// Personal case models use ordinary release nodes and edges so edits survive export.
export function renderCaseReview(model,{t,editable,apply}) {
  const box=document.getElementById('personal-review');
  box.hidden=false;
  const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  const section=document.createDocumentFragment();
  section.append(el('h2',t('Review your app proposal','复核你的应用提案')),el('p',model.evidence[0]?.excerpt||model.purpose));
  const form=el('form',''), changes=[];
  function group(title){
    const details=el('details','');details.append(el('summary',title));form.append(details);return details;
  }
  function field(parent,label,value,tag='input'){
    const wrap=el('label',label),input=el(tag,'');input.value=value;input.required=true;input.maxLength=8192;input.disabled=!editable;
    wrap.append(input);parent.append(wrap);return input;
  }
  function nodes(title,nodes){
    const panel=group(title);
    for(const n of nodes){
      const row=el('fieldset','');row.append(el('legend',n.label));
      const name=field(row,t('Name','名称'),n.label),definition=field(row,t('Definition or test','定义或测试'),n.definition,'textarea');
      changes.push(draft=>{const dest=draft.nodes.find(v=>v.id===n.id);dest.label=name.value.trim();dest.definition=definition.value.trim();});
      panel.append(row);
    }
  }
  const groups=model.nodes.filter(n=>n.id.startsWith('group-'));
  nodes(t('Risks to test','待验证风险'),model.nodes.filter(n=>n.id.startsWith('risk-')));
  nodes(t('Dictionary','词典'),model.nodes.filter(n=>n.kind==='concept'&&!n.id.startsWith('group-')));
  nodes(t('Taxonomy categories','分类类别'),groups);
  const lookup=new Map(model.nodes.map(n=>[n.id,n.label]));
  function relations(title,edges){
    const panel=group(title);
    for(const e of edges){
      const label=el('label',lookup.get(e.source)+' · '+e.predicate);
      const select=el('select','');select.disabled=!editable;
      const choices=e.predicate==='broader'&&e.target.startsWith('group-')?groups:model.nodes.filter(n=>n.kind==='concept'&&!n.id.startsWith('group-')&&n.id!==e.source);
      for(const n of choices)select.add(new Option(n.label,n.id));select.value=e.target;label.append(select);panel.append(label);
      const idx=model.edges.indexOf(e);
      changes.push(draft=>{draft.edges[idx].target=select.value;});
    }
  }
  relations(t('Taxonomy membership','术语分类'),model.edges.filter(e=>e.predicate==='broader'));
  relations(t('Ontology relationships','本体关系'),model.edges.filter(e=>e.predicate==='dependsOn'&&lookup.has(e.target)&&model.nodes.some(n=>n.id===e.target&&n.kind==='concept'&&!n.id.startsWith('group-'))));
  if(editable){
    const button=el('button',t('Apply proposal edits','应用提案修改'));button.type='submit';form.append(button);
    form.onsubmit=async event=>{event.preventDefault();button.disabled=true;
      try{const draft=structuredClone(model);for(const change of changes)change(draft);await apply(draft);}
      finally{button.disabled=false;}
    };
  }
  section.append(form);box.replaceChildren(section);
}
