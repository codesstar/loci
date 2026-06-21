# Dashboard — Local Visual Console

The Loci dashboard is a local web interface for exploring the memory palace. It shows the same system your AI uses: tasks, schedules, journal entries, personal memory, notes, people, connected projects, decisions, loose fragments, and references.

It is not a hosted product and it does not introduce a separate database. The dashboard server reads and writes local Markdown / JSON files through a small Node.js API.

## Start

Run this from the brain directory:

```bash
node .loci/dashboard/server.js
```

Default URL:

```text
http://127.0.0.1:8765/
```

If the port is already in use:

```bash
PORT=8877 node .loci/dashboard/server.js
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Clean dashboard, current default |
| `/clean` | Alias for the Clean dashboard |
| `/sci` | Original sci-fi dashboard |
| `/api/data` | Full local brain JSON used by live dashboard workflows |

The Clean dashboard is the current public-facing experience. It uses a calm light theme, a single emerald accent, first-run onboarding, and a Chinese / English language selector.

Important: the Clean route is intentionally self-contained for demos. It ships with a rich mock dataset and keeps in-page edits local to the browser session, so screenshots and public demos cannot accidentally mutate a real brain.

The Node server and API remain the live integration layer for real task, schedule, journal, note, and project writes.

## What The Clean Demo Shows

The demo dataset is meant to look like a real Loci brain, not an empty template:

- 5 connected projects, each with repo context, memory summary, and project-local todos
- 16 notes across Obsidian, Feishu, Notion, and inline Markdown notes
- 30 tasks with open / done / stale states, priorities, dates, times, and project links
- Journal entries for a launch week, plus weekly and monthly summaries
- Calendar events that distinguish schedule-only blocks from timed task projections
- Overview stats for active tasks, completed work, decisions, notes, memory mix, and project progress
- People, decisions, references, fragments, and personal memory examples

This makes `/clean` useful for:

- README screenshots
- hackathon / product demos
- design review
- validating empty-state and onboarding behavior
- explaining Loci without requiring a user to expose their real files

## Live Data Sources

When the dashboard server builds live data, it reads from the local brain:

| Area | Source |
|---|---|
| Tasks | `tasks/tasks.json` |
| Schedule | `tasks/calendar.json` |
| Active task cache | `tasks/active.md` |
| Journal | `tasks/journal/` |
| Memory | `me/identity.md`, `me/values.md`, `me/learned.md`, `me/evolution.md`, `plan.md` |
| People | `people/` |
| Projects | `projects/index.md` and each project repo's `.loci/memory.md` |
| Project todos | Each project repo's `.loci/todo.json` |
| Notes | `notes/index.md` and `notes/*.md` |
| Fragments | `inbox.md` |
| References | `references/` |
| Decisions | `decisions/` |

## Pages

### Overview

Shows the current state at a glance: today's focus, active task count, completed work trend, memory mix, recent notes, recent decisions, and progress across connected projects.

### Tasks / Schedule

Loci uses a task-first model:

- A task is something to complete.
- A schedule item is occupied time.
- A task with a date still belongs in the task database.
- A task with a specific time is also projected into the calendar.
- A schedule-only event does not become a task unless the user explicitly asks for that.

This keeps the user's mental model simple while still giving the dashboard a timeline view.

### Journal

Journal is the narrative layer: what happened today, what was learned, what was discussed, and what decisions were made. It is not the task database.

### Memory

Renders identity, values, learned lessons, current direction, and growth history from the `me/` files and `plan.md`.

### People

Shows contact cards, relationship strength, role, tags, and context about how each person is connected to the user.

### Projects

Shows connected project memory and repo-local development todos. A serious project's full memory lives in that project's own repo:

```text
<repo>/.loci/
├── memory.md
├── decisions/
└── todo.json
```

The brain keeps only a one-line project index. Loci aggregates memory; it does not own it.

### Notes

Shows the user's own notes, either as external pointers or inline Markdown files:

- Obsidian / local vault path
- Feishu document link
- Notion page link
- Inline short note in `notes/*.md`

For external notes, Loci stores the pointer, title, gist, and tags. The body stays where the user wrote it.

### Fragments

Shows loose ideas, quick captures, and saved references that have not yet become tasks, decisions, or durable notes.

## API

The dashboard server exposes local JSON endpoints. Common write flows should use these endpoints or the guarded scripts, not manual JSON edits.

Task / schedule fallback:

```bash
node scripts/loci-task.js add --title "Write launch notes"
node scripts/loci-task.js schedule --title "Demo review" --date 2026-06-05 --start 10:00 --end 11:00
node scripts/loci-task.js validate
```

Project todo fallback:

```bash
node scripts/loci-projtodo.js add --repo <repo-path> --text "Implement settings page"
node scripts/loci-projtodo.js validate --repo <repo-path>
```

See [API docs](api.md) for endpoint details.

## Implementation Notes

- Use `node .loci/dashboard/server.js`. Do not use the old `server.py`; it is missing current task and schedule endpoints.
- `build.py` / `data.json` are legacy artifacts. The current server builds data from local files at request time.
- The Clean dashboard is safe for demos because it uses mock data and does not write to real brain files.
- Live writes should go through the server API or guarded writer scripts.
- If a page looks empty, first check whether the corresponding local data files are empty.

## Related Docs

- [Getting Started](getting-started.md)
- [How It Works](how-it-works.md)
- [API](api.md)
- [Project Overview](project-overview.zh-CN.md)
