#!/usr/bin/env bash
# loci-context.sh — print a lightweight startup map in ONE command.
#
# Keep startup cheap: load standing preferences and pointers, not changing
# content such as plans, tasks, journals, inbox items, or project memory.
# Agents read those sources on demand when the user's request needs them.
# Claude Code's SessionStart hook calls this same script to avoid drift.
#
# Usage: bash scripts/loci-context.sh [brain-path] [workspace-path]
#   brain-path defaults to this script's repo root.
set -u

BRAIN="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
WORKSPACE="${2:-${LOCI_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-$PWD}}}"

# Node is the cross-platform source of truth. Keep the shell implementation
# below as a no-Node fallback for older macOS/Linux/Git-Bash installations.
NODE_BUILDER="$BRAIN/scripts/loci-context.js"
if command -v node >/dev/null 2>&1 && [ -f "$NODE_BUILDER" ]; then
  if node "$NODE_BUILDER" "$BRAIN" "$WORKSPACE"; then
    exit 0
  fi
fi

case "$WORKSPACE" in
  */) WORKSPACE="${WORKSPACE%/}" ;;
esac

section() { printf '\n===== %s =====\n' "$1"; }

# Strip YAML frontmatter and keep preferences within a defensive budget. The
# source file is intentionally small, but this prevents an accidental paste
# from turning every future session into a large prompt.
compact_preferences() {
  awk '
    BEGIN { frontmatter=0; lines=0; chars=0; truncated=0 }
    NR == 1 && /^[[:space:]]*---[[:space:]]*$/ { frontmatter=1; next }
    frontmatter && /^[[:space:]]*---[[:space:]]*$/ { frontmatter=0; next }
    frontmatter { next }
    {
      if (lines >= 30) {
        truncated=1
        exit
      }
      next_chars = chars + length($0) + 1
      if (next_chars > 2000) {
        remaining = 2000 - chars
        if (remaining > 1) print substr($0, 1, remaining - 1)
        truncated=1
        exit
      }
      print
      lines++
      chars=next_chars
    }
    END {
      if (truncated) print "[Preferences truncated at startup; read me/preferences.md on demand for the remainder.]"
    }
  ' "$1" 2>/dev/null
}

printf '[Loci] Lightweight startup map · %s\n' "$(date '+%Y-%m-%d %H:%M %A')"
printf 'Brain: %s\n' "$BRAIN"
printf 'Workspace: %s\n' "$WORKSPACE"
printf 'This startup map is already loaded. Do not run it again in this session.\n'

PREFS="$BRAIN/me/preferences.md"
if [ -f "$PREFS" ] && ! grep -q '^status:[[:space:]]*template[[:space:]]*$' "$PREFS" 2>/dev/null; then
  PREFS_BODY="$(compact_preferences "$PREFS")"
  if [ -n "$(printf '%s' "$PREFS_BODY" | tr -d '[:space:]')" ]; then
    section "Standing user preferences — honor in every reply"
    printf '%s\n' "$PREFS_BODY"
  fi
fi

section "On-demand memory map — open only when the request needs it"
printf '%s\n' \
  "Paths below are relative to Brain." \
  "- Life direction and goals -> plan.md" \
  "- Current tasks -> tasks/active.md; full task data -> tasks/tasks.json" \
  "- Serious projects -> projects/index.md; then open only the matching repo's .loci/memory.md" \
  "- Personal context -> me/" \
  "- Decisions -> decisions/" \
  "- People and places -> people/ and places/" \
  "- User notes -> notes/index.md; saved external material -> references/" \
  "- Quick thoughts -> inbox.md" \
  "- Recent activity, only when asked what happened -> .loci/activity/"

# Include only the project matching the current workspace. Do not preload the
# whole project index or its memory. LOCI_PROJECT_DIR makes this testable and
# lets hook callers pass the real workspace explicitly.
PROJECT_INDEX="$BRAIN/projects/index.md"
if [ -f "$PROJECT_INDEX" ]; then
  PROJECT_MATCH="$(awk -v workspace="$WORKSPACE" '
    /^##[[:space:]]+/ {
      name=$0
      sub(/^##[[:space:]]+/, "", name)
      sub(/[[:space:]]*<!--[[:space:]]*status:.*$/, "", name)
      next
    }
    {
      repo_at=index($0, "repo: ")
      if (!repo_at) next
      rest=substr($0, repo_at + 6)
      memory_at=index(rest, ". memory: ")
      if (memory_at) {
        repo=substr(rest, 1, memory_at - 1)
        memory=substr(rest, memory_at + 10)
      } else {
        repo=rest
        memory=repo "/.loci/memory.md"
      }
      sub(/[[:space:]]+$/, "", repo)
      sub(/[[:space:]]+$/, "", memory)
      if (workspace == repo || index(workspace, repo "/") == 1) {
        print "- Project: " name
        print "- Repo: " repo
        print "- Memory (read on demand): " memory
        exit
      }
    }
  ' "$PROJECT_INDEX" 2>/dev/null)"
  if [ -n "$PROJECT_MATCH" ]; then
    section "Current workspace project pointer"
    printf '%s\n' "$PROJECT_MATCH"
  fi
fi

# State is intentionally a few scalar fields, including freshness metadata;
# never inject the comments or the rest of the file.
STATUS_FILE="$BRAIN/.loci/status.yml"
if [ -f "$STATUS_FILE" ]; then
  STATUS_BODY="$(awk '
    /^(state|energy|updated|ttl|context):[[:space:]]*/ {
      line=$0
      if (length(line) > 240) line=substr(line, 1, 237) "..."
      print "- " line
    }
  ' "$STATUS_FILE" 2>/dev/null)"
  if [ -n "$STATUS_BODY" ]; then
    section "Current state summary — refresh the file if freshness matters"
    printf '%s\n' "$STATUS_BODY"
  fi
fi

printf '\nDo not preload plans, tasks, inbox, journals, project memory, or history. Read the smallest relevant source on demand and cache it for this session.\n'
printf '===== end of lightweight startup map =====\n'
