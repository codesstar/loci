# Global Install

Use Loci from any terminal directory, not just the brain folder.

## What it does

After global install, opening `claude` in **any folder** gives you:
- Automatic daily context (date, tasks, plan) injected at session start
- AI knows your brain path and saves tasks/decisions/insights there
- No need to `cd` into the brain directory for everyday use

## How it works

Three components:

1. **`~/.loci/brain-path`** — a file containing the absolute path to your brain directory (created during onboarding)
2. **`~/.claude/hooks/loci-context.sh`** — a SessionStart hook that reads the brain path and injects today's plan, active tasks, and yesterday's journal into every Claude session
3. **`~/.claude/CLAUDE.md`** — contains a `<!-- loci:start -->` block that tells Claude about persistence rules, brain path, and cross-project memory
4. **`~/.claude/settings.json`** — registers the global hook

## Install

### Automatic (recommended)

Run onboarding inside your brain directory — global install happens automatically during first-time setup. No extra steps needed.

### Manual

1. **Set brain path:**
   ```bash
   mkdir -p ~/.loci
   echo "/absolute/path/to/your/brain" > ~/.loci/brain-path
   ```

2. **Install the global hook:**
   ```bash
   mkdir -p ~/.claude/hooks
   cp /path/to/loci/templates/../.claude/hooks/loci-context.sh ~/.claude/hooks/loci-context.sh
   chmod +x ~/.claude/hooks/loci-context.sh
   ```
   Or copy from `<brain-dir>/.claude/hooks/loci-context.sh`.

3. **Register the hook in global settings:**

   If `~/.claude/settings.json` doesn't exist, copy `templates/global-settings.json`:
   ```bash
   cp /path/to/loci/templates/global-settings.json ~/.claude/settings.json
   ```

   If it already exists, merge the `SessionStart` hook entry into your existing hooks config.

4. **Add the Loci block to global CLAUDE.md:**

   Copy the content of `templates/global-claude-block.md` and append it to `~/.claude/CLAUDE.md`. Replace `<brain-path>` with your actual brain path.

## Uninstall

1. **Remove the global hook:**
   ```bash
   rm ~/.claude/hooks/loci-context.sh
   ```

2. **Remove the hook registration** from `~/.claude/settings.json`:
   Delete the `SessionStart` entry that references `loci-context.sh`.

3. **Remove the Loci block** from `~/.claude/CLAUDE.md`:
   Delete everything between `<!-- loci:start` and `<!-- loci:end -->`.

4. **Optionally remove brain path:**
   ```bash
   rm ~/.loci/brain-path
   ```

Your brain directory and all its data remain untouched.

## Troubleshooting

- **Hook not firing**: Check that `~/.claude/settings.json` has the SessionStart hook registered and that `loci-context.sh` is executable (`chmod +x`).
- **"No brain configured" message**: `~/.loci/brain-path` is missing. Create it with `echo "/path/to/brain" > ~/.loci/brain-path`.
- **"Brain directory not found"**: The path in `~/.loci/brain-path` points to a directory that doesn't exist. Update the path.
- **Date calculation issues**: The hook uses `date -v-1d` (macOS) with fallback to `date -d yesterday` (Linux). Both should work out of the box.
