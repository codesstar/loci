# Behavior Rules (imported by CLAUDE.md)

## Core Principle: AI First, Memory Second

**Always respond naturally to what the user said.** React, comment, help, ask follow-up questions — be a smart friend. Memory persistence happens silently in the background. NEVER reply with just "记住了" or "I've saved that". The user should barely notice the memory system is there — it should feel like magic, not bookkeeping.

Example:
- User: "明天要去打篮球"
- BAD: "已记录到日计划。"
- GOOD: "打篮球！约了谁一起？" (meanwhile silently add to tomorrow's plan)

## Quick Add Reminders/Events

When the user mentions something to do, **add immediately** without confirmation:
- Add to `tasks/active.md` (default P2)
- If a time is mentioned, also add to `tasks/calendar.json`
- Format details → `tasks/README.md`

## Reference Collection (references/)

An optional extension module for external content — articles, tweets, videos, quotes, products, ideas from others. Created on demand when user first saves external content.

### 1. Routing
- **External content** (someone else's ideas) → `references/inbox.md`
- **Your own tasks/thoughts/reminders** → root `inbox.md`
- Rule of thumb: came from outside you → references. Came from inside you → inbox/me/decisions.

### 2. Zero-Friction Capture
User says "save this" + content → append to `references/inbox.md` immediately. No classification, no confirmation.

Format in inbox:
```markdown
## [Short title]
[Content / summary / quote]
Source: [URL or description]
Date: YYYY-MM-DD
```

### 3. Organize Trigger
On "organize references" / "整理收藏" or when inbox exceeds 10 entries:
- Split inbox entries into individual files in `references/entries/YYYY-MM-DD-slug.md`
- Auto-generate frontmatter: date, type, source, tags, one-line, use-for, status
- Ask user to confirm tags and `use-for` field (this is the high-value metadata)
- **User-facing language**: Say "你的收藏夹积了不少东西，要整理一下吗？" — never expose internal terms like "inbox", "references module", "frontmatter" to the user

### 4. Entry Frontmatter
```yaml
---
date: 2026-03-10
type: article    # article | book | video | quote | product | idea | tweet | paper
source: "https://..."
tags: [pricing, open-source]
one-line: "Open-core pricing grows 3x faster than pure SaaS"
use-for: "Loci pricing strategy"   # what this is useful for — key field
status: raw      # raw → processed → applied → archived
---
```

### 5. Proactive Recall
When the user is working on a topic that matches saved references (by tags or `use-for`):
- Surface relevant entries naturally: "By the way, you saved an article about X that might be relevant here."
- Don't interrupt flow — mention at natural pauses or when directly relevant
- Never surface the same reference twice in one session

### 6. Collections
User can group references: "make a collection about pricing". Creates `references/collections/pricing.md` — a curated list linking to entries, with optional commentary.

### 7. Search
On "what did I save about X": search `references/inbox.md` + `entries/` + `collections/` for matches by title, tags, one-line, and content.

### 8. Lifecycle
- `raw` → just captured, unprocessed
- `processed` → organized with frontmatter, tagged
- `applied` → actually used in a decision/project (auto-update when referenced in a decision file)
- `archived` → no longer relevant, moved to `archive/references/`

### 9. Structure
```
references/
├── README.md           # Module overview
├── inbox.md            # Quick dump — zero friction
├── entries/            # Organized individual entries
│   └── YYYY-MM-DD-slug.md
└── collections/        # Curated topic groups
    └── topic-name.md
```

## Department Communication Protocol

External projects ("departments") connect via `.loci/links/`. Two-way communication:
- `.loci/from-hq.md` (HQ→Dept): Write on strategic decisions, execute one-off tasks directly
- `.loci/to-hq.md` (Dept→HQ): Scan Active section at conversation start, watch for `[needs-decision]` `[milestone]` `[anomaly]`
- Monthly: archive entries older than 30 days or completed
- For linked sub-projects, communication files live inside the sub-project's `.loci/` directory (not root)

## Sub-Project Persistence (memory.md v1)

When working inside a project that has a `.loci/` directory, the AI maintains a local project memory via `.loci/memory.md`.

**Core principle**: CLAUDE.md = instructions ("how to behave"), memory.md = knowledge ("what I know"). They are complementary.

### .loci/ Directory Structure

```
project-root/
├── .loci/
│   ├── memory.md          # Project memory (core file)
│   ├── config.json        # Project config (sync rules, project type)
│   ├── to-hq.md           # Project → Brain (milestones, decisions, anomalies)
│   ├── from-hq.md         # Brain → Project (strategic decisions, priority changes)
│   └── link               # Path to brain location
```

5 files cover all scenarios. Do not add more.

### memory.md Format

```markdown
---
loci-schema: 1
project: <project-name>
type: <code|content|research|personal|other>
linked: <YYYY-MM-DD>
last_consolidation: <YYYY-MM-DD>
---

# Project Memory

## Story
<!-- 2-3 sentences, auto-updated by AI during consolidation -->

## Current State
<!-- Active/recent info. Entries carry timestamps: <!-- @2026-03-20 --> -->

## Established
<!-- Long-term knowledge: architecture, conventions, key decisions with reasoning. -->

## Patterns
<!-- Recurring themes: frequently-hit issues, learned preferences, workflow quirks. AI auto-generated. -->
```

### Section Rules

| Section | Line limit | Notes |
|---------|-----------|-------|
| Story | 5 lines | Rewritten (not appended) each consolidation |
| Current State | 30 lines | Entries carry implicit timestamps for reference |
| Established | 80 lines | Compress oldest when over limit |
| Patterns | 20 lines | AI auto-generated during consolidation |
| **Total** | **≤ 150 lines** | Configurable via `.loci/config.json` |

- memory.md is **write-by-AI, read-by-human**. Users never need to manually edit it.
- **No automatic decay.** Entries stay until manually consolidated via `/loci-consolidate`. AI may suggest consolidation when file exceeds 120 lines.
- Story is rewritten each consolidation. Before rewriting, the old version is backed up to `.loci/backups/`.

### Cross-Project Knowledge Flow

**Upward (Project → Brain)**:
1. AI detects decision/milestone/insight signal while working in a project
2. AI evaluates scope: local (code detail) → don't bubble; cross-project/global (tech choice, architecture) → bubble
3. Bubbled content is written to `.loci/to-hq.md` Active section
4. Brain scans all to-hq.md files at session start
5. Brain stores in `decisions/YYYY-MM-DD-slug.md` with `source: <project-name>` tag in frontmatter

**Downward (Brain → Project)**:
1. AI detects a related topic while working in a project (e.g., discussing databases)
2. AI reads brain's `me/projects.md` (project narrative index, 2-4 lines per project)
3. If related → reads specific project's memory.md or decision files
4. Writes pulled info to `.loci/from-hq.md` for traceability
5. Zero configuration required from user

### Consolidation

**Trigger**: `/loci-consolidate` (manual), or AI suggests when memory.md exceeds 120 lines. No automatic daily decay.

**Steps**:
1. Back up current memory.md to `.loci/backups/memory-YYYY-MM-DD.md`
2. Review Current State: move resolved/outdated entries to Established (if durable) or remove (if obsolete)
3. Scan Established + Current State for recurring themes → write to Patterns
4. Rewrite Story (2-3 sentences reflecting current state)
5. Update frontmatter `last_consolidation`
6. If still > 150 lines → compress oldest Established entries (git preserves history)

### Tag Categories (for to-hq.md bubbling)

**Push tags** (immediately synced to brain via `to-hq.md` when written):
- `[decision]` — architectural or strategic choices
- `[architecture]` — system design, data models, tech stack
- `[insight]` — learned patterns, performance findings, best practices
- `[milestone]` — shipped features, releases, major completions

**Local tags** (stay in sub-project only):
- `[local]` — project-specific context, not worth syncing
- `[debug]` — bug fixes, workarounds, temporary solutions
- `[wip]` — work in progress notes, incomplete thoughts
- `[private]` — sensitive info, never bubble to brain (API keys, credentials, personal matters)

Push happens at the moment of writing — no batching, no "session end" trigger.

## Memory Consolidation

Loci performs daily memory consolidation — reviewing recent distilled knowledge to find cross-domain patterns and generate insights. Inspired by how the hippocampus consolidates memories during sleep.

### Auto Trigger

At conversation start, check `.loci/last-consolidation.txt`:
- If file missing or date < today → run consolidation (24h window), then update file with today's date
- If date == today → skip

### What It Does

1. Scan recent changes: `decisions/`, `tasks/active.md`, `me/`, `.loci/activity-log.md`, `inbox.md`, `.loci/links/*/.loci/to-hq.md`
2. Look for patterns: recurring themes, contradictions, momentum signals, cross-project connections, identity shifts, goal progress vs plan.md, time allocation vs priorities, stale/completed tasks to archive
3. If insights found → append to `me/insights.md` with source citations
4. Report in one conversational sentence, or stay silent if nothing notable

### Manual Trigger

`/loci-consolidate` — runs consolidation on demand. Accepts optional day range: `/loci-consolidate 7` for weekly review.

Full spec → `templates/commands/loci-consolidate.md`

## Source Citations

When distilling information into brain files, annotate the source with an HTML comment including timestamp:

```markdown
Switched from REST to GraphQL <!-- source: conversation @2026-03-11T14:32 -->
```

During consolidation, insights reference the files they were derived from with timestamps:

```markdown
- [pattern] 三个决策都在简化架构 <!-- source: decisions/2026-03-09-api-redesign.md @2026-03-09T14:32, decisions/2026-03-11-merge-versions.md @2026-03-11T09:20 -->
```

Timestamps enable:
- Temporal queries ("我上周三下午在干嘛")
- Cause-effect ordering (A happened before B, so A may have influenced B)
- Precise recall that feels like a real memory, not a summary

This makes all distilled knowledge traceable. When the user asks "why did I decide X?", the AI can follow the source trail.

## Daily Summary (Journal)

- During conversations, append decisions/insights/important topics to `tasks/journal/buffer.md`
- On "summarize" trigger, read buffer + review conversation → generate `tasks/journal/YYYY-MM-DD.md` → clear buffer
- Check for yesterday's journal at conversation start; remind to backfill if missing
- Proactively offer to summarize when user seems to be wrapping up
- Full mechanism → `tasks/journal/README.md`

## Activity Log

File changes are automatically recorded to `.loci/activity-log.md` via `.loci/hooks/on-file-change.sh` (registered as a Claude Code PostToolUse hook). This log tracks what happened across sessions so new conversations can pick up where old ones left off.

- **On session start**: Read `.loci/activity-log.md` (last 7 days) to understand recent context
- **Retention**: On the 1st of each month, remove entries older than 14 days. Important info should already be distilled to proper files; the log is just a timeline index

## Undo Mechanism

- User says "undo" or "撤销" to reverse the **last** auto-save operation
- If the last save touched multiple files (e.g., a task was added to `tasks/active.md` AND a decision was written to `decisions/`), undo reverts **all** of them in one operation
- Implementation: the AI remembers what it wrote and where. On undo, it reads the file, removes/reverts the added content, and writes the file back. No git dependency required
- Selective undo: user can say "undo the task but keep the decision" — the AI reverts only the specified file(s) while leaving others intact
- Undo only works for the **most recent** save within the current session. For older saves, user should manually edit the files or use `git log` if commits exist
- After undo, the AI confirms what was reverted with a one-line notification

## Creating Extension Modules

When the user asks to create a new module (e.g., "help me manage finances", "I want to track my reading"):

1. **Check templates**: Look in `templates/extensions/` for a matching README template (e.g., `finance-README.md`, `people-README.md`)
2. **If template found**: Create the folder at root level, copy the template README, customize it based on user's answers to a few quick questions
3. **If no template found**: Create the folder at root level, generate a `README.md` with:
   - Module name and one-line purpose
   - Suggested file structure (based on the module's domain)
   - Default frontmatter conventions for files in this module
4. **Post-creation**: Add the module to the Directory Map in the AI's context so it remembers the module for the rest of the session
5. **Layer assignment**: Extension modules are always **L2** (loaded on demand, never auto-loaded at conversation start)

## Extension Rules

- **New module**: `mkdir name` → Create README.md → Update directory map
- **Connect external project**: `ln -s /actual/path .loci/links/name` → Register in `.loci/links/registry.md`
- **New template**: Place in `templates/`
- Loci is the main entry point; all external projects managed through `.loci/links/`
