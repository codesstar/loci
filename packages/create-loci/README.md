# create-loci

Set up a [Loci](https://github.com/codesstar/loci) brain — one shared local memory for Claude Code and Codex.

## Quick Start

```bash
npx create-loci
```

That's it. The installer opens a browser setup wizard, detects Claude Code and Codex, then asks which tools should share the brain.

## Options

```bash
npx create-loci [target-dir]   # Default: ~/loci
npx create-loci --web          # Browser setup (default)
npx create-loci --cli          # Terminal setup (Mac/Linux)
```

## What it does

1. Downloads the Loci template (via `git clone` or direct download)
2. Opens the browser setup wizard
3. Connects Claude Code, Codex, or both to the same local brain

## Requirements

- Node.js 18+
- That's it. Git is optional.

## Learn more

- [GitHub](https://github.com/codesstar/loci)
- [Documentation](https://codesstar.github.io/loci)
