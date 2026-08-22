# create-loci

Set up a [Loci](https://github.com/codesstar/loci) brain — one shared local memory for Claude Code, Codex, and WorkBuddy.

Loci stores memory as local Markdown and JSON files. The installer creates a brain directory, then connects your AI tools so they can read and write that same memory from any project.

## Quick Start

```bash
npx create-loci
```

That's it. The installer downloads the Loci template, opens a browser setup wizard, then asks which supported tools should share the brain.

Prefer terminal-only setup?

```bash
npx create-loci --cli
```

## Options

```bash
npx create-loci [target-dir]   # Default: ~/loci
npx create-loci --web          # Browser setup (default)
npx create-loci --cli          # Terminal setup (Mac/Linux)
npx create-loci --help         # Show all options
```

## What it does

1. Downloads the Loci template (via `git clone` or direct download)
2. Creates or updates your local brain directory
3. Opens the browser setup wizard, or terminal wizard with `--cli`
4. Asks for your name, role, language, current focus, and basic preferences
5. Detects supported local tools
6. Connects Claude Code, Codex, WorkBuddy, or a selected combination to the same local brain
7. Writes user-level instruction blocks so future sessions know where the brain is

After setup, open a connected tool from any project:

```bash
claude
# or
codex
```

Connected tools use the same Loci brain. Tasks, decisions, notes, and project context saved in one can be used by the others.

## Manual install

If you do not want to use npm:

```bash
git clone https://github.com/codesstar/loci.git ~/loci
cd ~/loci
./setup.sh
```

The older shell installer is still available:

```bash
curl -fsSL https://raw.githubusercontent.com/codesstar/loci/main/install.sh | bash
```

## Dashboard

After setup, you can open the local visual dashboard:

```bash
node .loci/dashboard/server.js
```

Then visit:

```text
http://127.0.0.1:8765/
```

The default route opens the Clean dashboard demo with onboarding, Chinese / English language selection, and self-contained sample data.

## Requirements

- Node.js 18+
- Git is optional. If Git is unavailable, the installer can use direct download.

## Learn more

- [GitHub](https://github.com/codesstar/loci)
- [Getting Started](https://github.com/codesstar/loci/blob/main/docs/getting-started.md)
- [Dashboard](https://github.com/codesstar/loci/blob/main/docs/dashboard.md)
