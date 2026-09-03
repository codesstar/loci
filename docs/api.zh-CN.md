---
date: 2026-03-19
---

# Loci Dashboard API 文档

基础 URL: `http://localhost:8765`

所有 POST 端点接受 `Content-Type: application/json`。
成功响应: `{"ok": true, ...}`。错误响应: `{"error": "message"}`。

---

## GET /api/data

返回完整的 live brain 状态。Dashboard 渲染的就是它，API 工作流也从这里读。

**响应字段**: `config`, `plan`, `inbox`, `me`, `tasks`, `planning`, `people`, `decisions`, `finance`, `content`, `learning`, `links`, `references`, `notes`, `projects`, `stats`, `build_time`

```bash
curl http://localhost:8765/api/data
```

---

## 任务管理

### POST /api/tasks/add

添加任务到 `tasks/tasks.json`，并重新生成 `tasks/active.md`。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `text` | string | 是 | — | 任务文本 |
| `date` | string | 否 | `null` | 计划日期，`YYYY-MM-DD` |
| `startTime` | string | 否 | `null` | 可选开始时间，`HH:MM` |
| `endTime` | string | 否 | `null` | 可选结束时间，`HH:MM` |
| `project` | string | 否 | `null` | 关联项目 |
| `source` | string | 否 | `dashboard` | 来源 |

```bash
curl -X POST http://localhost:8765/api/tasks/add \
  -H 'Content-Type: application/json' \
  -d '{"text":"买菜","date":"2026-05-31"}'
```

### POST /api/tasks/toggle

切换任务完成状态。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 推荐 | 稳定任务 id |
| `task` | string | 兜底 | 任务文本（精确匹配） |
| `checked` | boolean | 是 | `true` = `[x]`, `false` = `[ ]` |

### POST /api/tasks/move

修改任务状态。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 推荐 | 稳定任务 id |
| `task` | string | 兜底 | 任务文本（精确匹配） |
| `to` | string | 是 | `open`, `done`, 或 `archived` |

- `to: "done"` → 写入完成时间
- `to: "open"` → 取消完成状态
- `to: "archived"` → 从常规启动/看板流里隐藏，但保留历史

---

## 日计划

### POST /api/daily/add-task

添加一条日记/日计划 checklist。这里不是任务数据库；真正任务请使用 `/api/tasks/add`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 是 | `YYYY-MM-DD` 格式 |
| `task` | string | 是 | 任务文本 |

### POST /api/daily/toggle

切换日计划任务完成状态。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 是 | `YYYY-MM-DD` 格式 |
| `taskText` | string | 是 | 任务文本（精确匹配） |
| `done` | boolean | 是 | 新状态 |

### POST /api/daily/remove-task

从日计划中删除任务。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 是 | `YYYY-MM-DD` 格式 |
| `task` | string | 是 | 任务文本（精确匹配） |

### POST /api/daily/save

保存日计划完整内容。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 是 | `YYYY-MM-DD` 格式 |
| `content` | string | 是 | 完整 Markdown 内容 |

---

## 日历

### POST /api/calendar/add

添加日程事件（一块被占用的时间）到 `tasks/calendar.json`。

任务和日程是分开的：带时间的任务只存在于 `tasks/tasks.json`，**不会自动投影**到日历——dashboard 的提醒直接读任务池里的带时间任务。只有纯日程项，或用户刻意把任务拉上日程时，才调用这个端点。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 事件标题 |
| `date` | string | 是 | `YYYY-MM-DD` 格式 |
| `startMin` | number | 否 | 从当天 0 点开始计算的开始分钟（默认 540） |
| `endMin` | number | 否 | 从当天 0 点开始计算的结束分钟（默认开始 + 60） |
| `allDay` | boolean | 否 | 全天事件（可配 `startDate` / `endDate`） |
| `location` | string | 否 | 地点 |
| `note` | string | 否 | 备注 |
| `fromTask` | boolean | 否 | 仅当用户刻意把任务拉上日程时为 `true` |
| `taskId` | string | 否 | `fromTask` 为 true 时关联的任务 id |

---

## Journal

### POST /api/journal/save

保存 Journal 条目。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 是 | `YYYY-MM-DD` 格式 |
| `content` | string | 是 | Markdown 内容 |

---

## 收件箱

### POST /api/inbox/add

添加条目到 `inbox.md`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `text` | string | 是 | 条目文本 |

---

## 周/月计划

### POST /api/plan/save

保存周计划或月计划项目。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | `week` 或 `month` |
| `key` | string | 是 | 周: `YYYY-MM-DD`（周一）。月: `YYYY-MM` |
| `items` | array | 是 | `{text, done}` 对象数组 |

### POST /api/plan/load

加载周计划或月计划项目。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | `week` 或 `month` |
| `key` | string | 是 | 同 save 格式 |

---

## Journal 笔记

### POST /api/journal/save-notes

持久化个人日志笔记（之前仅存 localStorage）。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 是 | `YYYY-MM-DD` 格式 |
| `notes` | array | 是 | `{id, name, content}` 对象数组 |

### POST /api/journal/load-notes

加载指定日期的个人日志笔记。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `date` | string | 是 | `YYYY-MM-DD` 格式 |

---

## 其他端点

server 还提供以下端点组：任务（`/api/tasks/reorder`、`/api/tasks/update-detail`）、收件箱（`/api/inbox/remove`）、收藏（`/api/references/add`、`/api/references/remove`）、笔记（`/api/notes/*`——raw、save、create、delete、import、目录管理、source mount/unmount）、人脉（`/api/people/add`、`/api/people/update`、`/api/people/avatar`）、项目（`/api/project/connect`、`/api/project/open`、`/api/project/browse`、`/api/project/disconnect`）。以 `.loci/dashboard/server.js` 里的实现为准。

---

## 碎片（Scraps）

用户"捡来"的一切：文字、链接、摘录、图片、文件，实时读自 `references/`（外加旧的 `inbox.md` 行）。实现在 `lib/scraps.js` + `lib/routes/scraps.js`。

- `GET /api/scraps` → `{ items, total, tags, pending, enrich }`，`items` 最新在前；`/api/data` 的 `scraps` 字段是同一份。
- `POST /api/scraps/add` → `{ text?, url?, title?, tags?, note?, kind?, by?, file?: { name, type, data: dataURL }, source? }`，给 text / url(s) / file(s) 任一即可，`urls` / `files` 数组可以让几个链接或附件同在一条；text 是这条的正文（保留分段），文字里的网址自动拆成链接块，`#标签` 自动拆出；note 是标注，只来自显式传入，不从正文推断。立刻返回 `{ ok, item }`，标题抓取和 AI 标签在后台补，补完通过实时刷新流通知页面。
- `POST /api/scraps/update` → `{ id, title?, note?, tags?, aiTags?, acceptTag?, acceptAll?, kind?, text?, url?, by? }`；编辑旧的 inbox 行会把它变成文件（返回的 id 会变）。
- `POST /api/scraps/remove` → `{ id }`，文件（含附件）移入 `archive/references/`。
- `POST /api/scraps/enrich` → `{ id }` 重新抓标题 + AI 打标签；`GET /api/scraps/status` 看队列。
- `GET /scrap-files/<name>` → 碎片附带的图片 / PDF（`references/files/`）。

---

## 错误处理

除 404（未知路由）外，所有错误返回 HTTP 200 + 错误体:

```json
{"error": "Task not found: 买菜"}
{"error": "Missing task text"}
{"error": "Invalid JSON: Unexpected token ..."}
```
