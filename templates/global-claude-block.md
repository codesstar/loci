<!-- loci:start v2 -->
## Loci Brain Connection (Global)

- Brain path: `<brain-path>`
- These rules apply **in every project and directory**, not just the brain folder.
- Claude Code and Codex can share this same local brain.

### Automatic Context
- On session start, read `<brain-path>/plan.md` for life direction and current goals
- Read `<brain-path>/tasks/active.md` for current priorities
- Read `<brain-path>/me/preferences.md` for the user's standing interaction instructions (what to call them, language, tone, reply style) — honor them from the first reply on
- Check `<brain-path>/inbox.md` for pending items (latest 7 only)

### Context Loading Strategy
- Do **not** load the whole brain automatically. Keep startup context small and use the brain as a local memory map.
- **L0 Map**: read `<brain-path>/CLAUDE.md` for the Directory Map and Context Layers. If present, read `<brain-path>/projects/index.md` as the project index.
- **L1 Active Context**: load every conversation — `plan.md`, `tasks/active.md`, `me/preferences.md`, latest 7 items from `inbox.md`.
- **L2 On Demand**: read module READMEs, the rest of `me/`, `decisions/`, `references/`, `notes/`, `tasks/daily/`, linked project `.loci/memory.md`, `.loci/profile.md`, or `.loci/progress/YYYY-MM.md` only when relevant to the user's request.
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
- How the AI should talk to the user (nickname/称呼, language, tone, reply style) → `<brain-path>/me/preferences.md` (L1, already loaded)
- Identity, values, wellbeing, lessons, and personal insights → `<brain-path>/me/` (read `me/README.md` first)
- Serious project index (one line each) → `<brain-path>/projects/index.md`. Full project memory lives in each project's OWN repo (`.loci/memory.md` restart context + `.loci/profile.md` stable details + `.loci/progress/` project stream + `.loci/decisions/`), NOT in the brain — read the repo for detail. Loci aggregates, it does not own.
- Project embryos (not serious yet) → `<brain-path>/projects/side.md`
- Places (home / company addresses / frequent spots / client offices) → `<brain-path>/places/` (one `.md` per place; shown on the people-page map next to contacts)
- People and relationships → `<brain-path>/people/` (one `.md` per contact; relationships BETWEEN contacts are edges in `people/.connections.json` — when the user says "A is B's friend / A introduced B", also add the edge via Dashboard API `POST /api/people/connect {a,b,how}`, or edit the JSON: `[a, b, "how"]`, names matching each person's `name:`)
- Quick unsorted thoughts → `<brain-path>/inbox.md` (latest 7 by default; read more only on request)
- Saved articles, links, tools, and external materials (third-party content) → `<brain-path>/references/`
- The user's OWN notes (Obsidian / Feishu / Notion links, or short inline notes they wrote) → `<brain-path>/notes/index.md` (one-line index of pointers) + `<brain-path>/notes/<slug>.md` (inline notes). Loci indexes them, the body stays in the external app. L2: never auto-loaded; read the index and follow the link/path only when the user asks about their notes.
- "What did I do today / lately?" — the activity ledger of every change made to the brain → `<brain-path>/.loci/activity/<YYYY-MM>.md`. Audit layer: never auto-loaded; read only when the user asks what they did.
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
- Personal memory → `<brain-path>/me/`:
  - `preferences.md` for standing instructions on how to talk and work — "以后叫我 X" / "回复短一点" / "no emoji" / "写文档要先给草稿" → save here AND comply in the very reply that acknowledges it (用户说「以后叫我老板」，确认那句就要叫「老板」— never "记住了" now and comply later); keep it short, it loads every conversation
  - `identity.md` for stable self-description and background
  - `values.md` for durable values and decision principles
  - `wellbeing.md` for body, mental health, energy, sleep, confidence, and state
  - `insights.md` for fresh personal reflections; include background, insight, why it matters, tentative impact, and status
  - `learned.md` for reusable lessons and practices
  - `evolution.md` for append-only personal change history
- A place ("记一下 XX 的地址在 YY", "remember where X is") → Dashboard API `POST /api/places/add` when running, else `<brain-path>/places/<slug>.md` (frontmatter: name / type home|work|study|spot|client|other / address / city / lat / lng / people / tags; body = note). Fill lat/lng when you know the address; `people` names must match contacts.
- A person/place FIRST seen inside a task → do NOT auto-create a card; one-offs stay in the task's `location` attribute. Create directly only for possessive/identity statements ("我家在 X" / "我们公司搬到 X"); if the same one keeps coming back (2-3 tasks), offer ONCE at the end of a conversation. Already-saved person/place → reference by its exact saved `name:` so the dashboard links it (contacts → task `people` array via Dashboard API or `loci-task.js --people`; place → task `location`).
- Quick thoughts → `<brain-path>/inbox.md`
- The user's own notes → `<brain-path>/notes/`: an external note (Obsidian/Feishu/Notion) gets ONE line in `notes/index.md` — `- <title> · <link or path> · <gist> · #tags` — never copy the body; a short inline note becomes `notes/<slug>.md` plus its index line. This is the user's writing (vs. references = third-party content).
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.
- **Activity ledger**: AFTER any brain-facing write (task, schedule, decision, person, project, inbox, reference, personal info), append one plain-language line to `<brain-path>/.loci/activity/<YYYY-MM>.md` under a `## <YYYY-MM-DD>` heading (create if absent; run `date` for the time): `- HH:MM · <category> · <human one-liner>`. Include a traceable keyword (project/person), no file paths. Works the same in Claude Code and Codex. Never auto-load this ledger; read it only when the user asks what they did.
- **Task/Schedule routing**:
  - Task = something to complete → guarded writer stores it in `<brain-path>/tasks/tasks.json`.
  - Task with specific date → still write only to `<brain-path>/tasks/tasks.json`; do not duplicate it into daily files.
  - Task with specific time → still write ONLY to `<brain-path>/tasks/tasks.json` via the guarded writer; the time is just an attribute and is NOT projected onto the calendar (the dashboard reminder reads timed tasks straight from the task pool).
  - Schedule-only item (meeting, meal, class, appointment, travel, time block) → guarded writer/API writes only to `<brain-path>/tasks/calendar.json`.
  - Loose idea, not a task → `<brain-path>/inbox.md`.
- Do not hand-edit `<brain-path>/tasks/tasks.json` or `<brain-path>/tasks/calendar.json` except as an emergency fallback. If manual editing is unavoidable, immediately run `node <brain-path>/scripts/loci-task.js rebuild` and `node <brain-path>/scripts/loci-task.js validate`.
- **Dashboard**: if `server.js` is running (`node <brain-path>/.loci/dashboard/server.js`), use its API. Otherwise use `node <brain-path>/scripts/loci-task.js ...` for task/schedule writes.

### Cross-Project Memory
- Loci aggregates memory, it does not own it: a serious project's memory belongs in that project's own repo (`.loci/memory.md` + `.loci/profile.md` + `.loci/progress/` + `.loci/decisions/`), while the brain keeps only a one-line index in `<brain-path>/projects/index.md`.
- In connected project repos: read `.loci/memory.md` first for restart context. Read `.loci/profile.md` for stable project details, `.loci/progress/YYYY-MM.md` for project progress, and `.loci/decisions/` for rationale only when relevant.
- In connected project repos: write durable project decisions to `.loci/decisions/YYYY-MM-DD-slug.md`; write project progress to `.loci/progress/YYYY-MM.md`; update `.loci/memory.md` only for current state / Now-Next / active decisions / risks; update `.loci/profile.md` for milestones, key people, files, scope, and conventions.
- **A development to-do for a project** ("给 X 项目加个待办 / TODO for project X / 这个项目要做 Y") is NOT a personal task — do NOT use `loci-task.js` and do NOT put it in the brain's task pool. It goes in that project's own `<repo>/.loci/todo.json`, via the guarded writer: `node <brain-path>/scripts/loci-projtodo.js add --repo <THAT-PROJECT'S-repo> --text "..." [--category "..."]` (also `toggle`/`done`/`move`/`remove`/`list`). **Resolve `--repo` from the project's index entry in `<brain-path>/projects/index.md` (the `repo:` field) — it is the project's code repo, NOT the brain directory.** If you can't tell which project or where its repo is, ask before writing. Each todo gets a permanent id; the dashboard reads todo.json to show project todos.
- Tags: `[decision]` and project-local facts stay in the project repo. Promote only `[insight]` / `[milestone]` summaries to the brain's project index when they matter outside the repo. `[local]` `[debug]` `[wip]` stay local.
- **Connecting a serious project — two equally valid triggers, neither is primary:** (A) the user asks in plain words ("记住这个项目 / 帮我记住 XX / link this project / remember this project") — connect right away, no need to judge if it's "serious enough"; or (B) you notice it's clearly getting real and the user hasn't asked — offer ONCE at the end of a conversation, and connect only on their yes. The brain only holds what matters to the user; if neither trigger fired, default to NOT creating project memory. When either fires, prefer the guarded writer instead of hand-editing multiple files: `node <brain-path>/scripts/loci-project.js connect --repo <repo-path> --brain <brain-path> --name "<project>" --description "<one-line>"` (add `--goal`, `--state`, `--next`, `--decision` when known). The writer creates `.loci/memory.md`, `.loci/profile.md`, `.loci/progress/`, `.loci/decisions/`, injects the project block into BOTH `CLAUDE.md` and `AGENTS.md`, appends `.loci/` to `.gitignore`, and updates `<brain-path>/projects/index.md`. If the writer is unavailable, do the same steps manually. Never copy the project's full memory into the brain.

### Commands
/loci-sync, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->
