Refresh the current project's local Loci memory.

This command updates the project repo's `.loci/memory.md`, `.loci/profile.md`, and `.loci/progress/YYYY-MM.md` according to their roles. Loci aggregates memory; it does not own it, so the brain keeps only a one-line index in `projects/index.md`.

Steps:

1. **Check connection**: Read `.loci/memory.md` in current directory. If not found, offer once at the end of the exchange: "这个项目还没有本地记忆。要不要我帮你在这里留个记忆？" If the user says yes, follow the "Connecting a serious project" rule in the main instructions.

2. **Get brain path** from `.loci/memory.md` frontmatter (`brain: ...`) and locate the brain index at `<brain>/projects/index.md`.

3. **Refresh the local project memory from the repo**:
   - Read identity files (CLAUDE.md, README.md, package.json/pyproject.toml/etc., .git/config, LICENSE)
   - Scan directory skeleton (tree -L 2)
   - Extract structured data deterministically
   - Generate AI one-line summary
   - Never read .env, secrets, node_modules, build outputs, or private credentials

4. **Compare with existing `.loci/memory.md`**:
   - Show what changed (e.g. "Tech stack updated: added Prisma", "Scale changed: medium → large")
   - Preserve user-written Goal / Current State / Now / Next unless the change is clear
   - Append project progress to `.loci/progress/YYYY-MM.md`
   - Put stable attributes in `.loci/profile.md`

5. **Write updated `.loci/memory.md`, `.loci/profile.md`, and `.loci/progress/YYYY-MM.md` as needed**

6. **Update brain index only if needed**: If the one-line essence or status changed, update the project's entry in `projects/index.md`. Do not copy the full project memory into the brain.

7. **Confirm**: Show summary of changes or "Project memory is up to date, no changes detected."

## Flags

- `--all`: Run from brain directory to review projects listed in `projects/index.md`. Only open repos that are relevant or explicitly requested. Shows a summary table at the end.
