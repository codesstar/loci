# Getting Started with Loci

> From zero to "my AI remembers me" in about 5 minutes.

---

## Prerequisites

Recommended:

1. **Claude Code or Codex** — Loci is currently focused on these two agent coding tools, and both can share the same local brain.
2. **Node.js / npm** — required for `npx create-loci`.
3. **Git** — strongly recommended for backup, diffs, and history.

Optional:
- **Python 3** — not required for the core system. The current dashboard uses a Node.js server.

---

## Installation

### Option A: Ask your AI to install it (recommended)

Loci is built for AI agents — so let yours install it. Paste this into Claude Code or Codex:

```text
Install Loci for me: https://github.com/codesstar/loci
Clone the repo, then follow docs/AI-INSTALL.md inside it.
```

Your AI clones the repo (default location `~/loci`), asks your name, runs the scriptable setup, connects itself to the new brain, and verifies everything works. See [AI-INSTALL.md](AI-INSTALL.md) for the exact steps it follows.

### Option B: npx installer (no AI needed)

```bash
npx create-loci
```

The installer opens a browser wizard and helps you:

1. Create or choose a local brain directory
2. Enter your name, role, language, current focus, and preferences
3. Detect Claude Code and Codex
4. Choose whether to connect Claude Code, Codex, or both
5. Write user-level Loci rules so both tools know the same brain path

For fast startup, setup also installs a small SessionStart hook. The hook loads
only your standing preferences, a compact file map, the current project's
pointer, and a short state summary. It does **not** preload your plans, tasks,
inbox, journals, or project history. Its output is capped, and it times out
after 3 seconds instead of holding up the session.

On Codex, run `/hooks` once after setup to review and trust the Loci hook. Codex
skips untrusted changed hooks; if that happens, hooks are disabled, or your
existing JSON cannot be merged safely, the global `AGENTS.md` rule uses the
same lightweight builder as a fallback. Existing unrelated hooks are preserved.
See the [official Codex Hooks documentation](https://learn.chatgpt.com/docs/hooks).

Prefer a terminal wizard?

```bash
npx create-loci --cli
```

### Option C: Manual setup

```bash
git clone https://github.com/codesstar/loci.git ~/loci
cd ~/loci
./setup.sh
```

After setup, open Claude Code or Codex from any project:

```bash
claude
# or
codex
```

They will read the same local brain. Decisions, tasks, and project context saved in one tool are available to the other.

---

## Your First Conversation

If you used `npx create-loci`, the browser wizard already asked these questions:

```
  Welcome to Loci! Let me set up your brain.

  1. What's your name?
  2. What do you do? (Developer / Designer / Creator / Student / Other)
  3. What's your most important focus right now?
  4. What hours do you usually work?
  5. Preferred language? (English / Chinese / Mix)
```

Answer honestly — these shape your initial files. You can change everything later.

After setup, Loci creates your starter files:

```
  Done! Your brain is ready. Here's what I created:

  - me/identity.md       Your basics (name, role, current focus)
  - plan.md              Your mission and goals
  - tasks/active.md      Your first task based on what you told me
  - .loci/config.yml     Settings (work hours, language)

  Try telling me about a decision you've made recently, or
  just keep working — I'll remember what matters.
```

The first time Claude Code or Codex opens after that, its startup hook loads the lightweight map and is ready to work. Deeper files are opened only when your request needs them. From now on, just talk normally.

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
│   ├── wellbeing.md       Body, mind, energy, sleep, confidence
│   ├── insights.md        Fresh personal reflections
│   ├── learned.md         Reusable lessons and practices
│   └── evolution.md       Old versions of identity/values/wellbeing (growth log)
│
├── tasks/                 Your work.
│   ├── tasks.json         Canonical task database
│   ├── calendar.json      Schedule (occupied time blocks only)
│   ├── active.md          Generated active task cache for fast AI loading
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
│   ├── hooks/             Auto-sync scripts
│   ├── dashboard/         Local visual dashboard (Node server + HTML)
│   └── activity/          Activity ledger (one file per month — "what did I do?")
│
└── docs/                  Documentation (you're reading one now)
```

Extension modules are created when you need them:
- `finance/` — budgets, assets, financial tracking
- `people/` — contacts and meeting notes
- `content/` — writing and publishing
- `references/` — articles, books, links you want to remember
- `notes/` — pointers to your own Obsidian / Feishu / Notion notes, plus short inline notes
- `people/` — relationship context and contact notes

---

## Daily Workflow

### Morning

Open your terminal in any project (or in your brain folder) and start a conversation:

```
> morning
```

Your AI already knows what day it is, what you worked on yesterday, and what's on your plate today. It will give you a briefing:

```
  Morning! Yesterday you got the API pagination working but
  the cursor-based approach had an edge case with deleted records.

  Today:
  - P0: Fix the pagination edge case (you left a note: "deleted
    records cause cursor gaps, try soft deletes")
  - P1: Code review for Kai's PR — it's been open 3 days
  - P2: Start writing the deployment docs

  "Refactor the auth middleware" has been P1 for 9 days —
  do it today or move it to someday?
```

### During Work

Just work normally. When you make decisions, uncover insights, or mention tasks, your AI saves them automatically:

```
> we tried server-side rendering but it adds too much complexity
  for our use case. Let's stick with client-side + a loading skeleton.

  Got it — saved your rendering decision with the tradeoff reasoning.

> oh also, the staging deploy is broken. Something about the
  Docker build failing on the new dependency.

  Added "Fix staging Docker build" to your tasks as P1.
```

You don't need to say "save this" or use any special syntax. Just talk.

### End of Day

When you're wrapping up:

```
> I'm done for today

  Good session. Here's what happened:
  - Fixed the pagination edge case with soft deletes
  - Decided to stick with client-side rendering
  - Reviewed Kai's PR (approved with 2 comments)

  Tomorrow's priorities:
  - P0: Fix the broken staging deploy
  - P1: Deployment docs (you'll need these before Friday's release)
  - P1: Follow up on Kai's PR comments

  It's 10:45 — good time to stop. See you tomorrow.
```

If you say "summarize" or "journal", your AI will write a daily journal entry in `tasks/journal/`.

---

## Opening The Dashboard

The dashboard is optional, but it is the fastest way to understand what Loci is storing.

From any directory:

```bash
loci
```

The `loci` command (installed by setup; open a new terminal if it isn't found yet) starts the server and opens the dashboard. Manual equivalent from your brain directory: `node .loci/dashboard/server.js`, then open:

```text
http://127.0.0.1:8765/
```

The `/` route opens the dashboard. It reads your real brain files directly — tasks, schedule, journal, memory, notes, people, and connected projects — with first-run onboarding and a Chinese / English language selector.

The local API is available at `/api/data`. If you want to explore the product without your own data, use the hosted demo on the website instead.

More detail: [Dashboard docs](dashboard.md).

---

## Connecting Projects

After using Loci for a few days, you'll want to connect your code projects. This is the "Week 2" feature.

### How to connect a project

There is no command to learn. Open Claude Code or Codex in a project folder and work normally.

When the project starts looking serious, your AI should offer once at the end of the conversation:

> "This project seems real now. Want me to leave memory here?"

If you say yes, your AI will:
1. Create `.loci/memory.md` in the project repo
2. Create `.loci/profile.md` for stable project details
3. Create `.loci/progress/` for project progress
4. Create `.loci/decisions/` for project decisions
5. Create `.loci/todo.json` for project development todos
6. Inject a Loci project block into the repo's `CLAUDE.md` and `AGENTS.md`
7. Add `.loci/` to the repo's `.gitignore`
8. Add one index line to your brain's `projects/index.md`

Internally, AI tools should use `scripts/loci-project.js connect` for this, so the multi-file write stays consistent.

From now on, the project's memory lives in the project repo. The brain only keeps an index and knows where to look.

### What syncs between projects

Not everything syncs. That would be noisy. By default:

- **Project decisions** stay in the project repo's `.loci/decisions/`
- **Project restart context** stays in `.loci/memory.md`
- **Project stable details** stay in `.loci/profile.md`
- **Project progress** goes to `.loci/progress/YYYY-MM.md`
- **Project development todos** go to `.loci/todo.json`
- **Milestones/insights with cross-project value** may update the brain's `projects/index.md`
- **Debug notes** stay local (temporary fixes don't need to travel)
- **Work-in-progress** stays local (unfinished thoughts stay in context)

You can configure this per project with `/loci-settings`.

### Example: cross-project memory in action

You're in Project A:
```
> the S3 upload was failing silently. Turns out you need to
  set the ACL explicitly even with bucket policies.

  Got it — saved your S3 upload fix with the root cause.
```

Later, you're in Project B:
```
> I need to add file uploads. Thinking S3.

  You debugged an S3 upload issue in Project A last week — uploads
  fail silently if you don't set the ACL explicitly, even with
  bucket policies configured.

  Worth setting that up correctly from the start here.
```

---

## Tips and Tricks

**Say "undo" if it saves something wrong.** Loci's auto-save is smart but not perfect. If it misinterprets something, just say "undo" and it reverses the last save.

**Half-baked ideas go to a separate list.** When you mention something vague ("maybe I should learn video editing"), Loci saves it separately rather than creating a task. Review it weekly.

**Run `git log --oneline` to see your memory timeline.** Every save is a git-trackable file change. You can see exactly what your AI learned and when.

**Use `/loci-consolidate 7` for a weekly review.** It scans the last 7 days of changes and surfaces patterns, stale tasks, and insights you might have missed.

**Context getting full? Just save and restart.** When your AI starts slowing down or repeating itself, say "save everything" or run `/loci-sync`, then open a fresh terminal. Your AI reads your brain files and picks up exactly where you left off — full context recovery in seconds, not minutes of re-explaining.

**Your brain is just files.** You can edit any file directly in your editor. Loci will pick up the changes next conversation. There's no lock-in.

**The dashboard gives you a visual overview.** Type `loci` in any terminal — it starts the server and opens `http://127.0.0.1:8765/` for you.

---

## FAQ

**Q: Does Loci send my data anywhere?**
No. Everything stays in local Markdown files on your machine. There's no server, no account, no telemetry. Your conversations go through Claude Code (which has its own privacy policy), but Loci's memory files never leave your computer.

**Q: Can I use Loci with Cursor / Windsurf / other editors?**
Partially. Any AI editor can read your memory files (they're just Markdown). The full experience is currently focused on Claude Code and Codex, which can share one local brain. See the [Other Editors Guide](other-editors.md).

**Q: What happens if I have two terminals open?**
Loci detects file changes from other terminals at the start of each conversation. Simultaneous writes to the same file can cause conflicts, but git tracks everything so no data is truly lost. In practice, this is rare.

**Q: How do I back up my brain?**
It's a git repo. Push it to a private GitHub/GitLab repo, or just copy the folder. Standard git backup practices apply.

**Q: Can I move my brain to a different computer?**
Yes. Copy the folder (or clone from your private remote), then reconnect your AI tools on the new machine: register the brain path in `~/.loci/brain-path` and re-add the Loci block to `~/.claude/CLAUDE.md` / `~/.codex/AGENTS.md`. The easiest way is to ask your AI to do it — point it at the copied folder and [AI-INSTALL.md](AI-INSTALL.md).

**Q: How big does the brain get?**
After months of daily use, expect a few hundred Markdown files totaling a few megabytes. Loci archives old content and keeps active files lean. Git history will be larger, but that's normal.

**Q: Can I delete things from my brain?**
Yes, but Loci prefers archiving over deleting. Move files to `archive/` instead. If you truly want something gone, delete the file and commit. It will still exist in git history unless you rewrite history.

**Q: What if I don't like the auto-save behavior?**
Switch to manual mode: run `/loci-brain-settings` and set persistence to `manual`. In manual mode, nothing saves unless you explicitly say "save this" or run `/loci-sync`.

**Q: How do I uninstall Loci?**
Remove the `<!-- loci:start -->` block from `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md`; remove the SessionStart entries whose command contains `loci-context` from `~/.claude/settings.json` and `~/.codex/hooks.json`; delete Loci's files from `~/.claude/hooks/` and slash commands from `~/.claude/commands/`; then delete your brain folder. Setup creates `.loci-backup` copies before changing existing hook JSON, so you can compare or restore them if needed.

**Q: I found a bug / have a feature idea.**
Open an issue on [GitHub](https://github.com/codesstar/loci/issues). Contributions are welcome — see [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Next Steps

- **[How It Works](how-it-works.md)** — understand the full system in one page
- **[User Stories](user-stories.md)** — see what daily use feels like
- **[Roadmap](roadmap.md)** — what's coming next
