# Synapse — 跨项目信息流

## Synapse 是什么？

你有一个 brain，下面挂了好几个子项目。Synapse 就是它们之间的信息管道——像神经突触一样，只把重要的东西传过去，其他的不管。

## 信号驱动，不定时保存

Loci 不搞定时存档那一套。它盯着你每轮对话里的**信号**——也就是真正值得记下来的东西：

| 信号 | 举个例子 | 存到哪 |
|--------|---------|-------------|
| 新任务 | "我得更新一下 API 文档" | `tasks/active.md` |
| 做了决策 | "就用 PostgreSQL 吧" | `decisions/` |
| 踩了坑 | "千万别周五部署" | `me/learned.md` |
| 个人信息变了 | "我刚搬到柏林" | `me/identity.md` |
| 目标调整 | "发布推迟到四月" | `plan.md` |

**没信号就不存。** 你扯五轮闲天，一个字不写。但一轮对话里定了个大方向，马上就存。

### 信号怎么检测

AI 每轮对话都会过一遍这些模式：

- **任务信号**：你说到要做什么事（"need to"、"should"、"要做"、"记得"）
- **决策信号**：你拍了板（"decided"、"going with"、"定了"、"选"）
- **认知信号**：你悟了（"learned"、"realized"、"原来"、"发现"）
- **身份信号**：你说了自己的事（"I am"、"I moved to"、"我是"、"我住"）
- **目标信号**：你改了目标（"pushing to"、"new target"、"目标改成"）
- **引用信号**：你想存点外部内容（"save this article"、"记一下这个链接"）

一个都没中？不存。中了好几个？一次全存。

### 通知长什么样

每次自动存了东西，你会看到一行提示：

```
Got it — added task "Update API docs"
Noted — synced decision "Use PostgreSQL" to project-alpha
```

说人话，不说系统术语。不打断你聊天。

### 存错了？撤

说 "undo" 或者 "撤销" 就行。AI 把文件改回去，跟你确认一下。

### 手动触发

随时可以跑 `/loci-sync` 做一次完整同步：

```
/loci-sync              → 蒸馏 + 同步（默认）
/loci-sync --local      → 只蒸馏，不往子项目同步
/loci-sync --dry-run    → 看看会存什么，不真的写
```

## 两种模式

在 `/loci-brain-settings` 里选：

| 模式 | 怎么运作 | 适合谁 |
|------|----------|----------|
| **Auto**（默认） | 检测到信号自动存 + 一行通知 | 大多数人 |
| **Manual** | 只在 `/loci-sync` 或你明确说的时候存 | 控制欲强的人 |

## 用 Tag 做路由

信息存进 brain 之后，Synapse 靠 tag 决定哪些子项目需要知道：

1. 每条信息自动打 tag：`urgent`、`decision`、`fyi`、`log`
2. 每个子项目在 `.loci/config.json` 里声明自己关心的 `interest_tags`
3. Synapse 做匹配——只有相关的才发过去
4. tag 对不上的项目啥也收不到，零噪音

举个例子：一条标了 `[decision, backend]` 的决策，会发给 `interest_tags` 里有 `decision` 或 `backend` 的项目，纯前端的项目看都看不到。

敏感文件（医疗、财务、密钥之类的）默认不往子项目同步。

## 文件格式

### Brain 端：`.loci/config.yml`（纳入 git 追踪）

```yaml
version: 1
persistence:
  mode: auto    # auto | manual
  notify: true  # 每次保存后显示一行通知
```

### 子项目端：`.loci/config.json`

```json
{
  "enabled": true,
  "projectType": "code",
  "sync": {
    "decisions": true,
    "milestones": true,
    "lessons": true,
    "codeDetails": false,
    "architecture": true,
    "blockers": true
  }
}
```

### 子项目端：`.loci/memory.md`

项目自己的本地记忆。AI 会把蒸馏出来的事实、决策、经验追加到这里。跟 brain 级别的记忆不一样，这些内容只留在项目内部，在这个项目里干活时作为 L1 上下文加载。

```markdown
# Project Memory

## Facts
- Using PostgreSQL with Prisma ORM
- Deployed on Railway

## Decisions
- 2026-03-10: Switched from REST to tRPC for type safety

## Lessons
- Connection pooling required for serverless deployment
```

### 子项目通信：`.loci/to-hq.md` 和 `.loci/from-hq.md`

子项目和 brain 之间的双向通信文件：

- **`.loci/to-hq.md`**（项目 -> brain）：里程碑、卡住了、需要拍板的事
- **`.loci/from-hq.md`**（brain -> 项目）：战略决策、优先级变了、跨项目的消息

这些文件放在子项目的 `.loci/` 目录里。Brain 那边通过符号链接访问：`.loci/links/<project-name>/.loci/to-hq.md`。每次开新会话，brain 都会扫一遍所有连接的项目。
