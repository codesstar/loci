# 蒸馏协议

## 蒸馏是什么？

你跟 AI 聊了半小时，聊出了三个决策、两条经验、一个新任务。蒸馏就是把这些关键信息从对话里捞出来，存到该去的地方。

Loci 不存原始聊天记录——那东西又长又杂，回头根本找不到。它只存蒸馏后的结构化知识。

## 怎么运作

对话结束时（或者你手动触发），AI 会：

1. 回顾对话里冒出的新信息
2. 给每条信息分个类
3. 路由到对应的文件
4. 写之前跟你确认

## 路由规则

| 信息类型 | 存到哪 | 举个例子 |
|-----------------|------------|---------|
| 个人事实 | `me/identity.md` | "我刚搬到柏林" |
| 价值观/原则 | `me/values.md` | "我悟了，质量比速度重要" |
| 踩坑经验 | `me/learned.md` | "千万别周五部署" |
| 决策 | `decisions/YYYY-MM-DD-slug.md` | "选了 React 没选 Vue" |
| 新任务 | `tasks/active.md` | "得更新 API 文档" |
| 洞察/规律 | `.claude/memory/MEMORY.md` | "用户偏好暗色主题" |
| 还没想清楚的 | `inbox.md` | "要不要学 Rust？" |

## 蒸馏分级

不是所有信息都一样对待：

### 事实性信息（自动存，事后通知）
- 换工作了、搬家了、换工具了
- AI 直接存，结尾说一句："已把你的位置更新到柏林"

### 主观性信息（先问再存）
- 价值观变了、目标调了、做了战略决策
- AI 会问你："你刚才说在重新想职业方向，要不要更新 plan.md？"

## 看个例子就明白了

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

三个文件更新了。原始对话一个字不留。所有信息可搜索、有上下文。

## 成长追踪

你的认知会变、价值观会变。Loci 不会直接覆盖旧的——它做演进：

1. 当前文件（比如 `values.md`）更新成最新版本
2. 旧版本带上时间戳，追加到 `me/evolution.md`

这就是你的个人变更日志——过几个月回头看，能清楚地看到自己思路是怎么一步步变的。

## 触发蒸馏

### Auto 模式（默认）

信号驱动：AI 每轮都在看有没有值得存的东西。检测到新任务、决策、认知、个人信息变化，马上存，给你一行通知：

```
[Loci] Stored: new task "Update API docs" → active.md
```

不打断你。说 "undo" 就撤。

### Manual 模式

- 说 "update"、"save this"、"记一下" 就存
- 跑 `/loci-sync` 做完整蒸馏 + 跨项目同步
- 跑 `/loci-sync --dry-run` 先看看会存什么

### "update" 大扫除

说 "update" 会触发一次完整的对话回顾，AI 列个清单出来让你挑。两种模式下都能用。

完整的持久化和路由机制见 [Synapse](synapse.md)。
