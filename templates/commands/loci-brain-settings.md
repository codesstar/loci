Configure your Loci brain's Synapse settings — how your brain stores, processes, and shares information with sub-projects.

Steps:

1. **Check this is a brain**: Look for `.loci/` directory or check if `01-me/identity.md` exists. If not found, tell user: "This doesn't look like a Loci brain. Run this command from your brain directory."

2. **Check existing config**: Read `loci-brain-settings.yml` if it exists. If it does, show current settings and ask what to change. If not, proceed with fresh setup.

3. **Quick mode**: First ask using AskUserQuestion: "How do you want to configure your brain?"
   - **"Auto (recommended)"** — persistence: auto (signal-driven distill + one-line notifications), routing: tag-routed
   - **"Manual"** — persistence: manual (only via `/loci-sync` or explicit request), routing: manual

   If first option: apply auto defaults below, show summary, done.
   If second option: apply manual settings, show summary, done.
   If user wants to tweak individual settings: proceed with step 4.

4. **Enabled** (AskUserQuestion):

   "Enable Loci brain synapse? When disabled, no information is stored or shared."
   - **Yes (default)** — Brain is active
   - **No** — Brain pauses all sync

5. **Persistence** (AskUserQuestion):

   "How should your brain handle storing information?"
   - **Auto (recommended)** — Signal-driven: AI detects when something worth storing comes up (task, decision, insight, personal info) and saves immediately. One-line notification after each save, no interrupting questions. User can say "undo" to reverse. `/loci-sync` also available for manual trigger anytime.
   - **Manual** — No auto-save. Only stores when user explicitly requests or runs `/loci-sync`

6. **Privacy settings** (AskUserQuestion):

   "What information should NEVER be shared with sub-projects?"
   Default blocked: medical, financial details, credentials/passwords
   - User can add more categories
   - User can remove defaults (e.g. "financial is fine to share")
   - Ask: "Any custom privacy rules? (e.g. 'never share relationship details')"

7. **Distillation level** (AskUserQuestion):

   "How much detail should your brain keep when storing information?"
   - **Verbose** — Store everything as-is, no compression
   - **Balanced (recommended)** — Keep conclusions + key context, skip process details
   - **Minimal** — Only store final conclusions and decisions
   - **Custom** — Set different levels per information type

   If Custom: ask for each type (decisions, tasks, journal, casual conversation, technical details)

8. **Routing** (AskUserQuestion):

   "How should your brain tag and share information with sub-projects?"

   This combines signal tagging + dispatch into one setting.

   Mode:
   - **Open** — All info visible to all sub-projects, each project pulls what it needs
   - **Tag-routed (recommended)** — Brain auto-tags info and matches to sub-projects by their declared `interest_tags`
   - **Manual** — You manually decide which info goes to which sub-project every time
   - **Silent** — Brain keeps everything to itself. Sub-projects get nothing unless you explicitly push.

   Auto-tags (always active except in silent mode):
   - urgent — Critical, time-sensitive (sub-projects see immediately)
   - decision — Strategic decisions made
   - fyi — Good to know, not urgent
   - log — Low-priority records

   Ask: "Want to add custom tags? (e.g. 'creative-idea', 'learning')"

   If "Tag-routed": show list of connected sub-projects and their current interest_tags. Ask user to configure which tags route to which sub-projects.
   If "Manual": explain that brain will prompt "Send this to which projects?" after each decision/insight.

   Note: "Regardless of routing mode, privacy rules always apply. Blocked info is never shared."

9. **Retention policy** (AskUserQuestion):

   "How long before unused information gets archived?"
   - **30 days**
   - **90 days (recommended)**
   - **180 days**
   - **Never** — Keep everything active forever

   Note: "Archived information is still searchable, just moved to 08-archive/."

10. **Save config**: Write `loci-brain-settings.yml` in brain root directory:
   ```yaml
   version: 1
   preset: custom  # recommended | ask-first | manual | custom

   enabled: true

   persistence:
     mode: auto  # auto | manual
     # auto mode: signal-driven, AI detects storable info and saves immediately
     # manual mode: only saves on /loci-sync or explicit user request
     notify: true                # show one-line notification after each auto-save

   privacy:
     mode: blocklist
     blocked_tags: [medical, financial, credentials]
     custom_rules: []

   distillation:
     level: balanced  # verbose | balanced | minimal | custom
     overrides: {}    # per-type overrides when level=custom

   routing:
     mode: tag-routed  # open | tag-routed | manual | silent
     auto_tag: true
     tags: [urgent, decision, fyi, log]
     custom_tags: []
     routes: {}  # tag → [sub-project] mapping for tag-routed mode

   retention:
     archive_after_days: 90
     archived_searchable: true
   ```

11. **Summary**: Show what was configured:
   ```
   Brain Synapse settings saved.

   Enabled: yes
   Persistence: auto (signal-driven, one-line notifications)
   Privacy: medical, financial, credentials blocked
   Distillation: balanced
   Routing: tag-routed (urgent, decision, fyi, log)
   Retention: 90 days → archive

   Run /loci-brain-settings anytime to change these.
   ```
