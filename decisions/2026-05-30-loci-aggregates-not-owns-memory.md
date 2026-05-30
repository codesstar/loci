---
date: 2026-05-30
tags: [decision, projects, memory, architecture, principle, north-star]
status: active
supersedes: 2026-05-30-project-memory-tiering.md (partial — see "Relationship to earlier decision")
---

# North-star principle: Loci aggregates memory, it does not own it

The single principle that governs how Loci handles project memory, derived through a
long design conversation that started from the dilemma "full-sync everything into the
brain vs. sync nothing". This decision records both the principle and the concrete
mechanism it implies.

## The principle

> **Loci aggregates memory; it does not own it.**
> A project's memory belongs to the project itself (it lives in the project's own repo).
> Loci's job is only to let that memory *enter the brain, be related, and be recalled* —
> the brain is an **index + understanding layer, not a warehouse**.

Why this is right:
- **Ownership is correct.** A project's decisions and progress are part of the project,
  like its code and README. They travel with the repo. If Loci goes away, the project's
  memory does not — it was never Loci's to hold.
- **It is the true "second brain" metaphor.** A real brain does not store every file of
  your company or the full text of every book on your shelf. It stores "I know this
  exists, I know where to find it, I remember the gist and my judgment." The archive is
  in the archive room. Loci = index + understanding, not storage.
- **It sharpens positioning.** Loci does not compete with Notion / project tools on
  "storing things." It does the thing they don't: relate project memories across one
  brain so the AI can recall across projects. A higher, less replaceable position.

## Background

User runs many projects at once — from serious main projects down to repos they clone,
glance at, and abandon. Two naive strategies were both rejected earlier:
- **Full sync** → drowns the brain over time.
- **No sync** → brain effectively has no memory of the project ("等于没记忆").

Through discussion the user rejected two implementation routes as well:
- **Global rule "remember every project"** → wasteful; records glance-only projects.
- **A manual `/loci-link` command** → adds cognitive load; forces the user to learn a
  concept ("what is loci-link, why do I need it") before they can use it. Bad design.

The breakthrough was the user's framing: *Loci should not have to act as the storage for
a project's memory; it only needs to let that memory be able to enter the brain.* When a
project is not yet serious, the brain can hold it temporarily as a courtesy. When it
becomes serious, the user has endorsed the mechanism — so writing into the repo is no
longer "intrusion", it is a service the user asked for.

## Options considered for where memory lives

1. **Two copies (repo full-text + brain summary), kept in sync** — rejected. Two copies
   means a sync problem, which spawned four hazards (path coupling, write conflicts, no
   buffer, bidirectional confusion). The earlier `project-memory-tiering.md` leaned this
   way.
2. **One copy in the brain only; repo pulls via a path** — rejected, because it violates
   the north-star principle: the brain would *own* the project's memory.
3. **One copy in the repo (source of truth); brain holds only a directory entry** —
   **chosen.** Ownership is correct, there is only one copy so there is no sync problem,
   and the four hazards never arise.

## Decision — the mechanism

### Three containers (and what separates them)

Every incoming message is lightly classified first:

1. **Automatic layer** — tasks / times / decisions / personal info mentioned in *any*
   terminal auto-route to their buckets (per the global CLAUDE.md the AI follows by
   default). User is unaware; no project setup needed. (See
   `task-first-schedule-model.md` for the task/schedule routing.)

2. **Serious project** — a project the user has endorsed. Triggered EITHER by the user
   saying "connect this / give this project memory", OR by the AI recognizing a
   "this-is-getting-real" signal (a decision was made, the user keeps returning to the
   repo, a milestone happened) and **offering once**. On the user's yes:
   - In the project repo: create `.loci/memory.md` (a living dossier) and `.loci/decisions/`
     (time-stamped, append-only — same model as the brain's own `decisions/`, shrunk to
     project scale).
   - Write a short block into the project's own `CLAUDE.md` so any AI entering that repo
     later automatically knows to record (decisions → `.loci/decisions/`, status changes →
     `.loci/memory.md`, `[insight]`/`[milestone]` items sync up to the brain).
   - In the brain: `projects/` holds only a **directory entry** for this project
     (name / repo path / activity status). The brain does NOT store a copy of the
     project's memory; when it needs to know, it reads the repo.

3. **Project-related but not yet serious** (a project embryo that hasn't grown up) —
   the brain holds it temporarily in `projects/side.md` (an incubator). If it grows up,
   it graduates into a serious project (gets its own repo memory) and leaves `side`.

Anything that is a pure thought / loose to-do (not a project) → `inbox.md`.

### memory.md vs decisions/ inside a project repo

- `.loci/memory.md` = a **snapshot / living dossier**: goal, current state, next step,
  related people. It is **updated in place** when state changes — one file, mutable.
  Answers "what is this project right now."
- `.loci/decisions/` = a **stream**: one file per important decision, append-only,
  time-ordered (e.g. `2026-06-02-use-x-not-y.md`). Answers "what trade-offs were made
  over time." Mirrors the brain's `decisions/` model at project scale.

This is the brain's own structure (plan/identity = dossier; decisions/ = stream)
replicated at a smaller scale, so the user learns nothing new — the project looks like
a mini-brain.

### side vs inbox — the boundary (must stay sharp)

| | inbox | projects/side |
|---|---|---|
| Holds | any loose thought / spark / to-do fragment | something tied to a *project / product idea* that isn't serious enough to formalize yet |
| One-line test | "this is a **thought**" | "this is a **project that hasn't grown up**" |
| Future | sorted → becomes a task/decision, or deleted | may grow into a serious project → then gets repo memory and graduates |
| Metaphor | the brain's scratch paper | a project incubator / waiting bench |

Sharpest line: **every item in `side` is a *potential project*; every item in `inbox`
is a potential task/decision/or nothing.** `side` is the project-dimension staging area;
`inbox` is the thought-dimension staging area.

Natural flow (nothing is ever homeless):
`inbox (a thought) → side (if the thought is actually "I want to build a project") →
serious project (if it really gets built and the user endorses) → dormant (if untouched
a long time) → archived/removed from the dashboard.`

Implementation: `side` is its own file `projects/side.md` (sibling to `inbox.md` but a
different dimension; lives under `projects/` so the context is right). `side` is the one
legitimate exception to the north-star principle — embryo project fragments have no repo
to belong to yet, so the brain holds them until they grow up.

### AI proactive prompting — strict restraint

The AI may offer to connect a project, but must not nag:
- **Offer at most once per project.** If the user says no, never offer for that project
  again (remember the refusal). Only re-offer if the user themselves asks.
- **Always at the end of a conversation, never interrupt active work.**
- **At most one offer per conversation.** (Same restraint already used for the inbox
  sort-nudge.)

### When the user does NOT want to connect a project

Trivial: nothing is written to the repo, the brain doesn't track it as a project. If it
is project-related, `side` holds it; otherwise `inbox`. No intrusion, no concept to learn.

### Build the first memory with content (B, not empty)

Because the AI only offers at a "worth-remembering" moment (e.g. a decision just
happened), on the user's yes it writes that decision + its current understanding of the
project (what it's doing, what stage) into the memory immediately — the dossier is born
with substance, not empty. Risk: the AI's understanding may be imperfect; the user can
glance and correct.

### Timestamp everything

Every recorded item should carry a timestamp (ISO 8601 with timezone, e.g.
`2026-05-30T14:30:00+10:00`).
- **Cost is negligible.** A timestamp is a tiny string; capturing the current time is one
  of the cheapest OS calls. A thousand records add only tens of KB — no impact on read
  speed. Loci already timestamps (`tasks.json` createdAt/updatedAt/completedAt,
  `decisions/` `date:`, inbox 14-day decay). This just applies it everywhere.
- **It is fuel, not decoration.** Activity/dormant detection, `stale` folding, and inbox
  decay all depend on timestamps. They are a functional requirement.
- **The real cost is correctness, not performance.** When dashboard/`server.js` writes,
  timestamps are stamped automatically and are always right. When the AI hand-writes
  markdown (e.g. into a project's `.loci/decisions/`), the AI must remember to stamp it
  in the correct format — this is enforced by rule, not by performance.

## Relationship to earlier decision

This decision **supersedes the storage model** of `2026-05-30-project-memory-tiering.md`.
That earlier note proposed the brain holding a *compressed summary copy* of each project
alongside the repo full-text (option 1/2 above). This is now rejected: it violates the
north-star principle and re-introduces the two-copies sync problem. What is KEPT from the
earlier note: tiered thinking, lifecycle auto-demotion (active/dormant/archived/glanced),
glance-only projects default to not-recorded, tag-first essence (`[decision]`/`[insight]`/
`[milestone]`) with AI fallback, and the lightweight `project` label on tasks.

## Follow-up

- [ ] Add `people` and `project` routing into `AGENTS.md` / `CLAUDE.md` /
      `templates/global-claude-block.md` so these dimensions enter the AI's routing tree
      (currently absent — the AI has no trigger to write them).
- [ ] Write the north-star principle into the core instruction files as a stated rule.
- [ ] Define the small `CLAUDE.md` block injected into a connected project's repo.
- [ ] Create the `.loci/memory.md` + `.loci/decisions/` templates for project repos.
- [ ] Create `projects/side.md` and document the side-vs-inbox boundary where the AI
      will see it.
- [ ] Dashboard: project list with activity status; a "side / incubating" lane; collapse
      dormant. Let the user demote/archive from the UI.
- [ ] Decide the "this-is-getting-real" signal threshold precisely (decision made /
      repeated returns / milestone) so the AI offers at the right moment, not too early.
- [ ] Apply "timestamp everything" consistently across all write paths.

<!-- source: conversation @2026-05-30 — long design discussion deriving the north-star principle -->
