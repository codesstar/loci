# Distillation Protocol

## What is Distillation?

Distillation is the process of extracting key information from conversations and storing it in the right place. Instead of saving raw conversation transcripts (which are long, noisy, and hard to search), Loci distills conversations into structured knowledge.

## How It Works

At the end of a conversation (or when triggered), the AI:

1. Reviews the conversation for new information
2. Categorizes each piece of information
3. Routes it to the correct file
4. Confirms with you before writing

## Routing Rules

| Information Type | Destination | Example |
|-----------------|------------|---------|
| Personal facts | `me/identity.md` | "I just moved to Berlin" |
| New values/principles | `me/values.md` | "I realized quality > speed" |
| Lessons learned | `me/learned.md` | "Never deploy on Fridays" |
| Decisions (yours, cross-project) | `decisions/YYYY-MM-DD-slug.md` | "One project at a time from now on" |
| Project decisions | That repo's `.loci/decisions/` | "Chose React over Vue" |
| Project restart context | That repo's `.loci/memory.md` | "MVP shipped, next up: billing" |
| Project progress | That repo's `.loci/progress/YYYY-MM.md` | "Billing API wired today" |
| Project stable details | That repo's `.loci/profile.md` | "Main files, milestones, key people" |
| New tasks | Guarded task writer → `tasks/tasks.json` | "Need to update the API docs" |
| Schedule items (occupied time) | Guarded task writer → `tasks/calendar.json` | "Meeting at 3pm" |
| External material | `references/YYYY-MM-DD-slug.md` | "Save this pricing article" |
| Insights/patterns | `me/insights.md` | "User prefers dark mode themes" |
| Unprocessed thoughts | `inbox.md` | "Maybe I should learn Rust" |

Two routing rules worth calling out:

- **Tasks are never written by hand.** `tasks/tasks.json` is the single source of truth, written through the guarded writer (`node scripts/loci-task.js add ...` or the Dashboard API). `tasks/active.md` is just a generated read-only view. Tasks and schedule are kept separate — a timed task stays in the task pool and is not mirrored onto the calendar.
- **Project memory stays in the project.** A serious project's decisions and state are distilled into that repo's own `.loci/` — the brain keeps only a one-line index in `projects/index.md`. Loci aggregates memory; it does not own it.

## Distillation Levels

Not all information is treated equally:

### Factual (Auto-save with confirmation)
- Job changes, location moves, tool preferences
- AI saves it automatically, mentions it at the end: "I updated your location to Berlin in identity.md"

### Subjective (Ask before saving)
- Value changes, goal shifts, strategic decisions
- AI asks: "You mentioned rethinking your career goals. Want me to update plan.md?"

## Before & After Example

### Before (Raw Conversation)
```
User: I've been thinking about my side project. Maybe I should pivot from B2C to B2B.
AI: That makes sense given your enterprise experience...
User: Yeah, and I think the pricing should be $49/mo not $19.
AI: Higher price point filters for serious users...
User: Let's go with that. Also, I realized I need to stop checking Twitter first thing in the morning.
```

### After (Distilled)

**decisions/2026-03-01-pivot-to-b2b.md:**
> Decision: Pivot side project from B2C to B2B. Price: $49/mo. Reasoning: leverages enterprise experience, higher price filters for serious users.

**me/learned.md** (appended):
> Don't check Twitter first thing in the morning — it fragments focus.

**tasks/tasks.json** (via the guarded writer):
> `node scripts/loci-task.js add --title "Update landing page messaging for B2B positioning"`

Three places updated. Zero raw transcript saved. Everything searchable and in context.

## Growth Tracking

When identity or values change, Loci doesn't just overwrite — it evolves:

1. Current file (e.g., `values.md`) is updated to the new state
2. The old version is appended to `me/evolution.md` with a timestamp

This creates a personal changelog — you can see how your thinking evolved over months and years.

## Triggering Distillation

### Auto mode (default)

Signal-driven: the AI evaluates each conversation turn for storable information. When it detects a new task, decision, insight, or personal info change, it saves immediately and shows a one-line natural confirmation:

```
Got it — added task "Update API docs"
```

No interrupting questions, no file paths or internal terms. Say "undo" to reverse.

### Manual mode

- Say "update", "save this", "记一下" → immediate save
- Run `/loci-sync` → full distill + cross-project sync
- Run `/loci-sync --dry-run` → preview what would be saved

### Legacy "update" trigger

Say "update" for a full conversation review with a manifest you can cherry-pick from. This works in both modes.

See [Synapse](synapse.md) for the full persistence and routing system.
