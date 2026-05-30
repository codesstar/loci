---
date: 2026-05-30
tags: [decision, dashboard, tasks, calendar, architecture]
status: active
---

# Task-first schedule model

Loci dashboard should simplify planning around tasks as the smallest active unit.

Decision:
- Remove week-plan and month-plan as primary planning surfaces.
- Rename the current Plan page into a Task page.
- Do not expose P0/P1/P2/P3 priority buckets in the dashboard; task state should map to incomplete vs completed, matching Feishu-style task sync.
- Use checkbox state as the completion indicator; do not need visible "complete" / "incomplete" labels in the main UI.
- Keep tasks without time only on the Task page, and do not show a separate "no date" label.
- On the Task page, tasks whose date/time intersects today should be surfaced near the top with a small red "today" marker.
- Show tasks with a same-day time on the Calendar timeline.
- For date-range tasks, such as June 9 to June 11, show the task as an all-day/multi-day item on each included date.
- Task -> Schedule is one-way: tasks with time/date are projected into Schedule/Calendar.
- Schedule -> Task is not automatic: items created from Schedule stay as schedule events unless the user explicitly says they are tasks or asks to convert them.
- Task and Schedule should live in the same dashboard area. Default UI is a split view with Task on the left and Schedule on the right; users can switch to task-only or schedule-only focus views when needed.
- In split view, Task and Schedule cards should align at the top. Users can drag the divider between them to resize the two panes, and the dashboard should remember that ratio.
- When parsing natural language, classify intent first:
  - Time blocks, appointments, meals, meetings, classes, travel, and events -> Schedule only.
  - To-dos, reminders, deliverables, "need to finish", "remember to do", or explicit task wording -> Task; if time/date exists, also project it into Schedule.
  - Ambiguous action blocks can ask a short clarification, or default to Task when completion state matters.
- Use `tasks/tasks.json` as the task source of truth. `tasks/active.md` is a generated compact view for humans and AI startup context, not the database.
- Use `tasks/calendar.json` as the schedule/time source of truth. Timed tasks include `fromTask: true` and `taskId`; schedule-only blocks do not create tasks automatically.
- Do not duplicate canonical tasks into `tasks/daily/YYYY-MM-DD.md`; daily files are narrative context, notes, and review.
- Remove `tasks/someday.md`. Loose ideas go to root `inbox.md`; real tasks stay in `tasks/tasks.json`.
- Keep completed tasks in `tasks/tasks.json`, but hide them from the main dashboard after 7 days.
- Treat open tasks untouched for 30+ days as derived `stale` tasks. Fold them away from the main flow, but keep them retrievable in `tasks/tasks.json`.

Rationale:
- This matches the simpler Feishu-style task and schedule mental model.
- Users think in tasks first, then schedule tasks when time is known.
- AI can capture tasks from conversation without forcing the user to decide a planning layer upfront.
- Feishu/Lark separates calendar event creation from task creation, and the calendar can display timed tasks without making every schedule event a task.

<!-- source: conversation @2026-05-30T07:10:12+10:00 -->
<!-- source: conversation @2026-05-30T07:57:30+10:00 -->
<!-- source: conversation @2026-05-30T09:14:05+10:00 -->
<!-- source: conversation @2026-05-30T09:42:40+10:00 -->
<!-- source: conversation @2026-05-30T10:46:39+10:00 -->
