# 开始使用

[English](getting-started.md) · [中文首页](../README.md)

把这段话交给能操作本地文件和命令的 AI：

```text
帮我安装 Loci，按 https://raw.githubusercontent.com/codesstar/loci/main/docs/AI-INSTALL.md 操作。
如果已有大脑，保留数据并升级；最后验证实际接入。
```

需要 Node.js 18+ 和 Git，不需要 npm 包。安装器提供 Claude Code、Codex、WorkBuddy 的入口配置；新会话中验证实际加载。其他客户端需核实自己的指令入口和本地工具能力。

可以试试：“以后用中文回复”“明天9点发材料，加到待办”“收藏这个链接”。第一次涉及记忆操作会完整读 `LOCI-RULES.md`；当前上下文里仍有效就复用，实际记录按需读。

运行 `node <brain-path>/.loci/dashboard/server.js`，打开 `http://localhost:8765` 查看 Dashboard。保持进程运行；任务、日程与重复提醒分开保存，通知送达需要单独验证。

[安装、升级与回滚](AI-INSTALL.md) · [架构说明](architecture.md) · [完整操作手册](../LOCI-RULES.md)
