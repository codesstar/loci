#!/bin/bash
# Loci: Daily context injection
# Fires on SessionStart — gives the AI today's essential context
# Hook injects DYNAMIC daily content; CLAUDE.md handles static rules + plan.md
# Zero dependencies, just reads markdown files

# Resolve brain path: ~/.loci/brain-path > script's own repo
if [ -f "$HOME/.loci/brain-path" ]; then
  LOCI_ROOT="$(cat "$HOME/.loci/brain-path")"
else
  LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fi
TODAY=$(date "+%Y-%m-%d")
YESTERDAY=$(date -v-1d "+%Y-%m-%d" 2>/dev/null || date -d "yesterday" "+%Y-%m-%d")
DAY_OF_WEEK=$(date "+%A")

CTX="[Loci] Date: ${TODAY} (${DAY_OF_WEEK})"
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

# 3. Yesterday's journal (conditional — only if exists)
JOURNAL="$LOCI_ROOT/tasks/journal/${YESTERDAY}.md"
if [ -f "$JOURNAL" ]; then
  CTX+="## Yesterday's Journal"$'\n'
  CTX+="$(cat "$JOURNAL")"$'\n'
fi

# Output JSON for Claude Code hook system
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
