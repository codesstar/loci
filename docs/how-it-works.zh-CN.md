# Loci 工作原理 — 完整指南

> 这是一份"读完就全懂"的文档。每个章节递进展开，和你实际使用 Loci 的顺序一致。

## 用户体验节奏

```
第 1 周: 安装 → 聊天 → AI 记住你了              只管聊就行
第 2 周: 连接其他项目 → 跨项目记忆               一个命令: /loci-link
第 3 周: Dashboard + 配置调优                    可视化概览 + /loci-brain-settings
第 4 周+: 精细控制                               /loci-settings, /loci-sync 参数
```

你不需要一开始就学会所有东西。系统会随着你的使用逐步展现。

---

## 第一层: Brain（大脑）

你的大脑就是一个文件夹。里面是按模块组织的 Markdown 文件，包含四个核心模块和系统内部文件：

```
my-brain/
├── CLAUDE.md          ← AI 的操作系统（每次最先读取）
├── plan.md            ← 你的人生方向和目标（每次对话加载）
├── inbox.md           ← 快速收集箱（每次对话加载）
│
├── me/                ← 关于你
│   ├── identity.md    ← 基本信息（姓名、职业、城市）
│   ├── values.md      ← 你的价值观
│   ├── learned.md     ← 你的经验教训
│   ├── goals.md       ← 详细目标分解
│   └── evolution.md   ← 成长时间线（旧版本追加在这里）
│
├── tasks/             ← 任务 + 规划（合并）
│   ├── active.md      ← 当前任务（P0/P1/P2/P3 优先级）
│   ├── someday.md     ← 以后再说
│   ├── daily/         ← 每天一个 md 文件（日程 + 完成情况）
│   └── journal/       ← 每日总结（buffer.md → 当天日记）
│
├── decisions/         ← 每个重要决策一个文件（含背景 + 推理过程）
├── archive/           ← 过期内容移到这里，永不删除
│
├── .loci/             ← 系统内部文件
│   ├── hooks/         ← 跨终端同步钩子
│   ├── links/         ← 连接的外部项目
│   ├── dashboard/     ← 可视化面板
│   ├── config.yml     ← Brain 设置（持久化模式、通知）
│   ├── status.yml     ← 当前状态（疲惫 / 精力充沛 / 旅途中）
│   └── activity-log.md ← 最近 14 天的活动时间线
│
└── （扩展模块，按需创建）
    ├── finance/       ← 预算、资产、财务追踪
    ├── people/        ← 联系人、会议记录、人际关系
    ├── content/       ← 写作、内容创作、发布
    └── references/    ← 外部知识库（文章、书籍、引用）
```

### 三层上下文

这是 Loci 的核心设计——不是所有记忆每次都需要加载：

| 层级 | 何时加载 | 内容 | 类比 |
|-------|------------|----------|---------------|
| **L1** | 每次对话 | CLAUDE.md, plan.md, inbox.md, .loci/activity-log.md, auto-memory | 工作记忆（你现在正在想的事） |
| **L2** | 聊到相关话题时 | 模块 README、具体的人/任务/计划文件、参考资料 | 短期记忆（一个念头就能想起） |
| **L3** | 只在明确要求时 | archive、旧决策、evolution.md、旧日记 | 长期记忆（需要翻找才能回忆） |

**为什么要分三层？** AI 的上下文窗口是有限的。每次都加载所有内容会浪费 token 并分散注意力。L1 保持精简（几百行），L2 按需加载，L3 无限增长而不影响性能。

> 深入了解: [架构设计](architecture.md)

---

## 第二层: 蒸馏

这是 Loci 与"聊天记录"的根本区别：**我们不保存原始对话，只保存蒸馏后的结论。**

### 路由规则

```
你说了一句话
       ↓
  AI 判断: 这里有值得存储的信息吗？
       ↓
   没有 → 什么都不做
   有   → 分类 + 路由:
         ├── 个人事实（"我搬到柏林了"）             → me/identity.md
         ├── 新的认知（"周五永远不要部署"）           → me/learned.md
         ├── 决策（"用 PostgreSQL"）                → decisions/2026-03-10-xxx.md
         ├── 新任务（"要更新 API 文档"）             → tasks/active.md
         ├── 外部内容（文章、推文、引用）              → references/inbox.md
         └── 模糊想法（"也许我该学 Rust"）           → inbox.md
```

### 蒸馏分级

- **事实信息**（城市、职业、工具偏好）→ 立即保存，一行确认
- **主观/战略信息**（价值观变化、目标调整）→ 先问你确认

### 成长追踪

当价值观发生变化时，Loci 不是覆盖——而是演进：
1. 当前文件（如 values.md）更新到最新状态
2. 旧版本追加到 `evolution.md`

结果：当前文件保持精简（L1 快速加载）。evolution.md 是你的个人成长时间线（L3，想回顾时再读）。

### 对比示例

**原始对话：**
> "我一直在想我的副业项目。也许应该从 B2C 转向 B2B。定价也应该从 $19 改成 $49/月。还有，我发现早上不能一起床就刷推特。"

**Loci 存储的内容：**
- `decisions/2026-03-10-pivot-to-b2b.md`：转向 B2B，定价 $49/月，利用企业服务经验
- `me/learned.md`（追加）：早上别先刷推特——会打碎专注力
- `tasks/active.md`（追加）：更新落地页为 B2B 定位

三个文件更新。零原始对话保存。所有信息可搜索且在上下文中。

> 深入了解: [蒸馏机制](distillation.md)

---

## 第三层: 持久化（Synapse）

这回答的是"什么时候保存？"

### Auto 模式（默认——新用户自动开启）

```
你和 AI 聊天
    ↓
每一轮，AI 内部判断: 这轮有值得存储的内容吗？
    ↓
  没有信号 → 安静，继续聊
  有信号   → 立即保存 → 一行通知:
              [Loci] 已保存: 新任务 "买电源线" → active.md
    ↓
你看到通知，不需要回复，继续聊
如果存错了 → 说"撤销"
```

**关键: 信号驱动，不是固定间隔。** 闲聊十轮什么都不存。做出一个重要决策，立刻保存。

### Manual 模式（给想要完全控制的高级用户）

不会自动保存任何东西。只在你说"保存这个"或运行 `/loci-sync` 时才存储。

### `/loci-sync` 命令

两种模式下都可用。手动触发完整的"蒸馏 + 同步"：

```
/loci-sync              → 回顾对话 + 保存文件 + 同步到子项目
/loci-sync --local      → 只本地保存，不同步到子项目
/loci-sync --dry-run    → 显示将要保存的内容，但不执行
```

> 深入了解: [Synapse](synapse.md)

---

## 第四层: 多项目编排（Synapse 路由）

这是第 2 周的功能——当你有多个项目文件夹时。

### 连接项目

```bash
# 在任何项目文件夹中
/loci-link
```

会发生什么：
1. 自动扫描项目（README, package.json, 目录结构）→ 生成项目档案
2. 在 Brain 的 `.loci/links/` 中创建符号链接
3. 在项目中创建 `.loci/` 目录，包含 `link` 文件（指向 Brain 路径）
4. 创建双向通信文件：`.loci/from-hq.md`（Brain → 项目）、`.loci/to-hq.md`（项目 → Brain）
5. 创建 `.loci/memory.md` 用于项目本地知识持久化

### 信息流

```
           Brain (总部)
          ╱    │    ╲
         ╱     │     ╲
    项目 A    项目 B    项目 C
    .loci/     .loci/     .loci/

上行 (.loci/to-hq.md): 项目 → Brain
  "v1.0 已发布" [milestone]
  "要不要换数据库？" [needs-decision]

下行 (.loci/from-hq.md): Brain → 项目
  "决策: 所有项目统一使用 PostgreSQL"
  "本月优先级是项目 A，其他降优先级"

本地 (.loci/memory.md): 项目专属知识
  只在本项目内保留的事实、决策和经验
```

### 基于标签的同步（v1.0）

在子项目中工作时，`.loci/memory.md` 中的条目会被打标签。标签决定哪些内容同步到 Brain：

**推送标签**（通过 `to-hq.md` 自动同步到 Brain）：
- `[decision]` — 架构或战略选择
- `[architecture]` — 系统设计、数据模型、技术栈
- `[insight]` — 经验规律、性能发现
- `[milestone]` — 已发布的功能、版本

**本地标签**（只留在子项目中）：
- `[local]` — 项目专属上下文
- `[debug]` — Bug 修复、临时方案
- `[wip]` — 进行中的工作

> 高级路由模式（open、manual、silent）计划在 v2.0 实现。详见 [Roadmap](roadmap.md)。

### 子项目配置（/loci-settings）

每个项目可以通过 `/loci-settings` 配置哪些标签推送到 Brain。

> 深入了解: [部门系统](departments.md)

---

## 第五层: 配置

### 继承链

```
Loci 内置默认值 → Brain 设置 → 子项目设置 → 用户覆盖
```

隐私始终是硬边界——子项目永远不能削弱隐私设置。

### 两个配置命令

| 命令 | 作用范围 | 控制内容 |
|---------|-------|----------|
| `/loci-brain-settings` | Brain | 持久化模式（auto/manual）、通知 |
| `/loci-settings` | 子项目 | 该项目推送哪些标签到 Brain |

### Brain 设置（v1.0）

```yaml
persistence:
  mode: auto              # auto（信号驱动）| manual
  notify: true            # 每次保存后显示通知
```

> 高级设置（隐私边界、蒸馏级别、路由模式、保留策略）计划在 v2.0 实现。详见 [Roadmap](roadmap.md)。

---

## 第六层: 辅助机制

### 日计划 + 日记

- `tasks/daily/YYYY-MM-DD.md` — 今天的日程 + 完成情况
- `tasks/journal/buffer.md` — 对话中随时追加要点
- 说"总结" → 读取 buffer + 回顾对话 → 生成当天日记 → 清空 buffer

### 活动日志

- 每次文件变更自动记录到 `.loci/activity-log.md`（通过 Claude Code hook）
- 新对话会读取最近 7 天的记录 → 知道上次聊了什么
- 每月清理：超过 14 天的条目自动移除

### Dashboard

- `.loci/dashboard/` — 本地网页，像素风格，展示目标/任务/收集箱/项目状态
- `python3 build.py` 从 Markdown 文件生成 `data.json`
- 当你有 2-3 个任务后，AI 会主动提议打开

### 跨终端同步

- `.loci/hooks/check-updates.sh` — 检测其他终端的文件变更
- 每次对话开始时自动运行
- `/sync` 手动刷新

> 深入了解: [上下文感知](context-awareness.md), [Dashboard](dashboard.md)

### 已知限制（v1.0）

- **并发编辑**：多个终端同时写入同一个 Brain 文件可能产生冲突。Git 会追踪所有变更，所以数据不会真正丢失，但你可能需要手动合并。
- **跨终端检测**：钩子系统（`check-updates.sh`）能检测到其他终端修改了文件，但无法阻止两次写入重叠。
- **最佳实践**：避免在多个终端同时编辑同一个 Brain 文件。实际上这种情况很少发生——大多数对话会操作不同的文件——但值得了解。

未来版本将添加文件级锁定或无冲突合并策略。

---

## 一句话总结

**Loci = 三层记忆（L1/L2/L3）+ 信号驱动蒸馏 + 中心辐射式多项目路由 + 纯 Markdown，零依赖。**

第一天，用户只会觉得"我的 AI 记住我了"。底层的复杂性随着使用深入逐步展现——从不一次性暴露。

---

## 命令参考

| 命令 | 使用时机 | 功能 |
|---------|-----------------|--------------|
| `/loci-link` | 第 2 周 | 把项目文件夹连接到你的 Brain |
| `/loci-sync` | 随时 | 手动蒸馏 + 同步（参数: `--local`, `--dry-run`） |
| `/loci-settings` | 第 2 周+ | 配置项目同步到 Brain 的内容 |
| `/loci-brain-settings` | 第 3 周+ | 配置持久化模式和通知 |
| `/loci-consolidate` | 随时 | 手动记忆整合（默认 24 小时，或 `/loci-consolidate 7` 按周整合） |
| `/loci-scan` | 偶尔 | 重新扫描项目并更新其档案 |

## 延伸阅读

- [架构设计](architecture.md) — 三层记忆系统详解
- [Synapse](synapse.md) — 持久化模式、路由、隐私
- [蒸馏机制](distillation.md) — 对话如何变为结构化知识
- [部门系统](departments.md) — 多项目编排
- [隐私](privacy.md) — 数据保护与 AI 上下文控制
