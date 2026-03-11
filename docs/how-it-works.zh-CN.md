# Loci 工作原理 — 完整指南

> 一篇读完就全懂。每个章节层层递进，跟你实际使用 Loci 的节奏一致。

## 上手节奏

```
第 1 周: 安装 → 聊天 → AI 记住你了              正常聊就行
第 2 周: 连接其他项目 → 跨项目记忆               一条命令: /loci-link
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
├── inbox.md           ← 快速收集箱（每次对话加载）
│
├── me/                ← 关于你
│   ├── identity.md    ← 基本信息（名字、职业、城市）
│   ├── values.md      ← 你的价值观
│   ├── learned.md     ← 踩过的坑、总结的经验
│   ├── goals.md       ← 详细的目标拆解
│   └── evolution.md   ← 成长时间线（旧版本追加到这里）
│
├── tasks/             ← 任务 + 规划（合在一起）
│   ├── active.md      ← 当前任务（P0/P1/P2/P3 优先级）
│   ├── someday.md     ← 以后再说
│   ├── daily/         ← 每天一个 md 文件（安排 + 完成情况）
│   └── journal/       ← 每日复盘（buffer.md → 当天日记）
│
├── decisions/         ← 每个重要决策一个文件（含背景 + 推理过程）
├── archive/           ← 过期内容挪到这里，永不删除
│
├── .loci/             ← 系统文件
│   ├── hooks/         ← 跨终端同步钩子
│   ├── links/         ← 连接的外部项目
│   ├── dashboard/     ← 可视化面板
│   ├── config.yml     ← Brain 设置（持久化模式、通知）
│   ├── status.yml     ← 当前状态（疲了 / 精力好 / 在路上）
│   └── activity-log.md ← 最近 14 天的活动时间线
│
└── （扩展模块，用到时自动创建）
    ├── finance/       ← 预算、资产、财务追踪
    ├── people/        ← 联系人、会议记录、人际关系
    ├── content/       ← 写作、内容创作、发布
    └── references/    ← 外部知识库（文章、书籍、引用）
```

### 三层上下文

这是 Loci 最核心的设计——不是所有记忆每次都得加载：

| 层级 | 什么时候加载 | 装什么 | 打个比方 |
|-------|------------|----------|---------------|
| **L1** | 每次对话 | CLAUDE.md, plan.md, inbox.md, .loci/activity-log.md, auto-memory | 工作记忆（你脑子里正在转的东西） |
| **L2** | 聊到相关话题时 | 模块 README、具体的人/任务/计划文件、参考资料 | 短期记忆（一个念头就能想起来） |
| **L3** | 明确要求时才加载 | archive、旧决策、evolution.md、旧日记 | 长期记忆（得翻一翻才能想起来） |

**为什么要分层？** AI 的上下文窗口是有限的。每次都加载所有内容，既浪费 token 又分散注意力。L1 保持精简（几百行），L2 按需加载，L3 无限增长也不影响性能。

> 深入了解: [架构设计](architecture.md)

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
         ├── 新认知（"周五千万别部署"）               → me/learned.md
         ├── 决策（"数据库用 PostgreSQL"）           → decisions/2026-03-10-xxx.md
         ├── 新任务（"API 文档得更新一下"）           → tasks/active.md
         ├── 外部内容（文章、推文、引用）              → references/inbox.md
         └── 模糊想法（"要不要学学 Rust"）           → inbox.md
```

### 蒸馏分级

- **事实信息**（城市、职业、工具偏好）→ 直接存，一行提示告诉你
- **主观/战略信息**（价值观变了、目标要调）→ 先问你确认再存

### 成长追踪

价值观发生变化时，Loci 不是覆盖旧的——而是做演进：
1. 当前文件（比如 values.md）更新成最新版
2. 旧版本追加到 `evolution.md`

效果：当前文件始终精简（L1 快速加载），evolution.md 是你的个人成长时间线（L3，想回顾的时候再翻）。

### 对比一下

**原始对话：**
> "我一直在想副业的事。也许应该从 B2C 转 B2B。定价也想从 $19 改成 $49/月。还有，我发现早上不能一起床就刷推特。"

**Loci 存下来的：**
- `decisions/2026-03-10-pivot-to-b2b.md`：转 B2B，定价 $49/月，利用企业服务经验
- `me/learned.md`（追加）：早上别先刷推特——会打碎专注力
- `tasks/active.md`（追加）：更新落地页为 B2B 定位

三个文件更新，零原始对话保存。所有信息都能搜到，而且都在对的地方。

> 深入了解: [蒸馏机制](distillation.md)

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
  有   → 立刻存 → 一行通知:
          [Loci] 已保存: 新任务 "买电源线" → active.md
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
/loci-sync              → 回顾对话 + 保存文件 + 同步到子项目
/loci-sync --local      → 只存本地，不同步到子项目
/loci-sync --dry-run    → 预览会存什么，但不实际执行
```

> 深入了解: [Synapse](synapse.md)

---

## 第四层: 多项目编排（Synapse 路由）

这是第 2 周的功能——当你同时在搞好几个项目的时候。

### 连接项目

```bash
# 在任意项目文件夹里
/loci-link
```

跑完之后会发生这些事：
1. 自动扫描项目（README, package.json, 目录结构）→ 生成项目档案
2. 在 Brain 的 `.loci/links/` 里建符号链接
3. 在项目里创建 `.loci/` 目录，放一个 `link` 文件（指向 Brain 路径）
4. 创建双向通信文件：`.loci/from-hq.md`（Brain → 项目）、`.loci/to-hq.md`（项目 → Brain）
5. 创建 `.loci/memory.md` 存项目本地知识

### 信息怎么流

```
           Brain (总部)
          ╱    │    ╲
         ╱     │     ╲
    项目 A    项目 B    项目 C
    .loci/     .loci/     .loci/

上行 (.loci/to-hq.md): 项目 → Brain
  "v1.0 发布了" [milestone]
  "数据库要不要换？" [needs-decision]

下行 (.loci/from-hq.md): Brain → 项目
  "决策：所有项目统一用 PostgreSQL"
  "这个月优先级给项目 A，其他往后排"

本地 (.loci/memory.md): 项目自己的知识
  只在本项目里保留的事实、决策和经验
```

### 基于标签的同步（v1.0）

在子项目里工作时，`.loci/memory.md` 里的条目会打标签。标签决定哪些内容往 Brain 同步：

**推送标签**（通过 `to-hq.md` 自动同步到 Brain）：
- `[decision]` — 架构或战略选择
- `[architecture]` — 系统设计、数据模型、技术栈
- `[insight]` — 踩坑总结、性能发现
- `[milestone]` — 发布的功能、版本号

**本地标签**（只留在子项目里）：
- `[local]` — 项目专属的上下文
- `[debug]` — Bug 修复、临时方案
- `[wip]` — 还在搞的东西

> 高级路由模式（open、manual、silent）计划 v2.0 做。详见 [Roadmap](roadmap.md)。

### 子项目配置（/loci-settings）

每个项目都能通过 `/loci-settings` 单独配置哪些标签往 Brain 推。

> 深入了解: [部门系统](departments.md)

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

- `tasks/daily/YYYY-MM-DD.md` — 今天的安排 + 完成情况
- `tasks/journal/buffer.md` — 聊天过程中随时往里追加要点
- 说"总结" → 读 buffer + 回顾对话 → 生成当天日记 → 清空 buffer

### 活动日志

- 每次文件变更都自动记到 `.loci/activity-log.md`（通过 Claude Code hook）
- 新对话启动时会读最近 7 天的记录 → 知道上回聊了什么
- 每月清理：超过 14 天的条目自动干掉

### Dashboard

- `.loci/dashboard/` — 本地网页，像素风，展示目标/任务/收集箱/项目状态
- `python3 build.py` 从 Markdown 文件生成 `data.json`
- 当你攒了 2-3 个任务之后，AI 会主动提议打开看看

### 跨终端同步

- `.loci/hooks/check-updates.sh` — 检测其他终端的文件变更
- 每次对话开始时自动跑一遍
- `/sync` 手动刷新

> 深入了解: [上下文感知](context-awareness.md), [Dashboard](dashboard.md)

### 已知限制（v1.0）

- **并发编辑**：多个终端同时写同一个 Brain 文件可能会冲突。Git 追踪所有变更所以数据不会真丢，但你可能得手动合并一下。
- **跨终端检测**：钩子（`check-updates.sh`）能发现其他终端改了文件，但拦不住两次写入撞车。
- **最佳实践**：尽量别在多个终端同时改同一个 Brain 文件。实际上这种情况很少碰到——大部分对话操作的是不同文件——但心里有个数就好。

后续版本会加文件级锁定或者无冲突合并策略。

---

## 一句话总结

**Loci = 三层记忆（L1/L2/L3）+ 信号驱动蒸馏 + 中心辐射式多项目路由 + 纯 Markdown，零依赖。**

第一天用户只会觉得"我的 AI 记住我了"。底层的复杂度随着使用深入逐步展开——永远不会一股脑全丢给你。

---

## 命令速查

| 命令 | 什么时候用 | 干什么 |
|---------|-----------------|--------------|
| `/loci-link` | 第 2 周 | 把项目文件夹连到 Brain |
| `/loci-sync` | 随时 | 手动蒸馏 + 同步（参数: `--local`, `--dry-run`） |
| `/loci-settings` | 第 2 周+ | 配置项目往 Brain 同步什么 |
| `/loci-brain-settings` | 第 3 周+ | 配置持久化模式和通知 |
| `/loci-consolidate` | 随时 | 手动记忆整合（默认 24 小时，或 `/loci-consolidate 7` 按周整合） |
| `/loci-scan` | 偶尔 | 重新扫描项目、更新档案 |

## 延伸阅读

- [架构设计](architecture.md) — 三层记忆系统详解
- [Synapse](synapse.md) — 持久化模式、路由、隐私
- [蒸馏机制](distillation.md) — 对话怎么变成结构化知识
- [部门系统](departments.md) — 多项目编排
- [隐私](privacy.md) — 数据保护与 AI 上下文控制
