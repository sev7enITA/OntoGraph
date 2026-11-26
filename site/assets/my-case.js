import {propose} from './case-model.js?v=2';

const $=id=>document.getElementById(id);
const zh=document.documentElement.lang==='zh-Hans';
const t=(en,cn)=>zh?cn:en;
const entry=$('app-brief'), output=$('case-output'), status=$('case-status');
let proposal, workspace, generation=0;
function element(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
function list(title,items){
  const panel=document.createElement('section'),dl=document.createElement('dl');
  panel.append(element('h3',title),dl);
  for(const [label,detail] of items)dl.append(element('dt',label),element('dd',detail));
  return panel;
}
function reset(){generation++;proposal=null;output.hidden=true;status.textContent='';}
entry.addEventListener('input',reset);
$('case-example').onclick=()=>{
  reset();
  entry.value=t('Our library lends physical copies to readers. Two copies may share an ISBN. A loan should block only the borrowed copy.',
    '我们的图书馆向读者借出实体副本。两个副本可以共用同一个 ISBN，一次借阅只应锁定被借走的那一本。');
  entry.focus();
};
$('case-form').onsubmit=async event=>{
  event.preventDefault();reset();const current=generation;
  try{
    const id='case-'+crypto.randomUUID();
    const result=await propose(entry.value,zh,id);
    if(current!==generation)return;
    proposal=result;workspace=id;
    const {model,risks,terms}=result;
    const labels=Object.fromEntries(model.nodes.map(n=>[n.id,n.label]));
    const groups=model.nodes.filter(n=>n.id.startsWith('group-'));
    const relations=model.edges.filter(e=>e.predicate==='dependsOn' && !['review'].includes(e.source) && !e.source.startsWith('risk-'));
    const taxonomy=groups.map(g=>[g.label,terms.filter(x=>'group-'+x.group===g.id).map(x=>x.label).join(' · ')]);
    for(const e of model.edges.filter(e=>e.predicate==='broader'&&!e.target.startsWith('group-'))){
      taxonomy.push([labels[e.source],t('Type of ','上位概念为 ')+labels[e.target]]);
    }
    $('proposal-panels').replaceChildren(
      list(t('Risks to test','待验证风险'),risks.map(r=>[r.label,r.definition])),
      list(t('Proposed dictionary','拟议词典'),terms.map(x=>[x.label,x.definition+' '+t('From the brief','来自描述')+' · “'+x.signal+'”'])),
      list(t('Proposed taxonomy','拟议分类体系'),taxonomy),
      list(t('Proposed ontology','拟议本体'),relations.map(e=>[labels[e.source]+' → '+labels[e.target],t('Depends on','依赖于')]))
    );
    output.hidden=false;status.textContent=t('Proposal ready for review.','提案已生成，可开始复核。');
    $('proposal-title').focus();
  }catch(e){if(current===generation)status.textContent=e.message;}
};
$('case-open').onclick=()=>{
  if(!proposal)return;
  try{
    sessionStorage.setItem('ontograph:'+workspace,JSON.stringify(proposal.model));
    location.assign('/OntoGraph/decisions/?'+new URLSearchParams({lang:zh?'zh-Hans':'en',workspace}));
  }catch{status.textContent=t('This tab could not keep the handoff. Download the model and import it into Studio.','此标签页无法暂存草稿。请下载模型并导入 Studio。');}
};
$('case-download').onclick=()=>{
  if(!proposal)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(proposal.model,null,2)+'\n'],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=workspace+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

// The public page can render before the module graph has finished loading.
$('case-form').querySelector('button[type="submit"]').disabled=false;
$('case-example').disabled=false;
