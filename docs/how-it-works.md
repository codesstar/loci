# How Loci Works — The Complete Guide

> This is the "read one doc, understand everything" guide. Each section builds on the previous one, matching the order you'll actually experience Loci as a user.

## User Experience Rhythm

```
Week 1: Install → chat → AI remembers you          Just talk. That's it.
Week 2: Connect other projects → cross-project memory    One command: /loci-link
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
├── inbox.md           ← Quick capture box (loaded every conversation)
│
├── me/                ← Who you are
│   ├── identity.md    ← Basics (name, job, city)
│   ├── values.md      ← What you believe in
│   ├── learned.md     ← Lessons you've picked up
│   ├── goals.md       ← Detailed goal breakdown
│   └── evolution.md   ← Growth timeline (old versions append here)
│
├── tasks/             ← Tasks + planning (merged)
│   ├── active.md      ← Current tasks (P0/P1/P2/P3 priorities)
│   ├── someday.md     ← Maybe later
│   ├── daily/         ← One md per day (schedule + what got done)
│   └── journal/       ← Daily summaries (buffer.md → end-of-day journal)
│
├── decisions/         ← One file per major decision (with context + reasoning)
├── archive/           ← Expired content moves here, never deleted
│
├── .loci/             ← System internals
│   ├── hooks/         ← Cross-terminal sync hooks
│   ├── links/         ← Connected external projects
│   ├── dashboard/     ← Visual panel
│   ├── config.yml     ← Brain settings (persistence, privacy, routing)
│   ├── status.yml     ← Current state (tired / energized / traveling)
│   └── activity-log.md ← Last 14 days of activity timeline
│
└── (extension modules, created on demand)
    ├── finance/       ← Budget, assets, financial tracking
    ├── people/        ← Contacts, meeting notes, relationships
    ├── content/       ← Writing, content creation, publishing
    └── references/    ← External knowledge base (articles, books, quotes)
```

### Three-Layer Context

This is Loci's core design — not all memories need to load every time:

| Layer | When loaded | Contents | Human analogy |
|-------|------------|----------|---------------|
| **L1** | Every conversation | CLAUDE.md, plan.md, inbox.md, .loci/activity-log.md, auto-memory | Working memory (what you're thinking about right now) |
| **L2** | When the topic comes up | Module READMEs, specific people/task/plan files, references | Short-term memory (one thought away) |
| **L3** | Only when explicitly asked | archive, old decisions, evolution.md, old journals | Long-term memory (have to dig for it) |

**Why three layers?** AI context windows are finite. Loading everything every time wastes tokens and dilutes attention. L1 stays lean (a few hundred lines), L2 loads on demand, L3 grows forever without affecting performance.

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
         ├── New insight ("never deploy on Fridays")   → me/learned.md
         ├── Decision ("going with PostgreSQL")        → decisions/2026-03-10-xxx.md
         ├── New task ("need to update API docs")      → tasks/active.md
         ├── External content (article, tweet, quote)  → references/inbox.md
         └── Vague thought ("maybe I should learn Rust") → inbox.md
```

### Distillation Levels

- **Factual info** (city, job, tool preferences) → Save immediately, one-line confirmation
- **Subjective/strategic info** (values changed, goals shifted) → Ask you to confirm first

### Growth Tracking

When values change, Loci doesn't overwrite — it evolves:
1. Current file (e.g. values.md) updates to the latest state
2. Old version appends to `evolution.md`

Result: current files stay lean (fast L1 loading). evolution.md is your personal growth timeline (L3, read it when you want to reflect).

### Before & After

**Raw conversation:**
> "I've been thinking about my side project. Maybe I should pivot from B2C to B2B. And the pricing should be $49/mo not $19. Also, I realized I need to stop checking Twitter first thing in the morning."

**What Loci stores:**
- `decisions/2026-03-10-pivot-to-b2b.md`: Pivot to B2B, price $49/mo, leverages enterprise experience
- `me/learned.md` (appended): Don't check Twitter first thing — it fragments focus
- `tasks/active.md` (appended): Update landing page for B2B positioning

Three files updated. Zero raw transcript saved. Everything searchable and in context.

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
  Has signal → save immediately → one-line notification:
                [Loci] Stored: new task "Buy power cable" → active.md
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
/loci-sync              → Review conversation + save files + sync to sub-projects
/loci-sync --local      → Save locally only, don't sync to sub-projects
/loci-sync --dry-run    → Show what would be saved, don't execute
```

> Deep dive: [Synapse](synapse.md)

---

## Layer 4: Multi-Project Orchestration (Synapse Routing)

This is the Week 2 feature — when you have multiple project folders.

### Connecting a Project

```bash
# In any project folder
/loci-link
```

What happens:
1. Auto-scans the project (README, package.json, directory structure) → generates a profile
2. Creates a symlink in the brain's `.loci/links/`
3. Creates `.loci-link` in the project (points to brain path)
4. Creates two-way communication files: `from-hq.md` (brain → project), `to-hq.md` (project → brain)

### Information Flow

```
           Brain (HQ)
          ╱    │    ╲
         ╱     │     ╲
    Project A  Project B  Project C

Upstream (to-hq.md): Project → Brain
  "v1.0 shipped" [milestone]
  "Should we switch databases?" [needs-decision]

Downstream (from-hq.md): Brain → Project
  "Decision: use PostgreSQL across all projects"
  "This month's priority is Project A, deprioritize others"
```

### Routing Modes

When the brain produces new information (e.g. you made a decision), Synapse decides which projects should know:

| Mode | How it distributes |
|------|-------------------|
| **Tag-routed** (default) | Auto-tags info (urgent/decision/fyi/log), matches to each project's `interest_tags` |
| **Open** | All info visible to all projects, each pulls what it needs |
| **Manual** | Asks you "send to which project?" each time |
| **Silent** | Brain keeps everything to itself |

### Sub-Project Configuration (/loci-settings)

Each project decides what to push to the brain:

```json
{
  "sync": {
    "decisions": true,      // Architecture decisions → push to brain
    "milestones": true,     // Release milestones → push to brain
    "lessons": true,        // Lessons learned → push to brain
    "codeDetails": false,   // Actual code → don't push
    "architecture": true,   // Architecture changes → push to brain
    "blockers": true        // Stuck on something → push to brain
  }
}
```

### Privacy Boundary

Brain-side config controls what never gets shared with sub-projects:
- **Default blocked**: medical info, financial details, credentials/passwords
- **Customizable**: add any category (e.g. "never share relationship details")
- **Hard boundary**: sub-projects cannot override privacy rules

> Deep dive: [Departments](departments.md)

---

## Layer 5: Configuration

### Inheritance Chain

```
Loci built-in defaults → Brain settings → Sub-project settings → User override
```

Privacy is always a hard boundary — sub-projects can never weaken it.

### Two Config Commands

| Command | Where | Controls |
|---------|-------|----------|
| `/loci-brain-settings` | Brain | Persistence mode, privacy, distillation detail level, routing mode, archive timeline |
| `/loci-settings` | Sub-project | What this project pushes/doesn't push to brain |

### Full Brain Settings

```yaml
persistence:
  mode: auto              # auto (signal-driven) | manual
  notify: true            # Show notification after each save

privacy:
  blocked_tags: [medical, financial, credentials]

distillation:
  level: balanced         # verbose | balanced | minimal

routing:
  mode: tag-routed        # open | tag-routed | manual | silent
  tags: [urgent, decision, fyi, log]

retention:
  archive_after_days: 90  # 90 days unreferenced → move to archive/
```

---

## Layer 6: Supporting Mechanisms

### Daily Plans + Journal
- `tasks/daily/YYYY-MM-DD.md` — today's schedule + what got done
- `tasks/journal/buffer.md` — append key points during conversation
- Say "summarize" → buffer + conversation review → generate today's journal → clear buffer

### Activity Log
- Every file change auto-records to `.loci/activity-log.md` (via Claude Code hook)
- New conversations read the last 7 days → know what happened last session
- Monthly cleanup: entries older than 14 days get removed

### Dashboard
- `.loci/dashboard/` — local web page, pixel-art style, shows goals/tasks/inbox/project status
- `python3 build.py` generates `data.json` from your markdown files
- AI proactively offers to open it once you have 2-3 tasks

### Cross-Terminal Sync
- `.loci/hooks/check-updates.sh` — detects file changes from other terminals
- Runs automatically at conversation start
- `/sync` for manual refresh

> Deep dive: [Context Awareness](context-awareness.md), [Dashboard](dashboard.md)

---

## One-Line Summary

**Loci = three-layer memory (L1/L2/L3) + signal-driven distillation + hub-and-spoke multi-project routing + pure markdown, zero dependencies.**

Day one, the user just feels "my AI remembers me." The complexity underneath reveals itself gradually as usage deepens — never all at once.

---

## Command Reference

| Command | When you need it | What it does |
|---------|-----------------|--------------|
| `/loci-link` | Week 2 | Connect a project folder to your brain |
| `/loci-sync` | Anytime | Manual distill + sync (flags: `--local`, `--dry-run`) |
| `/loci-settings` | Week 2+ | Configure what a project syncs to brain |
| `/loci-brain-settings` | Week 3+ | Configure persistence, privacy, routing, retention |
| `/loci-scan` | Occasional | Re-scan a project and update its profile |

## Further Reading

- [Architecture](architecture.md) — The three-layer memory system in depth
- [Synapse](synapse.md) — Persistence modes, routing, privacy
- [Distillation](distillation.md) — How conversations become structured knowledge
- [Departments](departments.md) — Multi-project orchestration
- [Privacy](privacy.md) — Data protection and AI context control
