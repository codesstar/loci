# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Tasks can point at scraps** — a task record carries an optional `scraps` list of scrap ids (same shape as `people`). Set it from the task detail (a searchable picker), from a scrap's detail ("+ 关联或新建一个任务" — type a title that does not exist yet and it creates the task already linked), or with `loci-task.js add/update --scraps "ref:a,ref:b"`; chips on the task card open the scrap, and the scrap lists its tasks. Stored one way, on the task; a scrap that is later archived shows as a dashed chip. A scrap is never turned into a task — the task points at it.

## [0.5.0] — 2026-09-03

### Changed
- **碎片 now lives inside 知识库** — the standalone 碎片 page is gone. The knowledge page has two halves: 笔记 (我的笔记 + 链接知识库, unchanged) and 碎片, pinned above the tree. The wall of cards is the page's home; picking a card turns it into a time-grouped stream with a detail column (tags, AI suggestions, 标注); picking a note opens the reader, and `← 碎片` / Esc / the pinned row bring the wall back.
- **随手记 and 收藏夹 are one thing** — everything *collected* (a thought, a link, a quote, a screenshot, a PDF) is a 碎片: one item = one markdown file in `references/` (binaries in `references/files/`), with `type`, `created`, `source`, `tags`, `ai_tags`, `summary`, `caption`, `note` frontmatter. Existing `inbox.md` lines still show up and migrate into files the first time they are edited.

### Added
- **One capture box, made of blocks** — a scrap is a small list of content blocks plus one 标注. Type text (Shift+Enter or the `+` menu seals it into a block; adding a file seals it automatically), paste links (each URL becomes a link block; several links or files can share one scrap), paste a screenshot from the clipboard, or drop images / PDFs onto the wall. `#tag` inside the text becomes a tag, and `#` opens a picker of your existing tags so twins don't get invented. Once a block is in the box, whatever you type next is the 标注 (Enter saves; Shift+Enter makes it another text block instead) — the 标注 is only ever your own words. Cards appear instantly; a link's title and cover are fetched in the background (gzip-aware, gbk-aware, 8s cap) and an AI pass adds 2–3 tags, a one-line summary and, for images, a caption so screenshots become searchable. No AI available → the machine fields still work and the UI says so.
- **Search that spans everything on a card** — text, title, 标注, summary, caption, site, tags; type chips (文字 / 链接 / 图片 / 文件 / 摘录). Typing `#` in the search box (or the `#` button) lists the tags that exist; pick one to filter by it.
- **Research write-ups are notes, not scraps** — raw-doc compilations, competitive research, study guides and market scans belong in `notes/research/` (they show in the notes tree with a reader); there is no "doc" kind of scrap.
- **Cards take their shape from their kind** — no colored kind pill: images bleed to the card edge, a link is a bookmark with its cover, a quote opens with a big mark and its source, a file is one row; kind and date sit as small text in the footer. In the detail column the words on a scrap are click-to-edit, a text scrap can be switched between 文字 and 摘录, and `#标签` typed into the 标注 becomes a tag.
- **The notes half is display-only** — no new-note button, no editor, no properties panel, no delete; notes are written by you (or the AI) elsewhere and the dashboard shows them. Linking a folder or pasting a doc link still works.
- **`scripts/loci-scrap.js`** guarded writer (`add` / `update` / `remove` / `list` / `enrich` / `migrate-inbox`) so the AI in chat and the browser produce identical files; the embedded chat and the brain rules now route 随手记 / 收藏 through it.
- **`/api/scraps` endpoints** and `/scrap-files/<name>` for the binaries; `/api/data` gains a `scraps` section.

### Removed
- The 碎片 page, its bookshelf / drift-stream / drift-wall views and the article overlay (~43 KB of page code). `inbox.md` is no longer written by the AI (still read).

## [0.4.0] — 2026-08-31

### Added
- **Recurring reminders** — standing weekly rules ("drink water Mon–Fri at 9/14/17") as a third reminder source alongside calendar events and timed tasks, computed live instead of materialized into `calendar.json`/`tasks.json`. Manageable from the reminder bell's dropdown (pick/search contacts and places), via guarded CLI commands (`loci-task.js remind` / `remind-toggle` / `remind-remove` / `remind-list`), or by asking the embedded dashboard chat in plain language.
- **People ↔ place linking, both directions** — a place's "关联的人" field is now a contact picker instead of hand-typed names (root-caused a class of relationship-graph/task-chip breakage from typos and forgotten renames); person edit/add forms gained the reverse "关联位置" place picker.
- **Calendar events can carry linked people + a location picker**, matching what tasks already had.
- **Location-aware reminders** — a reminder for a task/event with a location appends it to the notification and, on tap/click, jumps straight into 高德 (amap) navigation. Works for both the in-page browser notification and phone Web Push.
- **One-click "test" button** in the reminder menu to tell a permission problem apart from the OS/Do Not Disturb silently swallowing notifications.

### Changed
- Reminder lead time is no longer a single choice — "at the moment" is now implicit and always fires once reminders are on; 15/30-minute heads-up are optional and multi-selectable. Tasks and calendar events now share the exact same firing logic (previously tasks only fired at the due moment).
- Map tiles switched from CARTO to 高德 (AMap) raster tiles — CARTO is effectively unreachable from mainland China without a VPN.
- A place linked to a person now shows that person's avatar (with a small place-type badge) on the map instead of a generic icon; a person with a precise place link no longer also gets a redundant vague city-level pin. Nearby markers collapse into a click-to-expand cluster badge.
- Scheduling something with no explicit end time now creates a point event (`endKey = startKey`) instead of defaulting to a 1-hour block, rendered as a compact single-line entry when short.
- Task pool header decluttered (removed the 待推进/今日/逾期/已完成 stat pills).

### Fixed
- Editing or deleting a calendar event only mutated client-side state and was never persisted — it silently reverted on the next reload. Added real `/api/calendar/update` and `/api/calendar/remove` endpoints.
- The push service worker's `notificationclick` handler used to just focus an already-open dashboard tab and ignore the notification's destination URL entirely whenever one was open — a location's navigation link would never open in that case.
- The embedded AI chat panel had no way to close it on mobile: the full-screen bottom-sheet layout visually covered the only close control (an external floating button). Added a close button inside the panel header itself.
- `loci-task.js validate` flagged a valid point event (`endKey === startKey`) as "ends before it starts".

## [Unreleased]

### Changed
- **Always-loaded global rules are compact** (engine 0.3.4): the shared Claude/Codex/WorkBuddy block is reduced from 13.8 KB to 3.3 KB. It keeps startup, safe persistence, and project-routing essentials; detailed rules move to on-demand reads from the brain's `CLAUDE.md`.
- **Startup context is now a cross-platform Node map, not a content dump** (engine 0.3.3): native Windows, macOS, and Linux share one zero-dependency builder with a hard output budget. It loads standing preferences, compact routing pointers, the current workspace project pointer, and a short state summary; plans, tasks, inbox items, journals, and project memory stay on demand. Claude Code hooks and shell fallbacks delegate to it, with a no-Node Unix fallback retained.

### Added
- **Native Codex SessionStart hook**: setup safely merges one short-timeout Loci hook into `~/.codex/hooks.json`, preserves unrelated hooks, removes duplicate old Loci handlers, and uses `commandWindows` on native Windows. Updates keep the definition stable and current. If Hook trust is pending, disabled, unavailable, or the JSON cannot be parsed safely, the lightweight `AGENTS.md` startup command remains the fallback.

### Fixed
- **Windows Git Bash brain pointers now work in native Node hooks** (engine 0.3.5): setup stores a portable native path instead of `/g/...`; Claude's SessionStart wrapper also translates existing Git Bash, Cygwin, and WSL drive paths at runtime. Updates repair stale/alternate pointers when unambiguous, preserve a valid pointer to another brain, refresh Claude/Codex/WorkBuddy with the validated path, and back up the old pointer before changing it.
- **Removed the hidden duplicate Codex hook layer** (engine 0.3.4): obsolete project-level `.codex/hooks.json` and Bash context dump scripts are retired. The installer/updater semantically removes only old Loci handlers, preserves unrelated project hooks, and backs up every removed artifact. This prevents concurrent duplicate injection and invalid machine-specific paths.
- **Cross-terminal hooks are native Node** (engine 0.3.4): Claude's write tracker now reads the official PostToolUse JSON payload instead of relying on a missing shell variable, and the update checker is portable across native Windows, macOS, and Linux. Shell launchers remain thin compatibility fallbacks.
- **Web setup now matches CLI integrations** (engine 0.3.4): WorkBuddy can be selected directly in the default browser wizard, while existing `MEMORY.md` content is backed up, preserved, and never duplicated on repeat setup. The browser setup files are now part of the managed upgrade set, so existing installations receive future wizard fixes.
- **Claude startup coverage is complete** (engine 0.3.4): the lightweight `SessionStart` hook now refreshes after `/clear` and forked/branched sessions as well as startup, resume, and compaction. Project and global handlers both have a 3-second fail-open timeout, preventing a broken context helper from holding a session open.
- **Codex/WorkBuddy turns no longer take minutes** (engine 0.3.2): tools without a hook mechanism were following the instruction block literally — reading each startup file in its own tool call, sometimes re-reading per message and retrying failed reads, which stretched single turns to 5-15 minutes. New `scripts/loci-context.sh` prints the whole startup context in ONE command (~10ms); the instruction block now mandates running it once per session, forbids per-message re-reads, and forbids retrying failed reads. `update.sh` now refreshes the loci block in `~/.codex/AGENTS.md` and `~/.workbuddy/MEMORY.md` too (it previously only refreshed `~/.claude/CLAUDE.md`), so this fix actually reaches existing installs.

### Added
- **WorkBuddy is now a first-class connect target in setup** — `./setup.sh` auto-detects `~/.workbuddy/` (`--connect auto`), offers it in the interactive wizard, and injects the shared rules block into WorkBuddy's `MEMORY.md`; `--connect workbuddy` / `--connect all` added for scripted installs. Same brain, third tool.

### Fixed
- **Dashboard no longer flickers** (hit Windows users hardest — OneDrive/antivirus attribute-event storms): live reload now verifies a file's content actually changed (size+mtime), ignores the server's own writes, rate-limits notifications to one per 3s, and refreshes data in place over Vue reactivity instead of reloading the page. The journal draft and expanded panels survive a refresh; only dashboard code changes still trigger a real reload. (engine 0.3.1)

### Changed
- **`me/` personal-memory layer restructured** into six explicit files — `identity`, `values`, `wellbeing` (new), `insights` (repurposed for fresh personal reflections rather than only consolidation output), `learned`, and `evolution`. Goals now live in root `plan.md` instead of `me/goals.md`. Docs, templates, the dashboard, `examples/alex`, and both installers were updated to the new model.

## [1.1.0] — 2026-07-06

Release-readiness overhaul: a fresh install now starts truly blank, and the repo ships only what users need.

### Added
- **`loci` command** — installed by setup; type `loci` in any terminal to start the dashboard server and open it in your browser (`loci stop` / `loci path` / `loci update` / `loci help`)

### Changed
- **Dashboard reads your real brain out of the box** — the shipped dashboard no longer boots into a demo dataset. Empty brains show clean empty states with gentle hints; demo data lives only in the public online demo
- **Tasks and schedule are fully separate** — a timed task lives only in the task pool (reminders read it from there) and is no longer auto-projected onto the calendar; putting a task on the schedule is a deliberate action
- `AGENTS.md` (Codex) synced to the same task/schedule model as `CLAUDE.md`, and added to the managed engine files so upgrades keep it current
- One dashboard build: the Clean theme is now the only `index.html` (served at `/`)

### Removed
- Legacy dashboard builds (sci-fi theme, ink prototype, `pro/`, `demos/`, `server.py`, `build.py`)
- Sample content that leaked into fresh installs: Sam Rivera persona files in `me/`, the `client-acme` sample department, sample decisions (the full worked example remains in `examples/alex/`)
- ~15MB of unreferenced images and design-history pages; git history rewritten to shrink clones

### Fixed
- Dashboard logo 404 on fresh clones (referenced asset was never tracked)

## [1.0.0] — 2026-03-11

### Added
- **Memory Consolidation** — daily auto-review of recent distilled knowledge, cross-domain pattern detection, insight generation to `me/insights.md`. Manual trigger via `/loci-consolidate`
- **Source Citations** — distilled entries annotated with `<!-- source: ... -->` for traceability
- Sub-project local persistence (`.loci/memory.md`)
- Project index summaries (`insight` / `milestone`)
- Global awareness block for `~/.claude/CLAUDE.md`
- Sub-project files consolidated into `.loci/` directory
- Progressive feature discovery (context-triggered feature introduction)
- Wellbeing system with schedule presets and configurable reminders
- Multi-language support (en/zh/mix) with config-driven notifications

### Fixed
- `build.py` LOCI_ROOT path (3 dirname levels instead of 2)
- `check-updates.sh` timestamp race condition (line-count-based checkpoint)
- `.gitignore` comment false match on config.yml
- Notification format: natural language instead of `[Loci]` prefix
- Example brain name consistency (Alex Rivera throughout)

### Removed
- Routing modes (deferred to v2.0 — see [roadmap](docs/roadmap.md))
- Auto-compression (deferred to v2.0)
- Privacy boundary configuration (deferred to v2.0)
- Distillation level presets (deferred to v2.0)

## [0.1.0-alpha] — 2026-03-10

Initial public release.

### Added

- **4-folder core structure**: `me/`, `tasks/`, `decisions/`, `archive/` — minimal by default, extend on demand
- **Signal-driven auto-persistence (Synapse)**: AI watches each conversation turn for meaningful signals (tasks, decisions, insights, identity changes, goal updates) and saves immediately. No signal = no save
- **4 slash commands**: `/loci-sync`, `/loci-settings`, `/loci-brain-settings`, `/loci-scan`; project memory is AI-initiated instead of command-driven
- **Web dashboard**: local pixel-art dashboard built with vanilla HTML/CSS/JS, data generated by `build.py`
- **Three-layer context system**: L1 (every conversation), L2 (on demand), L3 (archive) — keeps the AI fast while maintaining deep history access
- **Distillation protocol**: conversations are distilled into structured updates (facts, decisions, tasks, insights), never saved as raw transcripts
- **Project memory**: serious projects keep memory in their own repo via `.loci/memory.md` + `.loci/decisions/`; the brain keeps only a light index
- **Conversational onboarding**: `install.sh` launches Claude, which sets up the brain through conversation — no forms, no config files
- **Growth tracking**: identity/values/goals changes are archived to `me/evolution.md` before updating current files
- **Extension modules**: `people/`, `finance/`, `content/`, `references/` created on demand, not in default install
- **Activity log**: `.loci/hooks/on-file-change.sh` tracks file changes across sessions
- **Example brain**: `examples/alex/` shows a fully populated brain for reference
