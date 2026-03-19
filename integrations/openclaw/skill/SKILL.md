---
name: loci
description: Memory Palace for AI — persistent structured memory, identity, and task management across every conversation.
version: 0.2.0
metadata:
  openclaw:
    emoji: "\U0001F40E"
    homepage: https://github.com/codesstar/loci
---

# Loci — Memory Palace for AI

## ⚠️ FIRST: Check if brain exists

Run this check **before doing anything else**:

1. Check if `~/.loci/brain-path` exists → read the path inside → verify `plan.md` exists there
2. If not, check if `~/loci/plan.md` exists
3. If neither exists → **run Bootstrap below**
4. If found → read `plan.md`. If `status: template` → run **First-Time Setup**. If `status: active` → brain is ready, skip to **Daily Use**

## Bootstrap (auto-install for new users)

The user doesn't need to do anything. You handle it:

```bash
# Clone Loci brain template
git clone --depth 1 https://github.com/codesstar/loci.git ~/loci

# Remove git remote (user's data stays private)
cd ~/loci && git remote remove origin

# Register brain location
mkdir -p ~/.loci
echo "$HOME/loci" > ~/.loci/brain-path
```

After cloning, run **First-Time Setup** below. Tell the user:
- "我在帮你设置记忆系统，只需要回答几个问题。"

## First-Time Setup

When `plan.md` has `status: template`:

1. Detect the user's language from their messages. Ask in that language.
2. Ask these questions (can ask all at once):
   - What's your name?
   - What do you do? (Developer / Designer / Creator / Student / Other)
   - What's your most important focus right now?
   - What hours do you usually work? (Morning / Daytime / Evening / Night owl / Irregular)
   - Preferred language? (English / 中文 / Mix)
3. Generate initial files from answers:
   - `me/identity.md` — name, role, current season
   - `plan.md` — mission + focus as first goal (set `status: active`)
   - `tasks/active.md` — first task from their focus
4. Done. Say: "Your brain is ready. From now on, I'll remember the important things."

## Daily Use

**Brain path**: read from `~/.loci/brain-path`, or default `~/loci/`

At conversation start, read L1 files before responding:
- `plan.md` — life direction
- `tasks/active.md` — current tasks
- `tasks/daily/YYYY-MM-DD.md` — today's plan (if exists)
- `inbox.md` — recent items only

### Distillation — what to save where

| Signal | Destination |
|--------|-------------|
| New task | `tasks/active.md` |
| Decision | `decisions/YYYY-MM-DD-slug.md` |
| Personal fact | `me/identity.md` |
| Insight / lesson | `me/learned.md` |
| Goal change | `plan.md` |
| Vague thought | `inbox.md` |

**Factual** → save silently in background, DO NOT make it the focus of your reply
**Subjective** (values, strategy) → ask user first

### Behavior

1. **Be a normal AI first, memory system second.** When the user says something, RESPOND to it naturally (react, comment, ask follow-up, help). Saving to brain happens silently in background — never reply with just "记住了" or "已记录". The user should feel like talking to a smart friend who happens to have perfect memory, not a filing cabinet.
2. Read brain files before answering questions about the user
3. Distill conclusions, not raw conversations
4. Archive, never delete
5. Don't guess — ask if unsure
6. Speak human — say "待办" not "inbox", never expose file paths
7. MEMORY.md and brain/ coexist — don't move content between them unless asked

### Context Layers

| Layer | Load when | Contents |
|-------|----------|----------|
| L1 | Every conversation | plan.md, active.md, today's daily, inbox (7 items) |
| L2 | On demand | me/ files, decisions, people |
| L3 | Never auto | Old journals, archive, evolution.md |

For detailed behavior rules, read `docs/behavior.md` in the brain directory.
