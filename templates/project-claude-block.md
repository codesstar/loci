<!-- loci:project:start v1 -->
## Loci Project Memory

This project is connected to a Loci brain at `<brain-path>`.

**Principle — Loci aggregates memory, it does not own it.** This project's memory lives
HERE, in this repo. The brain only keeps a one-line index entry. Never expect the brain
to store this project's full memory.

### On session start
- Read `.loci/memory.md` for this project's current state, Now / Next, recent progress, active decisions, and risks.
- Read `.loci/profile.md` only when stable project details are needed: scope, milestones, key people, files, conventions.
- Read `.loci/decisions/` only when a past decision is relevant (don't auto-load all).
- Read `.loci/progress/YYYY-MM.md` only when the user asks what happened on a date or recent project detail is needed.

### What to record, and where
- **A decision** (a real trade-off, "chose X not Y") → write `.loci/decisions/<YYYY-MM-DD>-<slug>.md`
  using the four-part structure (Background / Options / Decision / Follow-up), append-only.
  Test: if the decision is internal to THIS project (tech, architecture, a feature trade-off),
  it stays here — that's almost always the case. Only a decision that is really the user's
  personal direction / strategy / methodology (meaningful even without this project) belongs
  in the brain's `<brain-path>/decisions/` instead.
- **Status / progress change** (goal, current state, next step, a milestone) → update
  `.loci/memory.md` in place only for current restart context; append the full stamped event to
  `.loci/progress/YYYY-MM.md` under `## YYYY-MM-DD` as `- HH:MM · what changed`.
- **Stable project attributes** (milestones, key people, important files, scope, conventions) →
  update `.loci/profile.md`, not `.loci/memory.md`.
- **A development to-do for THIS project** (something to build/fix/ship) → `.loci/todo.json`,
  NOT the brain's personal task pool. Write it through the guarded writer, never by hand:
  `node <brain-path>/scripts/loci-projtodo.js add --repo <this-repo> --text "..." [--category "..."]`
  (also `toggle` / `done` / `move` / `remove` / `list` / `validate`). Each todo gets a permanent
  `id` so the dashboard can toggle / reorder it. The dashboard reads this file to show project todos.
- **An insight or milestone worth the brain knowing** (`[insight]` / `[milestone]`) →
  also update the project's index entry in the brain's `<brain-path>/projects/index.md`.
- Keep `[local]` / `[debug]` / `[wip]` notes here only; do not push them to the brain.

### Always
- Stamp every record with an ISO 8601 timestamp (e.g. `2026-05-30T14:30:00+10:00`).
- `.loci/memory.md` = restart context, kept short. `.loci/profile.md` = stable project details.
- `.loci/progress/` = project progress stream. `.loci/decisions/` = decision stream.
- Speak to the user in plain language; don't expose file paths or internal terms.
<!-- loci:project:end -->
