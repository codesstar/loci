#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LOCI_ROOT = path.resolve(__dirname, '..');
const TASK_DB = path.join(LOCI_ROOT, 'tasks', 'tasks.json');
const ACTIVE_VIEW = path.join(LOCI_ROOT, 'tasks', 'active.md');
const CALENDAR_DB = path.join(LOCI_ROOT, 'tasks', 'calendar.json');
const RECURRING_DB = path.join(LOCI_ROOT, 'tasks', 'recurring.json');
const DONE_HIDE_DAYS = 7;
const STALE_AFTER_DAYS = 30;

function usage() {
  console.log(`Usage:
  node scripts/loci-task.js validate
  node scripts/loci-task.js rebuild
  node scripts/loci-task.js add --title "Task" [--date YYYY-MM-DD] [--start HH:MM] [--end HH:MM] [--end-date YYYY-MM-DD] [--people "A、B"] [--location "..."]
  node scripts/loci-task.js update --id task_x --title "Task" [--date YYYY-MM-DD] [--start HH:MM] [--end HH:MM] [--clear-time] [--clear-date] [--people "A、B"] [--location "..."]
  node scripts/loci-task.js done --id task_x       (or --title "关键词" — unique open-task match)
  node scripts/loci-task.js open --id task_x       (or --title "...")
  node scripts/loci-task.js archive --id task_x    (or --title "...")
  node scripts/loci-task.js schedule --title "Event" --date YYYY-MM-DD [--start HH:MM] [--end HH:MM] [--note "..."] [--location "..."] [--people "A、B"]
    (no --end → a point event: endKey = startKey, rendered as a thin Google-Calendar-style block)
  node scripts/loci-task.js schedule-remove --date YYYY-MM-DD --title "关键词"
    (delete one event that date — exact title match, else unique substring; use to fix a wrongly-added event)
  node scripts/loci-task.js remind --title "Drink water" --days mon,tue,wed,thu,fri --times 09:00,14:00,17:00
    (--days also takes "daily"/"weekdays"/"weekend", Chinese day names/digits like "一二三四五" or "1,2,3,4,5")
  node scripts/loci-task.js remind-toggle --id rec_x   (or --title "...")   — flip a recurring reminder on/off
  node scripts/loci-task.js remind-remove --id rec_x   (or --title "...")
  node scripts/loci-task.js remind-list
  node scripts/loci-task.js log --category "人脉" --line "认识了新朋友阿泰"
    (one-shot activity-ledger append; add/schedule/done/remind already log themselves)
  node scripts/loci-task.js names
    (all saved contact + place names in one shot — for checking whether a
     mentioned person/place exists before linking it on a task/event)`);
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

// Cross-process write lock shared with the dashboard server (its lib/store.js).
// Optional — on brains without the module, writes stay atomic-only.
let sharedStore = null;
try {
  sharedStore = require(path.join(LOCI_ROOT, '.loci', 'dashboard', 'lib', 'store.js'));
} catch { /* older brain layout — no lock available */ }

function withWriteLock(fn) {
  if (!sharedStore) return fn();
  return sharedStore.withLock(path.join(LOCI_ROOT, '.loci', '.write-lock'), fn);
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
    // Task detail fields — preserved verbatim so CLI writes never strip what
    // the dashboard (or an AI session) attached to a task.
    location: task.location || null,
    color: task.color || null,
    note: task.note || null,
    // linked contact names (people/<name>.md), rendered as chips on task cards
    ...(Array.isArray(task.people) && task.people.length ? { people: task.people.map(String) } : {}),
    ...(typeof task.manualOrder === 'number' ? { manualOrder: task.manualOrder } : {}),
  };
}

function parsePeopleArg(v) {
  return String(v || '').split(/[,，、;；]/).map(s => s.trim()).filter(Boolean);
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
  withWriteLock(() => writeJson(CALENDAR_DB, cleaned));
}

// Tasks and the schedule are kept strictly separate: a timed task lives only in
// tasks.json and is never AUTO-projected onto the calendar (see
// decisions/2026-06-23-task-schedule-separation). Calendar events are entirely
// user-owned — including deliberate pull-to-schedule events, which carry
// `fromTask: true` purely as provenance. Nothing here creates or removes them.
function syncCalendarForTasks() { /* no-op: the calendar belongs to the user */ }

function saveTasks(tasks, options = {}) {
  const normalized = tasks.map(normalizeTask).filter(task => task.title);
  withWriteLock(() => {
    writeJson(TASK_DB, { tasks: normalized });
    writeActiveTaskView(normalized);
  });
  if (options.syncCalendar) syncCalendarForTasks();
  return normalized;
}

// ─── Atomic read-modify-write sections ──────────────────────────────────────
// The advisory lock must cover the READ too: locking only the write (as
// saveTasks does for its full-rewrite callers like `rebuild`) lets two
// concurrent writers read the same snapshot and silently drop each other's
// changes — found by a 10-way concurrent-add test, where only 4 of 10 tasks
// survived. Every incremental mutation goes through one of these.
function mutateTasks(fn) {
  return withWriteLock(() => {
    const tasks = readTasks();
    const out = fn(tasks);
    const normalized = tasks.map(normalizeTask).filter(task => task.title);
    writeJson(TASK_DB, { tasks: normalized });
    writeActiveTaskView(normalized);
    return out;
  });
}

function mutateCalendar(fn) {
  return withWriteLock(() => {
    const calendar = readCalendar();
    const out = fn(calendar);
    const cleaned = {};
    for (const date of Object.keys(calendar).sort()) {
      const events = Array.isArray(calendar[date]) ? calendar[date].filter(Boolean) : [];
      if (events.length) cleaned[date] = events;
    }
    writeJson(CALENDAR_DB, cleaned);
    return out;
  });
}

// fn(rules) mutates the array in place, or returns a replacement array.
function mutateRecurring(fn) {
  return withWriteLock(() => {
    const rules = readRecurring();
    const ret = fn(rules);
    writeJson(RECURRING_DB, { rules: Array.isArray(ret) ? ret : rules });
    return ret;
  });
}

// Append one line to the activity ledger (.loci/activity/YYYY-MM.md) so the
// AI caller doesn't have to burn extra tool round-trips (Read + Edit) doing it
// by hand after every add/schedule/done — the guarded writer knows everything
// the ledger line needs. Best-effort: a ledger hiccup must never fail the write.
function logActivity(category, line) {
  try {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const day = `${month}-${pad(now.getDate())}`;
    const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dir = path.join(LOCI_ROOT, '.loci', 'activity');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, month + '.md');
    let text = '';
    try { text = fs.readFileSync(file, 'utf-8'); } catch { /* new month */ }
    const entry = `- ${hhmm} · ${category} · ${line}`;
    if (text.includes(`## ${day}`)) {
      // append under today's heading: insert before the next heading (or EOF)
      const idx = text.indexOf(`## ${day}`);
      const rest = text.slice(idx);
      const nextHead = rest.indexOf('\n## ', 4);
      const insertAt = nextHead === -1 ? text.length : idx + nextHead;
      const before = text.slice(0, insertAt).replace(/\n*$/, '\n');
      const after = text.slice(insertAt).replace(/^\n*/, '\n');
      text = before + entry + (after.trim() ? after : '\n');
    } else {
      text = text.replace(/\n*$/, text ? '\n\n' : '') + `## ${day}\n${entry}\n`;
    }
    fs.writeFileSync(file, text, 'utf-8');
  } catch { /* ledger is best-effort */ }
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
        } else if (event.endKey < event.startKey) {
          // endKey === startKey is a valid point event (see addSchedule / handleCalendarAdd)
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

// ─── Local people/place link resolution ─────────────────────────────────────
// The AI passes names exactly as the USER said them; matching against saved
// contacts/places happens HERE, locally and deterministically. This keeps
// every write a single generic command (uniform round-trip count whether or
// not names are involved), with no roster pre-fetch, no cache, no staleness —
// the roster is read fresh from disk at each write, in milliseconds.
// Match order: exact → normalized (case/spaces/"的" stripped) → unique
// substring containment. An unmatched person is dropped from the link (never
// auto-created) and reported in the output together with the full roster, so
// the model can spot an obvious typo/homophone and correct with a follow-up.
function scanNames(dir) {
  const names = [];
  try {
    for (const f of fs.readdirSync(path.join(LOCI_ROOT, dir))) {
      if (!f.endsWith('.md') || f === 'README.md') continue;
      const m = fs.readFileSync(path.join(LOCI_ROOT, dir, f), 'utf-8').slice(0, 600).match(/^name:\s*(.+)$/m);
      if (m) names.push(m[1].trim().replace(/^['"]|['"]$/g, ''));
    }
  } catch { /* module dir absent → empty */ }
  return names;
}

function normName(s) { return String(s).toLowerCase().replace(/[\s的]/g, ''); }

function matchName(cand, saved) {
  if (saved.includes(cand)) return cand;
  const nc = normName(cand);
  if (!nc) return null;
  const norm = saved.find(n => normName(n) === nc);
  if (norm) return norm;
  const subs = saved.filter(n => { const nn = normName(n); return nn.includes(nc) || nc.includes(nn); });
  return subs.length === 1 ? subs[0] : null; // ambiguous → treat as no match
}

function resolveLinks(peopleCands, locationCand) {
  const savedPeople = scanNames('people');
  const savedPlaces = scanNames('places');
  const people = [];
  const unmatchedPeople = [];
  for (const c of peopleCands || []) {
    const hit = matchName(c, savedPeople);
    if (hit) { if (!people.includes(hit)) people.push(hit); }
    else unmatchedPeople.push(c);
  }
  let location = locationCand || null;
  let locationLinked = false;
  if (locationCand) {
    const hit = matchName(locationCand, savedPlaces);
    if (hit) { location = hit; locationLinked = true; }
  }
  const out = { people, unmatchedPeople, location, locationLinked };
  // only ship the roster back when something failed to match — that's the one
  // case where the model may want to judge a typo/homophone and correct
  if (unmatchedPeople.length || (locationCand && !locationLinked)) {
    out.roster = { people: savedPeople, places: savedPlaces };
  }
  return out;
}

function addTask(args) {
  const title = String(args.title || args.text || '').trim();
  if (!title) throw new Error('Missing --title');
  const links = resolveLinks(
    args.people && args.people !== true ? parsePeopleArg(args.people) : [],
    args.location && args.location !== true ? String(args.location) : null
  );
  const task = mutateTasks(tasks => {
    const t = normalizeTask({
      title,
      date: args.date || null,
      endDate: args['end-date'] || args.endDate || null,
      startTime: args.start || args.startTime || null,
      endTime: args.end || args.endTime || null,
      project: args.project || null,
      urgency: parseLevelArg(args.urgency),
      importance: parseLevelArg(args.importance),
      location: links.location,
      color: args.color || null,
      note: args.note || null,
      people: links.people.length ? links.people : undefined,
      source: args.source || 'agent',
    }, new Set(tasks.map(x => x.id)));
    tasks.push(t);
    return t;
  });
  logActivity('任务', '新增任务：' + title
    + (task.date ? '（' + task.date + (task.startTime ? ' ' + task.startTime : '') + '）' : ''));
  console.log(JSON.stringify({ ok: true, task, links }, null, 2));
}

function updateTask(args) {
  if (!args.id) throw new Error('Missing --id');
  let links = null;
  if ((args.people !== undefined && args.people !== true) || (args.location !== undefined && args.location !== true)) {
    links = resolveLinks(
      args.people !== undefined && args.people !== true ? parsePeopleArg(args.people) : [],
      args.location !== undefined && args.location !== true ? (args.location || null) : null
    );
  }
  const task = mutateTasks(tasks => applyTaskUpdate(findTask(tasks, args.id), args, links));
  console.log(JSON.stringify(links ? { ok: true, task, links } : { ok: true, task }, null, 2));
}

function applyTaskUpdate(task, args, links) {
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
  if (args.location !== undefined) task.location = args.location === true ? null : (links && links.location) || null;
  if (args.note !== undefined) task.note = args.note === true ? null : (args.note || null);
  if (args.color !== undefined) task.color = args.color === true ? null : (args.color || null);
  if (args.people !== undefined) task.people = args.people === true ? null : (links && links.people.length ? links.people : null);
  task.updatedAt = isoNow();
  if (task.status === 'done' && !task.completedAt) task.completedAt = task.updatedAt;
  if (task.status !== 'done') task.completedAt = null;
  if (task.status === 'archived' && !task.archivedAt) task.archivedAt = task.updatedAt;
  return task;
}

function setStatus(status, args) {
  const task = mutateTasks(tasks => setStatusIn(tasks, status, args));
  if (status === 'done') logActivity('任务', '完成任务：' + task.title);
  console.log(JSON.stringify({ ok: true, task }, null, 2));
}

function setStatusIn(tasks, status, args) {
  let task;
  if (args.id) {
    task = findTask(tasks, args.id);
  } else if (args.title && args.title !== true) {
    // title lookup so the AI can flip a task's status in ONE command without
    // a read-tasks round trip first: exact match, then unique substring
    // match; ambiguity is an error listing the candidates. The candidate
    // pool depends on the TARGET status — completing searches open tasks,
    // reopening searches done/archived ones, archiving searches the rest.
    const q = String(args.title).trim();
    const SOURCE = { done: ['open'], open: ['done', 'archived'], archived: ['open', 'done'] };
    const pool = tasks.filter(t => (SOURCE[status] || ['open']).includes(t.status));
    const exact = pool.filter(t => t.title === q);
    const fuzzy = exact.length ? exact : pool.filter(t => t.title.includes(q));
    if (!fuzzy.length) throw new Error(`No ${(SOURCE[status] || ['open']).join('/')} task matching title: ${q}`);
    if (fuzzy.length > 1) throw new Error(`Ambiguous title "${q}" — matches: ` + fuzzy.map(t => `${t.id} (${t.title})`).join(', '));
    task = fuzzy[0];
  } else {
    throw new Error('Missing --id (or --title)');
  }
  task.status = status;
  task.updatedAt = isoNow();
  task.completedAt = status === 'done' ? (task.completedAt || task.updatedAt) : null;
  task.archivedAt = status === 'archived' ? (task.archivedAt || task.updatedAt) : null;
  return task;
}

function addSchedule(args) {
  const title = String(args.title || args.text || '').trim();
  if (!title) throw new Error('Missing --title');
  const date = assertDate(args.date, 'date');
  if (!date) throw new Error('Missing --date');
  const startKey = args.start ? timeToMinutes(args.start) : 540;
  // No --end → a point event (endKey = startKey), not a 1h block. Only reject
  // an explicitly-passed --end that doesn't make sense.
  const endKey = args.end ? timeToMinutes(args.end) : startKey;
  if (args.end && endKey <= startKey) throw new Error('schedule --end must be after --start');
  // same id shape as the dashboard's genEventId, so either side can address it
  const ev = { id: 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8), title, startKey, endKey, hour: Math.floor(startKey / 60) };
  // Optional extras — the dashboard's calendar API supports these, so the CLI
  // keeps parity (note shows on the event card). People/location go through
  // the local resolver: matched names are linked with their exact saved
  // spelling, unmatched people are dropped (reported in the output).
  if (args.note && args.note !== true) ev.note = String(args.note);
  const links = resolveLinks(
    args.people && args.people !== true ? parsePeopleArg(args.people) : [],
    args.location && args.location !== true ? String(args.location) : null
  );
  if (links.location) ev.location = links.location;
  if (links.people.length) ev.people = links.people;
  mutateCalendar(calendar => {
    if (!calendar[date]) calendar[date] = [];
    calendar[date].push(ev);
  });
  const fmt = (k) => String(Math.floor(k / 60)).padStart(2, '0') + ':' + String(k % 60).padStart(2, '0');
  logActivity('日程', '新增日程：' + date + ' ' + fmt(startKey)
    + (endKey > startKey ? '-' + fmt(endKey) : '') + ' ' + title
    + (ev.location ? '（' + ev.location + '）' : ''));
  console.log(JSON.stringify({ ok: true, date, event: ev, links }, null, 2));
}

// Remove one calendar event by date + title (exact match, then unique
// substring within that date). Exists mainly so a wrongly-added event can be
// corrected in one command — e.g. after fixing a misspelled name, delete the
// bad event instead of leaving a duplicate behind.
function removeSchedule(args) {
  const date = assertDate(args.date, 'date');
  if (!date) throw new Error('Missing --date');
  const q = String(args.title || '').trim();
  if (!q) throw new Error('Missing --title');
  let removed;
  mutateCalendar(calendar => {
    const evs = Array.isArray(calendar[date]) ? calendar[date] : [];
    const exact = evs.filter(e => e && e.title === q);
    const pool = exact.length ? exact : evs.filter(e => e && String(e.title).includes(q));
    if (!pool.length) throw new Error(`No event on ${date} matching title: ${q}`);
    if (pool.length > 1) throw new Error(`Ambiguous title "${q}" on ${date} — matches: ` + pool.map(e => e.title).join(' / '));
    removed = pool[0];
    calendar[date] = evs.filter(e => e !== removed);
  });
  logActivity('日程', '删除日程：' + date + ' ' + removed.title);
  console.log(JSON.stringify({ ok: true, date, removed }, null, 2));
}

// ─── Recurring reminders ────────────────────────────────────────────────────
// Standing weekly rules ("drink water Mon-Fri at 9/14/17") — a separate list
// in tasks/recurring.json, not materialized into tasks.json/calendar.json.
// Mirrors .loci/dashboard/lib/routes/recurring.js (the dashboard's own write
// path); both land in the same file under the same cross-process lock.
const DAY_ALIASES = {
  '1': 1, 'mon': 1, 'monday': 1, '一': 1, '周一': 1, '星期一': 1,
  '2': 2, 'tue': 2, 'tuesday': 2, '二': 2, '周二': 2, '星期二': 2,
  '3': 3, 'wed': 3, 'wednesday': 3, '三': 3, '周三': 3, '星期三': 3,
  '4': 4, 'thu': 4, 'thursday': 4, '四': 4, '周四': 4, '星期四': 4,
  '5': 5, 'fri': 5, 'friday': 5, '五': 5, '周五': 5, '星期五': 5,
  '6': 6, 'sat': 6, 'saturday': 6, '六': 6, '周六': 6, '星期六': 6,
  '7': 7, 'sun': 7, 'sunday': 7, '日': 7, '天': 7, '周日': 7, '周天': 7, '星期日': 7, '星期天': 7,
};

// Accepts "mon,tue,wed,thu,fri", "1,2,3,4,5", Chinese names/digits either
// comma-separated or run together ("一二三四五"), or the keywords
// daily/weekdays/weekend (English or Chinese).
function parseDaysArg(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return [];
  if (/^(daily|every ?day|每天|每日|天天)$/.test(s)) return [1, 2, 3, 4, 5, 6, 7];
  if (/^(weekdays?|工作日|平时)$/.test(s)) return [1, 2, 3, 4, 5];
  if (/^(weekends?|周末)$/.test(s)) return [6, 7];
  let tokens;
  if (/[,，、;；\s]/.test(s)) tokens = s.split(/[,，、;；\s]+/).filter(Boolean);
  else if (/^[一二三四五六日天]+$/.test(s)) tokens = s.split('');
  else tokens = [s];
  const days = tokens.map(t => DAY_ALIASES[t]).filter(Boolean);
  return [...new Set(days)].sort((a, b) => a - b);
}

function parseTimesArg(v) {
  const s = String(v || '').trim();
  if (!s) return [];
  const parts = s.split(/[,，、;；\s]+/).filter(Boolean);
  return [...new Set(parts.map(t => assertTime(t, 'times')))].sort();
}

function makeRecurringId() {
  return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function readRecurring() {
  const parsed = readJson(RECURRING_DB, { rules: [] });
  const rules = Array.isArray(parsed) ? parsed : parsed.rules;
  if (!Array.isArray(rules)) throw new Error('tasks/recurring.json must contain a rules array');
  return rules;
}

function saveRecurring(rules) {
  withWriteLock(() => writeJson(RECURRING_DB, { rules }));
}

function addRecurring(args) {
  const title = String(args.title || args.text || '').trim();
  if (!title) throw new Error('Missing --title');
  const days = parseDaysArg(args.days);
  if (!days.length) throw new Error('Missing or unrecognized --days (e.g. "mon,tue,wed,thu,fri", "一二三四五", "daily", "weekdays")');
  const times = parseTimesArg(args.times || args.time);
  if (!times.length) throw new Error('Missing --times (e.g. "09:00,14:00")');
  const rule = { id: makeRecurringId(), title, days, times, active: true, createdAt: isoNow() };
  mutateRecurring(rules => { rules.push(rule); });
  logActivity('提醒', '新增重复提醒：' + title + '（周' + days.map(d => '一二三四五六日'[d - 1]).join('') + ' ' + times.join('/') + '）');
  console.log(JSON.stringify({ ok: true, rule }, null, 2));
}

// Looked up by --id, or by --title (exact match preferred, falls back to a
// substring match) — natural-language callers rarely know the id.
function findRecurring(rules, args) {
  if (args.id) {
    const rule = rules.find(r => r.id === args.id);
    if (!rule) throw new Error(`No recurring reminder with id ${args.id}`);
    return rule;
  }
  const title = String(args.title || '').trim();
  if (!title) throw new Error('Missing --id or --title');
  const exact = rules.filter(r => r.title === title);
  const pool = exact.length ? exact : rules.filter(r => r.title.includes(title));
  if (!pool.length) throw new Error(`No recurring reminder matching "${title}"`);
  if (pool.length > 1) throw new Error(`Multiple recurring reminders match "${title}" — use --id (see remind-list)`);
  return pool[0];
}

function toggleRecurring(args) {
  let rule;
  mutateRecurring(rules => {
    rule = findRecurring(rules, args);
    rule.active = !rule.active;
  });
  console.log(JSON.stringify({ ok: true, rule }, null, 2));
}

function removeRecurring(args) {
  let rule;
  mutateRecurring(rules => {
    rule = findRecurring(rules, args);
    return rules.filter(r => r.id !== rule.id);
  });
  console.log(JSON.stringify({ ok: true, removed: rule.id }, null, 2));
}

function listRecurring() {
  console.log(JSON.stringify({ ok: true, rules: readRecurring() }, null, 2));
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
  if (command === 'schedule-remove') return removeSchedule(args);
  if (command === 'remind') return addRecurring(args);
  if (command === 'remind-toggle') return toggleRecurring(args);
  if (command === 'remind-remove') return removeRecurring(args);
  if (command === 'remind-list') return listRecurring();
  if (command === 'names') {
    // One-shot roster: every saved contact and place name. Writes don't need
    // this (add/schedule/update resolve names locally) — it exists for
    // questions like "阿星存过吗" and for correcting an unmatched name.
    console.log(JSON.stringify({ people: scanNames('people'), places: scanNames('places') }));
    return;
  }
  if (command === 'log') {
    const category = String(args.category || '记录').trim();
    const line = String(args.line || '').trim();
    if (!line) throw new Error('Missing --line');
    logActivity(category, line);
    console.log(JSON.stringify({ ok: true }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
