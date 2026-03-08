Connect the current project folder to your Loci brain.

Steps:
1. Read `~/.claude/CLAUDE.md` to find the Loci brain path (look for the "Loci Brain" section)
2. If no brain is registered, tell the user: "No Loci brain found. Run `claude "help me set up my brain"` in your Loci directory first."
3. Get the brain path and the current working directory
4. Ask the user:
   - Project name (default: current folder name)
   - Purpose: [code/content/research/other]
   - Associated department: [engineering/product/research/marketing/none]
   - One-line description
5. In the brain directory:
   - Create symlink: `09-links/<project-name>` → current directory
   - Register in `09-links/registry.md`
6. In the current directory:
   - Create `.loci-link` file containing the brain's absolute path
   - Create `from-hq.md` (for receiving directives from brain)
   - Create `to-hq.md` (for reporting back to brain)
7. Confirm: "Project connected to your Loci brain."
