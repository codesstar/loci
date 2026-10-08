# Getting started

[中文](getting-started.zh-CN.md) · [English README](../README.en.md)

Give your local AI agent this instruction:

```text
Install Loci following https://raw.githubusercontent.com/codesstar/loci/main/docs/AI-INSTALL.md
If a brain already exists, preserve its data and upgrade it. Verify the connection afterward.
```

Node.js 18+ and Git are required; no npm package is needed. Your agent must have file and command tools. The installer connects native instructions for Claude Code, Codex and WorkBuddy; validate loading in a new conversation. Other clients need a verified equivalent entry.

Try: “Use English”, “Add a task to send materials tomorrow at 9”, or “Save this link”. The first memory operation reads the complete `LOCI-RULES.md`; subsequent operations reuse it while valid. Actual records are read only when relevant.

Run `node <brain-path>/.loci/dashboard/server.js` and open `http://localhost:8765` for the Dashboard. Keep the process running. Tasks, schedules and recurring reminders use different data stores; device delivery must be verified separately from saving.

[Installation, upgrades and rollback](AI-INSTALL.md) · [Architecture](architecture.md) · [Full manual](../LOCI-RULES.md)
