# Loci — Memory Palace for AI

**Give your AI a brain.** | **给 AI 装大脑。**

<p align="center">
  <img src="docs/assets/seahorse-logo.png" alt="Loci Seahorse" width="200" />
</p>

Loci is an open-source framework that gives AI assistants persistent memory, identity awareness, and multi-project orchestration. It turns Claude Code (and potentially other AI coding tools) from a stateless assistant into one that knows who you are, what you're working on, and where you left off.

Named after the [method of loci](https://en.wikipedia.org/wiki/Method_of_loci) — the ancient memory technique of placing ideas in an imagined architectural space — Loci gives your AI a structured place to store and retrieve everything that matters.

> **Why a seahorse?** The hippocampus — the brain region responsible for forming memories — is named after its seahorse-like shape. Our mascot is a reminder: Loci is the memory center of your AI.
>
> **为什么是海马？** 大脑中负责记忆形成的「海马体」（hippocampus），因形似海马而得名。海马体是 Loci 的中文别名，也是我们的 IP。

![Loci Dashboard](docs/assets/dashboard-preview.png)

---

## The Problem

Every time you start a new conversation with an AI assistant, it starts from zero.

- **ChatGPT memories** are a flat list of disconnected facts. No structure, no hierarchy, no context.
- **Custom GPTs / system prompts** are static. They don't grow with you.
- **Raw dotfiles** (`.cursorrules`, `.clinerules`) give instructions but no memory, no identity, no orchestration.

You end up repeating yourself. Re-explaining your goals. Re-describing your projects. The AI never truly *knows* you — it just follows instructions until the context window runs out.

## The Solution

Loci gives your AI a **memory palace** — a layered, structured, evolving knowledge base that loads automatically and grows with every conversation.

- **Three layers of context** so your AI loads what it needs, when it needs it
- **Conversation distillation** that extracts insights instead of saving raw transcripts
- **Identity modeling** so your AI understands your goals, values, and working style
- **Synapse** — a cross-project information flow system that connects, syncs, and routes knowledge between your brain and sub-projects
- **A web dashboard** to visualize your entire system at a glance

The result: an AI that picks up where you left off, reminds you what matters, and evolves alongside you.

---

## Quick Start

Get running in 30 seconds. No setup script needed.

```bash
# 1. Clone the repository
git clone https://github.com/codesstar/loci.git my-brain
cd my-brain

# 2. Start your brain
claude "help me set up my brain"
```

That's it. Loci detects it's your first time and walks you through a conversational setup — your name, what you do, what you're working on. In 2 minutes, your brain is ready.

Everything is local Markdown — no database, no server, no account required.

> **Want to see what a fully populated brain looks like?** Check out `examples/alex/` for a complete example.

---

## Core Concepts

### Three-Layer Context

Not everything needs to load every time. Loci organizes knowledge by access frequency:

| Layer | Loaded | Contents | Example |
|-------|--------|----------|---------|
| **L1** | Every conversation | Identity, active goals, inbox | `plan.md`, `inbox.md` |
| **L2** | On demand | Module details, specific people, finances | `04-people/john.md` |
| **L3** | Rarely, by request | Archives, old decisions, evolution history | `08-archive/` |

This keeps your AI fast and focused while maintaining access to deep history when needed.

### Distillation Protocol

Loci never saves raw conversation transcripts. Instead, it **distills** each conversation into structured updates:

- New facts about you go to `01-me/`
- New decisions go to `07-decisions/`
- New tasks go to `05-tasks/active.md`
- New insights go to auto-memory

Think of it as a personal knowledge base that grows automatically — but only with the good parts.

### Growth Tracking

When your goals, values, or identity evolve, Loci doesn't just overwrite the old version. It archives the previous state to `01-me/evolution.md`, creating a timeline of personal growth that you can revisit anytime.

Current files stay lean (L1). History grows indefinitely (L3). Both are always available.

### Synapse — Cross-Project Information Flow

The **Synapse** system controls how information flows between your brain and sub-projects — like synapses between neurons, selectively transmitting what matters.

Managing multiple projects? Loci uses a **hub-and-spoke** model:

```
Loci Brain (HQ)
├── 09-links/project-alpha/   → symlink to ~/projects/alpha
│   ├── profile.md             ← Auto-generated project profile
│   ├── from-hq.md             ← Brain writes strategic directives
│   └── to-hq.md               ← Project reports back
├── 09-links/project-beta/
│   ├── profile.md
│   ├── from-hq.md
│   └── to-hq.md
```

**Connect any folder** to your brain with `/loci-link`. Loci auto-scans the project (README, package.json, directory structure) and creates a profile — your brain knows what each project is from day one.

**Smart persistence** — Loci doesn't burn context saving every message. It auto-distills every 5 conversation rounds, reminds you every 3 rounds when something's worth saving, and detects important info in real-time. All intervals are customizable.

**Four slash commands** manage the entire system:

| Command | Where | What it does |
|---------|-------|--------------|
| `/loci-link` | Any folder | Connect a project to your brain + auto-scan |
| `/loci-settings` | Sub-project | Configure what syncs to/from brain |
| `/loci-brain-settings` | Brain | Configure persistence, privacy, routing, retention |
| `/loci-sync` | Either | Manual push + pull |
| `/loci-scan` | Sub-project | Re-scan and update project profile |

### Dashboard

A local web dashboard (pixel-art style) that visualizes your goals, tasks, inbox, and project status. Built with vanilla HTML/CSS/JS — no frameworks, no dependencies.

```bash
cd 10-dashboard && python3 build.py
# Open localhost:8765
```

---

## Directory Structure

```
loci/
├── CLAUDE.md              # System rules — the AI reads this first
├── plan.md                # Life direction and yearly goals (L1)
├── inbox.md               # Quick capture, fastest input (L1)
│
├── 00-inbox/              # Unsorted thoughts and ideas
├── 01-me/                 # Identity, values, preferences
│   └── evolution.md       # Growth history (L3)
├── 02-finance/            # Budget, assets, financial tracking
├── 03-planning/           # Daily / monthly / quarterly plans
│   └── daily/             # Daily plans and retrospectives
├── 04-people/             # Contacts, meeting notes, relationships
├── 05-tasks/              # Task management
│   └── active.md          # Current tasks with priorities (L1)
├── 06-content/            # Writing, content creation, publishing
├── 07-decisions/          # Decision records with context
├── 08-archive/            # Completed / expired items (L3)
├── 09-links/              # Symlinks to external projects
│   ├── registry.md        # Project registry
│   └── <project>/         # Each linked project has:
│       ├── profile.md     # Auto-scanned project profile
│       ├── from-hq.md     # Directives from brain
│       └── to-hq.md       # Reports back to brain
├── 10-dashboard/          # Web visualization panel
│   └── build.py           # Dashboard data generator
├── 11-references/         # External knowledge base
│   ├── books/             # Book notes & takeaways
│   ├── articles/          # Articles, posts, tweets
│   ├── quotes/            # Ideas that stuck with you
│   ├── videos/            # Video & podcast notes
│   ├── frameworks/        # Mental models & methodologies
│   └── inbox.md           # Quick dump, sort later
│
├── templates/             # File templates for consistency
│   └── commands/          # Slash commands (/loci-link, /loci-settings, etc.)
├── docs/                  # Documentation
├── setup.sh               # One-command setup
└── LICENSE                # MIT
```

---

## Comparison

| Feature | Loci | ChatGPT Memory | Custom GPTs | .cursorrules |
|---------|------|----------------|-------------|--------------|
| Structured context layers | Yes (L1/L2/L3) | No (flat list) | No | No |
| Identity modeling | Yes | Partial | Static only | No |
| Cross-project memory | Yes (Synapse) | No | No | No |
| Configurable sync/privacy | Yes | No | No | No |
| Task management | Yes | No | No | No |
| Web dashboard | Yes | No | No | No |
| Conversation distillation | Yes | Append-only | No | No |
| Growth tracking | Yes | No | No | No |
| Open source | Yes | No | No | Varies |
| Works offline | Yes | No | No | Yes |
| Your data stays local | Yes | No | No | Yes |
| Portable (switch AI tools) | Yes (copy folder) | No (locked in) | No | No |

---

## Documentation

Detailed guides are available in the `docs/` directory:

- **[Architecture](docs/architecture.md)** — Deep dive into the three-layer memory system
- **[Context Awareness](docs/context-awareness.md)** — State sensing + cross-terminal sync
- **[Distillation](docs/distillation.md)** — How conversation insights are extracted and stored
- **[Departments](docs/departments.md)** — Multi-project orchestration guide
- **[Dashboard](docs/dashboard.md)** — Customizing the web visualization
- **[Privacy](docs/privacy.md)** — Data protection, encryption, AI context control
- **[Personalization](docs/personalization.md)** — Adapting Loci to your workflow

---

## Contributing

Loci is early-stage and welcomes contributions of all kinds — bug fixes, new features, documentation improvements, or just sharing how you use it.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-idea`)
3. Make your changes
4. Submit a pull request

Please open an issue first for large changes so we can discuss the approach.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

**Loci** is built by [Callum](https://github.com/callumcyc). If this framework helps you, consider giving it a star.
