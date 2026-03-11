# Using Loci with Other Editors

Loci is built for Claude Code, but its memory is plain Markdown — any AI coding tool can read it.

## What works everywhere

- **Reading memory files** — your AI can read `me/`, `tasks/`, `decisions/`, `plan.md` regardless of editor
- **Manual note-taking** — you can always edit Markdown files directly
- **Git-based history** — `git diff` and `git log` work the same everywhere

## What requires Claude Code

- **Slash commands** (`/loci-sync`, `/loci-link`, `/loci-consolidate`, etc.)
- **Auto-persistence** (Synapse) — automatic signal detection and storage
- **Hooks** — cross-terminal awareness, activity logging
- **Memory Consolidation** — daily pattern detection and insight generation

## Setup for Cursor / Windsurf / Cline

1. Clone and enter the brain:
   ```bash
   git clone https://github.com/codesstar/loci.git my-brain
   cd my-brain
   ```

2. **Manual onboarding**: Since auto-detection won't trigger, create your initial files by telling the AI:
   ```
   "I just set up Loci. My name is [X], I'm a [role], and my current focus is [Y].
    Please create me/identity.md, plan.md, and tasks/active.md."
   ```

## Tips for partial-support editors

- **Instead of `/loci-sync`**: Tell the AI "save this decision" or "add this task" — it can edit the Markdown files directly
- **Instead of `/loci-link`**: Manually create a `.loci/` directory in your project with `memory.md`, `to-hq.md`, and `from-hq.md`
- **Instead of auto-consolidation**: Periodically ask the AI "review my recent decisions and tasks, find patterns"

## Hybrid workflow

Some users run Claude Code in a terminal for brain management (commands, consolidation, sync) and their preferred editor for coding. This gives you full Loci features while keeping your coding workflow unchanged.

```
Terminal (Claude Code)     Editor (Cursor/Windsurf)
├── Brain management       ├── Code writing
├── /loci-consolidate      ├── Reads brain context
├── /loci-link             ├── AI knows your decisions
└── /loci-sync             └── Memory files accessible
```

## Contributing adapter support

We welcome PRs that improve support for non-Claude-Code editors. See [GitHub Issues](https://github.com/codesstar/loci/issues) for open requests.
