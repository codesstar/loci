<p align="center">
  <img src="docs/assets/seahorse-logo.png" alt="Loci Seahorse" width="200" />
</p>

<h1 align="center">Loci — Memory Palace for AI</h1>

<p align="center">
  <strong>Give your AI a brain.</strong> | <strong>给 AI 装大脑。</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://github.com/codesstar/loci/stargazers"><img src="https://img.shields.io/github/stars/codesstar/loci?style=social" alt="GitHub Stars" /></a>
  <img src="https://img.shields.io/badge/made_for-Claude_Code-blueviolet" alt="Made for Claude Code" />
  <img src="https://img.shields.io/badge/storage-100%25_local_Markdown-green" alt="Local Markdown" />
  <img src="https://img.shields.io/badge/pronunciation-loh--sigh_(洛赛)-orange" alt="Pronunciation" />
</p>

Loci is an open-source framework that gives AI assistants persistent memory, identity awareness, and multi-project orchestration. It turns Claude Code (and potentially other AI coding tools) from a stateless assistant into one that knows who you are, what you're working on, and where you left off.

Named after the [method of loci](https://en.wikipedia.org/wiki/Method_of_loci) — the ancient memory technique of placing ideas in an imagined architectural space.

> **Why a seahorse?** The hippocampus — the brain region responsible for forming memories — is named after its seahorse-like shape. Loci is the memory center of your AI. 海马体是 Loci 的中文别名，也是我们的 IP。

![Loci Dashboard](docs/assets/dashboard-preview.png)

---

## The Problem

Every time you start a new conversation with an AI assistant, it starts from zero. ChatGPT memories are a flat list of disconnected facts. Custom GPTs are static. Raw dotfiles give instructions but no memory. You end up repeating yourself — the AI never truly *knows* you.

## The Solution

Loci gives your AI a **memory palace** — a layered, structured, evolving knowledge base that loads automatically and grows with every conversation:

- **Three-layer context** — load what's needed, when it's needed ([details](docs/architecture.md))
- **Conversation distillation** — extracts insights, never saves raw transcripts ([details](docs/distillation.md))
- **Identity modeling** — understands your goals, values, and working style
- **Synapse** — cross-project information flow that connects all your projects ([details](docs/synapse.md))
- **Growth tracking** — archives old identity states, never overwrites
- **Web dashboard** — visualize your entire system at a glance

---

## Quick Start

Get running in 2 minutes. Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview).

```bash
git clone https://github.com/codesstar/loci.git my-brain
cd my-brain
bash setup.sh
```

Claude will greet you, ask a few questions, and set up your brain through conversation. Everything is local Markdown — no database, no server, no account required.

> **Want to see a populated brain first?** Check out [`examples/alex/`](examples/alex/).

---

## How It Works

```
┌──────────────────────────────────────────────────┐
│                 Loci Brain (HQ)                  │
│                                                  │
│  Identity   Tasks   Decisions   Archive          │
│                                                  │
│  L1 (every conv) ── L2 (on demand) ── L3 (deep) │
│                                                  │
│              ┌──────────┐                        │
│              │ Synapse  │                        │
│              │ Filter → Transform → Route        │
│              └────┬─────┘                        │
└───────────────────┼──────────────────────────────┘
         ┌──────────┼──────────┐
         ▼          ▼          ▼
    Project A   Project B   Project C
    .loci-link  .loci-link  .loci-link
```

> One brain, many projects. Each project connects via `.loci-link` and communicates through Synapse. Your brain grows with every conversation, across every terminal.

---

## Core Concepts

| Concept | What it does | Details |
|---------|-------------|---------|
| **Three-Layer Context** | L1 loads every conversation, L2 on demand, L3 for archives | [docs/architecture.md](docs/architecture.md) |
| **Distillation** | Extracts facts, decisions, tasks, insights from conversations — never saves raw transcripts | [docs/distillation.md](docs/distillation.md) |
| **Growth Tracking** | Archives previous identity states to `me/evolution.md` instead of overwriting | — |
| **Synapse** | Hub-and-spoke info flow between brain and linked projects, with signal-driven persistence | [docs/synapse.md](docs/synapse.md) |
| **Git-Native Memory** | Everything is Markdown + git. `git diff` to see what your AI learned today | — |
| **Dashboard** | Local pixel-art web panel for goals, tasks, inbox, and project status | [docs/dashboard.md](docs/dashboard.md) |

---

## Directory Structure

```
my-brain/
├── CLAUDE.md              # System rules (AI reads this first)
├── plan.md                # Life direction & goals (L1)
├── inbox.md               # Quick capture (L1)
├── me/                    # Identity, values, preferences, evolution
├── tasks/                 # active.md, someday.md, calendar, daily plans, journal
├── decisions/             # Decision records with context
├── archive/               # Completed / expired items (L3)
├── .loci/                 # System internals
│   ├── links/             # Symlinks to external projects (Synapse)
│   ├── dashboard/         # Web visualization
│   ├── config.yml         # Brain settings
│   └── hooks/             # Cross-terminal sync
├── templates/             # File & command templates
├── docs/                  # Full documentation
├── setup.sh               # One-command setup
└── LICENSE                # MIT
```

Extension modules (created on demand): `finance/`, `people/`, `content/`, `references/`

---

## Compatibility

| Tool | Support | How |
|------|---------|-----|
| **Claude Code** | Full | Native — reads `CLAUDE.md` + `@import` |
| **Cursor** | High | Copy to `.cursorrules` |
| **Windsurf** | High | Copy to `.windsurfrules` |
| **Cline** | High | Copy to `.clinerules` |
| **OpenAI Codex** | Partial | Reads `AGENTS.md`, needs adapted prompt |
| **GitHub Copilot** | Minimal | No project-level instructions |

> Loci's memory is plain Markdown — it works regardless of which AI reads it. Slash commands are Claude Code specific, but the underlying file operations can be done manually or scripted.

**Current limitations**: CLI only (no mobile app), requires Claude Code for full features, no built-in search beyond file grep, no real-time collaboration.

---

## Documentation

Start here: **[How It Works](docs/how-it-works.md)** — one doc, understand everything.

Topic guides: [Architecture](docs/architecture.md) | [Synapse](docs/synapse.md) | [Distillation](docs/distillation.md) | [Context Awareness](docs/context-awareness.md) | [Departments](docs/departments.md) | [Dashboard](docs/dashboard.md) | [Privacy](docs/privacy.md) | [Personalization](docs/personalization.md)

---

## Contributing

Contributions welcome — bug fixes, features, docs, or just sharing how you use it. Fork, branch, PR. Please open an issue first for large changes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=codesstar/loci&type=Date)](https://star-history.com/#codesstar/loci&Date)

---

<p align="center">
  <strong>Loci</strong> is built by <a href="https://github.com/codesstar">Callum</a>.<br/>
  If this framework helps you, consider giving it a ⭐
</p>
