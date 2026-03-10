Sync information between this project and the Loci brain. Push local changes out, pull remote updates in.

This command works in both the brain and sub-projects. It combines two operations into one: session distillation (persist what was discussed) and cross-project sync (route info to relevant projects).

Flags:
- `--local` — Only distill and store locally, skip cross-project sync
- `--dry-run` — Show what would be stored/synced without executing

Steps:

1. **Detect context**: Check if current directory is a brain (has `.loci/` with `me/identity.md`) or a sub-project (has `.loci/link`). If neither, tell user: "This directory is not a Loci brain or connected sub-project. Run `/loci-link` first."

2. **Read config**:
   - Brain: read `.loci/config.yml`
   - Sub-project: read `.loci/config.json` and `.loci/link` (to get brain path)
   - If no config found, use defaults (auto mode, balanced distillation, tag-routed).

---

### If running in a Brain:

3. **Distill (session → files)**:
   a. Review the current conversation for new information worth storing
   b. Apply Distillation settings (verbose/balanced/minimal) to compress
   c. If `--dry-run`: list what would be stored, then stop
   d. Write distilled info to the appropriate brain files (decisions → `decisions/`, tasks → `tasks/active.md`, insights → `me/learned.md`, etc.)

4. **Sync (brain → sub-projects)** (skip if `--local`):
   a. Auto-tag each stored item (urgent/decision/fyi/log + custom tags)
   b. Based on routing mode:
      - **open**: write to shared info pool, all sub-projects can see
      - **tag-routed**: match tags to sub-project `interest_tags`, write to each matched sub-project's `from-hq.md`
      - **manual**: ask user "Send this to which projects?" for each item
      - **silent**: skip routing entirely
   c. Respect Privacy rules — never route blocked categories

5. **Pull (scan sub-projects)**:
   a. Scan all connected sub-projects (from `.loci/links/`)
   b. Read each sub-project's `.loci/to-hq.md`
   c. Check for new entries (entries not yet marked as `[read]`)
   d. Display new entries grouped by sub-project, highlighting `[urgent]` and `[decision]` tags
   e. Mark displayed entries as `[read]` with today's date

6. **Show summary**:
   ```
   Sync complete.

   Stored: X items (tasks: 2, decisions: 1, insights: 1)
   Routed: Y items to sub-projects
   Pulled: Z new updates from sub-projects

   [List of stored items with destinations]
   [List of pulled items with sources]
   ```

---

### If running in a Sub-project:

3. **Distill (session → memory.md + to-hq.md)**:
   a. Review the current conversation for new information
   b. Apply local distillation (based on project's sync settings in `.loci/config.json`)
   c. If `--dry-run`: list what would be stored/pushed, then stop
   d. **Append** new knowledge to `.loci/memory.md`, one entry per line, format:
      ```
      [tag] YYYY-MM-DD content
      ```
      Available tags:
      - `[decision]` — architectural or strategic decisions made
      - `[architecture]` — structural choices, patterns, tech stack changes
      - `[insight]` — lessons learned, non-obvious findings
      - `[milestone]` — shipped features, completed phases
      - `[local]` — project-specific context, naming conventions, quirks
      - `[debug]` — tricky bugs and their solutions
      - `[wip]` — work in progress notes, current state of incomplete work
   e. **Immediate push**: For each new entry, check if its tag appears in `sync.push_tags` from `.loci/config.json`. If yes, write the entry to **both** `.loci/memory.md` and `.loci/to-hq.md` simultaneously. No batching, no waiting for session end.
   f. Entries whose tag appears in `sync.local_tags` are written to `memory.md` only — they are never pushed to `to-hq.md`.
   g. If `--local` flag is set: write everything to `memory.md` only, skip `to-hq.md` regardless of tags.

4. **Pull (read from brain)** (skip if `--local`):
   a. Read brain path from `.loci/link`
   b. Read this project's `from-hq.md`
   c. Check for new entries (entries not yet marked as `[read]`)
   d. Also scan brain's shared info pool for items matching this project's `interest_tags` (if routing mode is open or tag-routed)
   e. Display new entries, highlighting priority
   f. Mark displayed entries as `[read]` with today's date

5. **Show summary**:
   ```
   Sync complete.

   Stored locally: X items → memory.md
   Pushed to brain: Y items (via to-hq.md)
   Pulled from brain: Z new updates

   [List of stored items with tags]
   [List of pushed items]
   [List of pulled items]
   ```

---

## Auto-sync behavior (when not triggered manually)

When persistence mode is `auto` (default), the AI performs signal-driven sync automatically during conversation:

1. **Every turn**, AI evaluates whether the current exchange contains storable information (new task, decision, insight, personal info change, etc.)
2. **If yes**: silently distill and **append** to `.loci/memory.md` (in sub-projects) or the appropriate brain file. If the tag matches `push_tags`, **immediately** write to both `memory.md` and `to-hq.md` in the same operation. Output a one-line notification:
   ```
   [Loci] Stored: [decision] 2026-03-11 Loci pricing set to $49 → memory.md + to-hq.md
   ```
   For local-only entries:
   ```
   [Loci] Stored: [debug] 2026-03-11 Fixed race condition in auth flow → memory.md
   ```
   In the brain:
   ```
   [Loci] Stored: new task "Buy power adapter" → active.md
   [Loci] Synced: decision "Loci pricing $49" → from-hq.md (cyc, ai-resume)
   ```
3. **If no**: do nothing, no notification
4. User can say "undo" / "撤销" to reverse the last auto-save
5. **memory.md grows over time.** Clean manually if needed, or wait for v2.0 auto-compression.

This is signal-driven, not interval-based. 5 turns of chitchat = nothing stored. 1 turn with a major decision = stored immediately.
