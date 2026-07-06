# Dashboard — Local Visual Console

The Loci dashboard is a local web interface for exploring the memory palace. It shows the same system your AI uses: tasks, schedules, journal entries, personal memory, notes, people, connected projects, decisions, loose fragments, and references.

It is not a hosted product and it does not introduce a separate database. The dashboard server reads and writes local Markdown / JSON files through a small Node.js API.

## Start

From anywhere (the `loci` command is installed by setup):

```bash
loci
```

This starts the server if needed and opens the dashboard in your browser. `loci stop` shuts it down. Equivalent manual start, from the brain directory:

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
| `/` | The dashboard |
| `/clean` | Alias for `/`, kept for old links |
| `/api/data` | Full local brain JSON used by dashboard workflows |

The dashboard uses a calm light theme, a single emerald accent, first-run onboarding, and a Chinese / English language selector.

The local dashboard reads and writes your real brain files through the Node server and API. There is no separate demo dataset in the local dashboard — what you see is what your brain contains.

## Public Demo

If you want to explore Loci without exposing (or before creating) a real brain, use the hosted demo on the website (`site/demo` in this repo). It is a self-contained page with a rich sample dataset that looks like a real Loci brain — connected projects, notes, tasks, journal entries, people, decisions, and references — and keeps all in-page edits local to the browser session.

The public demo is useful for:

- README screenshots
- hackathon / product demos
- design review
- explaining Loci without requiring a user to expose their real files

## Live Data Sources

The dashboard server builds its data from the local brain at request time:

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
- A task with a date — or even a specific time — still lives only in the task database. It is never auto-projected onto the calendar; the dashboard reminder reads timed tasks straight from the task pool.
- A schedule-only event does not become a task unless the user explicitly asks for that.
- Pulling a task onto the schedule is a deliberate action, not automatic.

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

- Run the dashboard with `node .loci/dashboard/server.js`. The server builds data from local files at request time — there is no build step and no generated data file.
- Live writes should go through the server API or guarded writer scripts.
- The local dashboard writes to your real brain files. For screenshots and public demos, use the hosted demo (`site/demo`) instead.
- If a page looks empty, first check whether the corresponding local data files are empty.

## Related Docs

- [Getting Started](getting-started.md)
- [How It Works](how-it-works.md)
- [API](api.md)
- [Project Overview](project-overview.zh-CN.md)
