Connect the current project folder to your Loci brain.

Steps:
1. Check if `.loci-link` already exists in the current directory. If yes:
   - Read it to get the brain path
   - Tell the user: "This project is already connected to your Loci brain at [path]."
   - Ask: "Want to reconnect to a different brain, or disconnect?"
   - If disconnect: remove `.loci-link`, `from-hq.md`, `to-hq.md`, and the symlink in the brain's `09-links/`
   - If reconnect: continue with step 4
   - Otherwise: stop here
2. Read `~/.claude/CLAUDE.md` to find the Loci brain path (look for the "Loci Brain" section)
3. If no brain is registered, tell the user: "No Loci brain found. Run `claude "help me set up my brain"` in your Loci directory first."
4. Get the brain path and the current working directory
5. Ask the user:
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
7. **Initial Scan** — automatically scan the project to create a profile for the brain:

   a. **Read identity files** (parallel, skip if not found):
      - `CLAUDE.md` (first 200 lines)
      - `README.md` (first 200 lines)
      - `package.json` / `pyproject.toml` / `Cargo.toml` / `go.mod` (whichever exists)
      - `.git/config` → extract remote URL
      - `LICENSE` → extract license type
      - Check for monorepo markers: `turbo.json`, `nx.json`, `pnpm-workspace.yaml`, `lerna.json`

   b. **Scan directory skeleton**:
      - Run `tree -L 2 -d --noreport -I 'node_modules|.git|dist|build|.next|__pycache__|.venv|venv|target|.gradle'` (truncate to 50 lines)
      - Count total files: `find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/__pycache__/*' -not -path '*/.venv/*' | wc -l`

   c. **Extract structured data** (deterministic, no AI needed):
      - `name`: from package.json/pyproject.toml or folder name
      - `type`: code / docs / content / mixed / empty / unknown
      - `language`: infer from build files
      - `framework`: match against dependency list
      - `scale`: small (<50 files) / medium / large (>1000) / huge (>10000)
      - `monorepo`: true/false + list sub-project names if yes

   d. **AI summary** (only AI step): generate a one-line description (<100 chars) from project name + README first 5 lines + tech stack

   e. **Write profile** to `09-links/<project-name>/profile.md`:
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

   **NEVER read**: `.env`, `.env.*`, `*.pem`, `*.key`, `*.cert`, `credentials.*`, `secrets.*`, `*.sqlite`, `*.db`, or anything inside `node_modules/`, `.git/objects/`, `dist/`, `build/`

   If any identity file is missing, skip it gracefully. If the project is empty, set `type: empty` and write "New project, not yet initialized" as overview. Never fabricate information.

8. Confirm: "Project connected and scanned. Profile saved to `09-links/<name>/profile.md`."
   Show a brief summary of what was detected (type, language, scale).
   Remind: "Run `/loci-settings` to configure what this project syncs to your brain."
