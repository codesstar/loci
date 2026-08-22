#!/bin/bash
# Loci: Project-level lightweight context injection
# Fires on SessionStart and delegates to the shared startup-map builder.

# Resolve brain path: ~/.loci/brain-path > script's own repo
if [ -f "$HOME/.loci/brain-path" ]; then
  LOCI_ROOT="$(cat "$HOME/.loci/brain-path")"
else
  LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fi
PROJ_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
CONTEXT_SCRIPT="$LOCI_ROOT/scripts/loci-context.sh"
if [ -f "$CONTEXT_SCRIPT" ]; then
  CTX="$(LOCI_PROJECT_DIR="$PROJ_DIR" bash "$CONTEXT_SCRIPT" "$LOCI_ROOT" 2>/dev/null)"
fi
if [ -z "${CTX:-}" ]; then
  CTX="[Loci] Startup map unavailable. Continue without it; do not retry or preload brain files."
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
