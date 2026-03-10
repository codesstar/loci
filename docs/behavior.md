# Behavior Rules (imported by CLAUDE.md)

## Quick Add Reminders/Events

When the user mentions something to do, **add immediately** without confirmation:
- Add to `tasks/active.md` (default P2)
- If a time is mentioned, also add to `tasks/calendar.json`
- Format details → `tasks/README.md`

## Reference Collection (references/)

When the user mentions external content (articles, tweets, videos, quotes, products, ideas from others):

1. **Route**: External content → `references/inbox.md`. Own thoughts/tasks → root `inbox.md`
2. **Zero friction**: User says "save this" + content → append to `references/inbox.md` immediately. No classification needed, no confirmation
3. **Format**: `## [Short title]` + content + source + date
4. **On "organize references"**: Split inbox entries into individual files in `references/entries/`, auto-generate frontmatter (date, type, source, tags)
5. **On "what did I save about X"**: Search `references/inbox.md` + `entries/` for matches

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
- Implementation: since every auto-save produces a trackable file change (and ideally a git commit), undo = `git revert` the last auto-save's changes
- Selective undo: user can say "undo the task but keep the decision" — the AI manually reverts only the specified file(s) while leaving others intact
- Undo only works for the **most recent** save. For older saves, user should manually edit the files or use `git log` to find and revert specific commits
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
