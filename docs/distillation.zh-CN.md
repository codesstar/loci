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
| 稳定价值观/原则 | `me/values.md` | "质量比速度重要" |
| 身心状态原则 | `me/wellbeing.md` | "睡好是自信和产出的地基" |
| 新鲜个人洞察 | `me/insights.md` | "人脉是自身价值之后的体现" |
| 踩坑经验 / 可复用方法 | `me/learned.md` | "千万别周五部署" |
| 个人演变 | `me/evolution.md` | "旧：先有受众 → 新：产品先行" |
| 决策（你个人的、跨项目仍有意义的） | `decisions/YYYY-MM-DD-slug.md` | "以后一次只做一个项目" |
| 项目决策 | 那个项目 repo 的 `.loci/decisions/` | "选了 React 没选 Vue" |
| 项目重启上下文 | 那个项目 repo 的 `.loci/memory.md` | "MVP 发了，下一步做计费" |
| 项目进展 | 那个项目 repo 的 `.loci/progress/YYYY-MM.md` | "今天接好了计费 API" |
| 项目稳定详情 | 那个项目 repo 的 `.loci/profile.md` | "关键文件、里程碑、相关人" |
| 新任务 | 守卫写入器 → `tasks/tasks.json` | "得更新 API 文档" |
| 日程（占用时间的事） | 守卫写入器 → `tasks/calendar.json` | "下午 3 点开会" |
| 外部材料 | `references/YYYY-MM-DD-slug.md` | "收藏这篇定价文章" |
| 还没想清楚的 | `inbox.md` | "要不要学 Rust？" |

有两条路由规则值得单独说：

- **任务从来不手写。** `tasks/tasks.json` 是任务的唯一真源，一律走守卫写入器（`node scripts/loci-task.js add ...` 或 Dashboard API）。`tasks/active.md` 只是生成出来的只读视图。任务和日程是分开的——带时间的任务留在任务池，不会镜像到日历上。
- **项目记忆留在项目里。** 认真项目的决策和状态蒸馏进那个 repo 自己的 `.loci/`——大脑只在 `projects/index.md` 留一行索引。Loci 汇聚记忆，不占有记忆。
- **个人洞察先写 `me/insights.md`。** 不要把当天刚想通的东西直接升级成价值观。先保留背景、洞察、为什么重要、暂定影响和状态，稳定之后再升到 `values.md` 或 `learned.md`。

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

**me/insights.md**（追加）:
> 我发现早上的注意力会影响一天的主体感；一旦被刷碎，整天都不像自己的。

**tasks/tasks.json**（走守卫写入器）:
> `node scripts/loci-task.js add --title "Update landing page messaging for B2B positioning"`

三个地方更新了。原始对话一个字不留。所有信息可搜索、有上下文。

## 成长追踪

你的身份、价值观、身心状态和稳定行为都会变。Loci 不会直接覆盖旧的——它做演进：

1. 当前文件（比如 `values.md`）更新成最新版本
2. 旧版本带上时间戳，追加到 `me/evolution.md`

这就是你的个人变更日志——过几个月回头看，能清楚地看到自己思路是怎么一步步变的。

## 触发蒸馏

### Auto 模式（默认）

信号驱动：AI 每轮都在看有没有值得存的东西。检测到新任务、决策、认知、个人信息变化，马上存，给你一句自然的确认：

```
记住了：新任务 "更新 API 文档"
```

不打断你，也不暴露文件路径和内部术语。说 "undo" / "撤销" 就撤。

### Manual 模式

- 说 "update"、"save this"、"记一下" 就存
- 跑 `/loci-sync` 做完整蒸馏 + 跨项目同步
- 跑 `/loci-sync --dry-run` 先看看会存什么

### "update" 大扫除

说 "update" 会触发一次完整的对话回顾，AI 列个清单出来让你挑。两种模式下都能用。

完整的持久化和路由机制见 [Synapse](synapse.md)。
