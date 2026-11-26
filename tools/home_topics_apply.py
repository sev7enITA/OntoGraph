"""Bilingual examples and decision exercises for the Apply It pages."""

PRINCIPLES = "https://github.com/sev7enITA/OntoGraph/blob/main/docs/PROTOCOL.md"
LIBRARY = (
    ("Build a personal lending app", "构建个人借阅应用"),
    "/guide/#personal-project-build-a-lending-app",
    "/guide/zh-Hans.html#个人项目做一个借书应用",
)
FILES = (
    ("Reconcile files exchanged by two teams", "对账：两个团队交换的文件"),
    "/guide/#enterprise-reconcile-file-exchanges-between-silos",
    "/guide/zh-Hans.html#企业场景对接各自独立的文件交换系统",
)
COPILOT = (
    ("Prepare a company dictionary for Copilot", "为 Copilot 准备企业词典"),
    "/guide/#microsoft-365-copilot-ground-answers-in-the-company-dictionary",
    "/guide/zh-Hans.html#microsoft-365-copilot按本公司的定义解释术语",
)
HANDOFF = (
    ("Walk through the PALO and PolicyWatcher pilot", "查看 PALO 与 PolicyWatcher 联动试点"),
    "/pilot/",
    "/pilot/zh/",
)
WBS = (("Inspect the full WBS evidence", "查看完整 WBS 证据"), "/wbs/", "/wbs/zh/")
PUZZLE = (
    ("Run the architecture puzzle", "运行架构拼图"),
    "/architecture/",
    "/architecture/?lang=zh-Hans",
)

PAGES = {
    "fit-check": {
        "title": ("Is OnToGraPh a fit?", "OnToGraPh 适合我的场景吗？"),
        "lead": (
            "Start with a decision that depends on the meaning of a term or on a rule. Check whether you can name the owner, the application and the evidence of the result.",
            "从依赖术语含义或规则的决策入手，检查能否明确负责人、执行决策的应用及证明结果的证据。",
        ),
        "sections": [
            (
                ("Describe one decision", "明确一项决策"),
                (
                    "Write an input, the outcome you expect and the reason. For a lending app, an available physical copy can be lent. A copy already on loan must be held. Availability comes from the app’s records.",
                    "记录一项输入、预期结果及原因。以借阅应用为例，有库存的实体副本可以借出，已借出的副本应暂缓处理。可借状态来自应用自身的记录。",
                ),
                (
                    "Distinguish the decision owner from the system that runs the rule. Decide who can approve a change and how someone can check the application's result.",
                    "区分决策负责人和运行规则的系统。明确谁能批准变更，以及其他人员如何核验应用给出的结果。",
                ),
            ),
            (
                ("Choose cases that reveal a difference", "选择能揭示差异的用例"),
                (
                    "Use a case whose result changes under the proposed rule, a case that should still pass, and one outside the rule’s scope. Store the expected decisions before examining the actual outputs.",
                    "准备三类用例：拟议规则会改变结果的用例、应继续通过的用例，以及超出规则适用范围的用例。先记录预期决策，再查看实际输出。",
                ),
                (
                    "For example, a new WBS rule can hold a bare code while a qualified code still passes. Finance and the project office measure different things, so compare each application's output with its own expected result.",
                    "例如，新的 WBS 规则可能会暂停处理未限定部门的编码，而已明确部门的编码仍可通过。财务和项目管理办公室衡量的业务指标不同，应分别将各应用的输出与其预期结果比较。",
                ),
            ),
        ],
        "lab": (
            ("Which inputs can you bring?", "你能提供哪些输入？"),
            [
                (
                    ("One app and a testable rule", "一个应用和一条可测试规则"),
                    ("Start with the lending example", "从借阅示例入手"),
                    (
                        "Model one definition and compare the decision on two copies of the same edition with different availability. The local guide shows both the JSON model and the rule test.",
                        "为一个定义建模，对同一版本中借阅状态不同的两份实体副本进行决策比较。本地指南提供 JSON 模型和规则测试。",
                    ),
                ),
                (
                    ("Two teams interpret the same code differently", "两个团队对同一编码的含义理解不同"),
                    ("Test the scope of the shared rule", "测试共享规则的适用范围"),
                    (
                        "Ask each team for a source example. Document whether a bare code is sufficient and find two outputs you can observe independently. Then compare old and new results on identical records.",
                        "请每个团队提供来源示例，记录未限定部门的编码是否足够，并找出两项可独立观测的输出。随后使用相同记录比较新旧规则的结果。",
                    ),
                ),
                (
                    ("I have a term and no observable result yet", "已有术语，尚未找到可观察的结果"),
                    ("Define a test before pursuing verification", "明确可测试结果后再着手核验"),
                    (
                        "Draft the term and its scope. To test a release later, decide who can observe the application's result, which case should expose the change and where to retain the output.",
                        "先起草术语及其适用范围。为了日后核验发布，明确谁可以观察应用结果、哪个用例能揭示变化，以及输出将保存在哪里。",
                    ),
                ),
            ],
        ),
        "links": [LIBRARY, WBS],
    },
    "choose-start": {
        "title": ("Choose your starting path", "选择入门路径"),
        "lead": (
            "Choose the problem you can test today. Each path begins with a small artifact you can inspect and one check you can repeat.",
            "选择当前可测试的问题。每条路径都有一份可检查的小型制品，以及一项能重复执行的核验。",
        ),
        "sections": [
            (
                ("Keep the first model small", "缩小首个模型"),
                (
                    "Record the purpose and scope of one decision. Keep a stable identifier for each concept, and describe where each field or term comes from. An identifier for a physical copy and an ISBN identify different things.",
                    "记录一项决策的用途和范围。为每个概念保留稳定标识，并说明字段或术语来自何处。实体副本标识和 ISBN 对应不同对象。",
                ),
            ),
            (
                ("Pick a check the next person can rerun", "选择他人可复现的检查"),
                (
                    "Capture the input, expected answer, execution context and actual answer. For Copilot, record the prompt and verify the returned answer and its sources. For a file exchange, retain the input row and the application reading tied to that row.",
                    "记录输入、预期答案、执行环境和实际答案。使用 Copilot 时保存提示词，并核对返回的答案及来源。文件交换场景则要保留输入记录和对应的应用实测结果。",
                ),
                (
                    "Bring your finding to the owner of the term or rule. Agree on the next test before adding more concepts or applications.",
                    "把核验结果交给术语或规则负责人。在纳入更多概念或应用之前，共同确定下一项测试。",
                ),
            ),
        ],
        "lab": (
            ("What are you trying to do?", "你当前想解决什么问题？"),
            [
                (
                    ("Build one personal app", "构建一款个人应用"),
                    ("Start with a dictionary and one lending rule", "先建立词典和一条借阅规则"),
                    (
                        "Separate edition from physical copy. Use the same ISBN for two copies and give each copy its own available flag. Test that the app decides using the copy's flag.",
                        "区分出版版本和实体副本。使用 ISBN 相同的两份副本，为各自设置可借标记，验证应用能根据相应副本的标记作出决策。",
                    ),
                ),
                (
                    ("Reconcile exported files", "对账：两个部门导出的文件"),
                    ("Start with two field mappings", "先定义两条字段映射"),
                    (
                        "Map each team's WBS field to the meaning used in its own process. Include one ambiguous code in your test files and specify what each importer should return.",
                        "把每个团队的 WBS 字段映射到其自身流程所用的含义。在测试文件中加入一个有歧义的编码，并明确各导入程序应返回什么结果。",
                    ),
                ),
                (
                    ("Ground Copilot in business terminology", "让 Copilot 使用企业业务术语"),
                    ("Start with a curated glossary", "先整理词汇表"),
                    (
                        "Define terms, synonyms and sources by department. Put the reviewed definitions in the knowledge source used by your Copilot deployment. Ask a question containing WBS with and without department context and verify the answers.",
                        "按部门整理术语、同义词和来源，把已审核定义放入你的 Copilot 部署所使用的知识源。分别在有、无部门背景时提出含 WBS 的问题，并核对回答。",
                    ),
                ),
                (
                    ("Respond to an external policy change", "应对外部政策变更"),
                    ("Start with a dated source excerpt", "先记录带日期的来源摘录"),
                    (
                        "Use the PALO and PolicyWatcher walkthrough to see an evidence record handed off for human review. Describe which local rule might change and who would decide.",
                        "查看 PALO 与 PolicyWatcher 联动试点，了解证据记录如何转交人工审核。说明哪条本地规则可能需要修改，以及由谁作出决定。",
                    ),
                ),
            ],
        ),
        "links": [LIBRARY, FILES, COPILOT, HANDOFF],
    },
    "constraint-check": {
        "title": ("Find the decision bottleneck", "定位决策瓶颈"),
        "lead": (
            "Follow the path from a changed concept through its controls and applications. Start where the next required piece of evidence is absent, disputed or out of date.",
            "从变更后的概念沿依赖关系追踪控制与应用，优先处理缺失、有争议或过期的下一项必要证据。",
        ),
        "sections": [
            (
                ("Follow one dependency", "追踪一条依赖关系"),
                (
                    "Start at the posting object in the impact lab. Follow the ledger WBS field to month-end close, then switch the evidence to Disputed. Inspect the source tied to the contested link and the owner who can route it for review.",
                    "在影响分析实验中，从过账对象开始，沿账本 WBS 字段追踪到月末结账，再将证据切换为“有争议”。查看该关系引用的来源，以及可推动审核的负责人。",
                ),
            ),
            (
                ("Assign a next action", "确定下一步行动"),
                (
                    "A missing assessment calls for a source and rationale. A disagreement on a required relationship calls for an assigned reviewer and recorded resolution. Confirmed evidence still goes through the applicable approval, quorum and CI requirements.",
                    "缺少评估时应补充来源及理由。必评关系存在分歧时，应指定审核人并记录裁决。证据得到确认后，仍需满足适用的审批、法定人数和 CI 要求。",
                ),
                (
                    "After activation, check whether the application gave the expected answer on an input where the old and new versions differ. Keep the approval and the observation as separate records.",
                    "发布生效后，选择能区分新旧版本的输入，核验应用是否给出预期答案。分别保留审批记录和应用实测记录。",
                ),
            ),
        ],
        "lab": (
            ("Where has progress stopped?", "流程卡在哪一步？"),
            [
                (
                    ("A required relationship has no assessment", "必评关系缺少评估"),
                    ("Find the dependency owner", "找到依赖关系负责人"),
                    (
                        "Collect a dated source. Record an assessor, rationale, criticality and confidence. Check whether the source covers the exact rule scope before proposing the change.",
                        "收集带日期的来源，记录评估人、理由、关键程度和置信度。在提出变更前，确认来源覆盖规则的确切范围。",
                    ),
                ),
                (
                    ("Two assessments disagree", "两项评估存在分歧"),
                    ("Send the exact claims to the reviewer", "将具体主张交给审核人"),
                    (
                        "Preserve both judgments and their sources. For a required relationship, have the designated reviewer resolve the current basis and vote on the resulting candidate. Check that the sources are confirmed and the required quorum is met.",
                        "保留两项判断及其来源。对必评关系，由指定审核人依据当前证据组合裁决，并对由此产生的候选版本投票。检查来源是否已确认，批准人数是否达到要求。",
                    ),
                ),
                (
                    ("The application sent a receipt", "应用已经发送接收回执"),
                    ("Check the application’s decision", "核验应用的决策结果"),
                    (
                        "Run the pre-agreed case that distinguishes versions. Bind the actual reading, capture time and artifact to the released version and application. A usable result is still required for verification.",
                        "运行事先约定、可区分版本的用例，将实际读数、采集时间和证据制品关联到发布版本与应用。取得可用结果后才可完成核验。",
                    ),
                ),
            ],
        ),
        "links": [
            (
                ("Open the disputed evidence scenario", "打开证据争议场景"),
                "/weights/?scenario=disputed",
                "/weights/zh/?scenario=disputed",
            ),
            WBS,
        ],
    },
    "dependency-diagnostic": {
        "title": ("Diagnose a missing capability", "诊断缺失能力"),
        "lead": (
            "Find out which parts of your architecture are needed to prove a release. The Aurora example separates semantic inputs, release prerequisites and application observations.",
            "查明架构中哪些组件是核验发布所必需的。Aurora 示例将语义输入、发布前提和应用实测结果分开呈现。",
        ),
        "sections": [
            (
                ("Change one component at a time", "一次只更改一个组件"),
                (
                    "Open the architecture puzzle and choose Aurora 21 with the Standalone preset. At activation, look at the build prerequisites, evidence coverage, observed divergences and unproven consumers.",
                    "打开架构拼图，选择 Aurora 21 和“独立运行”预设。在激活检查点查看构建前提、证据覆盖、已观察到的偏差和未证实的应用数量。",
                ),
                (
                    "Remove the PMS probe. The simulation now has no usable PMS reading, so the missing app remains in scope and is marked unproven. Reconnect it to reveal the previously observed divergence.",
                    "移除 PMS 探针后，模拟中将缺少可用读数。该应用仍在评估范围内，状态为尚未证实。重新连接探针可再次看到此前观察到的偏差。",
                ),
            ),
            (
                ("Write down what changed", "记录变化的内容"),
                (
                    "Record the missing capability, which results can still be checked and the action that would restore coverage. The puzzle models alternatives in the browser. Its custom adapter and contract options rely on their stated assumptions.",
                    "记录缺失的能力、仍可核验的结果，以及如何恢复覆盖。拼图在浏览器中模拟不同配置，自定义适配器和契约选项依赖其明示的假设。",
                ),
            ),
        ],
        "lab": (
            ("Pick an Aurora counterfactual", "选择一种 Aurora 反事实配置"),
            [
                (
                    ("Remove one consumer probe", "移除一个应用探针"),
                    ("The other consumer keeps its observation", "另一个应用保留其实测结果"),
                    (
                        "The disconnected app remains in scope and moves to unproven. Check both the coverage count and the observed divergence count before drawing any conclusion.",
                        "断开的应用仍在评估范围内，状态变为尚未证实。判断之前，请同时检查覆盖数量和已观察到的偏差数量。",
                    ),
                ),
                (
                    ("Remove the CI artifact", "移除 CI 制品"),
                    ("The release loses a build prerequisite", "发布失去一项构建前提"),
                    (
                        "In this CI-required scenario, both application results become unproven. Restore the CI evidence before using either observation to support a release claim.",
                        "在本场景中，CI 是必需条件，因此两个应用的结果均变为尚未证实。恢复 CI 证据后，才可使用这些实测结果支持发布结论。",
                    ),
                ),
                (
                    ("Remove an upstream discovery tool", "移除一个上游语义发现工具"),
                    ("Input capability changes according to the remaining tools", "输入能力随剩余工具而变化"),
                    (
                        "Use the Semantic stack preset and remove NVIDIA Auto Ontology. With no other discovery provider selected, the discovery role becomes unassigned. The version and application checks still use their selected pieces.",
                        "选择“语义技术栈”预设并移除 NVIDIA Auto Ontology。在没有选中其他语义发现工具时，该职责变为未分配。版本检查和应用核验仍使用已选择的组件。",
                    ),
                ),
            ],
        ),
        "links": [PUZZLE, HANDOFF],
    },
    "release-audit": {
        "title": ("Audit a release and its withdrawal", "审查发布和撤回"),
        "lead": (
            "Replay the published WBS exercise, using application readings captured from Beancount and LibreOffice Calc on separate native files with synthetic records.",
            "回放已发布的 WBS 练习，检查 Beancount 和 LibreOffice Calc 分别在各自原生文件中处理合成记录时采集的应用读数。",
        ),
        "kind": "wbs-readbacks",
        "sections": [
            (
                ("Start with a test that exposes the old rule", "先选能揭示旧规则的测试"),
                (
                    "The reviewed WBS rule requires the source department. Run the case with a bare code, a qualified code and a separate control. Beancount measures eligible ledger postings. Calc measures eligible work-package budget. Each application has its own expected amount.",
                    "审核后的 WBS 规则要求明确来源部门。使用未限定部门的编码、已注明部门的编码以及独立对照记录来测试。Beancount 计算符合条件的过账金额，Calc 计算符合条件的工作包预算。两个应用分别有各自的预期金额。",
                ),
                (
                    "At activation, find the checkpoint where Calc acknowledges the new package yet still uses the prior workbook. Compare that reading with the one captured after the qualified rule is applied.",
                    "检查激活阶段 Calc 已确认收到新规则包但仍使用旧工作簿的检查点，并将该读数与新规则生效后的读数对照。",
                ),
            ),
            (
                ("Check each application's withdrawal", "逐项核验应用是否完成撤回"),
                (
                    "Follow the first withdrawal reading, the workbook outage and the fresh readback. When the workbook is unavailable, Calc remains unproven. Confirm withdrawal only after fresh readings show inactivity on the declared cases.",
                    "对照首次撤回读数、工作簿中断及恢复后的新读数。工作簿无法访问时，Calc 状态仍是尚未证实。只有新读数证明约定用例中的规则已停用，才能确认撤回。",
                ),
                (
                    "Restore the earlier rule as a new reviewed release. To reproduce the audit, keep the activation, phase, case, observer, capture time and original artifact together.",
                    "将原规则作为另一个经过审核的版本重新发布。为了复现实验，请一并保留激活记录、阶段、用例、观察者、采集时间和原始证据制品。",
                ),
            ),
        ],
        "links": [
            WBS,
            (
                ("Read how the registry evaluates the evidence", "查看注册表如何判断证据状态（英文）"),
                PRINCIPLES + "#evaluation-states",
                PRINCIPLES + "#evaluation-states",
            ),
            (("Review the Aurora 21 case", "查看 Aurora 21 案例"), "/#aurora", "/zh/#aurora"),
        ],
    },
}
