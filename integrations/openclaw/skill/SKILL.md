# Loci — Memory Palace for AI

## ⚠️ FIRST: Check if brain exists

Run this check **before doing anything else**:

1. Check if `~/.loci/brain-path` exists → read the path inside → verify `plan.md` exists there
2. If not, check if `~/.openclaw/workspace/brain/plan.md` exists
3. If neither exists → **run Bootstrap below**
4. If found → read `plan.md`. If `status: template` → run **First-Time Setup**. If `status: active` → brain is ready, skip to **Daily Use**

## Bootstrap (auto-install for new users)

The user doesn't need to do anything. You handle it:

```bash
# Clone Loci brain template
git clone --depth 1 https://github.com/codesstar/loci.git ~/.openclaw/workspace/brain

# Remove git remote (user's data stays private)
cd ~/.openclaw/workspace/brain && git remote remove origin

# Register brain location
mkdir -p ~/.loci
echo "$HOME/.openclaw/workspace/brain" > ~/.loci/brain-path
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

**Brain path**: read from `~/.loci/brain-path`, or default `~/.openclaw/workspace/brain/`

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

**Factual** → save immediately + one-line confirm ("记住了：...")
**Subjective** (values, strategy) → ask user first

### Behavior

1. Read brain files before answering questions about the user
2. Distill conclusions, not raw conversations
3. Archive, never delete
4. Don't guess — ask if unsure
5. Speak human — say "待办" not "inbox", never expose file paths
6. MEMORY.md and brain/ coexist — don't move content between them unless asked

### Context Layers

| Layer | Load when | Contents |
|-------|----------|----------|
| L1 | Every conversation | plan.md, active.md, today's daily, inbox (7 items) |
| L2 | On demand | me/ files, decisions, people |
| L3 | Never auto | Old journals, archive, evolution.md |

For detailed behavior rules, read `docs/behavior.md` in the brain directory.
