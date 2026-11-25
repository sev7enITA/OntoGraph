'use strict';
const el = id => document.getElementById(id);
let zh = new URLSearchParams(location.search).get('lang') === 'zh-Hans';
const t = (en, cn) => zh ? cn : en;
const gh = 'https://github.com/';
const layers = [
  ['Discover & model','发现与建模','Source → terms and mappings','来源 → 术语和映射'],
  ['Curate & query','管理与查询','Shared vocabulary → graph or query','共享词表 → 图或查询'],
  ['Review & release','审核与发布','Rule + human decision → frozen release','规则与人工决定 → 冻结版本'],
  ['Build & decide','构建与决策','Reviewed input → tested decision artifact','已审核输入 → 经测试的决策制品'],
  ['Observe & withdraw','观测与撤回','Application outcome → release evidence','应用结果 → 发布证据']
];
// Product roles describe the selected use in this architecture. Links identify the evidence reviewed.
const rows = [
 ['pw',0,'PolicyWatcher','Source-change evidence','来源变更证据','https://openontograph.org/pilot/'],
 ['nv',0,'NVIDIA Auto Ontology','Analytical ontology discovery and ReAct text-to-SQL · 1.3.0','分析本体发现与 ReAct 文本转 SQL · 1.3.0',gh+'NVIDIA/auto-ontology/releases/tag/v1.3.0'],
 ['genie',0,'Databricks Genie Ontology','Business context learned from usage and curated in Unity Catalog · GA on 9 Nov','使用记录和 Unity Catalog 提供业务上下文 · 11 月 9 日正式发布','https://docs.databricks.com/aws/en/release-notes/product/2026/november'],
 ['ob',0,'OntoBricks','OWL design and visualization, table mapping, graph queries and registry promotion · 0.9.3','OWL 设计与可视化、表映射、图查询及注册表版本提升 · 0.9.3',gh+'databrickslabs/ontobricks/releases/tag/v0.9.3'],
 ['edg',1,'TopBraid EDG','Asset review and stewardship · 9.4.1 maintenance release','资产审核与管理 · 9.4.1 维护版本','https://www.topquadrant.com/support-documents/edg-support-levels'],
 ['vb',1,'VocBench','Collaborative OWL and SKOS editing','协作编辑 OWL 和 SKOS','https://vocbench.uniroma2.it/doc/history.jsf'],
 ['sd',1,'Stardog','Virtual graphs across sources · 12.2.3','跨来源虚拟图 · 12.2.3','https://docs.stardog.com/release-notes/stardog-platform'],
 ['gdb',1,'GraphDB','RDF store and reasoning · 11.5 series','RDF 存储和推理 · 11.5 系列','https://help.graphwise.ai/gwp26-1/en/graphdb/graphdb-release-notes.html'],
 ['jena',1,'Apache Jena','RDF and SHACL toolkit','RDF 和 SHACL 工具包',gh+'apache/jena/commit/b8375c286a409dcadb4d5821d888db01375f3644'],
 ['rdf',1,'RDF4J','RDF repository and validation toolkit · 6.0.0','RDF 存储库和验证工具包 · 6.0.0',gh+'eclipse-rdf4j/rdf4j/releases/tag/6.0.0'],
 ['nine',1,'NinePts/OntoGraph','OWL graph visualization','OWL 图可视化',gh+'NinePts/OntoGraph'],
 ['og',2,'OnToGraPh','Reviewed manifest, rule compiler, activation and withdrawal history','审核清单、规则编译、激活与撤回历史',gh+'sev7enITA/OntoGraph/tree/0ee549ad6991314066bdd50de167dbcb7efa6552/examples/devops'],
 ['palo',2,'PALO Framework','Human review handoff and decision ownership','人工审核交接与决策责任','https://openontograph.org/pilot/'],
 ['custom',2,'Custom assurance contract','Assume an incumbent provides equivalent approval, version binding and withdrawal evidence','假设现有系统提供等效审批、版本绑定和撤回证据','https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments'],
 ['ci',3,'Git / CI','Test and retain the versioned artifact','测试并保留版本化制品',gh+'sev7enITA/OntoGraph/actions/runs/45708644365'],
 ['opa',3,'OPA / Rego','Executable bundle · pilot 1.21.2, upstream 1.22.4','可执行策略包 · 试点 1.21.2，上游 1.22.4',gh+'open-policy-agent/opa/releases/tag/v1.22.4'],
 ['drools',3,'Drools / KIE','DRL and DMN decision runtime · KIE 10.2.0','DRL 和 DMN 决策运行时 · KIE 10.2.0',gh+'apache/incubator-kie/releases/tag/10.2.0'],
 ['bridge',3,'Drools adapter','Assume a qualified compiler and equivalent decision tests for the rule','假设已有通过验证的编译器及等效决策测试',null],
 ['first',4,'','Probe the first consumer on the agreed case','按约定用例探测第一个应用',null],
 ['second',4,'','Probe the second consumer on the agreed case','按约定用例探测第二个应用',null]
];
const cases = [
 {name:['Aurora 21 · CRM & PMS','Aurora 21 · CRM 与 PMS'],apps:['CRM','PMS'],rule:['Building dossier → technical declaration + inspection report. The probe submits a building missing the report. CRM holds it; PMS clears it under the old rule. Individual property units are outside the new requirement.','建筑档案 → 技术声明和检查报告。探针提交缺少检查报告的整栋建筑档案。CRM 暂缓处理，PMS 仍按旧规则放行。单个房产单元不适用新要求。']},
 {name:['Procurement · purchase approval','采购 · 订单审批'],apps:['ERP','Supplier portal'],cnApps:['ERP','供应商门户'],rule:['Illustrative company model. An order above the approval limit requires a second reviewer. Both applications apply the change.','示例企业模型。超过审批限额的订单需要第二位审核人。两个应用均执行新规则。']}
];
const presets = [
 [['Standalone','独立运行'],['og','ci','opa','first','second']],
 [['Semantic stack','语义技术栈'],['pw','nv','ob','sd','og','palo','ci','opa','first','second']],
 [['Incumbent + Drools','现有系统与 Drools'],['custom','ci','drools','bridge','first','second']]
];
let selected = new Set(presets[0][1]), caseIndex = 0, phase = 0;
let lastChange = null;
const active = id => selected.has(id);
// Each requirement counts once, even when several selected suppliers cover it.
const upstream = [
  [['Machine-assisted semantic discovery','机器辅助语义发现'],['nv','genie']],
  [['Lakehouse mapping','湖仓映射'],['ob']],
  [['Vocabulary curation','词表管理'],['edg','vb','ob','og']],
  [['RDF query service or toolkit','RDF 查询服务或工具包'],['sd','gdb','jena','rdf','ob']],
  [['OWL graph visualization','OWL 图可视化'],['nine','ob']]
];
function evidence() {
  const contract = active('og') || active('custom');
  const runtime = active('opa') || (active('drools') && active('bridge'));
  const gates = [contract,active('ci'),runtime];
  const bound = gates.every(Boolean);
  const states = ['first','second'].map((id,i) => {
    if (!bound || !active(id)) return 'unknown';
    if (caseIndex === 0 && i === 1 && phase < 2) return phase === 0 ? 'mismatch' : 'unknown';
    return 'match';
  });
  const covered = states.filter(s => s !== 'unknown').length;
  return {gates,states,values:[gates.filter(Boolean).length,covered,states.filter(s => s === 'mismatch').length,2-covered,upstream.filter(([,ids])=>ids.some(active)).length]};
}
function element(tag,content,cls) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (cls) node.className = cls;
  return node;
}
function button(label,fn) {
  const node = element('button',label);
  node.type = 'button'; node.onclick = fn;
  return node;
}
function selectOptions(node,options,index,change) {
  node.replaceChildren(...options.map((label,i) => new Option(label,i)));
  node.selectedIndex = index;
  node.onchange = () => change(node.selectedIndex);
}
const appNames = () => zh && cases[caseIndex].cnApps || cases[caseIndex].apps;
function name(row) {
  if (row[0] === 'first' || row[0] === 'second') return appNames()[row[0] === 'second' ? 1 : 0] + t(' probe',' 探针');
  return row[2];
}
function resetView() { lastChange = null; render(); }
function render() {
  document.documentElement.lang = zh ? 'zh-Hans' : 'en';
  document.title = t('Architecture puzzle','架构拼图')+' | OnToGraPh';
  el('title').textContent = t('Architecture puzzle','架构拼图');
  el('intro').textContent = t('Start with a business rule. Add or remove a piece to see which capability it contributes and which application outcomes you can still verify.','从一条业务规则开始。添加或移除组件，查看其提供的能力，以及哪些应用结果仍可验证。');
  el('language').textContent = t('简体中文','English');
  el('language').lang = zh ? 'en' : 'zh-Hans';
  el('presets').setAttribute('aria-label', t('Scenarios','场景'));
  el('weights-link').href = zh ? '../weights/zh/' : '../weights/';
  el('weights-link').textContent = t('Explore weighted relationships','探索加权关系');
  el('guide-link').href = zh ? '../guide/zh-Hans.html' : '../guide/';
  el('guide-link').textContent = t('Practical guide','实用指南');
  el('review-link').textContent = t('Read the independent review','阅读独立评审（英文）');
  el('caseLabel').textContent = t('Company data model','企业数据模型');
  selectOptions(el('model'),cases.map(c=>t(...c.name)),caseIndex,i=>{caseIndex=i;phase=0;resetView()});
  el('presets').replaceChildren(...presets.map(([labels,ids])=>button(t(...labels),()=>{selected=new Set(ids);resetView()})));
  el('board').replaceChildren(...layers.map(([en,cn,h,k],i)=>{
    const sec=element('section',undefined,'layer');
    const heading=element('div');
    heading.append(element('h2',t(en,cn),'stage'),element('small',t(h,k),'hint'));
    const pieces=element('div',undefined,'pieces');
    for (const row of rows.filter(r=>r[1]===i)) {
      const id=row[0], piece=button((active(id)?'✓ ':'+ ')+name(row),()=>{
        const before=evidence().values;
        if (active(id)) selected.delete(id); else selected.add(id);
        lastChange={id,before};render();
        document.getElementById('p-'+id).focus({preventScroll:true});
      });
      piece.className='piece';piece.id='p-'+id;piece.title=t(row[3],row[4]);
      piece.setAttribute('aria-pressed',String(active(id)));pieces.append(piece);
    }
    sec.append(heading,pieces);return sec;
  }));
  el('evidence').textContent=t('What can you prove?','你能证明什么？');
  const originalStack = presets[0][1].every(active) && selected.size === presets[0][1].length;
  const basis = caseIndex ? t('Illustrative procurement scenario. The application results are assumed.','采购示例。应用结果为假设。')
    : originalStack ? t('Published synthetic Aurora fixture. The page reproduces its recorded checkpoints.','已发布的 Aurora 合成样例。此页重现已记录的检查点。')
    : t('Counterfactual configuration based on Aurora. Results depend on the selected roles and adapter assumptions.','基于 Aurora 的反事实配置。结果取决于所选职责和适配器假设。');
  el('basis').textContent = basis + ' ' + t('Browser simulation. No live application is queried.','浏览器模拟。未查询实际应用。');
  if(active('pw') || active('palo')) el('basis').textContent += ' '+t('PolicyWatcher and PALO have a separate offline handoff pilot ending at human review.','PolicyWatcher 和 PALO 另有离线交接试点，终点为人工审核。');
  if((active('bridge') && active('drools') && !active('opa')) || (active('custom') && !active('og'))) el('basis').textContent += ' '+t('Equivalent assurance is assumed for the incumbent path.','现有系统路径的等效保障为假设。');
  el('case').textContent = phase === 0 ? t(...cases[caseIndex].rule) : caseIndex
    ? t('The scenario assumes both applications return the expected result after the withdrawal request.','本场景假定两个应用在收到撤回请求后均返回预期结果。')
    : phase === 1 ? t('Withdrawal requested. In the reference case CRM confirms inactivity and PMS is unreachable.','已请求撤回。参考案例中，CRM 确认规则已停用，PMS 无法访问。')
    : t('The reference case records a fresh PMS observation confirming inactivity after the earlier failed check.','参考案例记录了新的 PMS 观测结果，确认先前检查失败后规则已停用。');
  el('phaseLabel').textContent=t('Evidence checkpoint','证据检查点');
  selectOptions(el('phase'),[t('Activation','激活'),t('Withdrawal · first probe','撤回 · 首次探测'),t('Withdrawal · repeat probe','撤回 · 再次探测')].slice(0,caseIndex ? 2 : 3),phase,i=>{phase=i;resetView()});
  const {values,gates,states}=evidence();
  const metrics=[
    [t('KPI · build prerequisites','KPI · 构建前提'),t('Release contract, CI, tested runtime','发布契约、CI、经测试的运行时'),3],
    [t('KPI · evidence coverage','KPI · 证据覆盖'),t('Consumers with a bound result / in scope','具有关联结果的应用数 / 范围内应用数'),2],
    [t('KRI · detected divergence','KRI · 已发现偏差'),t('Observed mismatches / in scope','已观察到的偏差数 / 范围内应用数'),2],
    [t('KRI · unproven','KRI · 未证实'),t('Consumers without usable proof / in scope','缺乏可用证据的应用数 / 范围内应用数'),2],
    [t('Design · semantic roles','设计 · 语义职责'),t('Illustrative role coverage across five selected design needs','五项示例设计需求的职责覆盖'),upstream.length]
  ];
  el('meters').replaceChildren(...metrics.map(([label,formula,total],i)=>{
    const box=element('div',undefined,'metric');
    if ((i === 2 || i === 3) && values[i]) box.classList.add('risk');
    box.append(element('span',label),element('strong',values[i]+' / '+total),element('small',formula));return box;
  }));
  const missing=[t('release contract','发布契约'),t('CI artifact','CI 制品'),t('tested runtime','经测试的运行时')].filter((_,i)=>!gates[i]);
  el('capabilities').replaceChildren(...upstream.map(([labels,ids]) => {
    const providers = rows.filter(row => ids.includes(row[0]) && active(row[0])).map(name);
    return element('li',t(...labels)+' · '+(providers.join(', ') || t('unassigned','未分配')));
  }));
  el('history').hidden = caseIndex !== 0;
  el('history').textContent = t('Aurora reference record · At activation PMS acknowledged the new release and cleared the dossier under the old rule. The later withdrawal check confirmed inactivity. Switches change the scenario view; the recorded event stays in history.','Aurora 参考记录 · 激活时，PMS 已确认收到新版本，却仍按旧规则放行了档案。后续撤回检查确认规则已停用。切换组件只改变场景视图，已记录的事件保留在历史中。');
  el('consumers').replaceChildren(...states.map((s,i)=>{
    let why;
    if(missing.length) why=t('Unproven. Missing ','未证实。缺少 ')+missing.join(' · ');
    else if(!active(i?'second':'first')) why=t('Unproven. Its probe is disconnected.','未证实。探针未连接。');
    else if(s==='unknown') why=t('Unproven. PMS was unreachable on the first withdrawal probe.','未证实。首次撤回探测时 PMS 无法访问。');
    else if(s==='mismatch') why=t('Divergent. Receipt matches; observed decision still follows the previous rule.','存在偏差。收据匹配，但观察到的决定仍遵循旧规则。');
    else why=phase?t('Withdrawal verified by probe.','探针已验证撤回。'):t('Observed decision matches the new rule.','观察到的决定符合新规则。');
    const scope = originalStack && !caseIndex ? '' : t('Simulated outcome · ','模拟结果 · ');
    return element('li',appNames()[i]+' · '+scope+why);
  }));
  let message=t('Select a piece to inspect its impact. The two consumers remain in scope throughout.','选择组件以检查影响。两个应用始终在评估范围内。');
  if(lastChange){
    const row=rows.find(r=>r[0]===lastChange.id);
    const delta=values.map((v,i)=>v-lastChange.before[i]);
    const changed=delta.flatMap((d,i)=>d?[metrics[i][0]+' '+(d>0?'+':'')+d]:[]);
    message=name(row)+' · '+(active(row[0])?t('Added','已添加'):t('Removed','已移除'))+'. '+t(row[3],row[4])+'. '+(changed.length?changed.join(' / '):t('The selected change leaves the indicators unchanged for this case.','此更改不影响该用例的指标。'));
  }
  el('blind').hidden = values[3] === 0;
  el('blind').textContent = t('Evidence gap. A missing result can hide a divergence. The detected count covers only the probes with usable evidence.','存在证据缺口。缺失结果可能掩盖偏差。已发现的偏差数仅涵盖提供有效证据的探针。');
  el('impact').textContent=message;
  el('sourcesTitle').textContent=t('Model assumptions and development sources · 25 November 2026','模型假设与开发来源 · 2026 年 11 月 25 日');
  el('scope').textContent=t('This is a synthetic counterfactual. Each tile represents one selected role of a product. The standalone Aurora example uses the outcomes reported in the published CI pilot. All switches run in the browser. Upstream tools can supply inputs via qualified adapters. PALO and PolicyWatcher have a separate offline handoff pilot. The custom contract and Drools bridge are explicit assumptions. In this CI-required scenario, missing proof leaves the underlying business outcome unknown. Counts describe the selected fixture.','这是合成反事实模拟。每个组件代表所选产品的一项职责。独立的 Aurora 示例使用已发布 CI 试点的观测结果。所有切换操作均在浏览器中模拟。上游工具可通过已验证的适配器提供输入。PALO 和 PolicyWatcher 另有离线交接试点。自定义契约及 Drools 适配器是显式假设。本场景要求 CI 证明，证据不足时，业务结果未知。指标仅描述所选样例。');
  el('sources').replaceChildren(...rows.filter(r=>r[5] || r[0] === 'bridge').map(r=>{
    const li=element('li'), label=element(r[5]?'a':'span',name(r));
    if(r[5]) label.href=r[5];
    li.append(label,' · '+t(r[3],r[4]));
    if(r[0]==='ob' || r[0]==='og') {
      const guide=element('a',t('Role documentation','职责文档'));
      guide.href=r[0]==='ob'?'https://www.ontobricks.org/documentation/features.html':gh+'sev7enITA/OntoGraph/blob/main/docs/FRAMEWORK.md';
      li.append(' · ',guide);
    }
    if(r[0]==='opa') {
      const pilot=element('a',t('Exercised OPA 1.21.2','试点使用的 OPA 1.21.2'));
      pilot.href=gh+'open-policy-agent/opa/releases/tag/v1.21.2';li.append(' · ',pilot);
    }
    return li;
  }));
}
el('language').onclick=()=>{
  zh=!zh;
  if (location.protocol !== 'file:') {
    const url = new URL(location.href);
    if (zh) url.searchParams.set('lang','zh-Hans');
    else url.searchParams.delete('lang');
    history.replaceState(null,'',url);
  }
  render();
};
render();
