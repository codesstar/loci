---
date: 2026-03-17
status: draft
---

# Loci × OpenClaw

Give your OpenClaw agent a structured brain.

## Install

### For OpenClaw users (easiest)

Copy the skill folder to your OpenClaw skills directory:

```bash
cp -r skill/ ~/.openclaw/workspace/skills/loci/
```

Then just start a conversation. Your agent will automatically:
1. Download the brain template
2. Ask you a few questions
3. Set up your memory

You don't need to do anything else.

### For Claude Code users who also use OpenClaw

If you already have a Loci brain via Claude Code, just copy the skill:

```bash
cp -r skill/ ~/.openclaw/workspace/skills/loci/
```

Your agent will auto-detect your existing brain (via `~/.loci/brain-path`) and start using it immediately. No re-setup needed.

## How it works

- SKILL.md teaches your OpenClaw agent to use Loci's structured memory
- Brain files are stored locally as markdown (you own your data)
- If you also use Claude Code, both tools share the same brain
- OpenClaw's default MEMORY.md continues to work alongside Loci
