'use strict';
const zh = document.documentElement.lang === 'zh-Hans';
const tr = (en, cn) => zh ? cn : en;
const base = zh ? '../' : './';
const el = id => document.getElementById(id);
const names = {
  'posting-object':tr('Finance posting object','财务过账对象'),
  'ledger-wbs':tr('Ledger WBS field','账本 WBS 字段'),
  'finance-close':tr('Month-end close','月末结账'),
  'local-reconciliation':tr('Local reconciliation','本地对账')
};
const states = {
  assessed:tr('Assessed','已评估'),
  unassessed:tr('Incomplete','评估不完整'),
  review_required:tr('Review required','需复核')
};
const sourceLabels = {
  confirmed:tr('Confirmed','已确认'), disputed:tr('Disputed','有争议'), insufficient:tr('Insufficient','证据不足')
};
const translations = new Map([
  ['The reconciliation team documented its fallback.','对账团队已记录备用流程。'],
  ['The synthetic worksheet owner reviewed the WBS dependency and recorded a manual fallback.','在本合成案例中，工作表负责人审核了 WBS 依赖关系，并记录了手动备用流程。'],
  ['Finance controller','财务控制负责人'],['Finance operations','财务运营团队'],['Finance data steward','财务数据管理员'],
  ['A wrong posting object can affect close. Two examples leave the legacy mapping uncertain.','过账对象错误会影响结账。仅凭两行样本，仍无法确认历史映射。'],
  ['The close checklist references this ledger field. A manual reconciliation is available.','结账清单引用了此账本字段，也可手动对账。'],
  ['Legacy and current formats reconciled in the synthetic sample.','在合成样本中，历史格式和当前格式均已核对。'],
  ['A steward inspected two example rows. The treatment of legacy projects remains open.','数据管理员检查了两行样本，历史项目的处理方式仍待确认。'],
  ['The training runbook names the validated ledger import as an input to month-end close.','培训操作手册将经验证的账本导入列为月末结账的一项输入。'],
  ['In this training scenario Finance reconciled old and new project formats against the ledger.','在此培训场景中，财务团队已对照账本核对旧版和新版项目格式。']
]);
const localText = value => zh ? translations.get(value) || value : value;
const languageURL = new URL(el('language').href);
const query = new URLSearchParams(location.search);
for (const id of ['scenario','endpoint']) {
  const select = el(id), value = query.get(id);
  if (Array.from(select.options).some(option => option.value === value)) select.value = value;
}
const cached = new Map();
let request = 0;
async function load(scenario) {
  if (cached.has(scenario)) return cached.get(scenario);
  const data = await Promise.all(['model','report'].map(async kind => {
    const response = await fetch(base + scenario + '-' + kind + '.json');
    if (!response.ok) throw new Error(response.status);
    return response.json();
  }));
  cached.set(scenario,data);
  return data;
}
function make(tag, content) {
  const node = document.createElement(tag);
  node.textContent = content;
  return node;
}
async function show() {
  const sequence = ++request;
  const scenario = el('scenario').value;
  const endpoint = el('endpoint').value;
  const url = new URL(location.href);
  for (const id of ['scenario','endpoint']) {
    const key = el(id);
    if (key.selectedIndex === 0) url.searchParams.delete(id);
    else url.searchParams.set(id,key.value);
  }
  history.replaceState(null,'',url);
  languageURL.search = url.search;
  el('language').href = languageURL.href;
  el('feedback').textContent = tr('Loading the selected model and impact report…','正在加载所选模型和影响报告…');
  el('result').hidden = true;
  try {
    const [model,report] = await load(scenario);
    if (sequence !== request) return;
    const route = report.paths.find(path => path.nodes.at(-1) === endpoint);
    el('path').replaceChildren(...route.nodes.map(id => make('li',names[id] || id)));
    el('criticality').textContent = route.criticality === null ? tr('Unknown','未知') : route.criticality + ' / 5';
    el('confidence').textContent = route.confidence === null ? tr('Unknown','未知') : route.confidence.toFixed(2);
    el('status').textContent = states[route.status];
    el('gate').textContent = report.assessment_gate.complete
      ? tr('Release assessment requirement met for the whole designated scope. Human approval and any required CI evidence are still needed.','指定范围内的发布评估要求已满足。仍需人工批准及流程要求的 CI 证据。')
      : tr('Release assessment requirement blocked for the whole designated scope. Check the other branch for missing assessments or contested evidence.','指定范围内的发布评估检查未通过。请检查两条分支是否缺少评估或存在争议证据。');
    const owner = model.nodes.find(node => node.id === endpoint).owner;
    el('owner').textContent = tr('Process owner','流程负责人')+' · '+localText(owner);
    const explanation = [];
    if (route.review_evidence.length) explanation.push(tr(
      'A cited source is contested. The candidate requires evidence resolution before publication.',
      '引用的来源存在争议，发布候选版本前需先解决证据问题。'));
    if (route.unassessed_edges) explanation.push(tr(
      'At least one dependency lacks an assessment. Criticality covers assessed steps only. Full path confidence is unknown.',
      '至少有一个依赖关系缺少评估。关键程度仅涵盖已评估的步骤，整条路径的置信度未知。'));
    if (!explanation.length) explanation.push(tr(
      'The most consequential step sets the criticality shown. The lowest recorded confidence sets path confidence. The process owner decides what to investigate.',
      '路径关键程度取各步骤中的最高值，路径置信度取已记录的最低值，由流程负责人决定后续核查。'));
    el('explanation').textContent = explanation.join(' ');
    el('steps').replaceChildren(...route.steps.map(step=>{
      const edge=model.edges.find(e=>e.source===step.source && e.target===step.target && e.predicate===step.predicate);
      const box=document.createElement('details');
      const a=edge.assessment;
      const values = a ? tr('Criticality ','关键程度 ')+a.criticality+'/5 · '+tr('confidence ','置信度 ')+a.confidence : tr('Unassessed','未评估');
      box.append(make('summary',step.source+' · '+step.predicate+' · '+step.target+' — '+values));
      if(a){
        const source=model.evidence.find(e=>e.id===a.evidence);
        box.append(make('p',tr('Assessor','评估人')+' · '+localText(a.assessor)),make('p',localText(a.rationale)),
          make('p',sourceLabels[source.status]+' · '+source.id+' · '+localText(source.excerpt)),
          make('p',tr('Source','来源')+' · '+source.uri+' · '+source.observed_at));
        const fingerprint=make('p','SHA-256 · ');
        fingerprint.append(make('code',source.sha256));
        box.append(fingerprint);
      }else box.append(make('p',tr('The model records the dependency; its evidence and grades are still missing.','模型记录了依赖关系，相关证据和评级尚未补充。')));
      return box;
    }));
    el('model').href=base+scenario+'-model.json';
    el('report').href=base+scenario+'-report.json';
    el('feedback').textContent='';
    el('result').hidden=false;
  }catch(error){
    if(sequence===request) el('feedback').textContent=tr('Could not load the example. Reload to retry.','未能加载示例，请刷新重试。');
  }
}
el('scenario').addEventListener('change',show);
el('endpoint').addEventListener('change',show);
show();
