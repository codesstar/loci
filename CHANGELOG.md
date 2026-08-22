# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed
- **Startup context is now a cross-platform Node map, not a content dump** (engine 0.3.3): native Windows, macOS, and Linux share one zero-dependency builder with a hard output budget. It loads standing preferences, compact routing pointers, the current workspace project pointer, and a short state summary; plans, tasks, inbox items, journals, and project memory stay on demand. Claude Code hooks and shell fallbacks delegate to it, with a no-Node Unix fallback retained.

### Added
- **Native Codex SessionStart hook**: setup safely merges one short-timeout Loci hook into `~/.codex/hooks.json`, preserves unrelated hooks, removes duplicate old Loci handlers, and uses `commandWindows` on native Windows. Updates keep the definition stable and current. If Hook trust is pending, disabled, unavailable, or the JSON cannot be parsed safely, the lightweight `AGENTS.md` startup command remains the fallback.

### Fixed
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
