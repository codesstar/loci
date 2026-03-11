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
  <img src="https://img.shields.io/badge/built_for-Claude_Code-blueviolet" alt="Built for Claude Code" />
  <img src="https://img.shields.io/badge/storage-100%25_local_Markdown-green" alt="Local Markdown" />
</p>

---

You tell your AI "I decided to use Postgres instead of MySQL" on Monday. By Wednesday, it's forgotten. You explain the same project context for the fifth time. You wish it just *knew* you.

**Loci fixes this.** It gives your AI a persistent, structured memory that grows with every conversation — and follows you across projects.

```
Monday:    "Let's use Postgres for the new service."
              → [Loci] Stored: decision → decisions/2026-03-10-postgres.md

Wednesday: "Why did we pick Postgres again?"
              → "You chose Postgres on Monday because of JSONB support
                 and your team's existing expertise."
                 <!-- source: decisions/2026-03-10-postgres.md @2026-03-10T14:32 -->

Friday:    (Daily consolidation)
              → "This week you made 3 architecture decisions, all simplifying
                 your stack. You're shifting from 'more features' to 'fewer,
                 better ones'."
```

No database. No server. No account. Just Markdown files and git.

![Loci Dashboard](docs/assets/dashboard-preview.png)

---

## Quick Start

Three commands. Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview).

```bash
git clone https://github.com/codesstar/loci.git my-brain
cd my-brain
bash install.sh
```

The installer checks prerequisites, then launches Claude Code. Claude asks you a few questions and sets everything up through conversation.

> **What does setup do?** Creates your identity and task files inside `my-brain/`, adds a global awareness block to `~/.claude/CLAUDE.md` (so Loci works across all projects), and copies slash commands to `~/.claude/commands/`. Everything is reversible — just delete the `<!-- loci:start -->` block to remove global awareness.
>
> **Windows?** Use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) or Git Bash.
>
> **Want to see a populated brain first?** Check out [`examples/alex/`](examples/alex/) — a full brain with 3 months of decisions, tasks, and insights.

---

## What Happens Next

Once your brain is set up, Loci works invisibly:

**It remembers.** Mention a decision, a task, a goal — Loci distills it into the right file automatically. No manual note-taking.

```
You: "Let's switch from REST to GraphQL for the mobile API."
[Loci] Stored: decision "Switch to GraphQL for mobile API" → decisions/
```

**It connects.** Link your projects with `/loci-link`. Loci tracks decisions and insights across all of them — what you learn in Project A shows up when it's relevant in Project B.

```
┌──────────────────────────────────┐
│          Your Brain (HQ)         │
│                                  │
│  Identity  Tasks  Decisions      │
│                                  │
│           Synapse                │
└──────┬────────┬────────┬─────────┘
       ▼        ▼        ▼
   Project A  Project B  Project C
   .loci/     .loci/     .loci/
```

**It reflects.** Every morning, Loci reviews what changed yesterday, finds patterns you missed, and surfaces insights:

```
[Loci] Your last 3 decisions all simplified your architecture.
       Bloom Health migration is due in 5 days with 0 progress — flag this?
```

**It grows with you.** Identity changes, value shifts, skill evolution — all tracked in `me/evolution.md`. Your AI doesn't just remember facts; it understands how you're changing.

---

## How It Works

| Layer | What it does |
|-------|-------------|
| **Distillation** | Extracts facts, decisions, tasks from conversations — never saves raw transcripts. Every entry has a source citation with timestamp for traceability |
| **Three-Layer Context** | L1 loads every conversation (identity, goals, tasks). L2 loads on demand. L3 archives stay deep until needed |
| **Synapse** | Hub-and-spoke info flow between your brain and linked projects. Signal-driven: meaningful info pushes automatically, noise stays local |
| **Memory Consolidation** | Daily review of recent changes. Finds cross-domain patterns, tracks goal progress, flags stale tasks. Manual deep-dives with `/loci-consolidate 7` or `30` |
| **Growth Tracking** | When your identity/values/goals change, the old version is archived to `me/evolution.md`. Current files stay lean |
| **Git-Native** | Everything is Markdown + git. `git diff` shows what your AI learned today. `git log` is your memory timeline |

> Full documentation: **[How It Works](docs/how-it-works.md)** — one doc, understand everything.
>
> Topic guides: [Architecture](docs/architecture.md) | [Synapse](docs/synapse.md) | [Distillation](docs/distillation.md) | [Dashboard](docs/dashboard.md) | [Privacy](docs/privacy.md) | [Roadmap](docs/roadmap.md)

---

## Directory Structure

```
my-brain/
├── CLAUDE.md              # AI operating system (reads this first)
├── plan.md                # Life direction & goals
├── inbox.md               # Quick capture
├── me/                    # Identity, values, skills, evolution
├── tasks/                 # active.md, daily plans, journal
├── decisions/             # Decision records with full context
├── archive/               # Completed items (never deleted)
├── .loci/                 # System internals (hooks, dashboard, config)
│   └── links/             # Connected projects (Synapse)
├── templates/             # File & command templates
└── docs/                  # Full documentation
```

Extension modules created on demand: `finance/`, `people/`, `content/`, `references/`

---

## Compatibility

Loci is **built for Claude Code**. Other editors can use the memory files but won't have the full experience.

| Tool | Support | Notes |
|------|---------|-------|
| **Claude Code** | **Full** | All features work natively |
| **Cursor** | Partial | Memory + distillation via `.cursorrules` |
| **Windsurf** | Partial | Memory + distillation via `.windsurfrules` |
| **Cline** | Partial | Memory + distillation via `.clinerules` |

> Using Cursor, Windsurf, or another editor? See **[Other Editors Guide](docs/other-editors.md)**.
>
> Loci's memory is plain Markdown — any AI can read it. The full experience (slash commands, auto-persistence, hooks) requires Claude Code.

---

## Contributing

Contributions welcome — bug fixes, features, docs, or just sharing how you use it. Please open an issue first for large changes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).

---

<p align="center">
  <strong>Loci</strong> is built by <a href="https://github.com/codesstar">Callum</a>.<br/>
  If this gives your AI a better memory, consider giving it a star.
</p>
