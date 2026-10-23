# Loci 共享记忆
大脑：`brain`。数据路径相对大脑，项目路径由 projects/index.md 定位。
启动只读 me/preferences.md 和 .loci/config.yml 一次，偏好立即生效。persistence.mode 默认 auto，读失败暂停自动保存；不预读全部任务/笔记/历史。缓存已读内容，当前/最新问题刷新最小来源。
每次请求后检查：auto 保存明确任务、日程、稳定事实/偏好、已决定事项、希望保留的材料；manual 仅按明确保存/更新请求写入。无信号不保存；敏感、含糊、临时情绪、重大个人策略先问。提炼不存原始聊天，写前查重，不把讨论当结论。
## 常驻路由索引
| 场景 | 数据入口 | 执行前的指南 |
|---|---|---|
| 任务或日程 | tasks/tasks.json、tasks/calendar.json | rules/tasks.md |
| 偏好或个人资料 | me/preferences.md、me/ | rules/personal.md |
| 目标、个人决策 | plan.md、decisions/ | rules/personal.md、rules/startup.md |
| 项目上下文或决定 | projects/index.md → 对应仓库 .loci/ | rules/projects.md |
| 人物、关系、地点 | people/、places/ | rules/people.md |
| 笔记、碎片、材料 | notes/index.md、references/ | rules/notes.md |
遇到对应场景先读该指南，只加载需要的一份；已读未变则复用。参数和格式在指南及工具帮助里。
结构化数据通过对应写入工具维护；普通 Markdown 保留原内容，标注时间来源。成功再确认；写后活动记录一次，工具已记录不重复。无法读写如实说明。撤销尽量恢复上次修改并保留其他变更。
