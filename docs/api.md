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

Add a task to `tasks/active.md`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | yes | — | Task text |
| `priority` | string | no | `P1` | Target section: `P0`, `P1`, `P2`, `P3` |

```bash
curl -X POST http://localhost:8765/api/tasks/add \
  -H 'Content-Type: application/json' \
  -d '{"text":"Buy groceries","priority":"P0"}'
```

### POST /api/tasks/toggle

Toggle a task's checked state in `tasks/active.md`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | yes | Task text (exact match) |
| `checked` | boolean | yes | `true` = `[x]`, `false` = `[ ]` |

```bash
curl -X POST http://localhost:8765/api/tasks/toggle \
  -H 'Content-Type: application/json' \
  -d '{"task":"Buy groceries","checked":true}'
```

### POST /api/tasks/move

Move a task between priority sections or to/from done.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `task` | string | yes | Task text (exact match) |
| `from` | string | no | Source: `P0`-`P3` or `done` |
| `to` | string | yes | Target: `P0`-`P3` or `done` |

- `to: "done"` → marks `[x]`, keeps in `from` section
- `from: "done"` → marks `[ ]`, moves to `to` section

```bash
curl -X POST http://localhost:8765/api/tasks/move \
  -H 'Content-Type: application/json' \
  -d '{"task":"Buy groceries","from":"P0","to":"P1"}'
```

---

## Daily Plans

### POST /api/daily/add-task

Add a task to a daily plan file. Creates the file if it doesn't exist.

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
| `time` | string | no | Time in `HH:MM` format |

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

## Error Handling

All errors return HTTP 200 with an error body (except 404 for unknown routes):

```json
{"error": "Task not found: Buy groceries"}
{"error": "Missing task text"}
{"error": "Invalid JSON: Unexpected token ..."}
```
