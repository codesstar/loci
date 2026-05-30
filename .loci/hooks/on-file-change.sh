#!/bin/bash
# Loci: Post-write hook — records file changes to the machine-readable changelog
# (used by check-updates.sh for cross-terminal sync).
# Note: the human-readable activity ledger (.loci/activity/<YYYY-MM>.md) is
# maintained by the AI directly, not here — so it works in Codex too.
# Triggered by Claude Code PostToolUse hook on Write/Edit operations
# Usage: .loci/hooks/on-file-change.sh "$FILE_PATH"

LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHANGELOG="$LOCI_ROOT/.loci/changelog.log"
TERMINAL_ID="${LOCI_TERMINAL_ID:-terminal-$$}"
TIMESTAMP=$(date +%s)
FILEPATH="${1#$LOCI_ROOT/}"

# Only log changes to key files
case "$FILEPATH" in
  inbox.md|plan.md|.loci/status.yml|tasks/*|me/*|decisions/*|projects/*|people/*|.loci/links/*/to-hq.md|.loci/links/*/from-hq.md|references/*)
    # Machine-readable changelog (cross-terminal sync)
    echo "${TIMESTAMP}|${TERMINAL_ID}|WRITE|${FILEPATH}|" >> "$CHANGELOG"
    ;;
esac
