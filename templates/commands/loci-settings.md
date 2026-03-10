Configure what this project syncs to your Loci brain.

Steps:

1. **Check connection**: Check for `.loci/link` in current directory. If not found, tell user: "This project is not connected to a brain. Run `/loci-link` first."

2. **Check existing config**: Read `.loci/config.json` if it exists. If it does, show current settings and ask what to change. If not, proceed with fresh setup.

3. **Collect settings using AskUserQuestion tool**. Three questions, one at a time:

   Q1: "Enable Loci sync for this project? When enabled, important decisions and insights are automatically pushed to your brain."
   - **Yes (default)** — Sync is active
   - **No** — Pause all sync for this project

   Q2: "What should be pushed to your brain? (toggle items)"
   Show defaults and let user toggle:
   - `decision` — architectural or strategic choices (default: ON)
   - `insight` — lessons learned, non-obvious findings (default: ON)
   - `milestone` — shipped features, completed phases (default: ON)
   - `architecture` — system design, tech stack changes (default: ON)
   User can add custom tags too (e.g. "meeting-notes", "user-feedback").

   Q3: "Any rules about what should NEVER sync? (e.g. 'never sync client names', 'skip internal jokes'). Say 'no' to skip."
   → Free text, optional. Stored as a note in config for the AI to respect.

   Note at the end: "Env variables, secrets, debug logs, and dependency updates are never synced."

4. **Save config**: Write `.loci/config.json` in current directory:
   ```json
   {
     "version": 1,
     "brain": "<path from .loci/link>",
     "sync": {
       "push_tags": ["decision", "insight", "milestone", "architecture"],
       "local_tags": ["local", "debug", "wip"],
       "auto_push": true
     }
   }
   ```
   - `brain` path is read from `.loci/link`
   - `push_tags` and `local_tags` are derived from the user's answers in Q2
   - If user provided exclusion rules in Q3, add `"exclusions": ["..."]` to the config

5. **Apply rules**: If the project has a CLAUDE.md, append a "Loci Sync" section noting that `.loci/memory.md` is the project's local memory file managed by Loci, and summarizing what tags push to brain vs stay local. If no CLAUDE.md, create a minimal one with just the Loci sync awareness.

6. **Confirm with summary**:
   ```
   Settings saved to .loci/config.json

   Brain: <brain path>
   Auto-push: yes
   Push tags: decision, insight, milestone, architecture
   Local tags: local, debug, wip
   Exclusions: [if any]
   Never synced: env/secrets, debug logs, deps

   You can re-run /loci-settings anytime to change these.
   ```
