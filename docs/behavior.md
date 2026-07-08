# Behavior Rules (imported by CLAUDE.md)

## Core Principle: AI First, Memory Second

**Always respond naturally to what the user said.** React, comment, help, ask follow-up questions — be a smart friend. Memory persistence happens silently in the background. NEVER reply with just "记住了" or "I've saved that". The user should barely notice the memory system is there — it should feel like magic, not bookkeeping.

Example:
- User: "明天要去打篮球"
- BAD: "已记录到日计划。"
- GOOD: "打篮球！约了谁一起？" (meanwhile silently add to tomorrow's plan)

## Write Frequency & Control

Every turn, the AI performs a lightweight check for storable signals. This should not interrupt the normal answer.

- **Default**: auto-save clear signals after distilling and routing them.
- **No signal**: save nothing.
- **Manual**: explicit "remember/save/记一下" requests and `/loci-sync` always trigger persistence unless unsafe or impossible.
- **Confirm first**: sensitive, ambiguous, emotional, or major life/strategy changes.
- **Undo**: user can say "undo" / "撤销" to revert the last save operation.

Memory confirmations should be short, natural, and secondary to the main response. Loci's memory should feel ambient: "Loci 的记忆应该像呼吸一样存在，而不是每次都举手打断用户。"

## Quick Add Reminders/Events

When the user mentions something to do, **add immediately** without confirmation:
- If it is a task, write through the Dashboard API if running, otherwise use `node scripts/loci-task.js add/update`.
- If the task has a specific time, the guarded writer must also add/update `tasks/calendar.json` with `fromTask: true` and `taskId`.
- If it is schedule-only time (meeting, meal, class, appointment, travel, time block), use the guarded writer/API to add only to `tasks/calendar.json`.
- Do not hand-edit `tasks/tasks.json` or `tasks/calendar.json` except as an emergency fallback.
- After an emergency manual edit, run `node scripts/loci-task.js rebuild` and `node scripts/loci-task.js validate`.
- Do not duplicate tasks into `tasks/daily/YYYY-MM-DD.md`; daily files are day notes and reviews.
- Format details → `tasks/README.md`

## Reference Collection (references/)

An optional extension module for external content — articles, tweets, videos, quotes, products, ideas from others. Created on demand when user first saves external content.

### 1. Routing
- **External content** (someone else's ideas) → `references/inbox.md`
- **Research material** (raw docs, competitive notes, study guides, market scans, case studies) → `references/research/`
- **Your own tasks/thoughts/reminders** → root `inbox.md`
- Rule of thumb: came from outside you → references. Came from inside you → inbox/me/decisions.
- Research is evidence, not a decision. If it supports a choice, cite it from a separate decision record instead of storing it under `decisions/`.

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
├── collections/        # Curated topic groups
│   └── topic-name.md
└── research/           # Evidence packs: raw docs, market scans, competitor notes
```

### 10. Research Evidence
- `references/research/` is for evidence and source material gathered while thinking.
- A decision record goes in `decisions/` only after there is a real trade-off and a chosen direction.
- Decision records may cite files in `references/research/`, but research files themselves are never decision records.

## Project Memory Protocol

Loci aggregates memory, it does not own it. A serious project's memory belongs in that project's own repo:
- `.loci/memory.md` — restart context: current state, Now / Next, recent progress, active decisions, risks, pointers
- `.loci/profile.md` — stable project details: scope, milestones, key people, important files, conventions
- `.loci/progress/YYYY-MM.md` — project progress stream, grouped by day
- `.loci/decisions/` — durable project decision stream
- `.loci/todo.json` — structured project development todos
- `CLAUDE.md` + `AGENTS.md` project blocks — tell future Claude Code and Codex sessions how to read/write the repo memory
- Brain `projects/index.md` — one-line index only; never a warehouse for full project memory

The user does not run a command to connect a project. AI notices "this is getting real" signals and offers once at the end of the conversation.

## Project Persistence (Project .loci v2)

When working inside a project that has a `.loci/` directory, the AI maintains local project memory through a small set of files with separate responsibilities.

**Core principle**: `CLAUDE.md` / `AGENTS.md` = instructions ("how to behave"); `.loci/memory.md` = restart context ("where to resume"); `.loci/profile.md` / `.loci/progress/` / `.loci/decisions/` / `.loci/todo.json` hold details.

### .loci/ Directory Structure

```
project-root/
├── .loci/
│   ├── memory.md          # Short restart context
│   ├── profile.md         # Stable project details
│   ├── progress/          # Project progress stream, one file per month
│   │   └── YYYY-MM.md
│   ├── decisions/         # Project decision stream
│   ├── todo.json          # Project development todos
│   └── config.yml         # Optional project memory settings
├── CLAUDE.md              # Includes the Loci project block for Claude Code
├── AGENTS.md              # Includes the same Loci project block for Codex
```

Keep this minimal. Do not add archive in the first version; add it only when progress or completed todos become genuinely too large.

When connecting a serious project, prefer the guarded writer:

```bash
node scripts/loci-project.js connect --repo /path/to/project --brain /path/to/brain --name "Project" --description "One line"
```

The writer creates `.loci/memory.md`, `.loci/profile.md`, `.loci/progress/`, `.loci/decisions/`, `.loci/todo.json`, injects both instruction files, updates `.gitignore`, and writes the brain `projects/index.md` entry. Manual file edits are only the fallback when the writer is unavailable.

### memory.md Format

```markdown
---
project: <project-name>
description: <one-line>
brain: <brain-path>
status: active
created: <ISO8601>
updated: <ISO8601>
---

# Project

## Goal
<!-- Short goal only if it helps resume. -->

## Current State
<!-- Where the project is right now. -->

## Now / Next
<!-- The next 1-3 actions or the immediate handoff state. -->

## Recent Progress
<!-- Latest 3-7 meaningful entries; full stream lives in progress/YYYY-MM.md. -->

## Active Decisions
<!-- Only decisions still affecting current work. -->

## Risks / Open Questions
<!-- Current blockers or things the next session must not miss. -->

## Pointers
<!-- Links to profile, progress, decisions, todo. -->
```

### File Rules

| File | Rule |
|---------|-------|
| `memory.md` | Keep short, usually under 150 lines. It is the restart surface, not the whole project history. |
| `profile.md` | Stable attributes: scope, milestones, key people, files, conventions. Read only when needed. |
| `progress/YYYY-MM.md` | Append project progress under `## YYYY-MM-DD` as `- HH:MM · what changed`. |
| `decisions/` | One durable decision per file, append-only. |
| `todo.json` | Structured project todos, written through the guarded project todo writer. |

- `memory.md` is **write-by-AI, read-by-AI**, optimized for a fresh session to resume without chat history.
- Process noise and long history do not belong in `memory.md`; results, rationale, next actions, and risks do.
- No archive in v2. Add archive only when there is real bulk to move.

### Cross-Project Knowledge Flow

**Project → Brain index**:
1. AI detects decision/milestone/insight signal while working in a project
2. Normal project decisions stay in `.loci/decisions/`
3. Project progress goes to `.loci/progress/YYYY-MM.md`
4. Current handoff context updates `.loci/memory.md`; stable attributes update `.loci/profile.md`
5. Only `[insight]` / `[milestone]` summaries that matter outside the repo update the brain's `projects/index.md` one-line index
6. Never copy the full project memory into the brain

**Brain → Project**:
1. AI detects a related topic while working in a project
2. AI reads brain `projects/index.md` to find where relevant project memory lives
3. If related, AI opens that project's `.loci/memory.md` first, then `.loci/profile.md`, `.loci/progress/`, or `.loci/decisions/` only as needed
4. No trace files are needed; the repo remains the source of truth

### Consolidation

**Trigger**: `/loci-consolidate` (manual), or AI suggests when memory.md exceeds 120 lines. No automatic daily decay.

**Steps**:
1. Rewrite `.loci/memory.md` down to the current handoff state.
2. Keep full historical progress in `.loci/progress/YYYY-MM.md`.
3. Move stable attributes discovered during work to `.loci/profile.md`.
4. Keep durable choices in `.loci/decisions/`.
5. If `todo.json` has too many old done items, defer archive until a real archive feature is added.

### Tag Categories

**Brain-index tags** (may update `projects/index.md` when useful beyond the repo):
- `[insight]` — learned patterns, performance findings, best practices
- `[milestone]` — shipped features, releases, major completions

**Local tags** (stay in the project repo):
- `[decision]` — normal project architectural or strategic choices
- `[architecture]` — project-specific system design, data models, tech stack
- `[local]` — project-specific context, not worth syncing
- `[debug]` — bug fixes, workarounds, temporary solutions
- `[wip]` — work in progress notes, incomplete thoughts
- `[private]` — sensitive info, never bubble to brain (API keys, credentials, personal matters)

Brain index updates happen only when the summary matters outside the repo.

## Memory Consolidation

Loci performs daily memory consolidation — reviewing recent distilled knowledge to find cross-domain patterns and generate insights. Inspired by how the hippocampus consolidates memories during sleep.

### Auto Trigger

At conversation start, check `.loci/last-consolidation.txt`:
- If file missing or date < today → run consolidation (24h window), then update file with today's date
- If date == today → skip

### What It Does

1. Scan recent changes: `decisions/`, `references/research/`, `tasks/tasks.json`, `tasks/active.md`, `me/`, `.loci/activity/<current month>.md`, `inbox.md`, and relevant project entries from `projects/index.md`
2. Look for patterns: recurring themes, contradictions, momentum signals, cross-project connections, identity shifts, goal progress vs plan.md, time allocation vs priorities, stale/completed tasks to archive
3. For every new decision, run the L1 promotion check: if it changes current behavior, update the smallest current surface (`plan.md`, `tasks/active.md` via guarded writer, `projects/index.md`, or project `.loci/memory.md`)
4. If insights found → append to `me/insights.md` with source citations
5. Report in one conversational sentence, or stay silent if nothing notable

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

## Activity Ledger (audit layer)

A plain-language log of every change the AI makes to the brain, so the user can later ask "what did I do today?" and get a timeline. The AI maintains it directly (no hook), so it works the same in Claude Code and Codex.

- **Write**: after any brain-facing write (task, decision, person, project, inbox, reference, personal info), the AI appends one line to `.loci/activity/<YYYY-MM>.md` under a `## <YYYY-MM-DD>` heading: `- HH:MM · <category> · <human one-liner>`. Human language, with a traceable keyword (project/person), no file paths.
- **Read (on demand only)**: when the user asks what they did, the AI reads the relevant month's file and summarizes a timeline; for detail it follows a line into the project/file it names.
- **Not loaded into context automatically** — it's the bottom audit layer, written always, read only when asked.
- **Retention**: one file per month, kept indefinitely (so "what did I do last month / in March?" still works).

## Undo Mechanism

- User says "undo" or "撤销" to reverse the **last** auto-save operation
- If the last save touched multiple files (e.g., a task was added to `tasks/tasks.json` AND a decision was written to `decisions/`), undo reverts **all** of them in one operation
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
- **Connect external project**: AI offers once when the project gets serious; on yes, use `scripts/loci-project.js connect` to create `.loci/memory.md`, `.loci/profile.md`, `.loci/progress/`, `.loci/decisions/`, `.loci/todo.json`, inject the project block into repo `CLAUDE.md` and `AGENTS.md`, add `.loci/` to `.gitignore`, and add one index line to `projects/index.md`
- **New template**: Place in `templates/`
- Loci is the index + understanding layer; external projects own their own memory
