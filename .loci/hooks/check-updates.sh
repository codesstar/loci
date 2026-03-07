#!/bin/bash
# Loci: Startup hook — shows cross-terminal changes since last session
# Run at conversation start or when user triggers /sync

LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHANGELOG="$LOCI_ROOT/.loci/changelog.log"
TERMINAL_ID="${LOCI_TERMINAL_ID:-terminal-$$}"
LAST_CHECK="$LOCI_ROOT/.loci/last-check-${TERMINAL_ID}"

if [ ! -f "$CHANGELOG" ]; then
    echo "No cross-terminal updates yet."
    exit 0
fi

if [ -f "$LAST_CHECK" ]; then
    SINCE=$(cat "$LAST_CHECK")
else
    SINCE=0
fi

# Filter for other terminals' changes since last check
UPDATES=$(awk -F'|' -v since="$SINCE" -v me="$TERMINAL_ID" \
    '$1 > since && $2 != me { print }' "$CHANGELOG")

if [ -z "$UPDATES" ]; then
    echo "No cross-terminal updates since last session."
else
    echo "=== Cross-terminal updates ==="
    echo "$UPDATES" | while IFS='|' read -r ts tid op fp desc; do
        HUMAN_TIME=$(date -r "$ts" "+%H:%M" 2>/dev/null || date -d "@$ts" "+%H:%M" 2>/dev/null || echo "$ts")
        echo "  [$HUMAN_TIME] $tid: $op $fp $desc"
    done
    echo "=============================="
fi

# Update checkpoint
date +%s > "$LAST_CHECK"
