#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LOCI_ROOT = path.resolve(__dirname, '..');
const TASK_DB = path.join(LOCI_ROOT, 'tasks', 'tasks.json');
const ACTIVE_VIEW = path.join(LOCI_ROOT, 'tasks', 'active.md');
const CALENDAR_DB = path.join(LOCI_ROOT, 'tasks', 'calendar.json');
const DONE_HIDE_DAYS = 7;
const STALE_AFTER_DAYS = 30;

function usage() {
  console.log(`Usage:
  node scripts/loci-task.js validate
  node scripts/loci-task.js rebuild
  node scripts/loci-task.js add --title "Task" [--date YYYY-MM-DD] [--start HH:MM] [--end HH:MM] [--end-date YYYY-MM-DD]
  node scripts/loci-task.js update --id task_x --title "Task" [--date YYYY-MM-DD] [--start HH:MM] [--end HH:MM] [--clear-time] [--clear-date]
  node scripts/loci-task.js done --id task_x
  node scripts/loci-task.js open --id task_x
  node scripts/loci-task.js archive --id task_x
  node scripts/loci-task.js schedule --title "Event" --date YYYY-MM-DD [--start HH:MM] [--end HH:MM]`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const eq = item.indexOf('=');
    if (eq !== -1) {
      args[item.slice(2, eq)] = item.slice(eq + 1);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[item.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      args[item.slice(2)] = true;
    }
  }
  return args;
}

function isoNow() {
  return new Date().toISOString();
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const time = Date.parse(dateStr);
  if (!Number.isFinite(time)) return 0;
  return Math.floor((Date.now() - time) / 86400000);
}

function assertDate(value, field) {
  if (value == null || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} must be YYYY-MM-DD`);
  return value;
}

function assertTime(value, field) {
  if (value == null || value === '') return null;
  if (!/^\d{2}:\d{2}$/.test(value)) throw new Error(`${field} must be HH:MM`);
  const [h, m] = value.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error(`${field} is out of range`);
  return value;
}

function timeToMinutes(value) {
  const [h, m] = assertTime(value, 'time').split(':').map(Number);
  return h * 60 + m;
}

function makeTaskId(title, existingIds) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const slug = String(title || 'task')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'task';
  const taken = existingIds instanceof Set ? existingIds : new Set();
  let id;
  do {
    const rand = Math.random().toString(36).slice(2, 6);
    id = `task_${stamp}_${slug}_${rand}`;
  } while (taken.has(id));
  return id;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`${path.relative(LOCI_ROOT, filePath)} is invalid JSON: ${error.message}`);
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
  fs.renameSync(tmp, filePath);
}

// urgency / importance: 0 = normal (default), 1 = high, 2 = highest.
// The AI sets these only when the user signals a task is urgent / important;
// most tasks stay 0. They drive task ordering (urgency → importance → time).
function clampLevel(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(2, Math.round(n)));
}

// Accept either a number (0/1/2) or a word the AI might pass, e.g.
// --urgency very  /  --importance high  /  --urgency 2
function parseLevelArg(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v).trim().toLowerCase();
  if (/^(0|none|normal|no)$/.test(s)) return 0;
  if (/^(1|high|urgent|important|yes)$/.test(s)) return 1;
  if (/^(2|highest|very|very-?high|very-?urgent|very-?important|critical|max)$/.test(s)) return 2;
  const n = Number(s);
  return Number.isFinite(n) ? clampLevel(n) : undefined;
}

function normalizeTask(task, existingIds) {
  const now = isoNow();
  const title = String(task.title || task.text || '').trim();
  const status = task.status || (task.done ? 'done' : 'open');
  return {
    id: task.id || makeTaskId(title, existingIds),
    title,
    status,
    date: assertDate(task.date || null, 'date'),
    endDate: assertDate(task.endDate || null, 'endDate'),
    startTime: assertTime(task.startTime || task.start || null, 'startTime'),
    endTime: assertTime(task.endTime || task.end || null, 'endTime'),
    project: task.project || null,
    urgency: clampLevel(task.urgency),
    importance: clampLevel(task.importance),
    // "I want to do this TODAY" — a per-day pick, independent of the deadline
    // (`date` stays the due date). Stale picks from past days simply expire.
    plannedFor: assertDate(task.plannedFor || null, 'plannedFor'),
    // User explicitly pushed this out of the Today bucket. This never changes
    // the due date; it only affects the task-page grouping.
    deferToday: task.deferToday === true,
    source: task.source || 'conversation',
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || task.createdAt || now,
    completedAt: task.completedAt || (status === 'done' ? now : null),
    archivedAt: task.archivedAt || (status === 'archived' ? now : null),
  };
}

function readTasks() {
  const parsed = readJson(TASK_DB, { tasks: [] });
  const rawTasks = Array.isArray(parsed) ? parsed : parsed.tasks;
  if (!Array.isArray(rawTasks)) throw new Error('tasks/tasks.json must contain a tasks array');
  return rawTasks.map(normalizeTask).filter(task => task.title);
}

function isTaskStale(task) {
  return task.status === 'open' && daysSince(task.updatedAt || task.createdAt) >= STALE_AFTER_DAYS;
}

function isTaskVisible(task) {
  if (task.status === 'archived') return false;
  if (task.status === 'done') return daysSince(task.completedAt || task.updatedAt) < DONE_HIDE_DAYS;
  return true;
}

function taskLine(task) {
  const checked = task.status === 'done' ? 'x' : ' ';
  const meta = [
    `id: ${task.id}`,
    task.date ? `date: ${task.date}` : null,
    task.endDate ? `endDate: ${task.endDate}` : null,
    task.startTime ? `start: ${task.startTime}` : null,
    task.endTime ? `end: ${task.endTime}` : null,
    task.project ? `project: ${task.project}` : null,
    `updated: ${task.updatedAt}`,
  ].filter(Boolean).join('; ');
  return `- [${checked}] ${task.title} <!-- ${meta} -->`;
}

function renderActiveTaskView(tasks) {
  const open = tasks.filter(task => task.status === 'open' && !isTaskStale(task));
  const stale = tasks.filter(task => task.status === 'open' && isTaskStale(task));
  const done = tasks.filter(task => task.status === 'done' && isTaskVisible(task));
  return [
    '---',
    `updated: ${isoNow().slice(0, 10)}`,
    'schema: task-view-v1',
    'source: tasks.json',
    '---',
    '',
    '# Active Tasks',
    '',
    '> Generated context cache from `tasks/tasks.json`. Do not edit by hand.',
    '',
    '## Open',
    '',
    ...(open.length ? open.map(taskLine) : ['<!-- No open tasks. -->']),
    '',
    '## Stale',
    '',
    ...(stale.length ? stale.map(taskLine) : ['<!-- No stale tasks. -->']),
    '',
    '## Recently Done',
    '',
    ...(done.length ? done.map(taskLine) : ['<!-- No recently completed tasks. -->']),
    '',
  ].join('\n');
}

function writeActiveTaskView(tasks) {
  fs.writeFileSync(ACTIVE_VIEW, renderActiveTaskView(tasks), 'utf-8');
}

function readCalendar() {
  const parsed = readJson(CALENDAR_DB, {});
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('tasks/calendar.json must be an object keyed by date');
  }
  return parsed;
}

function saveCalendar(calendar) {
  const cleaned = {};
  for (const date of Object.keys(calendar).sort()) {
    const events = Array.isArray(calendar[date]) ? calendar[date].filter(Boolean) : [];
    if (events.length) cleaned[date] = events;
  }
  writeJson(CALENDAR_DB, cleaned);
}

// Tasks and the schedule are kept strictly separate: a timed task lives only in
// tasks.json and is never AUTO-projected onto the calendar (see
// decisions/2026-06-23-task-schedule-separation). Calendar events are entirely
// user-owned — including deliberate pull-to-schedule events, which carry
// `fromTask: true` purely as provenance. Nothing here creates or removes them.
function syncCalendarForTasks() { /* no-op: the calendar belongs to the user */ }

function saveTasks(tasks, options = {}) {
  const normalized = tasks.map(normalizeTask).filter(task => task.title);
  writeJson(TASK_DB, { tasks: normalized });
  writeActiveTaskView(normalized);
  if (options.syncCalendar) syncCalendarForTasks();
  return normalized;
}

function validateTasks(tasks) {
  const errors = [];
  const ids = new Set();
  for (const task of tasks) {
    if (!task.id) errors.push('Task is missing id');
    if (ids.has(task.id)) errors.push(`Duplicate task id: ${task.id}`);
    ids.add(task.id);
    if (!task.title) errors.push(`Task ${task.id} is missing title`);
    if (!['open', 'done', 'archived'].includes(task.status)) errors.push(`Task ${task.id} has invalid status: ${task.status}`);
    if (![0, 1, 2].includes(task.urgency)) errors.push(`Task ${task.id} has invalid urgency: ${task.urgency}`);
    if (![0, 1, 2].includes(task.importance)) errors.push(`Task ${task.id} has invalid importance: ${task.importance}`);
    if (task.endDate && !task.date) errors.push(`Task ${task.id} has endDate without date`);
    if (task.endDate && task.date && task.endDate < task.date) errors.push(`Task ${task.id} endDate is before date`);
    if (task.endTime && !task.startTime) errors.push(`Task ${task.id} has endTime without startTime`);
  }
  return errors;
}

function validateCalendar(calendar) {
  const errors = [];
  for (const [date, events] of Object.entries(calendar)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`Calendar key is not YYYY-MM-DD: ${date}`);
    if (!Array.isArray(events)) {
      errors.push(`Calendar ${date} must be an array`);
      continue;
    }
    for (const event of events) {
      if (!event || typeof event !== 'object') {
        errors.push(`Calendar ${date} contains a non-object event`);
        continue;
      }
      if (!event.title) errors.push(`Calendar ${date} event is missing title`);
      if (!event.allDay && !event.startDate) {
        if (!Number.isFinite(event.startKey) || !Number.isFinite(event.endKey)) {
          errors.push(`Calendar ${date} timed event "${event.title || ''}" needs numeric startKey/endKey`);
        } else if (event.endKey <= event.startKey) {
          errors.push(`Calendar ${date} event "${event.title || ''}" ends before it starts`);
        }
      }
    }
  }
  return errors;
}

function validateAll() {
  const tasks = readTasks();
  const calendar = readCalendar();
  const errors = [
    ...validateTasks(tasks),
    ...validateCalendar(calendar),
  ];
  if (fs.existsSync(ACTIVE_VIEW) && fs.readFileSync(ACTIVE_VIEW, 'utf-8') !== renderActiveTaskView(tasks)) {
    errors.push('tasks/active.md is stale; run `node scripts/loci-task.js rebuild`');
  }
  return errors;
}

function findTask(tasks, id) {
  const task = tasks.find(item => item.id === id);
  if (!task) throw new Error(`Task not found: ${id}`);
  return task;
}

function addTask(args) {
  const title = String(args.title || args.text || '').trim();
  if (!title) throw new Error('Missing --title');
  const tasks = readTasks();
  const task = normalizeTask({
    title,
    date: args.date || null,
    endDate: args['end-date'] || args.endDate || null,
    startTime: args.start || args.startTime || null,
    endTime: args.end || args.endTime || null,
    project: args.project || null,
    urgency: parseLevelArg(args.urgency),
    importance: parseLevelArg(args.importance),
    source: args.source || 'agent',
  }, new Set(tasks.map(t => t.id)));
  tasks.push(task);
  saveTasks(tasks, { syncCalendar: true });
  console.log(JSON.stringify({ ok: true, task }, null, 2));
}

function updateTask(args) {
  if (!args.id) throw new Error('Missing --id');
  const tasks = readTasks();
  const task = findTask(tasks, args.id);
  if (args.title || args.text) task.title = String(args.title || args.text).trim();
  if (args.project !== undefined) task.project = args.project || null;
  if (args.status) task.status = args.status;
  if (args.urgency !== undefined) { const lv = parseLevelArg(args.urgency); if (lv !== undefined) task.urgency = lv; }
  if (args.importance !== undefined) { const lv = parseLevelArg(args.importance); if (lv !== undefined) task.importance = lv; }
  if (args['clear-date']) {
    task.date = null;
    task.endDate = null;
  } else {
    if (args.date !== undefined) task.date = args.date || null;
    if (args['end-date'] !== undefined || args.endDate !== undefined) task.endDate = args['end-date'] || args.endDate || null;
  }
  if (args['clear-time']) {
    task.startTime = null;
    task.endTime = null;
  } else {
    if (args.start !== undefined || args.startTime !== undefined) task.startTime = args.start || args.startTime || null;
    if (args.end !== undefined || args.endTime !== undefined) task.endTime = args.end || args.endTime || null;
  }
  task.updatedAt = isoNow();
  if (task.status === 'done' && !task.completedAt) task.completedAt = task.updatedAt;
  if (task.status !== 'done') task.completedAt = null;
  if (task.status === 'archived' && !task.archivedAt) task.archivedAt = task.updatedAt;
  saveTasks(tasks, { syncCalendar: true });
  console.log(JSON.stringify({ ok: true, task }, null, 2));
}

function setStatus(status, args) {
  if (!args.id) throw new Error('Missing --id');
  const tasks = readTasks();
  const task = findTask(tasks, args.id);
  task.status = status;
  task.updatedAt = isoNow();
  task.completedAt = status === 'done' ? (task.completedAt || task.updatedAt) : null;
  task.archivedAt = status === 'archived' ? (task.archivedAt || task.updatedAt) : null;
  saveTasks(tasks, { syncCalendar: true });
  console.log(JSON.stringify({ ok: true, task }, null, 2));
}

function addSchedule(args) {
  const title = String(args.title || args.text || '').trim();
  if (!title) throw new Error('Missing --title');
  const date = assertDate(args.date, 'date');
  if (!date) throw new Error('Missing --date');
  const startKey = args.start ? timeToMinutes(args.start) : 540;
  const endKey = args.end ? timeToMinutes(args.end) : startKey + 60;
  if (endKey <= startKey) throw new Error('schedule --end must be after --start');
  const calendar = readCalendar();
  if (!calendar[date]) calendar[date] = [];
  calendar[date].push({ title, startKey, endKey, hour: Math.floor(startKey / 60) });
  saveCalendar(calendar);
  console.log(JSON.stringify({ ok: true, date, event: calendar[date][calendar[date].length - 1] }, null, 2));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (!command || args.help) {
    usage();
    return;
  }

  if (command === 'validate') {
    const errors = validateAll();
    if (errors.length) {
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log('ok');
    return;
  }
  if (command === 'rebuild') {
    const tasks = saveTasks(readTasks(), { syncCalendar: true });
    console.log(JSON.stringify({ ok: true, tasks: tasks.length }, null, 2));
    return;
  }
  if (command === 'add') return addTask(args);
  if (command === 'update') return updateTask(args);
  if (command === 'done') return setStatus('done', args);
  if (command === 'open') return setStatus('open', args);
  if (command === 'archive') return setStatus('archived', args);
  if (command === 'schedule') return addSchedule(args);

  throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
