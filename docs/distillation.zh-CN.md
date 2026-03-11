# 蒸馏协议

## 什么是蒸馏？

蒸馏是从对话中提取关键信息并存储到正确位置的过程。Loci 不会保存冗长、嘈杂、难以检索的原始对话记录，而是将对话蒸馏为结构化的知识。

## 工作原理

在对话结束时（或被触发时），AI 会：

1. 回顾对话中的新信息
2. 对每条信息进行分类
3. 路由到正确的文件
4. 在写入前与你确认

## 路由规则

| 信息类型 | 存储位置 | 示例 |
|-----------------|------------|---------|
| 个人事实 | `me/identity.md` | "我刚搬到柏林" |
| 新的价值观/原则 | `me/values.md` | "我意识到质量 > 速度" |
| 经验教训 | `me/learned.md` | "永远不要在周五部署" |
| 决策 | `decisions/YYYY-MM-DD-slug.md` | "选了 React 而不是 Vue" |
| 新任务 | `tasks/active.md` | "需要更新 API 文档" |
| 洞察/模式 | `.claude/memory/MEMORY.md` | "用户偏好暗色主题" |
| 未处理的想法 | `inbox.md` | "也许我应该学 Rust" |

## 蒸馏分级

不是所有信息都同等对待：

### 事实性信息（自动保存并确认）
- 工作变动、居住地迁移、工具偏好
- AI 自动保存，在结尾提一句："已在 identity.md 中将你的位置更新为柏林"

### 主观性信息（保存前先询问）
- 价值观变化、目标转移、战略决策
- AI 会问："你提到在重新思考职业目标，要我更新 plan.md 吗？"

## 前后对比示例

### 蒸馏前（原始对话）
```
User: I've been thinking about my side project. Maybe I should pivot from B2C to B2B.
AI: That makes sense given your enterprise experience...
User: Yeah, and I think the pricing should be $49/mo not $19.
AI: Higher price point filters for serious users...
User: Let's go with that. Also, I realized I need to stop checking Twitter first thing in the morning.
```

### 蒸馏后

**decisions/2026-03-01-pivot-to-b2b.md:**
> Decision: Pivot side project from B2C to B2B. Price: $49/mo. Reasoning: leverages enterprise experience, higher price filters for serious users.

**me/learned.md**（追加）:
> Don't check Twitter first thing in the morning — it fragments focus.

**tasks/active.md**（追加）:
> - [ ] Update landing page messaging for B2B positioning

三个文件被更新。零原始记录保存。所有信息可搜索、有上下文。

## 成长追踪

当身份或价值观发生变化时，Loci 不是简单地覆盖——而是演进：

1. 当前文件（如 `values.md`）更新为最新状态
2. 旧版本附带时间戳追加到 `me/evolution.md`

这就创建了一个个人变更日志——你可以看到自己的思维在数月甚至数年间是如何演变的。

## 触发蒸馏

### Auto 模式（默认）

信号驱动：AI 会评估每一轮对话中是否有可存储的信息。当检测到新任务、决策、认知或个人信息变更时，立即保存并显示一行通知：

```
[Loci] Stored: new task "Update API docs" → active.md
```

不会打断你的对话。说 "undo" 即可撤销。

### Manual 模式

- 说 "update"、"save this"、"记一下" 即可立即保存
- 运行 `/loci-sync` 进行完整蒸馏 + 跨项目同步
- 运行 `/loci-sync --dry-run` 预览会保存什么

### 传统 "update" 触发

说 "update" 可以进行完整的对话回顾，生成一个清单供你挑选。此功能在两种模式下都可用。

详见 [Synapse](synapse.md) 了解完整的持久化和路由系统。
