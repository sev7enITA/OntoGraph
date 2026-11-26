"""Bilingual content for the Work With Us and Company pages."""

GITHUB = "https://github.com/sev7enITA/OntoGraph"
DOCS = GITHUB + "/blob/main/"
ISSUES = GITHUB + "/issues"
PORTFOLIO = "https://www.fabriziodegni.com"
CONTACT = "mailto:io@fabriziodegni.com"

PILOT = (("Replay the WBS pilot", "回放 WBS 试点"), "/wbs/", "/wbs/zh/")
GUIDE = (("Open the practical guide", "打开实用指南"), "/guide/", "/guide/zh-Hans.html")
STUDIO = (
    ("Sign in to Semantic Studio", "登录语义工作台"),
    "/OntoGraph/decisions/?lang=en", "/OntoGraph/decisions/?lang=zh-Hans",
)
EMAIL = (("Email the project", "通过邮件联系项目"), CONTACT, CONTACT)
SOURCE = (("Browse the public repository", "浏览公共代码仓库"), GITHUB, GITHUB)
ISSUE_LINK = (("Open GitHub Issues", "打开 GitHub Issues"), ISSUES, ISSUES)

PAGES = {
    "pilot-partnership": {
        "title": ("Plan a pilot together", "共同规划试点"),
        "lead": (
            "Bring one rule change, two independently operated applications and a result you can check after release and withdrawal.",
            "准备一项规则变更、两个独立运营的应用，以及在发布和撤回后可以核验的结果。",
        ),
        "sections": [
            (
                ("Define the same decision in both systems", "明确两个系统共同涉及的决策"),
                (
                    "Start with an actual disagreement or known risk. Write down what should happen before the change, after it takes effect and after withdrawal. Ask each application owner to name a test record that distinguishes the versions.",
                    "从真实存在的分歧或已知风险出发，写下变更前、生效后和撤回后的预期行为。请每个应用的负责人找出一条可区分新旧版本的测试记录。",
                ),
            ),
            (
                ("Agree who will judge the evidence", "明确由谁判断证据"),
                (
                    "Identify the author, accountable reviewer, application owners, independent observer and person authorised to order withdrawal. Give each person a clear decision to make and decide in advance what counts as sufficient evidence.",
                    "明确作者、责任审核人、应用负责人、独立观察者以及有撤回权限的人员。为每人明确决策职责，并预先约定何种证据足以支持结论。",
                ),
            ),
            (
                ("Use a case with a meaningful failure", "选择有判别力的失败场景"),
                (
                    "In the WBS pilot, the Calc workbook initially acknowledged the new package yet kept the old calculation. Its budget read €2,000 against the expected €800. For your pilot, identify a discrepancy that your current process could miss and agree on how to reproduce it safely.",
                    "在 WBS 试点中，Calc 工作簿起初确认收到新包，却沿用了旧计算，得出 2,000 欧元，而预期为 800 欧元。请找出现有流程可能遗漏的分歧，并约定如何安全复现。",
                ),
            ),
        ],
        "lab": (
            ("Check what your pilot needs next", "看看试点下一步需要什么"),
            [
                (
                    ("We have only one application", "目前只有一个应用"),
                    ("Build the first observation", "先建立第一次观察"),
                    (
                        "Run the baseline and changed rules on the same records. Keep those results and identify a second owner and consumer when a definition starts crossing teams.",
                        "在同一组记录上分别运行基线规则与变更后的规则，保留两次结果。当定义开始跨团队使用时，再明确第二位负责人和第二个使用该规则的应用。",
                    ),
                ),
                (
                    ("Two applications share a rule", "两个应用共用一项规则"),
                    ("Create a discriminating case", "设计能区分新旧版本的案例"),
                    (
                        "Choose a test record with a different expected result between the old and new rules. Record an independent observation from each application and repeat it after withdrawal.",
                        "选择一条在新旧规则下预期结果不同的测试记录。分别记录两个应用的独立观察，并在撤回后再次执行。",
                    ),
                ),
                (
                    ("A consumer cannot be reached", "有一个应用无法访问"),
                    ("Make unproven an explicit status", "明确记录为尚未证实"),
                    (
                        "Agree who can restore access and how a fresh observation will be captured. Treat the application as unproven until the agreed result is observed.",
                        "确定由谁恢复访问及如何取得新的观察记录。在观察到约定结果前，将该应用的状态保留为尚未证实。",
                    ),
                ),
            ],
        ),
        "links": [PILOT, EMAIL],
    },
    "learning-path": {
        "title": ("Guided learning path", "操作学习路径"),
        "lead": (
            "Work from a small local model to an observed release. Each exercise leaves a result you can inspect or reproduce.",
            "从一个小型本地模型开始，逐步完成对发布结果的观察。每个练习都会产出可检查或可复现的结果。",
        ),
        "sections": [
            (
                ("1. Model what a term means", "1. 定义术语含义"),
                (
                    "Open the lending example in the practical guide. Follow one business term from its glossary entry to an application field. Record which decision the field influences and who owns the definition.",
                    "打开实用指南中的借阅应用示例。从一条术语定义追踪到应用字段，记录该字段会影响哪项决策，以及谁负责定义。",
                ),
            ),
            (
                ("2. Review two assessments", "2. 审阅两份评估"),
                (
                    "Open the WBS example and compare Finance’s interpretation of a posting object with PMO’s interpretation of a work package. Locate the source and rationale behind each judgement, then read the steward’s resolution.",
                    "打开 WBS 示例，比较财务对过账对象的解释与项目管理办公室对工作包的解释。找到每项判断的来源和理由，再阅读数据管理员的裁决。",
                ),
            ),
            (
                ("3. Check the observed result", "3. 核验实测结果"),
                (
                    "Find the workbook observation in which the reported release changed while the result stayed at €2,000. Compare it with the fresh €800 result and verify the captured archive locally by following the reproduction instructions.",
                    "找出一条工作簿观察记录，其中报告的发布版本已变更，但结果仍是 2,000 欧元。与后续新测得的 800 欧元比较，再按复现指南在本地核验证据档案。",
                ),
            ),
        ],
        "lab": (
            ("Check your understanding", "检验理解"),
            [
                (
                    ("Both applications acknowledge the release", "两个应用都确认收到发布包"),
                    ("Find their actual outputs", "查找应用的实际输出"),
                    (
                        "A receipt identifies the version reported by an application. Open the observations and compare each result with its expected decision before marking the release as verified.",
                        "接收确认表明应用报告了哪个版本。在将发布标记为已核验之前，打开观察记录，将每个结果与对应的预期决策进行比较。",
                    ),
                ),
                (
                    ("An application cannot be checked after withdrawal", "撤回后无法检查某个应用"),
                    ("Leave the withdrawal unproven", "将该应用保留为撤回尚未证实"),
                    (
                        "Keep the withdrawal request and the failed check in the record. Verify this application after access returns and a fresh observation is available.",
                        "在记录中保留撤回请求和失败的检查。恢复访问并取得新的观察记录后，再核验该应用。",
                    ),
                ),
            ],
        ),
        "links": [
            GUIDE,
            PILOT,
            (
                ("Reproduce the WBS pilot locally", "在本地复现 WBS 试点"),
                DOCS + "examples/wbs_pilot/README.md#run-both-applications",
                DOCS + "examples/wbs_pilot/README.zh-Hans.md",
            ),
        ],
    },
    "practitioner-workspace": {
        "title": ("Practitioner workspace", "实务工作区"),
        "lead": (
            "Sign in to examine relationship evidence. With editing permissions, prepare a reviewable draft and record who made each claim, why and which source supports it.",
            "登录后检查关系证据。如果具备编辑权限，可以准备供审核的草稿，记录每项主张的提出者、理由及支持该主张的来源。",
        ),
        "sections": [
            (
                ("Start with the unresolved WBS model", "从尚未裁决的 WBS 模型开始"),
                (
                    "Download the unresolved JSON. Sign in to Studio, choose Relationship evidence and import the file into your draft. Inspect the mapping for the bare code 0017 and read the Finance and PMO assessments.",
                    "下载尚未裁决的 JSON 文件。登录工作台，进入关系证据工作区并将文件导入草稿。检查未注明部门的 0017 编码映射，阅读财务部门和项目管理办公室的评估。",
                ),
            ),
            (
                ("Record a resolution and confirm the save", "记录裁决并确认保存"),
                (
                    "Choose a supported claim, name the reviewer and give the reason for the decision. Apply the changes to the draft, save it and reopen it to inspect the recorded decision. If the underlying claim changes, verify the resolution status again.",
                    "选择一项有证据支持的主张，指定审核人并填写裁决理由。将变更应用到草稿，保存后重新打开，检查已记录的裁决。若基础主张发生变更，请再次核验裁决状态。",
                ),
            ),
            (
                ("Hand off the candidate for release review", "将候选版本交接给发布审核"),
                (
                    "Export the draft for the registry workflow. The named reviewer must cast an authenticated approval on the frozen candidate. The registry checks that the resolution still matches the evidence when it evaluates publication.",
                    "导出草稿以进入注册表工作流。指定审核人须对冻结的候选版本完成经身份验证的审批。注册表判断能否发布时，会检查裁决是否仍与证据一致。",
                ),
            ),
        ],
        "links": [
            STUDIO,
            (("Download the unresolved WBS model", "下载尚未裁决的 WBS 模型"), "/wbs/unresolved.json", "/wbs/unresolved.json"),
            PILOT,
        ],
    },
    "pilot-scope": {
        "title": ("Scope a pilot and estimate effort", "界定试点范围并估算工作量"),
        "lead": (
            "Estimate the work needed to prepare, integrate, review and verify one decision across two applications.",
            "估算在两个应用之间准备、接入、审核和核验同一项决策所需的工作量。",
        ),
        "kind": "pilot-estimate",
        "sections": [
            (
                ("Separate shared work from application work", "区分共同工作与各应用的工作"),
                (
                    "Count the time to choose a rule, obtain sample records and agree on acceptance criteria. Estimate each application’s setup separately. An API and a workbook often need different access and verification work. For the calculator, use the average integration time across the applications. If one needs 5 hours and another needs 11, enter 8 hours per application.",
                    "计算选定规则、取得样本记录和商定验收标准所需的时间。分别估算每个应用的准备工作。API 和工作簿通常需要不同的访问方式和核验流程。请在计算器中填写各应用的平均接入工时。例如，一个需要 5 小时，另一个需要 11 小时，则每个应用填 8 小时。",
                ),
            ),
            (
                ("Budget time for failure and recovery", "预留排查和恢复时间"),
                (
                    "Include a successful release, a stale response behind a valid receipt and an application that cannot be reached. Time the same checks under your existing process and the proposed pilot.",
                    "纳入发布成功、接收确认有效但结果仍旧，以及应用无法访问等场景。在现有流程与拟议试点中分别执行相同检查并计时。",
                ),
            ),
            (
                ("Use the estimate to prepare a conversation", "用估算结果准备讨论"),
                (
                    "Treat your total as an estimate of team hours. Bring the two applications, example rule and expected decisions to the scoping discussion. Set the commercial terms with the project owner after agreeing on access and responsibilities.",
                    "将总数视为团队工时估算。讨论试点范围时，请带上涉及的两个应用、示例规则和预期决策。在明确访问权限与职责后，再与项目负责人商定商业条款。",
                ),
            ),
        ],
        "links": [
            (
                ("Read the pilot decision criteria", "阅读试点决策标准（英文）"),
                DOCS + "docs/MARKET.md#pilot-decision-criteria",
                DOCS + "docs/MARKET.md#pilot-decision-criteria",
            ),
            EMAIL,
        ],
    },
    "contact-project": {
        "title": ("Contact the project", "联系项目"),
        "lead": (
            "Get in touch to discuss a pilot or research question. Use GitHub Issues for a technical problem others should be able to reproduce.",
            "欢迎联系本项目，讨论试点或研究合作。对于适合公开复现的技术问题，请使用 GitHub Issues。",
        ),
        "sections": [
            (
                ("Discuss an implementation or pilot", "讨论实施或试点"),
                (
                    "Include the decision you want to change, the two applications and the result you need to verify. A short message naming the system owners and describing available test data is enough to start.",
                    "请说明希望变更的决策、涉及的两个应用及需要核验的结果。简要说明系统负责人，并描述可用的测试数据，即可开始讨论。",
                ),
            ),
            (
                ("Share a research question", "提出研究问题"),
                (
                    "Describe the claim you want to investigate, the evidence you already have and what a useful comparison would look like. The public WBS pilot provides a case with both a delivery mismatch and a withdrawal mismatch.",
                    "说明希望研究的主张、已有证据，以及怎样的比较才有意义。公开的 WBS 试点同时包含发布接收后的不一致，以及撤回结果的不一致。",
                ),
            ),
            (
                ("Report a technical issue", "报告技术问题"),
                (
                    "Include the environment, the steps you followed and the expected and actual results. Use a minimal synthetic example and remove account details, credentials and private records before posting.",
                    "请附上运行环境、操作步骤、预期与实际结果。发布前请使用最小合成示例，并移除账户资料、凭据和私有记录。",
                ),
            ),
        ],
        "links": [
            EMAIL,
            (("Contact via LinkedIn", "通过 LinkedIn 联系"), "https://www.linkedin.com/in/fdegni/", "https://www.linkedin.com/in/fdegni/"),
            (("Collaboration page", "合作页面（英文）"), PORTFOLIO + "/collaborate/#contact", PORTFOLIO + "/collaborate/#contact"),
            ISSUE_LINK,
        ],
    },
    "about-project": {
        "title": ("Project origins", "项目缘起"),
        "lead": (
            "OnToGraPh began as the shared ontology layer for PALO Framework and PolicyWatcher. Today it is an independent open-source framework. You can model your own domain, review its rules and test them in your applications.",
            "OnToGraPh 最初为 PALO Framework 和 PolicyWatcher 提供共享本体层，如今已成为可独立运行的开源框架。你可以为自己的业务领域建模、审核规则，并在自己的应用中验证规则的实际效果。",
        ),
        "sections": [
            (
                ("Why it exists", "项目为何创建"),
                (
                    "An approved definition and a matching deployment receipt can coexist with an outdated decision. OnToGraPh records who approved the meaning, which version was delivered and what result each application produced.",
                    "已经获批的定义和与之匹配的部署接收确认，可以与过时的决策同时存在。OnToGraPh 记录谁批准了定义、交付了哪个版本，以及每个应用产生了什么结果。",
                ),
            ),
            (
                ("How the three projects connect", "三个项目如何协作"),
                (
                    "PolicyWatcher detects changes and preserves source evidence. PALO Framework defines governance authority and review gates. OnToGraPh connects the source, meaning, control, released rule and observed application result. In standalone use, supply your own model and evidence.",
                    "PolicyWatcher 发现变更并保存来源证据。PALO Framework 定义治理权限和审核关口。OnToGraPh 将来源、含义、控制、发布的规则和应用实测结果连接起来。独立使用时，可以提供自己的模型和证据。",
                ),
            ),
        ],
        "links": [
            (("Explore the related projects", "探索相关项目"), "/#behind", "/zh/#behind"),
            (("PALO Framework", "PALO Framework"), "https://paloframework.org/", "https://paloframework.org/"),
            (("PolicyWatcher", "PolicyWatcher"), "https://policywatcher.online/", "https://policywatcher.online/"),
            (("Research and publications", "研究与出版物（英文）"), PORTFOLIO + "/research/", PORTFOLIO + "/research/"),
        ],
    },
    "contribute": {
        "title": ("Contribute to the project", "参与项目贡献"),
        "lead": (
            "Contribute a reproducible case, an improved explanation or a correction to a model. Give reviewers enough context to check the result independently.",
            "可以贡献可复现的案例、改进说明，或修正模型。提供足够的背景，以便审核人能独立核验结果。",
        ),
        "sections": [
            (
                ("Suggest an example other teams can reproduce", "提出其他团队可复现的示例"),
                (
                    "Pick a term whose meaning changes by department. List the affected systems and expected decisions, supply a few synthetic records and explain how to observe each result.",
                    "选择一个在不同部门含义不同的术语，列出受影响的系统和预期决策，提供几条合成记录，并说明如何观察各个结果。",
                ),
            ),
            (
                ("Make a reported problem actionable", "让贡献者可以处理你报告的问题"),
                (
                    "For a broken workflow, include the smallest input that triggers the problem, the step that fails and what you expected. For a documentation correction, include the page, language and the wording you propose.",
                    "如果工作流出错，请附上能触发问题的最小输入、失败步骤及预期结果。如果修正文档，请注明页面、语言和建议文本。",
                ),
            ),
        ],
        "links": [ISSUE_LINK, (("Read the project wiki", "阅读项目 Wiki"), GITHUB + "/wiki", GITHUB + "/wiki")],
    },
    "data-handling": {
        "title": ("Data handling and privacy", "数据处理与隐私"),
        "lead": (
            "See where the reference deployment keeps local records, account drafts and restricted research access.",
            "了解参考部署如何存放本地记录、账户草稿，并限制研究资料的访问。",
        ),
        "sections": [
            (
                ("Standalone registry", "独立版注册表"),
                (
                    "The reference registry runs locally and uses a SQLite file for each workspace. Its release documentation describes role-bound credentials, version history and observation records. Choose an environment and sources appropriate for the records you intend to use.",
                    "参考注册表在本地运行，每个工作区使用一个 SQLite 文件。发布文档介绍了与角色绑定的凭据、版本历史和观察记录。请根据计划使用的记录选择合适的环境和来源。",
                ),
            ),
            (
                ("Hosted Semantic Studio", "托管语义工作台"),
                (
                    "The online relationship workspace requires sign-in. Named drafts are saved under the account in private storage. Importing opens a model in the workspace. Saving the draft persists its current revision under that account.",
                    "在线关系工作区需要登录。命名草稿存放在对应账户的私有存储中。导入会在工作区打开模型，保存草稿会在该账户下持久化当前修订版。",
                ),
            ),
            (
                ("Restricted research room", "受限研究资料室"),
                (
                    "The research room uses a separate password and a session cookie to keep an authorised reader signed in. The operations guide documents session limits and where the research files are stored.",
                    "研究资料室使用单独的密码和会话 Cookie，让获授权的读者保持登录。运维文档介绍了会话期限和研究文件的存放位置。",
                ),
            ),
        ],
        "links": [
            (("Read local registry operations", "阅读本地注册表操作文档（英文）"), DOCS + "docs/PROTOCOL.md#cli-operations", DOCS + "docs/PROTOCOL.md#cli-operations"),
            (("Read hosted draft operations", "阅读托管草稿运维文档（英文）"), DOCS + "deploy/hosted-decisions/README.md", DOCS + "deploy/hosted-decisions/README.md"),
            (("Read research room access notes", "阅读研究资料室访问说明（英文）"), DOCS + "docs/wiki/RESEARCH-ROOM-OPERATIONS.md", DOCS + "docs/wiki/RESEARCH-ROOM-OPERATIONS.md"),
            EMAIL,
        ],
    },
    "access-and-reuse": {
        "title": ("Project access and reuse", "项目访问与复用"),
        "lead": (
            "Read the software license, reproduce a reference case or access the hosted workspace.",
            "了解软件许可、如何复现参考案例，以及如何访问托管工作区。",
        ),
        "sections": [
            (
                ("Inspect and reproduce the reference cases", "查阅并复现参考案例"),
                (
                    "The public repository contains the documented model, examples and reproduction steps. The WBS page links to a captured evidence bundle and shows how to verify it on your own machine using the published instructions.",
                    "公共代码仓库提供模型说明、示例和复现步骤。WBS 页面链接到实测证据包，并介绍如何按已发布的说明在本机核验。",
                ),
            ),
            (
                ("Use the code under MIT", "按 MIT 许可证使用代码"),
                (
                    "The OnToGraPh code is available under the MIT License. You can use it commercially, modify it and redistribute it. Include the copyright and permission notices with copies or substantial portions of the code. Third-party components retain their own licenses. The hosted Studio requires sign-in.",
                    "OnToGraPh 项目代码采用 MIT 许可证，可用于商业用途，也可修改和再分发。复制全部或实质性部分代码时须保留版权和许可声明。第三方组件遵循各自的许可证。 托管的 Studio 需要登录。",
                ),
            ),
            (
                ("Cite the work", "引用本项目"),
                (
                    "Use the project’s citation record for authorship details. Include the commit or release you used when your work depends on a specific model or result.",
                    "请通过项目引用记录查看作者信息。如果你的工作基于特定模型或结果，请注明所使用的提交或发布版本。",
                ),
            ),
        ],
        "links": [
            SOURCE,
            (("Read the MIT License", "阅读 MIT 许可证"), DOCS + "LICENSE", DOCS + "LICENSE"),
            (("View project citation metadata", "查看项目引用信息"), DOCS + "CITATION.cff", DOCS + "CITATION.cff"),
            PILOT,
            EMAIL,
        ],
    },
}
