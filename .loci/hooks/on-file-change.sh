#!/bin/bash
# Loci: Post-write hook — records file changes to shared changelog
# Triggered by Claude Code PostToolUse hook on Write/Edit operations
# Usage: .loci/hooks/on-file-change.sh "$FILE_PATH"

LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHANGELOG="$LOCI_ROOT/.loci/changelog.log"
TERMINAL_ID="${LOCI_TERMINAL_ID:-terminal-$$}"
TIMESTAMP=$(date +%s)
FILEPATH="${1#$LOCI_ROOT/}"

# Only log changes to key files
case "$FILEPATH" in
  inbox.md|plan.md|status.yml|05-tasks/*|03-planning/daily/*|01-me/*|09-links/*/to-hq.md|09-links/*/from-hq.md)
    echo "${TIMESTAMP}|${TERMINAL_ID}|WRITE|${FILEPATH}|" >> "$CHANGELOG"
    ;;
esac
