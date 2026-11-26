"""Build OnToGraPh's bilingual topic library from the editorial modules and captured WBS data."""
from html import escape, unescape
import json
from pathlib import Path
import re

from tools import home_topics_apply, home_topics_project, home_topics_theory
from tools.build_wbs_pages import LABELS, STATES


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
DOMAIN = "https://openontograph.org"
GROUPS = (
    ("theory", ("The Theory", "理论基础"), home_topics_theory.PAGES),
    ("apply", ("Apply It", "动手实践"), home_topics_apply.PAGES),
    ("work-with-us", ("Work With Us", "参与合作"), dict(list(home_topics_project.PAGES.items())[:5])),
    ("company", ("Company", "关于项目"), dict(list(home_topics_project.PAGES.items())[5:])),
)


def route(slug, lang):
    return ("/zh" if lang else "") + "/explore/" + (slug + "/" if slug else "")


def phr(en, zh, lang):
    return zh if lang else en


def href(label, url):
    return f'<a href="{escape(url, quote=True)}">{escape(label)}</a>'


def lang_links(slug):
    en = DOMAIN + route(slug, 0)
    zh = DOMAIN + route(slug, 1)
    return "".join(f'\n  <link rel="alternate" hreflang="{locale}" href="{url}">'
                   for locale, url in (("en", en), ("zh-Hans", zh), ("x-default", en)))


def layout(slug, title, lead, content, lang):
    home = "/zh/" if lang else "/"
    locale = "zh-Hans" if lang else "en"
    language = phr("简体中文", "English", lang)
    other = "en" if lang else "zh-Hans"
    return f'''<!doctype html>
<html lang="{locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{escape(title)} | OnToGraPh</title>
  <meta name="description" content="{escape(lead, quote=True)}">
  <link rel="icon" href="/assets/icon.png">
  <link rel="canonical" href="{DOMAIN + route(slug, lang)}">{lang_links(slug)}
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/topic-pages.css">
  <script defer src="/assets/topic-pages.js"></script>
</head>
<body>
  <a class="skip-link" href="#topic-main">{phr('Skip to content', '跳转至正文', lang)}</a>
  <header class="topic-masthead">
    <div class="wrap topic-masthead-inner">
      <a class="brand" href="{home}" aria-label="OnToGraPh"><img src="/assets/on-tograph-logo.png" width="126" height="30" alt=""></a>
      <a href="{route(slug, 1-lang)}" hreflang="{other}" lang="{other}">{language}</a>
    </div>
  </header>
  <main id="topic-main" class="wrap topic-main">
{content}
  </main>
</body>
</html>
'''


def scenario_tool(title, labels, results, lang):
    options = "\n".join(f'          <option value="{i}">{escape(label)}</option>' for i, label in enumerate(labels))
    cards = "\n".join(f'      <section class="scenario-result" data-scenario="{i}">{result}</section>'
                      for i, result in enumerate(results))
    return f'''    <section class="topic-lab" aria-labelledby="lab-title" data-scenarios>
      <h2 id="lab-title">{escape(title)}</h2>
      <label class="scenario-picker" hidden>
        {phr('Choose a scenario', '选择场景', lang)}
        <select>
{options}
        </select>
      </label>
      <div class="scenario-results">
{cards}
      </div>
    </section>'''


def generic_lab(lab, lang):
    title, items = lab
    labels = [label[lang] for label, _, _ in items]
    results = [
        f'<noscript><p><strong>{escape(label[lang])}</strong></p></noscript>'
        f'<h3>{escape(heading[lang])}</h3><p>{escape(text[lang])}</p>'
        for label, heading, text in items
    ]
    return scenario_tool(title[lang], labels, results, lang)


def readback_lab(lang):
    labels, results = [], []
    report = json.loads((ROOT / "examples/wbs_pilot/observed-summary.json").read_text())
    applications = (("finance", "Beancount", ("Eligible ledger postings", "符合条件的过账金额")),
                    ("pmo", "LibreOffice Calc", ("Eligible work-package budget", "符合条件的工作包预算")))
    for step in report["steps"]:
        name = step["step"]
        labels.append(LABELS[name][lang])
        cells = []
        for key, engine, measure in applications:
            app = step["applications"][key]
            value = app["eligible"]
            amount = phr("Unavailable", "不可用", lang) if value is None else f"€{value:,}"
            state = STATES[app["state"]][lang]
            if name == "source_unavailable" and key == "finance":
                state += phr(" · last observed", " · 最近一次实测", lang)
            cells.append(f'<div><dt>{engine}</dt><dd>{measure[lang]} <strong>{amount}</strong></dd>'
                         f'<dd>{state}</dd></div>')
        results.append(f'<h3>{escape(labels[-1])}</h3><dl class="readback">{"".join(cells)}</dl>')
    return scenario_tool(phr("Replay the captured application results", "回放已保存的应用实测结果", lang), labels, results, lang)


def estimate_lab(lang):
    inputs = (
        ("applications", ("Applications", "应用数量"), 2, 1, 100, 1),
        ("per-application", ("Average integration hours per application", "每个应用的平均接入工时"), 8, 0, 10000, .5),
        ("modelling", ("Modelling and review hours", "建模与审核工时"), 6, 0, 10000, .5),
        ("verification", ("Activation and withdrawal test hours", "生效与撤回测试工时"), 4, 0, 10000, .5),
    )
    fields = "\n".join(f'      <label>{label[lang]}<input type="number" id="{key}" name="{key}" min="{minimum}" max="{maximum}" step="{step}" value="{default}" required></label>'
                       for key, label, default, minimum, maximum, step in inputs)
    instruction = phr("Replace the illustrative hours with your estimates. The result covers one pilot.",
                      "请用自己的估算替换示例工时。结果仅涵盖一次试点。", lang)
    error = phr("Enter a valid number for each input.", "请为每一项输入有效数字。", lang)
    return f'''    <section class="topic-lab" aria-labelledby="lab-title">
      <h2 id="lab-title">{phr("Estimate pilot effort", "估算试点工作量", lang)}</h2>
      <p>{instruction}</p>
      <form data-estimate data-error="{error}">
{fields}
        <output aria-live="polite" for="applications per-application modelling verification"><span>{phr("Estimated total", "预计总工时", lang)}</span> <strong data-total>26</strong> {phr("hours", "小时", lang)}</output>
      </form>
      <noscript><p>{phr("Multiply applications by integration hours per application, then add modelling, review and test hours.", "将应用数量乘以每个应用的接入工时，再加上建模、审核与测试工时。", lang)}</p></noscript>
    </section>'''


def topic(slug, page, group, group_name, pages, lang):
    title, lead = page["title"][lang], page["lead"][lang]
    directory = f'{route("", lang)}#{group}'
    chunks = []
    for section in page["sections"]:
        heading, *paragraphs = section
        text = "".join(f"\n      <p>{escape(p[lang])}</p>" for p in paragraphs)
        chunks.append(f"    <section class=\"topic-copy\">\n      <h2>{escape(heading[lang])}</h2>{text}\n    </section>")
    if page.get("kind") == "wbs-readbacks":
        chunks.append(readback_lab(lang))
    if page.get("kind") == "pilot-estimate":
        chunks.append(estimate_lab(lang))
    if page.get("lab"):
        chunks.append(generic_lab(page["lab"], lang))
    label = phr("Follow the workflow", "继续操作", lang)
    links = "\n".join(f"        <li>{href(text[lang], (en, zh)[lang])}</li>" for text, en, zh in page["links"])
    chunks.append(f'''    <section class="topic-follow">
      <h2>{label}</h2>
      <ul>
{links}
      </ul>
    </section>''')
    related = "\n".join(f'        <li>{href(item["title"][lang], route(key, lang))}</li>'
                        for key, item in pages.items() if key != slug)
    body = f'''    <nav class="topic-path" aria-label="{phr('Breadcrumb', '面包屑导航', lang)}">
      {href(phr("Explore OnToGraPh", "探索 OnToGraPh", lang), route("", lang))}
      <span aria-hidden="true">/</span> {href(group_name[lang], directory)}
    </nav>
    <header class="topic-hero">
      <h1>{escape(title)}</h1>
      <p>{escape(lead)}</p>
    </header>
{chr(10).join(chunks)}
    <nav class="topic-neighbours" aria-labelledby="topic-related">
      <h2 id="topic-related">{phr('More in this section', '本栏目其他主题', lang)}</h2>
      <ul>
{related}
      </ul>
    </nav>'''
    return layout(slug, title, lead, body, lang)


def directory_page(lang):
    title = phr("Explore OnToGraPh", "探索 OnToGraPh", lang)
    lead = phr("Browse the framework, run a practical example and plan a pilot.",
               "浏览框架、运行实践案例并规划试点。", lang)
    groups = []
    for group, name, pages in GROUPS:
        links = "\n".join(f'        <li>{href(page["title"][lang], route(key, lang))}</li>' for key, page in pages.items())
        groups.append(f'''    <section id="{group}" class="topic-follow">
      <h2>{name[lang]}</h2>
      <ul>
{links}
      </ul>
    </section>''')
    body = f'''    <header class="topic-hero">
      <h1>{title}</h1>
      <p>{lead}</p>
    </header>
    <div class="topic-directory">
{chr(10).join(groups)}
    </div>'''
    return layout("", title, lead, body, lang)


def add_home_links(path, page_ids, lang):
    raw = path.read_text()
    raw = re.sub(r'                <li class="primary-route">[^\n]+</li>\n', "", raw)
    found = []
    def add(match):
        slug = match[2]
        found.append(slug)
        label = phr("Open topic page", "打开主题页面", lang)
        topic_title = unescape(match[3])
        access_name = phr("Open page about " + topic_title, "打开主题页面 " + topic_title, lang)
        return match[1] + (f'\n                <li class="primary-route"><a href="{route(slug, lang)}"'
                           f' aria-label="{escape(access_name, quote=True)}">{label}</a></li>')
    updated = re.sub(r'(<details class="route-topic" id="([a-z-]+)">\s*<summary>([^<]+)</summary>\s*<p>[^<]+</p>\s*<ul>)', add, raw)
    if found != page_ids:
        raise ValueError(f"Topic pages and home cards disagree in {path}: {found}")
    path.write_text(updated.replace("/assets/home-directory.css?v=2", "/assets/home-directory.css?v=3"))


def add_sitemap(page_ids):
    path = SITE / "sitemap.xml"
    raw = path.read_text()
    clean = re.sub(r"  <!-- topics:start -->.*?  <!-- topics:end -->\n", "", raw, flags=re.S)
    entries = ["  <!-- topics:start -->"]
    for slug in ["", *page_ids]:
        en, zh = [DOMAIN + route(slug, lang) for lang in (0, 1)]
        for url in (en, zh):
            entries.append(f"  <url><loc>{url}</loc>"
                           f'<xhtml:link rel="alternate" hreflang="en" href="{en}"/>'
                           f'<xhtml:link rel="alternate" hreflang="zh-Hans" href="{zh}"/>'
                           f'<xhtml:link rel="alternate" hreflang="x-default" href="{en}"/></url>')
    entries.append("  <!-- topics:end -->")
    path.write_text(clean.replace("</urlset>", "\n".join(entries) + "\n</urlset>"))


def write(url, html):
    path = SITE / url.strip("/") / "index.html"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html)


def build():
    page_ids = [key for _, _, pages in GROUPS for key in pages]
    if len(page_ids) != 19 or len(set(page_ids)) != 19:
        raise ValueError("Expected nineteen unique topics.")
    for lang in (0, 1):
        write(route("", lang), directory_page(lang))
        for group, name, pages in GROUPS:
            for slug, page in pages.items():
                write(route(slug, lang), topic(slug, page, group, name, pages, lang))
        add_home_links(SITE / ("zh/index.html" if lang else "index.html"), page_ids, lang)
    add_sitemap(page_ids)


if __name__ == "__main__":
    build()
