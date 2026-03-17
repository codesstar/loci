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
