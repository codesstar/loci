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
- **L0 Map**: read `<brain-path>/CLAUDE.md` for the Directory Map and Context Layers. If present, read `<brain-path>/projects/index.md` as the project index.
- **L1 Active Context**: load every conversation — `plan.md`, `tasks/active.md`, latest 7 items from `inbox.md`, and recent `.loci/activity-log.md` when available.
- **L2 On Demand**: read module READMEs, `me/`, `decisions/`, `references/`, `tasks/daily/`, or linked project `.loci/memory.md` only when relevant to the user's request.
- **L3 Archive**: do not auto-load `archive/`, old journals, or historical decision files unless the user asks or the current task clearly needs them.
- Prefer indexes and README files first; open specific files only after identifying the relevant location.

### Session Cache & Refresh
- At session start, fresh-load L0/L1 once.
- During the same session, treat loaded L0/L1 content as cached; do **not** re-read unchanged startup files on every user message.
- Re-read only the smallest relevant file when context may be stale, compacted, externally changed, recently written, or when latest/current accuracy matters.
- For "now", "today", "current", or "latest" questions, refresh the smallest relevant source before answering.

### Memory Retrieval Map
When the user's request mentions a topic, project, person, decision, material, or past context, use this map to find the right place before opening files:
- Life direction and current goals → `<brain-path>/plan.md`
- Open task cache → `<brain-path>/tasks/active.md`; full task database → `<brain-path>/tasks/tasks.json`
- Day notes/reviews → `<brain-path>/tasks/daily/YYYY-MM-DD.md`; scheduled time blocks → `<brain-path>/tasks/calendar.json`
- Durable decisions and rationale → `<brain-path>/decisions/`
- Identity, preferences, habits → `<brain-path>/me/`
- Serious project index (one line each) → `<brain-path>/projects/index.md`. Full project memory lives in each project's OWN repo (`.loci/memory.md` + `.loci/decisions/`), NOT in the brain — read the repo for detail. Loci aggregates, it does not own.
- Project embryos (not serious yet) → `<brain-path>/projects/side.md`
- People and relationships → `<brain-path>/people/`
- Quick unsorted thoughts → `<brain-path>/inbox.md` (latest 7 by default; read more only on request)
- Saved articles, links, tools, and external materials → `<brain-path>/references/`
- Historical material → `<brain-path>/archive/` only when explicitly needed
- For any unfamiliar module, read its `README.md` first, then open the smallest specific file needed.

### Persistence (any directory)
When the user mentions tasks, decisions, or insights — save them to the brain:
- Answer the user first; memory work must not interrupt the normal response.
- Every turn, lightly evaluate whether there is a storable signal. No signal = no save.
- Clear tasks, decisions, factual preferences, explicit "remember/save this" requests, and useful links may be auto-saved.
- Uncertain, sensitive, highly subjective, or major life/strategy changes should be confirmed before saving.
- Distill into structured notes; never save raw transcripts.
- Keep save confirmations short and natural. Do not expose file paths or internal terms unless asked.
- Tasks → use the guarded task writer, not manual JSON edits:
  - Preferred: Dashboard API when `<brain-path>/.loci/dashboard/server.js` is running.
  - Fallback: run `node <brain-path>/scripts/loci-task.js ...`.
  - Validate with `node <brain-path>/scripts/loci-task.js validate`.
- Decisions → `<brain-path>/decisions/YYYY-MM-DD-slug.md`
- Personal info → `<brain-path>/me/`
- Quick thoughts → `<brain-path>/inbox.md`
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.
- **Task/Schedule routing**:
  - Task = something to complete → guarded writer stores it in `<brain-path>/tasks/tasks.json`.
  - Task with specific date → still write only to `<brain-path>/tasks/tasks.json`; do not duplicate it into daily files.
  - Task with specific time → guarded writer also updates `<brain-path>/tasks/calendar.json` with `fromTask: true` and `taskId`.
  - Schedule-only item (meeting, meal, class, appointment, travel, time block) → guarded writer/API writes only to `<brain-path>/tasks/calendar.json`.
  - Loose idea, not a task → `<brain-path>/inbox.md`.
- Do not hand-edit `<brain-path>/tasks/tasks.json` or `<brain-path>/tasks/calendar.json` except as an emergency fallback. If manual editing is unavoidable, immediately run `node <brain-path>/scripts/loci-task.js rebuild` and `node <brain-path>/scripts/loci-task.js validate`.
- **Dashboard**: if `server.js` is running (`node <brain-path>/.loci/dashboard/server.js`), use its API. Otherwise use `node <brain-path>/scripts/loci-task.js ...` for task/schedule writes.

### Cross-Project Memory
- Loci aggregates memory, it does not own it: a serious project's memory belongs in that project's own repo (`.loci/memory.md` + `.loci/decisions/`), while the brain keeps only a one-line index in `<brain-path>/projects/index.md`.
- In connected project repos: read `.loci/memory.md` for project context. Write durable project decisions to `.loci/decisions/YYYY-MM-DD-slug.md`; update `.loci/memory.md` for goal/current-state/next-step/progress changes.
- Tags: `[decision]` and project-local facts stay in the project repo. Promote only `[insight]` / `[milestone]` summaries to the brain's project index when they matter outside the repo. `[local]` `[debug]` `[wip]` stay local.

### Commands
/loci-sync, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->
