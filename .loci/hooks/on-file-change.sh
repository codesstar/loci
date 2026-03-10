#!/bin/bash
# Loci: Post-write hook — records file changes to changelog + activity log
# Triggered by Claude Code PostToolUse hook on Write/Edit operations
# Usage: .loci/hooks/on-file-change.sh "$FILE_PATH"

LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHANGELOG="$LOCI_ROOT/.loci/changelog.log"
ACTIVITY_LOG="$LOCI_ROOT/.loci/activity-log.md"
TERMINAL_ID="${LOCI_TERMINAL_ID:-terminal-$$}"
TIMESTAMP=$(date +%s)
HUMAN_TIME=$(date "+%H:%M")
TODAY=$(date "+%Y-%m-%d")
FILEPATH="${1#$LOCI_ROOT/}"

# Skip logging activity-log.md itself
[ "$FILEPATH" = ".loci/activity-log.md" ] && exit 0

# Only log changes to key files
case "$FILEPATH" in
  inbox.md|plan.md|.loci/status.yml|.loci/activity-log.md|tasks/*|me/*|decisions/*|.loci/links/*/to-hq.md|.loci/links/*/from-hq.md|references/*)
    # Machine-readable changelog
    echo "${TIMESTAMP}|${TERMINAL_ID}|WRITE|${FILEPATH}|" >> "$CHANGELOG"

    # Human-readable activity log
    # Add today's heading if not present
    if ! grep -q "^## ${TODAY}$" "$ACTIVITY_LOG" 2>/dev/null; then
      echo "" >> "$ACTIVITY_LOG"
      echo "## ${TODAY}" >> "$ACTIVITY_LOG"
      echo "" >> "$ACTIVITY_LOG"
    fi

    # Append entry
    echo "- ${HUMAN_TIME} \`write\` ${FILEPATH}" >> "$ACTIVITY_LOG"
    ;;
esac
