#!/usr/bin/env bash
# loci-context.sh — print the whole L1 startup context in ONE command.
#
# Agents without a hook mechanism (Codex, WorkBuddy, other CLIs) run this once
# per session instead of reading each startup file individually: one tool call
# instead of six round-trips. Claude Code keeps using its SessionStart hook.
#
# Usage: bash scripts/loci-context.sh [brain-path]
#   brain-path defaults to this script's repo root.
set -u

BRAIN="${1:-$(cd "$(dirname "$0")/.." && pwd)}"

section() { printf '\n===== %s =====\n' "$1"; }

# show <title> <file> [max-lines] — silently skipped when the file is absent.
show() {
  local t="$1" f="$2" n="${3:-120}"
  [ -f "$f" ] || return 0
  section "$t"
  head -n "$n" "$f" 2>/dev/null || true
}

printf 'Loci startup context · %s\n' "$(date '+%Y-%m-%d %H:%M %A')"

show "User preferences (honor them from the first reply on)" "$BRAIN/me/preferences.md" 60
show "Life plan" "$BRAIN/plan.md" 80
show "Active tasks" "$BRAIN/tasks/active.md" 80

if [ -f "$BRAIN/inbox.md" ]; then
  section "Inbox — latest 7 items"
  grep -E '^- ' "$BRAIN/inbox.md" 2>/dev/null | tail -n 7
fi

show "Project index" "$BRAIN/projects/index.md" 40
show "Current status" "$BRAIN/.loci/status.yml" 20

printf '\n===== end of startup context =====\n'
