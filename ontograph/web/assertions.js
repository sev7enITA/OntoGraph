// The hosted and standalone workspaces share this form. The engine validates the draft and fingerprints its sources.
function node(tag, text, attributes = {}) {
  const element = document.createElement(tag);
  if (text != null) element.textContent = text;
  for (const [key,value] of Object.entries(attributes)) element.setAttribute(key,value);
  return element;
}
function field(parent, label, control) {
  const wrapper = node("label");
  wrapper.append(node("span",label),control);
  parent.append(wrapper);
  return control;
}
function choice(value, text) { return node("option",text,{value}); }
function entry(parent, label, name, value = "", attributes = {}) {
  const control = field(parent,label,node("input",null,{name,required:"",...attributes}));
  control.value = value;
  return control;
}
const idPattern = "[a-z][a-z0-9_\\-]{0,63}";
function evidenceFor(model,id) { return model.evidence.find(e => e.id === id); }

export function assertionForm(form, model, index, {t, getBasis, principal = ""}) {
  const edge = model.edges[index], base = edge.assessment;
  const assertions = edge.assertions || (base ? [{...base,id:"baseline",stance:"supports",
    asserted_at:evidenceFor(model,base.evidence).observed_at}] : []);
  form.append(node("p",[edge.source,edge.predicate,edge.target].join(" → ")));
  const review = edge.assertions ? getBasis(model,index) : null;
  if (review) {
    const summary = node("p",t("Checking current judgment…","正在检查当前判断…"),{class:"decision-state",role:"status"});
    form.append(summary);
    review.then(result => {
      const states={unresolved_conflict:t("Disagreement requires review","分歧需审核"),stale_resolution:t("Evidence changed. Reopen the resolution.","证据已更改，请重新裁定。"),
        agreement:t("Assertions agree","各项判断一致"),resolved:t("Resolution current","裁定有效")};
      summary.textContent=states[result.resolution_state]+" · "+t("Criticality range","关键性范围")+" "+result.criticality_range.join("–")+
        "/5 · "+t("Confidence range","置信度范围")+" "+result.confidence_range.join("–");
      summary.dataset.state=result.resolution_state;
    }).catch(error => {summary.textContent=error.message;});
  }
  if (base) form.append(node("p",t("Adding an assertion keeps the existing assessment as “baseline”, dated to its source observation. The source date is a migration convention.",
    "添加判断时，现有评估将作为“baseline”保留，并使用来源观测时间作为迁移时间。")));
  for (const assertion of assertions) {
    const details = node("details",null,{class:"assertion-record"});
    const evidence = evidenceFor(model,assertion.evidence);
    details.append(node("summary",assertion.id+" · "+(assertion.stance==="challenges"?t("Challenges","质疑"):t("Supports","支持"))+
      " · "+assertion.criticality+"/5 · "+assertion.confidence),node("p",assertion.assessor+" · "+assertion.asserted_at+" · "+assertion.rationale),
      node("p",evidence.uri+" · "+evidence.observed_at+" · "+evidence.excerpt),node("p",evidence.applicability+" · "+evidence.status),node("code",evidence.sha256));
    form.append(details);
  }
  if (edge.resolution) form.append(node("p",t("Recorded resolution","已记录的裁定")+" · "+edge.resolution.selected+" · "+
    edge.resolution.reviewer+" · "+edge.resolution.resolved_at+" · "+edge.resolution.rationale));
  const mode = field(form,t("Review action","审核操作"),node("select",null,{name:"action"}));
  mode.append(choice("add",t("Add an attributed assertion","添加署名判断")));
  if (edge.assertions?.length) mode.append(choice("resolve",t("Record a resolution","记录裁定")));
  const add = node("fieldset",null,{class:"weight-fields"}), resolve = node("fieldset",null,{class:"weight-fields"});
  form.append(add,resolve);
  entry(add,t("Assertion ID","判断 ID"),"assertion_id","",{pattern:idPattern,maxlength:"64"});
  const stance = field(add,t("Does this source support the relationship?","此来源是否支持该关系？"),node("select",null,{name:"stance"}));
  stance.append(choice("supports",t("Supports","支持")),choice("challenges",t("Challenges","质疑")));
  entry(add,t("Criticality (1–5)","关键性（1–5）"),"severity","",{type:"number",min:"1",max:"5",step:"1"});
  entry(add,t("Confidence (0–1)","置信度（0–1）"),"strength","",{type:"number",min:"0",max:"1",step:"any"});
  entry(add,t("Assessor","评估人"),"assessor",principal);
  entry(add,t("Assessment time (UTC)","评估时间（UTC）"),"asserted_at",model.effective_at);
  field(add,t("Reason for this judgment","判断依据"),node("textarea",null,{name:"reason",required:"",rows:"2"}));
  const source = field(add,t("Evidence record","证据记录"),node("select",null,{name:"source",required:""}));
  source.append(choice("",t("Select evidence","选择证据")),...model.evidence.map(e=>choice(e.id,e.id)),choice("+",t("Create a source record","创建来源记录")));
  const fresh = node("fieldset",null,{class:"weight-fields"}); add.append(fresh);
  entry(fresh,t("Evidence ID","证据 ID"),"evidence_id","",{pattern:idPattern,maxlength:"64"});
  entry(fresh,t("Source URI","来源 URI"),"uri");
  entry(fresh,t("Observed at (UTC)","观测时间（UTC）"),"observed_at",model.effective_at);
  field(fresh,t("Source excerpt","来源摘录"),node("textarea",null,{name:"excerpt",required:"",rows:"2"}));
  entry(fresh,t("Where the evidence applies","证据适用范围"),"applicability");
  const status=field(fresh,t("Source status","来源状态"),node("select",null,{name:"status"}));
  status.append(choice("confirmed",t("Confirmed","已确认")),choice("disputed",t("Disputed","有争议")),choice("insufficient",t("Insufficient","证据不足")));
  const selected = field(resolve,t("Select a supported assertion","选择已获支持的判断"),node("select",null,{name:"selected",required:""}));
  selected.append(choice("",t("Choose an assertion","选择判断")),...assertions.filter(a=>a.stance!=="challenges" && evidenceFor(model,a.evidence).status==="confirmed").map(a=>choice(a.id,a.id+" · "+a.assessor)));
  entry(resolve,t("Reviewer principal ID","审核人主体 ID"),"reviewer",principal,{pattern:idPattern,maxlength:"64"});
  entry(resolve,t("Resolution time (UTC)","裁定时间（UTC）"),"resolved_at",model.effective_at);
  field(resolve,t("Explain how the competing evidence was weighed","解释如何权衡不同证据"),node("textarea",null,{name:"resolution_reason",required:"",rows:"3"}));
  resolve.append(node("p",t("Publication requires this reviewer's authenticated approval in the registry.","发布时，登记系统需要该审核人通过身份验证后批准。")));
  function toggle() {
    for (const [block,visible] of [[add,mode.value==="add"],[resolve,mode.value==="resolve"],[fresh,source.value==="+"]]) {
      block.disabled=!visible; block.hidden=!visible;
    }
  }
  mode.onchange=toggle; source.onchange=toggle; toggle();
  return async data => {
    const draft = structuredClone(model), next = draft.edges[index];
    const value = name => String(data.get(name)??"").trim();
    if(mode.value==="resolve") {
      const {basis} = await review;
      next.resolution = {selected:value("selected"),reviewer:value("reviewer"),rationale:value("resolution_reason"),resolved_at:value("resolved_at"),basis};
    } else {
      let evidence = value("source");
      if (evidence==="+") {
        const excerpt=value("excerpt");
        const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(excerpt));
        evidence=value("evidence_id");
        draft.evidence.push({id:evidence,uri:value("uri"),excerpt,observed_at:value("observed_at"),applicability:value("applicability"),
          status:value("status"),sha256:Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,"0")).join("")});
      }
      delete next.assessment;
      next.assertions=[...assertions,{id:value("assertion_id"),stance:value("stance"),confidence:Number(value("strength")),
        criticality:Number(value("severity")),assessor:value("assessor"),asserted_at:value("asserted_at"),rationale:value("reason"),evidence}];
    }
    return draft;
  };
}
