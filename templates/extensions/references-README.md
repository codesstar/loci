---
created: 2026-03-07
tags: [references, knowledge]
---

# references/ — External Knowledge Base (Extension Module)

Everything you've read, watched, heard, or encountered that you want to remember. Articles, tweets, videos, quotes, products, frameworks — all in one place.

## Structure

```
references/
├── README.md           # This file
├── inbox.md            # Quick dump — just throw it here
├── entries/            # Organized individual entries
│   └── YYYY-MM-DD-slug.md
└── collections/        # Curated topic groups (optional)
    └── topic-name.md
```

No sub-folders by type. Use frontmatter tags instead — easier to search, no "where does this go?" friction.

## What goes here vs root inbox.md

- **External content** (someone else's ideas) → `references/inbox.md`
- **Your own tasks/thoughts/reminders** → root `inbox.md`

**Rule of thumb**: If it came from outside you, it goes here. If it came from inside you, it goes in `inbox.md`, `me/`, or `decisions/`.

## How to use

**Quick capture**: Just tell the AI "save this" — it appends to `inbox.md` instantly. No classification needed.

**Organize**: Say "organize references" or the AI will offer when inbox exceeds 10 entries. Entries get moved to `entries/` with full frontmatter.

**Collections**: Say "make a collection about [topic]" to group related references with commentary.

**Recall**: The AI proactively surfaces relevant saved references when you're working on a matching topic.

## Entry Frontmatter

```yaml
---
date: 2026-03-10
type: article    # article | book | video | quote | product | idea | tweet | paper
source: "https://..."
tags: [pricing, open-source]
one-line: "Open-core pricing grows 3x faster than pure SaaS"
use-for: "Loci pricing strategy"   # what this is useful for — key field
status: raw      # raw → processed → applied → archived
---
```

### Status Lifecycle

- **raw** — just captured, unprocessed
- **processed** — organized with frontmatter and tags
- **applied** — used in a decision or project (auto-updates when referenced)
- **archived** — no longer relevant

## Layer

This is **Layer 2** — loaded on demand when discussing ideas, making decisions, or creating content.
