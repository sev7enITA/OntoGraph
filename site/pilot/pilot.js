(() => {
  const chinese = document.documentElement.lang === "zh-Hans";
  const tr = (en, zh) => (chinese ? zh : en);
  const el = (id) => document.getElementById(id);
  const nodes = [...document.querySelectorAll(".node")];
  const tabs = [el("hub-tab"), el("standalone-tab")];
  const labels = {
    hub: {
      trace: tr("Recorded path · Framework hub", "实测路径 · 框架协作"),
      title: tr("Challenge the signal.", "检验这条信号。"),
      copy: tr(
        "This browser simulation uses a small sample. Change the input to test the rule locally.",
        "此浏览器模拟使用精简示例。更改输入，在本地检验规则。",
      ),
    },
    standalone: {
      trace: tr("Recorded path · Offline lab", "实测路径 · 离线实验室"),
      title: tr("Try the lab’s rule.", "试用实验室规则。"),
      copy: tr(
        "Change a synthetic certificate, or withdraw the release and inspect what the bench can prove.",
        "更改模拟证书，或撤回版本，查看工作台的观测能够证明什么。",
      ),
    },
  };

  const chapterTimes = { hub: [10, 22, 35, 48], standalone: [61, 61, 68, 75] };
  let route;
  let step = 0;
  let timer;
  let editSequence = 0;
  const records = {};
  for (const key of Object.keys(labels)) {
    records[key] = [...el(key + "-record").children].map((row) => ({
      node: row.dataset.node,
      title: row.querySelector("h3").textContent,
      copy: row.querySelector("p").textContent,
      field: row.querySelector("small").textContent,
      value: row.querySelector("code").textContent,
    }));
  }

  function playLabel() {
    el("play").textContent = timer
      ? tr("Ⅱ  Pause", "Ⅱ  暂停")
      : step === nodes.length - 1
        ? tr("↺  Replay", "↺  重播")
        : tr("▷  Play trace", "▷  播放路径");
  }
  function stop() {
    clearInterval(timer);
    timer = null;
    el("console").classList.remove("playing");
    playLabel();
  }
  function displayStep(index) {
    step = index;
    const current = records[route][step];
    nodes.forEach((node, i) => {
      node.querySelector(".node-label").textContent = records[route][i].node;
      node.classList.toggle("past", i < step);
      node.setAttribute("aria-current", i === step ? "step" : "false");
      node.setAttribute("aria-label", records[route][i].node + " · " + records[route][i].title);
    });
    el("phase").textContent =
      tr("Recorded observation", "实测观测") + " / " + String(step + 1).padStart(2, "0");
    el("stage-title").textContent = current.title;
    el("stage-copy").textContent = current.copy;
    el("evidence-key").textContent = current.field;
    el("evidence-value").textContent = current.value;
    const second = chapterTimes[route][step];
    const clock = Math.floor(second / 60) + ":" + String(second % 60).padStart(2, "0");
    el("chapter").textContent = tr("Watch this stage", "观看此阶段") + " · " + clock + " ↗";
    el("counter").textContent = step + 1 + " / " + nodes.length;
    el("prev").disabled = step === 0;
    el("next").disabled = step === nodes.length - 1;
    el("console").dataset.pending = String(route === "hub" && step === 3);
    playLabel();
  }
  function report(style, verdict, reason) {
    el("result").dataset.status = style;
    el("verdict").textContent = verdict;
    el("reason").textContent = reason;
  }

  // Only this small public projection is hashed. The archived pilot used the full native signal.
  const changeId = "429e2afa-3202-4708-97b6-1797cf3fca26";
  const original = {
    changeId,
    url: "https://policywatcher.online/change/" + changeId,
    authority: "monitoring",
    summary: "Recorded summary",
  };
  function signalHash(signal) {
    const bytes = new TextEncoder().encode(JSON.stringify(signal));
    return crypto.subtle.digest("SHA-256", bytes).then((buffer) => new Uint8Array(buffer).join(","));
  }
  async function evaluate() {
    const revision = ++editSequence;
    if (route === "standalone") {
      const lifecycle = el("withdrawal").value;
      const active = lifecycle === "active";
      el("certificate-stage").disabled = !active;
      el("budget").disabled = !active;
      if (lifecycle === "receipt")
        return report(
          "pending",
          tr("Unproven", "尚未证实"),
          tr(
            "The consumer acknowledged withdrawal. An independent observation of inactivity is still missing.",
            "消费端已确认收到撤回请求，仍缺少独立的停用观测。",
          ),
        );
      if (lifecycle === "observed")
        return report(
          "allow",
          tr("Withdrawal verified", "撤回已验证"),
          tr(
            "The bench was observed inactive after the withdrawal receipt.",
            "收到撤回回执后，独立观测确认工作台已停用。",
          ),
        );
      if (el("certificate-stage").value !== "final")
        return report(
          "neutral",
          tr("Outside scope", "不在范围内"),
          tr("The release rule applies only to final certificates.", "该发布规则仅适用于最终证书。"),
        );
      if (el("budget").value !== "recorded")
        return report(
          "hold",
          tr("Hold certificate", "暂缓证书"),
          tr(
            "A final certificate requires a recorded measurement uncertainty budget.",
            "最终证书须记录测量不确定度预算。",
          ),
        );
      return report(
        "allow",
        tr("Allow dispatch", "允许发出"),
        tr(
          "The final certificate has its required measurement uncertainty budget.",
          "这份最终证书已记录所需的测量不确定度预算。",
        ),
      );
    }
    const signal = { ...original };
    if (el("change-id").value === "wrong") signal.changeId = "other-change";
    if (el("authority").value === "approve") signal.authority = "approval";
    if (el("summary").value === "altered") signal.summary = "Edited summary";
    if (signal.authority !== original.authority)
      return report(
        "hold",
        tr("Hold at intake", "准入暂缓"),
        tr(
          "The source has monitoring authority. A claim of approval fails the authority check.",
          "来源只具备监测权限。审批声明未能通过权限检查。",
        ),
      );
    if (signal.changeId !== original.changeId || signal.url !== original.url)
      return report(
        "hold",
        tr("Hold at intake", "准入暂缓"),
        tr(
          "The format accepts this shape. The change ID does not match the source bound to the rule.",
          "原生格式允许这种结构，但变更编号与规则绑定的来源不符。",
        ),
      );
    if (!globalThis.crypto?.subtle)
      return report(
        "pending",
        tr("Integrity check unavailable", "无法校验完整性"),
        tr(
          "Open this replay over HTTPS to compare the browser sample hashes.",
          "请使用 HTTPS 打开回放以比对浏览器示例的摘要。",
        ),
      );
    try {
      const [actual, expected] = await Promise.all([signalHash(signal), signalHash(original)]);
      if (revision !== editSequence) return;
      if (actual !== expected)
        return report(
          "hold",
          tr("Stop before PALO", "在 PALO 导入前拦截"),
          tr(
            "The routing fields match. The edited text changes this replay sample’s SHA-256 digest.",
            "路由字段一致，但改写摘要会改变此回放示例的 SHA-256 值。",
          ),
        );
      report(
        "pending",
        tr("Admit for human review", "接纳并等待人工复核"),
        tr(
          "Fields and replay digest match. PALO can reopen Measure and Prove. Applicability awaits a human decision.",
          "字段和回放示例摘要一致。PALO 可重开衡量与验证阶段，适用性仍待人工决定。",
        ),
      );
    } catch {
      if (revision === editSequence)
        report(
          "pending",
          tr("Integrity check unavailable", "无法校验完整性"),
          tr("The browser could not compute a digest.", "浏览器未能计算摘要。"),
        );
    }
  }
  function selectRoute(value) {
    stop();
    route = value;
    tabs.forEach((tab, i) => {
      const current = value === (i ? "standalone" : "hub");
      tab.setAttribute("aria-selected", String(current));
      tab.tabIndex = current ? 0 : -1;
    });
    el("workspace").setAttribute("aria-labelledby", value + "-tab");
    el("trace-kind").textContent = labels[value].trace;
    el("challenge-title").textContent = labels[value].title;
    el("challenge-copy").textContent = labels[value].copy;
    el("hub-form").hidden = value !== "hub";
    el("stand-form").hidden = value !== "standalone";
    displayStep(0);
    evaluate();
  }
  function tabChange(index) {
    selectRoute(index ? "standalone" : "hub");
    history.replaceState(null, "", index ? "#standalone" : "#hub");
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => tabChange(i));
    tab.addEventListener("keydown", (event) => {
      const index = { ArrowLeft: 1 - i, ArrowRight: 1 - i, Home: 0, End: 1 }[event.key];
      if (index === undefined) return;
      event.preventDefault();
      tabs[index].focus();
      tabChange(index);
    });
  });
  nodes.forEach((node, i) =>
    node.addEventListener("click", () => {
      stop();
      displayStep(i);
    }),
  );
  el("prev").addEventListener("click", () => {
    stop();
    displayStep(step - 1);
  });
  el("next").addEventListener("click", () => {
    stop();
    displayStep(step + 1);
  });
  el("play").addEventListener("click", () => {
    if (timer) return stop();
    if (step === nodes.length - 1) displayStep(0);
    el("console").classList.add("playing");
    timer = setInterval(() => {
      displayStep(step + 1);
      if (step === nodes.length - 1) stop();
    }, 6500);
    playLabel();
  });
  document
    .querySelectorAll(".testbench select")
    .forEach((input) => input.addEventListener("change", evaluate));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
  const player = document.querySelector("video");
  player.addEventListener("play", stop);
  el("chapter").addEventListener("click", () => {
    const second = chapterTimes[route][step];
    stop();
    player.currentTime = second;
    player.focus({ preventScroll: true });
    // Native controls remain available if the browser requires another playback gesture.
    player.play().catch(() => {});
  });
  selectRoute(location.hash === "#standalone" ? "standalone" : "hub");
  el("console").hidden = false;
  const branch = { "#policywatcher": 0, "#palo": 3 }[location.hash];
  if (branch !== undefined) {
    displayStep(branch);
    el("console").scrollIntoView({block: "start"});
  }
})();
