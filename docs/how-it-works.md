# How Loci Works — The Complete Guide

> This is the "read one doc, understand everything" guide. Each section builds on the previous one, matching the order you'll actually experience Loci as a user.

## User Experience Rhythm

```
Week 1: Install → chat → AI remembers you          Just talk. That's it.
Week 2: Connect other projects → project-owned memory    AI offers when a project gets serious
Week 3: Dashboard + config tuning                   Visual overview + /loci-brain-settings
Week 4+: Fine-grained control                       /loci-settings, /loci-sync flags
```

You never need to learn everything upfront. The system reveals itself as you use it.

---

## Layer 1: The Brain

Your brain is a folder. Inside are markdown files organized into four core modules plus system internals:

```
my-brain/
├── CLAUDE.md          ← AI's operating system (reads this first)
├── plan.md            ← Your life direction and goals (loaded every conversation)
├── inbox.md           ← Quick capture box (L2, read when fragments/quick thoughts are relevant)
│
├── me/                ← Who you are
│   ├── identity.md    ← Basics (name, job, city)
│   ├── values.md      ← What you believe in
│   ├── wellbeing.md   ← Body, mind, energy, sleep, confidence
│   ├── insights.md    ← Fresh personal reflections
│   ├── learned.md     ← Reusable lessons and practices
│   └── evolution.md   ← Growth timeline (old versions append here)
│
├── tasks/             ← Tasks + planning (merged)
│   ├── tasks.json     ← Task database — single source of truth (guarded writer only)
│   ├── calendar.json  ← Schedule — occupied time blocks, kept separate from tasks
│   ├── active.md      ← Read-only snapshot generated from tasks.json (fast AI startup read)
│   ├── daily/         ← One md per day (day notes + review, not a task source)
│   └── journal/       ← Daily summaries (buffer.md → end-of-day journal)
│
├── decisions/         ← One file per major decision (with context + reasoning)
├── projects/          ← index.md (one line per serious project) + side.md (embryos)
├── archive/           ← Expired content moves here, never deleted
├── scripts/           ← Guarded writers (loci-task.js, loci-project.js, loci-projtodo.js)
│
├── .loci/             ← System internals
│   ├── hooks/         ← Cross-terminal sync hooks
│   ├── dashboard/     ← Visual panel (node server.js)
│   ├── config.yml     ← Brain settings (persistence mode, notifications)
│   ├── status.yml     ← Current state (tired / energized / traveling)
│   └── activity/       ← Activity ledger (one file per month, audit layer — "what did I do?")
│
└── (extension modules, created on demand)
    ├── finance/       ← Budget, assets, financial tracking
    ├── people/        ← Contacts, meeting notes, relationships
    ├── content/       ← Writing, content creation, publishing
    ├── references/    ← External knowledge base (articles, books, quotes — third-party; research in research/)
    └── notes/         ← Your OWN notes — index of Obsidian/Feishu/Notion links + short inline notes
```

### Three-Layer Context

This is Loci's core design — not all memories need to load every time:

| Layer | When loaded | Contents | Human analogy |
|-------|------------|----------|---------------|
| **L1** | Every conversation | CLAUDE.md, plan.md, tasks/active.md, projects/index.md, status.yml, auto-memory | Working memory (rules, indexes, current action summary, important personal context) |
| **L2** | When the topic comes up | inbox.md, module READMEs, specific people/task/plan files, references, research evidence, notes | Episodic memory (one thought away) |
| **L3** | Only when explicitly asked | archive, old decisions, evolution.md, old journals | Long-term memory (have to dig for it) |

**Why three layers?** AI context windows are finite. Loading everything every time wastes tokens and dilutes attention. L1 stays lean and carries only the frame needed for judgment and action; fragment pools such as `inbox.md` live in L2 and are read when fragments/quick thoughts/idea triage are relevant; L3 grows forever without affecting performance.

> Deep dive: [Architecture](architecture.md)

---

## Layer 2: Distillation

This is the fundamental difference between Loci and "chat history": **we don't save raw conversations, only distilled conclusions.**

### Routing Rules

```
You say something
       ↓
  AI evaluates: is there something worth storing here?
       ↓
   No  → do nothing
   Yes → classify + route:
         ├── Personal fact ("I moved to Berlin")       → me/identity.md
         ├── Fresh reflection ("relationships follow value") → me/insights.md
         ├── Reusable lesson ("never deploy on Fridays") → me/learned.md
         ├── Wellbeing/state ("sleep drives confidence") → me/wellbeing.md
         ├── Your decision ("one project at a time")   → decisions/2026-03-10-xxx.md + L1 promotion check
         ├── Project decision ("going with PostgreSQL") → that repo's .loci/decisions/ + project memory check
         ├── New task ("need to update API docs")      → guarded writer → tasks/tasks.json
         ├── Schedule item ("meeting at 3pm")          → guarded writer → tasks/calendar.json
         ├── External content (article, tweet, quote)  → references/
         ├── Research evidence (raw docs, market scan) → references/research/
         └── Vague thought ("maybe I should learn Rust") → inbox.md
```

Decision records are choices and rationale. Research is evidence; it lives in `references/research/` and can be cited from decisions.

### Distillation Levels

- **Factual info** (city, job, tool preferences) → Save immediately, one-line confirmation
- **Subjective/strategic info** (values changed, goals shifted) → Ask you to confirm first

### Growth Tracking

When identity, values, wellbeing, or durable behavior changes, Loci doesn't overwrite — it evolves:
1. Current file (e.g. values.md or wellbeing.md) updates to the latest state
2. Old/new/reason appends to `evolution.md`

Result: current files stay lean (fast L1 loading). evolution.md is your personal growth timeline (L3, read it when you want to reflect).

### Before & After

**Raw conversation:**
> "I've been thinking about my side project. Maybe I should pivot from B2C to B2B. And the pricing should be $49/mo not $19. Also, I realized I need to stop checking Twitter first thing in the morning."

**What Loci stores:**
- `decisions/2026-03-10-pivot-to-b2b.md`: Pivot to B2B, price $49/mo, leverages enterprise experience
- `me/insights.md` (appended): Noticed that morning attention shapes the whole day's sense of agency
- `me/learned.md` (appended): Don't check Twitter first thing — it fragments focus
- `tasks/tasks.json` (via the guarded writer): Update landing page for B2B positioning

Three places updated. Zero raw transcript saved. Everything searchable and in context.

> Deep dive: [Distillation](distillation.md)

---

## Layer 3: Persistence (Synapse)

This answers "when does saving happen?"

### Auto Mode (default — new users get this)

```
You chat with AI
    ↓
Every turn, AI internally evaluates: anything worth storing this turn?
    ↓
  No signal → silence, keep chatting
  Has signal → save immediately → one-line natural confirmation:
                Got it — added task "Buy power cable"
    ↓
You see the notification, don't need to respond, keep chatting
If it saved something wrong → say "undo"
```

**Key: signal-driven, not fixed interval.** Chat 10 turns of small talk, nothing saved. Make one major decision in 1 turn, saved immediately.

### Manual Mode (for power users who want full control)

Nothing auto-saves. Only stores when you say "save this" or run `/loci-sync`.

### The `/loci-sync` Command

Available in both modes. Manual trigger for a full "distill + sync":

```
/loci-sync              → Review conversation + save files + update project index if needed
/loci-sync --local      → Save locally only, don't update the brain project index
/loci-sync --dry-run    → Show what would be saved, don't execute
```

> Deep dive: [Synapse](synapse.md)

---

## Layer 4: Multi-Project Orchestration (Synapse Routing)

This is the Week 2 feature — when you have multiple project folders.

### Connecting a Project

There is no command the user has to learn. When AI notices a project is getting serious, it offers once at the end of the conversation:

> "This project seems real now. Want me to leave memory here?"

If the user says yes:
1. Creates `.loci/memory.md` in the project repo (short restart context)
2. Creates `.loci/profile.md` for stable project details
3. Creates `.loci/progress/` and `.loci/decisions/`
4. Injects a Loci project block into the repo's `CLAUDE.md` and `AGENTS.md`
5. Adds `.loci/` to the repo's `.gitignore`
6. Adds one index line to the brain's `projects/index.md`

AI tools should use `scripts/loci-project.js connect` for this multi-file write whenever possible.

Loci aggregates memory; it does not own it. The project repo owns the project memory.

### Information Flow

```
           Brain (HQ)
          ╱    │    ╲
         ╱     │     ╲
    Project A  Project B  Project C
    .loci/     .loci/     .loci/

Brain index (projects/index.md): one line per serious project
  "CloudMetrics — alerting SaaS. repo: ~/work/cloudmetrics. memory: .../.loci/memory.md"

Project decisions (.loci/decisions/): durable project choices
  "Chose PostgreSQL over SQLite because..."

Project restart context (.loci/memory.md): where to resume
  Current state, next actions, active decisions, risks

Project profile/progress:
  Stable details live in .loci/profile.md
  Project progress lives in .loci/progress/YYYY-MM.md
```

### What Reaches the Brain

Most project memory stays inside the project repo. The brain only keeps enough index to know the project exists and where to look.

**May update brain index**:
- `[insight]` — lesson worth remembering across contexts
- `[milestone]` — shipped feature, release, or phase change
- brain-level decision links, only when promoted

**Stay local**:
- `[decision]` — normal project decisions live in `.loci/decisions/`
- `[local]` — project-specific context
- `[debug]` — bug fixes, workarounds
- `[wip]` — work in progress

### Project Configuration (/loci-settings)

Each connected project can configure what gets summarized in the brain index via `/loci-settings`.

> Deep dive: [Synapse](synapse.md) — signal routing and project-owned memory

---

## Layer 5: Configuration

### Inheritance Chain

```
Loci built-in defaults → Brain settings → Sub-project settings → User override
```

Privacy is always a hard boundary — project indexes never copy private repo detail into the brain.

### Two Config Commands

| Command | Where | Controls |
|---------|-------|----------|
| `/loci-brain-settings` | Brain | Persistence mode (auto/manual), notifications |
| `/loci-settings` | Sub-project | What tags this project pushes to brain |

### Brain Settings (v1.0)

```yaml
persistence:
  mode: auto              # auto (signal-driven) | manual
  notify: true            # Show notification after each save
```

> Advanced settings (privacy boundaries, distillation levels, routing modes, retention policies) are planned for v2.0. See [Roadmap](roadmap.md).

---

## Layer 6: Supporting Mechanisms

### Daily Plans + Journal
- `tasks/daily/YYYY-MM-DD.md` — day notes + review (context only; tasks stay in `tasks/tasks.json`)
- `tasks/journal/buffer.md` — append key points during conversation
- Say "summarize" → buffer + conversation review → generate today's journal → clear buffer

### Activity Log
- The AI records each change it makes to the brain in `.loci/activity/<YYYY-MM>.md` (a plain-language activity ledger, one file per month — ask "what did I do today?")
- The activity ledger is an audit layer: it is written after brain-facing changes, but read only when the user asks what happened today / this week / recently
- It gives a traceable timeline without loading historical noise into every conversation

### Dashboard
- `.loci/dashboard/` — local Node-powered web dashboard for overview, tasks, schedule, journal, memory, people, projects, notes, fragments, and decisions
- `node .loci/dashboard/server.js` starts the dashboard at `http://127.0.0.1:8765/`
- `/` serves the dashboard, reading your brain's files live — a fresh brain shows clean empty states
- The server also exposes local API endpoints for live task, schedule, journal, note, reference, and project-todo workflows

### Cross-Terminal Sync
- `.loci/hooks/check-updates.sh` — detects file changes from other terminals
- Runs automatically at conversation start
- `/sync` for manual refresh

> Deep dive: [Context Awareness](context-awareness.md), [Dashboard](dashboard.md)

### Known Limitations (v1.0)

- **Concurrent editing**: Multiple terminals writing to the same brain file simultaneously may cause conflicts. Git tracks all changes, so no data is truly lost, but you may need to resolve a manual merge.
- **Cross-terminal detection**: The hook system (`check-updates.sh`) detects when another terminal has modified files, but it cannot prevent two writes from overlapping.
- **Best practice**: Avoid editing the same brain file from multiple terminals at the same time. In practice this is rare — most conversations touch different files — but it's worth knowing.

Future versions will add file-level locking or conflict-free merge strategies.

---

## One-Line Summary

**Loci = three-layer memory (L1/L2/L3) + signal-driven distillation + project-owned memory + pure markdown, zero dependencies.**

Day one, the user just feels "my AI remembers me." The complexity underneath reveals itself gradually as usage deepens — never all at once.

---

## Command Reference

| Command | When you need it | What it does |
|---------|-----------------|--------------|
| `/loci-sync` | Anytime | Manual distill + sync (flags: `--local`, `--dry-run`) |
| `/loci-settings` | Week 2+ | Configure what a project syncs to brain |
| `/loci-brain-settings` | Week 3+ | Configure persistence mode and notifications |
| `/loci-consolidate` | Anytime | Manual memory consolidation (default 24h, or `/loci-consolidate 7` for weekly) |
| `/loci-scan` | Occasional | Re-scan a project and update its profile |

## Further Reading

- [Architecture](architecture.md) — The three-layer memory system in depth
- [Synapse](synapse.md) — Persistence modes, routing, project-owned memory
- [Distillation](distillation.md) — How conversations become structured knowledge
- [Dashboard](dashboard.md) — The local visual console
- [Privacy](privacy.md) — Data protection and AI context control
