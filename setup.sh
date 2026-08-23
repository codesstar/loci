#!/bin/bash
# Loci — Memory Palace for AI
# Interactive setup script. Pure bash, zero dependencies.
# Inspired by oh-my-zsh, rustup, and create-next-app.

# Note: NOT using set -e — interactive reads return non-zero which would kill the script

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
BRAIN_CONFIG_PATH="$BRAIN_PATH"
LANG_CHOICE="en"
USER_NAME=""
USER_NICKNAME=""
USER_ROLE=""
USER_FOCUS=""
USER_SCHEDULE=""
USER_ABOUT=""
CONNECT_CLAUDE=1
CONNECT_CODEX=1
CONNECT_WORKBUDDY=0
CONNECT_LABEL=""
TOTAL_STEPS=4
CURRENT_STEP=0
NON_INTERACTIVE=0
FORCE_SETUP=0
SCHEDULE_CHOICE=""
CONNECT_CHOICE="auto"

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

# Flush stdin buffer (prevents arrow key leaking into next read)
# Uses perl for sub-second timeout (bash 3.2 on macOS doesn't support fractional -t)
flush_input() {
  if command -v perl &>/dev/null; then
    perl -e 'use IO::Select; my $s=IO::Select->new(\*STDIN); while($s->can_read(0.05)){sysread(STDIN,$_,1)}' 2>/dev/null
  fi
}

# Text input with left-arrow-to-go-back support
# Sets INPUT_RESULT to the text, or "__BACK__" if user pressed left arrow on empty input
read_text() {
  INPUT_RESULT=""
  printf "    ${CYAN}▸ ${NC}"
  tput cnorm 2>/dev/null
  while true; do
    read -rsn1 ch
    if [[ "$ch" == $'\x1b' ]]; then
      # Read arrow sequence — bash 3.2 supports integer timeout only
      read -rsn2 -t 1 seq
      if [[ "$seq" == '[D' ]] && [ -z "$INPUT_RESULT" ]; then
        # Left arrow on empty input = go back
        INPUT_RESULT="__BACK__"
        return
      fi
      # All other escape sequences (up/down/right) silently ignored
    elif [[ "$ch" == "" ]]; then
      return
    elif [[ "$ch" == $'\x7f' ]] || [[ "$ch" == $'\x08' ]]; then
      if [ -n "$INPUT_RESULT" ]; then
        INPUT_RESULT="${INPUT_RESULT%?}"
        printf "\b \b"
      fi
    else
      INPUT_RESULT="${INPUT_RESULT}${ch}"
      printf "%s" "$ch"
    fi
  done
}

# Interactive arrow-key menu selection (Claude Code style)
# Up/Down = select option, Left = previous question, Right/Enter = confirm
# Returns MENU_RESULT=1..N for selection, MENU_RESULT=0 for "go back"
# Accepts ALLOW_BACK, QUESTION_NUM, QUESTION_TOTAL as env vars
choose() {
  local prompt="$1"
  local allow_back="${ALLOW_BACK:-0}"
  local q_num="${QUESTION_NUM:-0}"
  local q_total="${QUESTION_TOTAL:-0}"
  shift
  local options=("$@")
  local selected=0
  local count=${#options[@]}

  printf "\n"
  # Progress dots: ● for current/done, ○ for remaining
  if [ "$q_total" -gt 0 ]; then
    printf "  "
    for (( i=1; i<=q_total; i++ )); do
      if [ "$i" -lt "$q_num" ]; then
        printf "${GREEN}●${NC} "
      elif [ "$i" -eq "$q_num" ]; then
        printf "${CYAN}●${NC} "
      else
        printf "${DIM}○${NC} "
      fi
    done
    printf "\n"
  fi
  printf "  ${WHITE}${prompt}${NC}\n"

  tput civis 2>/dev/null  # hide cursor

  # Draw initial menu
  for i in "${!options[@]}"; do
    if [ "$i" -eq "$selected" ]; then
      printf "    ${CYAN}● ${WHITE}${options[$i]}${NC}\n"
    else
      printf "    ${DIM}○ ${options[$i]}${NC}\n"
    fi
  done

  # Read arrow keys and enter
  while true; do
    read -rsn1 key
    if [[ "$key" == $'\x1b' ]]; then
      # Read arrow sequence (bash 3.2: only integer timeouts)
      # 1s timeout distinguishes arrow keys (instant) from bare Esc
      read -rsn2 -t 1 arrow
      case "$arrow" in
        '[A') # Up = previous option
          if [ "$selected" -gt 0 ]; then
            selected=$((selected - 1))
          fi
          ;;
        '[B') # Down = next option
          if [ "$selected" -lt $((count - 1)) ]; then
            selected=$((selected + 1))
          fi
          ;;
        '[D') # Left = go back to previous question
          if [ "$allow_back" = "1" ]; then
            tput cnorm 2>/dev/null
            MENU_RESULT=0
            flush_input
            return
          fi
          ;;
        '[C') # Right = confirm selection (same as Enter)
          break
          ;;
        '') # Bare Esc (timeout) = go back
          if [ "$allow_back" = "1" ]; then
            tput cnorm 2>/dev/null
            MENU_RESULT=0
            flush_input
            return
          fi
          ;;
      esac
    elif [[ "$key" == "" ]]; then
      break
    elif [[ "$key" =~ ^[0-9]$ ]] && [ "$key" -ge 1 ] && [ "$key" -le "$count" ]; then
      selected=$((key - 1))
      break
    fi

    # Redraw menu (move cursor up N lines)
    printf "\033[${count}A"
    for i in "${!options[@]}"; do
      printf "\r\033[K"
      if [ "$i" -eq "$selected" ]; then
        printf "    ${CYAN}● ${WHITE}${options[$i]}${NC}\n"
      else
        printf "    ${DIM}○ ${options[$i]}${NC}\n"
      fi
    done
  done

  tput cnorm 2>/dev/null

  # Collapse menu to single selected line
  printf "\033[${count}A"
  for i in "${!options[@]}"; do
    printf "\r\033[K"
  done
  printf "\033[${count}A"
  printf "    ${GREEN}● ${WHITE}${options[$selected]}${NC}\n"
  for (( i=1; i<count; i++ )); do
    printf "\033[K\n"
  done

  MENU_RESULT=$((selected + 1))
  flush_input
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

# ─── CLI Arguments (non-interactive mode, for AI agents & scripts) ───────────
show_help() {
  cat << 'HELPEOF'
Loci setup

Usage:
  ./setup.sh                                        Interactive wizard (default)
  ./setup.sh --non-interactive --name "Alex" [...]  Scriptable setup, no prompts

Non-interactive options:
  --non-interactive, -y   Run without any prompts. Requires --name.
  --name <name>           Your name (required in non-interactive mode)
  --nickname <text>       How the AI should address you     (default: your name)
  --role <text>           What you do, free text            (default: Developer)
  --focus <text>          Most important focus right now    (default: Set up my second brain)
  --schedule <word>       morning|daytime|evening|night|irregular  (default: daytime)
  --about <text>          Anything else worth knowing       (optional)
  --lang <code>           en | zh | mix                     (default: en)
  --connect <target>      auto | all | both | claude | codex | workbuddy | none
                          auto detects installed tools      (default: auto)
                          both = Claude Code + Codex; all adds WorkBuddy too
  --force                 Re-run setup even if this brain is already set up
  --help, -h              Show this help

Example (what an AI agent typically runs):
  ./setup.sh --non-interactive --name "Alex" --role "Developer" \
    --focus "Ship my product" --lang en --connect auto
HELPEOF
}

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --non-interactive|-y) NON_INTERACTIVE=1 ;;
      --name)     USER_NAME="$2"; shift ;;
      --nickname) USER_NICKNAME="$2"; shift ;;
      --role)     USER_ROLE="$2"; shift ;;
      --focus)    USER_FOCUS="$2"; shift ;;
      --schedule) SCHEDULE_CHOICE="$2"; shift ;;
      --about)    USER_ABOUT="$2"; shift ;;
      --lang)     LANG_CHOICE="$2"; shift ;;
      --connect)  CONNECT_CHOICE="$2"; shift ;;
      --force)    FORCE_SETUP=1 ;;
      --help|-h)  show_help; exit 0 ;;
      *) echo "Unknown option: $1 (see ./setup.sh --help)"; exit 1 ;;
    esac
    shift
  done
}

apply_non_interactive_config() {
  if [ -z "$USER_NAME" ]; then
    echo "Error: --non-interactive requires --name. See ./setup.sh --help"
    exit 1
  fi
  USER_ROLE="${USER_ROLE:-Developer}"
  USER_FOCUS="${USER_FOCUS:-Set up my second brain}"

  case "$LANG_CHOICE" in
    en|zh|mix) ;;
    *) echo "Error: --lang must be en, zh, or mix"; exit 1 ;;
  esac

  case "${SCHEDULE_CHOICE:-daytime}" in
    morning)   USER_SCHEDULE=1 ;;
    daytime)   USER_SCHEDULE=2 ;;
    evening)   USER_SCHEDULE=3 ;;
    night)     USER_SCHEDULE=4 ;;
    irregular) USER_SCHEDULE=5 ;;
    *) echo "Error: --schedule must be morning, daytime, evening, night, or irregular"; exit 1 ;;
  esac

  local has_claude=0 has_codex=0 has_workbuddy=0
  if command -v claude &>/dev/null || [ -d "$HOME/.claude" ]; then has_claude=1; fi
  if command -v codex &>/dev/null || [ -d "$HOME/.codex" ]; then has_codex=1; fi
  if [ -d "$HOME/.workbuddy" ]; then has_workbuddy=1; fi
  case "$CONNECT_CHOICE" in
    auto)      CONNECT_CLAUDE=$has_claude; CONNECT_CODEX=$has_codex; CONNECT_WORKBUDDY=$has_workbuddy ;;
    all)       CONNECT_CLAUDE=1; CONNECT_CODEX=1; CONNECT_WORKBUDDY=1 ;;
    both)      CONNECT_CLAUDE=1; CONNECT_CODEX=1; CONNECT_WORKBUDDY=0 ;;
    claude)    CONNECT_CLAUDE=1; CONNECT_CODEX=0; CONNECT_WORKBUDDY=0 ;;
    codex)     CONNECT_CLAUDE=0; CONNECT_CODEX=1; CONNECT_WORKBUDDY=0 ;;
    workbuddy) CONNECT_CLAUDE=0; CONNECT_CODEX=0; CONNECT_WORKBUDDY=1 ;;
    none)      CONNECT_CLAUDE=0; CONNECT_CODEX=0; CONNECT_WORKBUDDY=0 ;;
    *) echo "Error: --connect must be auto, all, both, claude, codex, workbuddy, or none"; exit 1 ;;
  esac

  CONNECT_LABEL=""
  [ "$CONNECT_CLAUDE" -eq 1 ] && CONNECT_LABEL="Claude Code"
  [ "$CONNECT_CODEX" -eq 1 ] && CONNECT_LABEL="${CONNECT_LABEL:+$CONNECT_LABEL + }Codex"
  [ "$CONNECT_WORKBUDDY" -eq 1 ] && CONNECT_LABEL="${CONNECT_LABEL:+$CONNECT_LABEL + }WorkBuddy"
  [ -z "$CONNECT_LABEL" ] && CONNECT_LABEL="Brain only"
}

# ─── Colors for gradient ─────────────────────────────────────────────────────
PURPLE='\033[35m'
LIGHT_PURPLE='\033[95m'
BOLD_PURPLE='\033[1;35m'
TEAL='\033[36m'
LIGHT_TEAL='\033[96m'

# ─── ASCII Art Logo ──────────────────────────────────────────────────────────
show_logo() {
  clear
  printf "\n"
  # Seahorse: proportionally scaled ~50% of v3 original (16 lines, all sections kept)
  printf "${LIGHT_PURPLE}            ,${NC}\n"
  printf "${LIGHT_PURPLE}       ,  /^\\   ___${NC}\n"
  printf "${LIGHT_PURPLE}      /^\\_/ '...' /\`${NC}\n"
  printf "${PURPLE}     ,_\\   ,'  ~ (${NC}\n"
  printf "${PURPLE}      \\__ \\\\.' .-.  )${NC}\n"
  printf "${PURPLE}      / (== ( ${LIGHT_TEAL}◉${PURPLE} ) \\\\${NC}    ${BOLD_CYAN}██╗      ██████╗  ██████╗██╗${NC}\n"
  printf "${TEAL}    ,/ ~~~| \`-'  )${NC}     ${BOLD_CYAN}██║     ██╔═══██╗██╔════╝██║${NC}\n"
  printf "${TEAL}   \"\") |~| \"\"\". ~/${NC}     ${BOLD_CYAN}██║     ██║   ██║██║     ██║${NC}\n"
  printf "${TEAL}     /  \\~\\  \". \\\\${NC}      ${BOLD_CYAN}██║     ██║   ██║██║     ██║${NC}\n"
  printf "${LIGHT_TEAL} (_ =\\ ─┼─ |~| \".\`;${NC}    ${BOLD_CYAN}███████╗╚██████╔╝╚██████╗██║${NC}\n"
  printf "${LIGHT_TEAL}  (_ ~   ══|~/${NC}         ${BOLD_CYAN}╚══════╝ ╚═════╝  ╚═════╝╚═╝${NC}\n"
  printf "${LIGHT_TEAL}   (_ _/  | .\"${NC}\n"
  printf "${LIGHT_TEAL}    (\\_/   )/${NC}\n"
  printf "${LIGHT_TEAL}       | ( .-' \`-.${NC}\n"
  printf "${LIGHT_TEAL}        \\ :\`. \`-' |${NC}\n"
  printf "${LIGHT_TEAL}         \`-._.'^'./${NC}\n"
  printf "\n"
  printf "        ${DIM}──────${NC} ${BOLD_CYAN}Memory Palace for AI${NC} ${DIM}──────${NC}\n"
  printf "\n"
}

# ─── Step 0: Pre-flight Checks ──────────────────────────────────────────────
preflight() {
  clear
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
      if [ "$NON_INTERACTIVE" -eq 1 ]; then
        if [ "$FORCE_SETUP" -eq 0 ]; then
          echo ""
          print_warn "This brain is already set up (plan.md status: ${status}). Nothing changed."
          echo -e "  ${DIM}Re-run with --force to overwrite the existing setup.${NC}"
          exit 0
        fi
      else
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
  fi

  echo ""
  sleep 1
}


# ─── Step 1: Interactive Questions (state machine with back navigation) ──────
# 5 questions total. Left/Right = prev/next question. Up/Down = select option.
collect_info() {
  CURRENT_STEP=1
  LANG_LABEL=""
  SCHEDULE_LABEL=""
  local Q_TOTAL=6
  USER_ABOUT=""

  local step=0  # 0=lang, 1=name, 2=role, 3=focus, 4=schedule, 5=about

  while [ "$step" -le 5 ]; do
    local q_num=$((step + 1))

    # Render screen: header + previous answers + current question
    clear
    printf "\n"
    printf "  ${DIM}[1/$TOTAL_STEPS]${NC} ${BOLD_CYAN}$(t "Tell me about yourself" "聊聊你自己")${NC}\n"
    printf "  ${DIM}$(printf '%.0s─' {1..50})${NC}\n"

    # Show completed answers
    [ "$step" -gt 0 ] && [ -n "$LANG_LABEL" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Language" "语言")${NC}  ${WHITE}${LANG_LABEL}${NC}\n"
    [ "$step" -gt 1 ] && [ -n "$USER_NAME" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Name" "名字")${NC}      ${WHITE}${USER_NAME}${NC}\n"
    [ "$step" -gt 2 ] && [ -n "$USER_ROLE" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Role" "角色")${NC}      ${WHITE}${USER_ROLE}${NC}\n"
    [ "$step" -gt 3 ] && [ -n "$USER_FOCUS" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Focus" "重点")${NC}     ${WHITE}${USER_FOCUS}${NC}\n"
    [ "$step" -gt 4 ] && [ -n "$SCHEDULE_LABEL" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Schedule" "作息")${NC}  ${WHITE}${SCHEDULE_LABEL}${NC}\n"

    case "$step" in
      0) # Language
        ALLOW_BACK=0 QUESTION_NUM=$q_num QUESTION_TOTAL=$Q_TOTAL \
          choose "Language / 语言" "English" "中文"
        case $MENU_RESULT in
          1) LANG_CHOICE="en"; LANG_LABEL="English" ;;
          2) LANG_CHOICE="zh"; LANG_LABEL="中文" ;;
        esac
        step=1
        ;;

      1) # Name
        printf "\n"
        # Progress dots
        printf "  "
        for (( i=1; i<=Q_TOTAL; i++ )); do
          if [ "$i" -lt "$q_num" ]; then printf "${GREEN}●${NC} "
          elif [ "$i" -eq "$q_num" ]; then printf "${CYAN}●${NC} "
          else printf "${DIM}○${NC} "; fi
        done
        printf "\n"
        printf "  ${WHITE}$(t "Your name" "你的名字")${NC}\n"
        read_text
        if [ "$INPUT_RESULT" = "__BACK__" ]; then
          step=0; continue
        elif [ -z "$INPUT_RESULT" ]; then
          continue
        else
          USER_NAME="$INPUT_RESULT"
          printf "\n"
          printf "  ${WHITE}$(t "What should your AI call you?" "想让 AI 怎么称呼你？")${NC}\n"
          printf "  ${DIM}$(t "A nickname, a title, anything — press Enter to just use your name" "昵称、称号都行——按回车直接用名字")${NC}\n"
          read_text
          if [ "$INPUT_RESULT" = "__BACK__" ]; then
            step=1; continue
          fi
          USER_NICKNAME="$INPUT_RESULT"
          step=2
        fi
        ;;

      2) # Role
        ALLOW_BACK=1 QUESTION_NUM=$q_num QUESTION_TOTAL=$Q_TOTAL \
          choose "$(t "What do you do?" "你是做什么的？")" \
          "$(t "Developer" "开发者")" \
          "$(t "Designer" "设计师")" \
          "$(t "Creator" "创作者")" \
          "$(t "Student" "学生")" \
          "$(t "Other" "其他")"
        if [ "$MENU_RESULT" -eq 0 ]; then
          step=1; continue
        fi
        case $MENU_RESULT in
          1) USER_ROLE="Developer" ;;
          2) USER_ROLE="Designer" ;;
          3) USER_ROLE="Creator" ;;
          4) USER_ROLE="Student" ;;
          5)
            clear
            printf "\n"
            printf "  ${DIM}[1/$TOTAL_STEPS]${NC} ${BOLD_CYAN}$(t "Tell me about yourself" "聊聊你自己")${NC}\n"
            printf "  ${DIM}$(printf '%.0s─' {1..50})${NC}\n"
            [ -n "$LANG_LABEL" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Language" "语言")${NC}  ${WHITE}${LANG_LABEL}${NC}\n"
            [ -n "$USER_NAME" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Name" "名字")${NC}      ${WHITE}${USER_NAME}${NC}\n"
            printf "\n"
            printf "  "
            for (( i=1; i<=Q_TOTAL; i++ )); do
              if [ "$i" -lt "$q_num" ]; then printf "${GREEN}●${NC} "
              elif [ "$i" -eq "$q_num" ]; then printf "${CYAN}●${NC} "
              else printf "${DIM}○${NC} "; fi
            done
            printf "\n"
            printf "  ${WHITE}$(t "What do you do?" "你是做什么的？")${NC}\n"
            read_text
            if [ "$INPUT_RESULT" = "__BACK__" ]; then
              step=2; continue
            fi
            USER_ROLE="${INPUT_RESULT:-Other}"
            ;;
        esac
        step=3
        ;;

      3) # Focus
        ALLOW_BACK=1 QUESTION_NUM=$q_num QUESTION_TOTAL=$Q_TOTAL \
          choose "$(t "Most important focus right now?" "你目前最重要的事情是什么？")" \
          "$(t "Ship a product" "做产品上线")" \
          "$(t "Learn a skill" "学一项技能")" \
          "$(t "Build an audience" "做自媒体/涨粉")" \
          "$(t "Get a job" "找工作")" \
          "$(t "Other" "其他")"
        if [ "$MENU_RESULT" -eq 0 ]; then
          step=2; continue
        fi
        case $MENU_RESULT in
          1) USER_FOCUS="Ship a product" ;;
          2) USER_FOCUS="Learn a skill" ;;
          3) USER_FOCUS="Build an audience" ;;
          4) USER_FOCUS="Get a job" ;;
          5)
            clear
            printf "\n"
            printf "  ${DIM}[1/$TOTAL_STEPS]${NC} ${BOLD_CYAN}$(t "Tell me about yourself" "聊聊你自己")${NC}\n"
            printf "  ${DIM}$(printf '%.0s─' {1..50})${NC}\n"
            [ -n "$LANG_LABEL" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Language" "语言")${NC}  ${WHITE}${LANG_LABEL}${NC}\n"
            [ -n "$USER_NAME" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Name" "名字")${NC}      ${WHITE}${USER_NAME}${NC}\n"
            [ -n "$USER_ROLE" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Role" "角色")${NC}      ${WHITE}${USER_ROLE}${NC}\n"
            printf "\n"
            printf "  "
            for (( i=1; i<=Q_TOTAL; i++ )); do
              if [ "$i" -lt "$q_num" ]; then printf "${GREEN}●${NC} "
              elif [ "$i" -eq "$q_num" ]; then printf "${CYAN}●${NC} "
              else printf "${DIM}○${NC} "; fi
            done
            printf "\n"
            printf "  ${WHITE}$(t "Most important focus right now?" "你目前最重要的事情是什么？")${NC}\n"
            read_text
            if [ "$INPUT_RESULT" = "__BACK__" ]; then
              step=3; continue
            fi
            USER_FOCUS="${INPUT_RESULT:-My current project}"
            ;;
        esac
        step=4
        ;;

      4) # Schedule
        ALLOW_BACK=1 QUESTION_NUM=$q_num QUESTION_TOTAL=$Q_TOTAL \
          choose "$(t "When do you usually work?" "你通常什么时候工作？")" \
          "$(t "Morning (6am-12pm)" "早晨型 (6am-12pm)")" \
          "$(t "Daytime (9am-6pm)" "白天型 (9am-6pm)")" \
          "$(t "Evening (6pm-12am)" "晚间型 (6pm-12am)")" \
          "$(t "Night owl (10pm-6am)" "夜猫子 (10pm-6am)")" \
          "$(t "Irregular / varies" "不固定")"
        if [ "$MENU_RESULT" -eq 0 ]; then
          step=3; continue
        fi
        USER_SCHEDULE=$MENU_RESULT
        case $USER_SCHEDULE in
          1) SCHEDULE_LABEL="$(t "Morning" "早晨型")" ;;
          2) SCHEDULE_LABEL="$(t "Daytime" "白天型")" ;;
          3) SCHEDULE_LABEL="$(t "Evening" "晚间型")" ;;
          4) SCHEDULE_LABEL="$(t "Night owl" "夜猫子")" ;;
          5) SCHEDULE_LABEL="$(t "Irregular" "不固定")" ;;
        esac
        step=5
        ;;

      5) # About you (optional)
        printf "\n"
        # Progress dots
        printf "  "
        for (( i=1; i<=Q_TOTAL; i++ )); do
          if [ "$i" -lt "$q_num" ]; then printf "${GREEN}●${NC} "
          elif [ "$i" -eq "$q_num" ]; then printf "${CYAN}●${NC} "
          else printf "${DIM}○${NC} "; fi
        done
        printf "\n"
        printf "  ${WHITE}$(t "Anything else you'd like me to know?" "还有什么想让我知道的吗？")${NC}\n"
        printf "  ${DIM}$(t "Habits, birthday, hobbies — optional, press Enter to skip" "习惯、生日、爱好——可选，按回车跳过")${NC}\n"
        read_text
        if [ "$INPUT_RESULT" = "__BACK__" ]; then
          step=4; continue
        else
          USER_ABOUT="$INPUT_RESULT"
          step=6
        fi
        ;;
    esac
  done

  # Show final summary
  clear
  printf "\n"
  printf "  ${DIM}[1/$TOTAL_STEPS]${NC} ${BOLD_CYAN}$(t "Tell me about yourself" "聊聊你自己")${NC}\n"
  printf "  ${DIM}$(printf '%.0s─' {1..50})${NC}\n"
  printf "  ${GREEN}✓${NC} ${DIM}$(t "Language" "语言")${NC}  ${WHITE}${LANG_LABEL}${NC}\n"
  printf "  ${GREEN}✓${NC} ${DIM}$(t "Name" "名字")${NC}      ${WHITE}${USER_NAME}${NC}\n"
  [ -n "$USER_NICKNAME" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "Call you" "称呼")${NC}  ${WHITE}${USER_NICKNAME}${NC}\n"
  printf "  ${GREEN}✓${NC} ${DIM}$(t "Role" "角色")${NC}      ${WHITE}${USER_ROLE}${NC}\n"
  printf "  ${GREEN}✓${NC} ${DIM}$(t "Focus" "重点")${NC}     ${WHITE}${USER_FOCUS}${NC}\n"
  printf "  ${GREEN}✓${NC} ${DIM}$(t "Schedule" "作息")${NC}  ${WHITE}${SCHEDULE_LABEL}${NC}\n"
  [ -n "$USER_ABOUT" ] && printf "  ${GREEN}✓${NC} ${DIM}$(t "About" "关于你")${NC}    ${WHITE}${USER_ABOUT}${NC}\n"
  printf "\n"
  printf "  ${GREEN}✓${NC} $(t "Got it, ${USER_NAME}!" "收到，${USER_NAME}！")\n"
  sleep 1
}

select_ai_tools() {
  CURRENT_STEP=1

  local has_claude=0
  local has_codex=0
  local has_workbuddy=0
  if command -v claude &>/dev/null || [ -d "$HOME/.claude" ]; then
    has_claude=1
  fi
  if command -v codex &>/dev/null || [ -d "$HOME/.codex" ]; then
    has_codex=1
  fi
  if [ -d "$HOME/.workbuddy" ]; then
    has_workbuddy=1
  fi

  clear
  printf "\n"
  printf "  ${DIM}[1/$TOTAL_STEPS]${NC} ${BOLD_CYAN}$(t "Connect AI tools" "连接 AI 工具")${NC}\n"
  printf "  ${DIM}$(printf '%.0s─' {1..50})${NC}\n"
  printf "  ${DIM}$(t "Loci gives all your AI tools one shared local brain." "Loci 让你的所有 AI 工具共用一个本地大脑。")${NC}\n"
  printf "\n"
  [ "$has_claude" -eq 1 ] && printf "  ${GREEN}✓${NC} Claude Code\n" || printf "  ${YELLOW}!${NC} Claude Code $(t "not detected" "未检测到")\n"
  [ "$has_codex" -eq 1 ] && printf "  ${GREEN}✓${NC} Codex\n" || printf "  ${YELLOW}!${NC} Codex $(t "not detected" "未检测到")\n"
  [ "$has_workbuddy" -eq 1 ] && printf "  ${GREEN}✓${NC} WorkBuddy\n"

  if [ "$has_claude" -eq 1 ] && [ "$has_codex" -eq 1 ]; then
    ALLOW_BACK=0 QUESTION_NUM=6 QUESTION_TOTAL=6 \
      choose "$(t "Which tools should share this brain?" "哪些工具要共用这个大脑？")" \
      "$(t "Claude Code + Codex (Recommended)" "Claude Code + Codex（推荐）")" \
      "$(t "Claude Code only" "只接 Claude Code")" \
      "$(t "Codex only" "只接 Codex")" \
      "$(t "Create brain only" "只创建本地大脑")"
    case $MENU_RESULT in
      1) CONNECT_CLAUDE=1; CONNECT_CODEX=1; CONNECT_LABEL="Claude Code + Codex" ;;
      2) CONNECT_CLAUDE=1; CONNECT_CODEX=0; CONNECT_LABEL="Claude Code" ;;
      3) CONNECT_CLAUDE=0; CONNECT_CODEX=1; CONNECT_LABEL="Codex" ;;
      4) CONNECT_CLAUDE=0; CONNECT_CODEX=0; CONNECT_LABEL="$(t "Brain only" "仅本地大脑")" ;;
    esac
  elif [ "$has_claude" -eq 1 ]; then
    ALLOW_BACK=0 QUESTION_NUM=6 QUESTION_TOTAL=6 \
      choose "$(t "Connect Loci to Claude Code?" "要接入 Claude Code 吗？")" \
      "$(t "Claude Code (Recommended)" "Claude Code（推荐）")" \
      "$(t "Create brain only" "只创建本地大脑")"
    case $MENU_RESULT in
      1) CONNECT_CLAUDE=1; CONNECT_CODEX=0; CONNECT_LABEL="Claude Code" ;;
      2) CONNECT_CLAUDE=0; CONNECT_CODEX=0; CONNECT_LABEL="$(t "Brain only" "仅本地大脑")" ;;
    esac
  elif [ "$has_codex" -eq 1 ]; then
    ALLOW_BACK=0 QUESTION_NUM=6 QUESTION_TOTAL=6 \
      choose "$(t "Connect Loci to Codex?" "要接入 Codex 吗？")" \
      "$(t "Codex (Recommended)" "Codex（推荐）")" \
      "$(t "Create brain only" "只创建本地大脑")"
    case $MENU_RESULT in
      1) CONNECT_CLAUDE=0; CONNECT_CODEX=1; CONNECT_LABEL="Codex" ;;
      2) CONNECT_CLAUDE=0; CONNECT_CODEX=0; CONNECT_LABEL="$(t "Brain only" "仅本地大脑")" ;;
    esac
  else
    CONNECT_CLAUDE=0
    CONNECT_CODEX=0
    CONNECT_LABEL="$(t "Brain only" "仅本地大脑")"
    printf "\n"
    print_warn "$(t "No Claude Code or Codex install detected. Creating the brain only." "没有检测到 Claude Code 或 Codex，先只创建本地大脑。")"
    sleep 1
  fi

  if [ "$has_workbuddy" -eq 1 ]; then
    ALLOW_BACK=0 QUESTION_NUM=6 QUESTION_TOTAL=6 \
      choose "$(t "WorkBuddy detected — connect it to the same brain?" "检测到 WorkBuddy——也接入同一个大脑吗？")" \
      "$(t "Yes, connect WorkBuddy (Recommended)" "接入 WorkBuddy（推荐）")" \
      "$(t "Skip WorkBuddy" "跳过 WorkBuddy")"
    case $MENU_RESULT in
      1)
        CONNECT_WORKBUDDY=1
        if [ "$CONNECT_LABEL" = "$(t "Brain only" "仅本地大脑")" ]; then
          CONNECT_LABEL="WorkBuddy"
        else
          CONNECT_LABEL="$CONNECT_LABEL + WorkBuddy"
        fi
        ;;
      2) CONNECT_WORKBUDDY=0 ;;
    esac
  fi
}

# ─── Step 2: File Generation ────────────────────────────────────────────────
generate_files() {
  CURRENT_STEP=2
  echo ""
  print_step "$(t "Setting up your brain" "配置你的大脑")"

  local today_date
  today_date="$(today)"
  local now_iso task_slug task_id json_focus
  now_iso="$(date '+%Y-%m-%dT%H:%M:%S%z')"
  task_slug="$(printf "%s" "$USER_FOCUS" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9][^a-z0-9]*/_/g; s/^_*//; s/_*$//; s/^\(.\{48\}\).*/\1/')"
  [ -z "$task_slug" ] && task_slug="first_task"
  task_id="task_$(printf "%s" "$today_date" | tr -d '-')_${task_slug}"
  json_focus="${USER_FOCUS//\\/\\\\}"
  json_focus="${json_focus//\"/\\\"}"

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
$([ -n "${USER_ABOUT}" ] && printf "\n## About Me\n${USER_ABOUT}")
IDEOF
  ) &
  spin "$(t "me/identity.md" "me/identity.md")"

  # --- me/preferences.md ---
  local pref_call="${USER_NICKNAME:-$USER_NAME}"
  local pref_lang
  case "$LANG_CHOICE" in
    zh)  pref_lang="中文" ;;
    mix) pref_lang="中文为主，中英混用" ;;
    *)   pref_lang="English" ;;
  esac
  (
    cat > "$BRAIN_PATH/me/preferences.md" << PREFEOF
---
created: ${today_date}
updated: ${today_date}
tags: [preferences, core]
status: active
---

# How to Work With Me

## Address Me As

- **Call me**: ${pref_call}

## Language & Tone

- **Language**: ${pref_lang}

## Reply Style

<!-- e.g. "short answers first" / "no emoji" — tell your AI and it lands here -->

## Work

<!-- work defaults, e.g. "docs start with a TL;DR" / "外发内容先给我看草稿" -->

## Do / Don't

<!-- standing rules for your AI, e.g. "Don't schedule anything before 10am" -->
PREFEOF
  ) &
  spin "$(t "me/preferences.md" "me/preferences.md")"

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

  # --- tasks/tasks.json ---
  (
    cat > "$BRAIN_PATH/tasks/tasks.json" << TASKDBEOF
{
  "tasks": [
    {
      "id": "${task_id}",
      "title": "${json_focus}",
      "status": "open",
      "date": null,
      "startTime": null,
      "endTime": null,
      "project": null,
      "source": "setup",
      "createdAt": "${now_iso}",
      "updatedAt": "${now_iso}",
      "completedAt": null,
      "archivedAt": null
    }
  ]
}
TASKDBEOF
  ) &
  spin "$(t "tasks/tasks.json" "tasks/tasks.json")"

  # --- tasks/active.md ---
  (
    cat > "$BRAIN_PATH/tasks/active.md" << TASKEOF
---
updated: ${today_date}
schema: task-view-v1
source: tasks.json
---

# Active Tasks

> Generated context cache from \`tasks/tasks.json\`. Do not edit by hand.

## Open

- [ ] ${USER_FOCUS} <!-- id: ${task_id}; source: setup; updated: ${now_iso} -->

## Stale

<!-- No stale tasks. -->

## Recently Done

<!-- No recently completed tasks. -->
TASKEOF
  ) &
  spin "$(t "tasks/active.md" "tasks/active.md")"

  # Re-render active.md with the authoritative renderer so it is byte-identical
  # to what `loci-task.js validate` expects (avoids a day-one "stale" warning).
  if command -v node >/dev/null 2>&1 && [ -f "$BRAIN_PATH/scripts/loci-task.js" ]; then
    node "$BRAIN_PATH/scripts/loci-task.js" rebuild >/dev/null 2>&1 || true
  fi

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

  # --- .loci/status.yml (user state — local, gitignored) ---
  if [ ! -f "$BRAIN_PATH/.loci/status.yml" ]; then
    cat > "$BRAIN_PATH/.loci/status.yml" << STEOF
# User State — Auto-updated by the AI based on conversation signals.
# You can also set it manually by telling the AI how you feel.
#
# Fields:
#   state:    fresh-start | focused | exploring | winding-down | low-energy | away
#   energy:   low | moderate | high
#   updated:  ISO timestamp of last update
#   ttl:      how long this state is valid (e.g. "4h", "1d")
#   context:  free-text description of current situation
#   override: user-set values (highest priority, expires after ttl)

state: fresh-start
energy: null
updated: null
ttl: 4h
context: "New brain — not yet personalized"
STEOF
  fi

  # --- .loci/dashboard/data.json (zero-dependency dashboard) ---
  local about_json=""
  if [ -n "$USER_ABOUT" ]; then
    # Escape quotes and newlines for JSON
    local escaped_about
    escaped_about=$(printf '%s' "$USER_ABOUT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')
    about_json="<h2>About Me</h2><p>${escaped_about}</p>"
  fi

  mkdir -p "$BRAIN_PATH/.loci/dashboard"
  (
    cat > "$BRAIN_PATH/.loci/dashboard/data.json" << DJEOF
{
  "config": {
    "title": "Loci Dashboard",
    "username": "${USER_NAME}",
    "description": "Memory Palace for AI"
  },
  "plan": {
    "meta": { "created": "${today_date}", "updated": "${today_date}", "status": "active" },
    "content": "<h1>Life Direction &amp; Goals</h1><blockquote>Your north star.</blockquote><h2>Current Goals</h2><h3>Goal 1: ${USER_FOCUS}</h3><ul><li>Status: Just started</li></ul>",
    "filename": "plan.md",
    "path": "plan.md"
  },
  "inbox": {
    "content": "<h1>Inbox</h1><blockquote>Brain dump. Sort weekly.</blockquote>",
    "meta": { "updated": "${today_date}" },
    "items": []
  },
  "me": {
    "identity": {
      "meta": { "created": "${today_date}", "updated": "${today_date}", "tags": ["identity", "core"], "status": "active" },
      "content": "<h1>Who I Am</h1><h2>Basics</h2><ul><li><strong>Name</strong>: ${USER_NAME}</li><li><strong>Role</strong>: ${USER_ROLE}</li></ul><h2>Current Season</h2><ul><li><strong>Focus</strong>: ${USER_FOCUS}</li></ul>${about_json}",
      "filename": "identity.md",
      "path": "me/identity.md"
    },
    "values": { "meta": { "created": "${today_date}", "tags": ["values"], "status": "template" }, "content": "<h1>Values &amp; Principles</h1>", "filename": "values.md", "path": "me/values.md" },
    "wellbeing": { "meta": { "created": "${today_date}", "tags": ["wellbeing"], "status": "template" }, "content": "<h1>Wellbeing</h1>", "filename": "wellbeing.md", "path": "me/wellbeing.md" },
    "insights": { "meta": { "created": "${today_date}", "tags": ["insights"], "status": "template" }, "content": "<h1>Insights</h1>", "filename": "insights.md", "path": "me/insights.md" },
    "learned": { "meta": { "created": "${today_date}", "tags": ["learning"], "status": "template" }, "content": "<h1>What I've Learned</h1>", "filename": "learned.md", "path": "me/learned.md" },
    "evolution": { "meta": { "created": "${today_date}", "tags": ["evolution"] }, "content": "<h1>Evolution Timeline</h1>", "filename": "evolution.md", "path": "me/evolution.md" },
    "evolution_entries": []
  },
  "tasks": {
    "active": {
      "meta": { "updated": "${today_date}", "schema": "task-view-v1", "source": "tasks.json" },
      "content": "<h1>Active Tasks</h1>",
      "filename": "active.md",
      "path": "tasks/active.md"
    },
    "records": [
      {
        "id": "${task_id}",
        "title": "${json_focus}",
        "text": "${json_focus}",
        "status": "open",
        "done": false,
        "date": null,
        "startTime": null,
        "endTime": null,
        "project": null,
        "source": "setup",
        "createdAt": "${now_iso}",
        "updatedAt": "${now_iso}",
        "completedAt": null,
        "archivedAt": null
      }
    ],
    "active_tasks": { "P1": [{ "id": "${task_id}", "text": "${json_focus}", "title": "${json_focus}", "done": false, "status": "open", "date": null, "stale": false }] },
    "finished": []
  },
  "planning": { "daily": [], "monthly": [], "quarterly": [], "reviews": [], "journal": [], "calendar_events": {} },
  "people": { "contacts": [], "meetings": [] },
  "decisions": [],
  "finance": { "files": [] },
  "content": { "files": [], "platforms": { "brands": [], "accounts": [] } },
  "learning": [],
  "links": [],
  "references": { "files": [], "total": 0 },
  "network": { "nodes": [], "memories": 0, "connections": 0, "days_active": 0 },
  "stats": { "total_files": 6, "total_tasks": 1, "done_tasks": 0, "total_people": 0, "total_decisions": 0, "total_daily_plans": 0, "total_monthly_plans": 0, "total_quarterly_plans": 0 },
  "build_time": "${today_date} $(date '+%H:%M:%S')"
}
DJEOF
  ) &
  spin "$(t ".loci/dashboard/data.json" ".loci/dashboard/data.json")"

  # --- .loci/activity/<YYYY-MM>.md (activity ledger — audit layer) ---
  (
    mkdir -p "$BRAIN_PATH/.loci/activity"
    activity_month="$BRAIN_PATH/.loci/activity/$(date +%Y-%m).md"
    if [ ! -f "$activity_month" ]; then
      cat > "$activity_month" << ACTEOF
<!-- Activity ledger — a plain-language log of every change made to your brain.
     The AI appends one line per change; ask "what did I do today?" to get a timeline.
     Not loaded into context automatically. One file per month. -->
ACTEOF
    fi
  ) &
  spin "$(t ".loci/activity/" ".loci/activity/")"

  # --- notes/index.md (the user's own notes — index of external + inline notes) ---
  (
    mkdir -p "$BRAIN_PATH/notes"
    notes_index="$BRAIN_PATH/notes/index.md"
    if [ ! -f "$notes_index" ]; then
      cat > "$notes_index" << NOTESEOF
---
updated:
---

# Notes

> Your own notes — pointers to where they live. One line each.
> Format: \`- <title> · <link or local path> · <one-line gist> · #tags\`
> External notes (Obsidian / Feishu / Notion) stay in their app; only the pointer lives here.
> Short inline notes become notes/<slug>.md and also get a line here.
NOTESEOF
    fi
  ) &
  spin "$(t "notes/" "notes/")"

  echo ""
}

# ─── Step 3: Global Configuration ───────────────────────────────────────────
configure_global() {
  CURRENT_STEP=3
  print_step "$(t "Connecting to AI tools" "连接 AI 工具")"

  # Register brain path globally. Native Node writes a portable Windows path
  # (G:/loci rather than Git Bash's /g/loci) and backs up an older pointer.
  mkdir -p "$HOME/.loci"
  if command -v node >/dev/null 2>&1 && [ -f "$BRAIN_PATH/scripts/loci-path.js" ]; then
    local node_brain="$BRAIN_PATH"
    local node_home="$HOME"
    local node_platform
    node_platform=$(node -p 'process.platform' 2>/dev/null | tr -d '\r' || printf '')
    # Git Bash's /tmp and other virtual mounts cannot be translated safely by
    # string rules. Ask the environment that created the path for its native
    # spelling before handing it to Node.
    if [ "$node_platform" = "win32" ] && command -v cygpath >/dev/null 2>&1; then
      node_brain=$(cygpath -m "$BRAIN_PATH")
      node_home=$(cygpath -m "$HOME")
    elif [ "$node_platform" = "win32" ] && command -v wslpath >/dev/null 2>&1 && [[ "${BRAIN_PATH}" == /mnt/* ]]; then
      node_brain=$(wslpath -m "$BRAIN_PATH")
      node_home=$(wslpath -m "$HOME" 2>/dev/null || printf '%s' "$HOME")
    fi
    if registered_brain=$(node "$BRAIN_PATH/scripts/loci-path.js" register --brain "$node_brain" --home "$node_home" --force 2>/dev/null); then
      BRAIN_CONFIG_PATH="$registered_brain"
    else
      printf '%s\n' "$BRAIN_PATH" > "$HOME/.loci/brain-path"
    fi
  else
    printf '%s\n' "$BRAIN_PATH" > "$HOME/.loci/brain-path"
  fi
  print_check "$(t "Brain registered at ~/.loci/brain-path" "大脑路径已注册 ~/.loci/brain-path")"

  if [ "$CONNECT_CLAUDE" -eq 1 ]; then
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
      local escaped_brain
      escaped_brain=$(printf '%s' "$BRAIN_CONFIG_PATH" | sed 's/[&|]/\\&/g')
      block=$(sed "s|<brain-path>|${escaped_brain}|g" "$BRAIN_PATH/templates/global-claude-block.md")
      printf "\n%s\n" "$block" >> "$global_claude"
    else
      # Inline fallback if template missing
      cat >> "$global_claude" << GEOF

<!-- loci:start v2 -->
## Loci Brain Connection (Global)

- Brain path: \`${BRAIN_CONFIG_PATH}\`

### Automatic Context
- If a Loci startup map was injected by a SessionStart hook, do not run another command. Otherwise run exactly one platform command: native Windows PowerShell/cmd → \`& "${BRAIN_CONFIG_PATH}/scripts/loci-context.cmd"\`; macOS/Linux/WSL/Git Bash → \`bash "${BRAIN_CONFIG_PATH}/scripts/loci-context.sh"\`. Never run both or retry. The map contains only standing preferences and on-demand pointers; plans, tasks, inbox, journals, and project memory remain on demand.

### Persistence (any directory)
When the user mentions tasks, decisions, or insights — save them to the brain:
- Tasks → use the guarded task writer, not manual JSON edits:
  - Preferred: Dashboard API when \`${BRAIN_CONFIG_PATH}/.loci/dashboard/server.js\` is running.
  - Fallback: run \`node ${BRAIN_CONFIG_PATH}/scripts/loci-task.js ...\`.
  - Validate with \`node ${BRAIN_CONFIG_PATH}/scripts/loci-task.js validate\`.
- Task with specific time → still write ONLY to \`${BRAIN_CONFIG_PATH}/tasks/tasks.json\` via the guarded writer; it is NOT projected onto the calendar (the dashboard reminder reads timed tasks straight from the task pool)
- Schedule-only time block → guarded writer/API writes only to \`${BRAIN_CONFIG_PATH}/tasks/calendar.json\`
- Do not hand-edit \`${BRAIN_CONFIG_PATH}/tasks/tasks.json\` or \`${BRAIN_CONFIG_PATH}/tasks/calendar.json\` except as an emergency fallback.
- Decisions → \`${BRAIN_CONFIG_PATH}/decisions/YYYY-MM-DD-slug.md\`
- Personal memory → \`${BRAIN_CONFIG_PATH}/me/\` (identity, values, wellbeing, insights, learned, evolution — read \`me/README.md\` first)
- Quick thoughts → \`${BRAIN_CONFIG_PATH}/inbox.md\`
- Links / materials → \`${BRAIN_CONFIG_PATH}/references/YYYY-MM-DD-slug.md\`
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.

### Cross-Project Memory
- Loci aggregates memory, it does not own it: a serious project's memory belongs in that project's own repo (\`.loci/memory.md\` + \`.loci/profile.md\` + \`.loci/progress/\` + \`.loci/decisions/\`), while the brain keeps only a one-line index in \`${BRAIN_CONFIG_PATH}/projects/index.md\`.
- In connected project repos: read \`.loci/memory.md\` first for restart context. Read \`.loci/profile.md\` for stable project details, \`.loci/progress/YYYY-MM.md\` for project progress, and \`.loci/decisions/\` for rationale only when relevant.
- In connected project repos: write durable project decisions to \`.loci/decisions/YYYY-MM-DD-slug.md\`; write project progress to \`.loci/progress/YYYY-MM.md\`; update \`.loci/memory.md\` only for current state / Now-Next / active decisions / risks; update \`.loci/profile.md\` for milestones, key people, files, scope, and conventions.
- Tags: \`[decision]\` and project-local facts stay in the project repo. Promote only \`[insight]\` / \`[milestone]\` summaries to the brain's project index when they matter outside the repo. \`[local]\` \`[debug]\` \`[wip]\` stay local.
- Connect projects through the guarded writer when available: \`node ${BRAIN_CONFIG_PATH}/scripts/loci-project.js connect --repo <repo-path> --brain ${BRAIN_CONFIG_PATH} --name "<project>" --description "<one-line>"\`. It creates project memory, injects both \`CLAUDE.md\` and \`AGENTS.md\`, updates \`.gitignore\`, and writes the brain index.
- Commands: /loci-sync, /loci-settings, /loci-scan, /loci-consolidate
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

  # Install the native Node SessionStart hook and keep the shell fallback for
  # existing settings files from older releases.
  local global_hooks="$HOME/.claude/hooks"
  if [ -f "$BRAIN_PATH/.claude/hooks/loci-context.js" ]; then
    mkdir -p "$global_hooks"
    cp "$BRAIN_PATH/.claude/hooks/loci-context.js" "$global_hooks/loci-context.js" 2>/dev/null
    chmod +x "$global_hooks/loci-context.js" 2>/dev/null
    if [ -f "$BRAIN_PATH/.claude/hooks/loci-context.sh" ]; then
      cp "$BRAIN_PATH/.claude/hooks/loci-context.sh" "$global_hooks/loci-context.sh" 2>/dev/null
      chmod +x "$global_hooks/loci-context.sh" 2>/dev/null
    fi
    print_check "$(t "Global context hook installed" "全局上下文钩子已安装")"
  fi

  # Merge global settings.json
  local global_settings="$HOME/.claude/settings.json"
  if command -v node >/dev/null 2>&1 && [ -f "$BRAIN_PATH/scripts/loci-claude-settings.js" ]; then
    if node "$BRAIN_PATH/scripts/loci-claude-settings.js" install --home "$HOME" >/dev/null 2>&1; then
      print_check "$(t "Global Node context hook configured" "全局 Node 上下文钩子已配置")"
    else
      print_warn "$(t "Claude settings.json could not be merged safely and was left unchanged" "Claude settings.json 无法安全合并，已保持原样")"
    fi
  elif [ -f "$BRAIN_PATH/templates/global-settings.json" ]; then
    # No Node: keep the older Bash hook on Unix-like installations instead of
    # writing a Node command that cannot run.
    local hook_template
    hook_template=$(sed "s|\\\$HOME|${HOME}|g" "$BRAIN_PATH/templates/global-settings.json" \
      | sed "s|node \"${HOME}/.claude/hooks/loci-context.js\"|bash \"${HOME}/.claude/hooks/loci-context.sh\"|")
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
      printf '%s\n' "$hook_template" > "$global_settings"
      print_check "$(t "Global hooks configured" "全局钩子已配置")"
    fi
  fi
  else
    print_warn "$(t "Claude Code connection skipped" "已跳过 Claude Code 接入")"
  fi

  # ─── Codex CLI (~/.codex/AGENTS.md) ──────────────────────────────────────
  local global_codex="$HOME/.codex/AGENTS.md"
  if [ "$CONNECT_CODEX" -eq 1 ]; then
    mkdir -p "$HOME/.codex"

    if [ -f "$global_codex" ] && grep -q '<!-- loci:start' "$global_codex" 2>/dev/null; then
      print_check "$(t "Codex AGENTS.md already connected" "Codex AGENTS.md 已连接")"
    else
      if [ -f "$global_codex" ]; then
        cp "$global_codex" "${global_codex}.loci-backup"
        print_check "$(t "Backed up existing ~/.codex/AGENTS.md" "已备份现有 ~/.codex/AGENTS.md")"
      fi

      # Read the same global template Claude Code uses so both tools follow identical rules.
      if [ -f "$BRAIN_PATH/templates/global-claude-block.md" ]; then
        local block
        local escaped_brain
        escaped_brain=$(printf '%s' "$BRAIN_CONFIG_PATH" | sed 's/[&|]/\\&/g')
        block=$(sed "s|<brain-path>|${escaped_brain}|g" "$BRAIN_PATH/templates/global-claude-block.md")
        printf "\n%s\n" "$block" >> "$global_codex"
      else
        # Inline fallback if template missing
        cat >> "$global_codex" << CODEXEOF

<!-- loci:start v2 -->
## Loci Brain Connection (Global)

- Brain path: \`${BRAIN_CONFIG_PATH}\`
- These rules apply **in every project and directory**, not just the brain folder.
- Claude Code, Codex and WorkBuddy can share this same local brain.

### Automatic Context
- If a Loci startup map was injected by a SessionStart hook, do not run another command. Otherwise run exactly one platform command: native Windows PowerShell/cmd → \`& "${BRAIN_CONFIG_PATH}/scripts/loci-context.cmd"\`; macOS/Linux/WSL/Git Bash → \`bash "${BRAIN_CONFIG_PATH}/scripts/loci-context.sh"\`. Never run both or retry. The map contains only standing preferences and on-demand pointers; plans, tasks, inbox, journals, and project memory remain on demand.

### Persistence (any directory)
When the user mentions tasks, decisions, or insights — save them to the brain:
- Tasks → use the guarded task writer, not manual JSON edits:
  - Preferred: Dashboard API when \`${BRAIN_CONFIG_PATH}/.loci/dashboard/server.js\` is running.
  - Fallback: run \`node ${BRAIN_CONFIG_PATH}/scripts/loci-task.js ...\`.
  - Validate with \`node ${BRAIN_CONFIG_PATH}/scripts/loci-task.js validate\`.
- Task with specific time → still write ONLY to \`${BRAIN_CONFIG_PATH}/tasks/tasks.json\` via the guarded writer; it is NOT projected onto the calendar (the dashboard reminder reads timed tasks straight from the task pool)
- Schedule-only time block → guarded writer/API writes only to \`${BRAIN_CONFIG_PATH}/tasks/calendar.json\`
- Do not hand-edit \`${BRAIN_CONFIG_PATH}/tasks/tasks.json\` or \`${BRAIN_CONFIG_PATH}/tasks/calendar.json\` except as an emergency fallback.
- Decisions → \`${BRAIN_CONFIG_PATH}/decisions/YYYY-MM-DD-slug.md\`
- Personal memory → \`${BRAIN_CONFIG_PATH}/me/\` (identity, values, wellbeing, insights, learned, evolution — read \`me/README.md\` first)
- Quick thoughts → \`${BRAIN_CONFIG_PATH}/inbox.md\`
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.
- **Dashboard**: if \`server.js\` is running (\`node ${BRAIN_CONFIG_PATH}/.loci/dashboard/server.js\`), use its API. Otherwise use \`node ${BRAIN_CONFIG_PATH}/scripts/loci-task.js ...\` for task/schedule writes.

### Cross-Project Memory
- Loci aggregates memory, it does not own it: a serious project's memory belongs in that project's own repo (\`.loci/memory.md\` + \`.loci/profile.md\` + \`.loci/progress/\` + \`.loci/decisions/\`), while the brain keeps only a one-line index in \`${BRAIN_CONFIG_PATH}/projects/index.md\`.
- In connected project repos: read \`.loci/memory.md\` first for restart context. Read \`.loci/profile.md\` for stable project details, \`.loci/progress/YYYY-MM.md\` for project progress, and \`.loci/decisions/\` for rationale only when relevant.
- In connected project repos: write durable project decisions to \`.loci/decisions/YYYY-MM-DD-slug.md\`; write project progress to \`.loci/progress/YYYY-MM.md\`; update \`.loci/memory.md\` only for current state / Now-Next / active decisions / risks; update \`.loci/profile.md\` for milestones, key people, files, scope, and conventions.
- Tags: \`[decision]\` and project-local facts stay in the project repo. Promote only \`[insight]\` / \`[milestone]\` summaries to the brain's project index when they matter outside the repo. \`[local]\` \`[debug]\` \`[wip]\` stay local.
- Connect projects through the guarded writer when available: \`node ${BRAIN_CONFIG_PATH}/scripts/loci-project.js connect --repo <repo-path> --brain ${BRAIN_CONFIG_PATH} --name "<project>" --description "<one-line>"\`. It creates project memory, injects both \`CLAUDE.md\` and \`AGENTS.md\`, updates \`.gitignore\`, and writes the brain index.

### Commands
/loci-sync, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->
CODEXEOF
      fi
      print_check "$(t "Codex awareness enabled (~/.codex/AGENTS.md)" "Codex 全局感知已启用 (~/.codex/AGENTS.md)")"
    fi

    # Merge a native Codex SessionStart hook without overwriting user hooks.
    # setup.sh can run without Node, so AGENTS.md remains the safe fallback.
    if command -v node >/dev/null 2>&1 && [ -f "$BRAIN_PATH/scripts/loci-codex-hook.js" ]; then
      if node "$BRAIN_PATH/scripts/loci-codex-hook.js" install --brain "$BRAIN_CONFIG_PATH" --home "$HOME" >/dev/null 2>&1; then
        print_check "$(t "Codex SessionStart hook installed (review once with /hooks)" "Codex SessionStart 钩子已安装（请用 /hooks 审核一次）")"
      else
        print_warn "$(t "Codex hooks.json was left unchanged because it could not be merged safely" "Codex hooks.json 无法安全合并，已保持原样")"
      fi
    else
      print_warn "$(t "Node not found — Codex hook skipped; AGENTS.md fallback remains active" "未找到 Node — 已跳过 Codex 钩子，AGENTS.md 兜底仍可用")"
    fi
  else
    print_warn "$(t "Codex connection skipped" "已跳过 Codex 接入")"
  fi

  # ─── WorkBuddy (~/.workbuddy/MEMORY.md) ──────────────────────────────────
  # WorkBuddy loads MEMORY.md as user-level long-term memory each session —
  # same universal method as any other tool: drop the loci block in there.
  local global_wb="$HOME/.workbuddy/MEMORY.md"
  if [ "$CONNECT_WORKBUDDY" -eq 1 ]; then
    if [ -f "$global_wb" ] && grep -q '<!-- loci:start' "$global_wb" 2>/dev/null; then
      print_check "$(t "WorkBuddy MEMORY.md already connected" "WorkBuddy MEMORY.md 已连接")"
    elif [ ! -f "$BRAIN_PATH/templates/global-claude-block.md" ]; then
      print_warn "$(t "templates/global-claude-block.md missing — WorkBuddy connection skipped" "缺少 templates/global-claude-block.md — 已跳过 WorkBuddy 接入")"
    else
      mkdir -p "$HOME/.workbuddy"
      if [ -f "$global_wb" ]; then
        cp "$global_wb" "${global_wb}.loci-backup"
        print_check "$(t "Backed up existing ~/.workbuddy/MEMORY.md" "已备份现有 ~/.workbuddy/MEMORY.md")"
      else
        printf '# MEMORY.md — user-level long-term memory\n' > "$global_wb"
      fi
      local wb_block
      local escaped_brain
      escaped_brain=$(printf '%s' "$BRAIN_CONFIG_PATH" | sed 's/[&|]/\\&/g')
      wb_block=$(sed "s|<brain-path>|${escaped_brain}|g" "$BRAIN_PATH/templates/global-claude-block.md")
      printf "\n%s\n" "$wb_block" >> "$global_wb"
      print_check "$(t "WorkBuddy awareness enabled (~/.workbuddy/MEMORY.md)" "WorkBuddy 全局感知已启用 (~/.workbuddy/MEMORY.md)")"
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

# ─── CLI Launcher ────────────────────────────────────────────────────────────
# Install the `loci` command (~/.local/bin/loci → <brain>/bin/loci) so the user
# can open the dashboard from anywhere. No sudo; PATH is patched for new shells.
install_launcher() {
  local launcher_src="$BRAIN_PATH/bin/loci"
  [ -f "$launcher_src" ] || return 0
  chmod +x "$launcher_src" 2>/dev/null
  local bin_dir="$HOME/.local/bin"
  mkdir -p "$bin_dir"
  ln -sf "$launcher_src" "$bin_dir/loci"
  print_check "$(t "'loci' command installed" "'loci' 命令已安装")"

  case ":$PATH:" in
    *":$bin_dir:"*) : ;;  # already on PATH
    *)
      local added=0 rc
      for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
        if [ -f "$rc" ] && ! grep -q '# loci:path' "$rc" 2>/dev/null; then
          printf '\nexport PATH="$HOME/.local/bin:$PATH" # loci:path\n' >> "$rc"
          added=1
        fi
      done
      if [ "$added" -eq 0 ] && [ ! -f "$HOME/.zshrc" ] && [ ! -f "$HOME/.bashrc" ]; then
        printf 'export PATH="$HOME/.local/bin:$PATH" # loci:path\n' >> "$HOME/.zshrc"
        added=1
      fi
      [ "$added" -eq 1 ] && print_check "$(t "Added ~/.local/bin to PATH (takes effect in new terminals)" "已把 ~/.local/bin 加入 PATH (新开终端生效)")"
      ;;
  esac
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
  printf "\n"
  printf "  ${GREEN}✓${NC} ${BOLD}$(t "Your brain is ready!" "你的大脑准备好了！")${NC}\n"
  printf "\n"
  printf "  ${DIM}$(t "Name" "名字")${NC}        ${WHITE}${USER_NAME}${NC}\n"
  printf "  ${DIM}$(t "Language" "语言")${NC}    ${WHITE}${lang_label}${NC}\n"
  printf "  ${DIM}$(t "Schedule" "作息")${NC}    ${WHITE}${schedule_label}${NC}\n"
  printf "  ${DIM}$(t "Connected" "已接入")${NC}   ${WHITE}${CONNECT_LABEL:-Brain only}${NC}\n"
  printf "  ${DIM}$(t "Brain" "路径")${NC}       ${WHITE}${BRAIN_PATH}${NC}\n"
  printf "\n"
  printf "  ${DIM}$(t "Created" "已创建")${NC}\n"
  printf "  ${GREEN}✓${NC} me/identity.md    ${GREEN}✓${NC} .loci/config.yml\n"
  printf "  ${GREEN}✓${NC} plan.md            ${GREEN}✓${NC} tasks/tasks.json\n"
  printf "  ${GREEN}✓${NC} tasks/active.md\n"
  [ "$CONNECT_CLAUDE" -eq 1 ] && printf "  ${GREEN}✓${NC} ~/.claude/CLAUDE.md ${GREEN}✓${NC} ~/.claude/commands/\n"
  [ "$CONNECT_CODEX" -eq 1 ] && printf "  ${GREEN}✓${NC} ~/.codex/AGENTS.md\n"
  printf "\n"
  printf "  $(t "Get started:" "开始使用:")\n"
  printf "\n"
  printf "    ${WHITE}cd ${BRAIN_PATH}${NC}\n"
  if [ "$CONNECT_CLAUDE" -eq 1 ]; then
    printf "    ${WHITE}claude${NC}                              $(t "# your AI already knows you" "# 你的 AI 已经认识你了")\n"
  elif [ "$CONNECT_CODEX" -eq 1 ]; then
    printf "    ${WHITE}codex${NC}                               $(t "# your AI already knows you" "# 你的 AI 已经认识你了")\n"
  else
    printf "    ${WHITE}loci${NC}                                $(t "# open your local dashboard" "# 打开本地可视化面板")\n"
  fi
  printf "\n"
  printf "  $(t "Dashboard (optional):" "可视化面板:")\n"
  printf "\n"
  printf "    ${WHITE}loci${NC}                                $(t "# starts the server and opens the dashboard" "# 启动服务并打开面板")\n"
  printf "    ${DIM}$(t "(new terminal, or: node .loci/dashboard/server.js)" "(新终端生效;也可 node .loci/dashboard/server.js)")${NC}\n"
  printf "\n"
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  parse_args "$@"

  if [ "$NON_INTERACTIVE" -eq 1 ]; then
    apply_non_interactive_config
    preflight
    generate_files
    configure_global
    git_safety
    install_launcher
    show_success
    return
  fi

  show_logo
  printf "  ${DIM}$(t "Press Enter to begin setup..." "按回车开始设置...")${NC}"
  read -rs
  printf "\n"
  preflight
  collect_info
  select_ai_tools
  generate_files
  configure_global
  git_safety
  install_launcher
  show_success
}

main "$@"
