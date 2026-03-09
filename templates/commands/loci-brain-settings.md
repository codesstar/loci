Configure your Loci brain's Synapse settings — how your brain stores, processes, and shares information with sub-projects.

Steps:

1. **Check this is a brain**: Look for `.loci/` directory or check if `01-me/identity.md` exists. If not found, tell user: "This doesn't look like a Loci brain. Run this command from your brain directory."

2. **Check existing config**: Read `loci-brain-settings.yml` if it exists. If it does, show current settings and ask what to change. If not, proceed with fresh setup.

3. **Quick mode**: First ask using AskUserQuestion: "How do you want to configure your brain?"
   - **Default (recommended)** — Smart defaults, covers 80% of needs
   - **Everything** — Store everything, share everything, no filtering
   - **Custom** — Configure each setting individually

   If "Default": apply defaults below, show summary, done.
   If "Everything": set all to maximum/open, show summary, done.
   If "Custom": proceed with step 4.

4. **Privacy settings** (AskUserQuestion for each):

   "What information should NEVER be shared with sub-projects?"
   Default blocked: medical, financial details, credentials/passwords
   - User can add more categories
   - User can remove defaults (e.g. "financial is fine to share")
   - Ask: "Any custom privacy rules? (e.g. 'never share relationship details')"

5. **Distillation level** (AskUserQuestion):

   "How much detail should your brain keep when storing information?"
   - **Verbose** — Store everything as-is, no compression
   - **Balanced (recommended)** — Keep conclusions + key context, skip process details
   - **Minimal** — Only store final conclusions and decisions
   - **Custom** — Set different levels per information type

   If Custom: ask for each type (decisions, tasks, journal, casual conversation, technical details)

6. **Signal tagging** (AskUserQuestion):

   "Your brain auto-tags information by priority. Sub-projects subscribe to tags they care about."
   - urgent — Critical, time-sensitive (sub-projects see immediately)
   - decision — Strategic decisions made
   - fyi — Good to know, not urgent
   - log — Low-priority records

   Ask: "Want to add custom signal tags? (e.g. 'creative-idea', 'learning')"

7. **Dispatch mode** (AskUserQuestion):

   "How should your brain share information with sub-projects?"
   - **Open (recommended)** — All info visible to all sub-projects, each project pulls what it needs based on its own tags/settings
   - **Tag-routed** — Brain auto-matches info to sub-projects by tags. Sub-projects only see info matching their declared `interest_tags`
   - **Manual** — You manually decide which info goes to which sub-project. Brain asks you every time.
   - **Silent** — Brain keeps everything to itself. Sub-projects get nothing unless you explicitly push.

   If "Tag-routed": show list of connected sub-projects and their current interest_tags. Ask if user wants to adjust any.
   If "Manual": explain that brain will prompt "Send this to which projects?" after each decision/insight.

   Note: "Regardless of dispatch mode, privacy rules always apply. Blocked info is never shared."

8. **Retention policy** (AskUserQuestion):

   "How long before unused information gets archived?"
   - **30 days**
   - **90 days (recommended)**
   - **180 days**
   - **Never** — Keep everything active forever

   Note: "Archived information is still searchable, just moved to 08-archive/."

8. **Save config**: Write `loci-brain-settings.yml` in brain root directory:
   ```yaml
   version: 1
   preset: custom  # default | everything | custom

   privacy:
     mode: blocklist
     blocked_tags: [medical, financial, credentials]
     custom_rules: []

   distillation:
     level: balanced  # verbose | balanced | minimal | custom
     overrides: {}    # per-type overrides when level=custom

   signals:
     auto_tag: true
     levels: [urgent, decision, fyi, log]
     custom_tags: []

   dispatch:
     mode: open  # open | tag-routed | manual | silent

   retention:
     archive_after_days: 90
     archived_searchable: true
   ```

9. **Summary**: Show what was configured:
   ```
   ✅ Brain Synapse settings saved.

   Privacy: medical, financial, credentials blocked
   Distillation: balanced
   Signal tags: urgent, decision, fyi, log
   Dispatch: open (all sub-projects can pull what they need)
   Retention: 90 days → archive

   Run /loci-brain-settings anytime to change these.
   ```
