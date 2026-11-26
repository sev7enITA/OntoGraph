"""Public case paths and their links to the nineteen supporting topics."""

CASES = {
    "personal-library": {
        "title": ("Model a personal library", "为个人图书库建模"),
        "lead": ("Use a book and its physical copies to learn when one term needs two distinct concepts.",
                 "以书目和实体副本为例，了解何时需要区分同一个术语所指的两个概念。"),
        "check": ("In Studio, inspect Edition and Physical copy. Two copies can share an ISBN while one is on loan.",
                  "在工作台查看版本和实体副本。两册书可以有相同的 ISBN，其中一册仍可单独处于借出状态。"),
        "sequence": ("operational-meaning", "model-building-blocks", "learning-path", "practitioner-workspace"),
        "extra": ("fit-check", "choose-start", "about-project", "access-and-reuse"),
        "tool": (("Build the lending-app example", "动手制作借书应用"),
                 "/guide/#personal-project-build-a-lending-app", "/guide/zh-Hans.html#个人项目做一个借书应用"),
        "model": "/guide/personal-library.json",
    },
    "department-wbs": {
        "title": ("Reconcile WBS across departments", "对齐跨部门的 WBS 定义"),
        "lead": ("Follow one WBS code from Finance and PMO through conflicting evidence, release and withdrawal.",
                 "追踪同一个 WBS 编码在财务部门和 PMO 中引起的证据分歧、发布及撤回。"),
        "check": ("Import the unresolved model. Inspect the mapping from Recognized four-character code to Department-scoped WBS identifier. Compare the Finance and PMO claims before recording any resolution.",
                  "导入未裁决模型。查看已识别编码与 WBS 标识之间的映射，在记录裁决前比较财务与 PMO 的主张。"),
        "sequence": ("fit-check", "relationship-impact", "constraint-check", "dependency-diagnostic", "release-audit", "practitioner-workspace"),
        "extra": ("pilot-partnership", "pilot-scope", "data-handling"),
        "tool": (("Replay activation and withdrawal", "回放发布生效与撤回"),
                 "/wbs/", "/wbs/zh/"),
        "model": "/wbs/unresolved.json",
        "companion": ("/guide/department-wbs.json", ("Optional model for PMO, Finance and Warehouse file exchange", "可选模型，用于 PMO、财务和仓库的文件交换")),
    },
    "copilot-glossary": {
        "title": ("Prepare a glossary for Copilot", "为 Copilot 准备业务词典"),
        "lead": ("Give WBS its departmental meanings and prepare approved glossary content for Microsoft 365 Copilot.",
                 "区分 WBS 在各部门的含义，并为 Microsoft 365 Copilot 准备经审批的术语词典内容。"),
        "check": ("In Studio, compare the project work package and Finance posting object definitions and their field mappings. Use the CSV separately when preparing the downstream knowledge source.",
                  "在工作台比较项目工作包与财务过账对象的定义和字段映射。准备下游知识来源时，请单独使用 CSV。"),
        "sequence": ("operational-meaning", "choose-start", "who-decides", "data-handling", "practitioner-workspace"),
        "extra": ("model-building-blocks", "learning-path", "contact-project"),
        "tool": (("Follow the Copilot publishing guide", "按 Copilot 发布指南操作"),
                 "/guide/#microsoft-365-copilot-ground-answers-in-the-company-dictionary",
                 "/guide/zh-Hans.html#microsoft-365-copilot按本公司的定义解释术语"),
        "model": "/guide/department-wbs.json",
        "companion": ("/guide/wbs-glossary.csv", ("Downstream glossary CSV for the Copilot guide", "Copilot 指南所用的下游词典 CSV")),
    },
    "policy-change": {
        "title": ("Route a policy change for review", "将政策变更提交人工审核"),
        "lead": ("Start from a PolicyWatcher-style change record and follow the evidence to a human review decision in the PALO workflow.",
                 "以 PolicyWatcher 式变更记录为起点，沿证据追踪到 PALO 工作流中的人工审核决策。"),
        "check": ("In Studio, select Source change ID as the origin and inspect the control and review intake. The downloadable model is a synthetic training case.",
                  "在工作台选择“来源变更 ID”作为起点，查看控制规则与审核入口。下载的模型为合成训练案例。"),
        "sequence": ("formation-to-release", "who-decides", "pilot-partnership", "release-audit", "practitioner-workspace"),
        "extra": ("about-project", "contact-project", "contribute", "data-handling"),
        "tool": (("Follow the PolicyWatcher and PALO demo", "体验 PolicyWatcher 与 PALO 联动演示"),
                 "/pilot/", "/pilot/zh/"),
        "model": "/journey/models/policy-change.json",
    },
}


def journey_path(case, lang):
    prefix = "/zh" if lang else ""
    return f"{prefix}/journey/" + (f"{case}/" if case else "")


def topic_cases(slug):
    return [(key, data) for key, data in CASES.items() if slug in data["sequence"]] + [
        (key, data) for key, data in CASES.items() if slug in data["extra"]
    ]
