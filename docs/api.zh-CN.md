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

添加任务到 `tasks/active.md`。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `text` | string | 是 | — | 任务文本 |
| `priority` | string | 否 | `P1` | 目标分区: `P0`, `P1`, `P2`, `P3` |

```bash
curl -X POST http://localhost:8765/api/tasks/add \
  -H 'Content-Type: application/json' \
  -d '{"text":"买菜","priority":"P0"}'
```

### POST /api/tasks/toggle

切换任务完成状态。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task` | string | 是 | 任务文本（精确匹配） |
| `checked` | boolean | 是 | `true` = `[x]`, `false` = `[ ]` |

### POST /api/tasks/move

在优先级分区之间移动任务。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task` | string | 是 | 任务文本（精确匹配） |
| `from` | string | 否 | 来源: `P0`-`P3` 或 `done` |
| `to` | string | 是 | 目标: `P0`-`P3` 或 `done` |

- `to: "done"` → 标记 `[x]`，留在原分区
- `from: "done"` → 取消 `[x]`，移到目标分区

---

## 日计划

### POST /api/daily/add-task

添加任务到日计划文件。文件不存在会自动创建。

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
| `time` | string | 否 | `HH:MM` 格式 |

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

## 错误处理

除 404（未知路由）外，所有错误返回 HTTP 200 + 错误体:

```json
{"error": "Task not found: 买菜"}
{"error": "Missing task text"}
{"error": "Invalid JSON: Unexpected token ..."}
```
