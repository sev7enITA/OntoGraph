"""Render the synthetic Aurora evidence as a self-contained HTML document."""

from html import escape

_PHASES = (
    ("baseline", "Baseline", "Both applications pass the baseline probes."),
    ("drift", "Rule change", "The new rule requires an inspection report for a building dossier."),
    ("unreachable", "Withdrawal requested", "The PMS is unreachable. Its withdrawal is unproven."),
    ("withdrawn", "Withdrawal checked", "An observer confirms inactivity on both applications."),
    ("restored", "Baseline restored", "A newly approved release restores the original rule."),
)

_LABELS = {
    "verified": "Verified",
    "mismatch": "Mismatch",
    "unproven": "Unproven",
    "withdrawal_verified": "Withdrawal verified",
    "allow": "Allow",
    "hold": "Hold",
    "out_of_scope": "Out of scope",
    "unobservable": "Unobservable",
    "inactive": "Inactive",
    "active": "Active",
    "missing": "Missing",
    "inconclusive": "Inconclusive",
    "stale": "Stale",
}

_SIMPLIFIED_CHINESE = {
    "Aurora 21 (synthetic)": "Aurora 21（模拟案例）",
    "Baseline": "基线",
    "Both applications pass the baseline probes.": "两个应用均通过基线验证。",
    "Rule change": "规则变更",
    "The new rule requires an inspection report for a building dossier.": "新规则要求楼宇尽职调查档案附有检查报告。",
    "Withdrawal requested": "已请求撤回",
    "The PMS is unreachable. Its withdrawal is unproven.": "PMS 无法连接，撤回效果尚未证实。",
    "Withdrawal checked": "已核验撤回效果",
    "An observer confirms inactivity on both applications.": "观察人员确认该版本已在两个应用中停止生效。",
    "Baseline restored": "已恢复基线",
    "A newly approved release restores the original rule.": "新获批准的版本恢复了原规则。",
    "Verified": "已验证",
    "Mismatch": "不一致",
    "Unproven": "尚未证实",
    "Withdrawal verified": "撤回效果已验证",
    "Allow": "放行",
    "Hold": "暂缓",
    "Out of scope": "超出适用范围",
    "Unobservable": "无法观测",
    "Inactive": "未生效",
    "Active": "生效中",
    "Missing": "缺失",
    "Inconclusive": "无法得出结论",
    "Stale": "已过期",
    "Awaiting receipt": "等待回执",
    "No active release declared": "未申报正在生效的版本",
    "Consumer receipt": "应用回执",
    "Observation checks": "行为观测结果",
    "Probe": "验证用例",
    "Expected": "预期",
    "Observed": "实际观测",
    "Result": "判定",
    "A matching receipt and a divergent result": "版本回执相符，实际结果有差异",
    "{application} declared the expected v2 digest. The observed result differed from the published expectation.": (
        "{application} 申报了预期的 v2 版本摘要，但实际观测结果与发布时公布的预期不符。"
    ),
    "Expected under v2": "v2 预期结果",
    "Compare receipt and expected digest": "比较回执摘要与预期摘要",
    "Declared": "已申报",
    "Activation": "激活记录",
    "A due-diligence rule changes for building dossiers. Follow what each simulated application declares "
    "and what an independent observer role records in the simulation.": (
        "楼宇档案的尽职调查规则发生变化。本报告记录各模拟应用申报的版本，"
        "以及模拟环境中由独立观察角色记录的实际结果。"
    ),
    "Application evidence": "应用证据",
    "Expand an application to compare its declaration with the observed probe outcomes. Verified applies to the cases shown.": (
        "展开应用条目，可对比应用申报信息与用例观测结果。验证结论适用于所列用例。"
    ),
    "Audit chain tip": "审计链最新摘要",
    "Scenario time": "场景时间",
    "Evidence covers the simulated cases shown. Business outcome unassessed.": (
        "证据涵盖所列模拟用例。业务成效尚未评估。"
    ),
}

_STYLES = """
:root {
  color-scheme: light;
  --paper: #f0eee9;
  --panel: #fbfaf7;
  --ink: #14242c;
  --muted: #4d5d62;
  --line: #c9d1cc;
  --navy: #0d2731;
  --cyan: #a0e3de;
  --ok: #165447;
  --ok-bg: #e1f0e9;
  --warn: #704509;
  --warn-bg: #f9eacb;
  --bad: #8b3029;
  --bad-bg: #f9e5df;
  font: 16px/1.5 system-ui, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); }
main { width: min(100% - 2rem, 70rem); margin: 0 auto 3rem; }
header {
  padding: clamp(1.6rem, 5vw, 3.4rem);
  margin: 0 0 2rem;
  color: #f8faf7;
  background: var(--navy);
  border-bottom: 5px solid var(--cyan);
}
header p { color: #dae7e4; max-width: 46rem; }
header .product { color: var(--cyan); letter-spacing: .08em; font-weight: 700; }
h1, h2 { margin: 0; line-height: 1.06; }
h1 { font-size: clamp(2.5rem, 8vw, 5rem); letter-spacing: -.065em; }
h2 { font-size: clamp(1.5rem, 4vw, 2.25rem); letter-spacing: -.04em; }
h3 { margin: 0; font-size: 1.05rem; }
p { margin: .7rem 0 0; }
.finding {
  background: #dceceb;
  border-left: .36rem solid #237970;
  padding: 1.25rem clamp(1rem, 3vw, 2rem);
  margin-bottom: 2.4rem;
}
.finding p { max-width: 46rem; }
.finding dl { display: flex; flex-wrap: wrap; gap: .75rem 2.4rem; margin: 1rem 0 0; }
dt, caption, th { color: var(--muted); font-size: .85rem; text-align: left; }
dd { margin: .14rem 0 0; font-weight: 750; }
.trace { margin-top: 1rem; border-top: 1px solid var(--line); }
.phase {
  display: grid; grid-template-columns: minmax(13rem, 1fr) minmax(0, 2fr);
  gap: 1.15rem; padding: 1.25rem 0; border-bottom: 1px solid var(--line);
}
.phase p, footer p { color: var(--muted); font-size: .9rem; }
.applications { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
details { border: 1px solid var(--line); background: var(--panel); align-self: start; min-width: 0; }
summary { cursor: pointer; padding: .85rem; }
summary:hover { background: #eaf0eb; }
summary:focus-visible { outline: .18rem solid #16746b; outline-offset: .14rem; }
.state { font-size: .78rem; font-weight: 700; display: inline-block; padding: .16rem .48rem; }
summary .state { margin: .25rem 0 0 .35rem; vertical-align: .07em; }
.good { color: var(--ok); background: var(--ok-bg); }
.warn { color: var(--warn); background: var(--warn-bg); }
.bad { color: var(--bad); background: var(--bad-bg); }
.detail { border-top: 1px solid var(--line); padding: .8rem; }
.detail p { margin: 0 0 .65rem; overflow-wrap: anywhere; }
.checks { width: 100%; border-collapse: collapse; font-size: .83rem; }
caption { font-weight: 650; margin-bottom: .35rem; }
th, td { padding: .38rem .22rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th:first-child, td:first-child { overflow-wrap: anywhere; }
th:last-child, td:last-child { white-space: nowrap; }
.finding code { display: block; overflow-wrap: anywhere; font-size: .8rem; }
tr:last-child td { border-bottom: 0; }
tr.bad td { border-color: #deb9b2; font-weight: 650; }
footer { margin-top: 2rem; padding: 1.2rem 0; }
footer code { display: block; margin-top: .3rem; overflow-wrap: anywhere; font: .88rem/1.5 ui-monospace, monospace; }
@media (max-width: 55rem) {
  .phase { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 32rem) {
  .applications { grid-template-columns: minmax(0, 1fr); }
}
"""


def _text(value):
    return escape(str(value), quote=True)


def _label(value, translate):
    return _text(translate(_LABELS.get(value, value)))


def _tone(state):
    if state == "mismatch":
        return "bad"
    if state in {"verified", "withdrawal_verified"}:
        return "good"
    return "warn"


def _check_row(probe, translate):
    observation = probe["observation"] or {}
    observed = observation.get("actual_outcome", "missing")
    result = probe["result"]
    probe_id = _text(probe["probe"])
    return (
        f'<tr class="{_tone(result)}"><td>{probe_id}</td>'
        f'<td>{_label(probe["expected"], translate)}</td><td>{_label(observed, translate)}</td>'
        f'<td>{_label(result, translate)}</td></tr>'
    )


def _application(row, translate, open_details=False):
    checks = "".join(_check_row(probe, translate) for probe in row["probes"])
    app = _text(row["application"].upper())
    state = row["state"]
    opened = " open" if open_details else ""
    receipt = row["receipt"]
    if receipt is None:
        receipt_text = _text(translate("Awaiting receipt"))
    elif receipt["actual_digest"] is None:
        receipt_text = _text(translate("No active release declared"))
    else:
        digest = receipt["actual_digest"]
        receipt_text = f'<code title="{_text(digest)}">{_text(digest[:12])}…</code>'
    return (
        f'<details{opened}><summary><strong>{app}</strong>'
        f'<span class="state {_tone(state)}">{_label(state, translate)}</span></summary>'
        f'<div class="detail"><p>{_text(translate("Consumer receipt"))} {receipt_text}</p>'
        f'<table class="checks"><caption>{_text(translate("Observation checks"))}</caption><thead><tr>'
        f'<th scope="col">{_text(translate("Probe"))}</th>'
        f'<th scope="col">{_text(translate("Expected"))}</th>'
        f'<th scope="col">{_text(translate("Observed"))}</th>'
        f'<th scope="col">{_text(translate("Result"))}</th></tr></thead>'
        f'<tbody>{checks}</tbody></table></div></details>'
    )


def _finding(report, translate):
    drift = report["drift"]
    for app in drift["applications"]:
        expected_digest = drift["manifest"]["deliveries"].get(app["application"])
        receipt = app["receipt"] or {}
        if expected_digest is None or receipt.get("actual_digest") != expected_digest:
            continue
        for probe in app["probes"]:
            observed = (probe["observation"] or {}).get("actual_outcome")
            if probe["result"] == "mismatch" and observed is not None and observed != probe["expected"]:
                description = translate(
                    "{application} declared the expected v2 digest. "
                    "The observed result differed from the published expectation."
                ).format(application=app["application"].upper())
                return (
                    '<section class="finding" aria-labelledby="finding-title">'
                    f'<h2 id="finding-title">{_text(translate("A matching receipt and a divergent result"))}</h2>'
                    f'<p>{_text(description)}</p>'
                    f'<dl><div><dt>{_text(translate("Probe"))}</dt><dd>{_text(probe["probe"])}</dd></div>'
                    f'<div><dt>{_text(translate("Expected under v2"))}</dt>'
                    f'<dd>{_label(probe["expected"], translate)}</dd></div>'
                    f'<div><dt>{_text(translate("Observed"))}</dt><dd>{_label(observed, translate)}</dd></div></dl>'
                    f'<details><summary>{_text(translate("Compare receipt and expected digest"))}</summary>'
                    f'<div class="detail">{_text(translate("Expected"))} <code>{_text(expected_digest)}</code>'
                    f'{_text(translate("Declared"))} <code>{_text(receipt["actual_digest"])}</code>'
                    '</div></details></section>'
                )
    return ""


def render_report(report, language="en"):
    """Return a standalone report with only inline styles and native disclosure controls."""
    catalog = {"en": {}, "zh-Hans": _SIMPLIFIED_CHINESE}[language]

    def translate(message):
        return catalog.get(message, message)

    phases = []
    for key, label, description in _PHASES:
        phase = report[key]
        applications = "".join(
            _application(row, translate, open_details=key == "drift") for row in phase["applications"]
        )
        phases.append(
            f'<section class="phase"><div><h3>{_text(translate(label))}</h3>'
            f'<p>{_text(translate(description))}</p>'
            f'<p>{_text(translate("Activation"))} {_text(phase["activation"])}</p></div>'
            f'<div class="applications">{applications}</div></section>'
        )
    title = _text(translate(report["scenario"]))
    scenario_time = _text(report["drift"]["as_of"])
    introduction = translate(
        "A due-diligence rule changes for building dossiers. Follow what each simulated application declares "
        "and what an independent observer role records in the simulation."
    )
    instruction = translate(
        "Expand an application to compare its declaration with the observed probe outcomes. "
        "Verified applies to the cases shown."
    )
    return f"""<!doctype html>
<html lang="{language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>{title} | OnToGraPh</title>
<style>{_STYLES}</style>
</head>
<body><main>
<header>
<p class="product">OnToGraPh</p>
<h1>{title}</h1>
<p>{_text(introduction)}</p>
</header>
{_finding(report, translate)}
<section aria-labelledby="trace-title">
<h2 id="trace-title">{_text(translate("Application evidence"))}</h2>
<p>{_text(instruction)}</p>
<div class="trace">{"".join(phases)}</div>
</section>
<footer>
<h2>{_text(translate("Audit chain tip"))}</h2>
<code>{_text(report["ledger_tip"])}</code>
<p>{_text(translate("Scenario time"))} <time datetime="{scenario_time}">{scenario_time}</time>.
{_text(translate("Evidence covers the simulated cases shown. Business outcome unassessed."))}</p>
</footer>
</main></body></html>
"""
