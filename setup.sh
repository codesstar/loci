#!/bin/bash
# Loci — Memory Palace for AI
# Thin launcher: check prerequisites → launch Claude for onboarding

set -e

# ─── Colors ─────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Loci — Memory Palace for AI            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─── Check prerequisites ─────────────────────────────────────────────────────
if ! command -v claude &> /dev/null; then
  echo -e "${RED}Claude Code is not installed.${NC}"
  echo ""
  echo "  Loci requires Claude Code to work. Install it first:"
  echo "  https://docs.anthropic.com/en/docs/claude-code/overview"
  echo ""
  echo "  After installing, run this script again."
  exit 1
fi

if ! command -v python3 &> /dev/null; then
  echo -e "${DIM}Note: python3 not found. Dashboard will not be available until you install Python 3.${NC}"
fi

# ─── Disconnect from template remote ─────────────────────────────────────────
if git remote get-url origin &> /dev/null 2>&1; then
  REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
  if [[ "$REMOTE_URL" == *"codesstar/loci"* ]]; then
    git remote remove origin
    echo -e "${GREEN}✓${NC} Disconnected from template repo (your data stays private)"
  fi
fi

# ─── Launch Claude for onboarding ─────────────────────────────────────────────
echo -e "${DIM}Launching Claude Code for setup...${NC}"
echo -e "${DIM}Claude will ask you a few questions to personalize your brain.${NC}"
echo ""

claude
