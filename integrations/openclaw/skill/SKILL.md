# Loci — Memory Palace for AI

You have a Loci brain — a structured memory system that replaces flat MEMORY.md with layered, organized knowledge. Your brain lives at:

**Brain path: `~/.openclaw/workspace/brain/`**

> If this path doesn't exist yet, create it using the directory structure below.

## Directory Map

```
brain/
├── plan.md          # Life direction & annual goals (your north star)
├── inbox.md         # Quick capture — dump anything here, sort weekly
├── me/
│   ├── identity.md  # Name, role, location, current season
│   ├── values.md    # Beliefs and principles
│   ├── learned.md   # Lessons and patterns discovered
│   ├── goals.md     # Detailed goal breakdown
│   ├── insights.md  # Cross-domain patterns (auto-generated)
│   └── evolution.md # How identity changed over time
├── tasks/
│   ├── active.md    # Current tasks: Focus (must-do) + Queue (backlog)
│   ├── someday.md   # Maybe later
│   ├── daily/       # Daily plans (YYYY-MM-DD.md)
│   └── journal/     # Daily summaries (YYYY-MM-DD.md)
├── decisions/       # One file per major decision (YYYY-MM-DD-slug.md)
└── people/          # Contact profiles (name.md)
```

## Three-Layer Context

| Layer | When to load | What |
|-------|-------------|------|
| **L1** | Every conversation | plan.md, inbox.md (recent 7 items), today's daily plan, active.md |
| **L2** | On demand | me/ files, specific decisions, people profiles |
| **L3** | Never auto-load | Old journals, archived decisions, evolution.md |

**At conversation start**, read these L1 files before responding. If today's daily plan doesn't exist, mention it and offer to create one.

## Distillation Rules

Never save raw conversations. Distill conclusions to the right file:

| Signal | Destination | Example |
|--------|-------------|---------|
| New task | `tasks/active.md` | "I need to update the README" → add to Queue |
| Decision | `decisions/YYYY-MM-DD-slug.md` | "Going with PostgreSQL" → new decision file |
| Personal fact | `me/identity.md` | "I just moved to Sydney" → update location |
| Insight / lesson | `me/learned.md` | "Never deploy on Fridays" → append |
| Goal change | `plan.md` | "Pushing launch to April" → update |
| Vague thought | `inbox.md` | "Maybe I should learn Rust" → append |

**Factual info** (city, job, tool choice) → save immediately, one-line confirmation.
**Subjective info** (values, goals, strategy) → ask the user before saving.

Confirmation style — keep it natural, no system jargon:
- "Got it — added task 'Update README'"
- "记住了：新任务「更新 README」"

## Behavior Rules

1. **Read before answering** — Check relevant brain files before responding to questions about the user's life, work, or plans
2. **Distill, don't hoard** — Extract the conclusion, not the conversation
3. **Archive, never delete** — Old content moves to `archive/`, nothing gets deleted
4. **Don't guess** — If unsure about the user's intent, ask
5. **State > productivity** — Don't push tasks if the user seems tired or unfocused
6. **Speak human** — Say "待办" not "inbox", "记住了" not "distilled". The user doesn't need to know file paths

## Coexistence with OpenClaw Memory

Your default MEMORY.md and memory/ files continue to work normally. Loci's `brain/` directory is an **additional** structured layer:

- Quick notes, preferences, personality settings → MEMORY.md (as usual)
- Structured life data (tasks, decisions, goals, identity) → brain/
- Daily logs → memory/ (OpenClaw default) OR brain/tasks/journal/ (richer format)

Don't move existing MEMORY.md content into brain/ unless the user asks. The two systems coexist.

## First-Time Setup

If `brain/plan.md` doesn't exist, this is a new brain. Ask the user:

1. What's your name?
2. What do you do? (Developer / Designer / Creator / Student / Other)
3. What's your most important focus right now?
4. Preferred language? (English / 中文 / Mix)

Then generate: `me/identity.md`, `plan.md`, `tasks/active.md` with their first task.

Keep it light — don't dump features. Introduce them naturally as the user works.
