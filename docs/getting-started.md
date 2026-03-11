# Getting Started with Loci

> From zero to "my AI remembers me" in about 5 minutes.

---

## Prerequisites

You need two things:

1. **Claude Code** — Loci is built for Claude Code. [Install it here](https://docs.anthropic.com/en/docs/claude-code/overview) if you haven't already.
2. **Git** — You almost certainly have this. Run `git --version` to check.

Optional:
- **Python 3** — Only needed for the dashboard. Everything else works without it.

---

## Installation

### Option A: Clone and launch (recommended)

```bash
git clone https://github.com/codesstar/loci.git my-brain
cd my-brain
claude
```

Claude will detect that this is a fresh brain and walk you through setup.

### Option B: Use the installer script

```bash
git clone https://github.com/codesstar/loci.git my-brain
cd my-brain
bash install.sh
```

The installer does a few extra things before launching Claude:
- Checks that Claude Code is installed
- Disconnects the template git remote (so your personal data never gets pushed to the public repo)
- Installs slash commands to `~/.claude/commands/`
- Adds global brain awareness to `~/.claude/CLAUDE.md`

Both options end the same way: Claude launches and starts the onboarding conversation.

---

## Your First Conversation

When Claude launches in a fresh brain, it will ask you a few questions:

```
  Welcome to Loci! Let me set up your brain.

  1. What's your name?
  2. What do you do? (Developer / Designer / Creator / Student / Other)
  3. What's your most important focus right now?
  4. What hours do you usually work?
  5. Preferred language? (English / Chinese / Mix)
```

Answer honestly — these shape your initial files. You can change everything later.

After you answer, Claude creates your starter files:

```
  Done! Your brain is ready. Here's what I created:

  - me/identity.md       Your basics (name, role, current focus)
  - plan.md              Your mission and goals
  - tasks/active.md      Your first task based on what you told me
  - .loci/config.yml     Settings (work hours, language)

  Try telling me about a decision you've made recently, or
  just keep working — I'll remember what matters.
```

That's it. You're set up. From now on, just talk normally.

---

## Understanding Your Brain

After setup, your brain directory looks like this:

```
my-brain/
├── CLAUDE.md              AI reads this first. It contains all the rules
│                          for how your AI behaves. You can read it, but
│                          you don't need to edit it.
│
├── plan.md                Your mission, goals, and current priorities.
│                          Loaded every conversation. Update it when your
│                          direction changes.
│
├── inbox.md               Quick capture. When you mention a vague idea
│                          ("maybe I should learn Rust"), it goes here.
│                          Review it weekly.
│
├── me/                    Everything about you.
│   ├── identity.md        Basics: name, job, city, current season
│   ├── values.md          What matters to you (created when relevant)
│   ├── learned.md         Lessons and insights (grows over time)
│   └── evolution.md       Old versions of identity/values (growth log)
│
├── tasks/                 Your work.
│   ├── active.md          Current tasks, sorted by priority (P0-P3)
│   ├── someday.md         Ideas you might do eventually
│   ├── daily/             One file per day — schedule + what got done
│   └── journal/           Daily summaries and reflections
│
├── decisions/             One file per major decision. Each records
│                          what you decided, why, and what alternatives
│                          you considered. Searchable forever.
│
├── archive/               Nothing is ever deleted. Completed tasks,
│                          old plans, expired decisions — all here.
│
├── .loci/                 System internals.
│   ├── config.yml         Your settings (persistence mode, work hours)
│   ├── links/             Connected external projects
│   ├── hooks/             Auto-sync scripts
│   ├── dashboard/         Visual panel (HTML + data.json)
│   └── activity-log.md    Last 14 days of file changes
│
└── docs/                  Documentation (you're reading one now)
```

Extension modules are created when you need them:
- `finance/` — budgets, assets, financial tracking
- `people/` — contacts and meeting notes
- `content/` — writing and publishing
- `references/` — articles, books, links you want to remember

---

## Daily Workflow

### Morning

Open your terminal in any project (or in your brain folder) and start a conversation:

```
> morning
```

Your AI already knows what day it is, what you worked on yesterday, and what's on your plate today. It will give you a briefing:

```
  Morning! Yesterday you shipped the auth module. Today:

  - P0: API integration testing (3 endpoints left)
  - P1: Design review at 2pm
  - P2: Refactor dashboard components

  "Set up monitoring" has been P1 for a week — want to
  schedule it or move it to someday?
```

### During Work

Just work normally. When you make a decision, mention a new task, or share an insight, your AI saves it automatically:

```
> let's go with Redis for the cache layer, Memcached is overkill

  [Loci] Stored: decision "Use Redis for caching" -> decisions/

> oh also remind me to email the client about the deadline

  [Loci] Added task: "Email client about deadline" (P2) -> tasks/active.md
```

You don't need to say "save this" or use any special syntax. Just talk.

### End of Day

When you're wrapping up:

```
> I'm done for today

  Good session. Here's what happened:
  - Finished 2 of 3 API endpoints
  - Decided on Redis for caching
  - Added 2 new tasks

  Tomorrow's priorities:
  - P0: Finish last API endpoint
  - P1: Email client about deadline
  - P1: Design review follow-ups

  It's 10:30 — good time to stop. See you tomorrow.
```

If you say "summarize" or "journal", your AI will write a daily journal entry in `tasks/journal/`.

---

## Connecting Projects

After using Loci for a few days, you'll want to connect your code projects. This is the "Week 2" feature.

### How to connect a project

Open Claude Code in any project folder and run:

```
/loci-link
```

Your AI will:
1. Scan the project (README, package.json, directory structure)
2. Create a `.loci/` folder in the project with connection files
3. Register the project in your brain's `.loci/links/`

From now on, when you work in that project, your AI knows about your brain — decisions, goals, preferences, everything.

### What syncs between projects

Not everything syncs. That would be noisy. By default:

- **Decisions** sync to brain (architectural choices should be known everywhere)
- **Milestones** sync to brain (shipped features, releases)
- **Insights** sync to brain (learned patterns)
- **Debug notes** stay local (no one else needs to know about that CSS hack)
- **Work-in-progress** stays local (unfinished thoughts stay in context)

You can configure this per project with `/loci-settings`.

### Example: cross-project memory in action

You're in Project A:
```
> let's use PostgreSQL, the JSONB support is exactly what we need
  [Loci] Stored: decision "Use PostgreSQL" -> decisions/
```

Later, you're in Project B:
```
> I need a database for this service. What should I use?

  You chose PostgreSQL in Project A on Monday for JSONB support.
  Unless this service has different data requirements, using the
  same database simplifies ops and lets you reuse connection logic.
```

---

## Tips and Tricks

**Say "undo" if it saves something wrong.** Loci's auto-save is smart but not perfect. If it misinterprets something, just say "undo" and it reverses the last save.

**Use `inbox.md` for half-baked ideas.** When you mention something vague ("maybe I should learn Rust"), Loci puts it in `inbox.md` rather than creating a task. Review it weekly.

**Run `git log --oneline` to see your memory timeline.** Every save is a git-trackable file change. You can see exactly what your AI learned and when.

**Use `/loci-consolidate 7` for a weekly review.** It scans the last 7 days of changes and surfaces patterns, stale tasks, and insights you might have missed.

**Your brain is just files.** You can edit any file directly in your editor. Loci will pick up the changes next conversation. There's no lock-in.

**The dashboard gives you a visual overview.** Run `cd .loci/dashboard && python3 build.py && python3 -m http.server 8765` and open `localhost:8765` in your browser.

---

## FAQ

**Q: Does Loci send my data anywhere?**
No. Everything stays in local Markdown files on your machine. There's no server, no account, no telemetry. Your conversations go through Claude Code (which has its own privacy policy), but Loci's memory files never leave your computer.

**Q: Can I use Loci with Cursor / Windsurf / other editors?**
Partially. Any AI editor can read your memory files (they're just Markdown). But the full experience — auto-save, slash commands, cross-project sync — requires Claude Code. See the [Other Editors Guide](other-editors.md).

**Q: What happens if I have two terminals open?**
Loci detects file changes from other terminals at the start of each conversation. Simultaneous writes to the same file can cause conflicts, but git tracks everything so no data is truly lost. In practice, this is rare.

**Q: How do I back up my brain?**
It's a git repo. Push it to a private GitHub/GitLab repo, or just copy the folder. Standard git backup practices apply.

**Q: Can I move my brain to a different computer?**
Yes. Copy the folder (or clone from your private remote), run `bash install.sh`, and everything reconnects. The install script re-establishes global awareness on the new machine.

**Q: How big does the brain get?**
After months of daily use, expect a few hundred Markdown files totaling a few megabytes. Loci archives old content and keeps active files lean. Git history will be larger, but that's normal.

**Q: Can I delete things from my brain?**
Yes, but Loci prefers archiving over deleting. Move files to `archive/` instead. If you truly want something gone, delete the file and commit. It will still exist in git history unless you rewrite history.

**Q: What if I don't like the auto-save behavior?**
Switch to manual mode: run `/loci-brain-settings` and set persistence to `manual`. In manual mode, nothing saves unless you explicitly say "save this" or run `/loci-sync`.

**Q: How do I uninstall Loci?**
Remove the `<!-- loci:start -->` block from `~/.claude/CLAUDE.md`, delete the slash commands from `~/.claude/commands/`, and delete your brain folder. No system-level changes to undo.

**Q: I found a bug / have a feature idea.**
Open an issue on [GitHub](https://github.com/codesstar/loci/issues). Contributions are welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Next Steps

- **[How It Works](how-it-works.md)** — understand the full system in one page
- **[User Stories](user-stories.md)** — see what daily use feels like
- **[Roadmap](roadmap.md)** — what's coming next
