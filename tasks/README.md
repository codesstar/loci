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

Format:
```json
{
  "YYYY-MM-DD": [
    { "title": "Event name", "startKey": 480, "endKey": 600, "note": "Notes" }
  ]
}
```
- `startKey`/`endKey` = minutes from 00:00 (e.g., 8:00 = 480, 10:00 = 600)

## Journal System

See `journal/README.md`
