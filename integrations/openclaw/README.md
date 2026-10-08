# Loci for OpenClaw

This is a thin entry adapter for an OpenClaw environment with local file and command tools. It uses the same Loci brain and operation manual as other agents.

1. Ask the agent to follow [the AI installation guide](../../docs/AI-INSTALL.md). Use `--connect none` when only this adapter is needed.
2. Install [skill/SKILL.md](skill/SKILL.md) in the skill location actually supported by the current OpenClaw environment.
3. In a new conversation, verify that it resolves `~/.loci/brain-path`, reads `LOCI.md`, and reads `LOCI-RULES.md` before the first memory operation.

Installing a skill file alone does not prove it has been loaded. This adapter does not create a separate rulebook, data store or onboarding process.
