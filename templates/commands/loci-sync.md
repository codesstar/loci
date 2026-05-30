Sync information between this project and the Loci brain index. Keep full project memory in the project repo.

This command works in both the brain and connected projects. It combines two operations into one: session distillation (persist what was discussed) and lightweight project indexing (only summaries that should matter outside the repo).

Flags:
- `--local` — Only distill and store locally, skip brain index updates
- `--dry-run` — Show what would be stored/synced without executing

Steps:

1. **Detect context**: Check if current directory is a brain (has `.loci/` with `me/identity.md`) or a connected project (has `.loci/memory.md`). If neither, do not introduce a command. Say: "这个项目还没有本地记忆。要不要我帮你在这里留个记忆？" If the user says yes, follow the "Connecting a serious project" rule in the main instructions.

2. **Read config**:
   - Brain: read `.loci/config.yml`
   - Connected project: read `.loci/memory.md` frontmatter to get the brain path
   - If no config found, use defaults (auto mode, balanced distillation, local-first project memory).

---

### If running in a Brain:

3. **Distill (session → files)**:
   a. Review the current conversation for new information worth storing
   b. Apply Distillation settings (verbose/balanced/minimal) to compress
   c. If `--dry-run`: list what would be stored, then stop
   d. Write distilled info to the appropriate brain files (decisions → `decisions/`, tasks → guarded task writer, insights → `me/learned.md`, etc.)

4. **Index update** (skip if `--local`):
   a. If the stored item is a project-level `[insight]` or `[milestone]`, update the relevant one-line entry in `projects/index.md`
   b. Do not copy full project memory into the brain. Read the project repo when detail is needed.
   c. Respect Privacy rules — never index blocked categories

5. **Refresh project indexes**:
   a. Read `projects/index.md`
   b. For any relevant project mentioned in the current conversation, open that repo's `.loci/memory.md`
   c. Do not scan every project automatically unless the user asks

6. **Show summary**:
   ```
   Sync complete.

   Stored: X items (tasks: 2, decisions: 1, insights: 1)
   Indexed: Y project summaries
   Refreshed: Z project dossiers

   [List of stored items with destinations]
   [List of refreshed project sources]
   ```

---

### If running in a Connected Project:

3. **Distill (session → project files)**:
   a. Review the current conversation for new information
   b. Apply local distillation based on the project block in `CLAUDE.md`
   c. If `--dry-run`: list what would be stored/pushed, then stop
   d. **Update** `.loci/memory.md` as the living dossier: Goal / Current State / Next Step are updated in place; Progress Log is append-only.
      Available tags:
      - `[decision]` — architectural or strategic decisions made
      - `[architecture]` — structural choices, patterns, tech stack changes
      - `[insight]` — lessons learned, non-obvious findings
      - `[milestone]` — shipped features, completed phases
      - `[local]` — project-specific context, naming conventions, quirks
      - `[debug]` — tricky bugs and their solutions
      - `[wip]` — work in progress notes, current state of incomplete work
   e. **Decision stream**: Real trade-off decisions go to `.loci/decisions/YYYY-MM-DD-slug.md` using the same four-part decision template as the brain.
   f. **Brain index**: For `[insight]` / `[milestone]` items worth knowing outside this repo, update the one-line entry in the brain's `projects/index.md`. Never copy the full project memory to the brain.
   g. If `--local` flag is set: write only project-local files, skip the brain index.

4. **Refresh from brain** (skip if `--local`):
   a. Read the brain path from `.loci/memory.md` frontmatter
   b. Read only the brain indexes that are relevant to the current task (`plan.md`, `projects/index.md`, people/references when mentioned)
   c. Do not create `to-hq.md`, `from-hq.md`, profiles, or link files

5. **Show summary**:
   ```
   Sync complete.

   Stored locally: X items → .loci/memory.md / .loci/decisions/
   Indexed in brain: Y summaries → projects/index.md
   Refreshed from brain: Z indexes

   [List of stored items with tags]
   [List of indexed summaries]
   [List of refreshed sources]
   ```

---

## Auto-sync behavior (when not triggered manually)

When persistence mode is `auto` (default), the AI performs signal-driven sync automatically during conversation:

1. **Every turn**, AI evaluates whether the current exchange contains storable information (new task, decision, insight, personal info change, etc.)
2. **If yes**: silently distill and write to `.loci/memory.md` / `.loci/decisions/` in connected projects, or the appropriate brain file when inside the brain. For project `[insight]` / `[milestone]` summaries, update the brain's `projects/index.md` one-line index. Output a one-line notification:
   ```
   Got it — noted the pricing decision in this project
   ```
   For local-only entries:
   ```
   Got it — logged the auth fix
   ```
   In the brain:
   ```
   Got it — added task "Buy power adapter"
   Noted — updated the project index
   ```
3. **If no**: do nothing, no notification
4. User can say "undo" / "撤销" to reverse the last auto-save
5. **memory.md grows over time.** Keep the living sections lean and let Progress Log be append-only. Clean manually if needed, or wait for v2.0 auto-compression.

This is signal-driven, not interval-based. 5 turns of chitchat = nothing stored. 1 turn with a major decision = stored immediately.
