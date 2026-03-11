# Synapse — 跨项目信息流

## 什么是 Synapse?

Synapse 是信息在你的 Loci brain 和连接的子项目之间流动的方式——就像神经元之间的突触，选择性地传递重要信息。

## 信号驱动的持久化

Loci 不会按固定时间表保存。它会监听每一轮对话中的**信号**——值得存储的有意义信息：

| 信号 | 示例 | 存储位置 |
|--------|---------|-------------|
| 新任务 | "我需要更新 API 文档" | `tasks/active.md` |
| 决策 | "就用 PostgreSQL 吧" | `decisions/` |
| 认知/经验 | "永远不要在周五部署" | `me/learned.md` |
| 个人信息变更 | "我刚搬到柏林" | `me/identity.md` |
| 目标更新 | "发布推迟到四月" | `plan.md` |

**没有信号 = 不保存。** 五轮闲聊不会产生任何写入。一轮包含重大决策的对话则会立即保存。

### 信号检测清单

AI 会检查每一轮对话是否匹配以下模式：

- **任务信号**: 用户提到要做的事（"need to", "should", "要做", "记得"）
- **决策信号**: 用户做出选择（"decided", "going with", "chose", "定了", "选"）
- **认知信号**: 用户表达某种领悟（"learned", "realized", "turns out", "原来", "发现"）
- **身份信号**: 用户陈述个人信息（"I am", "I moved to", "my job is", "我是", "我住"）
- **目标信号**: 用户更新目标（"pushing to", "new target", "目标改成"）
- **引用信号**: 用户提到要保存的外部内容（"save this article", "记一下这个链接"）

如果都不匹配，就不保存。如果匹配多个，一次操作保存所有类别。

### 通知格式

每次自动保存后，你会看到一行通知：

```
Got it — added task "Update API docs"
Noted — synced decision "Use PostgreSQL" to project-alpha
```

通知使用自然语言，不用系统术语。你的对话流程不会被打断。

### 撤销

说 "undo" 或 "撤销" 即可回退上一次自动保存。AI 会还原文件更改并确认。

### 手动触发

随时运行 `/loci-sync` 进行完整的手动同步：

```
/loci-sync              → 蒸馏 + 同步（默认）
/loci-sync --local      → 仅蒸馏，不同步到子项目
/loci-sync --dry-run    → 预览会保存什么，不实际执行
```

## 两种模式

通过 `/loci-brain-settings` 配置：

| 模式 | 行为 | 适合 |
|------|----------|----------|
| **Auto**（默认） | 信号驱动保存 + 一行通知 | 大多数用户 |
| **Manual** | 仅在 `/loci-sync` 或明确请求时保存 | 想要完全控制的高级用户 |

## 基于 Tag 的路由

当信息保存到 brain 中时，Synapse 使用 tag 来决定哪些子项目应该知道：

1. 每条信息会被自动打上 tag：`urgent`, `decision`, `fyi`, `log`
2. 每个子项目在 `.loci/config.json` 中声明 `interest_tags`
3. Synapse 将 tag 与兴趣匹配——只有相关的内容才会被路由
4. 没有匹配 tag 的项目不会收到任何信息（零噪音）

例如：一个标记为 `[decision, backend]` 的决策会路由到 `interest_tags` 包含 `decision` 或 `backend` 的项目，但会跳过一个纯前端项目。

敏感文件（医疗、财务、凭证）默认不会同步到子项目。

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

项目专属的本地持久化层，用于存储与该项目相关的知识。AI 会把蒸馏后的事实、决策和经验追加到这里。与 brain 级别的记忆不同，这些内容留在项目内部，在该项目中工作时作为 L1 上下文加载。

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

子项目与 brain 之间的双向通信文件：

- **`.loci/to-hq.md`**（项目 -> brain）：里程碑、阻塞项、需要决策的问题
- **`.loci/from-hq.md`**（brain -> 项目）：战略决策、优先级变更、跨项目信息

这些文件位于子项目的 `.loci/` 目录中。从 brain 的角度来看，它们通过符号链接访问：`.loci/links/<project-name>/.loci/to-hq.md`。Brain 会在每次会话开始时扫描所有连接的项目。
