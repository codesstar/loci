#!/bin/bash
# Loci: Daily context injection
# Fires on SessionStart — gives the AI today's essential context
# Hook injects DYNAMIC daily content; CLAUDE.md handles static rules + plan.md
# Zero dependencies, just reads markdown files

LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TODAY=$(date "+%Y-%m-%d")
YESTERDAY=$(date -v-1d "+%Y-%m-%d" 2>/dev/null || date -d "yesterday" "+%Y-%m-%d")
DAY_OF_WEEK=$(date "+%A")

CTX="[Loci] Date: ${TODAY} (${DAY_OF_WEEK})"
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
