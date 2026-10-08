# Getting started

[中文](getting-started.zh-CN.md) · [English README](../README.en.md)

Give your local AI agent this instruction:

```text
Install Loci following https://raw.githubusercontent.com/codesstar/loci/main/docs/AI-INSTALL.md
Reuse an existing brain and preserve its data. Verify the connection afterward.
```

Node.js 18+ and Git are required; no npm package is needed. Your agent must have file and command tools. The installer connects native instructions for Claude Code, Codex and WorkBuddy; validate loading in a new conversation. Doubao Work, Qwen Work and Qoder have also been connected to an existing brain by the maintainer using the AI connection prompt; the agent verifies and configures their native entry. See [validation scope](validation-0.6.1.md).

Try: “Use English”, “Add a task to send materials tomorrow at 9”, or “Save this link”. The first memory operation reads the complete `LOCI-RULES.md`; subsequent operations reuse it while valid. Actual records are read only when relevant.

Say “Open my Loci Dashboard using my existing brain.” Your agent finds the installation and starts the local service. Keep the service running; reminder delivery must be verified separately from saving.

Adding another agent? Send it the connection prompt in the [README](../README.en.md#install-with-your-ai-agent). It finds the existing brain and configures itself.

[Full user guide (中文) →](https://www.tryloci.com/handbook/)

[Installation, upgrades and rollback](AI-INSTALL.md) · [Architecture](architecture.md) · [Full manual](../LOCI-RULES.md)
