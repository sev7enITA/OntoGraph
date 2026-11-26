# 选择案例并在工作台打开模型

从需要作出的决策开始。每个案例都提供相关主题、互动工具、可下载模型和一项可在语义工作台中完成的任务。[开始引导流程](https://openontograph.org/zh/journey/) · [English](https://openontograph.org/journey/)

## 选择案例

| 案例 | 先做什么 | 工作台模型 |
| --- | --- | --- |
| **个人图书馆** | 同一本书有两册，其中一册已借出。判断另一册是否可以出借。了解业务语义和模型的基本元素。[个人图书馆流程](https://openontograph.org/zh/journey/personal-library/) | [个人图书馆 JSON](https://openontograph.org/guide/personal-library.json) |
| **跨部门 WBS** | 追踪编码 `0017` 在项目管理办公室（PMO）和财务部门中的含义。检查存在争议的映射评估，并比较发布和撤回时两个应用的实测结果。[跨部门 WBS 流程](https://openontograph.org/zh/journey/department-wbs/) | [待裁决的 WBS JSON](https://openontograph.org/wbs/unresolved.json) · [部门词典 JSON](https://openontograph.org/guide/department-wbs.json) |
| **Copilot 术语表** | 比较各部门对 WBS 的解释。针对含义不明确的问题拟定澄清问句，并指出回答应引用哪些来源。[Copilot 术语表流程](https://openontograph.org/zh/journey/copilot-glossary/) | [部门词典 JSON](https://openontograph.org/guide/department-wbs.json) |
| **政策变更** | 跟踪来源变更如何从 PolicyWatcher 进入 OnToGraPh 的特定范围决策，再交由 PALO 人工审核。明确由谁核验来源以及应用应报告什么。[政策变更流程](https://openontograph.org/zh/journey/policy-change/) | [政策变更 JSON](https://openontograph.org/journey/models/policy-change.json) |

Copilot 路径提供一份可选的[培训术语表 CSV](https://openontograph.org/guide/wbs-glossary.csv)，可用于 SharePoint 测试列表。在工作台中导入部门词典 JSON，再在租户中使用 CSV 开展单独的 Copilot 知识源练习。政策变更模型是合成示例，用于练习框架之间的交接。[实用指南](https://openontograph.org/guide/zh-Hans.html)

## 按顺序完成案例

1. **选择决策。** 打开一个案例并阅读练习任务。
2. **准备与实践。** 阅读推荐主题，再使用该案例的工具。主题集合涵盖理论、实践、试点协作和项目运营。[浏览全部 19 个主题](https://openontograph.org/zh/explore/)
3. **获取模型。** 在模型步骤下载该案例的 JSON，然后按以下步骤在在线或本地语义工作台打开文件。

## 导入并保存草稿

- **在线工作台。** 打开案例模型步骤中的工作台链接，如有提示请登录。工作台会直接打开该场景。有编辑权限的用户首次进入时，入门模型会保存为私有草稿。再次进入时，会打开最近保存的草稿。仅有查看权限的用户可只读查看模型。编辑后，如需保留更改，请选择**保存草稿**。
- **本地工作台。** 在代码仓库根目录运行 `python3 -m ontograph studio`，进入语义工作台（**Semantic Studio**），选择导入（**Import**）。也可运行 `python3 -m ontograph studio --model /path/to/model.json`，在启动时直接载入已下载的文件。检查对象与关系，修改后选择验证（**Validate**）和保存版本（**Save version**）。[本地工作台](http://127.0.0.1:8765/governance) · [工作台文档（英文）](https://github.com/sev7enITA/OntoGraph/wiki/Visual-Studio)

[简体中文 Wiki](https://github.com/sev7enITA/OntoGraph/wiki/Guided-Journey-zh-Hans) · [English Wiki](https://github.com/sev7enITA/OntoGraph/wiki/Guided-Journey)
