#!/bin/bash
# Loci: Global daily context injection
# Works from ANY directory — reads brain path from ~/.loci/brain-path
# Fires on SessionStart — gives the AI today's essential context
# Zero dependencies, just reads markdown files

# --- Resolve brain path ---
BRAIN_PATH_FILE="$HOME/.loci/brain-path"
if [ ! -f "$BRAIN_PATH_FILE" ]; then
  # No brain configured — skip silently
  cat << 'EOF'
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "[Loci] No brain configured. Run onboarding in your brain directory first."
  }
}
EOF
  exit 0
fi

LOCI_ROOT="$(cat "$BRAIN_PATH_FILE")"

# Skip when the current project ships its own Loci context hook —
# that hook injects the same context; running both would double it.
PROJ_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
if [ -f "$PROJ_DIR/.claude/hooks/daily-context.sh" ]; then
  printf '{ "continue": true }\n'
  exit 0
fi

# Verify brain directory exists
if [ ! -d "$LOCI_ROOT" ]; then
  cat << 'EOF'
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "[Loci] Brain directory not found. Check ~/.loci/brain-path."
  }
}
EOF
  exit 0
fi

# --- Date calculation (macOS + Linux compatible) ---
TODAY=$(date "+%Y-%m-%d")
YESTERDAY=$(date -v-1d "+%Y-%m-%d" 2>/dev/null || date -d "yesterday" "+%Y-%m-%d")
DAY_OF_WEEK=$(date "+%A")

CTX="[Loci] Date: ${TODAY} (${DAY_OF_WEEK})"
CTX+=$'\n'"Brain: ${LOCI_ROOT}"
CTX+=$'\n\n'

# 0. User preferences — standing instructions the AI must honor in EVERY reply.
#    Injected here (not just referenced from CLAUDE.md) so compliance never
#    depends on the model choosing to read the file. Skipped while still a template.
PREFS="$LOCI_ROOT/me/preferences.md"
if [ -f "$PREFS" ] && ! grep -q "^status: template" "$PREFS"; then
  PREFS_BODY="$(awk 'BEGIN{fm=0} NR==1&&/^---[[:space:]]*$/{fm=1;next} fm&&/^---[[:space:]]*$/{fm=0;next} !fm{print}' "$PREFS")"
  if [ -n "$(printf '%s' "$PREFS_BODY" | tr -d '[:space:]')" ]; then
    CTX+="## User Preferences (standing instructions — EVERY reply must comply, including the first)"$'\n'
    CTX+="$PREFS_BODY"$'\n\n'
  fi
fi

# 1. Today's daily plan
DAILY="$LOCI_ROOT/tasks/daily/${TODAY}.md"
if [ -f "$DAILY" ]; then
  CTX+="## Today's Plan"$'\n'
  CTX+="$(cat "$DAILY")"$'\n\n'
else
  CTX+="## Today's Plan"$'\n'
  CTX+="No plan for today yet."$'\n\n'
fi

# 2. Active tasks (first 30 lines — Focus + Queue)
if [ -f "$LOCI_ROOT/tasks/active.md" ]; then
  CTX+="## Active Tasks"$'\n'
  CTX+="$(head -30 "$LOCI_ROOT/tasks/active.md")"$'\n\n'
fi

# 3. Yesterday's journal (only if exists)
JOURNAL="$LOCI_ROOT/tasks/journal/${YESTERDAY}.md"
if [ -f "$JOURNAL" ]; then
  CTX+="## Yesterday's Journal"$'\n'
  CTX+="$(cat "$JOURNAL")"$'\n'
fi

# 4. Inbox (latest 7 items)
if [ -f "$LOCI_ROOT/inbox.md" ]; then
  INBOX_ITEMS=$(tail -14 "$LOCI_ROOT/inbox.md" 2>/dev/null)
  if [ -n "$INBOX_ITEMS" ]; then
    CTX+=$'\n'"## Recent Inbox"$'\n'
    CTX+="${INBOX_ITEMS}"$'\n'
  fi
fi

# --- Output JSON for Claude Code hook system ---
ESCAPED=$(printf '%s' "$CTX" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null)

if [ -z "$ESCAPED" ]; then
  ESCAPED=$(printf '%s' "$CTX" | awk '{gsub(/\\/,"\\\\"); gsub(/"/,"\\\""); gsub(/\t/,"\\t"); printf "%s\\n", $0}')
  ESCAPED="\"${ESCAPED}\""
fi

cat << EOF
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": ${ESCAPED}
  }
}
EOF
