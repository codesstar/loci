#!/bin/bash
# Loci — Memory Palace for AI
# Installer: clone (if needed) → run setup.sh for onboarding

set -e

# ─── Colors ─────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# ─── Check if brain already exists ────────────────────────────────────────────
EXISTING_BRAIN=""
if [ -f "$HOME/.loci/brain-path" ]; then
  EXISTING_BRAIN="$(cat "$HOME/.loci/brain-path")"
  if [ -f "$EXISTING_BRAIN/plan.md" ]; then
    echo -e "${DIM}Existing brain found at ${EXISTING_BRAIN}${NC}"
    cd "$EXISTING_BRAIN"
  else
    EXISTING_BRAIN=""
  fi
fi

# ─── If no existing brain, clone the repo ─────────────────────────────────────
if [ -z "$EXISTING_BRAIN" ] && [ ! -f "CLAUDE.md" ]; then
  if ! command -v git &> /dev/null; then
    echo -e "${RED}git is not installed. Please install git first.${NC}"
    exit 1
  fi

  BRAIN_DIR="${1:-$HOME/loci}"
  echo -e "Cloning Loci to ${BOLD}${BRAIN_DIR}/${NC} ..."
  git clone --depth 1 https://github.com/codesstar/loci.git "$BRAIN_DIR"
  cd "$BRAIN_DIR"
  echo -e "${GREEN}✓${NC} Cloned"
fi

# ─── Hand off to setup.sh ────────────────────────────────────────────────────
# setup.sh handles everything: onboarding questions, file generation,
# global config, git safety. When it's done, the user opens their AI tool
# and it already knows them.
exec bash ./setup.sh
