<p align="center">
  <img src="docs/assets/seahorse-logo.png" alt="Loci Seahorse" width="200" />
</p>

<h1 align="center">Loci — Memory Palace for AI</h1>

<p align="center">
  <strong>Give your AI a brain that remembers everything.</strong> | <strong>给 AI 装大脑。</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://github.com/codesstar/loci/stargazers"><img src="https://img.shields.io/github/stars/codesstar/loci?style=social" alt="GitHub Stars" /></a>
  <img src="https://img.shields.io/badge/built_for-Claude_Code-blueviolet" alt="Built for Claude Code" />
  <img src="https://img.shields.io/badge/storage-100%25_local_Markdown-green" alt="Local Markdown" />
</p>

---

## The Problem

You tell your AI assistant "let's use Postgres" on Monday. By Wednesday, it has no idea. You re-explain your project, your preferences, your decisions — every single conversation. Your AI is brilliant but has amnesia.

**What if it just... remembered?**

## The Solution

Loci gives your AI persistent, structured memory using plain Markdown files and git. No database, no server, no account. Everything stays on your machine.

```
Monday:    "Let's use Postgres for the new service."
              AI saves your decision automatically.

Wednesday: "Why did we pick Postgres again?"
              "You chose Postgres on Monday because of JSONB support
               and your team's existing expertise."

Friday:    You open a DIFFERENT project. "Should I use MySQL here?"
              "You chose PostgreSQL on Monday for the main service.
               Unless this one has different requirements, staying
               consistent makes sense."
```

Your AI remembers across conversations, across days, across projects. It knows your decisions, your goals, your patterns — and it gets smarter over time.

![Loci Dashboard](docs/assets/dashboard-preview.png)

---

## Quick Start

Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview).

```bash
git clone https://github.com/codesstar/loci.git my-brain
cd my-brain
claude
```

That's it. Claude detects the new brain, asks you a few questions, and sets everything up through conversation. Takes about 2 minutes.

> **Alternative**: Run `bash install.sh` instead of `claude` — it checks prerequisites, disconnects from the template repo, and installs slash commands before launching Claude.
>
> **Windows?** Use [WSL](https://learn.microsoft.com/en-us/windows/wsl/install) or Git Bash.
>
> **Want to see what a brain looks like?** Check out [`examples/alex/`](examples/alex/) — a full brain with 3 months of history.
>
> **New to Loci?** Read the **[Getting Started Guide](docs/getting-started.md)** for a complete walkthrough.

---

## What Happens After Setup

You don't learn Loci. You just talk to your AI, and four things start happening:

### It remembers

Mention a decision, a task, a preference — Loci saves it to the right file automatically. You never take notes manually.

```
You: "I decided to switch from REST to GraphQL for the mobile API."

Got it — noted your decision to switch to GraphQL.
```

You said it once. It's permanent. Next week, next month — your AI still knows.

### It connects your projects

Link any project folder with one command. What you learn in Project A is available when it matters in Project B.

```
Brain (your memory)
 |-- Project A    "We chose GraphQL here"
 |-- Project B    "You chose GraphQL in Project A — same pattern applies here"
 |-- Project C    "Three projects now use GraphQL. Standardize the client?"
```

### It finds patterns you miss

Every morning, Loci reviews what changed and surfaces insights:

```
Morning briefing:
  - Your last 4 architecture decisions all simplified your stack.
    You're shifting from "more features" to "fewer, better ones."
  - "Set up CI/CD" has been on your task list for 9 days. Do it or drop it?
```

### It grows with you

Your values change. Your goals shift. Loci tracks the evolution — current state stays lean and fast, history is preserved for when you want to reflect.

```
March:  identity.md says "backend developer, learning React"
June:   identity.md says "full-stack developer, shipping products"
        evolution.md records the transition and when it happened
```

---

## How It Works

| Concept | What it does | Why it matters |
|---------|-------------|----------------|
| **Smart saving** | Extracts decisions, tasks, and insights from conversation — never saves raw chat transcripts | Your memory stays clean and searchable, not a wall of text |
| **Layered loading** | Loads only what's relevant to the current conversation. Archives stay out of the way until needed | Fast responses, even after months of accumulated memory |
| **Cross-project sync** | Hub-and-spoke architecture — your brain is the hub, projects are spokes. Important info flows automatically | Decisions in one project inform work in others |
| **Daily review** | Morning briefing summarizes yesterday, surfaces patterns, flags stale tasks | You start each day with full context in 10 seconds |
| **Growth tracking** | When your identity or goals change, old versions are archived automatically | You can look back and see how you've evolved |
| **Git-native** | Everything is Markdown files in a git repo. `git diff` shows what your AI learned. `git log` is your memory timeline | Full version history, works offline, you own your data |

> **Deep dive**: [How It Works](docs/how-it-works.md) — one doc that covers the entire system.

---

## What Users Say It Feels Like

**"It knows when I wake up"** — Zhang Wei opens his terminal in the morning. No re-explaining. His AI already knows what he was working on, what's next, and what's overdue.

**"It remembers what I read"** — Rina saves an article about pricing while coding. Two weeks later, she's designing a pricing page. Her AI surfaces the article without being asked.

**"It tells me to stop"** — It's 11pm. Zhang Wei is still debugging. His AI says "go sleep, this'll still be here tomorrow" — then respects his choice when he keeps going.

> More stories: **[User Stories](docs/user-stories.md)** — what Loci actually feels like in daily use.

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
│   └── links/             # Connected projects
├── templates/             # File & command templates
└── docs/                  # Full documentation
```

Extension modules created on demand: `finance/`, `people/`, `content/`, `references/`

---

## Commands

| Command | What it does |
|---------|-------------|
| `/loci-link` | Connect a project folder to your brain |
| `/loci-sync` | Manual save + sync (flags: `--local`, `--dry-run`) |
| `/loci-consolidate` | Review recent changes and surface patterns (e.g. `/loci-consolidate 7` for a weekly review) |
| `/loci-settings` | Configure what a project syncs to your brain |
| `/loci-brain-settings` | Configure persistence mode and notifications |
| `/loci-scan` | Re-scan a project and update its profile |

---

## Compatibility

Loci is **built for Claude Code**. Other AI editors can read the memory files but won't have the full experience.

| Tool | Support | Notes |
|------|---------|-------|
| **Claude Code** | **Full** | All features work natively |
| **Cursor** | Partial | Memory + auto-save via `.cursorrules` |
| **Windsurf** | Partial | Memory + auto-save via `.windsurfrules` |
| **Cline** | Partial | Memory + auto-save via `.clinerules` |

> Using another editor? See **[Other Editors Guide](docs/other-editors.md)**.
>
> Loci's memory is plain Markdown — any AI tool can read it. The full experience (slash commands, auto-save, hooks) requires Claude Code.

---

## Documentation

| Doc | What you'll learn |
|-----|-------------------|
| **[Getting Started](docs/getting-started.md)** | Step-by-step setup and first conversation |
| **[How It Works](docs/how-it-works.md)** | Complete system overview in one page |
| **[User Stories](docs/user-stories.md)** | What Loci feels like in daily use |
| **[Architecture](docs/architecture.md)** | Three-layer memory system in depth |
| **[Synapse](docs/synapse.md)** | Multi-project sync and routing |
| **[Distillation](docs/distillation.md)** | How conversations become structured knowledge |
| **[Dashboard](docs/dashboard.md)** | Visual overview of your brain |
| **[Privacy](docs/privacy.md)** | Data protection and what stays where |
| **[Roadmap](docs/roadmap.md)** | What's coming next |

---

## Contributing

Contributions welcome — bug fixes, features, docs, or just sharing how you use Loci. Please open an issue first for large changes. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).

---

<p align="center">
  <strong>Loci</strong> is built by <a href="https://github.com/codesstar">Callum</a>.<br/>
  If this gives your AI a better memory, consider giving it a star.
</p>
