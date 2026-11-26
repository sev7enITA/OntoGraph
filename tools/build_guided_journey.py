"""Render the case selector and static Studio handoff for each journey."""
from html import escape
from pathlib import Path

from tools.build_home_topics import GROUPS, SITE, href, layout, phr, route
from tools.journey_routes import CASES, journey_path


def studio_handoff(case, data, studio_topic, lang):
    model = data["model"]
    filename = Path(model).name
    t = lambda en, zh: phr(en, zh, lang)
    download = t("Download Studio JSON", "下载工作台 JSON")
    companion = ""
    if "companion" in data:
        extra_file, extra_label = data["companion"]
        companion = (f'\n      <p class="journey-option"><a href="{extra_file}" download>'
                     f'{escape(extra_label[lang])} <code>{Path(extra_file).name}</code></a></p>')
    language = t("en", "zh-Hans")
    when_online = t("Sign in if prompted. Studio opens this case with the starter model in your private draft if you can edit. If you already saved a draft for this case, Studio reopens that draft.",
                    "如有提示，请登录。具备编辑权限时，工作台会打开此场景并将入门模型载入您的私有草稿。如果此前已保存此场景的草稿，工作台会重新打开该草稿。")
    return f'''    <section class="journey-handoff" id="model" aria-labelledby="model-title">
      <h2 id="model-title">{t("Open the model in Studio", "在工作台打开模型")}</h2>
      <p>{escape(data["check"][lang])}</p>
      <p>{t("The starter model keeps its original English object labels.", "入门模型保留英文对象标签。")}</p>
      <div class="journey-download"><a class="button primary" href="{model}" download>{download} <code>{filename}</code></a></div>{companion}
      <h3>{t("Online Studio", "在线工作台")}</h3>
      <p>{when_online}</p>
      <p>{t("Viewers can open the model in read-only mode.", "仅有查看权限的用户可以只读方式打开模型。")}</p>
      <p>{href(t("Open this case in online Studio", "在在线工作台打开此场景"), f"/OntoGraph/decisions/?lang={language}&workspace=journey-{case}")}</p>
      <h3>{t("Standalone Studio", "独立版工作台")}</h3>
      <p>{t("From your local OnToGraPh checkout, replace the filename with the full path to your downloaded file and run: Open Semantic Studio at http://127.0.0.1:8765/governance.", "在本地 OnToGraPh 代码目录运行下方命令。将文件名替换为已下载文件的完整路径。打开 http://127.0.0.1:8765/governance 进入语义工作台。")}</p>
      <pre><code>python3 -m ontograph studio --model {filename}</code></pre>
      <p>{href(t("Read the Studio walkthrough", "阅读工作台操作说明"), studio_topic)}</p>
    </section>'''


def case_page(key, data, lang, topics):
    def topic_link(slug):
        return href(topics[slug]["title"][lang], route(slug, lang) + "?journey=" + key)
    def t(en, zh):
        return phr(en, zh, lang)
    index = journey_path("", lang)
    title, lead = data["title"][lang], data["lead"][lang]
    directory_label = t("Choose another case", "选择其他场景")
    stages = t(("Understand the case", "Try the tools", "Get the model"),
               ("了解场景", "试用工具", "下载模型"))
    stage_nav = "".join(f"<li>{href(label, '#'+stage)}</li>"
                        for label, stage in zip(stages, ("case", "tools", "model")))
    tool_label, en_tool, zh_tool = data["tool"]
    sequence = "\n".join(f"        <li>{topic_link(slug)}</li>" for slug in data["sequence"][:-1])
    extra = "\n".join(f"        <li>{topic_link(slug)}</li>" for slug in data["extra"])
    handoff = studio_handoff(key, data, route("practitioner-workspace", lang) + "?journey=" + key, lang)
    body = f'''    <nav class="topic-path" aria-label="{t("Breadcrumb", "面包屑导航")}">{href(directory_label, index)}</nav>
    <header class="topic-hero" id="case">
      <h1>{escape(title)}</h1>
      <p>{escape(lead)}</p>
      <nav class="journey-stages" aria-label="{t("Steps in this case", "本场景步骤")}"><ol>{stage_nav}</ol></nav>
    </header>
    <section class="journey-practice" id="tools" aria-labelledby="tools-title">
      <h2 id="tools-title">{stages[1]}</h2>
      <p>{href(tool_label[lang], (en_tool, zh_tool)[lang])}</p>
      <p>{t("After trying the tool, return here using your browser’s Back button.", "试用工具后，请使用浏览器的返回按钮回到这里。")}</p>
      <p>{t("Follow these topics in order. Each takes you to the next topic or to your model.", "按顺序查看下列主题。每个主题都提供跳转到下一主题或模型的链接。")}</p>
      <ol class="journey-topic-list">
{sequence}
      </ol>
      <p>{href(t("Continue to the model", "继续到模型"), "#model")}</p>
    </section>
{handoff}
    <section class="topic-follow" aria-labelledby="related-details">
      <h2 id="related-details">{t("Further reading for this case", "本场景的延伸阅读")}</h2>
      <ul>
{extra}
      </ul>
    </section>'''
    return layout(key, title, lead, body, lang, area="journey")


def index_page(lang):
    title = phr("Choose a case", "选择使用场景", lang)
    lead = phr("Start with your goal, try a tool and download the corresponding model for Studio.",
               "从目标出发，试用工具，并下载对应模型以便在工作台中打开。", lang)
    start = phr("Start this case", "开始此场景", lang)
    cards = "\n".join(
        f'      <article class="journey-card"><h2>{escape(data["title"][lang])}</h2>'
        f'<p>{escape(data["lead"][lang])}</p><a class="button secondary" href="{journey_path(key, lang)}"'
        f' aria-label="{escape(start + " · " + data["title"][lang], quote=True)}">{start}</a></article>'
        for key, data in CASES.items()
    )
    body = f'''    <header class="topic-hero"><h1>{title}</h1><p>{lead}</p></header>
    <div class="journey-grid">
{cards}
    </div>
    <p class="journey-directory">{href(phr("Browse all 19 topics", "浏览全部 19 个主题", lang), route("", lang))}</p>'''
    return layout("", title, lead, body, lang, area="journey")


def build():
    topics = {slug: page for _, _, group in GROUPS for slug, page in group.items()}
    assigned = {slug for case in CASES.values() for slug in case["sequence"] + case["extra"]}
    if assigned != topics.keys():
        raise ValueError(f"Journey and topic assignments differ: {assigned ^ topics.keys()}")
    for case in CASES.values():
        if not (SITE / case["model"].lstrip("/")).is_file():
            raise ValueError(f"Missing journey model {case['model']}")
    for lang in (0, 1):
        pages = {"": index_page(lang)}
        pages.update({key: case_page(key, data, lang, topics) for key, data in CASES.items()})
        for key, content in pages.items():
            target = SITE / journey_path(key, lang).strip("/") / "index.html"
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)


if __name__ == "__main__":
    build()
