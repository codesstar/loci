---
date: 2026-03-17
status: draft
---

# Loci × OpenClaw

Give your OpenClaw agent a structured brain.

## Install

### Option A: One command
```bash
openclaw skill install https://github.com/codesstar/loci
```

### Option B: Manual
Copy the `skill/` folder to your OpenClaw skills directory:
```bash
cp -r skill/ ~/.openclaw/workspace/skills/loci/
```

That's it. Next conversation, your agent will set up your brain automatically.

## What it does

- Replaces flat MEMORY.md with a structured `brain/` directory
- Three-layer context loading (daily stuff auto-loads, deep history on demand)
- Auto-distills conversations into the right files (tasks, decisions, identity, etc.)
- Coexists with OpenClaw's default memory — nothing breaks

## Works with Claude Code too

If you also use Claude Code, your Loci brain is shared. Both tools read/write the same files.
