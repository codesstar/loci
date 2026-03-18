#!/bin/bash
# Loci — Memory Palace for AI
# Interactive setup script. Pure bash, zero dependencies.
# Inspired by oh-my-zsh, rustup, and create-next-app.

set -e

# ─── Colors & Formatting ────────────────────────────────────────────────────
CYAN='\033[0;36m'
BOLD_CYAN='\033[1;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Globals ─────────────────────────────────────────────────────────────────
BRAIN_PATH="$(cd "$(dirname "$0")" && pwd)"
LANG_CHOICE="en"
USER_NAME=""
USER_ROLE=""
USER_FOCUS=""
USER_SCHEDULE=""
TOTAL_STEPS=4
CURRENT_STEP=0

# ─── Ctrl+C handler ─────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo ""
  echo -e "${DIM}Setup interrupted. No changes were made.${NC}"
  echo -e "${DIM}Run ./setup.sh again when you're ready.${NC}"
  echo ""
  tput cnorm 2>/dev/null  # restore cursor
  exit 1
}
trap cleanup INT TERM

# ─── Utilities ───────────────────────────────────────────────────────────────
print_step() {
  echo ""
  echo -e "${DIM}[$CURRENT_STEP/$TOTAL_STEPS]${NC} ${BOLD_CYAN}$1${NC}"
  echo -e "${DIM}$(printf '%.0s─' {1..50})${NC}"
}

print_check() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_warn() {
  echo -e "  ${YELLOW}!${NC} $1"
}

print_fail() {
  echo -e "  ${RED}✗${NC} $1"
}

# Spinner animation for file generation
spin() {
  local msg="$1"
  local pid=$!
  local frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  tput civis 2>/dev/null  # hide cursor
  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${CYAN}${frames:$i:1}${NC} %s" "$msg"
    i=$(( (i + 1) % ${#frames} ))
    sleep 0.08
  done
  wait "$pid"
  printf "\r  ${GREEN}✓${NC} %s\n" "$msg"
  tput cnorm 2>/dev/null  # restore cursor
}

# Prompt with default value
ask() {
  local prompt="$1"
  local default="$2"
  local var_name="$3"
  if [ -n "$default" ]; then
    printf "  ${WHITE}%s${NC} ${DIM}(%s)${NC}: " "$prompt" "$default"
  else
    printf "  ${WHITE}%s${NC}: " "$prompt"
  fi
  read -r input
  if [ -z "$input" ] && [ -n "$default" ]; then
    input="$default"
  fi
  eval "$var_name=\"\$input\""
}

# Interactive arrow-key menu selection (Claude Code style)
choose() {
  local prompt="$1"
  shift
  local options=("$@")
  local selected=0
  local count=${#options[@]}

  echo ""
  echo -e "  ${WHITE}${prompt}${NC}"

  tput civis 2>/dev/null  # hide cursor

  # Draw initial menu
  for i in "${!options[@]}"; do
    if [ "$i" -eq "$selected" ]; then
      echo -e "    ${CYAN}● ${WHITE}${options[$i]}${NC}"
    else
      echo -e "    ${DIM}○ ${options[$i]}${NC}"
    fi
  done

  # Read arrow keys and enter
  while true; do
    read -rsn1 key
    if [[ "$key" == $'\x1b' ]]; then
      read -rsn2 arrow
      case "$arrow" in
        '[A') # Up
          if [ "$selected" -gt 0 ]; then
            selected=$((selected - 1))
          fi
          ;;
        '[B') # Down
          if [ "$selected" -lt $((count - 1)) ]; then
            selected=$((selected + 1))
          fi
          ;;
      esac
    elif [[ "$key" == "" ]]; then
      # Enter pressed
      break
    elif [[ "$key" =~ ^[0-9]$ ]] && [ "$key" -ge 1 ] && [ "$key" -le "$count" ]; then
      # Number key shortcut
      selected=$((key - 1))
      break
    fi

    # Redraw menu (move cursor up N lines)
    printf "\033[${count}A"
    for i in "${!options[@]}"; do
      printf "\r\033[K"  # clear line
      if [ "$i" -eq "$selected" ]; then
        echo -e "    ${CYAN}● ${WHITE}${options[$i]}${NC}"
      else
        echo -e "    ${DIM}○ ${options[$i]}${NC}"
      fi
    done
  done

  tput cnorm 2>/dev/null  # restore cursor

  # Replace menu with final selection
  printf "\033[${count}A"
  for i in "${!options[@]}"; do
    printf "\r\033[K"
  done
  printf "\033[${count}A"
  echo -e "    ${GREEN}● ${WHITE}${options[$selected]}${NC}"

  MENU_RESULT=$((selected + 1))
}

# Bilingual text helper — returns text based on language choice
t() {
  local en="$1"
  local zh="$2"
  case "$LANG_CHOICE" in
    zh)  echo "$zh" ;;
    mix) echo "$zh ($en)" ;;
    *)   echo "$en" ;;
  esac
}

# Get today's date (cross-platform)
today() {
  date +%Y-%m-%d
}

# ─── ASCII Art Logo ──────────────────────────────────────────────────────────
show_logo() {
  clear
  echo ""
  echo -e "${CYAN}          .·:·.${NC}"
  echo -e "${CYAN}        .'     '.${NC}"
  echo -e "${CYAN}       /  ${BOLD_CYAN}◐${CYAN}    |${NC}"
  echo -e "${CYAN}      |    __.·'${NC}"
  echo -e "${CYAN}       \\  (${NC}"
  echo -e "${CYAN}        )  )${NC}"
  echo -e "${CYAN}       /  /${NC}"
  echo -e "${CYAN}      (  (${NC}"
  echo -e "${CYAN}       '··'${NC}"
  echo ""
  echo -e "${BOLD_CYAN}  ██╗      ██████╗  ██████╗██╗${NC}"
  echo -e "${BOLD_CYAN}  ██║     ██╔═══██╗██╔════╝██║${NC}"
  echo -e "${BOLD_CYAN}  ██║     ██║   ██║██║     ██║${NC}"
  echo -e "${BOLD_CYAN}  ██║     ██║   ██║██║     ██║${NC}"
  echo -e "${BOLD_CYAN}  ███████╗╚██████╔╝╚██████╗██║${NC}"
  echo -e "${BOLD_CYAN}  ╚══════╝ ╚═════╝  ╚═════╝╚═╝${NC}"
  echo ""
  echo -e "  ${DIM}Memory Palace for AI${NC}"
  echo ""
}

# ─── Step 0: Pre-flight Checks ──────────────────────────────────────────────
preflight() {
  CURRENT_STEP=0
  print_step "Pre-flight checks"

  # Detect OS
  local os_name
  case "$(uname -s)" in
    Darwin*)  os_name="macOS" ;;
    Linux*)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        os_name="Linux (WSL)"
      else
        os_name="Linux"
      fi
      ;;
    *)        os_name="$(uname -s)" ;;
  esac
  print_check "OS: ${os_name}"

  # Check git
  if command -v git &>/dev/null; then
    print_check "git $(git --version | cut -d' ' -f3)"
  else
    print_fail "git not found — please install git first"
    exit 1
  fi

  # Check claude CLI (optional)
  if command -v claude &>/dev/null; then
    print_check "Claude Code available"
  else
    print_warn "Claude Code not found (optional — install later)"
    print_warn "  https://docs.anthropic.com/en/docs/claude-code/overview"
  fi

  # Check if already set up
  if [ -f "$BRAIN_PATH/plan.md" ]; then
    local status
    status=$(sed -n '/^---$/,/^---$/p' "$BRAIN_PATH/plan.md" | grep 'status:' | head -1 | sed 's/.*status:[[:space:]]*//')
    if [ "$status" != "template" ] && [ -n "$status" ]; then
      echo ""
      print_warn "This brain appears to be already set up (plan.md status: ${status})"
      printf "  ${WHITE}Re-run setup? This will overwrite existing config.${NC} ${DIM}(y/N)${NC}: "
      read -r confirm
      if [[ ! "$confirm" =~ ^[yY] ]]; then
        echo ""
        echo -e "  ${DIM}Exiting. Your brain is untouched.${NC}"
        exit 0
      fi
    fi
  fi

  echo ""
}

# ─── Step 1: Interactive Questions ───────────────────────────────────────────
collect_info() {
  CURRENT_STEP=1
  print_step "Tell me about yourself"

  # Language
  choose "Language / 语言" "English" "中文" "中英混合 (Mixed)"
  case $MENU_RESULT in
    1) LANG_CHOICE="en" ;;
    2) LANG_CHOICE="zh" ;;
    3) LANG_CHOICE="mix" ;;
  esac

  # Name
  echo ""
  ask "$(t "Your name" "你的名字")" "" USER_NAME
  while [ -z "$USER_NAME" ]; do
    ask "$(t "Please enter your name" "请输入你的名字")" "" USER_NAME
  done

  # Role
  choose "$(t "What do you do?" "你是做什么的？")" \
    "$(t "Developer" "开发者")" \
    "$(t "Designer" "设计师")" \
    "$(t "Creator" "创作者")" \
    "$(t "Student" "学生")" \
    "$(t "Other" "其他")"
  case $MENU_RESULT in
    1) USER_ROLE="Developer" ;;
    2) USER_ROLE="Designer" ;;
    3) USER_ROLE="Creator" ;;
    4) USER_ROLE="Student" ;;
    5)
      ask "$(t "What's your role?" "你的角色是？")" "" USER_ROLE
      [ -z "$USER_ROLE" ] && USER_ROLE="Other"
      ;;
  esac

  # Focus
  choose "$(t "What's your most important focus right now?" "你目前最重要的事情是什么？")" \
    "$(t "Ship a product" "做产品上线")" \
    "$(t "Learn a skill" "学一项技能")" \
    "$(t "Build an audience" "做自媒体/涨粉")" \
    "$(t "Get a job" "找工作")" \
    "$(t "Other" "其他")"
  case $MENU_RESULT in
    1) USER_FOCUS="Ship a product" ;;
    2) USER_FOCUS="Learn a skill" ;;
    3) USER_FOCUS="Build an audience" ;;
    4) USER_FOCUS="Get a job" ;;
    5)
      ask "$(t "What are you focused on?" "你在专注什么？")" "" USER_FOCUS
      [ -z "$USER_FOCUS" ] && USER_FOCUS="My current project"
      ;;
  esac

  # Schedule
  choose "$(t "When do you usually work?" "你通常什么时候工作？")" \
    "$(t "Morning (6am-12pm)" "早晨型 (6am-12pm)")" \
    "$(t "Daytime (9am-6pm)" "白天型 (9am-6pm)")" \
    "$(t "Evening (6pm-12am)" "晚间型 (6pm-12am)")" \
    "$(t "Night owl (10pm-6am)" "夜猫子 (10pm-6am)")" \
    "$(t "Irregular / varies" "不固定")"
  USER_SCHEDULE=$MENU_RESULT

  echo ""
  echo -e "  ${DIM}$(printf '%.0s─' {1..50})${NC}"
  echo -e "  ${GREEN}✓${NC} $(t "Got it, ${USER_NAME}!" "收到，${USER_NAME}！")"
}

# ─── Step 2: File Generation ────────────────────────────────────────────────
generate_files() {
  CURRENT_STEP=2
  echo ""
  print_step "$(t "Setting up your brain" "配置你的大脑")"

  local today_date
  today_date="$(today)"

  # --- me/identity.md ---
  (
    cat > "$BRAIN_PATH/me/identity.md" << IDEOF
---
created: ${today_date}
updated: ${today_date}
tags: [identity, core]
status: active
---

# Who I Am

## Basics
- **Name**: ${USER_NAME}
- **Role**: ${USER_ROLE}

## Current Season
- **Focus**: ${USER_FOCUS}
IDEOF
  ) &
  spin "$(t "me/identity.md" "me/identity.md")"

  # --- plan.md ---
  (
    cat > "$BRAIN_PATH/plan.md" << PLANEOF
---
created: ${today_date}
updated: ${today_date}
status: active
---

# Life Direction & Goals

> Your north star. Everything day-to-day should trace back here.

## Mission

<!-- Define your mission — what drives you? -->

## Current Goals

### Goal 1: ${USER_FOCUS}
- Status: Just started
- Key results: (define what success looks like)
PLANEOF
  ) &
  spin "$(t "plan.md" "plan.md")"

  # --- tasks/active.md ---
  (
    cat > "$BRAIN_PATH/tasks/active.md" << TASKEOF
---
updated: ${today_date}
---

# Active Tasks

> What you're working on right now. P0 = drop everything. P3 = nice to have.

## P0

- [ ] ${USER_FOCUS}

## P1

## P2

## P3
TASKEOF
  ) &
  spin "$(t "tasks/active.md" "tasks/active.md")"

  # --- .loci/config.yml ---
  local wake_time wind_time wellbeing_enabled
  case $USER_SCHEDULE in
    1) wake_time="05:30"; wind_time="21:00"; wellbeing_enabled="true" ;;
    2) wake_time="07:00"; wind_time="22:30"; wellbeing_enabled="true" ;;
    3) wake_time="10:00"; wind_time="01:00"; wellbeing_enabled="true" ;;
    4) wake_time="14:00"; wind_time="04:00"; wellbeing_enabled="true" ;;
    5) wake_time="07:00"; wind_time="22:30"; wellbeing_enabled="false" ;;
  esac

  (
    cat > "$BRAIN_PATH/.loci/config.yml" << CFGEOF
# Loci Configuration
# Modify these settings to customize your brain's behavior.

version: 1

language: ${LANG_CHOICE}              # en | zh | mix

persistence:
  mode: auto              # auto | manual
  notify: true            # show save notifications

wellbeing:
  enabled: ${wellbeing_enabled}
  wind_down_time: "${wind_time}"
  wake_up_time: "${wake_time}"
  max_reminders: 2
CFGEOF
  ) &
  spin "$(t ".loci/config.yml" ".loci/config.yml")"

  echo ""
}

# ─── Step 3: Global Configuration ───────────────────────────────────────────
configure_global() {
  CURRENT_STEP=3
  print_step "$(t "Connecting to Claude Code" "连接 Claude Code")"

  # Register brain path globally
  mkdir -p "$HOME/.loci"
  echo "$BRAIN_PATH" > "$HOME/.loci/brain-path"
  print_check "$(t "Brain registered at ~/.loci/brain-path" "大脑路径已注册 ~/.loci/brain-path")"

  # Global CLAUDE.md
  local global_claude="$HOME/.claude/CLAUDE.md"
  mkdir -p "$HOME/.claude"

  if [ -f "$global_claude" ] && grep -q '<!-- loci:start' "$global_claude" 2>/dev/null; then
    print_check "$(t "Global CLAUDE.md already connected" "全局 CLAUDE.md 已连接")"
  else
    if [ -f "$global_claude" ]; then
      cp "$global_claude" "${global_claude}.loci-backup"
      print_check "$(t "Backed up existing ~/.claude/CLAUDE.md" "已备份现有 ~/.claude/CLAUDE.md")"
    fi

    # Read template and replace <brain-path>
    if [ -f "$BRAIN_PATH/templates/global-claude-block.md" ]; then
      local block
      block=$(sed "s|<brain-path>|${BRAIN_PATH}|g" "$BRAIN_PATH/templates/global-claude-block.md")
      printf "\n%s\n" "$block" >> "$global_claude"
    else
      # Inline fallback if template missing
      cat >> "$global_claude" << GEOF

<!-- loci:start v2 -->
## Loci Brain Connection (Global)

- Brain path: \`${BRAIN_PATH}\`

### Automatic Context
- On session start, read \`${BRAIN_PATH}/plan.md\` for life direction
- Read \`${BRAIN_PATH}/tasks/active.md\` for current priorities
- Check \`${BRAIN_PATH}/inbox.md\` for pending items (latest 7 only)

### Persistence (any directory)
When the user mentions tasks, decisions, or insights — save them to the brain:
- Tasks → \`${BRAIN_PATH}/tasks/active.md\`
- Decisions → \`${BRAIN_PATH}/decisions/YYYY-MM-DD-slug.md\`
- Personal info → \`${BRAIN_PATH}/me/\`
- Quick thoughts → \`${BRAIN_PATH}/inbox.md\`
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.

### Cross-Project Memory
- In projects with \`.loci/\` directory: read \`.loci/memory.md\` for project context
- Commands: /loci-sync, /loci-link, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->
GEOF
    fi
    print_check "$(t "Global awareness enabled (~/.claude/CLAUDE.md)" "全局感知已启用 (~/.claude/CLAUDE.md)")"
  fi

  # Copy slash commands
  local global_commands="$HOME/.claude/commands"
  if [ -d "$BRAIN_PATH/templates/commands" ]; then
    mkdir -p "$global_commands"
    cp "$BRAIN_PATH"/templates/commands/*.md "$global_commands/" 2>/dev/null
    print_check "$(t "Slash commands installed" "斜杠命令已安装")"
  fi

  # Merge global settings.json
  local global_settings="$HOME/.claude/settings.json"
  if [ -f "$BRAIN_PATH/templates/global-settings.json" ]; then
    if [ -f "$global_settings" ]; then
      # Check if loci hook already present
      if grep -q "loci-context" "$global_settings" 2>/dev/null; then
        print_check "$(t "Global hooks already configured" "全局钩子已配置")"
      else
        # Simple merge: read template and inject hooks
        # Since we can't use jq/python, we do a careful text merge
        # Back up first
        cp "$global_settings" "${global_settings}.loci-backup"
        # Replace the brain-path placeholder in the template and use it
        local hook_template
        hook_template=$(sed "s|\\\$HOME|${HOME}|g" "$BRAIN_PATH/templates/global-settings.json")
        # If existing file is basically empty or minimal, replace it
        # Otherwise just warn the user
        if [ "$(wc -c < "$global_settings" | tr -d ' ')" -lt 10 ]; then
          echo "$hook_template" > "$global_settings"
          print_check "$(t "Global hooks configured" "全局钩子已配置")"
        else
          print_warn "$(t "~/.claude/settings.json exists — merge hooks manually if needed" "~/.claude/settings.json 已存在 — 如需要请手动合并钩子")"
          print_warn "$(t "  Template: templates/global-settings.json" "  模板：templates/global-settings.json")"
        fi
      fi
    else
      sed "s|\\\$HOME|${HOME}|g" "$BRAIN_PATH/templates/global-settings.json" > "$global_settings"
      print_check "$(t "Global hooks configured" "全局钩子已配置")"
    fi
  fi

  echo ""
}

# ─── Step 4: Git Safety ─────────────────────────────────────────────────────
git_safety() {
  CURRENT_STEP=4
  print_step "$(t "Git safety" "Git 安全配置")"

  # Check if inside a git repo
  if ! git -C "$BRAIN_PATH" rev-parse --is-inside-work-tree &>/dev/null; then
    print_warn "$(t "Not a git repo — skipping" "不是 git 仓库 — 跳过")"
    return
  fi

  # Check origin
  local remote_url
  remote_url=$(git -C "$BRAIN_PATH" remote get-url origin 2>/dev/null || echo "")
  if [[ "$remote_url" == *"codesstar/loci"* ]]; then
    git -C "$BRAIN_PATH" remote remove origin
    print_check "$(t "Disconnected from template repo (your data stays private)" "已断开模板仓库连接（你的数据保持私密）")"
  elif [ -n "$remote_url" ]; then
    print_check "$(t "Origin: ${remote_url}" "远程仓库：${remote_url}")"
  else
    print_check "$(t "No remote origin (good — your data is local)" "没有远程仓库（很好 — 数据在本地）")"
  fi

  # Set hooks path
  git -C "$BRAIN_PATH" config core.hooksPath .githooks
  print_check "$(t "Git hooks path set to .githooks" "Git 钩子路径设置为 .githooks")"

  # Ensure hooks are executable
  if [ -d "$BRAIN_PATH/.githooks" ]; then
    chmod +x "$BRAIN_PATH"/.githooks/* 2>/dev/null
  fi
  if [ -d "$BRAIN_PATH/.loci/hooks" ]; then
    chmod +x "$BRAIN_PATH"/.loci/hooks/*.sh 2>/dev/null
  fi
  if [ -d "$BRAIN_PATH/.claude/hooks" ]; then
    chmod +x "$BRAIN_PATH"/.claude/hooks/*.sh 2>/dev/null
  fi
  print_check "$(t "Hooks set to executable" "钩子已设为可执行")"

  echo ""
}

# ─── Success Screen ──────────────────────────────────────────────────────────
show_success() {
  local schedule_label
  case $USER_SCHEDULE in
    1) schedule_label="$(t "Morning (6am-12pm)" "早晨型 (6am-12pm)")" ;;
    2) schedule_label="$(t "Daytime (9am-6pm)" "白天型 (9am-6pm)")" ;;
    3) schedule_label="$(t "Evening (6pm-12am)" "晚间型 (6pm-12am)")" ;;
    4) schedule_label="$(t "Night owl (10pm-6am)" "夜猫子 (10pm-6am)")" ;;
    5) schedule_label="$(t "Irregular" "不固定")" ;;
  esac

  local lang_label
  case $LANG_CHOICE in
    en)  lang_label="English" ;;
    zh)  lang_label="中文" ;;
    mix) lang_label="中英混合" ;;
  esac

  clear
  echo ""
  echo -e "${CYAN}          .·:·.${NC}"
  echo -e "${CYAN}        .'     '.${NC}"
  echo -e "${CYAN}       /  ${BOLD_CYAN}◐${CYAN}    |${NC}    ${GREEN}$(t "Your brain is ready!" "你的大脑准备好了！")${NC}"
  echo -e "${CYAN}      |    __.·'${NC}"
  echo -e "${CYAN}       \\  (${NC}"
  echo -e "${CYAN}        )  )${NC}"
  echo -e "${CYAN}       /  /${NC}"
  echo -e "${CYAN}      (  (${NC}"
  echo -e "${CYAN}       '··'${NC}"
  echo ""
  echo -e "  ${BOLD_CYAN}┌─────────────────────────────────────────────────────┐${NC}"
  echo -e "  ${BOLD_CYAN}│${NC}  ${DIM}$(t "Name" "名字")${NC}        ${WHITE}${USER_NAME}${NC}"
  echo -e "  ${BOLD_CYAN}│${NC}  ${DIM}$(t "Language" "语言")${NC}    ${WHITE}${lang_label}${NC}"
  echo -e "  ${BOLD_CYAN}│${NC}  ${DIM}$(t "Schedule" "作息")${NC}    ${WHITE}${schedule_label}${NC}"
  echo -e "  ${BOLD_CYAN}│${NC}  ${DIM}$(t "Brain" "路径")${NC}       ${WHITE}${BRAIN_PATH}${NC}"
  echo -e "  ${BOLD_CYAN}├─────────────────────────────────────────────────────┤${NC}"
  echo -e "  ${BOLD_CYAN}│${NC}  ${GREEN}✓${NC} me/identity.md      ${GREEN}✓${NC} .loci/config.yml"
  echo -e "  ${BOLD_CYAN}│${NC}  ${GREEN}✓${NC} plan.md              ${GREEN}✓${NC} ~/.claude/CLAUDE.md"
  echo -e "  ${BOLD_CYAN}│${NC}  ${GREEN}✓${NC} tasks/active.md      ${GREEN}✓${NC} ~/.claude/commands/"
  echo -e "  ${BOLD_CYAN}└─────────────────────────────────────────────────────┘${NC}"
  echo ""
  echo -e "  $(t "Next step" "下一步"):"
  echo ""
  echo -e "    ${BOLD}cd ${BRAIN_PATH} && claude${NC}"
  echo ""
  echo -e "  $(t "Your AI will remember the important things from now on." "从现在开始，你的 AI 会记住重要的事情。")"
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  show_logo
  preflight
  collect_info
  generate_files
  configure_global
  git_safety
  show_success
}

main "$@"
