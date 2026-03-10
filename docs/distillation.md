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
| Decisions | `decisions/YYYY-MM-DD-slug.md` | "Chose React over Vue" |
| New tasks | `tasks/active.md` | "Need to update the API docs" |
| Insights/patterns | `.claude/memory/MEMORY.md` | "User prefers dark mode themes" |
| Unprocessed thoughts | `inbox.md` | "Maybe I should learn Rust" |

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

**tasks/active.md** (appended):
> - [ ] Update landing page messaging for B2B positioning

Three files updated. Zero raw transcript saved. Everything searchable and in context.

## Growth Tracking

When identity or values change, Loci doesn't just overwrite — it evolves:

1. Current file (e.g., `values.md`) is updated to the new state
2. The old version is appended to `me/evolution.md` with a timestamp

This creates a personal changelog — you can see how your thinking evolved over months and years.

## Triggering Distillation

### Auto mode (default)

Signal-driven: the AI evaluates each conversation turn for storable information. When it detects a new task, decision, insight, or personal info change, it saves immediately and shows a one-line notification:

```
[Loci] Stored: new task "Update API docs" → active.md
```

No interrupting questions. Say "undo" to reverse.

### Manual mode

- Say "update", "save this", "记一下" → immediate save
- Run `/loci-sync` → full distill + cross-project sync
- Run `/loci-sync --dry-run` → preview what would be saved

### Legacy "update" trigger

Say "update" for a full conversation review with a manifest you can cherry-pick from. This works in both modes.

See [Synapse](synapse.md) for the full persistence and routing system.
