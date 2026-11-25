"""Generate both public pilot timelines from the captured evidence bundle."""
from html import escape
import json
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PILOT = ROOT / "examples/wbs_pilot"
WEB = ROOT / "site/wbs"
BASE = "https://github.com/sev7enITA/OntoGraph"
SOURCE = BASE + "/tree/main/examples/wbs_pilot"
LABELS = {
    "baseline": ("Original WBS rule", "原始 WBS 规则"),
    "baseline_withdrawn": ("Withdraw the original rule", "撤回原始规则"),
    "stale_workbook": ("Workbook acknowledges the new rule but applies the old one", "工作簿已确认新规则，仍执行旧规则"),
    "qualified": ("Both applications use the department-qualified rule", "两个应用均执行按部门区分的新规则"),
    "withdrawal_still_active": ("Finance stops using the rule, PMO still applies it", "财务已停止执行，PMO 仍在执行"),
    "source_unavailable": ("PMO workbook is unavailable for verification", "无法读取 PMO 工作簿进行核验"),
    "withdrawn": ("Both applications confirm withdrawal by readback", "实测确认两个应用均已停止执行"),
    "restored": ("A fresh approval restores the baseline", "重新批准后恢复原始规则"),
}
STATES = {
    "verified": ("Verified", "已核验"), "mismatch": ("Mismatch", "不一致"),
    "withdrawal_verified": ("Withdrawal verified", "已核验撤回"), "unproven": ("Unproven", "尚未证实")
}


def render(summary, model, chinese):
    def t(en, zh): return zh if chinese else en
    def fields(step, key):
        record = step["applications"][key]
        value = record["eligible"]
        amount = t("Unavailable", "不可用") if value is None else f'€{value:,}'
        name = "Beancount" if key == "finance" else "LibreOffice Calc"
        freshness = ""
        if step["step"] == "source_unavailable" and key == "finance":
            freshness = "<p>" + t("Last observed Finance result", "财务最近一次实测结果") + "</p>"
        return f'<div><h3>{name}</h3>{freshness}<b>{amount}</b><p>{escape(t(*STATES[record["state"]]))}</p><code>{escape(record["artifact_sha256"])}</code></div>'
    blocks = []
    for step in summary["steps"]:
        opened = ' open' if step["step"] == "withdrawal_still_active" else ''
        blocks.append(f'<details{opened}><summary>{escape(t(*LABELS[step["step"]]))}</summary><div class="pair">{fields(step,"finance")}{fields(step,"pmo")}</div></details>')
    edge = next(e for e in model["edges"] if "assertions" in e)
    rows = []
    for assertion in edge["assertions"]:
        who = t("Finance", "财务") if assertion["id"] == "finance-local" else "PMO"
        stance = t("Supports", "支持") if assertion["stance"] == "supports" else t("Challenges", "质疑")
        rows.append(f'<tr><th scope="row">{who}</th><td>{stance}</td><td>{assertion["criticality"]}/5</td><td>{assertion["confidence"]:.2f}</td><td>{escape(assertion["evidence"])}</td></tr>')
    href = t("./","../")
    title = t("One WBS code, two business decisions", "同一个 WBS 编码，两项业务决策")
    studio = '/OntoGraph/decisions/?lang='+t('en','zh-Hans')
    return f'''<!doctype html><html lang="{t('en','zh-Hans')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} | OnToGraPh</title>
<link rel="canonical" href="https://openontograph.org/wbs/{t('','zh/')}"><link rel="alternate" hreflang="en" href="https://openontograph.org/wbs/"><link rel="alternate" hreflang="zh-Hans" href="https://openontograph.org/wbs/zh/"><link rel="stylesheet" href="{href}case.css"></head>
<body><header><a href="{t('/','/zh/')}">OnToGraPh</a><a href="{t('zh/','../')}" lang="{t('zh-Hans','en')}">{t('简体中文','English')}</a></header>
<main><p class="kicker">{t('WBS pilot · observed application outputs','WBS 试点 · 应用实测结果')}</p><h1>{title}</h1><p class="lead">{t('Finance recognizes 0017 as a posting object. The project office also uses 0017 for a work package. Requiring the department changes which amounts each application includes.','财务将 0017 用作过账对象，项目管理办公室也用它表示工作包。规则要求明确部门后，两个应用各自计入的金额都发生了变化。')}</p>
<h2>{t('The disagreement','评估分歧')}</h2><p>{t('Two assessors attached dated claims to the same mapping. The release remained blocked with both scripted votes until a designated reviewer recorded a reasoned resolution tied to these exact claims. Both original assessments remain inspectable.','两名评估人对同一映射提交了带日期的主张。即使已有两次脚本化投票，发布仍被阻止，直到指定审核人针对这组证据记录有理由的裁决。两份原始评估均可追溯。')}</p>
<div class="table"><table><thead><tr>{''.join('<th>'+x+'</th>' for x in t(['Team','Position','Criticality','Confidence','Evidence ID'],['团队','立场','关键程度','置信度','证据 ID']))}</tr></thead><tbody>{''.join(rows)}</tbody></table></div>
<p><strong>{t('Reviewer decision','审核裁决')}</strong> · {escape(edge["resolution"]["reviewer"])} · {escape(edge["resolution"]["resolved_at"])}</p><p>{escape(t(edge["resolution"]["rationale"], '财务映射仅在来源特定且部门明确时有效。较严格的规则在两个应用中都暂停计入未注明部门的编码。'))}</p>
<p class="links"><a href="{href}unresolved.json" download>{t('Download conflicting model','下载含冲突的模型')}</a><a href="{href}resolved.json" download>{t('Download adjudicated model','下载已裁决的模型')}</a><a href="{studio}">{t('Open authenticated Studio','打开需登录的 Studio')}</a></p>
<h2>{t('Follow the recorded run','查看实测过程')}</h2><p>{t('Expand a checkpoint to see the eligible ledger postings in Beancount and the eligible work-package budget in Calc. Each fingerprint identifies a captured application reading. The amounts refer to different business measures.','展开各阶段，查看 Beancount 中符合条件的过账金额与 Calc 中符合条件的工作包预算。每个哈希值标识一次保存的应用读取结果。两个金额分属不同的业务指标。')}</p>{''.join(blocks)}
<h2>{t('Evidence and scope','证据与范围')}</h2><p>{t('Both engines ran locally against independent native files with synthetic records. Role-bound approvals were scripted. The unavailable workbook has no observed amount. Recovery required a fresh release.','两个引擎在本机分别读取各自的原生文件与合成记录。授权角色的审批由脚本执行。工作簿无法读取时没有实测金额。恢复原规则需要重新发布。')}</p>
<p>{t('Audit events','审计事件')} <b>{summary["events"]}</b> · {t('Application readbacks','应用实测读取')} <b>{summary["readbacks"]}</b></p><p class="links"><a href="{t(SOURCE, BASE + '/blob/main/examples/wbs_pilot/README.zh-Hans.md')}">{t('Reproduce this pilot','复现此试点')}</a><a href="{BASE}/raw/refs/heads/main/examples/wbs_pilot/observed-evidence.zip">{t('Download evidence bundle','下载证据包')}</a><a href="{BASE}/blob/main/examples/wbs_pilot/observed-summary.json">{t('Inspect recorded results','查看实测结果记录')}</a></p></main></body></html>'''


def build():
    summary = json.loads((PILOT / "observed-summary.json").read_text())
    with ZipFile(PILOT / "observed-evidence.zip") as bundle:
        if json.loads(bundle.read("summary.json")) != summary:
            raise ValueError("Registry bundle and public summary disagree")
        for state, reason in (("unresolved", "Unresolved Finance and PMO evidence"),
                              ("resolved", "Require department-qualified WBS")):
            release = next(r for r in summary["releases"] if r["reason"] == reason)
            payload = json.loads(bundle.read(release["candidate"]+".json"))["payload"]
            (WEB / (state+".json")).write_text(json.dumps(payload, ensure_ascii=False, indent=2)+"\n")
    for zh, path in ((False, WEB/"index.html"), (True, WEB/"zh/index.html")):
        path.write_text(render(summary, payload, zh)+"\n")


if __name__ == "__main__":
    build()
