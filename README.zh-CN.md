<p align="center">
  <img src="docs/assets/seahorse-logo.png" alt="Loci Seahorse" width="200" />
</p>

<h1 align="center">Loci — AI 的记忆宫殿</h1>

<p align="center">
  <strong>不是一个文件，而是一整套大脑架构。专为 Claude Code 打造。</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://github.com/codesstar/loci/stargazers"><img src="https://img.shields.io/github/stars/codesstar/loci?style=social" alt="GitHub Stars" /></a>
  <img src="https://img.shields.io/badge/built_for-Claude_Code-blueviolet" alt="Built for Claude Code" />
  <img src="https://img.shields.io/badge/storage-100%25_local_Markdown-green" alt="Local Markdown" />
</p>

<p align="center">
  <a href="README.md">English</a> | 中文
</p>

---

## 痛点

你的 AI 不记得你。

每次对话都从零开始。你重新介绍自己。你重新解释项目。你重新描述偏好。昨天花了一小时才搞清楚的东西？没了。上周做的决策？不存在。

不只是跨对话会忘。聊久了 context 就满了——AI 开始重复自己、变得迟钝、忘了你 20 分钟前说的话。你重启。之前积累的一切全没了。

更糟的是：你的记忆被平台绑架了。ChatGPT 不续费？几个月的上下文没了。换个工具？从头再来。你 AI 的记忆属于平台，不属于你。

**如果你的 AI 真的认识你——而且这份认知永远属于你呢？**

## 解决方案

Loci 给你的 AI 装上一颗真正的大脑。它了解你的一切都以 Markdown 文件的形式保存在你的电脑上。没有服务器，没有订阅，没有绑定。你的记忆属于你自己。

```
第 1 天：     "我是一个前端开发者，喜欢简单方案，正在做一个健身 App。"
              你的 AI 记住了。永久地。

第 2 周：     Context 满了。AI 变慢了。你重启。
             "接着上次的继续。"
             "你在做运动记录页面。你决定用卡片布局因为要适配手机端。
              运动列表做完了，下一步是计时器组件。继续？"

第 3 个月：   你打开了一个全新的项目。
             "这个项目怎么组织结构？"
             "根据我对你的了解：你喜欢扁平的文件夹结构，你总是后悔
              过早加太多抽象层，你喜欢先做出一个能跑的原型。
              我建议这样..."

第 1 年：     你回头看。
             "我这一年有什么变化？"
             "1 月你说自己是'在学编程'。到 6 月你已经在批量交付功能了。
              你的决策速度变快了——早期一个决策要想好几天，现在几小时
              就能定。你成长了很多。"
```

用得越久，它就越懂你。你的偏好、你的习惯、你的成长——跨越每一次对话、每一个项目、每一次 context 重置。它永远不会忘记，也永远不会消失。

**你的 AI 不再是陌生人。它是唯一一个真正认识你的助手。**

### 为什么选 Loci？

- **它是你的。** 每一条记忆都是你电脑上的文件。没有服务器，没有订阅。取消任何服务、换任何工具——你的大脑还在。
- **它是私密的。** 你的身份、你的决策、你的目标——都存在本地。没有人能看到，包括我们。
- **它会成长。** 第一天，它知道你的名字。第三个月，它知道你的习惯。第一年，它能告诉你你怎么变化的。
- **它不会崩溃。** Session 断了？Context 满了？电脑重启了？存档 10 秒恢复。你的 AI 从你停下的地方接着来。

### "我已经有 CLAUDE.md 了——为什么还需要这个？"

CLAUDE.md 是一张便利贴。Loci 是第二大脑。

- **CLAUDE.md 是一个文件。** Loci 是 30+ 个结构化模块——身份、决策、任务、日计划、日记、成长记录——无论你用多久都保持整洁。
- **CLAUDE.md 是单项目的。** Loci 连接你所有的项目。你在项目 A 学到的教训会自动变成项目 B 的提醒。
- **CLAUDE.md 用久了会变慢。** 文件膨胀，context 臃肿，AI 变迟钝。Loci 用分层加载——只有相关的记忆进入 context。用得越多越聪明，而不是越慢。
- **CLAUDE.md 不管理你的工作。** Loci 给你晨间简报、任务追踪、模式发现、每日日记和可视化 Dashboard。

Loci 内部其实*用了* CLAUDE.md——它只是系统里 30+ 个文件中的一个。区别在于它周围的一切。

![Loci Dashboard](docs/assets/dashboard-preview.png)

---

## 快速开始

需要 [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview)。

```bash
git clone https://github.com/codesstar/loci.git my-brain
cd my-brain
claude
```

就这样。Claude 检测到这是一个新大脑，问你几个问题，通过对话完成所有设置。大约 2 分钟。

> **另一种方式**：运行 `bash install.sh` 代替 `claude`——它会检查环境、断开模板远程仓库、安装 slash 命令，然后再启动 Claude。
>
> **Windows？** 用 [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) 或 Git Bash。
>
> **想看看大脑长什么样？** 看看 [`examples/alex/`](examples/alex/)——一个有 3 个月历史的完整大脑。
>
> **新手？** 阅读**[入门指南](docs/getting-started.md)**获取完整教程。

---

## 装好之后会发生什么

你不需要学 Loci。你只需要正常跟 AI 聊天，四件事会自动发生：

### 它记住重要的事

花了 30 分钟跟 AI 讨论出来的结论？自动保存——包括决策、理由和你否决的方案。

```
你："我们比较了 Vercel、Railway 和自建服务器。选 Railway——Vercel
     在我们的量级太贵了，自建对两个人的团队运维压力太大。"

记住了——已保存你的部署决策和权衡理由。
```

下个月你想不起来"为什么不用 Vercel？"——你的 AI 已经知道完整的来龙去脉。想清楚一次，永远不用再想第二次。

### 它连接你的项目

一条命令连接任何项目文件夹。你在项目 A 犯的错误会变成项目 B 的提醒。

```
大脑（你的记忆）
 ├── 主项目         "部署花了 6 小时，因为忘了配 staging 环境的
 │                   环境变量。已经建了检查清单。"
 │
 ├── 副项目         "你要部署这个了。记得上次主项目因为漏配环境
 │                   变量花了 6 小时。这是你建的检查清单。"
 │
 └── 客户项目       "这里也要部署——从一开始就用你的
                     环境变量检查清单。"
```

### 它发现你看不到的规律

每天早上，Loci 复盘昨天的变化，给你洞察：

```
晨间简报：
  - 你这个月开了 3 个新副项目，一个都没做完。
    要不要先把一个做完再开新的？
  - "写项目 README"在你的任务列表上已经待了 12 天了。
    今天做了还是删了？
  - 你估计支付集成要 2 天。你上 3 次集成都超出预估 2 倍。
```

### 它扛住 context 重置

长对话？Context 满了？AI 变慢了？存档重启就行。

```
> 存一下，我要重启
  搞定——已同步所有决策和进度到你的大脑。

（打开一个新终端）

> 接着上次的
  你在做通知系统。你决定用邮件 + 站内通知（暂时不做短信——太贵了）。
  邮件模板做完了，你正要写触发逻辑。
  文件是 src/notifications/triggers.ts。继续？
```

不是"你在做什么项目？"——它精确地知道你在哪、做了什么决策、打开了哪个文件。

### 它跟你一起成长

你的技能在变。你的方向在变。Loci 追踪这些演变——当前状态保持精简，历史在你想回顾的时候随时可看。

```
1 月："数据工程师，批量做 Dashboard"
4 月："数据工程师 → 在做自己的数据分析产品"
7 月："创业者，v1 上线了，50 个用户"
      evolution.md 记录了每次转变和触发原因
```

---

## 工作原理

| 概念 | 做什么 | 为什么重要 |
|------|--------|-----------|
| **智能保存** | 从对话中提取决策、任务和洞察——永远不保存原始聊天记录 | 你的记忆保持干净可搜索，不是一堵文字墙 |
| **分层加载** | 只加载跟当前对话相关的内容。归档的东西不碍事 | 即使积累了几个月的记忆，响应依然快速 |
| **跨项目同步** | 你的大脑是枢纽，项目是辐条。重要信息自动流转 | 一个项目的决策能指导另一个项目的工作 |
| **每日复盘** | 晨间简报总结昨天、发现规律、提醒过期任务 | 10 秒获得完整上下文开始新的一天 |
| **成长追踪** | 身份或目标变化时，旧版本自动归档 | 你可以回头看自己是怎么一步步走过来的 |
| **Git 原生** | 一切都是 git 仓库里的 Markdown 文件。`git diff` 看 AI 今天学到了什么。`git log` 是你的记忆时间线 | 完整版本历史，离线可用，数据完全属于你 |

> **深入了解**: [工作原理](docs/how-it-works.md)——一篇文档覆盖整个系统。

---

## 使用体感

**"我不用再重复解释架构了"** —— Marcus 周一早上打开终端。他的 AI 已经知道周五讨论的迁移方案、发现的边界情况、以及为什么否决了更简单的方案。

**"它救我免于重蹈覆辙"** —— Priya 在给新服务配部署。她的 AI 提醒她上次用那个服务商，DNS 生效花了 48 小时导致发布延期。她在浪费一天之前就换了。

**"它叫我去睡觉"** —— 晚上 11:30，Dev 还在追一个 bug。他的 AI 说"你已经在同样 3 个文件之间绕了一小时了——睡一觉明天再说"——然后精确保存了他调试到哪里，明天第一条消息就能接着来。

> 更多故事: **[用户故事](docs/user-stories.md)**——Loci 日常使用的真实体感。

---

## 目录结构

```
my-brain/
├── CLAUDE.md              # AI 操作系统（首先读取这个文件）
├── plan.md                # 人生方向和目标
├── inbox.md               # 快速记录
├── me/                    # 身份、价值观、技能、成长轨迹
├── tasks/                 # active.md、日计划、日记
├── decisions/             # 决策记录（含完整上下文）
├── archive/               # 已完成的内容（永不删除）
├── .loci/                 # 系统内部（hooks、dashboard、配置）
│   └── links/             # 已连接的项目
├── templates/             # 文件和命令模板
└── docs/                  # 完整文档
```

按需创建的扩展模块：`finance/`、`people/`、`content/`、`references/`

---

## 命令

| 命令 | 作用 |
|------|------|
| `/loci-link` | 把一个项目文件夹连接到你的大脑 |
| `/loci-sync` | 手动保存 + 同步（支持 `--local`、`--dry-run`） |
| `/loci-consolidate` | 回顾最近的变化并发现规律（如 `/loci-consolidate 7` 做周回顾） |
| `/loci-settings` | 配置项目同步到大脑的内容 |
| `/loci-brain-settings` | 配置持久化模式和通知 |
| `/loci-scan` | 重新扫描项目并更新档案 |

---

## 兼容性

Loci **专为 Claude Code 打造**。其他 AI 编辑器可以读取记忆文件，但无法获得完整体验。

| 工具 | 支持程度 | 说明 |
|------|---------|------|
| **Claude Code** | **完整** | 所有功能原生支持 |
| **Cursor** | 部分 | 通过 `.cursorrules` 实现记忆 + 自动保存 |
| **Windsurf** | 部分 | 通过 `.windsurfrules` 实现记忆 + 自动保存 |
| **Cline** | 部分 | 通过 `.clinerules` 实现记忆 + 自动保存 |

> 用其他编辑器？看**[其他编辑器指南](docs/other-editors.md)**。
>
> Loci 的记忆是纯 Markdown——任何 AI 工具都能读。完整体验（slash 命令、自动保存、hooks）需要 Claude Code。

---

## 文档

| 文档 | 内容 |
|------|------|
| **[入门指南](docs/getting-started.md)** | 从零开始的完整教程 |
| **[工作原理](docs/how-it-works.md)** | 一篇文档了解整个系统 |
| **[用户故事](docs/user-stories.md)** | 日常使用的真实体感 |
| **[架构设计](docs/architecture.md)** | 三层记忆系统详解 |
| **[Synapse](docs/synapse.md)** | 多项目同步和路由 |
| **[蒸馏机制](docs/distillation.md)** | 对话如何变成结构化知识 |
| **[Dashboard](docs/dashboard.md)** | 可视化大脑概览 |
| **[隐私保护](docs/privacy.md)** | 数据安全和存储方式 |
| **[路线图](docs/roadmap.md)** | 接下来要做什么 |

---

## 贡献

欢迎贡献——bug 修复、新功能、文档、或者只是分享你怎么使用 Loci。大的改动请先开 issue 讨论。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

MIT. 详见 [LICENSE](LICENSE)。

---

<p align="center">
  <strong>Loci</strong> 由 <a href="https://github.com/codesstar">Callum</a> 打造。<br/>
  如果它让你的 AI 拥有了更好的记忆，给颗星吧。
</p>
