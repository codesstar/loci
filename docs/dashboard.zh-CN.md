# Dashboard — 本地可视化面板

Dashboard 是 Loci 的本地网页界面。它不是独立系统，也不是云服务，而是同一套本地大脑文件的可视化窗口。

## 启动

在大脑目录运行：

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

## 当前主题

当前默认入口 `/` 使用 Clean dashboard：

```text
http://127.0.0.1:8765/
```

`/clean` 是同一个页面的别名：

```text
http://127.0.0.1:8765/clean
```

Clean dashboard 是当前对外展示的主体验：浅色、克制、单一绿色强调色，带入口引导和中文 / English 语言选择。

重要区别：Clean 页面目前是安全 demo 版本，内置完整测试数据，页面内的改动只停留在浏览器会话里，不会写真实 brain 文件。这样它可以放心用于截图、公开演示、黑客松评审和 onboarding 讲解。

旧的 sci-fi dashboard 仍保留：

```text
http://127.0.0.1:8765/sci
```

`server.js` 同时保留真实本地 API，用于任务、日程、日志、笔记和项目 todo 等 live workflow。

## Clean demo 数据覆盖

`/clean` 的 mock 数据不是空壳，而是一套完整示例 brain：

- 5 个连接项目，每个都有 repo、项目记忆摘要和项目本地 todos
- 16 条 Notes，覆盖 Obsidian、本地 vault、飞书、Notion 和内置 Markdown 笔记
- 30 条 Tasks，包含 open / done / stale、日期、时间、项目归属和优先级
- 一周发布节奏的 Journal，包含日记、周总结、月主线
- Calendar 同时展示纯日程和带时间任务的投影
- Overview 里的 active tasks、done this week、memory mix、recent notes、project progress 都与 mock 数据对齐
- People、Decisions、References、Fragments、Memory 都有可展示样例

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
- 没时间的任务只在任务池
- 有具体时间的任务会投影到日程
- 纯日程只在日程里，不会进入任务池

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

- 不要再使用旧的 `server.py`。它缺少当前任务和日程 API。
- 不需要运行 `build.py` 生成 `data.json`。当前 server 会按请求读取文件。
- Dashboard 是本地开发/个人使用工具，不会把数据发到云端。
- 如果页面没有数据，优先检查本地数据文件是否为空，而不是前端是否坏了。

## 相关文档

- [项目总览](project-overview.zh-CN.md)
- [API 文档](api.zh-CN.md)
- [快速上手](getting-started.zh-CN.md)
