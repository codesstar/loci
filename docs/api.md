---
date: 2026-03-19
---

# Loci Dashboard API

Base URL: `http://localhost:8765`

All POST endpoints accept `Content-Type: application/json`.
Success response: `{"ok": true, ...}`. Error response: `{"error": "message"}`.

---

## GET /api/data

Returns the full brain state. Called by Dashboard every 5 seconds.

**Response keys**: `config`, `plan`, `inbox`, `me`, `tasks`, `planning`, `people`, `decisions`, `finance`, `content`, `learning`, `links`, `references`, `stats`, `build_time`

```bash
curl http://localhost:8765/api/data
```

---

## Tasks

### POST /api/tasks/add

Add a task to `tasks/tasks.json` and regenerate `tasks/active.md`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | yes | — | Task text |
| `date` | string | no | `null` | Intended date in `YYYY-MM-DD` format |
| `startTime` | string | no | `null` | Optional `HH:MM` start time |
| `endTime` | string | no | `null` | Optional `HH:MM` end time |
| `project` | string | no | `null` | Related project |
| `source` | string | no | `dashboard` | Source of the task |

```bash
curl -X POST http://localhost:8765/api/tasks/add \
  -H 'Content-Type: application/json' \
  -d '{"text":"Buy groceries","date":"2026-05-31"}'
```

### POST /api/tasks/toggle

Toggle a task's completion state in `tasks/tasks.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | recommended | Stable task id |
| `task` | string | fallback | Task text (exact match) |
| `checked` | boolean | yes | `true` = `[x]`, `false` = `[ ]` |

```bash
curl -X POST http://localhost:8765/api/tasks/toggle \
  -H 'Content-Type: application/json' \
  -d '{"id":"task_20260530_001","checked":true}'
```

### POST /api/tasks/move

Change a task status.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | recommended | Stable task id |
| `task` | string | fallback | Task text (exact match) |
| `to` | string | yes | `open`, `done`, or `archived` |

- `to: "done"` → sets `completedAt`
- `to: "open"` → clears `completedAt`
- `to: "archived"` → hides from normal startup/dashboard flow while keeping history

```bash
curl -X POST http://localhost:8765/api/tasks/move \
  -H 'Content-Type: application/json' \
  -d '{"id":"task_20260530_001","to":"archived"}'
```

---

## Daily Plans

### POST /api/daily/add-task

Add a checklist line to a daily note. This is for notes/reviews, not the canonical task database. Real tasks should use `/api/tasks/add`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | Date in `YYYY-MM-DD` format |
| `task` | string | yes | Task text |

```bash
curl -X POST http://localhost:8765/api/daily/add-task \
  -H 'Content-Type: application/json' \
  -d '{"date":"2026-03-19","task":"Morning run"}'
```

### POST /api/daily/toggle

Toggle a task in a daily plan file.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | Date in `YYYY-MM-DD` format |
| `taskText` | string | yes | Task text (exact match) |
| `done` | boolean | yes | New state |

### POST /api/daily/remove-task

Remove a task from a daily plan file.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | Date in `YYYY-MM-DD` format |
| `task` | string | yes | Task text (exact match) |

### POST /api/daily/save

Save the full content of a daily plan file.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | Date in `YYYY-MM-DD` format |
| `content` | string | yes | Full markdown content |

---

## Calendar

### POST /api/calendar/add

Add a calendar event to `tasks/calendar.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Event title |
| `date` | string | yes | Date in `YYYY-MM-DD` format |
| `startMin` | number | no | Start minutes from midnight |
| `endMin` | number | no | End minutes from midnight |
| `fromTask` | boolean | no | `true` when this event is a task projection |
| `taskId` | string | no | Related task id when `fromTask` is true |

---

## Journal

### POST /api/journal/save

Save a journal entry.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | Date in `YYYY-MM-DD` format |
| `content` | string | yes | Journal markdown content |

---

## Inbox

### POST /api/inbox/add

Add an item to `inbox.md`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | yes | Inbox item text |

---

## Week/Month Plans

### POST /api/plan/save

Save week or month plan items.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | `week` or `month` |
| `key` | string | yes | Week: `YYYY-MM-DD` (Monday). Month: `YYYY-MM` |
| `items` | array | yes | Array of `{text, done}` objects |

```bash
curl -X POST http://localhost:8765/api/plan/save \
  -H 'Content-Type: application/json' \
  -d '{"type":"week","key":"2026-03-16","items":[{"text":"Ship README","done":false}]}'
```

### POST /api/plan/load

Load week or month plan items.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | `week` or `month` |
| `key` | string | yes | Same key format as save |

---

## Journal Notes

### POST /api/journal/save-notes

Persist personal log notes (previously localStorage-only).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | `YYYY-MM-DD` format |
| `notes` | array | yes | Array of `{id, name, content}` objects |

### POST /api/journal/load-notes

Load personal log notes for a date.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | yes | `YYYY-MM-DD` format |

---

## Error Handling

All errors return HTTP 200 with an error body (except 404 for unknown routes):

```json
{"error": "Task not found: Buy groceries"}
{"error": "Missing task text"}
{"error": "Invalid JSON: Unexpected token ..."}
```
