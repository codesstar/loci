Configure how this connected project writes local memory and what gets summarized in the Loci brain index.

Steps:

1. **Check connection**: Check for `.loci/memory.md` in current directory. If not found, offer once at the end of the exchange: "这个项目还没有本地记忆。要不要我帮你在这里留个记忆？" If the user says yes, follow the "Connecting a serious project" rule in the main instructions.

2. **Check existing config**: Read `.loci/config.json` if it exists. If it does, show current settings and ask what to change. If not, proceed with fresh setup.

3. **Collect settings using AskUserQuestion tool**. Three questions, one at a time:

   Q1: "Enable Loci project memory for this repo?"
   - **Yes (default)** — Write project memory locally in this repo
   - **No** — Pause project memory updates for this repo

   Q2: "What should be summarized in the brain index? (toggle items)"
   Show defaults and let user toggle:
   - `insight` — lessons learned, non-obvious findings (default: ON)
   - `milestone` — shipped features, completed phases (default: ON)
   - `decision` — only if promoted to brain-level significance (default: OFF)
   - `architecture` — only if it affects other projects (default: OFF)
   User can add custom tags too (e.g. "meeting-notes", "user-feedback").

   Q3: "Any rules about what should NEVER sync? (e.g. 'never sync client names', 'skip internal jokes'). Say 'no' to skip."
   → Free text, optional. Stored as a note in config for the AI to respect.

   Note at the end: "The project's full memory stays in this repo. Env variables, secrets, debug logs, and dependency updates are never summarized into the brain."

4. **Save config**: Write `.loci/config.json` in current directory:
   ```json
   {
     "version": 1,
     "brain": "<path from .loci/memory.md frontmatter>",
     "project_memory": {
       "enabled": true,
       "index_tags": ["insight", "milestone"],
       "local_tags": ["local", "debug", "wip"],
       "auto_index": true
     }
   }
   ```
   - `brain` path is read from `.loci/memory.md` frontmatter
   - `index_tags` and `local_tags` are derived from the user's answers in Q2
   - If user provided exclusion rules in Q3, add `"exclusions": ["..."]` to the config

5. **Apply rules**: If the project has a CLAUDE.md, update the `<!-- loci:project:start v1 -->` block. If no CLAUDE.md exists, create one with `templates/project-claude-block.md`.

6. **Confirm with summary**:
   ```
   Settings saved to .loci/config.json

   Brain: <brain path>
   Local memory: enabled
   Brain index summaries: insight, milestone
   Local tags: local, debug, wip
   Exclusions: [if any]
   Full memory owner: this repo
   Never indexed: env/secrets, debug logs, deps

   You can re-run /loci-settings anytime to change these.
   ```
