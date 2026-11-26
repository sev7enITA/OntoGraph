// Bilingual signals are suggestions. Keep the user's excerpt as unconfirmed evidence.
const categories = {
  record: ['Business objects', '业务对象'], event: ['Events', '事件'],
  key: ['Identifiers', '标识符'], actor: ['Participants', '参与者'],
  measure: ['Measures', '度量'], state: ['States', '状态'], term: ['Terms to classify', '待分类术语']
};

// Each recognized term carries a proposed definition and a question to resolve.
const vocabulary = [
  ['edition','record',/\b(?:books?|editions?)\b|图书|书籍|版本/iu,'Edition','图书版本','A publication shared by copies of the same edition.','同一版本的多本馆藏书所共有的出版物。'],
  ['copy','record',/\b(?:copies|copy)\b|复本|馆藏书|副本/iu,'Physical copy','实体副本','One lendable item with its own identity and availability.','有独立标识和可借状态的一件物品。'],
  ['isbn','key',/isbn/iu,'ISBN','ISBN','Identifies a publication edition. Several copies can share it.','标识出版物版本。多个副本可共用同一 ISBN。'],
  ['loan','event',/\b(?:loans?|lend\w*|borrow\w*)\b|借阅|借出/iu,'Loan','借阅','One lending event for an identified item. Confirm when it ends.','一次针对特定物品的借阅。需确认何时结束。'],
  ['wbs','key',/\bwbs\b/iu,'WBS code','WBS 编码','A code whose business meaning depends on its source and department.','其业务含义取决于来源及所属部门的编码。'],
  ['department','actor',/\b(?:pmo|departments?|finance)\b|财务|部门|项目管理办公室/iu,'Department','部门','The organizational unit responsible for a definition in its context.','在特定业务范围内负责定义的组织单位。'],
  ['reservation','event',/\b(?:reservations?|bookings?|appoint\w*|reserves?|schedules?)\b|预约|预订|排班/iu,'Reservation','预约','A claim on the use of a resource for a time interval.','在某个时段使用一项资源的约定。'],
  ['room','record',/\b(?:rooms?|spaces?)\b|房间|会议室|场地/iu,'Space','场地','A particular space that can be allocated. Confirm its unique identifier.','可供分配的具体场地。需确认唯一标识。'],
  ['equipment','record',/\b(?:equipment|tools?|bikes?|devices?)\b|设备|工具|自行车/iu,'Equipment item','设备单件','One identifiable item. Confirm whether the app tracks units or types.','一件可识别的设备。需确认应用追踪单件还是型号。'],
  ['payment','event',/\b(?:payments?|refunds?|invoices?)\b|付款|退款|发票/iu,'Financial transaction','财务交易','An amount recorded for a specific event. Specify currency and effective date.','针对一项事件记录的金额。需指定币种及生效日期。'],
  ['quantity','measure',/\b(?:stock|inventory|quantit\w*|units?|kilograms?)\b|库存|数量|单位|公斤/iu,'Quantity','数量','A measured amount for one item, unit and reference time.','一个物品在指定时间以指定单位计量的数值。'],
  ['customer','actor',/\b(?:customers?|clients?|members?|readers?)\b|客户|会员|读者/iu,'Participant','业务参与者','A person or organization participating in the described workflow. Confirm which role is meant.','参与该流程的个人或机构。需确认具体角色。'],
  ['source','record',/\b(?:csv|imports?|exports?|spreadsheets?|files?)\b|表格|导入|导出|文件/iu,'Source record','来源记录','One row from an identified source and layout version.','来自已识别数据源和格式版本的一行数据。'],
  ['status','state',/\b(?:statuses|status|approved|available|active|closed)\b|状态|已批准|可用|已关闭/iu,'Status','状态','A state declared by a given actor at a given time. Confirm the permitted transitions.','特定主体在特定时间声明的状态。需确认允许的状态变迁。'],
  ['answer','record',/\b(?:copilot|chatbot|assistant|agents?)\b|智能体|助手|聊天机器人/iu,'Agent answer','智能体答复','An answer grounded in a term definition for a particular audience.','依据特定受众适用的术语定义给出的答复。']
];
const riskPatterns = [
  [['isbn','copy','edition'],'Are distinct items being merged?','是否合并了不同的物品？','Try two copies with the same ISBN. Acting on one should leave the other available.','用同一 ISBN 的两个副本测试。操作其中一本后，另一本应仍可用。'],
  [['wbs','department','source'],'Can two sources reuse the same code?','两个来源是否复用了同一编码？','Try an identical code from two sources, then remove the source. Decide when to hold the match.','分别使用两个来源的相同编码，再去掉来源。确定何时暂停匹配。'],
  [['reservation'],'What happens when bookings overlap?','预约时间重叠时如何处理？','Try two requests for the same interval and resource, including one cancellation.','尝试同一时段、同一资源的两个请求，并取消其中一个。'],
  [['quantity','payment'],'Are the amounts comparable?','这些数值能直接比较吗？','Try equal numbers in different units or currencies. Confirm the conversion or hold the total.','尝试不同单位或币种的相同数值。确认换算方式，或暂停汇总。'],
  [['status','answer'],'Is the decision based on an outdated definition?','决策是否使用了过期定义？','Compare a current definition with a withdrawn one in the receiving app. Record which was used.','在接收应用中比较现行和已撤回的定义，记录实际使用的版本。']
];
const joins = [['copy','edition'],['loan','copy'],['loan','customer'],['reservation','room'],['reservation','equipment'],['reservation','customer'],['quantity','equipment'],['wbs','department'],['wbs','source'],['answer','source'],['payment','customer']];
const stops = new Set(('a an the i we my our their that this those want wants need needs build building develop developing app apps application software program system for from with into our only may might let same each other they their them these two then before after separately same need needs make makes include including about describes want something different what physical using uses user users can will should must would to of at as is are be on in by it each one and or but allows allow lets let manage manages track tracks create creates record records 我要 我想 一个 一个能 可以 需要 用于 应用 开发 系统 我们 管理 记录 跟踪 并且 能够 使用 用户 通过 实现 提供 以及 希望 这个 帮助 自己 一个 两个 一次 同一个 可能 分别 每个 其中 对应').split(' '));

// A stated allocation is more specific than co-occurrence. Keep both source phrases.
function allocation(text,chinese){
  const en=text.match(/\b(?:assigns?|allocates?|matches?)\s+(?:an? |the )?(["“]?)([\p{L}][\p{L} -]{0,40}?)\1\s+(?:to|with)\s+(?:an? |the )?(?:["“]([^"”]{1,45})["”]|([\p{L}-]+))/iu);
  const cn=text.match(/(?:将|把)([\p{Script=Han}“”「」]{1,18}?)(?:分配|指派|匹配)(?:给|到|至)([\p{Script=Han}“”「」]{1,18}?)(?:[，。；、\s]|$)/u);
  const args=en?[en[2],en[3]||en[4]]:cn?[cn[1],cn[2]]:null;
  if(!args)return null;
  const labels=args.map(v=>v.replace(/[“”「」"]/gu,'').trim());
  if(labels[0]===labels[1])return null;
  return {labels,signal:(en||cn)[0],name:chinese?'分配记录':'Assignment'};
}

// Explicit definitions and relationships take priority over vocabulary suggestions.
function statements(text){
  const definitions=[], relations=[];
  const pattern=/["“「《]([^"”」》\n]{1,60})["”」》]\s*(?:means\b|refers to\b|指的是|是指|表示|指)\s*([^.!?。！？；;\n]{1,160})/giu;
  for(const m of text.matchAll(pattern))definitions.push([m[1].trim(),m[2].trim(),m[0]]);
  const links=/["“「《]([^"”」》\n]{1,60})["”」》]\s*(depends on|is a type of|is a kind of|依赖于|依赖|属于)\s*["“「《]([^"”」》\n]{1,60})["”」》]/giu;
  for(const m of text.matchAll(links))relations.push([m[1].trim(),m[3].trim(),/depends on|依赖/iu.test(m[2])?'dependsOn':'broader']);
  return {definitions,relations};
}

function extractedTerms(text, known) {
  const quoted = [...text.matchAll(/["“「《]([^"”」》\n]{1,60})["”」》]/gu)].map(m=>m[1].trim());
  const candidates = [...quoted];
  const cleaned = text.replace(/https?:\/\/\S+/gu,' ').replace(/[“「《"”」》]/gu,' ');
  const words = typeof Intl.Segmenter === 'function'
    ? Array.from(new Intl.Segmenter(/\p{Script=Han}/u.test(text)?'zh':'en',{granularity:'word'}).segment(cleaned)).filter(s=>s.isWordLike).map(s=>s.segment)
    : cleaned.match(/[\p{L}\p{N}_-]+/gu)||[];
  const counts=new Map();
  for(const word of words){
    const key=word.toLowerCase();
    if(word.length<2 || word.length>50 || stops.has(key) || !/\p{L}/u.test(word) || known.some(re=>re.test(word)))continue;
    counts.set(word,(counts.get(word)||0)+1);
  }
  candidates.push(...[...counts.keys()].sort((a,b)=>counts.get(b)-counts.get(a)));
  return [...new Set(candidates)].filter(Boolean).slice(0,quoted.length?5:3);
}

export async function propose(description, chinese, workspace) {
  const t=(en,cn)=>chinese?cn:en;
  const text=description.trim();
  if(text.length<10 || text.length>3000 || !/\p{L}/u.test(text))throw Error(t('Describe your app in 10–3,000 characters, including a word.','请用 10 至 3,000 个字符描述应用，至少包含一个词。'));
  const now=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  const owner=t('App owner to confirm','待应用负责人确认');
  const nodes=[],edges=[];
  const node=(id,kind,label,definition)=>nodes.push({id,kind,label,definition,owner});
  const edge=(source,predicate,target)=>{
    if(!edges.some(e=>e.source===source&&e.predicate===predicate&&e.target===target))edges.push({source,predicate,target});
  };
  const matched=vocabulary.filter(row=>row[2].test(text));
  const terms=matched.map(([id,group,re,en,cn,de,dc])=>({id,group,label:t(en,cn),definition:t(de,dc),signal:text.match(re)[0]}));
  const assignment=allocation(text,chinese),participants=[];
  if(assignment){
    terms.push({id:'assignment',group:'event',label:assignment.name,signal:assignment.signal,definition:t('One assignment connecting the two participants named in the brief. Confirm who can change it.','描述中两个参与方之间的一次分配。请确认谁可以更改。')});
    for(const [i,label] of assignment.labels.entries()){
      const match=matched.find(row=>row[2].test(label));
      if(match){participants.push(match[0]);continue;}
      const id='participant-'+i;
      participants.push(id);
      terms.push({id,group:i?'record':'actor',label,signal:label,definition:t('Proposed '+(i?'destination':'subject')+' of an assignment. Confirm what identifies one “'+label+'”.','拟议的分配'+(i?'目标':'主体')+'。请确认如何唯一识别“'+label+'”。')});
    }
  }
  for(const [i,label] of extractedTerms(text,matched.map(r=>r[2])).entries()){
    if(terms.some(term=>term.label.toLowerCase()===label.toLowerCase()))continue;
    terms.push({id:'custom-'+i,group:'term',label,signal:label,definition:t('Candidate from your description. Define what “'+label+'” represents and give a counterexample.','从描述中提取的候选术语。请说明一个“'+label+'”指什么，并给出反例。')});
  }
  if(!terms.length)throw Error(t('Put a business term in quotation marks so it can be included in your model.','请用引号标出一个业务术语，以便将其加入模型。'));
  const declared=statements(text);
  function statedTerm(label){
    let term=terms.find(x=>x.label.toLowerCase()===label.toLowerCase()||x.signal.toLowerCase()===label.toLowerCase());
    if(!term){
      term={id:'stated-'+terms.length,group:'term',label,signal:label,definition:t('Named in the app description. Confirm its definition.','应用描述中提及的术语，其定义待确认。')};
      terms.push(term);
    }
    return term;
  }
  for(const [label,meaning,signal] of declared.definitions){
    const term=statedTerm(label);term.definition=meaning;term.signal=signal;
  }
  const customLinks=[];
  for(const [from,to,predicate] of declared.relations){
    const child=statedTerm(from),parent=statedTerm(to);
    if(child.id===parent.id)continue;
    if(predicate==='broader'){
      // Preserve a valid hierarchy. Contradictory cyclic classifications need a human decision.
      const seen=new Set([child.id]);
      const pending=[parent.id];
      let cycle=false;
      while(pending.length){
        const id=pending.pop();
        if(id===child.id){cycle=true;break;}
        if(seen.has(id))continue;
        seen.add(id);
        pending.push(...customLinks.filter(e=>e.predicate==='broader'&&e.source===id).map(e=>e.target));
      }
      if(cycle)throw Error(t('The stated categories form a cycle. Revise which term is broader and try again.','描述中的分类形成了循环。请调整上下位关系后重试。'));
    }
    customLinks.push({source:child.id,predicate,target:parent.id});
  }
  const first=terms[0], ids=new Set(terms.map(x=>x.id));
  const purpose=t('Proposed semantic model for the described app.','根据应用描述提出的语义模型。');
  node('app','application',t('Proposed app','拟开发的应用'),text);
  node('contract','contract',t('Review contract','复核约定'),t('Require an explicit human review before using this interpretation.','使用该解释前须由人工复核。'));
  node('reviewed','field',t('Interpretation reviewed','解释已复核'),t('True only after a human has reviewed the intended meaning.','仅在人工核实预期含义后为真。'));
  node('review','control',t('Review gate','复核条件'),t('Hold the example decision until its interpretation has been reviewed.','在解释未经复核时暂缓示例决策。'));
  edge('app','consumes','contract');edge('review','implements','contract');edge('review','dependsOn','reviewed');
  for(const group of new Set(terms.map(x=>x.group))){
    const label=t(...categories[group]);node('group-'+group,'concept',label,t('Proposed category for this app’s vocabulary.','为此应用的术语提出的分类。'));
  }
  for(const term of terms){
    node(term.id,'concept',term.label,term.definition);edge(term.id,'broader','group-'+term.group);
    edge('app','dependsOn',term.id);
  }
  for(const [from,to] of joins)if(ids.has(from)&&ids.has(to))edge(from,'dependsOn',to);
  for(const link of customLinks)edge(link.source,link.predicate,link.target);
  for(const id of new Set(participants))edge('assignment','dependsOn',id);
  const risks=riskPatterns.filter(([keys])=>keys.some(key=>ids.has(key))).map(([keys,en,cn,de,dc])=>({term:keys.find(k=>ids.has(k)),label:t(en,cn),definition:t(de,dc)}));
  if(assignment)risks.unshift({term:'assignment',label:t('Could the same assignment be counted twice?','同一分配是否可能被重复计数？'),definition:t('Submit the same assignment of '+assignment.labels.join(' → ')+' twice. Define how to distinguish a retry from a new event.','重复提交 '+assignment.labels.join(' → ')+' 的同一分配。定义如何区分重试与新事件。')});
  if(!risks.length)risks.push({term:first.id,label:t('Could “'+first.label+'” refer to two different things?','“'+first.label+'”是否有不同含义？'),definition:t('Compare two records with the same label and different owners or identifiers. Ask which decision should change.','比较名称相同但负责人或标识符不同的两条记录。请确认应改变哪项决策。')});
  for(const [i,risk] of risks.entries()){node('risk-'+i,'control',risk.label,risk.definition);edge('risk-'+i,'dependsOn',risk.term);}
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),v=>v.toString(16).padStart(2,'0')).join('');
  const model={format:'ontograph.release/1',domain:workspace,purpose,owner,scope:purpose,effective_at:now,
    evidence:[{id:'brief',uri:'urn:ontograph:'+workspace+':brief',excerpt:text,sha256:sha,observed_at:now,status:'insufficient',applicability:t('User brief. Proposed meanings await human review.','用户描述。拟议含义有待人工复核。')}],nodes,edges,
    rules:[{id:'review-rule',control:'review',evidence:'brief',applies:{},requires:{reviewed:true}}],
    probes:[true,false].map(value=>({id:value?'review-yes':'review-no',application:'app',rule:'review-rule',facts:{reviewed:value},expected:value?'allow':'hold'}))};
  return {model,terms,risks};
}
