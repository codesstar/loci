#!/bin/bash
# Loci — Memory Palace for AI
# Installer: clone (if needed) → check prerequisites → launch Claude for onboarding

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

# ─── If running via curl pipe, clone the repo first ─────────────────────────
if [ ! -f "CLAUDE.md" ]; then
  if ! command -v git &> /dev/null; then
    echo -e "${RED}git is not installed. Please install git first.${NC}"
    exit 1
  fi

  BRAIN_DIR="${1:-my-brain}"
  echo -e "Creating brain in ${BOLD}${BRAIN_DIR}/${NC} ..."
  git clone --depth 1 https://github.com/codesstar/loci.git "$BRAIN_DIR"
  cd "$BRAIN_DIR"
  echo -e "${GREEN}✓${NC} Cloned"
fi

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

# ─── Enable global awareness ──────────────────────────────────────────────────
BRAIN_PATH="$(pwd)"
GLOBAL_CLAUDE="$HOME/.claude/CLAUDE.md"
GLOBAL_COMMANDS="$HOME/.claude/commands"

# Create ~/.claude/ if needed
mkdir -p "$HOME/.claude"

# Inject global awareness block (idempotent)
if ! grep -q '<!-- loci:start' "$GLOBAL_CLAUDE" 2>/dev/null; then
  # Backup existing file
  if [ -f "$GLOBAL_CLAUDE" ]; then
    cp "$GLOBAL_CLAUDE" "$GLOBAL_CLAUDE.loci-backup"
  fi

  cat >> "$GLOBAL_CLAUDE" << LOCIBLOCK

<!-- loci:start v1 -->
## Loci Brain Connection
- Brain: ${BRAIN_PATH}
- In projects with \`.loci/\` directory:
  1. Read \`.loci/memory.md\` at session start for project context
  2. Append project knowledge during conversation: \`[tag] YYYY-MM-DD content\`
  3. Tags: \`[decision]\` \`[architecture]\` \`[insight]\` \`[milestone]\` auto-push to brain; \`[local]\` \`[debug]\` \`[wip]\` stay local
  4. At session end, check for push-tagged new entries → write to \`.loci/to-hq.md\`
  5. Read \`.loci/from-hq.md\` for brain directives
  6. Compress memory.md when >200 lines (summarize entries >30 days old)
- Commands: /loci-sync, /loci-link, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->
LOCIBLOCK

  echo -e "${GREEN}✓${NC} Global awareness enabled (~/.claude/CLAUDE.md)"
fi

# Copy slash commands (backup existing ones first)
if [ -d "templates/commands" ]; then
  mkdir -p "$GLOBAL_COMMANDS"
  for cmd_file in templates/commands/*.md; do
    cmd_name="$(basename "$cmd_file")"
    if [ -f "$GLOBAL_COMMANDS/$cmd_name" ]; then
      cp "$GLOBAL_COMMANDS/$cmd_name" "$GLOBAL_COMMANDS/${cmd_name}.loci-backup"
    fi
  done
  cp templates/commands/*.md "$GLOBAL_COMMANDS/" 2>/dev/null
  echo -e "${GREEN}✓${NC} Slash commands installed (~/.claude/commands/)"
fi

# ─── Ensure hooks are executable ──────────────────────────────────────────────
if [ -d ".loci/hooks" ]; then
  chmod +x .loci/hooks/*.sh 2>/dev/null
  echo -e "${GREEN}✓${NC} Hooks set to executable"
fi

# ─── Launch Claude for onboarding ─────────────────────────────────────────────
echo ""
echo -e "${DIM}Launching Claude Code for setup...${NC}"
echo -e "${DIM}Claude will ask you a few questions to personalize your brain.${NC}"
echo ""

claude --append-system-prompt "IMPORTANT: This is a brand new Loci brain. Read plan.md immediately — its status is 'template'. You MUST run the First-Time Setup onboarding flow from CLAUDE.md right now, before doing anything else. Start by welcoming the user and asking the onboarding questions using AskUserQuestion. NOTE: Git remote disconnect, global awareness, and slash commands have already been set up by install.sh — skip Steps 3 and 4 in the onboarding flow."
