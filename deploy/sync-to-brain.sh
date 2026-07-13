#!/bin/bash
# sync-to-brain.sh — deploy dashboard/scripts/launcher code from this repo to a
# real brain, WITHOUT touching the brain's data or per-machine instance files.
#
#   ./deploy/sync-to-brain.sh /path/to/brain [--dry-run]
#
# Copies: .loci/dashboard/ (code), scripts/, bin/loci
# Never copies (instance data): .token, chat-sessions.json, node_modules/,
# package-lock.json, data.json, dashboard.log — and never touches the brain's
# tasks/, me/, .loci/push/, .loci/config.yml, etc.
#
# Overlay semantics on purpose (NO --delete): the repo owns the code files it
# ships, but a brain legitimately carries local extras next to them (user
# avatars in assets/, local demos, retired experiments). A file the repo
# renamed away just lingers harmlessly; clean those up by hand when noticed.

set -euo pipefail

BRAIN="${1:-}"
DRY="${2:-}"
[ -n "$BRAIN" ] || { echo "usage: $0 /path/to/brain [--dry-run]" >&2; exit 1; }
[ -f "$BRAIN/plan.md" ] || { echo "error: $BRAIN does not look like a brain (no plan.md)" >&2; exit 1; }

REPO="$(cd "$(dirname "$0")/.." && pwd)"
[ "$REPO" != "$(cd "$BRAIN" && pwd)" ] || { echo "error: source and target are the same directory" >&2; exit 1; }

FLAGS=(-a)
[ "$DRY" = "--dry-run" ] && FLAGS+=(-n -v)

rsync "${FLAGS[@]}" \
  --exclude '.token' \
  --exclude 'chat-sessions.json' \
  --exclude 'node_modules/' \
  --exclude 'package-lock.json' \
  --exclude 'data.json' \
  "$REPO/.loci/dashboard/" "$BRAIN/.loci/dashboard/"

rsync "${FLAGS[@]}" "$REPO/scripts/" "$BRAIN/scripts/"
rsync -a "$REPO/bin/loci" "$BRAIN/bin/loci"

echo "synced: dashboard + scripts + launcher → $BRAIN"
echo "note: restart the brain's dashboard to pick up the new server (loci stop && loci)"
