# AI Install Guide

> **You are an AI agent** (Claude Code, Codex, or similar) and a user has asked you to install Loci for them. Follow these steps exactly. Everything here is scriptable — no interactive wizard, no menus.
>
> Loci is a local, Markdown-based memory system ("second brain") that you — the AI — will read and write on the user's behalf. You are installing your own memory. The brain stays 100% on the user's machine; nothing is uploaded anywhere.

## Step 0 — Preconditions

Check these before starting:

```bash
git --version        # required
node --version       # optional — needed only for the dashboard and task writer
```

- No `git` → stop and tell the user to install git first.
- No `node` → proceed anyway, but mention the dashboard won't run until Node.js is installed.
- **Windows**: these steps require a POSIX shell. Use WSL or Git Bash.

## Step 1 — Ask the user two things

Before running anything, ask the user (in their language):

1. **Their name** — required by the setup script.
2. **Install location** — default is `~/loci`. Only ask if `~/loci` already exists or the user seems to care.

You can infer the rest (role, focus, language, schedule) from your conversation so far, or use the defaults. Don't interrogate the user with six questions — one short message is enough.

## Step 2 — Clone

```bash
git clone https://github.com/codesstar/loci.git ~/loci
```

If the target directory already exists and is not an empty dir, do NOT delete it — ask the user for a different location.

## Step 3 — Run the scriptable setup

```bash
cd ~/loci && ./setup.sh --non-interactive \
  --name "<user's name>" \
  --role "<their role, e.g. Developer>" \
  --focus "<their current #1 focus>" \
  --schedule <morning|daytime|evening|night|irregular> \
  --lang <en|zh|mix> \
  --connect auto
```

Notes:

- Only `--name` is required. Every other flag has a sensible default (`./setup.sh --help` lists them).
- `--about "<text>"` is optional — anything else worth knowing about the user (habits, birthday, goals). Include it if the user has shared such details in conversation.
- `--connect auto` detects Claude Code and Codex on this machine and connects whatever is installed. This appends a Loci block to `~/.claude/CLAUDE.md` and/or `~/.codex/AGENTS.md` (existing files are backed up to `*.loci-backup` first).
- `--lang` controls the language the brain (and its AI notifications) will use: `en`, `zh`, or `mix`.
- If the script reports the brain is **already set up**, it exits without changing anything. Do not re-run with `--force` unless the user explicitly confirms they want to overwrite their existing brain.

The setup also disconnects the git remote (so the user's private brain can never be pushed back to the public template repo) and registers the brain path in `~/.loci/brain-path`.

## Step 4 — Verify

Run these checks and confirm they all pass:

```bash
# 1. Brain is initialized (must print "status: active")
grep 'status:' ~/loci/plan.md | head -1

# 2. Config exists
test -f ~/loci/.loci/config.yml && echo OK

# 3. Brain path is registered globally
cat ~/.loci/brain-path

# 4. If Claude Code was connected:
grep -q 'loci:start' ~/.claude/CLAUDE.md && echo CLAUDE_CONNECTED

# 5. If Codex was connected:
grep -q 'loci:start' ~/.codex/AGENTS.md && echo CODEX_CONNECTED
```

Optional smoke test (needs Node.js): `node ~/loci/.loci/dashboard/server.js` then open `http://localhost:8765` — a visual dashboard of the brain.

If any check fails, fix it before reporting success. Do not tell the user it worked if it didn't.

## Step 5 — Report back

Tell the user, briefly and in their language:

1. Loci is installed at `~/loci` (or wherever they chose) and which tools got connected.
2. **They should restart their AI session** — the global instruction file is loaded at session start, so the current session doesn't know about the brain yet.
3. After restarting, they can just talk normally. First useful thing to say: introduce themselves or dump what they're working on — the brain fills itself from conversation. Nothing to learn, no commands to memorize.
4. Optional: `node ~/loci/.loci/dashboard/server.js` opens the visual dashboard at `localhost:8765`.

## Safety rules

- Never run `--force` on an existing brain without explicit user confirmation — it overwrites their identity, plan, and task files.
- Never push the brain directory to any git remote. It contains the user's private data.
- Never edit `~/loci/tasks/tasks.json` or `~/loci/tasks/calendar.json` by hand — use `node ~/loci/scripts/loci-task.js` (see the brain's own CLAUDE.md after install).
