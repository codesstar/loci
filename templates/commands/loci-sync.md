Sync information between this project and the Loci brain. Push local changes out, pull remote updates in.

This command works in both the brain and sub-projects.

Steps:

1. **Detect context**: Check if current directory is a brain (has `.loci/` or `01-me/identity.md`) or a sub-project (has `.loci-link`). If neither, tell user: "This directory is not a Loci brain or connected sub-project. Run `/loci-link` first."

2. **Read config**:
   - Brain: read `loci-brain-settings.yml`
   - Sub-project: read `.loci-config.json` and `.loci-link` (to get brain path)
   - If no config found, tell user to run `/loci-brain-settings` or `/loci-settings` first.

---

### If running in a Brain:

3. **Push (distill + store + route)**:
   a. Review the current conversation for new information worth storing
   b. Apply Distillation settings (verbose/balanced/minimal) to compress
   c. Write distilled info to the appropriate brain files (decisions → `07-decisions/`, tasks → `05-tasks/active.md`, insights → `01-me/learned.md`, etc.)
   d. Apply Routing settings:
      - Auto-tag each item (urgent/decision/fyi/log + custom tags)
      - Based on routing mode:
        - **open**: write to shared info pool, all sub-projects can see
        - **tag-routed**: match tags to sub-project `interest_tags`, write to each matched sub-project's `from-hq.md`
        - **manual**: use AskUserQuestion for each item: "Send this to which projects? [list sub-projects]"
        - **silent**: skip routing entirely
   e. Respect Privacy rules — never route blocked categories
   f. If persistence mode is `smart` with `auto_confirm: false`, use AskUserQuestion to confirm each item before storing

4. **Pull (scan sub-projects)**:
   a. Scan all connected sub-projects (from `09-links/`)
   b. Read each sub-project's `to-hq.md`
   c. Check for new entries (entries not yet marked as `[read]`)
   d. Display new entries grouped by sub-project, highlighting `[urgent]` and `[decision]` tags
   e. Mark displayed entries as `[read]` with today's date

5. **Show summary** using AskUserQuestion:
   ```
   Sync complete.

   Pushed: X items stored, Y items routed to sub-projects
   Pulled: Z new updates from sub-projects

   [List of routed items with destinations]
   [List of pulled items with sources]

   Anything to follow up on?
   ```

---

### If running in a Sub-project:

3. **Push (distill + store local + push to brain)**:
   a. Review the current conversation for new information
   b. Apply local distillation (based on project's sync settings)
   c. Store relevant info locally (project's own notes/docs)
   d. Filter through Sync Items config (`.loci-config.json`):
      - Only push items that match enabled sync categories (decisions, milestones, lessons, etc.)
      - Apply exclusion rules
   e. Write filtered items to this project's `to-hq.md` with appropriate tags
   f. If project is not enabled, skip push entirely

4. **Pull (read from brain)**:
   a. Read brain path from `.loci-link`
   b. Read this project's `from-hq.md`
   c. Check for new entries (entries not yet marked as `[read]`)
   d. Also scan brain's shared info pool for items matching this project's `interest_tags` (if routing mode is open or tag-routed)
   e. Display new entries, highlighting priority
   f. Mark displayed entries as `[read]` with today's date

5. **Show summary** using AskUserQuestion:
   ```
   Sync complete.

   Pushed: X items to brain (via to-hq.md)
   Pulled: Z new updates from brain

   [List of pushed items]
   [List of pulled items]

   Anything to follow up on?
   ```
