"""Bilingual Theory topics for the OnToGraPh site."""

REPOSITORY = "https://github.com/sev7enITA/OntoGraph"
FRAMEWORK = f"{REPOSITORY}/blob/main/docs/FRAMEWORK.md"
PROTOCOL = f"{REPOSITORY}/blob/main/docs/PROTOCOL.md"

PAGES = {
    "operational-meaning": {
        "title": ("Meaning in operational work", "业务语义如何落地"),
        "lead": (
            "Treat the meaning of a field as a decision someone owns. A code needs a definition, a scope and a test for the applications that act on it.",
            "将字段含义视为一项有明确责任人的业务决策。编码需要有定义、适用范围，以及面向使用它的应用的测试。",
        ),
        "sections": [
            (
                ("One code in two processes", "同一编码进入两个流程"),
                (
                    "In the WBS pilot, Finance uses 0017 for a ledger posting object and the project management office uses it for a work package. Both use the code 0017, and each application interprets it within its own process.",
                    "在 WBS 试点中，财务部门用 0017 表示账本过账对象，项目管理办公室用它表示工作包。两者都使用编码 0017，各自的应用根据业务流程确定其含义。",
                ),
            ),
            (
                ("Make the mapping reviewable", "让映射可以审核"),
                (
                    "Write down the business definition, the physical field, the owner, the valid context and the rows that should pass or wait. Keep the original code as text so its leading zeros survive transfer.",
                    "记录业务定义、物理字段、负责人、适用情境，以及哪些记录应通过、哪些应暂缓。以文本形式保留原始编码，让前导零在传输后依然存在。",
                ),
                (
                    "The reviewed pilot rule requires both a known code and a matching source department. A positive test supplies both values. A contrast test supplies a known code with the department qualifier missing.",
                    "试点中通过审核的规则同时要求编码已知且来源部门匹配。正向测试提供两项信息；对照测试保留已知编码，但缺少部门限定条件。",
                ),
            ),
            (
                ("Check the application that makes the decision", "核验实际作出决策的应用"),
                (
                    "The pilot runs Beancount on a native ledger and LibreOffice Calc on a separate workbook. Compare each result with its own approved behaviour. One total measures eligible postings and the other measures eligible planned budget.",
                    "试点让 Beancount 处理原生账本，让 LibreOffice Calc 处理独立工作簿。将每个结果与各自获准的预期行为对照。一个合计衡量符合条件的过账金额，另一个衡量符合条件的计划预算。",
                ),
            ),
        ],
        "lab": (
            ("Try an input against the reviewed WBS rule", "用一条输入试读审核后的 WBS 规则"),
            [
                (
                    ("Known 0017 with matching department", "已知编码 0017，部门匹配"),
                    ("Expected decision · allow", "预期决策 · 允许"),
                    (
                        "Both required facts are present. Use the case to check that valid entries still qualify after the change.",
                        "两项必需事实均已具备。用这条用例核验变更后有效记录仍可通过。",
                    ),
                ),
                (
                    ("Known 0017 with no department", "已知编码 0017，未提供部门"),
                    ("Expected decision · hold", "预期决策 · 暂缓"),
                    (
                        "The baseline accepted this record. The reviewed rule holds it, so the case can distinguish a current deployment from one using the previous rule.",
                        "基线规则接受这条记录，审核后的规则暂缓处理。用这条用例可以区分当前部署和仍使用旧规则的部署。",
                    ),
                ),
                (
                    ("Unknown code with matching department", "未知编码，部门匹配"),
                    ("Expected decision · hold", "预期决策 · 暂缓"),
                    (
                        "The code fails the known-code requirement even though the department matches. Use this negative control alongside the distinguishing case.",
                        "部门虽然匹配，编码仍未满足已知编码的要求。将这条负向对照与区分新旧规则的用例一起使用。",
                    ),
                ),
            ],
        ),
        "links": [
            (("Inspect the exercised WBS cases", "查看已实测的 WBS 用例"), "/wbs/", "/wbs/zh/"),
            (
                ("Map a term across departments", "建立跨部门术语映射"),
                "/guide/#enterprise-reconcile-file-exchanges-between-silos",
                "/guide/zh-Hans.html#企业场景对接各自独立的文件交换系统",
            ),
        ],
    },
    "model-building-blocks": {
        "title": ("Building blocks of the model", "模型的基本元素"),
        "lead": (
            "Follow a term from its definition to the fields, controls, applications and tests that depend on it.",
            "从术语定义出发，追踪依赖该含义的字段、控制、应用和测试。",
        ),
        "sections": [
            (
                ("Name and organise the meaning", "命名并组织业务含义"),
                (
                    "A dictionary entry gives a concept a stable workspace ID, a definition and an owner. Labels and aliases help people find it. A taxonomy uses broader terms to organise concepts, while a class hierarchy uses subclass links to organise types.",
                    "词典条目为概念提供稳定的工作区 ID、定义和负责人。标签和别名帮助查找。分类体系通过上位术语组织概念，类别层级则通过子类关系组织类型。",
                ),
            ),
            (
                ("Connect the word to the system", "把术语映射到系统"),
                (
                    "In the WBS example, a field for a recognised code maps to the WBS concept. The eligibility control depends on that field, implements a WBS admission contract and, in the reviewed release, also depends on a department qualifier.",
                    "在 WBS 示例中，已识别编码字段映射到 WBS 概念。资格控制依赖该字段，实现 WBS 准入契约，并在审核后的版本中额外依赖部门限定字段。",
                ),
                (
                    "The Finance and PMO applications consume the admission contract. Their test cases record expected decisions and the registry checks observations against the application and release phase to which they belong.",
                    "财务和项目管理应用均使用准入契约。各自的测试用例记录预期决策，注册表按照相应的应用和发布阶段核验观察记录。",
                ),
            ),
            (
                ("Preserve a portable source of truth", "保留可移植的权威记录"),
                (
                    "The release JSON carries mappings, controls, evidence and tests together. The JSON-LD projection represents the graph for exchange. Preserve the release JSON when you need to reconstruct the full decision record.",
                    "发布 JSON 将映射、控制、证据和测试保存在一起。JSON-LD 投影用于交换图结构。若需要重建完整的决策记录，请保留发布 JSON。",
                ),
            ),
        ],
        "lab": (
            ("Choose what you are modelling", "选择要建模的对象"),
            [
                (
                    ("A glossary term", "词汇表中的术语"),
                    ("Define a concept", "定义概念"),
                    (
                        "Give WBS identifier a definition and owner. Add a broader category if it helps people find related concepts.",
                        "为 WBS 标识符填写定义和责任人。可添加上位类别，便于查找相关概念。",
                    ),
                ),
                (
                    ("A column in a file", "文件中的一列"),
                    ("Map the physical field", "映射物理字段"),
                    (
                        "Create a field node and link it to the WBS concept with mapsTo. State the source department and format in the mapping evidence.",
                        "创建字段节点，通过 mapsTo 将它连接到 WBS 概念。在映射证据中注明来源部门和格式。",
                    ),
                ),
                (
                    ("What an application must apply", "应用必须执行的内容"),
                    ("Specify a control and expected outcome", "定义控制和预期结果"),
                    (
                        "Write the condition for eligibility, connect the control to its contract and add an application-scoped case that distinguishes two versions of the rule.",
                        "编写准入条件，将控制连接到契约，再为应用添加可区分规则两个版本的测试用例。",
                    ),
                ),
            ],
        ),
        "links": [
            (("See Semantic Studio", "查看语义工作台"), "/#studio", "/zh/#studio"),
            (("Download the reviewed WBS release model", "下载审核后的 WBS 发布模型"), "/wbs/resolved.json", "/wbs/resolved.json"),
            (("Read the model and validation protocol", "阅读模型和校验协议（英文）"), f"{PROTOCOL}#files-and-identity", f"{PROTOCOL}#files-and-identity"),
        ],
    },
    "who-decides": {
        "title": ("Who decides at each stage", "各阶段由谁决策"),
        "lead": (
            "Assign people to approve changes, inspect application behaviour and order verified withdrawal. The release records these actions separately.",
            "明确由谁审批变更、核验应用行为以及下令撤回。发布记录分别记录这些操作。",
        ),
        "sections": [
            (
                ("Before activation", "发布生效前"),
                (
                    "An author proposes the change, its scope and its test cases. Assigned reviewers can approve or object to that specific frozen candidate. A publisher checks reviewer eligibility, quorum, evidence and any unresolved objection before activation.",
                    "作者提出变更，并明确适用范围和测试用例。指定审核人可批准或反对这一特定的冻结候选版本。发布人在生效前核查审核资格、审批人数要求、证据及未决异议。",
                ),
            ),
            (
                ("After activation", "发布生效后"),
                (
                    "The consumer reports the version it received. An observer runs a case on the application and records its actual result, capture time and artifact digest. Time limits and the exact version matter because a past result may describe a different release.",
                    "使用方报告收到的版本。观察者在应用中运行用例，记录实测结果、采集时间和工件摘要。应核对时间限制和确切版本，因为旧结果可能对应另一次发布。",
                ),
            ),
            (
                ("When the decision must be withdrawn", "需要撤回决策时"),
                (
                    "A supervisor orders withdrawal. Each affected application needs a fresh observation that it stopped applying the rule. Recovery to earlier content uses a new proposal and fresh approval.",
                    "监督者下令撤回。须为每个受影响应用取得新的观察记录，确认它已停止执行该规则。若恢复旧版本的内容，须重新提案并再次审批。",
                ),
                (
                    "In the WBS pilot, Calc acknowledged withdrawal while its calculation still admitted €800. Only the subsequent read of €0 supplied the required inactivity evidence for that case.",
                    "在 WBS 试点中，Calc 确认已收到撤回通知，但计算仍计入 800 欧元。直到随后重新读取到 0 欧元，该用例才获得所需的停止执行证据。",
                ),
            ),
        ],
        "lab": (
            ("Who should take the next action?", "下一步应由谁处理？"),
            [
                (
                    ("A mapping is ready for approval", "映射已准备好提交审批"),
                    ("Assigned reviewer", "指定审核人"),
                    ("Inspect the supporting sources and resolve any objection on the frozen candidate before the publisher activates it.", "核查支持来源并处理冻结候选版本的异议，然后由发布人执行生效操作。"),
                ),
                (
                    ("An application says it loaded the release", "应用报告已加载发布版本"),
                    ("Observer", "观察者"),
                    ("Run a test that can distinguish the old and new rule and save what the application actually returned.", "运行可区分新旧规则的测试，并保存该应用实际返回的结果。"),
                ),
                (
                    ("A flawed release needs withdrawal", "有问题的发布需要撤回"),
                    ("Supervisor and observers", "监督者和观察者"),
                    ("Record the withdrawal decision under the supervisor’s authority. Ask observers for new inactivity evidence from each application.", "由监督者授权并记录撤回决策，再由观察者从每个应用获取新的停止执行证据。"),
                ),
            ],
        ),
        "links": [
            (("Read the role and authority model", "查看角色和权限模型（英文）"), f"{FRAMEWORK}#authority-and-accountability", f"{FRAMEWORK}#authority-and-accountability"),
            (("Follow the recorded WBS withdrawal", "查看 WBS 撤回实录"), "/wbs/", "/wbs/zh/"),
        ],
    },
    "relationship-impact": {
        "title": ("How relationships carry impact", "关系如何传递影响"),
        "lead": (
            "Follow a changed concept through its declared dependencies. Inspect separately the consequence of an error, the strength of the evidence and any disagreement between assessors.",
            "沿已声明的依赖关系追踪概念变更，分别核查错误后果、证据支持程度以及评估人之间的分歧。",
        ),
        "sections": [
            (
                ("Ask two different questions", "分别提出两个问题"),
                (
                    "Criticality measures how consequential a mistaken dependency could be, from 1 to 5. Confidence measures how strongly an assessor is prepared to support the mapping, from 0 to 1. Missing confidence remains unknown.",
                    "关键程度衡量依赖关系判断错误可能带来的后果，范围为 1 到 5。置信度衡量评估人支持该映射的程度，范围为 0 到 1。缺少置信度时，状态为未知。",
                ),
            ),
            (
                ("Keep disagreement visible", "保留分歧记录"),
                (
                    "In the exercised WBS pilot, Finance supports an edge at criticality 4 and confidence 0.85. PMO challenges the same edge at criticality 5 and confidence 0.30. The report retains both assertions and sources. During unresolved disagreement, the route can show the highest stated criticality and leaves effective confidence unknown.",
                    "在实测 WBS 试点中，财务部门支持同一映射，评定关键程度为 4、置信度为 0.85。项目管理办公室质疑该映射，评定关键程度为 5、置信度为 0.30。报告保留双方的主张和来源。分歧未解决时，路径可以显示已声明的最高关键程度，但有效置信度仍为未知。",
                ),
            ),
            (
                ("Bind resolution to the evidence", "将裁定绑定到证据"),
                (
                    "A reviewer can record why the Finance mapping applies only with the source department attached. A change to an assertion or its cited source can make that resolution stale. A designated critical scope needs current, confirmed assessments before publication or initial policy export.",
                    "审核人可以记录为何财务映射只有在附带来源部门时才适用。主张内容或引用来源发生变化后，原裁定可能失效。指定为关键范围的依赖关系，须在发布或首次导出策略前具有当前有效且经确认的评估。",
                ),
                (
                    "On a fully assessed path, OnToGraPh reports the highest effective criticality and the lowest effective confidence. The path shows which obligations may be affected. Observations from the applications establish what actually happened.",
                    "对于已完成全部评估的路径，OnToGraPh 报告最高的有效关键程度和最低的有效置信度。路径可以揭示可能受影响的义务；应用观察记录用来确认实际发生的情况。",
                ),
            ),
        ],
        "lab": (
            ("Explore three review states", "查看三种审核状态"),
            [
                (
                    ("Assessors disagree", "评估人意见不一致"),
                    ("Evidence remains unresolved", "证据仍存在未决分歧"),
                    ("Keep both grades and their sources. A release in a designated critical scope remains blocked while the edge is unresolved.", "保留两组评分及其来源。在指定的关键范围内，这条关系的分歧未解决前，发布会受阻。"),
                ),
                (
                    ("Reviewer records a current resolution", "审核人记录当前有效的裁定"),
                    ("Use the selected grades", "采用已选主张的评分"),
                    ("The route can use the selected supporting assessment. Keep the competing assertion visible and obtain the assigned reviewer’s authenticated approval on the candidate.", "路径可以采用所选支持主张的评分。保留有分歧的主张，并取得指定审核人在该候选版本上的身份验证审批。"),
                ),
                (
                    ("A cited source changes", "引用来源发生变更"),
                    ("Re-examine the resolution", "重新审查裁定"),
                    ("The saved resolution is bound to the original assertions and evidence. Review the new record and update the adjudication before relying on that edge again.", "已保存裁定绑定原主张和原证据。再次使用该关系前，需审查新记录并更新裁定。"),
                ),
            ],
        ),
        "links": [
            (("Explore a disputed impact in the live tool", "在在线工具中查看存在争议的影响"), "/weights/?scenario=disputed", "/weights/zh/?scenario=disputed"),
            (("Inspect the exact WBS assertions", "查看 WBS 原始主张"), "/wbs/unresolved.json", "/wbs/unresolved.json"),
            (("Read the adjudication protocol", "阅读争议裁定协议（英文）"), f"{PROTOCOL}#several-judgments-about-one-relationship", f"{PROTOCOL}#several-judgments-about-one-relationship"),
        ],
    },
    "formation-to-release": {
        "title": ("Two routes from change to decision", "从变更到决策的两条路径"),
        "lead": (
            "Start from a governance mandate or a detected change. In either case, specify the scope, connect the source to a rule and record what happens when an application uses it.",
            "从治理要求或已发现的变更出发。不论走哪条路径，都要明确范围，把来源关联到规则，并记录应用执行规则时发生的情况。",
        ),
        "sections": [
            (
                ("Start from a governance mandate", "从治理要求出发"),
                (
                    "Use the mandate to specify which decision needs evidence and who owns it. In the hub pilot, PALO calls for decision tracing. OnToGraPh maps the source change ID, URL and authority to dictionary fields and binds them to one control and intake contract.",
                    "通过治理要求明确哪项决策需要证据，以及由谁负责。在联动试点中，PALO 要求追踪决策。OnToGraPh 将来源变更的 ID、URL 和权限映射到词典字段，并与一项控制和接收契约绑定。",
                ),
            ),
            (
                ("Start from a detected change", "从已发现的变更出发"),
                (
                    "Use PolicyWatcher’s source record to identify what changed and when. Draft a rule for the affected decision, retain the evidence reference and confirm the applicable controls. In the pilot, a matching signal opened human review in PALO. The reviewers’ decision remained pending.",
                    "根据 PolicyWatcher 的来源记录确定变更内容和时间。为受影响的决策起草规则，保留证据引用，并确认适用的控制措施。在试点中，匹配的信号触发了 PALO 的人工审核。审核决定仍在等待作出。",
                ),
            ),
            (
                ("Converge on an evidence record", "汇总为同一类证据记录"),
                (
                    "Both routes end with an accountable review and a record that links source, scope, decision and observation. The standalone calibration example applies the same release and observation pattern to its own dictionary and rule.",
                    "两条路径都以有明确责任人的审核和完整记录为目标，记录关联来源、范围、决策和观察。独立运行的校准示例使用自己的词典和规则，沿用同样的发布和观察方式。",
                ),
            ),
        ],
        "lab": (
            ("Choose what you have at the start", "选择你目前已有的内容"),
            [
                (
                    ("A mandate that requires a decision trace", "要求追踪决策的治理指令"),
                    ("Frame the scope and select a test case", "界定范围并选择测试用例"),
                    ("Name the accountable owner and the consumer. Use a case whose observed result can distinguish the proposed rule from the old behaviour.", "确定负责人和使用方。选择实测结果足以区分新规则和旧行为的用例。"),
                ),
                (
                    ("An external source has changed", "外部来源已发生变化"),
                    ("Check the source and prepare a review", "核查来源并准备审核"),
                    ("Keep the change ID, source URL, time and applicability. Create a proposal with the affected control and route it to its human reviewer.", "保留变更 ID、来源 URL、时间和适用范围。建立提案，注明受影响的控制，并提交相应人工审核人。"),
                ),
                (
                    ("A local process already owns its rules", "本地流程已有自己的规则负责人"),
                    ("Try the standalone route", "试用独立运行路径"),
                    ("Record an internal source, the controlled decision and one case that passes and one that holds. Re-run a case after withdrawal to check inactivity.", "记录内部来源、受控决策，以及一个通过和一个暂缓的用例。撤回后重新运行用例，以核验规则已停止执行。"),
                ),
            ],
        ),
        "links": [
            (("Explore the integrated and standalone pilot", "探索联动试点和独立运行试点"), "/pilot/", "/pilot/zh/"),
            (("See how the projects fit together", "查看三个项目的协作方式"), "/#ecosystem", "/zh/#ecosystem"),
            (("Inspect the pilot artifacts", "查看试点工件（英文）"), f"{REPOSITORY}/tree/main/examples/hub_pilot", f"{REPOSITORY}/tree/main/examples/hub_pilot"),
        ],
    },
}
