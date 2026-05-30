# Synapse — Signal-Driven Memory

## What Is Synapse?

Synapse is Loci's signal-driven memory behavior: AI watches conversation turns for information that will make future collaboration more useful, then writes it to the right local place.

The project-memory principle is:

> Loci aggregates memory, it does not own it.

The brain is an index and understanding layer. A project's full memory belongs to the project's own repo.

## Signal Detection

| Signal | Destination |
|---|---|
| Task | Guarded task writer → `tasks/tasks.json` |
| Schedule/time block | Guarded task writer/API → `tasks/calendar.json` |
| Brain-level decision | `decisions/YYYY-MM-DD-slug.md` |
| Personal preference/fact | `me/` |
| External material | `references/` |
| Project-shaped idea, not serious yet | `projects/side.md` |
| Serious project state | Project repo `.loci/memory.md` |
| Serious project decision | Project repo `.loci/decisions/` |
| Cross-project insight/milestone | Brain `projects/index.md` one-line index |

No signal = no save.

## Project Memory

When a project becomes serious, AI offers once at the end of a conversation to leave memory in that repo. If the user says yes, it creates:

```text
project-repo/
├── CLAUDE.md
└── .loci/
    ├── memory.md
    └── decisions/
```

The brain keeps only:

```text
projects/index.md
```

with one short entry pointing to the repo and its `.loci/memory.md`.

## What Gets Indexed In The Brain

Normal project detail stays local.

Only summaries with durable value outside the repo should update `projects/index.md`:
- `[insight]`
- `[milestone]`
- a brain-level decision link, only when explicitly promoted

## Manual Trigger

Run `/loci-sync` anytime to force a distillation pass:

```text
/loci-sync              → distill current conversation
/loci-sync --local      → save locally only
/loci-sync --dry-run    → preview what would be saved
```

## Notification Format

After each auto-save, show a short natural confirmation:

```text
Got it — added task "Update API docs"
Noted — recorded the database decision in this project
记住了：这个项目已经进入 MVP 阶段。
```

Do not expose internal paths unless the user asks.
