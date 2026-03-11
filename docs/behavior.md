# Behavior Rules (imported by CLAUDE.md)

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

## Sub-Project Persistence

When working inside a project that has a `.loci/` directory, the AI maintains a local project memory via `.loci/memory.md`.

### memory.md Format

Append-only, one entry per line:

```
[tag] YYYY-MM-DD One-line description of knowledge
```

Example:
```
[decision] 2026-03-11 Switched from REST to GraphQL for the API layer
[architecture] 2026-03-11 Auth uses JWT with refresh tokens stored in httpOnly cookies
[local] 2026-03-11 Fixed flaky test in user.test.ts by mocking date
[insight] 2026-03-11 Batch writes to SQLite are 10x faster with WAL mode
```

### Tag Categories

**Push tags** (immediately synced to brain via `to-hq.md` when written):
- `[decision]` — architectural or strategic choices
- `[architecture]` — system design, data models, tech stack
- `[insight]` — learned patterns, performance findings, best practices
- `[milestone]` — shipped features, releases, major completions

**Local tags** (stay in sub-project only):
- `[local]` — project-specific context, not worth syncing
- `[debug]` — bug fixes, workarounds, temporary solutions
- `[wip]` — work in progress notes, incomplete thoughts

### Memory Growth

memory.md grows over time. Clean manually if needed, or wait for v2.0 auto-compression.

### Immediate Push

When writing an entry to memory.md whose tag matches `push_tags` in `.loci/config.json`:
1. Write the entry to `.loci/memory.md`
2. **Simultaneously** write the same entry to `.loci/to-hq.md` under the `## Active` section
3. The brain picks these up on its next session start via the department communication scan

No batching, no "session end" trigger. Push happens at the moment of writing.

### Relationship to .claude/ Auto-Memory

- `.claude/` (auto-memory) = **AI behavior instructions** — how the AI should act in this project (preferences, conventions, tool configs)
- `.loci/` (project memory) = **project knowledge** — what the AI knows about this project (decisions, architecture, insights, milestones)

They are complementary: `.claude/` shapes behavior, `.loci/` provides context.

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
