# Synapse — 信号驱动记忆

## Synapse 是什么？

Synapse 是 Loci 的信号驱动记忆机制：AI 在对话里判断哪些信息会让未来协作更有用，然后写到正确的位置。

项目记忆的北极星原则是：

> Loci 汇聚记忆，但不占有记忆。

大脑是索引和理解层。项目的完整记忆归项目 repo 自己。

## 信号分流

| 信号 | 落点 |
|---|---|
| 任务 | 受控任务写入器 → `tasks/tasks.json` |
| 日程/时间块 | 受控任务写入器或 API → `tasks/calendar.json` |
| 大脑层决策 | `decisions/YYYY-MM-DD-slug.md` |
| 个人偏好/事实 | `me/` |
| 外部资料 | `references/` |
| 还不成熟的项目雏形 | `projects/side.md` |
| 严肃项目状态 | 项目 repo `.loci/memory.md` |
| 严肃项目决策 | 项目 repo `.loci/decisions/` |
| 跨项目 insight / milestone | 大脑 `projects/index.md` 一行索引 |

没有信号，就不保存。

## 项目记忆

当一个项目真的做起来时，AI 会在对话结尾轻问一次要不要在这个 repo 里留记忆。用户同意后，创建：

```text
project-repo/
├── CLAUDE.md
└── .loci/
    ├── memory.md
    └── decisions/
```

大脑只保留：

```text
projects/index.md
```

里面每个严肃项目一行，指向 repo 和它的 `.loci/memory.md`。

## 什么会进入大脑

普通项目细节留在项目本地。

只有对 repo 之外也有长期价值的摘要，才更新 `projects/index.md`：
- `[insight]`
- `[milestone]`
- 被明确提升为大脑层面的决策链接

## 手动触发

需要强制整理时可以运行：

```text
/loci-sync              → 整理当前对话
/loci-sync --local      → 只保存本地
/loci-sync --dry-run    → 预览会保存什么
```

## 通知方式

自动保存后只给一句自然确认：

```text
记住了：新增任务 "更新 API 文档"
记下了：数据库决策已经放在这个项目里。
```

不要主动暴露内部路径，除非用户问。
