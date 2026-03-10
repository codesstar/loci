Configure what this project syncs to your Loci brain.

Steps:

1. **Check connection**: Check for `.loci/link` in current directory. If not found, tell user: "This project is not connected to a brain. Run `/loci-link` first."

2. **Analyze project**: Scan the current directory to detect project type:
   - Check for `package.json` → Node.js/frontend project
   - Check for `requirements.txt` / `pyproject.toml` → Python project
   - Check for `Cargo.toml` → Rust project
   - Check for `go.mod` → Go project
   - Check for `CLAUDE.md` → AI-assisted project
   - Check for common content files (`.md` heavy) → Content/writing project
   - If none match → General project

3. **Check existing config**: Read `.loci/config.json` if it exists. If it does, show current settings and ask what to change. If not, proceed with fresh setup.

4. **Present and collect settings using AskUserQuestion tool**. Do it step by step, one question per category. Use the AskUserQuestion tool for each question so the user gets a clean interactive prompt:

   First, show a brief summary: "Detected: [project type]. Let me walk you through sync settings."

   Then ask each category using AskUserQuestion with clear yes/no or selection options:

   Q0: "Enable Loci sync for this project? When disabled, nothing syncs to or from your brain."
   - **Yes (default)** — Sync is active
   - **No** — Pause all sync for this project

   Q1: "Sync decisions to brain? (e.g. 'chose REST over GraphQL')" → default: yes
   Q2: "Sync milestones? (e.g. 'v1.0 launched')" → default: yes
   Q3: "Sync lessons learned & insights?" → default: yes
   Q4: "Sync code implementation details?" → default: no
   Q5: "Sync architecture changes?" → default: yes (code project) / no (other)
   Q6: "Sync blockers & anomalies?" → default: yes
   Q7: "Want to add more sync items? Describe what else you'd like to sync to your brain. (e.g. 'meeting notes', 'API design changes', 'user feedback'). Say 'no' to skip."
   → If yes: add each item as a new sync category (default ON), save to config alongside the built-in ones
   → User can keep adding. After each one, ask "Anything else?" until they say no.

   Q8: "Any rules about what should NEVER sync? (e.g. 'never sync client names', 'skip internal jokes'). Say 'no' to skip."
   → Save to customExclusions as exclusion rules

   Adjust defaults by project type:
   - **Code project**: Architecture ON, code details OFF, deps OFF
   - **Content project**: Add "Sync topic ideas?" ON, "Sync draft content?" OFF, "Sync publish status?" ON
   - **Research project**: Add "Sync findings?" ON, "Sync raw data?" OFF, "Sync sources?" ON

   Skip questions about environment variables, debug logs, and dependency updates — these should ALWAYS be OFF and never synced. Just mention this at the end: "Note: env variables, secrets, debug logs, and dependency updates are never synced."

5. **Map answers to tag config**: Convert the user's answers into push_tags and local_tags:
   - Items the user wants synced → add corresponding tags to `push_tags`
   - Items the user wants kept local → add corresponding tags to `local_tags`
   - Default push_tags: `["decision", "insight", "milestone", "architecture"]`
   - Default local_tags: `["local", "debug", "wip"]`

6. **Save config**: Write `.loci/config.json` in current directory:
   ```json
   {
     "version": 1,
     "brain": "<path from .loci/link>",
     "department": "<project directory name>",
     "sync": {
       "push_tags": ["decision", "insight", "milestone", "architecture"],
       "local_tags": ["local", "debug", "wip"],
       "auto_push": true
     },
     "memory": {
       "compress_after_lines": 200,
       "compress_after_days": 30
     },
     "customExclusions": ["client names", "internal jokes"]
   }
   ```
   - `brain` path is read from `.loci/link`
   - `department` defaults to the current directory name (user can override in Q0)
   - `push_tags` and `local_tags` are derived from the user's answers in step 5
   - `customExclusions` comes from Q8

7. **Apply rules**: If the project has a CLAUDE.md, append a "Loci Sync" section noting that `.loci/memory.md` is the project's local memory file managed by Loci, and summarizing what tags push to brain vs stay local. If no CLAUDE.md, create a minimal one with just the Loci sync awareness.

8. **Confirm with summary**:
   ```
   Settings saved to .loci/config.json

   Brain: <brain path>
   Department: <department name>
   Auto-push: yes
   Push tags: decision, insight, milestone, architecture
   Local tags: local, debug, wip
   Memory compression: after 200 lines or 30 days
   Custom exclusions: [if any]
   Never synced: env/secrets, debug logs, deps

   You can re-run /loci-settings anytime to change these.
   ```
