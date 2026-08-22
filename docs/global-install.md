# Global Install

Use Loci from any terminal directory, not just the brain folder.

The recommended path is:

```bash
npx create-loci
```

The installer creates or selects a local brain, then connects Claude Code, Codex, WorkBuddy, or a selected combination to that same brain path.

## What It Enables

After global install, opening a connected tool in any project gives the AI:

- The path to your Loci brain
- A lightweight startup map: standing preferences, memory locations, the current project pointer, and a short state summary
- Rules for saving tasks, decisions, notes, people, schedules, and project memory
- Cross-project memory: a project can keep its own `.loci/` memory while the brain keeps only an index

You do not need to `cd` into the brain directory for everyday use.

## How It Works

Global install writes user-level instruction blocks:

| Tool | User-level file |
|---|---|
| Claude Code | `~/.claude/CLAUDE.md` |
| Codex | `~/.codex/AGENTS.md` |
| WorkBuddy | `~/.workbuddy/MEMORY.md` |

Those files receive an idempotent `<!-- loci:start --> ... <!-- loci:end -->` block that tells the tool:

- where the brain lives
- which startup files to read
- how to route tasks, schedules, decisions, notes, people, references, and project memory
- how to write safely through guarded scripts or dashboard APIs

The brain itself remains an ordinary local folder of Markdown, JSON, and scripts.

## Install

### Automatic

Run:

```bash
npx create-loci
```

The browser wizard asks:

1. Where should the brain live?
2. What is your name, role, language, and current focus?
3. Which tools should connect: Claude Code, Codex, WorkBuddy, all three, or none?

Prefer terminal setup:

```bash
npx create-loci --cli
```

### Manual

Clone the repository and run setup:

```bash
git clone https://github.com/codesstar/loci.git ~/loci
cd ~/loci
./setup.sh
```

Manual setup can still add the Loci blocks to Claude Code, Codex, and/or WorkBuddy. If you edit the blocks by hand, keep the `<!-- loci:start -->` and `<!-- loci:end -->` markers so future installs can update them safely.

## Verify

Open a new terminal in any project and start your AI tool:

```bash
claude
# or
codex
```

Ask:

```text
where is my Loci brain?
```

It should report the configured brain path and use the lightweight startup map. Plans and tasks should be opened only when your request needs them.

## Dashboard

The dashboard is local and optional:

```bash
node .loci/dashboard/server.js
```

Open:

```text
http://127.0.0.1:8765/
```

`/` serves the dashboard, reading your brain's files live.

## Uninstall

1. Remove the Loci block from `~/.claude/CLAUDE.md`, if installed.
2. Remove the Loci block from `~/.codex/AGENTS.md`, if installed.
3. Remove the Loci block from `~/.workbuddy/MEMORY.md`, if installed.
4. Remove handlers containing `loci-context` from `~/.claude/settings.json` and `~/.codex/hooks.json`.
5. Delete Loci's copied Claude hooks and slash commands.
6. Optionally delete the brain directory.

Your brain data is not deleted by removing the user-level blocks.

## Troubleshooting

- **AI does not know the brain path**: rerun `npx create-loci` and reconnect the tool, or check that the Loci block exists in the correct user-level file.
- **Claude works but Codex does not**: make sure Codex was selected during setup and `~/.codex/AGENTS.md` contains the Loci block.
- **Codex works but Claude does not**: make sure Claude Code was selected during setup and `~/.claude/CLAUDE.md` contains the Loci block.
- **Dashboard opens but data looks empty**: the Clean demo should always have sample data; live API views depend on your local brain files.
- **Moved the brain folder**: rerun setup so the user-level blocks point at the new absolute path.
