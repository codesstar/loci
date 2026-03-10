#!/bin/bash
# Loci — Memory Palace for AI
# Interactive setup script

set -e

TODAY=$(date +%Y-%m-%d)

# ─── Colors ─────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   🧠 Loci — Memory Palace for AI         ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${DIM}Let's set up your brain. Answer a few questions.${NC}"
echo ""

# ─── Step 1: Basic Info ─────────────────────────────────────────────────────
echo -e "${CYAN}━━━ Step 1/3: About You ━━━${NC}"
echo ""

read -p "  Your name: " NAME
read -p "  What do you do? (one sentence): " ROLE
read -p "  Most important thing you're working on: " FOCUS

echo ""

# ─── Step 2: Language ───────────────────────────────────────────────────────
echo -e "${CYAN}━━━ Step 2/3: Preferences ━━━${NC}"
echo ""
echo "  Preferred language:"
echo -e "    ${DIM}1) English${NC}"
echo -e "    ${DIM}2) 中文${NC}"
echo -e "    ${DIM}3) Other${NC}"
read -p "  Choose [1/2/3]: " LANG_CHOICE

case "$LANG_CHOICE" in
  1) LANG="English" ;;
  2) LANG="中文" ;;
  3) read -p "  Enter language: " LANG ;;
  *) LANG="English" ;;
esac

echo ""

# ─── Step 3: Modules ───────────────────────────────────────────────────────
echo -e "${CYAN}━━━ Step 3/3: Modules ━━━${NC}"
echo ""
echo -e "  ${DIM}Keep all modules? (finance, people, content, dashboard, etc.)${NC}"
read -p "  [Y/n]: " KEEP_ALL

if [[ "$KEEP_ALL" == "n" || "$KEEP_ALL" == "N" ]]; then
  read -p "    02-finance (financial tracking)? [y/n]: " KEEP_FINANCE
  read -p "    04-people (contact management)? [y/n]: " KEEP_PEOPLE
  read -p "    06-content (content creation)? [y/n]: " KEEP_CONTENT
  read -p "    09-links (multi-project orchestration)? [y/n]: " KEEP_LINKS
  read -p "    10-dashboard (web visualization)? [y/n]: " KEEP_DASHBOARD

  [[ "$KEEP_FINANCE" != "y" && "$KEEP_FINANCE" != "Y" ]] && rm -rf 02-finance && echo "    ✓ Removed 02-finance"
  [[ "$KEEP_PEOPLE" != "y" && "$KEEP_PEOPLE" != "Y" ]] && rm -rf 04-people && echo "    ✓ Removed 04-people"
  [[ "$KEEP_CONTENT" != "y" && "$KEEP_CONTENT" != "Y" ]] && rm -rf 06-content && echo "    ✓ Removed 06-content"
  [[ "$KEEP_LINKS" != "y" && "$KEEP_LINKS" != "Y" ]] && rm -rf 09-links && echo "    ✓ Removed 09-links"
  [[ "$KEEP_DASHBOARD" != "y" && "$KEEP_DASHBOARD" != "Y" ]] && rm -rf 10-dashboard && echo "    ✓ Removed 10-dashboard"
fi

echo ""

# ─── Generate Files ─────────────────────────────────────────────────────────
echo -e "${YELLOW}Setting up your brain...${NC}"

# identity.md
cat > 01-me/identity.md << EOF
---
created: ${TODAY}
updated: ${TODAY}
tags: [identity, core]
status: active
---

# Who I Am

- **Name**: ${NAME}
- **Role**: ${ROLE}
- **Current Focus**: ${FOCUS}
- **Language**: ${LANG}
EOF

# plan.md
cat > plan.md << EOF
---
created: ${TODAY}
updated: ${TODAY}
status: active
---

# Life Direction & Goals

> Your north star. Everything day-to-day should trace back here.

## Current Focus

${FOCUS}

## Goals

<!-- Add your goals here. Your AI will help you track them. -->
EOF

# active.md
cat > 05-tasks/active.md << EOF
---
updated: ${TODAY}
---

# Active Tasks

> What you're working on right now. P0 = drop everything. P3 = nice to have.

## P0

- [ ] ${FOCUS}

## P1

## P2

## P3
EOF

# inbox.md
cat > inbox.md << EOF
---
updated: ${TODAY}
---

# Inbox

> Brain dump. Sort weekly. If it takes < 2 min, just do it.

## Unprocessed
EOF

# activity-log.md
cat > activity-log.md << EOF
---
updated: ${TODAY}
---

# Activity Log

> Automatic timeline of what happened. Read by new sessions to restore context.
> Retention: 14 days. Important info is distilled to proper files.

## ${TODAY}

- $(date "+%H:%M") \`create\` setup.sh — initial brain setup
EOF

echo -e "  ${GREEN}✓${NC} 01-me/identity.md"
echo -e "  ${GREEN}✓${NC} plan.md"
echo -e "  ${GREEN}✓${NC} 05-tasks/active.md"
echo -e "  ${GREEN}✓${NC} inbox.md"
echo -e "  ${GREEN}✓${NC} activity-log.md"

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Your memory palace is ready!${NC}"
echo ""
echo -e "  ${DIM}Starting Claude Code...${NC}"
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Launch Claude
claude --prompt "My brain is set up. Read my identity and plan, then tell me what you know about me and what we should work on."
