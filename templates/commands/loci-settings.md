Configure what this project syncs to your Loci brain.

Steps:

1. **Check connection**: Read `.loci-link` in current directory. If not found, tell user: "This project is not connected to a brain. Run `/loci-link` first."

2. **Analyze project**: Scan the current directory to detect project type:
   - Check for `package.json` → Node.js/frontend project
   - Check for `requirements.txt` / `pyproject.toml` → Python project
   - Check for `Cargo.toml` → Rust project
   - Check for `go.mod` → Go project
   - Check for `CLAUDE.md` → AI-assisted project
   - Check for common content files (`.md` heavy) → Content/writing project
   - If none match → General project

3. **Check existing config**: Read `.loci-config.json` if it exists. If it does, show current settings and ask what to change. If not, proceed with fresh setup.

4. **Present sync settings** in ONE message, with recommended defaults based on project type. Use this format:

   ```
   Project detected: [type]

   What should sync to your brain?

   1. [ON]  Decisions (e.g. "chose REST over GraphQL")
   2. [ON]  Milestones (e.g. "v1.0 launched")
   3. [ON]  Lessons learned / insights
   4. [OFF] Code implementation details
   5. [OFF] Environment variables & secrets
   6. [OFF] Debug logs & error traces
   7. [ON]  Architecture changes
   8. [OFF] Dependency updates
   9. [ON]  Blockers & anomalies

   Reply with numbers to toggle, or "ok" to confirm.
   ```

   Adjust defaults by project type:
   - **Code project**: Architecture ON, code details OFF, deps OFF
   - **Content project**: Topics ON, drafts OFF, publish status ON
   - **Research project**: Findings ON, raw data OFF, sources ON
   - **General**: Decisions ON, details OFF

5. **Let user toggle**: User replies with numbers (e.g. "4 6" to toggle items 4 and 6). Show updated list. Repeat until user says "ok".

6. **Save config**: Write `.loci-config.json` in current directory:
   ```json
   {
     "projectType": "detected type",
     "sync": {
       "decisions": true,
       "milestones": true,
       "lessons": true,
       "codeDetails": false,
       "envSecrets": false,
       "debugLogs": false,
       "architecture": true,
       "dependencies": false,
       "blockers": true
     },
     "customRules": []
   }
   ```

7. **Apply rules**: If the project has a CLAUDE.md, append a "Loci Sync Rules" section summarizing what to sync and what not to sync. If no CLAUDE.md, create a minimal one with just the sync rules.

8. **Confirm**: "Settings saved. Your brain will now sync [ON items] from this project, and skip [OFF items]."

9. **Custom rules**: After confirming, ask: "Any custom rules? (e.g. 'never sync client names', 'always sync API design decisions'). Say 'no' to skip." If yes, add to `customRules` array and update CLAUDE.md.
