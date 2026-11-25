# 从 WBS 映射争议到撤回核验

同一个编码 0017 在财务账本中表示过账对象，在项目管理办公室（PMO）也可以表示工作包。两名评估人分别提供了来源、关键程度、置信度与理由。即使两个脚本化角色都投了赞成票，注册表仍阻止发布存在分歧的候选版本。审核人最终要求用部门信息限定财务映射，两份原始主张均保留在版本中。[查看原始模型与裁决后的模型](https://openontograph.org/wbs/zh/)

1. 从试点页面下载含冲突的模型。登录在线 Studio，进入“关系证据”工作区，导入模型并查看映射。[打开在线 Studio](https://openontograph.org/OntoGraph/decisions/?lang=zh-Hans)
2. 检查两个来源并比较评分。选择有支持证据的主张，填写审核人及理由，保存后重新打开草稿。修改一项主张，观察裁决状态。裁决绑定当时的主张及依据，指定审核人还必须对该候选版本完成经身份验证的审批，注册表才允许发布。[发布协议（英文）](https://github.com/sev7enITA/OntoGraph/blob/main/docs/PROTOCOL.md#several-judgments-about-one-relationship)
3. 按顺序查看 Beancount 与 LibreOffice Calc 的实测结果。工作簿确认收到新版本后仍沿用旧规则。撤回时，财务账本已计入 0 欧元，但工作簿仍计入 800 欧元。工作簿一度无法访问，其状态变为“尚未证实”。只有在两个应用均实测为 0 后，才确认这些测试案例中的撤回生效。基线须经另一次审批才得以恢复。[查看实测数据](https://openontograph.org/wbs/zh/)
4. 下载证据包并离线核验。档案包含 15 次应用读取、70 条关联的注册表事件，以及两个原生引擎使用的源文件。两个应用均在本机运行，使用合成数据，授权角色由脚本驱动。[中文复现指南](https://github.com/sev7enITA/OntoGraph/blob/main/examples/wbs_pilot/README.zh-Hans.md)

[English](https://github.com/sev7enITA/OntoGraph/wiki/WBS-Pilot)
