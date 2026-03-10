# Context Awareness — State Sensing & Cross-Terminal Sync

## Overview

Loci solves two problems that plague all AI assistants:

1. **State blindness** — the AI doesn't know your current energy level, location, or schedule, leading to tone-deaf suggestions (e.g., proposing deep work when you just got off a 12-hour flight)
2. **Terminal isolation** — when you run multiple terminals, they can't see each other's changes

## Part 1: State Sensing (Context Aura)

### The Three-Layer Signal Model

```
Priority: User Override > File Inference > Environmental Signals
```

| Layer | Source | Example |
|-------|--------|---------|
| **A — User Override** | `/status tired` command | Highest priority, but system doesn't depend on it |
| **B — File Inference** | Daily plan, last conversation time | Primary source, zero friction |
| **C — Environmental Signals** | Current time, conversation gap | V1: zero-permission signals only |

### How It Works

At the start of every conversation, Loci runs the **inference chain**:

```
Step 1: Read .loci/status.yml
  → If override exists and not expired → use it
  → If expired → mark stale, continue to Step 2

Step 2: Read today's daily plan
  → Extract: location, schedule, mood markers, planned workload
  → Write to .loci/status.yml sources

Step 3: Read zero-permission signals
  → Current time → infer time-of-day (morning/afternoon/late night)
  → Last conversation time → infer gap (just chatted vs. 3 days ago)
  → Today's conversation turns → infer usage intensity

Step 4: Fuse signals and compute confidence
  → Signals agree → high confidence → use directly
  → Signals conflict or insufficient → low confidence → ask naturally

Step 5: Update .loci/status.yml
```

### .loci/status.yml (L1 — Always Loaded)

```yaml
updated: "2026-03-07T14:30:00+11:00"
ttl: 4h                    # Stale after 4 hours

energy: moderate            # low / moderate / high
location: sydney
context: "Just arrived in Sydney, adjusting to time zone"
available_hours: 2
confidence: 0.8

override:                   # User /status input — highest priority
  energy: low
  note: "exhausted"
  set_at: "2026-03-07T14:25:00+11:00"

sources:
  - type: daily_plan
    file: "tasks/daily/2026-03-07.md"
    extracted: "Arrived in Sydney, flight landed at 14:00"
  - type: time_signal
    value: "Conversation gap > 72 hours"
  - type: user_override
    value: "exhausted"
```

### Behavior Rules

| Scenario | AI Behavior |
|----------|-------------|
| **High confidence** | Act on inferred state directly, no interruption |
| **Low confidence** | Ask naturally: "How's your energy today?" — not a form |
| **Expired state** | Degrade to "unknown" — never use stale data |
| **User override** | Always wins, regardless of other signals |

> **Design principle**: Stale data is worse than no data. An expired "feeling great" from yesterday morning is dangerous if the user pulled an all-nighter.

### Provider Interface (for extensions)

```python
class StateProvider(Protocol):
    name: str
    priority: int
    requires_permission: bool

    def get_signal(self) -> StateSignal:
        ...

@dataclass
class StateSignal:
    energy: Optional[str]       # low / moderate / high
    location: Optional[str]
    context: Optional[str]      # Natural language description
    confidence: float           # 0.0 - 1.0
    timestamp: datetime
    ttl: timedelta
```

**Built-in Providers (V1)**:
- `DailyPlanProvider` — reads daily plan files
- `TimeSignalProvider` — current time + conversation gap
- `UserOverrideProvider` — `/status` command input

**Community Providers (V2+)**:
- `CalendarProvider` — Google Calendar / Apple Calendar
- `WearableProvider` — Fitbit / Apple Watch sleep data
- `WeatherProvider` — weather affecting mood

---

## Part 2: Cross-Terminal Sync (Changelog Protocol)

### The Problem

You're running Terminal A (personal management) and Terminal B (a coding project). Terminal B updates your task list. Terminal A has no idea.

### The Solution: A Mailbox, Not a Rocket

```
Terminal A (after write) ──hook──→ .loci/changelog.log ←──on start── Terminal B
```

Every terminal writes to a shared append-only log when it modifies key files. Every terminal reads that log when starting a conversation.

### changelog.log Format

```
1741334400|terminal-hq|WRITE|tasks/active.md|Added P0 task
1741334520|terminal-projectA|WRITE|tasks/daily/2026-03-07.md|Completed daily plan
1741334600|terminal-hq|WRITE|inbox.md|Added 3 items
```

Fields: `unix_timestamp|terminal_id|operation|relative_path|optional_description`

Plain text. Append-only. Never conflicts.

### Three Trigger Points

| When | Mechanism | Covers |
|------|-----------|--------|
| **Conversation start** | Startup script scans changelog | Know what changed since last time |
| **Before critical writes** | AI checks if file was modified by another terminal | Avoid decisions based on stale data |
| **User command `/sync`** | Manual refresh | Mid-conversation awareness |

### `/sync` Command

When the user says `/sync`, the AI immediately:
1. Reads changelog for entries since last check from other terminals
2. Re-reads any modified key files
3. Reports a one-line summary: "Project-A terminal updated active.md 10 minutes ago — added a P1 task"

### Hook Configuration

**Write hook** (`.loci/hooks/on-file-change.sh`):

```bash
#!/bin/bash
LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHANGELOG="$LOCI_ROOT/.loci/changelog.log"
TERMINAL_ID="${LOCI_TERMINAL_ID:-terminal-$$}"
TIMESTAMP=$(date +%s)
FILEPATH="${1#$LOCI_ROOT/}"

case "$FILEPATH" in
  inbox.md|plan.md|.loci/status.yml|tasks/*|.loci/links/*/to-hq.md)
    echo "${TIMESTAMP}|${TERMINAL_ID}|WRITE|${FILEPATH}|" >> "$CHANGELOG"
    ;;
esac
```

**Read hook** (`.loci/hooks/check-updates.sh`):

```bash
#!/bin/bash
LOCI_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHANGELOG="$LOCI_ROOT/.loci/changelog.log"
LAST_CHECK="$LOCI_ROOT/.loci/last-check-${LOCI_TERMINAL_ID:-default}"
TERMINAL_ID="${LOCI_TERMINAL_ID:-terminal-$$}"

if [ ! -f "$CHANGELOG" ]; then exit 0; fi

SINCE=$(cat "$LAST_CHECK" 2>/dev/null || echo 0)

UPDATES=$(awk -F'|' -v since="$SINCE" -v me="$TERMINAL_ID" \
    '$1 > since && $2 != me { print }' "$CHANGELOG")

if [ -n "$UPDATES" ]; then
    echo "=== Cross-terminal updates ==="
    echo "$UPDATES" | while IFS='|' read -r ts tid op fp desc; do
        HUMAN_TIME=$(date -r "$ts" "+%H:%M" 2>/dev/null || date -d "@$ts" "+%H:%M")
        echo "  [$HUMAN_TIME] $tid: $op $fp $desc"
    done
    echo "=============================="
fi

date +%s > "$LAST_CHECK"
```

**Claude Code settings** (`.claude/settings.json`):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": ".loci/hooks/on-file-change.sh \"$FILE_PATH\""
      }
    ]
  }
}
```

### Relationship with Department Protocol

| Mechanism | Purpose | Scope |
|-----------|---------|-------|
| `from-hq.md` / `to-hq.md` | Strategic communication (decisions, directives) | Cross-department |
| `changelog.log` | File change awareness (who modified what) | All terminals |

They complement each other. The department protocol is for intentional messages; the changelog is for ambient awareness.

---

## Implementation Roadmap

| Phase | What | Effort |
|-------|------|--------|
| **Phase 1** | Fix: ensure "read daily plan at start" executes 100%. Add `.loci/status.yml` to L1. | Half day |
| **Phase 2** | changelog.log + write/read scripts + hooks config | 1.5 hours |
| **Phase 3** | `/status` + `/sync` commands + TTL expiry | 1 day |
| **Phase 4** | Provider interface + file locking + log rotation | 1 day |

## Design Constraints

- **Zero dependencies**: Only bash + stat + awk — ships with every Unix/macOS
- **Zero daemons**: Hooks live and die with Claude Code sessions
- **Zero real-time requirement**: Write on change, read on demand
- **Plain text**: Consistent with Loci's markdown-first philosophy
