# Architecture — The Three-Layer Memory System

## Overview

Loci organizes your AI's context into three layers, inspired by how human memory works: working memory (always active), episodic memory (recalled on demand), and long-term storage (archived for reference).

## Layer 1 — Always Loaded

These files are read at the start of every conversation. They define who you are and what matters right now.

| File | Purpose |
|------|---------|
| `CLAUDE.md` | System rules, behavior protocols, directory map |
| `plan.md` | Life direction, annual goals, current focus |
| `tasks/daily/today.md` | Today's schedule, priorities, energy state |
| `inbox.md` | Quick capture, pending items |
| `.claude/memory/MEMORY.md` | AI's persistent auto-memory |

**Design principle**: Layer 1 must stay small. If a file grows beyond ~200 lines, extract details into Layer 2 and keep only an index in Layer 1.

## Layer 2 — Loaded on Demand

These files are read when the conversation enters a specific domain.

| Trigger | Files Loaded |
|---------|-------------|
| Discussing tasks | `tasks/active.md`, `tasks/README.md` |
| Mentioning a person | `people/person-name.md` |
| Planning | `tasks/daily/today.md`, module README |
| Financial discussion | `finance/overview.md` |
| Content creation | `content/platforms.md` |

**Design principle**: Module README files serve as the "index" for each domain. The AI reads the README first to understand what's available, then loads specific files as needed.

## Layer 3 — Deep Storage

Never auto-loaded. Only accessed when explicitly needed.

- `archive/` — Completed tasks, expired plans, old content
- `decisions/` — Historical decision records
- `me/evolution.md` — Personal growth timeline
- Detailed financial records, old journals

**Design principle**: Layer 3 can grow indefinitely without affecting performance. It's your searchable archive.

## Information Flow

```
Conversation
    ↓
[Distillation]
    ↓
┌─────────────────────────────────────────┐
│  Layer 1 (Always Active)                │
│  CLAUDE.md → plan.md → inbox.md         │
│  auto-memory                            │
├─────────────────────────────────────────┤
│  Layer 2 (On Demand)                    │
│  me/ → tasks/ → people/                │
│  content/ → finance/                    │
├─────────────────────────────────────────┤
│  Layer 3 (Deep Storage)                 │
│  archive/ → decisions/                  │
│  me/evolution.md                        │
└─────────────────────────────────────────┘
```

## Why Three Layers?

AI context windows are finite. Loading everything every time wastes tokens and dilutes focus. The three-layer system ensures:

1. **Speed**: Layer 1 loads instantly, giving the AI immediate context
2. **Relevance**: Layer 2 loads only what's needed for the current topic
3. **Completeness**: Layer 3 ensures nothing is ever lost

This mirrors how the human brain works — you don't consciously recall every memory at once, but everything is accessible when triggered.

## Design Philosophy: Loci as a Memory Scheduler

**The core job of Loci is deciding what the AI should remember right now — and what it can safely forget.**

This is exactly how the human brain works:

| Human Brain | Capacity | Loci Equivalent |
|-------------|----------|-----------------|
| Working memory | 4-7 chunks (tiny!) | Layer 1 — always loaded, must stay small |
| Short-term memory | Recall on demand | Layer 2 — one thought away |
| Long-term memory | Unlimited storage | Layer 3 — archived, searchable |

The human hippocampus (海马体) acts as the dispatcher — it decides which memories to promote to working memory and which to consolidate into long-term storage. **Loci plays this exact role for your AI.**

This is also why competitors fall short:
- **ChatGPT Memory**: flat list, no layers, no scheduling — like having all your memories at the same volume
- **Mem0**: has storage and retrieval, but no intelligent dispatch — like a filing cabinet without a librarian
- **Loci**: **layered storage + on-demand loading + active forgetting** — the three things that make memory systems actually work

> The name isn't a coincidence. The hippocampus (our seahorse mascot 🐴) is the brain's memory scheduler. Loci is the AI's.

## Context Awareness

Loci includes a state sensing and cross-terminal sync system. See **[Context Awareness](context-awareness.md)** for the full design, including:

- **State Sensing (Context Aura)** — three-layer signal model that infers user state (energy, location, schedule) from daily plans, time signals, and optional user overrides
- **Cross-Terminal Sync (Changelog Protocol)** — a shared append-only log that lets multiple terminals know about each other's file changes
- **`/status` and `/sync` commands** — lightweight user controls for override and manual refresh

## Customization

You can adjust what belongs in each layer by editing `CLAUDE.md`. The directory map and context layering rules sections define exactly what gets loaded when.
