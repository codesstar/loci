# 在其他编辑器中使用 Loci

Loci 是为 Claude Code 构建的，但它的记忆是纯 Markdown——任何 AI 编程工具都能读取。

## 在所有编辑器中都能用的功能

- **读取记忆文件** — 你的 AI 可以读取 `me/`、`tasks/`、`decisions/`、`plan.md`，不受编辑器限制
- **手动记录** — 你随时可以直接编辑 Markdown 文件
- **基于 Git 的历史记录** — `git diff` 和 `git log` 在任何地方都一样

## 需要 Claude Code 的功能

- **Slash commands**（`/loci-sync`、`/loci-link`、`/loci-consolidate` 等）
- **自动持久化**（Synapse）— 自动信号检测和存储
- **Hooks** — 跨终端感知、活动日志
- **Memory Consolidation** — 每日模式检测和洞察生成

## 在 Cursor / Windsurf / Cline 中配置

1. 克隆并进入 brain：
   ```bash
   git clone https://github.com/codesstar/loci.git my-brain
   cd my-brain
   ```

2. **手动引导**: 由于自动检测不会触发，需要手动创建初始文件，告诉 AI：
   ```
   "I just set up Loci. My name is [X], I'm a [role], and my current focus is [Y].
    Please create me/identity.md, plan.md, and tasks/active.md."
   ```

## 部分支持编辑器的使用技巧

- **代替 `/loci-sync`**: 告诉 AI "保存这个决策" 或 "添加这个任务"——它可以直接编辑 Markdown 文件
- **代替 `/loci-link`**: 手动在你的项目中创建 `.loci/` 目录，包含 `memory.md`、`to-hq.md` 和 `from-hq.md`
- **代替自动 consolidation**: 定期让 AI "回顾我最近的决策和任务，找找规律"

## 混合工作流

有些用户在终端里用 Claude Code 管理 brain（命令、consolidation、同步），同时用自己喜欢的编辑器写代码。这样既能享受 Loci 的全部功能，又不影响编码工作流。

```
Terminal (Claude Code)     Editor (Cursor/Windsurf)
├── Brain 管理              ├── 写代码
├── /loci-consolidate      ├── 读取 brain 上下文
├── /loci-link             ├── AI 知道你的决策
└── /loci-sync             └── 记忆文件随时可用
```

## 贡献适配器支持

我们欢迎改进非 Claude Code 编辑器支持的 PR。请查看 [GitHub Issues](https://github.com/codesstar/loci/issues) 了解开放的需求。
