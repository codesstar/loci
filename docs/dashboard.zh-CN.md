# Dashboard — 本地可视化面板

Dashboard 是 Loci 的本地网页界面。它不是独立系统，也不是云服务，而是同一套本地大脑文件的可视化窗口。

## 启动

在任何目录（`loci` 命令由 setup 自动安装）：

```bash
loci
```

它会按需启动服务并自动打开浏览器；`loci stop` 停止服务。等价的手动方式，在大脑目录运行：

```bash
node .loci/dashboard/server.js
```

默认地址：

```text
http://127.0.0.1:8765/
```

如果端口被占用，可以指定端口：

```bash
PORT=8877 node .loci/dashboard/server.js
```

## 路由

| 路由 | 用途 |
|---|---|
| `/` | Dashboard 本体 |
| `/clean` | `/` 的别名，兼容旧链接 |
| `/api/data` | 完整本地 brain JSON |

Dashboard 使用浅色、克制的主题，单一绿色强调色，带入口引导和中文 / English 语言选择。

本地 dashboard 通过 Node server 和 API 直接读写你的真实 brain 文件——没有内置 demo 数据，你看到的就是你的大脑里存的。

## 公开演示

如果想在不暴露（或还没建立）真实大脑的情况下体验 Loci，请用官网上的公开演示页（对应仓库里的 `site/demo`）。它是一个自包含页面，内置一套完整示例 brain 数据——连接项目、笔记、任务、日记、人脉、决策、收藏都有——页面内的改动只停留在浏览器会话里。

公开演示适合：

- README 截图
- 黑客松 / 产品演示
- 设计评审
- 不暴露真实文件地讲解 Loci

## Dashboard 读写什么

Dashboard server 的真实数据层直接读写本地大脑文件：

| 模块 | 数据源 |
|---|---|
| Tasks | `tasks/tasks.json` |
| Schedule | `tasks/calendar.json` |
| Active task cache | `tasks/active.md` |
| Journal | `tasks/journal/` |
| Memory | `me/identity.md`, `me/values.md`, `me/learned.md`, `me/evolution.md`, `plan.md` |
| People | `people/` |
| Roadmap | 已连接项目的 `.loci/todo.json` |
| Notes | `notes/index.md` 和 `notes/*.md` |
| Fragments | `inbox.md`, `references/` |
| Projects | `projects/index.md`, 项目 repo 的 `.loci/memory.md` |

## 页面

### Overview

总览页。展示今日状态、关键指标、记忆概况和最近变化。

### Tasks / Schedule

Loci 现在采用任务优先模型：

- Task = 要完成的事
- Schedule = 占用时间的事
- 任务只在任务池——就算带了具体时间，也不会自动投影到日程；dashboard 的提醒直接读任务池里的带时间任务
- 纯日程只在日程里，不会进入任务池
- 把任务拉上日程是一个刻意动作，不是自动行为

写入时使用本地 API 或 guarded writer，避免 AI 手改 JSON。

### Journal

用于每日复盘、个人记录和 AI 总结。Dashboard 负责展示和编辑，AI 负责在用户要求总结时蒸馏当天内容。

### Memory

展示个人身份、偏好、价值观、经验、成长变化和当前方向。

### People

展示人脉档案、分类、关系强度和联系人详情。

### Roadmap

展示项目开发待办。这里的数据不进入个人任务池，而是来自项目自己的：

```text
<repo>/.loci/todo.json
```

### Notes

展示用户自己的笔记索引。Loci 默认只保存指针、标题、摘要和标签，不复制 Obsidian / 飞书 / Notion 里的完整正文。

### Fragments

展示随手想法、未整理内容和参考材料入口。

## API

Dashboard server 暴露本地 API，用于读写任务、日程、项目 todo、笔记等。常用写入应走 API 或脚本，而不是手动改 JSON。

任务和日程的脚本 fallback：

```bash
node scripts/loci-task.js add --title "任务"
node scripts/loci-task.js schedule --title "会议" --date 2026-06-05 --start 10:00 --end 11:00
node scripts/loci-task.js validate
```

项目 todo 的脚本 fallback：

```bash
node scripts/loci-projtodo.js add --repo <repo-path> --text "实现设置页"
node scripts/loci-projtodo.js validate --repo <repo-path>
```

## 注意事项

- 用 `node .loci/dashboard/server.js` 启动。server 按请求读取本地文件，没有构建步骤，也没有生成的数据文件。
- 本地 dashboard 写的是真实 brain 文件。截图和公开演示请用官网演示页（`site/demo`）。
- Dashboard 是本地工具，不会把数据发到云端。
- 如果页面没有数据，优先检查本地数据文件是否为空，而不是前端是否坏了。

## 相关文档

- [项目总览](project-overview.zh-CN.md)
- [API 文档](api.zh-CN.md)
- [快速上手](getting-started.zh-CN.md)
