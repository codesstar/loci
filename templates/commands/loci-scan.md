Re-scan the current project and update its profile in the Loci brain.

This command re-runs the initial scan that `/loci-link` performs, updating the project's `profile.md` with current information.

Steps:

1. **Check connection**: Read `.loci-link` in current directory. If not found, tell user: "This project is not connected to a brain. Run `/loci-link` first."

2. **Get brain path** from `.loci-link` and derive the profile path: `<brain>/.loci/links/<project-name>/profile.md`

3. **Run the same scan as `/loci-link` step 7**:
   - Read identity files (CLAUDE.md, README.md, package.json/pyproject.toml/etc., .git/config, LICENSE)
   - Scan directory skeleton (tree -L 2)
   - Extract structured data deterministically
   - Generate AI one-line summary
   - All the same blacklist rules apply (never read .env, secrets, node_modules, etc.)

4. **Compare with existing profile** (if it exists):
   - Show what changed (e.g. "Tech stack updated: added Prisma", "Scale changed: medium → large")
   - Preserve user-edited fields: "Role" and "Related goals" under "Relationship to Brain" are never overwritten
   - Append to Scan Log: "YYYY-MM-DD: Re-scanned, [summary of changes]"

5. **Write updated profile.md**

6. **Confirm**: Show summary of changes or "Profile is up to date, no changes detected."

## Flags

- `--all`: Run from brain directory to re-scan ALL connected sub-projects. Reads `.loci/links/registry.md`, iterates through each linked project, updates each profile.md. Shows a summary table at the end.
