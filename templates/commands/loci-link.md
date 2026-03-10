Connect a project folder to your Loci brain. Works from either the brain or a sub-project.

Steps:

**Step 0 — Detect context:**
- Check if the current directory IS the brain (contains `CLAUDE.md` with "Loci" AND has `.loci/links/` directory)
- If YES → go to **Brain Mode** below
- If NO → go to **Project Mode** (step 1)

---

### Brain Mode (running `/loci-link` from the brain directory)

The user is in their brain and wants to connect a project. **Use AskUserQuestion** to ask:

- Question 1: "Enter the project path to connect (or type 'skip' to see alternative)" (header: "Project Path", let user type)

If the user provides a valid path, verify it exists, then proceed to step 4 below (using the provided path instead of `cwd`).
If the user types "skip" or the path doesn't exist, suggest: "Go to your project folder and run `/loci-link` there."

---

### Project Mode (running `/loci-link` from a sub-project)

1. Check if `.loci/link` already exists in the current directory. If yes:
   - Read it to get the brain path
   - Tell the user: "This project is already connected to your Loci brain at [path]."
   - Ask: "Want to reconnect to a different brain, or disconnect?"
   - If disconnect: remove the `.loci/` directory and the symlink in the brain's `.loci/links/`
   - If reconnect: continue with step 4
   - Otherwise: stop here
2. Read `~/.claude/CLAUDE.md` to find the Loci brain path (look for the "Loci Brain" section)
3. If no brain is registered, tell the user: "No Loci brain found. Run `claude "help me set up my brain"` in your Loci directory first."
4. Get the brain path and the project directory
5. **Use AskUserQuestion** to collect project info in one form (user can tab through fields):
   - Question 1: "Project name" (header: "Name", default: current folder name, let user type)
   - Question 2: "One-line description" (header: "Description", let user type)
5. In the brain directory:
   - Create symlink: `.loci/links/<project-name>` → current directory
   - Register in `.loci/links/registry.md`
6. In the current directory, create the `.loci/` directory with the following files:

   - **`.loci/link`** — contains only the brain's absolute path (one line)
   - **`.loci/from-hq.md`** — for receiving directives from brain
   - **`.loci/to-hq.md`** — for reporting back to brain
   - **`.loci/memory.md`** — project-local memory:
     ```markdown
     # Project: <name>
     > <one-line description>
     > Brain: <brain-path>

     ## Active

     ## Archive
     ```
   - **`.loci/config.json`** — project configuration:
     ```json
     {
       "version": 1,
       "brain": "<brain-path>",
       "sync": {
         "push_tags": ["decision", "insight", "milestone", "architecture"],
         "local_tags": ["local", "debug", "wip"],
         "auto_push": true
       }
     }
     ```

7. **Add `.loci/` to `.gitignore`** — if the project has a `.gitignore`, append `.loci/` to it (if not already present). If there is no `.gitignore`, create one containing `.loci/`.

8. **Initial Scan** — automatically scan the project to create a profile for the brain:

   a. **Read identity files** (parallel, skip if not found):
      - `CLAUDE.md` (first 200 lines)
      - `README.md` (first 200 lines)
      - `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` (whichever exists)
      - `.git/config` → extract remote URL
      - `LICENSE` → extract license type
      - Check for monorepo markers: `turbo.json`, `nx.json`, `pnpm-workspace.yaml`, `lerna.json`

   b. **Scan directory skeleton**:
      - Run `tree -L 2 -d --noreport -I 'node_modules|.git|dist|build|.next|__pycache__|.venv|venv|target|.gradle|.loci'` (truncate to 50 lines)
      - Count total files: `find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/__pycache__/*' -not -path '*/.venv/*' -not -path '*/.loci/*' | wc -l`

   c. **Extract structured data** (deterministic, no AI needed):
      - `name`: from package.json/pyproject.toml or folder name
      - `type`: code / docs / content / mixed / empty / unknown
      - `language`: infer from build files
      - `framework`: match against dependency list
      - `scale`: small (<50 files) / medium / large (>1000) / huge (>10000)
      - `monorepo`: true/false + list sub-project names if yes

   d. **AI summary** (only AI step): generate a one-line description (<100 chars) from project name + README first 5 lines + tech stack

   e. **Write profile** to `.loci/links/<project-name>/profile.md`:
      ```markdown
      ---
      name: <project name>
      type: <code|docs|content|mixed|empty|unknown>
      language: <primary language>
      framework: <primary framework, optional>
      scale: <small|medium|large|huge>
      monorepo: <true|false>
      remote: <git remote URL, optional>
      license: <license type, optional>
      linked: <today's date>
      last_scanned: <today's date>
      status: active
      ---

      # <Project Name>

      ## Overview
      <AI-generated one-line description>

      ## Tech Stack
      - Language: xxx
      - Framework: xxx
      - Key dependencies: a, b, c (max 20)
      - Build tool: xxx

      ## Project Structure
      <tree output, truncated to 50 lines>
      Total files: ~xxx

      ## Relationship to Brain
      - Role: <to be filled by user>
      - Related goals: <to be filled by user>

      ## Scan Log
      - YYYY-MM-DD: Initial scan, auto-generated
      ```

   **NEVER read**: `.env`, `.env.*`, `*.pem`, `*.key`, `*.cert`, `credentials.*`, `secrets.*`, `*.sqlite`, `*.db`, or anything inside `node_modules/`, `.git/objects/`, `dist/`, `build/`, `.loci/`

   If any identity file is missing, skip it gracefully. If the project is empty, set `type: empty` and write "New project, not yet initialized" as overview. Never fabricate information.

9. Confirm: "Project connected and scanned. Profile saved to `.loci/links/<name>/profile.md`."
   Show a brief summary of what was detected (type, language, scale).
   Remind: "Run `/loci-settings` to configure what this project syncs to your brain."
