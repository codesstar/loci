#!/bin/bash
# Loci — Update Engine Files
# Downloads the latest engine files from GitHub without touching user data.
# Usage: ./update.sh [--check] [--rollback]

set -e

# ─── Colors ─────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

BRAIN_PATH="$(cd "$(dirname "$0")" && pwd)"
MANIFEST="$BRAIN_PATH/.loci/engine-files.yml"
BACKUP_DIR="$BRAIN_PATH/.loci/backups"
REPO="codesstar/loci"
BRANCH="main"

# ─── Safety: files that must NEVER be overwritten ───────────────────────────
NEVER_TOUCH=(
  "plan.md"
  "inbox.md"
  "me/identity.md"
  "me/values.md"
  "me/learned.md"
  "me/goals.md"
  "me/evolution.md"
  "me/insights.md"
  "me/projects.md"
  "tasks/active.md"
  "tasks/someday.md"
  "tasks/calendar.json"
  "tasks/journal/*"
  "tasks/daily/*"
  "tasks/plans/*"
  "decisions/*.md"
  "references/*.md"
  "references/entries/*"
  "people/*.md"
  "people/meetings/*"
  "finance/*.md"
  "content/*.md"
  "archive/misc/*"
  "archive/planning/*"
  "archive/projects/*"
  "archive/tasks/*"
  ".loci/config.yml"
  ".loci/status.yml"
  ".loci/activity-log.md"
  ".loci/links/*/memory.md"
  ".loci/links/*/to-hq.md"
)

# ─── Helpers ────────────────────────────────────────────────────────────────
print_ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
print_warn() { echo -e "  ${YELLOW}!${NC} $1"; }
print_fail() { echo -e "  ${RED}✗${NC} $1"; }

is_protected() {
  local file="$1"
  for pattern in "${NEVER_TOUCH[@]}"; do
    case "$file" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

get_local_version() {
  grep '^version:' "$MANIFEST" 2>/dev/null | sed 's/version:[[:space:]]*"\{0,1\}\([^"]*\)"\{0,1\}/\1/'
}

get_remote_version() {
  curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/.loci/engine-files.yml" 2>/dev/null \
    | grep '^version:' | sed 's/version:[[:space:]]*"\{0,1\}\([^"]*\)"\{0,1\}/\1/'
}

# Parse managed files from engine-files.yml (expand ** globs against remote)
get_managed_files() {
  grep '^ *- ' "$1" | sed 's/^ *- //' | while read -r pattern; do
    echo "$pattern"
  done
}

# ─── Rollback ───────────────────────────────────────────────────────────────
do_rollback() {
  local latest_backup
  latest_backup=$(ls -1d "$BACKUP_DIR"/*/ 2>/dev/null | sort -r | head -1)
  if [ -z "$latest_backup" ]; then
    print_fail "No backups found in $BACKUP_DIR"
    exit 1
  fi

  echo -e "${BOLD}Rolling back to backup: $(basename "$latest_backup")${NC}"
  local count=0
  while IFS= read -r -d '' file; do
    local rel="${file#$latest_backup}"
    local target="$BRAIN_PATH/$rel"
    mkdir -p "$(dirname "$target")"
    cp "$file" "$target"
    count=$((count + 1))
  done < <(find "$latest_backup" -type f -print0)
  print_ok "Restored $count files"
  echo -e "${GREEN}Rollback complete.${NC}"
}

# ─── Check only ─────────────────────────────────────────────────────────────
do_check() {
  local local_ver remote_ver
  local_ver=$(get_local_version)
  remote_ver=$(get_remote_version)

  if [ -z "$remote_ver" ]; then
    print_fail "Could not reach GitHub. Check your network."
    exit 1
  fi

  echo -e "  Local:  ${BOLD}${local_ver}${NC}"
  echo -e "  Remote: ${BOLD}${remote_ver}${NC}"

  if [ "$local_ver" = "$remote_ver" ]; then
    echo -e "  ${GREEN}Already up to date.${NC}"
  else
    echo -e "  ${CYAN}Update available: ${local_ver} → ${remote_ver}${NC}"
    echo -e "  Run ${BOLD}./update.sh${NC} to update."
  fi
}

# ─── Main update flow ───────────────────────────────────────────────────────
do_update() {
  echo ""
  echo -e "${BOLD}Loci Update${NC}"
  echo ""

  # 1. Check versions
  local local_ver remote_ver
  local_ver=$(get_local_version)
  remote_ver=$(get_remote_version)

  if [ -z "$remote_ver" ]; then
    print_fail "Could not reach GitHub. Check your network."
    exit 1
  fi

  echo -e "  Current: ${BOLD}${local_ver}${NC}  →  Latest: ${BOLD}${remote_ver}${NC}"

  if [ "$local_ver" = "$remote_ver" ]; then
    echo ""
    print_ok "Already up to date."
    return
  fi

  # 2. Download latest to temp directory
  echo ""
  echo -e "${DIM}Downloading latest version...${NC}"
  local tmp_dir
  tmp_dir=$(mktemp -d)
  trap "rm -rf $tmp_dir" EXIT

  if command -v git &>/dev/null; then
    git clone --depth 1 --quiet "https://github.com/$REPO.git" "$tmp_dir/repo" 2>/dev/null
  else
    curl -fsSL "https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz" | tar xz -C "$tmp_dir"
    mv "$tmp_dir/loci-$BRANCH" "$tmp_dir/repo"
  fi
  print_ok "Downloaded"

  # 3. Read managed file list from NEW manifest (in case it changed)
  local new_manifest="$tmp_dir/repo/.loci/engine-files.yml"
  if [ ! -f "$new_manifest" ]; then
    print_fail "Downloaded version has no engine-files.yml — aborting"
    exit 1
  fi

  # 4. Expand file patterns and collect files to update
  local files_to_update=()
  local skipped=()

  while IFS= read -r pattern; do
    # Expand globs against the downloaded repo
    while IFS= read -r -d '' file; do
      local rel="${file#$tmp_dir/repo/}"
      # Safety check
      if is_protected "$rel"; then
        skipped+=("$rel (PROTECTED)")
        continue
      fi
      files_to_update+=("$rel")
    done < <(find "$tmp_dir/repo" -path "$tmp_dir/repo/$pattern" -print0 2>/dev/null)

    # Handle ** globs manually
    if [[ "$pattern" == *"**"* ]]; then
      local base_dir="${pattern%%/**}"
      while IFS= read -r -d '' file; do
        local rel="${file#$tmp_dir/repo/}"
        if is_protected "$rel"; then
          skipped+=("$rel (PROTECTED)")
          continue
        fi
        # Avoid duplicates
        local found=0
        for existing in "${files_to_update[@]}"; do
          [ "$existing" = "$rel" ] && found=1 && break
        done
        [ "$found" -eq 0 ] && files_to_update+=("$rel")
      done < <(find "$tmp_dir/repo/$base_dir" -type f -print0 2>/dev/null)
    fi
  done < <(get_managed_files "$new_manifest")

  echo ""
  echo -e "${BOLD}Files to update (${#files_to_update[@]}):${NC}"
  for f in "${files_to_update[@]}"; do
    if [ -f "$BRAIN_PATH/$f" ]; then
      if diff -q "$BRAIN_PATH/$f" "$tmp_dir/repo/$f" &>/dev/null; then
        echo -e "  ${DIM}  $f (unchanged)${NC}"
      else
        echo -e "  ${CYAN}↻${NC} $f"
      fi
    else
      echo -e "  ${GREEN}+${NC} $f (new)"
    fi
  done

  if [ ${#skipped[@]} -gt 0 ]; then
    echo ""
    echo -e "${DIM}Skipped (protected user data):${NC}"
    for f in "${skipped[@]}"; do
      echo -e "  ${DIM}  $f${NC}"
    done
  fi

  # 5. Confirm
  echo ""
  printf "  Apply update ${local_ver} → ${remote_ver}? (Y/n): "
  read -r confirm
  if [[ "$confirm" =~ ^[nN] ]]; then
    echo -e "  ${DIM}Update cancelled.${NC}"
    return
  fi

  # 6. Backup current engine files
  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_path="$BACKUP_DIR/$timestamp"
  mkdir -p "$backup_path"

  for f in "${files_to_update[@]}"; do
    if [ -f "$BRAIN_PATH/$f" ]; then
      mkdir -p "$backup_path/$(dirname "$f")"
      cp "$BRAIN_PATH/$f" "$backup_path/$f"
    fi
  done
  print_ok "Backed up to .loci/backups/$timestamp/"

  # 7. Copy new files
  local updated=0
  for f in "${files_to_update[@]}"; do
    if [ -f "$tmp_dir/repo/$f" ]; then
      mkdir -p "$BRAIN_PATH/$(dirname "$f")"
      cp "$tmp_dir/repo/$f" "$BRAIN_PATH/$f"
      updated=$((updated + 1))
    fi
  done
  print_ok "Updated $updated files"

  # 8. Re-run global config (idempotent)
  # Update global CLAUDE.md if the loci block template changed
  local global_claude="$HOME/.claude/CLAUDE.md"
  if [ -f "$global_claude" ] && grep -q '<!-- loci:start' "$global_claude"; then
    # Remove old block and re-inject from template
    local tmp_global
    tmp_global=$(mktemp)
    sed '/<!-- loci:start/,/<!-- loci:end -->/d' "$global_claude" > "$tmp_global"
    if [ -f "$BRAIN_PATH/templates/global-claude-block.md" ]; then
      local block
      block=$(sed "s|<brain-path>|${BRAIN_PATH}|g" "$BRAIN_PATH/templates/global-claude-block.md")
      printf "\n%s\n" "$block" >> "$tmp_global"
    fi
    mv "$tmp_global" "$global_claude"
    print_ok "Global CLAUDE.md refreshed"
  fi

  # Copy slash commands
  if [ -d "$BRAIN_PATH/templates/commands" ]; then
    cp "$BRAIN_PATH"/templates/commands/*.md "$HOME/.claude/commands/" 2>/dev/null
    print_ok "Slash commands updated"
  fi

  # Ensure hooks executable
  chmod +x "$BRAIN_PATH"/.loci/hooks/*.sh 2>/dev/null
  chmod +x "$BRAIN_PATH"/.githooks/* 2>/dev/null
  chmod +x "$BRAIN_PATH"/.claude/hooks/*.sh 2>/dev/null

  # 9. Show changelog if available
  if [ -f "$BRAIN_PATH/CHANGELOG.md" ]; then
    echo ""
    echo -e "${BOLD}What's new in ${remote_ver}:${NC}"
    # Show latest changelog section
    awk '/^## /{if(found) exit; found=1} found' "$BRAIN_PATH/CHANGELOG.md" | head -15
  fi

  echo ""
  echo -e "${GREEN}Updated to ${BOLD}${remote_ver}${GREEN}.${NC} Your data is untouched."
  echo -e "${DIM}Rollback: ./update.sh --rollback${NC}"
}

# ─── Entry point ────────────────────────────────────────────────────────────
case "${1:-}" in
  --check)    do_check ;;
  --rollback) do_rollback ;;
  --help|-h)
    echo "Usage: ./update.sh [--check] [--rollback] [--help]"
    echo ""
    echo "  (no args)    Update engine files to latest version"
    echo "  --check      Check if updates are available"
    echo "  --rollback   Restore from the most recent backup"
    ;;
  *)          do_update ;;
esac
