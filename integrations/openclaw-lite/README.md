# Loci Lite — Daily Planning Dashboard for OpenClaw

A lightweight AI-powered daily planning system with a visual dashboard. Talk to your AI, it handles the rest.

## Who is this for?

Anyone who wants a simple daily planning habit powered by AI — without learning file systems, git, or terminal commands. Just talk to your AI assistant and say things like:

- "Today I need to finish the report and call the dentist"
- "Show me my plan"
- "I finished the report"
- "Summarize my day"

The AI organizes everything. You see a beautiful dashboard.

## What you get

- **Daily task tracking** — tell the AI what you need to do, it tracks completion
- **Weekly plan overview** — see your week at a glance
- **Journal entries** — AI summarizes your day every evening
- **Visual dashboard** — sci-fi themed command center, works on desktop and mobile

## Setup (30 seconds)

### Option A: Copy the folder

1. Copy the `openclaw-lite/` folder into your OpenClaw workspace
2. Add `SKILL.md` to your AI's system prompt (or paste its contents)
3. Start talking — the AI will bootstrap your brain automatically

### Option B: Paste the prompt

Copy the contents of `SKILL.md` into your OpenClaw assistant's instructions. On first conversation, it will create everything automatically in `~/.loci/lite/`.

## How it works

```
You talk to AI  →  AI manages files  →  Dashboard shows your plan
                    (tasks, journal,      (open index.html)
                     daily plans)
```

### Directory structure (managed by AI, you never touch this)

```
~/.loci/lite/
  tasks/
    active.md        — current tasks by priority
    daily/
      2026-03-17.md  — today's plan
  journal/
    2026-03-17.md    — daily summary
  dashboard/
    index.html       — visual dashboard
    build.py         — data generator
    data.json        — dashboard data (auto-generated)
```

## Dashboard

Open `~/.loci/lite/dashboard/index.html` in any browser. It reads from `data.json` which the AI regenerates after each conversation.

The dashboard shows:
- Today's tasks with completion status
- This week's daily plans
- Recent journal entries with key takeaways

## Customization

The AI adapts to your language automatically. It works in English, Chinese, or any language you speak.

To reset: delete `~/.loci/lite/` and start fresh.

## Full version

Want identity tracking, decision logs, multi-project orchestration, and more? Check out the full Loci brain: https://github.com/codesstar/loci
