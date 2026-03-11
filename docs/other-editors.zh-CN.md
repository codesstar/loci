# 在其他编辑器里用 Loci

Loci 是给 Claude Code 做的，但记忆层全是 Markdown 纯文本——随便哪个 AI 编程工具都能读。

## 不挑编辑器的功能

- **读记忆文件** — 你的 AI 直接读 `me/`、`tasks/`、`decisions/`、`plan.md` 就行，跟编辑器无关
- **手写笔记** — Markdown 文件你随时可以自己改
- **Git 历史** — `git diff` 和 `git log` 哪儿都能用

## 需要 Claude Code 才行的功能

- **Slash commands**（`/loci-sync`、`/loci-link`、`/loci-consolidate` 这些）
- **自动持久化**（Synapse）— 自动检测信号并存储
- **Hooks** — 跨终端感知、活动日志
- **Memory Consolidation** — 每天的模式检测和洞察生成

## Cursor / Windsurf / Cline 怎么配

1. 克隆 brain 仓库：
   ```bash
   git clone https://github.com/codesstar/loci.git my-brain
   cd my-brain
   ```

2. **手动引导一下**：这些编辑器没有自动检测，得你自己跟 AI 说：
   ```
   "I just set up Loci. My name is [X], I'm a [role], and my current focus is [Y].
    Please create me/identity.md, plan.md, and tasks/active.md."
   ```

## 没有 slash command 怎么办

- **替代 `/loci-sync`**：直接跟 AI 说 "保存这个决策" 或 "加个任务"——它能直接编辑 Markdown 文件
- **替代 `/loci-link`**：手动在你的项目里建个 `.loci/` 目录，里面放 `memory.md`、`to-hq.md` 和 `from-hq.md`
- **替代自动 consolidation**：隔一阵让 AI "回顾一下我最近的决策和任务，看看有什么规律"

## 混合工作流

不少人这么干：终端里开 Claude Code 管 brain（跑命令、做 consolidation、同步），编辑器里该用 Cursor 用 Cursor 写代码。两边各司其职，Loci 功能全用上，写代码的习惯也不用改。

```
Terminal (Claude Code)     Editor (Cursor/Windsurf)
├── 管 brain                ├── 写代码
├── /loci-consolidate      ├── 读 brain 上下文
├── /loci-link             ├── AI 知道你的决策
└── /loci-sync             └── 记忆文件随时可用
```

## 想帮忙做适配？

欢迎提 PR 改进非 Claude Code 编辑器的支持。去 [GitHub Issues](https://github.com/codesstar/loci/issues) 看看有哪些开放的需求。
