<p align="center">
  <img src="docs/assets/loci-banner-transparent.png" alt="Loci — AI 的记忆宫殿" width="600" />
</p>

<p align="center">
  <strong>跨 Agent 的本地记忆与数据层。AI 帮你记录，你随时可看、可改。</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://github.com/codesstar/loci/stargazers"><img src="https://img.shields.io/github/stars/codesstar/loci?style=social" alt="GitHub Stars" /></a>
  <img src="https://img.shields.io/badge/storage-local_Markdown_%2B_JSON-green" alt="本地 Markdown 与 JSON" />
</p>

<p align="center">
  中文 | <a href="README.en.md">English</a>
</p>

## Loci 是什么

不同 AI 工具的记忆往往各自独立。换一个 Agent，偏好、任务和项目背景可能需要重新交代；记录散落在不同位置，也难以统一整理。

Loci 把这些内容放进你自己的本地“大脑”目录，通过各 Agent 的指令入口告诉它们：去哪里读、什么值得记、怎样写入。接入同一个大脑的 Agent，可以读取已经保存的共同上下文。

记忆、任务、日程、人脉和知识资料使用 Markdown、JSON 与附件保存。你可以直接打开文件，也可以通过 Dashboard 查看和修改。无需部署外部数据库或云端记忆服务；Dashboard 是在本机运行的 Node.js 服务。

## 能做什么

| 能力 | 用法 |
| --- | --- |
| 个人记忆 | 保存称呼、语言、个人资料、反思与决定，相关时读取 |
| 任务与日程 | 管理待办、会议和时间块；带时间的待办仍是任务，不自动复制进日历 |
| 项目上下文 | 在项目仓库保存状态、技术决定和开发待办，大脑只保留索引 |
| 人脉与地点 | 记录联系人、关系、互动及相关地点 |
| 知识库 | 收藏链接、碎片和附件，索引自己的笔记与研究材料 |
| 日记与回顾 | 查看活动记录，整理近期工作和已保存的信息 |

例如，你可以对已接入的 Agent 说：

```text
以后用中文回复我。
明天上午9点提醒我发材料。
把这个链接收藏起来，标注“面试参考”。
记住这个项目，再告诉我目前做到哪里了。
```

实际读写由 Agent 的文件/命令工具执行。效果取决于工具是否加载规则、能否访问大脑，以及是否正确执行操作；仅安装文件不会强制模型遵守规则。

![Loci Dashboard](docs/assets/dashboard-preview.png)

## 快速开始

需要 Node.js 18 或以上版本，以及能够访问本地文件和执行命令的 Agent。

### 安装向导

```bash
npx create-loci
```

浏览器向导创建大脑并提供 Claude Code、Codex、WorkBuddy 的接入选项。喜欢终端向导，可以使用：

```bash
npx create-loci --cli
```

Windows 可从 PowerShell 或命令提示符运行浏览器向导；可选终端向导及 Shell 脚本使用 WSL/Git Bash。

### 让 Agent 帮你安装

把下面的话发给 Claude Code 或 Codex：

```text
帮我安装 Loci：https://github.com/codesstar/loci
克隆仓库后，按照 docs/AI-INSTALL.md 完成安装并核对接入结果。
```

### 手动安装（macOS / Linux / WSL / Git Bash）

```bash
git clone https://github.com/codesstar/loci.git ~/loci
cd ~/loci
./setup.sh
```

自动化安装参数见 `./setup.sh --help` 与 [AI 安装说明](docs/AI-INSTALL.md)。完整使用步骤见 [入门指南](docs/getting-started.zh-CN.md)。

### 打开 Dashboard

安装后运行 `loci`。也可以在大脑目录中直接启动：

```bash
node .loci/dashboard/server.js
```

浏览器打开 [localhost:8765](http://localhost:8765)。本地服务需要保持运行，相关界面与提醒功能才能工作；保存了提醒不代表设备已经收到通知。

## 多 Agent 怎样共用记忆

仓库提供 Claude Code、Codex、WorkBuddy 的接入代码。各工具的指令加载位置、Hook 支持和权限不同；换工具时，要确认它连接的是同一个大脑，且可以访问其中的数据和所需命令。

```text
Claude Code / Codex / WorkBuddy
              │
        规则入口与读写工具
              │
   同一份本地记忆、任务与知识资料
              ▲
          Dashboard
```

启动提供轻量上下文，其余内容按请求读取；不会把全部历史记录都放进每次对话。项目完整记忆留在对应仓库，大脑通过索引找到它。

## 数据与隐私

文件保存在你的机器上，可以备份、查看和迁移。Loci 不要求把记忆存到独立的云端记忆服务。Agent 调用模型、联网或使用其他工具时，数据处理仍遵循你所用 Agent 与服务的配置；本地存储不等于模型调用完全离线。

这是 MIT 开源项目；使用的模型或第三方服务可能另行收费。

## 文档与贡献

- [中文入门指南](docs/getting-started.zh-CN.md) · [English guide](docs/getting-started.md)
- [AI 安装说明](docs/AI-INSTALL.md)
- [Dashboard](docs/dashboard.md) · [API](docs/api.md)
- [示例大脑](examples/alex/)
- [参与贡献](CONTRIBUTING.md) · [MIT License](LICENSE)

欢迎通过 [Issues](https://github.com/codesstar/loci/issues) 提交可复现的问题和建议，或提交 Pull Request。
