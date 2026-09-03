# Architecture — The Three-Layer Memory System

## Overview

Loci organizes your AI's context into three layers, inspired by how human memory works: working memory (always active), episodic memory (recalled on demand), and long-term storage (archived for reference).

## Layer 1 — Always Loaded

These files are read at the start of every conversation. They define who you are and what matters right now.

| File | Purpose |
|------|---------|
| `CLAUDE.md` | System rules, behavior protocols, directory map |
| `plan.md` | Life direction, annual goals, current focus |
| `tasks/active.md` | Current-task snapshot — a read-only view generated from `tasks/tasks.json` |
| `projects/index.md` | Serious-project index — one line per project, no details expanded |
| `.loci/status.yml` | Current state — energy, situation, temporary context |
| Auto-memory | The AI tool's own persistent notes about you (managed by Claude Code / Codex) |

**Design principle**: Layer 1 must stay small. It is for rules, indexes, current action summaries, and truly important personal context. Fragment pools such as `inbox.md` do not belong in L1; they are Layer 2 and are opened only when fragments/quick thoughts/idea triage are relevant.

## Layer 2 — Loaded on Demand

These files are read when the conversation enters a specific domain.

| Trigger | Files Loaded |
|---------|-------------|
| Working with tasks or schedule | `tasks/tasks.json`, `tasks/calendar.json` (via the guarded writer), `tasks/README.md` |
| Mentioning a person | `people/person-name.md` |
| Planning / reviewing the day | `tasks/daily/YYYY-MM-DD.md`, module README |
| Mentioning a connected project | That repo's own `.loci/memory.md` first; `.loci/profile.md`, `.loci/progress/`, or `.loci/decisions/` only when needed |
| Mentioning fragments / quick thoughts / old ideas | `inbox.md` |
| Asking about your own notes | `notes/index.md`, then the specific note or external link |
| Recalling saved material | `references/` |
| Using research evidence | `notes/research/` |

**Design principle**: Index files serve as the "map" for each domain — module READMEs, `projects/index.md`, `notes/index.md`. The AI reads the index first to understand what's available, then loads specific files as needed. Project memory follows the same idea one level up: the brain holds only a one-line index per serious project, while the full memory lives in that project's own repo (`.loci/memory.md` restart context + `.loci/profile.md` stable details + `.loci/progress/` project stream + `.loci/decisions/`).

## Layer 3 — Deep Storage

Never auto-loaded. Only accessed when explicitly needed.

- `archive/` — Completed tasks, expired plans, old content
- `decisions/` — Historical decision records (choices and rationale, not research material)
- `me/evolution.md` — Personal growth timeline
- `.loci/activity/` — The activity ledger (audit layer: written after every save, read only when you ask "what did I do?")
- Old journals

**Design principle**: Layer 3 can grow indefinitely without affecting performance. It's your searchable archive.

## Information Flow

```
Conversation
    ↓
[Distillation]
    ↓
┌─────────────────────────────────────────┐
│  Layer 1 (Always Active)                │
│  CLAUDE.md → plan.md → tasks/active.md  │
│  projects/index.md → status.yml         │
│  auto-memory                            │
├─────────────────────────────────────────┤
│  Layer 2 (On Demand)                    │
│  inbox.md → me/ → tasks/ → people/     │
│  notes/ → references/ → project memory  │
├─────────────────────────────────────────┤
│  Layer 3 (Deep Storage)                 │
│  archive/ → decisions/                  │
│  me/evolution.md → .loci/activity/      │
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

For decisions, that dispatch has one hard rule: the full decision record stays in L3, but any conclusion that changes current behavior must be promoted to the smallest L1 surface (`plan.md`, `tasks/active.md`, `projects/index.md`, or project `.loci/memory.md`).

This is also why competitors fall short:
- **ChatGPT Memory**: flat list, no layers, no scheduling — like having all your memories at the same volume
- **Mem0**: has storage and retrieval, but no intelligent dispatch — like a filing cabinet without a librarian
- **Loci**: **layered storage + on-demand loading + active forgetting** — the three things that make memory systems actually work

> The name isn't a coincidence. The hippocampus (our seahorse mascot) is the brain's memory scheduler. Loci is the AI's.

## Context Awareness

Loci includes a state sensing and cross-terminal sync system. See **[Context Awareness](context-awareness.md)** for the full design, including:

- **State Sensing (Context Aura)** — three-layer signal model that infers user state (energy, location, schedule) from daily plans, time signals, and optional user overrides
- **Cross-Terminal Sync (Changelog Protocol)** — a shared append-only log that lets multiple terminals know about each other's file changes
- **`/status` and `/sync` commands** — lightweight user controls for override and manual refresh

## Customization

You can adjust what belongs in each layer by editing `CLAUDE.md`. The directory map and context layering rules sections define exactly what gets loaded when.
