# Dashboard data.json Schema

> Source of truth for the dashboard's data format. The AI maintains `data.json` directly — no build script needed.
> When content files change, update the relevant section of `data.json` to match.

## Top-level Structure

```json
{
  "config": { ... },
  "plan": { ... },
  "inbox": { ... },
  "me": { ... },
  "tasks": { ... },
  "planning": { ... },
  "people": { ... },
  "decisions": [ ... ],
  "finance": { ... },
  "content": { ... },
  "learning": [ ... ],
  "links": [ ... ],
  "references": { ... },
  "network": { ... },
  "stats": { ... },
  "build_time": "YYYY-MM-DD HH:MM:SS"
}
```

## Section Details

### config

```json
{
  "title": "Loci Dashboard",
  "username": "User",
  "description": "Memory Palace for AI"
}
```

| Field | Type | Description |
|-------|------|-------------|
| title | string | Dashboard title shown in header |
| username | string | User's display name |
| description | string | Tagline / subtitle |

### plan

Rendered HTML from `plan.md`. Used in the Plan page.

```json
{
  "meta": { "created": "", "updated": "", "status": "active" },
  "content": "<h1>Life Direction</h1><p>...</p>",
  "filename": "plan.md",
  "path": "plan.md"
}
```

| Field | Type | Description |
|-------|------|-------------|
| meta | object | YAML frontmatter fields (created, updated, status, tags, etc.) |
| content | string | Markdown body converted to HTML |
| filename | string | File basename |
| path | string | Relative path from brain root |

### inbox

```json
{
  "content": "<h1>Inbox</h1><p>...</p>",
  "meta": { "updated": "" },
  "items": []
}
```

| Field | Type | Description |
|-------|------|-------------|
| content | string | HTML-rendered inbox content |
| meta | object | Frontmatter from inbox.md |
| items | array | Reserved for structured inbox items (currently unused) |

### me

Personal identity, values, learning, and growth history.

```json
{
  "identity": { "meta": {}, "content": "...", "filename": "identity.md", "path": "me/identity.md" },
  "goals": { "meta": {}, "content": "...", "filename": "goals.md", "path": "me/goals.md" },
  "values": { "meta": {}, "content": "...", "filename": "values.md", "path": "me/values.md" },
  "learned": { "meta": {}, "content": "...", "filename": "learned.md", "path": "me/learned.md" },
  "evolution": { "meta": {}, "content": "...", "filename": "evolution.md", "path": "me/evolution.md" },
  "evolution_entries": [
    { "date": "2026-01-15", "type": "Identity shift", "content": "<p>...</p>" }
  ]
}
```

Each sub-field (identity, goals, values, learned, evolution) follows the standard file object format:

| Field | Type | Description |
|-------|------|-------------|
| meta | object | YAML frontmatter (created, updated, tags, status) |
| content | string | HTML-rendered markdown body |
| filename | string | File basename |
| path | string | Relative path from brain root |

**evolution_entries** is a parsed array from `me/evolution.md`:

| Field | Type | Description |
|-------|------|-------------|
| date | string | ISO date (YYYY-MM-DD) |
| type | string | Category of change (e.g. "Identity shift", "Value update") |
| content | string | HTML-rendered description |

### tasks

```json
{
  "active": { "meta": {}, "content": "...", "filename": "active.md", "path": "tasks/active.md" },
  "someday": { "meta": {}, "content": "...", "filename": "someday.md", "path": "tasks/someday.md" },
  "active_tasks": {
    "P0": [
      { "text": "Task description", "done": false }
    ],
    "P1": [],
    "P2": [],
    "P3": []
  },
  "finished": []
}
```

**active_tasks** is the structured parse of `tasks/active.md`:

| Field | Type | Description |
|-------|------|-------------|
| P0-P3 | array | Tasks grouped by priority. P0 = drop everything, P3 = nice to have |

Each task item:

| Field | Type | Description |
|-------|------|-------------|
| text | string | Task description (plain text) |
| done | boolean | Whether the task is completed |

**finished** is an optional array of completed tasks (same format as task items).

### planning

```json
{
  "daily": [ { "meta": {}, "content": "...", "filename": "2026-03-15.md", "path": "tasks/daily/2026-03-15.md" } ],
  "monthly": [],
  "quarterly": [],
  "reviews": [],
  "journal": [ { "meta": { "date": "2026-03-15", "type": "journal" }, "content": "...", "filename": "2026-03-15.md", "path": "tasks/journal/2026-03-15.md" } ],
  "calendar_events": {}
}
```

| Field | Type | Description |
|-------|------|-------------|
| daily | array | Daily plan file objects, sorted by date |
| monthly | array | Monthly plan file objects |
| quarterly | array | Quarterly plan file objects |
| reviews | array | Review file objects |
| journal | array | Journal entry file objects (exclude buffer.md). Each must have `meta.date` and `meta.type: "journal"` |
| calendar_events | object | Calendar data from `tasks/calendar.json` |

### people

```json
{
  "contacts": [ { "meta": { "created": "", "updated": "", "tags": [], "status": "active" }, "content": "...", "filename": "name.md", "path": "people/name.md" } ],
  "meetings": [ { "meta": { "date": "", "attendees": [], "type": "call", "tags": [] }, "content": "...", "filename": "2026-03-10-topic.md", "path": "people/meetings/2026-03-10-topic.md" } ]
}
```

### decisions

Array of file objects, sorted by date (newest first):

```json
[
  {
    "meta": { "date": "2026-03-10", "tags": ["strategy"], "status": "active" },
    "content": "<h1>Decision Title</h1><p>...</p>",
    "filename": "2026-03-10-slug.md",
    "path": "decisions/2026-03-10-slug.md"
  }
]
```

### finance

```json
{
  "files": [ { "meta": {}, "content": "...", "filename": "budget.md", "path": "finance/budget.md" } ]
}
```

### content

```json
{
  "files": [ { "meta": {}, "content": "...", "filename": "draft.md", "path": "content/draft.md" } ],
  "platforms": {
    "brands": [ { "name": "Brand Name" } ],
    "accounts": [
      { "platform": "Twitter", "name": "@handle", "content": "Tech", "frequency": "Daily", "status": "active" }
    ]
  }
}
```

### learning

Array of file objects from `content/learning/`, sorted by date (newest first):

```json
[
  { "meta": { "date": "2026-03-10", "tags": ["rust"] }, "content": "...", "filename": "rust-basics.md", "path": "content/learning/rust-basics.md" }
]
```

### links

Array of connected sub-projects from `.loci/links/`:

```json
[
  {
    "name": "project-name",
    "path": "/absolute/path/to/project",
    "is_symlink": true,
    "profile": {},
    "profile_content": "",
    "recent_activity": 3,
    "has_to_hq": true,
    "has_from_hq": true
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | Directory name under `.loci/links/` |
| path | string | Absolute path (resolved if symlink) |
| is_symlink | boolean | Whether the link is a symlink |
| profile | object | Frontmatter from `profile.md` |
| profile_content | string | HTML content from `profile.md` |
| recent_activity | number | Count of date-stamped entries in `to-hq.md` |
| has_to_hq | boolean | Whether `to-hq.md` exists |
| has_from_hq | boolean | Whether `from-hq.md` exists |

### network

Used by the Brain visualization page. Optional — dashboard shows defaults if missing.

```json
{
  "nodes": [
    { "id": "project-name", "type": "project", "label": "Project Name" }
  ],
  "memories": 164,
  "connections": 21,
  "days_active": 16
}
```

| Field | Type | Description |
|-------|------|-------------|
| nodes | array | Network graph nodes (projects, concepts, etc.) |
| memories | number | Total memory count for display |
| connections | number | Total connection count for display |
| days_active | number | Days since brain was created |

### stats

```json
{
  "total_files": 50,
  "total_tasks": 4,
  "done_tasks": 1,
  "total_people": 3,
  "total_decisions": 1,
  "total_daily_plans": 1,
  "total_monthly_plans": 0,
  "total_quarterly_plans": 0
}
```

### build_time

ISO-ish timestamp string: `"YYYY-MM-DD HH:MM:SS"`. Update this whenever data.json is modified.

## Standard File Object

Most sections use a common "file object" format:

```json
{
  "meta": { },
  "content": "<p>HTML-rendered markdown body</p>",
  "filename": "example.md",
  "path": "relative/path/example.md"
}
```

- `meta`: All YAML frontmatter key-value pairs. Common keys: `created`, `updated`, `date`, `tags` (array), `status`.
- `content`: The markdown body (after frontmatter) converted to HTML.
- `filename`: Just the file name.
- `path`: Path relative to the brain root directory.

## Notes for AI

- When adding/updating a task, update both `tasks.active.content` (HTML) and `tasks.active_tasks` (structured).
- Journal entries should have `meta.date` (YYYY-MM-DD) and `meta.type: "journal"`.
- Keep `stats` in sync: recount when adding/removing tasks, people, decisions, etc.
- Update `build_time` to current timestamp on every edit.
- All `content` fields contain HTML, not raw markdown.
- Fields the dashboard accesses with optional chaining (`?.`) are safe to omit — they'll fall back to defaults.
