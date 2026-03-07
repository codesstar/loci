# Department System — Multi-Project Orchestration

## Overview

Loci's department system lets you manage multiple projects from a single AI headquarters. Each external project becomes a "department" that communicates with HQ through a simple file-based protocol.

## Architecture

```
Your Loci System (HQ)
├── 09-links/
│   ├── project-alpha/          # Symlink → /path/to/project-alpha
│   │   ├── from-hq.md         # HQ → Department directives
│   │   └── to-hq.md           # Department → HQ reports
│   ├── project-beta/           # Symlink → /path/to/project-beta
│   │   ├── from-hq.md
│   │   └── to-hq.md
│   └── registry.md            # All connected departments
```

## Setting Up a Department

### Step 1: Create a symlink

```bash
ln -s /path/to/your/project 09-links/project-name
```

### Step 2: Register it

Add a row to `09-links/registry.md`:

| Name | Link Name | Actual Path | Purpose |
|------|-----------|-------------|---------|
| Project Alpha | `project-alpha` | `/path/to/project-alpha` | Client website redesign |

### Step 3: Create communication files

In the project directory, create:
- `from-hq.md` — For HQ to send directives
- `to-hq.md` — For the department to report back

## Communication Protocol

### from-hq.md (HQ → Department)

Written by your AI when you make strategic decisions that affect the project.

```markdown
## Active

### 2026-03-01 | Priority Shift
Focus all effort on the landing page this week. Push the blog redesign to next sprint.

## Archive

(Older directives moved here monthly)
```

### to-hq.md (Department → HQ)

Written when working in the project's directory (e.g., a separate Claude Code session).

```markdown
## Active

### 2026-03-02 | [milestone] v2.0 Shipped
Successfully deployed the new landing page. 40% improvement in conversion.

### 2026-03-01 | [needs-decision] Database Migration
Need to decide between PostgreSQL and SQLite for the new feature. Pros/cons documented in /docs/db-choice.md.

## Archive

(Older reports moved here monthly)
```

### Tags

Use tags to flag important entries:
- `[needs-decision]` — Requires HQ input
- `[milestone]` — Significant achievement
- `[anomaly]` — Something unexpected happened

## How HQ Processes Department Updates

At the start of every conversation, Loci scans all `to-hq.md` files for recent entries. If there are entries from the last 7 days, it surfaces them:

> "Project Alpha reported a milestone: v2.0 shipped. Project Beta needs a decision on database migration."

## Monthly Maintenance

At the start of each month:
1. Move Active entries older than 30 days to Archive
2. Review all `[needs-decision]` entries — resolve or escalate
3. Update `registry.md` if projects have been added or removed

## Why This Architecture?

1. **File-based**: No database, no server, no API. Just markdown files.
2. **Async**: Departments don't need to be "online" — updates persist in files.
3. **Scalable**: Add as many departments as you need. Each is independent.
4. **Portable**: Works across any AI tool that can read files.
5. **Human-readable**: You can always read the communication files directly.
