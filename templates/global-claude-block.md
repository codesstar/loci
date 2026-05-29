<!-- loci:start v2 -->
## Loci Brain Connection (Global)

- Brain path: `<brain-path>`
- These rules apply **in every project and directory**, not just the brain folder.
- Claude Code and Codex can share this same local brain.

### Automatic Context
- On session start, read `<brain-path>/plan.md` for life direction and current goals
- Read `<brain-path>/tasks/active.md` for current priorities
- Check `<brain-path>/inbox.md` for pending items (latest 7 only)

### Context Loading Strategy
- Do **not** load the whole brain automatically. Keep startup context small and use the brain as a local memory map.
- **L0 Map**: read `<brain-path>/CLAUDE.md` for the Directory Map and Context Layers. If present, read `<brain-path>/me/projects.md` as the project index.
- **L1 Active Context**: load every conversation — `plan.md`, `tasks/active.md`, latest 7 items from `inbox.md`, and recent `.loci/activity-log.md` when available.
- **L2 On Demand**: read module READMEs, `me/`, `decisions/`, `references/`, `tasks/daily/`, or linked project `.loci/memory.md` only when relevant to the user's request.
- **L3 Archive**: do not auto-load `archive/`, old journals, or historical decision files unless the user asks or the current task clearly needs them.
- Prefer indexes and README files first; open specific files only after identifying the relevant location.

### Persistence (any directory)
When the user mentions tasks, decisions, or insights — save them to the brain:
- Tasks → `<brain-path>/tasks/active.md`
- Decisions → `<brain-path>/decisions/YYYY-MM-DD-slug.md`
- Personal info → `<brain-path>/me/`
- Quick thoughts → `<brain-path>/inbox.md`
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.
- **Time-based tasks** → write to BOTH `<brain-path>/tasks/daily/YYYY-MM-DD.md` (checklist) AND `<brain-path>/tasks/calendar.json` (event with startKey/endKey in minutes from midnight). No time = daily plan only.
- **Dashboard**: if `server.js` is running (`node <brain-path>/.loci/dashboard/server.js`), no action needed — it reads markdown live. Otherwise, update `<brain-path>/.loci/dashboard/data.json` directly. See `<brain-path>/.loci/dashboard/schema.md` for format.

### Cross-Project Memory
- In projects with `.loci/` directory: read `.loci/memory.md` for project context, use `.loci/to-hq.md` / `.loci/from-hq.md` for cross-project sync
- Tags: `[decision]` `[architecture]` `[insight]` `[milestone]` auto-push to brain; `[local]` `[debug]` `[wip]` stay local

### Commands
/loci-sync, /loci-link, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->
