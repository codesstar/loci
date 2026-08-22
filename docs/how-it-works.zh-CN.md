# Loci 工作原理 — 完整指南

> 一篇读完就全懂。每个章节层层递进，跟你实际使用 Loci 的节奏一致。更完整的当前架构总览另见 [项目总览](project-overview.zh-CN.md)。

## 上手节奏

```
第 1 周: 安装 → 聊天 → AI 记住你了              正常聊就行
第 2 周: 连接其他项目 → 项目拥有自己的记忆        AI 在项目认真起来时主动提示
第 3 周: Dashboard + 配置调优                    可视化概览 + /loci-brain-settings
第 4 周+: 精细控制                               /loci-settings, /loci-sync 参数
```

不用一开始就学完所有东西，系统会随着你的使用逐步展开。

---

## 第一层: Brain（大脑）

你的大脑就是一个文件夹。里面是按模块组织的 Markdown 文件，分为四个核心模块加系统文件：

```
my-brain/
├── CLAUDE.md          ← AI 的操作系统（每次最先读）
├── plan.md            ← 你的人生方向和目标（每次对话加载）
├── inbox.md           ← 快速收集箱（L2，提到碎片/随手记时读取）
│
├── me/                ← 关于你
│   ├── identity.md    ← 基本信息（名字、职业、城市）
│   ├── values.md      ← 你的价值观
│   ├── wellbeing.md   ← 身体、心理、精力、睡眠、自信
│   ├── insights.md    ← 新鲜个人洞察
│   ├── learned.md     ← 可复用经验和方法
│   └── evolution.md   ← 成长时间线（旧版本追加到这里）
│
├── tasks/             ← 任务 + 规划（合在一起）
│   ├── tasks.json     ← 任务数据库 —— 唯一真源（只走守卫写入器）
│   ├── calendar.json  ← 日程 —— 占用时间的块，和任务分开存
│   ├── active.md      ← 从 tasks.json 生成的只读快照（AI 启动快速读）
│   ├── daily/         ← 每天一个 md 文件（当天背景 + 复盘，不是任务源）
│   └── journal/       ← 每日复盘（buffer.md → 当天日记）
│
├── decisions/         ← 每个重要决策一个文件（含背景 + 推理过程）
├── projects/          ← index.md（每个认真项目一行）+ side.md（项目雏形）
├── archive/           ← 过期内容挪到这里，永不删除
├── scripts/           ← 守卫写入器（loci-task.js、loci-project.js、loci-projtodo.js）
│
├── .loci/             ← 系统文件
│   ├── hooks/         ← 跨终端同步钩子
│   ├── dashboard/     ← 可视化面板（node server.js）
│   ├── config.yml     ← Brain 设置（持久化模式、通知）
│   ├── status.yml     ← 当前状态（疲了 / 精力好 / 在路上）
│   └── activity/       ← 操作总账（一月一个文件，审计层 —— "我今天做了啥？"）
│
└── （扩展模块，用到时自动创建）
    ├── finance/       ← 预算、资产、财务追踪
    ├── people/        ← 联系人、会议记录、人际关系
    ├── content/       ← 写作、内容创作、发布
    ├── references/    ← 外部知识库（文章、书籍、引用 — 别人的内容；研究材料放 research/）
    └── notes/         ← 你自己的笔记 — Obsidian/飞书/Notion 链接的索引 + 简短内联笔记
```

### 三层上下文

这是 Loci 最核心的设计——不是所有记忆每次都得加载：

| 层级 | 什么时候加载 | 装什么 | 打个比方 |
|-------|------------|----------|---------------|
| **L1** | 每次对话 | CLAUDE.md, plan.md, tasks/active.md, projects/index.md, status.yml, auto-memory | 工作记忆（规则、索引、当前行动摘要、重要个人上下文） |
| **L2** | 聊到相关话题时 | inbox.md、模块 README、具体的人/任务/计划文件、参考资料、研究证据、笔记 | 情景记忆（一个念头就能想起来） |
| **L3** | 明确要求时才加载 | archive、旧决策、evolution.md、旧日记 | 长期记忆（得翻一翻才能想起来） |

**为什么要分层？** AI 的上下文窗口是有限的。每次都加载所有内容，既浪费 token 又分散注意力。L1 保持精简，只放判断和行动所需的骨架；`inbox.md` 这类碎片池放 L2，提到碎片/随手记/整理想法时再读；L3 无限增长也不影响性能。

> 深入了解: [架构设计](architecture.zh-CN.md)

---

## 第二层: 蒸馏

这是 Loci 跟"聊天记录"的根本区别：**不存原始对话，只存蒸馏后的结论。**

### 路由规则

```
你说了一句话
       ↓
  AI 判断: 这句话里有值得存的东西吗？
       ↓
   没有 → 啥都不干
   有   → 分类 + 路由:
         ├── 个人事实（"我搬到柏林了"）             → me/identity.md
         ├── 新鲜洞察（"人脉是价值之后的体现"）       → me/insights.md
         ├── 可复用经验（"周五千万别部署"）           → me/learned.md
         ├── 身心状态（"睡好才有自信和产出"）         → me/wellbeing.md
         ├── 你个人的决策（"以后一次只做一个项目"）    → decisions/2026-03-10-xxx.md + L1 上浮检查
         ├── 项目决策（"数据库用 PostgreSQL"）        → 那个项目 repo 的 .loci/decisions/ + 项目记忆检查
         ├── 新任务（"API 文档得更新一下"）           → 守卫写入器 → tasks/tasks.json
         ├── 日程（"下午 3 点开会"）                 → 守卫写入器 → tasks/calendar.json
         ├── 外部内容（文章、推文、引用）              → references/
         ├── 研究证据（原始文档、市场扫描）            → references/research/
         └── 模糊想法（"要不要学学 Rust"）           → inbox.md
```

决策记录只放取舍和理由。研究材料是证据，放 `references/research/`，需要时由决策文件引用。

### 蒸馏分级

- **事实信息**（城市、职业、工具偏好）→ 直接存，一行提示告诉你
- **主观/战略信息**（价值观变了、目标要调）→ 先问你确认再存

### 成长追踪

身份、价值观、身心状态或稳定行为发生变化时，Loci 不是覆盖旧的——而是做演进：
1. 当前文件（比如 values.md 或 wellbeing.md）更新成最新版
2. 旧/新/原因追加到 `evolution.md`

效果：当前文件始终精简（L1 快速加载），evolution.md 是你的个人成长时间线（L3，想回顾的时候再翻）。

### 对比一下

**原始对话：**
> "我一直在想副业的事。也许应该从 B2C 转 B2B。定价也想从 $19 改成 $49/月。还有，我发现早上不能一起床就刷推特。"

**Loci 存下来的：**
- `decisions/2026-03-10-pivot-to-b2b.md`：转 B2B，定价 $49/月，利用企业服务经验
- `me/insights.md`（追加）：发现早上的注意力会影响一天的主体感
- `me/learned.md`（追加）：早上别先刷推特——会打碎专注力
- `tasks/tasks.json`（走守卫写入器）：更新落地页为 B2B 定位

三个地方更新，零原始对话保存。所有信息都能搜到，而且都在对的地方。

> 深入了解: [蒸馏机制](distillation.zh-CN.md)

---

## 第三层: 持久化（Synapse）

回答一个关键问题："什么时候存？"

### Auto 模式（默认，新用户自动开启）

```
你跟 AI 聊天
    ↓
每一轮，AI 内部判断: 这轮有值得存的东西吗？
    ↓
  没有 → 安安静静，继续聊
  有   → 立刻存 → 一句自然的确认:
          记住了：新任务 "买电源线"
    ↓
你看到通知，不用回复，继续聊
存错了 → 说"撤销"
```

**核心逻辑：信号驱动，不是定时存。** 闲扯十轮啥都不存，做了一个重要决策立刻存。

### Manual 模式（给想完全掌控的老手）

啥都不自动存。只在你说"保存这个"或者跑 `/loci-sync` 的时候才动。

### `/loci-sync` 命令

两种模式下都能用。手动触发一轮完整的"蒸馏 + 同步"：

```
/loci-sync              → 回顾对话 + 保存文件 + 必要时更新项目索引
/loci-sync --local      → 只存本地，不更新大脑项目索引
/loci-sync --dry-run    → 预览会存什么，但不实际执行
```

> 深入了解: [Synapse](synapse.zh-CN.md)

---

## 第四层: 多项目编排（Synapse 路由）

这是第 2 周的功能——当你同时在搞好几个项目的时候。

### 连接项目

用户不需要记命令。AI 发现一个项目真的做起来了，就在对话结尾轻问一次：

> "这个项目好像做起来了，要不要我帮你在这里留个记忆？"

用户点头后：
1. 在项目 repo 里创建 `.loci/memory.md`（短的重启上下文）
2. 创建 `.loci/profile.md`（稳定项目详情）
3. 创建 `.loci/progress/` 和 `.loci/decisions/`
4. 往项目的 `CLAUDE.md` 和 `AGENTS.md` 注入 Loci project block
5. 把 `.loci/` 加到项目 `.gitignore`
6. 只在大脑的 `projects/index.md` 里加一行索引

内部实现上，AI 应优先用 `scripts/loci-project.js connect` 来做这个多文件写入。

Loci 汇聚记忆，但不占有记忆。项目记忆归项目 repo 自己。

### 信息怎么流

```
           Brain (总部)
          ╱    │    ╲
         ╱     │     ╲
    项目 A    项目 B    项目 C
    .loci/     .loci/     .loci/

大脑索引 (projects/index.md): 每个认真项目一行
  "CloudMetrics — alerting SaaS. repo: ~/work/cloudmetrics. memory: .../.loci/memory.md"

项目决策 (.loci/decisions/): 项目自己的持久决策
  "选择 PostgreSQL 而不是 SQLite，因为..."

项目重启上下文 (.loci/memory.md): 下次从哪里接着做
  当前状态、下一步、当前仍影响行动的决策和风险

项目详情/进展:
  稳定详情放 .loci/profile.md
  项目进展放 .loci/progress/YYYY-MM.md
```

### 什么会进入大脑

大多数项目记忆留在项目 repo。大脑只保留足够的索引，让 AI 知道项目存在以及去哪读。

**可以更新大脑索引**：
- `[insight]` — 跨场景也有价值的经验
- `[milestone]` — 发布、阶段变化、重要进展
- 被提升到大脑层面的关键决策链接

**只留在项目本地**：
- `[decision]` — 普通项目决策放 `.loci/decisions/`
- `[local]` — 项目专属的上下文
- `[debug]` — Bug 修复、临时方案
- `[wip]` — 还在搞的东西

### 项目配置（/loci-settings）

每个已连接项目都能通过 `/loci-settings` 配置什么内容会进入大脑索引。

> 深入了解: [Synapse](synapse.zh-CN.md) —— 信号路由与项目自持记忆

---

## 第五层: 配置

### 继承链

```
Loci 内置默认值 → Brain 设置 → 子项目设置 → 用户覆盖
```

隐私是硬边界——子项目永远不能把隐私设置往下调。

### 两个配置命令

| 命令 | 管什么 | 能配什么 |
|---------|-------|----------|
| `/loci-brain-settings` | Brain | 持久化模式（auto/manual）、通知 |
| `/loci-settings` | 子项目 | 这个项目往 Brain 推哪些标签 |

### Brain 设置（v1.0）

```yaml
persistence:
  mode: auto              # auto（信号驱动）| manual
  notify: true            # 每次保存后给个提示
```

> 高级设置（隐私边界、蒸馏级别、路由模式、保留策略）计划 v2.0 做。详见 [Roadmap](roadmap.md)。

---

## 第六层: 辅助机制

### 日计划 + 日记

- `tasks/daily/YYYY-MM-DD.md` — 当天背景 + 复盘（只当上下文用；任务本体在 `tasks/tasks.json`）
- `tasks/journal/buffer.md` — 聊天过程中随时往里追加要点
- 说"总结" → 读 buffer + 回顾对话 → 生成当天日记 → 清空 buffer

### 活动日志

- AI 把每次对大脑的改动记到 `.loci/activity/<YYYY-MM>.md`（人话操作总账，一月一个文件 —— 问"我今天做了啥？"）
- 活动日志是审计层：每次 brain-facing 写入后追加，但只有用户问"今天 / 这周 / 最近做了啥"时才读取
- 它提供可追踪时间线，但不会把历史噪音塞进每次对话

### Dashboard

- `.loci/dashboard/` — Node 驱动的本地可视化控制台，展示 overview、tasks、schedule、journal、memory、people、projects、notes、fragments、decisions
- `node .loci/dashboard/server.js` 启动，默认地址 `http://127.0.0.1:8765/`
- `/` 就是 dashboard，实时读取你大脑里的文件——全新大脑显示干净的空态
- server 同时提供本地 API，给真实任务、日程、日志、笔记、收藏、项目 todo 流程使用

### 跨终端同步

- `node .loci/hooks/check-updates.js` — 检测其他终端的文件变更
- 每次对话开始时自动跑一遍
- `/sync` 手动刷新

> 深入了解: [上下文感知](context-awareness.md), [Dashboard](dashboard.zh-CN.md)

### 已知限制（v1.0）

- **并发编辑**：多个终端同时写同一个 Brain 文件可能会冲突。Git 追踪所有变更所以数据不会真丢，但你可能得手动合并一下。
- **跨终端检测**：钩子（`check-updates.js`）能发现其他终端改了文件，但拦不住两次写入撞车。
- **最佳实践**：尽量别在多个终端同时改同一个 Brain 文件。实际上这种情况很少碰到——大部分对话操作的是不同文件——但心里有个数就好。

后续版本会加文件级锁定或者无冲突合并策略。

---

## 一句话总结

**Loci = 三层记忆（L1/L2/L3）+ 信号驱动蒸馏 + 项目自持记忆 + 纯 Markdown，零依赖。**

第一天用户只会觉得"我的 AI 记住我了"。底层的复杂度随着使用深入逐步展开——永远不会一股脑全丢给你。

---

## 命令速查

| 命令 | 什么时候用 | 干什么 |
|---------|-----------------|--------------|
| `/loci-sync` | 随时 | 手动蒸馏 + 同步（参数: `--local`, `--dry-run`） |
| `/loci-settings` | 第 2 周+ | 配置项目往 Brain 同步什么 |
| `/loci-brain-settings` | 第 3 周+ | 配置持久化模式和通知 |
| `/loci-consolidate` | 随时 | 手动记忆整合（默认 24 小时，或 `/loci-consolidate 7` 按周整合） |
| `/loci-scan` | 偶尔 | 重新扫描项目、更新档案 |

## 延伸阅读

- [架构设计](architecture.zh-CN.md) — 三层记忆系统详解
- [Synapse](synapse.zh-CN.md) — 持久化模式、路由、项目自持记忆
- [蒸馏机制](distillation.zh-CN.md) — 对话怎么变成结构化知识
- [Dashboard](dashboard.zh-CN.md) — 本地可视化控制台
- [隐私](privacy.zh-CN.md) — 数据保护与 AI 上下文控制
