---
created: 2026-03-07
tags: [references, knowledge]
---

# references/ — External Knowledge Base (Extension Module)

Everything you've read, watched, heard, or encountered that you want to remember. Articles, tweets, videos, quotes, products, frameworks — all in one place.

## Structure

```
references/
├── inbox.md      # Quick dump — just throw it here
├── entries/      # Organized individual entries (AI sorts from inbox)
└── README.md
```

No sub-folders by type. Use frontmatter tags instead — easier to search, no "where does this go?" friction.

## What goes here vs root inbox.md

- **External content** (someone else's ideas) → `references/inbox.md`
- **Your own tasks/thoughts/reminders** → root `inbox.md`

**Rule of thumb**: If it came from outside you, it goes here. If it came from inside you, it goes in `inbox.md`, `me/`, or `decisions/`.

## How to use

**Quick capture**: Just tell the AI "save this" — it appends to `inbox.md` instantly.

**Organized entry** (in `entries/`): AI creates these when you say "organize references".

```yaml
---
date: 2026-03-10
type: article    # article | book | video | quote | product | idea | tweet
source: "https://..."
tags: [pricing, open-source]
use-for: "Loci pricing strategy video"   # optional
status: raw      # raw | processed
---
```

## Layer

This is **Layer 2** — loaded on demand when discussing ideas, making decisions, or creating content.
