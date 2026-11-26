import {assertionForm} from './assertions.js';
import {renderCaseReview} from './case-review.js';
import {mountChecklist} from './checklist.js';
const $=id=>document.getElementById(id);
const page=new URL(location.href);
const zh=page.searchParams.get('lang')==='zh-Hans', t=(en,cn)=>zh?cn:en;
const workspace=page.searchParams.get('workspace')||'wbs';
const personal=/^case-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(workspace);
let model, boot, revision, refreshChecklist, dirty=false, formAction, serial=0, writer=false;
document.documentElement.lang=zh?'zh-Hans':'en';
document.title=t('Relationship evidence · OnToGraPh Studio','关系证据 · OnToGraPh 工作台');
const labels={
  title:['Relationship evidence','关系证据'],subtitle:['Assess the consequences of a change, compare source judgments and record a review.','评估变更后果，比较不同来源的判断，并记录审核结论。'],
  'workspace-label':['Draft workspace','草稿工作区'],'workspace-name':['Workspace ID','工作区 ID'],open:['Open','打开'],back:['← Studio','← 工作台'],
  'import-label':['Import model','导入模型'],export:['Export JSON','导出 JSON'],save:['Save draft','保存草稿'],
  'editor-label':['Relationship review','关系审核'],'edge-label':['Relationship','关系'],'impact-label':['Decision impact','决策影响'],'origin-label':['Change origin','变更起点'],
  'required-label':['Require complete assessments for this origin at release','发布时要求此起点的关系评估完整'],'asof-label':['Model effective time (UTC)','模型生效时间（UTC）'],'set-time':['Apply time','应用时间'],notice:['Opening your private workspace…','正在打开您的私有工作区…']
};
for(const [id,pair] of Object.entries(labels)) $(id).textContent=t(...pair);
const other=new URL(page); other.searchParams.set('lang',zh?'en':'zh-Hans');
$('language').href=other; $('language').textContent=zh?'English':'简体中文';
$('language').lang=$('language').hreflang=zh?'en':'zh-Hans'; $('back').href='../?lang='+(zh?'zh-Hans':'en');
const notice=text=>{$('notice').textContent=text;};
const elem=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
function option(text,value){return new Option(text,value);}
async function api(op,body){
  const response=await fetch('./api/'+op+'?workspace='+encodeURIComponent(workspace),body===undefined?{}:{
    method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':boot.csrf},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok){
    const error=new Error(response.status===409?t('Another session saved a newer draft. Export your edits and reload.','另一会话已保存新版草稿。请导出您的更改并重新加载。'):data.error||String(response.status));
    error.status=response.status;
    throw error;
  }
  return data;
}
function controls(){
  $('save').disabled=!dirty || !boot.editable || writer;
  $('version').textContent=t('Saved revision ','已保存修订 ')+revision+(dirty?t(' · Unsaved changes',' · 有未保存更改'):'');
}
function refreshModel(){
  const prevOrigin=$('origin').value, prevEdge=$('edge').value;
  $('effective').value=model.effective_at;
  $('scope').textContent=model.domain+' · '+model.scope;
  $('origin').replaceChildren(...model.nodes.map(n=>option(n.label+' · '+n.id,n.id)));
  $('edge').replaceChildren(...model.edges.map((e,i)=>option([e.source,e.predicate,e.target].join(' → '),String(i))));
  if(model.nodes.some(n=>n.id===prevOrigin)) $('origin').value=prevOrigin;
  else if(model.required_assessment_origins?.length)$('origin').value=model.required_assessment_origins[0];
  if(prevEdge && model.edges[Number(prevEdge)])$('edge').value=prevEdge;
  else {const i=model.edges.findIndex(e=>e.assertions?.length||e.assessment); if(i>=0)$('edge').value=String(i);}
  if(personal && model.domain===workspace){
    renderCaseReview(model,{t,editable:boot.editable,apply:async draft=>{
      const initial=model;
      try{
        await api('validate',{model:draft});
        if(initial!==model)return;
        model=draft;dirty=true;refreshModel();
        notice(t('Edits applied. Save the draft to keep this revision.','修改已应用。请保存草稿以保留此修订。'));
      }catch(error){notice(error.message);}
    }});
  }else $('personal-review').hidden=true;
  renderEditor(); controls(); void impact();
}
function renderEditor(){
  const form=$('edit'); form.replaceChildren(); formAction=null;
  const index=Number($('edge').value);
  if(!model.edges[index])return;
  formAction=assertionForm(form,model,index,{t,principal:boot.username,getBasis:async(doc,edge_index)=>api('basis',{model:doc,edge_index})});
  if (boot.editable) form.append(elem('button',t('Apply to draft','应用到草稿')));
  else for(const field of form.querySelectorAll('input,textarea,select'))field.disabled=true;
}
async function impact(){
  const req=++serial,origin=$('origin').value,root=$('result');
  $('required').checked=(model.required_assessment_origins||[]).includes(origin);
  $('required').disabled=!boot.editable;
  root.textContent=t('Computing impact…','正在计算影响…');
  try{
    const report=await api('impact',{model,origin}); if(req!==serial)return;
    const c=report.coverage;
    root.replaceChildren(elem('p',t('Reachable relationships','可达关系')+' '+c.reachable_edges+' · '+t('Missing','缺少')+' '+c.unassessed_edges+' · '+t('Need review','需审核')+' '+c.review_edges));
    if(report.required){const gate=elem('p',report.assessment_issue?t('Assessment requirement blocked.','评估要求未满足。'):t('Assessment requirement met. Human approval is a separate release step.','已满足评估要求。发布仍需单独取得人工批准。'));
      gate.id='gate';root.append(gate);}
    if(report.truncated)root.append(elem('p',t('Only part of this path list fits the search limits.','路径清单超出搜索上限，仅显示部分路径。')));
    for(const r of report.paths){
      const d=elem('details','');d.append(elem('summary',r.nodes.join(' → ')));
      d.append(elem('p',t('Highest known criticality','已知最高关键性')+' '+(r.criticality??t('unknown','未知'))+
        ' · '+t('Weakest confidence','最低置信度')+' '+(r.confidence??t('unknown','未知'))));
      for(const step of r.steps)d.append(elem('p',[step.source,step.predicate,step.target].join(' → ')));
      root.append(d);
    }
  }catch(err){if(req===serial)root.textContent=err.message;}
}
$('required').onchange=async ()=>{
  const initial=model,origin=$('origin').value,checked=$('required').checked;
  const draft=structuredClone(initial),origins=new Set(draft.required_assessment_origins||[]);
  if(checked)origins.add(origin);else origins.delete(origin);
  if(origins.size)draft.required_assessment_origins=[...origins].sort();else delete draft.required_assessment_origins;
  $('required').disabled=true;
  try{
    await api('validate',{model:draft});
    if(model!==initial||$('origin').value!==origin)return;
    model=draft;dirty=true;refreshModel();notice(t('Release requirement changed in the draft.','已更改草稿中的发布要求。'));
  }catch(error){notice(error.message);}
  finally{void impact();}
};
$('asof').onsubmit=async event=>{
  event.preventDefault();if(!boot.editable)return;const draft=structuredClone(model);draft.effective_at=$('effective').value.trim();
  try{await api('validate',{model:draft});model=draft;dirty=true;refreshModel();notice(t('Effective time updated in the draft.','草稿中的生效时间已更新。'));}
  catch(error){notice(error.message);}
};
$('edge').onchange=renderEditor; $('origin').onchange=()=>void impact();
$('edit').onsubmit=async event=>{
  event.preventDefault(); if(!boot.editable||writer||!formAction)return;
  const current=model,index=$('edge').value;
  try{
    const draft=await formAction(new FormData($('edit')));
    await api('validate',{model:draft});
    if(current!==model||index!==$('edge').value)throw new Error(t('The draft changed. Reopen the relationship.','草稿已更改，请重新打开关系。'));
    model=draft;dirty=true;refreshModel();notice(t('Applied. Save the draft to retain this change.','已应用。请保存草稿以保留更改。'));
  }catch(err){notice(err.message);}
};
$('save').onclick=async()=>{
  if(writer)return; writer=true; controls(); const saved=model;
  try{
    const result=await api('save',{model:saved,revision});revision=result.revision;dirty=model!==saved;
    if(refreshChecklist)void refreshChecklist(revision);
    notice(t('Private draft saved. Registry publication requires separate authenticated reviews.','私有草稿已保存。登记发布需另行通过身份验证的审核。'));
  }catch(err){notice(err.message);}finally{writer=false;controls();}
};
$('import-label').onclick=()=>{ if(boot?.editable) $('import').click(); };
$('import').onchange=async event=>{
  try{
    const file=event.target.files[0]; if(!file)return;
    if(file.size>5_000_000)throw new Error(t('Import a JSON model under 5 MB.','请导入小于 5 MB 的 JSON 模型。'));
    const draft=JSON.parse(await file.text()); await api('validate',{model:draft});
    if(dirty && !confirm(t('Replace your unsaved changes?','替换尚未保存的更改？')))return;
    model=draft;dirty=true;refreshModel();notice(t('Imported into this draft. Save when ready.','已导入此草稿。确认后保存。'));
  }catch(err){notice(err.message);}finally{event.target.value='';}
};
$('export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(model,null,2)+'\n'],{type:'application/json'}));
  const a=elem('a','');a.href=url;a.download=model.domain+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
$('navigation').onsubmit=e=>{e.preventDefault();const dest=new URL(location.href);dest.searchParams.set('workspace',new FormData(e.target).get('workspace'));location.assign(dest);};
$('navigation').elements.workspace.value=workspace;
api('bootstrap').then(async data=>{
  boot=data;
  const prepare=data.starter && data.editable;
  const draft=prepare ? await api('prepare',{}) : data;
  if(personal){
    $('title').textContent=t('My app model','我的应用模型');
    $('subtitle').textContent=t('Review the risks, dictionary, taxonomy and relationships proposed from your brief.','复核根据你的描述提出的风险、词典、分类体系和本体关系。');
    if(!draft.revision){
      const pending=sessionStorage.getItem('ontograph:'+workspace);
      if(!pending)throw new Error(t('This draft has not been saved. Open your proposal from the Hidden Risks tab.','此草稿尚未保存。请从隐性风险标签页打开你的提案。'));
      draft.model=JSON.parse(pending);
      await api('validate',{model:draft.model});
      if(draft.model.domain!==workspace)throw new Error(t('Draft ID mismatch.','草稿标识不匹配。'));
      if(data.editable){
        try{draft.revision=(await api('save',{model:draft.model,revision:0})).revision;}
        catch(error){if(error.status!==409)throw error;Object.assign(draft,await api('bootstrap'));}
      }
    }
    if(draft.revision)sessionStorage.removeItem('ontograph:'+workspace);
  }
  model=draft.model;revision=draft.revision;$('controls').hidden=false;
  $('asof').hidden=!boot.editable;$('import').disabled=!boot.editable;$('import-label').hidden=!boot.editable;
  refreshModel();
  refreshChecklist=mountChecklist({workspace,t,api,editable:boot.editable,inspectOrigin:id=>{
    if(!model.nodes.some(node=>node.id===id)){
      notice(t('This origin is missing in the current draft.','当前草稿缺少此起点。'));
      return;
    }
    $('origin').value=id;
    $('origin').focus();
    void impact();
  }});
  if(refreshChecklist)void refreshChecklist(revision);
  const ready=prepare ? t('Starter model saved in this workspace.','入门模型已保存至此工作区。') : '';
  notice(boot.editable ? ready : t('Read-only access.','当前为只读访问。'));
}).catch(err=>notice(err.message));
