// Relationship assessments belong to the release draft. The Python engine computes every path.
export function createWeights({$, el, field, option, call, openDialog, change, select, render,
  getModel, getSelection, canChange}) {
  let zh = new URLSearchParams(location.search).get("lang") === "zh-Hans";
  let origin = "", drawnModel, drawnOrigin, drawnLanguage;
  const t = (en, cn) => zh ? cn : en;

  function labels() {
    const lang = zh ? "zh-Hans" : "en";
    const title = t("Weighted impact", "加权影响");
    for (const id of ["panel-weights", "weights-tab", "weights-legend", "assess-edge"]) $(id).lang = lang;
    $("weights-title").textContent = title;
    $("weights-tab").textContent = title;
    $("assess-edge").textContent = t("Assess relationship", "评估关系");
    $("weights-language").lang = zh ? "en" : "zh-Hans";
    $("weights-language").textContent = zh ? "English" : "简体中文";
    $("weights-required-label").textContent = t("Require complete assessments for release", "发布时要求评估完整");
    $("weights-required-info").textContent = t(
      "Applies to the selected origin. Policy export and publication require a complete trace with operational dependencies and supported assessments.",
      "此项仅适用于所选起点。导出策略或发布时，需要完整追踪已获证据支持且具有业务依赖关系的路径。");
    $("weights-origin-label").textContent = t("Changed object", "发生变更的对象");
    $("weights-legend").textContent = t(
      "Assessed relationships use line width for criticality (1–5). Select a relationship to inspect or edit its assessment.",
      "已评估关系的线宽表示关键性（1–5）。选择关系可查看或编辑其评估。");
    $("weights-method").textContent = t(
      "Trace a change toward dependent objects. Each path shows its highest known criticality and lowest confidence. Missing assessments leave confidence unknown. A reviewer decides what action to take.",
      "从变更沿依赖关系追踪受影响的对象。每条路径显示已知最高关键性和最低置信度。缺少评估时，路径置信度为未知。后续操作由审核人决定。");
  }

  function editEdge() {
    const model = getModel(), index = getSelection()[1], edge = model.edges[index];
    if (!edge) return;
    const prior = edge.assessment;
    openDialog(t("Assess relationship", "评估关系"), form => {
      form.lang = zh ? "zh-Hans" : "en";
      form.append(el("p", [edge.source, edge.predicate, edge.target].join(" → ")));
      const enabled = el("input", null, {type: "checkbox", name: "assessed"});
      enabled.checked = true;
      form.append(field(t("Record an assessment", "记录关系评估"), enabled));
      const fields = el("fieldset", null, {class: "weight-fields"});
      const confidence = el("input", null, {type:"number", name:"confidence", min:"0", max:"1", step:"any", required:""});
      const criticality = el("select", null, {name:"criticality", required:""});
      criticality.append(option("", t("Select a level", "选择级别")), ...[1,2,3,4,5].map(n => option(String(n), String(n))));
      const evidence = el("select", null, {name:"evidence", required:""});
      evidence.append(option("", t("Select source evidence", "选择依据")), ...model.evidence.map(item => option(item.id, item.id)));
      const assessor = el("input", null, {name:"assessor", required:"", maxlength:"8192"});
      const rationale = el("textarea", null, {name:"rationale", required:"", maxlength:"8192", rows:"3"});
      confidence.value = prior?.confidence ?? "";
      criticality.value = prior?.criticality ?? "";
      evidence.value = prior?.evidence ?? "";
      assessor.value = prior?.assessor ?? "";
      rationale.value = prior?.rationale ?? "";
      fields.append(field(t("Confidence in this relationship (0–1)", "关系判断的置信度（0–1）"), confidence),
        field(t("Operational criticality (1 low, 5 critical)", "业务关键性（1 低，5 关键）"), criticality),
        field(t("Evidence record", "证据记录"), evidence), field(t("Assessor", "评估人"), assessor),
        field(t("Rationale for both ratings", "两项评分的依据"), rationale));
      enabled.addEventListener("change", () => { fields.disabled = !enabled.checked; });
      form.append(fields);
      return async data => {
        const draft = structuredClone(model);
        if (enabled.checked) {
          draft.edges[index].assessment = {confidence:Number(data.get("confidence")), criticality:Number(data.get("criticality")),
            evidence:data.get("evidence"), assessor:data.get("assessor").trim(), rationale:data.get("rationale").trim()};
        } else {
          delete draft.edges[index].assessment;
        }
        await call("./api/validate", {model:draft});
        if (getModel() !== model) throw new Error(t("The draft changed. Reopen this relationship.", "草稿已更改，请重新打开此关系。"));
        change(draft, ["edges", index]);
      };
    }, t("Save assessment", "保存评估"));
  }

  function trCoverage(c) {
    const maximum = c.max_known_criticality ?? t("unknown", "未知");
    return t(`${c.unassessed_edges} of ${c.reachable_edges} reachable dependencies have no assessment. Evidence on ${c.review_edges} needs review. The highest known criticality is ${maximum}.`,
      `全部可达依赖关系中，${c.unassessed_edges}/${c.reachable_edges} 条未评估，${c.review_edges} 条的证据需要复核。已知最高关键性为 ${maximum}。`);
  }

  function display(report, model) {
    const root = $("weights-result");
    const states = {assessed:t("Assessed", "已评估"), unassessed:t("Missing assessment", "缺少评估"),
      review_required:t("Review evidence", "需复核证据")};
    const unknown = t("unknown", "未知");
    const edges = new Map(model.edges.map((edge,i) => [JSON.stringify([edge.source,edge.predicate,edge.target]),i]));
    root.replaceChildren(el("p", t(`${report.paths.length} change paths from ${report.origin}.`,
      `从 ${report.origin} 出发，共显示 ${report.paths.length} 条变更路径。`)));
    const coverage = report.coverage;
    if (coverage) root.append(el("p", trCoverage(coverage)));
    if (report.required) {
      let message = t("This origin meets the assessment requirement for release.", "此起点满足发布所需的评估要求。");
      if (report.assessment_issue) {
        const missing = coverage.first_unassessed, review = coverage.first_review_required;
        let reason;
        if (!report.paths.length) reason = "没有可追踪的业务依赖路径。";
        else if (report.truncated) reason = "路径探索达到上限，请缩小范围或修改发布要求。";
        else if (missing) reason = "关系缺少评估：" + [missing.source, missing.predicate, missing.target].join(" → ");
        else if (review) reason = "关系证据需要复核：" + [review.source, review.predicate, review.target, review.evidence].join(" · ");
        message = t("Release blocked. " + report.assessment_issue, "发布受阻。" + (reason || report.assessment_issue));
      }
      root.append(el("p", message, {class: report.assessment_issue ? "status-warning" : ""}));
    }
    if (report.truncated) root.append(el("p", t(
      `Partial results. The search covers up to ${report.limits.max_paths} paths of ${report.limits.max_depth} steps each.`,
      `仅显示部分结果。搜索上限为 ${report.limits.max_paths} 条路径，每条最多 ${report.limits.max_depth} 步。`), {class:"status-warning"}));
    for (const path of report.paths) {
      const row = el("details", null, {class:"weight-path"});
      const summary = el("summary", null);
      summary.append(el("strong",path.nodes.join(" → ")), el("small",[
        states[path.status], t("Highest known criticality","已知最高关键性")+" "+(path.criticality ?? unknown),
        t("Path confidence","路径置信度")+" "+(path.confidence ?? unknown),
        t("Missing assessments","缺少评估数")+" "+path.unassessed_edges,
      ].join(" · ")));
      row.append(summary);
      row.addEventListener("toggle", () => {
        if (!row.open || row.childElementCount > 1) return;
        const steps = el("ol",null);
        for (const step of path.steps) {
          const i = edges.get(JSON.stringify([step.source,step.predicate,step.target]));
          const edge = model.edges[i], a = edge.assessment;
          const line = el("li",null), inspect = el("button", [step.source,step.predicate,step.target].join(" → "), {type:"button"});
          inspect.addEventListener("click", () => select(["edges",i]));
          line.append(inspect);
          if (a) {
            const source = model.evidence.find(entry => entry.id === a.evidence);
            const status = {confirmed:t("confirmed","已确认"), disputed:t("disputed","有争议"), insufficient:t("insufficient","证据不足")};
            line.append(el("p",[t("Criticality","关键性")+" "+a.criticality+"/5",t("Confidence","置信度")+" "+a.confidence,
              t("Assessor","评估人")+" "+a.assessor, t("Evidence","证据")+" "+a.evidence+" ("+status[source.status]+")"].join(" · ")),
              el("p",a.rationale));
          } else {
            line.append(el("p",states.unassessed));
          }
          steps.append(line);
        }
        row.append(steps);
      });
      root.append(row);
    }
  }

  async function panel() {
    const model = getModel();
    const picker = $("weights-origin"), selected = getSelection();
    if (drawnModel !== model) {
      const preferred = origin || (selected[0] === "nodes" ? model.nodes[selected[1]]?.id : "");
      picker.replaceChildren(...model.nodes.map(n => option(n.id, (n.label || n.id)+" · "+n.id)));
      if (model.nodes.some(n => n.id === preferred)) picker.value = preferred;
      origin = picker.value;
    }
    $("weights-required").checked = (model.required_assessment_origins || []).includes(origin);
    $("weights-required").disabled = false;
    try { canChange(); } catch (error) {
      $("weights-required").disabled = true;
      drawnModel = undefined;
      $("weights-result").textContent = t("Apply your JSON edits before tracing this draft.", "追踪草稿前请先应用 JSON 修改。");
      return;
    }
    if (drawnModel === model && drawnOrigin === origin && drawnLanguage === zh) return;
    drawnModel = model;
    drawnOrigin = origin;
    drawnLanguage = zh;
    const requested = origin, language = zh;
    const current = () => model === getModel() && model === drawnModel && origin === requested && zh === language;
    const root = $("weights-result");
    root.replaceChildren(el("p", t("Tracing change paths…","正在追踪变更路径…")));
    try {
      const report = await call("./api/weighted-impact", {model, node_id:requested});
      if (current()) display(report,model);
    } catch (error) {
      if (current()) {
        root.textContent = t("Cannot trace this draft. ","无法追踪该草稿。")+error.message;
        drawnModel = undefined;
      }
    }
  }
  $("weights-required").addEventListener("change", async () => {
    const checkbox = $("weights-required"), model = getModel(), requested = origin;
    const setRequired = checkbox.checked;
    checkbox.disabled = true;
    try {
      canChange();
      const draft = structuredClone(model);
      const origins = new Set(draft.required_assessment_origins || []);
      if (setRequired) origins.add(requested); else origins.delete(requested);
      if (origins.size) draft.required_assessment_origins = [...origins].sort();
      else delete draft.required_assessment_origins;
      await call("./api/validate", {model:draft});
      if (getModel() !== model || origin !== requested) return;
      change(draft);
    } catch (error) {
      if (getModel() === model && origin === requested) {
        checkbox.checked = !setRequired;
        $("weights-result").textContent = t("Could not change the release requirement. ", "无法修改发布要求。")+error.message;
        drawnModel = undefined;
      }
    } finally {
      checkbox.disabled = false;
    }
  });
  $("weights-origin").addEventListener("change", () => {origin = $("weights-origin").value; void panel();});
  $("weights-language").addEventListener("click", () => {
    zh = !zh;
    const url = new URL(location.href);
    if (zh) url.searchParams.set("lang","zh-Hans"); else url.searchParams.delete("lang");
    history.replaceState(null,"",url);
    render();
  });
  return {labels, editEdge, panel, isChinese:() => zh};
}
