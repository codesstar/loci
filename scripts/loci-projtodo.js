#!/usr/bin/env node
/*
 * loci-projtodo.js — guarded writer for a project's development to-do list.
 *
 * Each connected project keeps its own `.loci/todo.json` (NOT the brain's personal
 * task pool). Every todo has a permanent `id`, so a dashboard can toggle / reorder /
 * remove it by id and write back without ever losing track of which item is which.
 *
 * The brain's `loci-task.js` is the analog for personal tasks; this mirrors its
 * shape (atomic JSON writes, normalize, validate) but lives per-project.
 *
 * Usage:
 *   node scripts/loci-projtodo.js list     --repo <repo>
 *   node scripts/loci-projtodo.js validate --repo <repo>
 *   node scripts/loci-projtodo.js add      --repo <repo> --text "..." [--category "..."] [--status todo|doing|done]
 *   node scripts/loci-projtodo.js update   --repo <repo> --id <id> [--text "..."] [--category "..."] [--status ...] [--date ...] [--startTime ...] [--urgency N] [--importance N] [--color ...] [--note ...]
 *   node scripts/loci-projtodo.js toggle   --repo <repo> --id <id>            # cycles todo → doing → done → todo
 *   node scripts/loci-projtodo.js done     --repo <repo> --id <id>
 *   node scripts/loci-projtodo.js move     --repo <repo> --id <id> --order <n>
 *   node scripts/loci-projtodo.js remove   --repo <repo> --id <id>
 *
 * --repo defaults to the current working directory (so running it from inside a
 * project repo just works).
 */
const fs = require('fs');
const path = require('path');

const STATUSES = ['todo', 'doing', 'done'];

function usage() {
  console.log(`Usage:
  node scripts/loci-projtodo.js list     --repo <repo>
  node scripts/loci-projtodo.js validate --repo <repo>
  node scripts/loci-projtodo.js add      --repo <repo> --text "..." [--category "..."] [--status todo|doing|done]
  node scripts/loci-projtodo.js update   --repo <repo> --id <id> [--text "..."] [--category "..."] [--status ...]
  node scripts/loci-projtodo.js toggle   --repo <repo> --id <id>
  node scripts/loci-projtodo.js done     --repo <repo> --id <id>
  node scripts/loci-projtodo.js move     --repo <repo> --id <id> --order <n>
  node scripts/loci-projtodo.js remove   --repo <repo> --id <id>`);
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

function todoDbPath(repo) {
  return path.join(repo, '.loci', 'todo.json');
}

function makeTodoId(text, existingIds) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const slug = String(text || 'todo')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32) || 'todo';
  // Non-ASCII text slugs collapse to "todo", so same-second adds would collide.
  // Append a short random suffix and ensure uniqueness against existing ids.
  const taken = existingIds instanceof Set ? existingIds : new Set();
  let id;
  do {
    const rand = Math.random().toString(36).slice(2, 6);
    id = `ptd_${stamp}_${slug}_${rand}`;
  } while (taken.has(id));
  return id;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new Error(`${filePath} is invalid JSON: ${error.message}`);
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
  fs.renameSync(tmp, filePath);
}

function assertStatus(value) {
  if (value == null || value === '') return 'todo';
  if (!STATUSES.includes(value)) throw new Error(`status must be one of: ${STATUSES.join(', ')}`);
  return value;
}

function clampLevel(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(2, Math.round(n)));
}

function blankToNull(value) {
  if (value == null || value === true) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeTodo(todo, index, existingIds) {
  const now = isoNow();
  const text = String(todo.text || todo.title || '').trim();
  const status = assertStatus(todo.status || (todo.done ? 'done' : 'todo'));
  const doneAt = todo.doneAt || todo.completedAt || (status === 'done' ? now : null);
  const archivedAt = todo.archivedAt || null;
  return {
    id: todo.id || makeTodoId(text, existingIds),
    title: text,
    text,
    status,
    done: status === 'done',
    date: blankToNull(todo.date),
    endDate: blankToNull(todo.endDate),
    startTime: blankToNull(todo.startTime || todo.start || todo.time),
    endTime: blankToNull(todo.endTime || todo.end),
    project: blankToNull(todo.project),
    urgency: clampLevel(todo.urgency),
    importance: clampLevel(todo.importance),
    plannedFor: blankToNull(todo.plannedFor),
    category: (todo.category && String(todo.category).trim()) || 'Backlog',
    order: Number.isFinite(todo.order) ? todo.order : (index + 1) * 10,
    owner: blankToNull(todo.owner),
    location: blankToNull(todo.location),
    color: blankToNull(todo.color),
    note: blankToNull(todo.note),
    ...(Array.isArray(todo.people) && todo.people.length ? { people: todo.people.map(String) } : {}),
    source: todo.source || 'project',
    createdAt: todo.createdAt || now,
    updatedAt: todo.updatedAt || todo.createdAt || now,
    completedAt: doneAt,
    doneAt,
    archivedAt,
  };
}

function readTodos(repo) {
  const parsed = readJson(todoDbPath(repo), { todos: [] });
  const raw = Array.isArray(parsed) ? parsed : parsed.todos;
  if (!Array.isArray(raw)) throw new Error('.loci/todo.json must contain a todos array');
  return raw.map(normalizeTodo).filter(t => t.text);
}

function saveTodos(repo, todos) {
  writeJson(todoDbPath(repo), { todos });
}

function sortTodos(todos) {
  return todos.slice().sort((a, b) => a.order - b.order);
}

function resolveRepo(args) {
  return path.resolve(args.repo ? String(args.repo) : process.cwd());
}

function cmdList(repo) {
  const todos = sortTodos(readTodos(repo));
  console.log(JSON.stringify({ ok: true, repo, count: todos.length, todos }, null, 2));
}

function cmdValidate(repo) {
  const todos = readTodos(repo);
  const ids = new Set();
  for (const t of todos) {
    if (ids.has(t.id)) throw new Error(`duplicate todo id: ${t.id}`);
    ids.add(t.id);
    assertStatus(t.status);
  }
  console.log(JSON.stringify({ ok: true, repo, count: todos.length, message: 'todo.json valid' }, null, 2));
}

function cmdAdd(repo, args) {
  const text = String(args.text || '').trim();
  if (!text) throw new Error('add requires --text');
  const todos = readTodos(repo);
  const maxOrder = todos.reduce((m, t) => Math.max(m, t.order), 0);
  const existingIds = new Set(todos.map(t => t.id));
  const todo = normalizeTodo({
    text,
    category: args.category,
    status: args.status,
    date: args.date,
    endDate: args.endDate || args['end-date'],
    startTime: args.startTime || args.start,
    endTime: args.endTime || args.end,
    project: args.project,
    urgency: args.urgency,
    importance: args.importance,
    plannedFor: args.plannedFor || args['planned-for'],
    owner: args.owner,
    location: args.location,
    color: args.color,
    note: args.note,
    people: (args.people && args.people !== true) ? String(args.people).split(/[,，、;；]/).map(s => s.trim()).filter(Boolean) : undefined,
    source: args.source || 'project',
    order: maxOrder + 10,
  }, todos.length, existingIds);
  todos.push(todo);
  saveTodos(repo, todos);
  console.log(JSON.stringify({ ok: true, added: todo }, null, 2));
}

function findTodo(todos, id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) throw new Error(`no todo with id: ${id}`);
  return todo;
}

function cmdUpdate(repo, args) {
  if (!args.id) throw new Error('update requires --id');
  const todos = readTodos(repo);
  const todo = findTodo(todos, args.id);
  if (args.text != null && args.text !== true) {
    todo.text = String(args.text).trim();
    todo.title = todo.text;
  }
  if (args.title != null && args.title !== true) {
    todo.title = String(args.title).trim();
    todo.text = todo.title;
  }
  if (args.category != null && args.category !== true) todo.category = String(args.category).trim();
  if (args.status != null && args.status !== true) todo.status = assertStatus(String(args.status));
  if (args.date != null && args.date !== true) todo.date = blankToNull(args.date);
  if (args.endDate != null && args.endDate !== true) todo.endDate = blankToNull(args.endDate);
  if (args['end-date'] != null && args['end-date'] !== true) todo.endDate = blankToNull(args['end-date']);
  if (args.startTime != null && args.startTime !== true) todo.startTime = blankToNull(args.startTime);
  if (args.start != null && args.start !== true) todo.startTime = blankToNull(args.start);
  if (args.endTime != null && args.endTime !== true) todo.endTime = blankToNull(args.endTime);
  if (args.end != null && args.end !== true) todo.endTime = blankToNull(args.end);
  if (args.project != null && args.project !== true) todo.project = blankToNull(args.project);
  if (args.urgency != null && args.urgency !== true) todo.urgency = clampLevel(args.urgency);
  if (args.importance != null && args.importance !== true) todo.importance = clampLevel(args.importance);
  if (args.plannedFor != null && args.plannedFor !== true) todo.plannedFor = blankToNull(args.plannedFor);
  if (args['planned-for'] != null && args['planned-for'] !== true) todo.plannedFor = blankToNull(args['planned-for']);
  if (args.owner != null && args.owner !== true) todo.owner = blankToNull(args.owner);
  if (args.location != null && args.location !== true) todo.location = blankToNull(args.location);
  if (args.color != null && args.color !== true) todo.color = blankToNull(args.color);
  if (args.note != null && args.note !== true) todo.note = blankToNull(args.note);
  if (args.people != null && args.people !== true) {
    const ppl = String(args.people).split(/[,，、;；]/).map(s => s.trim()).filter(Boolean);
    if (ppl.length) todo.people = ppl; else delete todo.people;
  }
  if (args.source != null && args.source !== true) todo.source = String(args.source).trim() || 'project';
  todo.done = todo.status === 'done';
  todo.completedAt = todo.status === 'done' ? (todo.completedAt || todo.doneAt || isoNow()) : null;
  todo.doneAt = todo.completedAt;
  todo.updatedAt = isoNow();
  saveTodos(repo, todos);
  console.log(JSON.stringify({ ok: true, updated: todo }, null, 2));
}

function cmdToggle(repo, args) {
  if (!args.id) throw new Error('toggle requires --id');
  const todos = readTodos(repo);
  const todo = findTodo(todos, args.id);
  const next = STATUSES[(STATUSES.indexOf(todo.status) + 1) % STATUSES.length];
  todo.status = next;
  todo.doneAt = next === 'done' ? isoNow() : null;
  todo.updatedAt = isoNow();
  saveTodos(repo, todos);
  console.log(JSON.stringify({ ok: true, toggled: todo }, null, 2));
}

function cmdDone(repo, args) {
  if (!args.id) throw new Error('done requires --id');
  const todos = readTodos(repo);
  const todo = findTodo(todos, args.id);
  todo.status = 'done';
  todo.doneAt = isoNow();
  todo.updatedAt = isoNow();
  saveTodos(repo, todos);
  console.log(JSON.stringify({ ok: true, done: todo }, null, 2));
}

function cmdMove(repo, args) {
  if (!args.id) throw new Error('move requires --id');
  const order = Number(args.order);
  if (!Number.isFinite(order)) throw new Error('move requires a numeric --order');
  const todos = readTodos(repo);
  const todo = findTodo(todos, args.id);
  todo.order = order;
  todo.updatedAt = isoNow();
  saveTodos(repo, todos);
  console.log(JSON.stringify({ ok: true, moved: todo }, null, 2));
}

function cmdRemove(repo, args) {
  if (!args.id) throw new Error('remove requires --id');
  const todos = readTodos(repo);
  const next = todos.filter(t => t.id !== args.id);
  if (next.length === todos.length) throw new Error(`no todo with id: ${args.id}`);
  saveTodos(repo, next);
  console.log(JSON.stringify({ ok: true, removed: args.id }, null, 2));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (!command || args.help) {
    usage();
    return;
  }
  const repo = resolveRepo(args);
  try {
    switch (command) {
      case 'list': cmdList(repo); break;
      case 'validate': cmdValidate(repo); break;
      case 'add': cmdAdd(repo, args); break;
      case 'update': cmdUpdate(repo, args); break;
      case 'toggle': cmdToggle(repo, args); break;
      case 'done': cmdDone(repo, args); break;
      case 'move': cmdMove(repo, args); break;
      case 'remove': cmdRemove(repo, args); break;
      default:
        console.error(`Unknown command: ${command}`);
        usage();
        process.exit(1);
    }
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exit(1);
  }
}

main();
