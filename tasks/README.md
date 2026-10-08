# Task and schedule data

Operation rules live in [LOCI-RULES.md](../LOCI-RULES.md#03--任务与日程). This file describes storage only.

| File | Contents |
| --- | --- |
| `tasks.json` | Personal task pool; object with a `tasks` array. Each task has a permanent `id`, `title`, `status`, optional `date`/`startTime`/`endTime`, and timestamps. |
| `calendar.json` | Schedule events grouped by date, with `title`, `startKey` and `endKey` in minutes from midnight. |
| `recurring.json` | Repeating reminders, managed by the reminder commands. |
| `active.md` | Generated summary of the task pool; read on demand. |
| `daily/` | Dated narrative context, not another task store. |
| `journal/` | Journal entries and review notes. |

Use `node scripts/loci-task.js` or the Dashboard API to modify the structured stores. See the command's help for parameters and [docs/api.md](../docs/api.md) for endpoints. The writer validates data and regenerates the task view. Schedule events are separate from tasks; adding a timed task does not create a calendar projection.
