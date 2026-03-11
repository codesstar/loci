# tasks/ — Task Management & Planning

The command center for what needs to get done, plus daily/weekly/monthly planning.

## Core Files
- `active.md` — Current tasks, organized by priority
- `someday.md` — Ideas and tasks without a deadline
- `calendar.json` — Calendar events for Dashboard display

## Priority Levels
- **P0**: Must do today
- **P1**: This week
- **P2**: Can delegate or quick wins
- **P3**: When there's time

## Rules
- P0 should have at most 3 items
- Completed tasks get checked off, then archived monthly
- `someday.md` is reviewed weekly during inbox clearing

## Planning Structure
```
daily/       → YYYY-MM-DD.md (daily plans & reviews)
journal/     → Daily summaries (buffer.md → end-of-day journal)
```

## Workflow
1. Start each day by checking/creating a daily plan
2. Weekly: Review the week, clear inbox
3. Monthly: Review monthly goals, set next month's focus
4. Quarterly: Align with annual goals in plan.md

## Calendar Events (calendar.json)

Used by the Dashboard to display a timeline view. The AI auto-adds events when the user mentions times.

**Schema:**
```json
{
  "2026-03-11": [
    {
      "title": "Design review",
      "startKey": 840,
      "endKey": 900,
      "note": "With Sarah, discuss new color system"
    }
  ],
  "2026-03-12": [
    {
      "title": "Standup",
      "startKey": 570,
      "endKey": 585,
      "note": ""
    }
  ]
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Event name |
| `startKey` | number | yes | Start time in minutes from 00:00 (e.g., 9:30am = 570) |
| `endKey` | number | yes | End time in minutes from 00:00 (e.g., 10:00am = 600) |
| `note` | string | no | Additional context |

**Common time conversions:** 6:00=360, 8:00=480, 9:00=540, 9:30=570, 10:00=600, 12:00=720, 14:00=840, 18:00=1080, 22:00=1320

## Journal System

See `journal/README.md`
