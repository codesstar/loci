# 03-planning — Plans & Reviews

Daily, monthly, and quarterly planning with regular reviews.

## Structure
```
daily/       → YYYY-MM-DD.md (daily plans & reviews)
monthly/     → YYYY-MM.md (monthly goals & reviews)
quarterly/   → YYYY-QN.md (quarterly planning)
reviews/     → Weekly and monthly review records
```

## Workflow
1. Start each day by checking/creating a daily plan
2. Weekly: Review the week, clear inbox
3. Monthly: Review monthly goals, set next month's focus
4. Quarterly: Align with annual goals in plan.md

## Calendar Events (calendar.json)

File path: `03-planning/calendar.json`, used for Dashboard calendar display.

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
