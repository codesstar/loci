#!/bin/bash
# Loci — Memory Palace for AI
# Interactive setup script

set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Loci — Memory Palace for AI        ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Let's personalize your memory palace."
echo ""

# Collect user info
read -p "Your name: " NAME
read -p "Your occupation/role: " OCCUPATION
read -p "Your location: " LOCATION
read -p "Your main goal this year (one sentence): " GOAL
echo ""

# Update identity.md
if [ -f "01-me/identity.md" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SED_CMD="sed -i ''"
    else
        SED_CMD="sed -i"
    fi

    $SED_CMD "s/Alex Chen/$NAME/g" 01-me/identity.md
    $SED_CMD "s/Freelance UI\/UX Designer/$OCCUPATION/g" 01-me/identity.md
    $SED_CMD "s/San Francisco, CA/$LOCATION/g" 01-me/identity.md

    # Update dates
    TODAY=$(date +%Y-%m-%d)
    $SED_CMD "s/YYYY-MM-DD/$TODAY/g" 01-me/identity.md
fi

# Update plan.md
if [ -f "plan.md" ]; then
    TODAY=$(date +%Y-%m-%d)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/YYYY-MM-DD/$TODAY/g" plan.md
    else
        sed -i "s/YYYY-MM-DD/$TODAY/g" plan.md
    fi
fi

# Update inbox.md
if [ -f "inbox.md" ]; then
    TODAY=$(date +%Y-%m-%d)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/YYYY-MM-DD/$TODAY/g" inbox.md
    else
        sed -i "s/YYYY-MM-DD/$TODAY/g" inbox.md
    fi
fi

# Ask about optional modules
echo "Which modules do you want to keep? (y/n for each)"
echo ""

read -p "  02-finance (financial tracking)? [y/n] " KEEP_FINANCE
read -p "  04-people (contact management)? [y/n] " KEEP_PEOPLE
read -p "  06-content (content creation)? [y/n] " KEEP_CONTENT
read -p "  09-links (multi-project orchestration)? [y/n] " KEEP_LINKS
read -p "  10-dashboard (web visualization)? [y/n] " KEEP_DASHBOARD

# Remove unwanted modules
if [[ "$KEEP_FINANCE" != "y" && "$KEEP_FINANCE" != "Y" ]]; then
    rm -rf 02-finance
    echo "  Removed 02-finance"
fi

if [[ "$KEEP_PEOPLE" != "y" && "$KEEP_PEOPLE" != "Y" ]]; then
    rm -rf 04-people
    echo "  Removed 04-people"
fi

if [[ "$KEEP_CONTENT" != "y" && "$KEEP_CONTENT" != "Y" ]]; then
    rm -rf 06-content
    echo "  Removed 06-content"
fi

if [[ "$KEEP_LINKS" != "y" && "$KEEP_LINKS" != "Y" ]]; then
    rm -rf 09-links
    echo "  Removed 09-links"
fi

if [[ "$KEEP_DASHBOARD" != "y" && "$KEEP_DASHBOARD" != "Y" ]]; then
    rm -rf 10-dashboard
    echo "  Removed 10-dashboard"
fi

# Ask about example data
echo ""
read -p "Remove example data (Alex Chen persona)? [y/n] " REMOVE_EXAMPLES

if [[ "$REMOVE_EXAMPLES" == "y" || "$REMOVE_EXAMPLES" == "Y" ]]; then
    # Clear example content but keep file structure
    if [ -d "07-decisions" ]; then
        rm -f 07-decisions/2026-01-15-niche-down.md
    fi
    if [ -d "09-links/client-acme" ]; then
        rm -rf 09-links/client-acme
    fi
    # Reset task files to empty templates
    cat > 05-tasks/active.md << 'TASKEOF'
---
updated: YYYY-MM-DD
---

# Active Tasks

## P0 — Must do today
- [ ]

## P1 — This week
- [ ]

## P2 — Can delegate or quick wins
- [ ]

## P3 — When there's time
- [ ]
TASKEOF

    cat > 05-tasks/someday.md << 'SOMEDAYEOF'
---
updated: YYYY-MM-DD
---

# Someday / Maybe

> Ideas and projects I want to do eventually, but haven't scheduled yet.

-
SOMEDAYEOF

    echo "  Example data removed"
fi

# Initialize git
echo ""
read -p "Initialize git repository? [y/n] " INIT_GIT

if [[ "$INIT_GIT" == "y" || "$INIT_GIT" == "Y" ]]; then
    git init
    git add -A
    git commit -m "Initialize Loci memory palace"
    echo "  Git repository initialized"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Your memory palace is ready!"
echo ""
echo "  Next steps:"
echo "  1. Edit 01-me/identity.md with your full profile"
echo "  2. Set your goals in plan.md"
echo "  3. Open Claude Code in this directory"
echo "  4. Start chatting — your AI now remembers everything"
echo ""
echo "  Docs: https://github.com/callumcyc/loci#readme"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
