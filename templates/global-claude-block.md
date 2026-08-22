<!-- loci:start v2 -->
## Loci Shared Brain

- Brain: `<brain-path>`
- These rules apply in every project. Claude Code, Codex, and WorkBuddy may share this brain.

### Lightweight startup

- If a `[Loci] Lightweight startup map` was injected by a SessionStart hook, use it and run nothing else.
- Otherwise run exactly one launcher once per session:
  - Native Windows PowerShell/cmd: `& "<brain-path>\scripts\loci-context.cmd"`
  - macOS/Linux/WSL/Git Bash: `bash "<brain-path>/scripts/loci-context.sh"`
- Never run both, retry, or repeat the launcher on each message. If it fails, read only `<brain-path>/me/preferences.md` once and continue.
- The map contains standing preferences and pointers only. Do not preload plans, tasks, inbox, journals, history, or project memory. Open the smallest relevant file when the request needs it, and cache it for the session.
- For current/latest/today questions, refresh only the smallest relevant source. For uncommon memory writes or detailed routing rules, read the relevant section of `<brain-path>/CLAUDE.md` on demand rather than loading it at startup.

### Memory writes

- Answer the user first. Then lightly check for a durable signal; no signal means no save.
- Auto-save clear tasks, decisions, stable factual preferences/details, and useful links. Ask before saving sensitive, ambiguous, highly subjective, or major strategy/life changes. Distill; never save raw transcripts.
- Preferences about nickname, language, tone, or workflow go to `me/preferences.md` and apply in the acknowledging reply itself.
- Tasks go through the Dashboard API when running, otherwise `node <brain-path>/scripts/loci-task.js ...`; never hand-edit task JSON. A task with a date/time remains a task. Meetings, appointments, travel, meals, and deliberate time blocks go to the schedule. Loose ideas go to `inbox.md`.
- Personal decisions go to `decisions/`; personal facts/insights go to `me/`; third-party links/materials go to `references/`; the user's own note pointers go to `notes/index.md` (short inline notes may live in `notes/`).
- After any brain write, append one human-readable line to `.loci/activity/YYYY-MM.md` under today's heading: `- HH:MM · <category> · <traceable summary>`. Never auto-load this ledger; read it only when asked what happened.
- Keep confirmations short and natural. Do not expose internal paths unless asked. An undo request should revert the last save when possible.

### Project memory

- Loci indexes serious projects; it does not own their full memory. Project state belongs in that repo's `.loci/memory.md`, stable facts in `.loci/profile.md`, progress in `.loci/progress/`, and decisions in `.loci/decisions/`. The brain keeps only `projects/index.md`.
- Connect a project with `node <brain-path>/scripts/loci-project.js connect ...`; this updates both `CLAUDE.md` and `AGENTS.md`. A development todo belongs in that repo's `.loci/todo.json` via `node <brain-path>/scripts/loci-projtodo.js ...`, not in the personal task pool.
- Before writing people/relationships, places, notes, or project records, consult the matching section of `<brain-path>/CLAUDE.md` if the compact rules above do not fully determine the safe route.

### Commands

`/loci-sync` · `/loci-settings` · `/loci-scan` · `/loci-consolidate`
<!-- loci:end -->
