# Loci 快速上手

> 5 分钟搞定，让你的 AI 从此记住你。

---

## 开始之前

推荐准备：

1. **Claude Code 或 Codex** — Loci 现在重点支持这两个工具，并让它们共用同一个本地大脑。
2. **Node.js / npm** — `npx create-loci` 需要它。通常已经在开发者电脑上。
3. **Git** — 可选但强烈推荐，用来备份和查看记忆变化。

可选：
- **Python 3** — 不是核心依赖。当前 Dashboard 使用 Node server。

---

## 安装

### 方式 A：npx 安装（推荐）

```bash
npx create-loci
```

安装器会打开网页向导，帮你：

1. 创建或选择本地大脑目录
2. 填写名字、角色、偏好、当前重点
3. 检测 Claude Code 和 Codex
4. 询问接入 Claude Code、Codex，还是两者都接入
5. 写入用户级 Loci 规则，让两个工具知道同一个大脑路径

喜欢终端向导的话：

```bash
npx create-loci --cli
```

### 方式 B：手动安装

```bash
git clone https://github.com/codesstar/loci.git ~/loci
cd ~/loci
./setup.sh
```

### 安装完成后

你可以在任意目录打开 Claude Code 或 Codex：

```bash
claude
# 或
codex
```

它们会读取同一个本地大脑。Claude Code 里保存的任务、决策和项目上下文，Codex 也能接上。

---

## 第一次对话

如果你用 `npx create-loci`，这些问题已经在网页向导里填过了：

```
  你好，欢迎使用 Loci！我来帮你初始化 brain。

  1. 你叫什么？
  2. 你是做什么的？（开发者 / 设计师 / 创作者 / 学生 / 其他）
  3. 你现在手头最重要的事是什么？
  4. 你一般什么时间段工作？
  5. 你习惯用什么语言？（English / 中文 / 混合）
```

照实说就行——这些信息用来生成你的初始文件，后面随时能改。

完成后，Loci 会创建一组初始文件：

```
  搞定了！你的 brain 已经就绪，我创建了这些文件：

  - me/identity.md       你的基本信息（名字、角色、当前重点）
  - plan.md              你的使命和目标
  - tasks/active.md      根据你刚才说的，建了第一个任务
  - .loci/config.yml     配置文件（工作时间、语言偏好）

  你可以试着跟我聊聊最近做了什么决定，
  或者直接开始工作——重要的东西我会帮你记着。
```

第一次打开 Claude Code 或 Codex 时，它会读到这些文件，直接进入可用状态。设置完了，正常聊天就好。

---

## 认识你的 Brain

设置完成后，brain 目录长这样：

```
my-brain/
├── CLAUDE.md              AI 最先读的文件，包含所有行为规则。
│                          你可以看，但一般不用手动改。
│
├── plan.md                你的使命、目标和当前优先级。
│                          每次对话都会加载。方向变了就更新它。
│
├── inbox.md               快速收集箱。你随口提到一个模糊想法
│                          （"要不要学学 Rust"），就会存在这里。
│                          建议每周清理一次。
│
├── me/                    关于你的一切。
│   ├── identity.md        基本信息：名字、职业、城市、当前阶段
│   ├── values.md          你看重什么（聊到相关话题时创建）
│   ├── learned.md         踩过的坑、总结的经验（持续增长）
│   └── evolution.md       identity/values 的旧版本（成长档案）
│
├── tasks/                 你的事儿。
│   ├── tasks.json         所有真实任务
│   ├── calendar.json      日程和有时间任务的投影
│   ├── active.md          给 AI 快速读取的任务缓存（自动生成）
│   └── journal/           每日复盘
│
├── decisions/             每个重大决策一个文件。记你做了什么选择、
│                          为什么、还考虑过哪些方案。永久可搜索。
│
├── archive/               什么都不删。完成的任务、旧计划、
│                          过期的决策——统统扔这里。
│
├── projects/              项目索引。
│   ├── index.md           严肃项目一行一个指针
│   └── side.md            还没认真做的项目雏形
│
├── .loci/                 系统文件。
│   ├── config.yml         你的设置（持久化模式、工作时间）
│   ├── hooks/             自动同步脚本
│   ├── dashboard/         本地可视化面板（Node server + HTML）
│   └── activity/          操作总账（一月一个文件 —— "我今天做了啥？"）
│
└── docs/                  文档（你正在读的就是其中一份）
```

以下扩展模块会在你需要时自动创建：
- `finance/` — 预算、资产、财务追踪
- `people/` — 联系人和会议记录
- `content/` — 写作和发布
- `references/` — 文章、书籍、你想收藏的链接
- `notes/` — 你自己的 Obsidian / 飞书 / Notion 笔记索引
- `people/` — 人脉档案

---

## 日常怎么用

### 早上

随便在哪个项目目录（或者 brain 文件夹）打开终端：

```
> morning
```

AI 已经知道今天几号、昨天你干了什么、今天有什么安排。直接给你一个简报：

```
  早，昨天你搞定了 API 分页功能，不过用游标方案的时候，
  删除记录会有个边界情况没处理。

  今天的安排：
  - 修分页那个边界 case（你自己留了个备注：
    "删除记录导致游标间隙，试试软删除"）
  - Review Kai 的 PR——开了 3 天了
  - 开始写部署文档

  "重构 auth 中间件"很久没更新了——
  今天处理掉、继续保留，还是归档？
```

### 干活的时候

正常工作就好。你做决策、发现新东西或者提到任务的时候，AI 会自动记下来：

```
> 我们试了 SSR，但对我们这个场景来说太重了。
  还是客户端渲染加个骨架屏吧。

  收到，渲染方案的决策和权衡理由已经帮你记下来了。

> 对了，staging 环境挂了，好像新加的依赖把
  Docker 构建搞崩了。

  "修复 staging Docker 构建"已加到任务列表，P1。
```

不用说"帮我存一下"，不用特殊格式，正常说话就行。

### 收工

准备结束时：

```
> 今天就这样吧

  不错的一天，总结一下：
  - 用软删除搞定了分页的边界 case
  - 定了继续用客户端渲染的方案
  - Review 了 Kai 的 PR（通过，留了 2 条 comment）

  明天重点：
  - P0：修 staging 部署
  - P1：部署文档（周五发版前得写完）
  - P1：跟进 Kai 的 PR comment

  现在 10:45 了——差不多该歇了。明天见。
```

想要更详细的每日复盘的话，说"总结"或者"journal"，AI 会在 `tasks/journal/` 里给你写一篇。

---

## 打开 Dashboard

Dashboard 是可选的，但它是最快理解 Loci 到底在存什么的方式。

在 brain 目录运行：

```bash
node .loci/dashboard/server.js
```

打开：

```text
http://127.0.0.1:8765/
```

默认 `/` 入口会打开 Clean dashboard。它带有完整测试数据、入口引导和中文 / English 语言选择，你可以放心探索产品，不会写入真实 brain 文件。

本地 API 仍在 `/api/data`，旧的 sci-fi dashboard 仍在 `/sci`。

更多细节见：[Dashboard 文档](dashboard.zh-CN.md)。

---

## 连接项目

用了 Loci 几天之后，你会想把手头的代码项目也连进来。这是"第二周"功能。

### 怎么连

不用记命令。在任意项目目录里打开 Claude Code 或 Codex，正常工作就行。

当 AI 发现这个项目真的做起来了，它应该在对话结尾轻问一次：

> "这个项目好像做起来了，要不要我帮你在这里留个记忆？"

你点头后，AI 会：
1. 在项目 repo 里创建 `.loci/memory.md`
2. 创建 `.loci/decisions/` 存项目决策
3. 往项目的 `CLAUDE.md` 和 `AGENTS.md` 注入 Loci project block
4. 把 `.loci/` 加到项目 `.gitignore`
5. 在大脑的 `projects/index.md` 里加一行索引

内部实现上，AI 应优先用 `scripts/loci-project.js connect` 来做这件事，这样多文件写入不会漏步骤。

之后，项目记忆归项目 repo 自己。大脑只保留索引，知道需要时去哪读。

连好之后，你在那个项目里工作时，AI 就能感知到 brain 里的内容——你做过的决策、目标、偏好，全都打通了。

### 哪些东西会跨项目同步

不是啥都同步，那样太吵。默认规则：

- **项目内部决策**留在项目 repo 的 `.loci/decisions/`
- **项目当前状态**更新项目 repo 的 `.loci/memory.md`
- **项目开发待办**写进项目 repo 的 `.loci/todo.json`
- **里程碑**可以在大脑 `projects/index.md` 里留一行摘要
- **跨项目经验教训**可以作为 `[insight]` 提升到大脑项目索引
- **调试笔记**留在本地（临时 fix 没必要带走）
- **进行中的东西**留在本地（半成品留在当前上下文就好）

原则是：Loci 汇聚记忆，但不占有记忆。项目记忆归项目 repo 自己。

### 实际效果：跨项目记忆

你在项目 A 里：
```
> S3 上传静默失败了，查了半天发现就算配了 bucket policy，
  也必须显式设置 ACL 才行。

  记下了，S3 上传的踩坑记录和根因都帮你存了。
```

过几天，你在项目 B 里：
```
> 我要加个文件上传功能，打算用 S3。

  你上周在项目 A 踩过一个 S3 上传的坑——不显式
  设置 ACL 的话，就算配了 bucket policy 上传也会
  静默失败。

  建议这次从一开始就把 ACL 配好。
```

你压根没提另一个项目。但你花半天摸索出来的经验，自动就带过来了。

---

## 使用技巧

**存错了就说"撤销"。** Loci 的自动保存很聪明但不是百分百准。理解错了的话，说一声"undo"就能撤回。

**模糊想法不会变成任务。** 你随口说的不确定的东西（"要不要学学视频剪辑"），Loci 会丢到单独的列表而不是直接建任务。每周看一眼就好。

**用 `git log --oneline` 看记忆时间线。** 每次保存都是一个 git 可追踪的文件变更，你能看到 AI 什么时候学到了什么。

**用 `/loci-consolidate 7` 做周回顾。** 它会扫描过去 7 天的变更，帮你找规律、揪出过期任务、发现你可能漏掉的东西。

**上下文快满了？存一下重开就行。** AI 开始变慢或者翻来覆去说同样的话时，说"save everything"或者跑 `/loci-sync`，然后开个新终端。AI 读一遍 brain 文件，几秒钟就接上——不用花十分钟重新交代背景。

**你的 brain 就是普通文件。** 想改什么直接用编辑器改，Loci 下次对话会自动读到。没有任何锁定机制。

**Dashboard 能给你一个全局视图。** 在 brain 目录跑 `node .loci/dashboard/server.js`，然后浏览器打开 `http://127.0.0.1:8765/`。

---

## 常见问题

**Q：我的数据会被传到外面吗？**
不会。所有东西都是本地 Markdown / JSON 文件，存在你自己电脑上。没有 Loci 云服务，没有账号，没有遥测。你的对话会走 Claude Code 或 Codex（它们有各自的隐私政策），但 Loci 的记忆文件不会因为 Dashboard 被上传。

**Q：能在 Cursor / Windsurf / 其他编辑器里用吗？**
部分能用。任何 AI 编辑器都能读你的记忆文件——就是 Markdown 嘛。但完整体验目前重点放在 Claude Code 和 Codex，它们可以共用同一个本地大脑。详见 [其他编辑器指南](other-editors.zh-CN.md)。

**Q：同时开了两个终端会冲突吗？**
Loci 每次对话启动时会检测其他终端的文件变更。同时写同一个文件确实可能冲突，但 git 追踪一切，数据不会真正丢。实际中这种情况很少碰到。

**Q：怎么备份？**
就是个 git 仓库嘛。推到私有 GitHub/GitLab 仓库，或者直接复制文件夹，怎么方便怎么来。

**Q：换电脑了怎么办？**
把文件夹拷过去（或者从你的私有远程仓库 clone 下来），跑一遍 `bash install.sh` 就行。安装脚本会在新机器上重建全局感知。

**Q：brain 会越来越大吗？**
正常用几个月的话，大概几百个 Markdown 文件，加起来也就几 MB。Loci 会归档旧内容，保持活跃文件精简。Git 历史会大一点，但这很正常。

**Q：能删 brain 里的东西吗？**
能，但 Loci 更推荐归档而不是删除——把文件挪到 `archive/` 就好。如果确实想彻底删，删了文件然后 commit。git 历史里还是会有，除非你重写历史。

**Q：不想要自动保存怎么办？**
跑 `/loci-brain-settings`，把 persistence 设成 `manual`。手动模式下，除非你明确说"保存这个"或者跑 `/loci-sync`，不然啥都不会自动存。

**Q：怎么卸载？**
删掉 `~/.claude/CLAUDE.md` 和/或 `~/.codex/AGENTS.md` 里 `<!-- loci:start -->` 那段，删掉对应的 slash commands，再删掉 brain 文件夹就行。没有系统级别的改动需要还原。

**Q：发现 bug / 有建议怎么反馈？**
去 [GitHub](https://github.com/codesstar/loci/issues) 提 issue。欢迎贡献——详见 [CONTRIBUTING.md](../CONTRIBUTING.md)。

---

## 下一步

- **[工作原理](how-it-works.md)** — 一篇看懂整个系统
- **[用户故事](user-stories.md)** — 看看日常用起来什么感觉
- **[路线图](roadmap.md)** — 接下来要做什么
