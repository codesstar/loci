#!/bin/bash
# Loci: Global lightweight context injection
# Works from ANY directory — reads brain path from ~/.loci/brain-path
# Fires on SessionStart and delegates to the same builder other agents use.

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

# Skip only when the current project is actually configured to run the legacy
# shell hook. Merely shipping the file is not enough: new project settings run
# the Node hook, and no-Node Unix installs still need this global shell fallback.
PROJ_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
if grep -q 'daily-context\.sh' "$PROJ_DIR/.claude/settings.json" 2>/dev/null; then
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

# One source of truth: this hook and non-hook agents receive the same compact
# preferences, routing map, workspace project pointer, and state summary.
CONTEXT_SCRIPT="$LOCI_ROOT/scripts/loci-context.sh"
if [ -f "$CONTEXT_SCRIPT" ]; then
  CTX="$(LOCI_PROJECT_DIR="$PROJ_DIR" bash "$CONTEXT_SCRIPT" "$LOCI_ROOT" 2>/dev/null)"
fi
if [ -z "${CTX:-}" ]; then
  CTX="[Loci] Startup map unavailable. Continue without it; do not retry or preload brain files."
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
