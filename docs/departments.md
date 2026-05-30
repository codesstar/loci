# Project Memory — Multi-Project Orchestration

## Overview

Loci no longer treats projects as "departments" that report to a central warehouse.

The current principle is:

> Loci aggregates memory, it does not own it.

A serious project's memory lives in that project's own repo. The Loci brain keeps only a light index so the AI knows the project exists and where to read more.

## Architecture

```text
Loci brain
├── projects/index.md             # One-line index per serious project
└── projects/side.md           # Project embryos, not serious yet

Project repo
├── CLAUDE.md                  # Includes Loci project block
└── .loci/
    ├── memory.md              # Living dossier
    └── decisions/             # Durable project decisions
```

## Connecting A Project

There is no command the user has to learn.

When AI notices a project is becoming serious, it offers once at the end of a conversation:

> "这个项目好像做起来了，要不要我帮你在这里留个记忆？"

If the user says yes:

1. Create `.loci/memory.md` from `templates/project-memory.md`
2. Create `.loci/decisions/`
3. Inject `templates/project-claude-block.md` into the repo's `CLAUDE.md`
4. Add `.loci/` to the repo's `.gitignore`
5. Add one index line to brain `projects/index.md`

## What Goes Where

| Signal | Destination |
|---|---|
| Project goal/current state/next step | Project `.loci/memory.md` |
| Project decision | Project `.loci/decisions/YYYY-MM-DD-slug.md` |
| Cross-project insight or milestone | Brain `projects/index.md` one-line project entry |
| Project-shaped idea that is not serious yet | Brain `projects/side.md` |
| Person/client/collaborator | Brain `people/<name>.md` |

## Reading

At brain level, read `projects/index.md` first. Open a project repo's `.loci/memory.md` only when the current request mentions that project or clearly needs it.

Inside a connected project repo, read `.loci/memory.md` at session start. Read `.loci/decisions/` only when a past decision is relevant.

## Why This Architecture?

1. **Zero command burden**: the user does not need to learn a project-linking command.
2. **Local ownership**: project memory stays with the project repo.
3. **Small brain context**: the brain keeps an index, not every project detail.
4. **Portable**: each repo carries its own memory across Claude Code, Codex, and future tools.
5. **Traceable**: decisions live next to the code they affect.
