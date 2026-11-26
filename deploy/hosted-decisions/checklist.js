const CASES = {
  'journey-personal-library': {
    title: ['Personal library checklist', '个人图书库核验清单'],
    inspect: ['physical-copy', ['Find the Physical copy', '定位实体副本']],
    steps: [
      ['Check the draft scope and find the edition and its physical copies.', '查看草稿范围，找到图书版本和相应实体副本。'],
      ['Inspect a copy and how its identifier relates to the edition. The loan decision uses the copy’s own availability.', '查看实体副本及其标识与图书版本的关系。借出决策使用该副本自己的可借状态。'],
      ['Try an available copy, a copy already on loan and a copy with unknown availability.', '分别尝试可借、已借出和可借状态未知的副本。'],
    ],
    exercise: ['/guide/#personal-project-build-a-lending-app', '/guide/zh-Hans.html#个人项目做一个借书应用'],
    observe: ['Compare what your own lending app does for two copies of the same edition. Record the case and actual response. If you only ran the rule checks, leave the application result unrecorded.', '比较自己的借书应用如何处理同一版本的两册书。记录案例和实际响应。如果只运行了规则检查，请保留应用结果为未记录。'],
  },
  'journey-department-wbs': {
    title: ['Department WBS checklist', '跨部门 WBS 核验清单'],
    inspect: ['wbs', ['Trace the WBS mapping', '追踪 WBS 映射']],
    steps: [
      ['Confirm that the draft is the unresolved Finance and PMO mapping.', '确认草稿为财务与 PMO 尚未裁决的映射。'],
      ['Compare the claims about recognized code 0017 and inspect its impact on the two consumers.', '比较关于已识别编码 0017 的不同主张，并查看它对两个使用方的影响。'],
      ['Review the captured workbook mismatch, the unavailable workbook and the fresh readback after withdrawal.', '查看已经记录的工作簿不一致、无法访问及撤回后的重新读取结果。'],
    ],
    exercise: ['/wbs/', '/wbs/zh/'],
    observe: ['Record whether you reviewed the published replay or observed your own applications. Keep the mismatched, unavailable and withdrawn checkpoints distinct. Include the application and checkpoint you checked.', '注明您查看的是公开回放还是对自己的应用进行了实测。区分不一致、不可用和已撤回的节点。记录所查的应用及节点。'],
  },
  'journey-copilot-glossary': {
    title: ['Copilot glossary checklist', 'Copilot 词典核验清单'],
    inspect: ['posting-object', ['Inspect the Finance meaning of WBS', '查看 WBS 的财务含义']],
    steps: [
      ['Compare WBS as a project work package and as a Finance posting object.', '比较 WBS 作为项目工作包与财务过账对象的不同含义。'],
      ['Follow each department’s field mapping. Check that ambiguous or missing mappings are held.', '追踪各部门的字段映射。确认歧义或缺失的映射会被暂缓处理。'],
      ['Use the guide to prepare an approved glossary in a test tenant. Ask an ambiguous WBS question and then one with a Finance context.', '按指南在测试租户准备已批准的词典。先问有歧义的 WBS 问题，再问带财务上下文的问题。'],
    ],
    exercise: ['/guide/#microsoft-365-copilot-ground-answers-in-the-company-dictionary', '/guide/zh-Hans.html#microsoft-365-copilot按本公司的定义解释术语'],
    observe: ['Record the tenant test’s prompt, answer and source, or mark it unavailable if you cannot access a tenant. The saved-draft rule checks cover the mapping, while the tenant test covers Copilot’s response.', '记录租户测试的问题、答案和来源。无法访问租户时请选择不可用。保存草稿的规则检查覆盖映射，租户测试则核验 Copilot 的实际回答。'],
  },
  'journey-policy-change': {
    title: ['Policy change checklist', '政策变更核验清单'],
    inspect: ['change-ref', ['Trace the source change', '追踪来源变更']],
    steps: [
      ['Confirm the synthetic change ID, its source and the evidence record.', '确认合成变更 ID、其来源和证据记录。'],
      ['Trace Source change ID through Decision trace and Review admission to Local review intake.', '从来源变更 ID 出发，经决策追踪和审核准入，追踪至本地审核入口。'],
      ['Compare the matching case, the wrong case and the false claim of authority. A matching case opens a human review path.', '比较匹配案例、错误案例和虚假的授权声明。匹配的案例可进入人工审核。'],
    ],
    exercise: ['/pilot/', '/pilot/zh/'],
    observe: ['Record the PALO checkpoint you examined and the evidence you would submit to a reviewer. Note whether you watched the demonstration or tested your own review intake.', '记录您查看的 PALO 检查点以及会提交给审核人的证据。注明您查看的是演示还是测试了自己的审核入口。'],
  },
};

const PROBES = {
  'library-app-available':['Copy available', '副本可借'], 'library-app-on-loan':['Copy on loan', '副本已借出'],
  'library-app-unknown':['Availability unknown', '可借状态未知'],
  'finance-qualified':['Finance with qualified WBS', '财务 WBS 明确到部门'], 'finance-legacy':['Finance with bare WBS', '财务仅有 WBS 编码'],
  'finance-unknown':['Finance with unknown code', '财务编码未知'], 'pmo-qualified':['PMO with qualified WBS', 'PMO WBS 明确到部门'],
  'pmo-legacy':['PMO with bare WBS', 'PMO 仅有 WBS 编码'], 'pmo-unknown':['PMO with unknown code', 'PMO 编码未知'],
  'staging-import-unique':['Approved mapping', '已批准映射'], 'staging-import-ambiguous':['Ambiguous mapping', '映射有歧义'],
  'staging-import-missing':['Missing mapping', '缺少映射'], matched:['Matching change record', '匹配的变更记录'],
  'wrong-case':['Wrong case ID', '案例 ID 错误'], 'false-authority':['False authority claim', '虚假的授权声明'],
};

const STEP_IDS = ['draft', 'inspect', 'exercise'];
const OPTIONS = {
  unrecorded:['Unrecorded', '未记录'], matched:['Observed match', '实测符合预期'],
  different:['Observed difference', '实测存在差异'], unavailable:['Result unavailable', '结果不可用'],
};

const element = (tag, text='') => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};

export function mountChecklist({workspace, t, api, editable, inspectOrigin}) {
  const config = CASES[workspace];
  if (!config) return null;
  const panel = document.getElementById('case-checklist');
  const title = element('h2', t(...config.title));
  title.id = 'checklist-title';
  const introduction = element('p', t(
    'Review the draft, run its reference cases, and record what you observed. Saving a new model revision starts a fresh checklist.',
    '查看草稿、运行参考案例并记录观察结果。保存新模型修订后将开始新的清单。'));
  const summary = element('p');
  summary.setAttribute('role','status');
  const list = element('ol');
  const boxes = config.steps.map((copy,index) => {
    const row = element('li');
    const text = element('label');
    const box = element('input');
    box.type='checkbox'; box.value=STEP_IDS[index]; box.disabled=!editable;
    text.append(box, element('span',t(...copy)));
    row.append(text);
    if(index===1) {
      const inspect = element('button',t(...config.inspect[1]));
      inspect.type='button';
      inspect.addEventListener('click',()=>inspectOrigin(config.inspect[0]));
      row.append(inspect);
    }
    if(index===2) {
      const link=element('a',t('Open the case exercise', '打开场景练习'));
      link.href=t(...config.exercise);
      row.append(link);
    }
    list.append(row);
    return box;
  });
  const run=element('button',t('Run saved draft checks','运行已保存草稿的检查'));
  run.type='button';
  const checks=element('div');
  checks.setAttribute('aria-live','polite');
  const outcome=element('select');
  for (const [key,copy] of Object.entries(OPTIONS)) outcome.add(new Option(t(...copy),key));
  outcome.disabled=!editable;
  const note=element('textarea');
  note.maxLength=1000; note.rows=3; note.disabled=!editable;
  const outcomeField=element('label',t('Observed result','观察结果'));
  outcomeField.append(outcome);
  const noteField=element('label',t('What did you observe and where?','在哪里观察到了什么？'));
  noteField.append(note);
  const detail=element('p',t(...config.observe));
  const save=element('button',t('Save checklist','保存清单'));
  save.type='submit';
  save.hidden=!editable;
  const status=element('p');
  status.setAttribute('role','status');
  const form=element('form');
  form.append(outcomeField,noteField,save,status);
  panel.append(title,introduction,summary,list,run,checks,element('h3',t('4. Record the result','4. 记录结果')),detail,form);

  let state, targetRevision, request=0;
  const busy=value=>{
    run.disabled=value;
    for(const input of [save,outcome,note,...boxes])input.disabled=value||!editable;
  };
  const draw=()=>{
    for(const box of boxes)box.checked=state.completed.includes(box.value);
    outcome.value=state.outcome;note.value=state.note;
    const total=state.completed.length + (state.outcome!=='unrecorded'?1:0);
    summary.textContent=t('Saved draft revision ','已保存草稿修订 ')+state.draft_revision+' · '
      +t(total+' of 4 recorded','已记录 '+total+' / 4 项');
  };
  const failure=error=> status.textContent=error.status===409
    ? t('The draft or checklist changed in another tab. Reload, then reconcile your notes.','另一标签页已更改草稿或清单。请重新加载后核对记录。')
    : t('Unable to complete the request. Check the connection and try again.','无法完成请求，请检查连接后重试。');
  async function refresh(revision){
    targetRevision=revision;
    const seq=++request;
    state=null;busy(true);checks.replaceChildren();status.textContent='';
    for(const box of boxes)box.checked=false;
    outcome.value='unrecorded';note.value='';
    summary.textContent=t('Loading checklist…','正在加载清单…');
    try{
      const next=await api('checklist');
      if(seq!==request)return;
      if(next.draft_revision!==revision){failure({status:409});return;}
      state=next;draw();
    }catch(error){if(seq===request)failure(error);}
    finally{if(seq===request)busy(!state);}
  }
  run.addEventListener('click',async()=>{
    if(!state)return;
    const seq=request;
    busy(true);checks.textContent=t('Running reference cases…','正在运行参考案例…');status.textContent='';
    try{
      const result=await api('checklist-run',{draft_revision:targetRevision});
      if(seq!==request)return;
      const matches=result.checks.filter(check=>check.match).length;
      checks.replaceChildren(element('p',t(
        matches+' of '+result.checks.length+' reference decisions match the expected result for saved revision '+result.draft_revision+'.',
        '已保存修订 '+result.draft_revision+' 中，'+matches+' / '+result.checks.length+' 项参考决策符合预期。')));
      const rows=element('ul');
      const decision=value=>({
        allow:t('Allow','允许'),hold:t('Hold','暂缓'),out_of_scope:t('Outside scope','超出范围'),
      }[value]||t('Rule unavailable','规则不可用'));
      for(const check of result.checks){
        const label=PROBES[check.id]?t(...PROBES[check.id]):check.id;
        const pair=t('Expected ','预期 ')+decision(check.expected)+' · '+t('Rule returned ','规则返回 ')+decision(check.result);
        rows.append(element('li',label+' · '+pair));
      }
      checks.append(rows,element('p',t('These simulated decisions describe the saved rules. Record actual or replayed application results separately below.','这些模拟决策反映已保存的规则。请在下方单独记录应用实测或回放结果。')));
    }catch(error){if(seq===request){checks.replaceChildren();failure(error);}}
    finally{if(seq===request)busy(false);}
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!editable||!state||save.disabled)return;
    if(outcome.value!=='unrecorded'&&!note.value.trim()){
      status.textContent=t('Describe the basis for this result.','请说明此结果的依据。');note.focus();return;
    }
    const seq=request;
    const data={draft_revision:targetRevision,version:state.version,
      completed:boxes.filter(box=>box.checked).map(box=>box.value),outcome:outcome.value,note:note.value};
    busy(true);status.textContent=t('Saving checklist…','正在保存清单…');
    try{
      const next=await api('checklist-save',data);
      if(seq!==request)return;
      state=next;draw();status.textContent=t('Checklist saved.','清单已保存。');
    }catch(error){if(seq===request)failure(error);}
    finally{if(seq===request)busy(false);}
  });
  panel.hidden=false;
  return refresh;
}
