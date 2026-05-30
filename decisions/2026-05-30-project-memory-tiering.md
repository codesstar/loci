---
date: 2026-05-30
tags: [decision, projects, memory, architecture, cross-project]
status: active
---

# Project memory tiering — pointers + essence, not full sync

How Loci should remember a user's many projects without either drowning the brain
or leaving projects so siloed that the brain effectively has no memory of them.

## Background

The user runs 7-8 projects at once, ranging from active main projects (e.g. Loci
itself) down to repos they just clone, glance at, and abandon. Two naive strategies
were considered and both rejected:

- **Full sync** (mirror everything from every project into the brain): best recall,
  but over time the brain drowns in detail and becomes unusable.
- **No sync** (everything stays in each project's own repo): brain stays clean, but
  with no pointer to the project the brain effectively has no memory of it — "等于没记忆".

The real question is not *whether* to sync but *at what granularity*. A human brain
does not memorize every line of every project either — it remembers that the project
exists, what it is for, and the lessons learned, while details are forgotten but
findable.

## Options

1. **Full sync** — rejected: drowns the brain.
2. **No sync** — rejected: no pointer = no memory.
3. **Tiered: pointer + essence in brain, full detail in project repo** — chosen.

## Decision

**Core model: the brain stores a pointer + the essence; full detail stays in the
project's own repo.** Not-syncing-detail is NOT the same as no-memory, as long as the
brain holds a pointer (the index line in `projects/index.md`).

- **Brain side (`~/loci`)** holds only:
  - `projects/index.md` — one 2-4 line index entry per real project (what it is,
    current status, one-line essence). This is the single overview surface.
  - `projects/side.md` — project embryos that are not serious enough for their own
    repo memory yet.
- **Project side (`~/projects/<name>/.loci/memory.md`)** holds the project body:
  goals / current state / next step, project-level decisions, progress log, related
  people (people themselves live in brain `people/`; the project only references them).

- **What floats up to the brain (essence) — tag-first + AI fallback:**
  - Tag-first: `[insight]` / `[milestone]` summaries that matter outside the repo
    may update the project's one-line entry in `projects/index.md`.
  - `[decision]` / `[architecture]` usually stay in the project repo unless they
    affect the user's broader strategy or multiple projects.
  - `[local]` / `[debug]` / `[wip]` stay in the project repo and the brain never
    sees them.
  - AI fallback: if something worth remembering was not tagged, at the end of a
    session the AI asks one short question ("这个要不要记到大脑?") before letting it
    stay local. Tagged items never need the question.

- **Project-level vs global decisions:**
  - Project-scoped choice (e.g. "Loci dashboard uses Vue not React") → stays in the
    project's `.loci/memory.md`.
  - Decision that affects overall direction / crosses projects (e.g. "narrow Loci's
    positioning to Claude + Codex") → promoted into brain `decisions/`.

- **Glance-only projects** (clone-and-look, tried-then-dropped): default is **do not
  record** — they do not enter the brain and do not enter the project index. Only when
  the user explicitly says "记下这个" does a single line go into root `inbox.md`. The
  threshold is deliberately high to keep the brain clean.

- **Lifecycle auto-demotion** (mirrors the task `stale` philosophy — no cron, derived
  on read):
  - 🟢 `active` (recently touched) → essence floats up; index line + key decisions + progress.
  - 🟡 `dormant` (30-60 days untouched) → freeze: stop floating up, keep only the index line.
  - ⚪ `archived` (user says it's done/dropped) → seal with a one-line epitaph
    ("done, stopped at X, because Y").
  - 🔍 `glanced` → not in the project index at all.

- **Task ↔ project coupling stays lightweight:** the `"project"` string field on each
  task in `tasks/tasks.json` is just a label/filter. No per-project task aggregation is
  built (decided separately — label is enough for now).

## Follow-up

- [x] Add a `people` routing rule and a `project` routing rule into `AGENTS.md` /
      `CLAUDE.md` / `templates/global-claude-block.md` so these two dimensions actually
      enter the AI's routing decision tree (currently the five-bucket routing has
      neither people nor project, so the AI has no trigger to write them).
- [ ] Populate `projects/index.md` with real index entries for the user's active projects
      (currently empty template).
- [x] Create a `.loci/memory.md` template for project repos capturing: goals / current
      state / next step, project-level decisions, progress log, related people.
- [ ] Clarify references vs inbox boundary (links/articles → references; loose ideas → inbox).

<!-- source: conversation @2026-05-30 — user's "全同步 vs 不同步" project-memory dilemma -->
