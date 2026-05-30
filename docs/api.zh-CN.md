---
date: 2026-03-19
---

# Loci Dashboard API 文档

基础 URL: `http://localhost:8765`

所有 POST 端点接受 `Content-Type: application/json`。
成功响应: `{"ok": true, ...}`。错误响应: `{"error": "message"}`。

---

## GET /api/data

返回完整的 brain 状态。Dashboard 每 5 秒调用一次。

**响应字段**: `config`, `plan`, `inbox`, `me`, `tasks`, `planning`, `people`, `decisions`, `finance`, `content`, `learning`, `links`, `references`, `stats`, `build_time`

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

添加日历事件到 `tasks/calendar.json`。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 事件标题 |
| `date` | string | 是 | `YYYY-MM-DD` 格式 |
| `startMin` | number | 否 | 从当天 0 点开始计算的开始分钟 |
| `endMin` | number | 否 | 从当天 0 点开始计算的结束分钟 |
| `fromTask` | boolean | 否 | 是否来自任务投影 |
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

## 错误处理

除 404（未知路由）外，所有错误返回 HTTP 200 + 错误体:

```json
{"error": "Task not found: 买菜"}
{"error": "Missing task text"}
{"error": "Invalid JSON: Unexpected token ..."}
```
