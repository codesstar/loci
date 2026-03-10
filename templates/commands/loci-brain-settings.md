Configure your Loci brain's persistence settings.

Steps:

1. **Check this is a brain**: Look for `.loci/` directory or check if `me/identity.md` exists. If not found, tell user: "This doesn't look like a Loci brain. Run this command from your brain directory."

2. **Check existing config**: Read `.loci/config.yml` if it exists. If it does, show current settings and ask what to change. If not, proceed with fresh setup.

3. **Persistence mode** (AskUserQuestion):

   "How should your brain handle storing information?"
   - **Auto (recommended)** — Signal-driven: AI detects when something worth storing comes up (task, decision, insight, personal info) and saves immediately. One-line notification after each save, no interrupting questions. User can say "undo" to reverse. `/loci-sync` also available for manual trigger anytime.
   - **Manual** — No auto-save. Only stores when user explicitly requests or runs `/loci-sync`

4. **Notifications** (AskUserQuestion, only if Auto was chosen):

   "Show a one-line notification after each auto-save?"
   - **Yes (default)** — e.g. `[Loci] Stored: new task "Buy adapter" → active.md`
   - **No** — Silent saves, no notifications

5. **Save config**: Write `.loci/config.yml` in brain directory:
   ```yaml
   version: 1
   persistence:
     mode: auto    # auto | manual
     notify: true  # show one-line notification after each save
   ```

6. **Summary**: Show what was configured:
   ```
   Brain settings saved.

   Persistence: auto (signal-driven, one-line notifications)

   Run /loci-brain-settings anytime to change these.
   ```
