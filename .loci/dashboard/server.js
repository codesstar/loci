#!/usr/bin/env node
/**
 * Loci Dashboard — Node.js Local Server
 *
 * Zero npm dependencies. Uses only built-in modules.
 * Serves the dashboard and provides read/write API endpoints.
 *
 * GET  /api/data          — returns full dashboard JSON (built live from brain files)
 * POST /api/tasks/toggle  — toggle a task in tasks.json
 * POST /api/tasks/add     — add a task to tasks.json
 * POST /api/journal/save  — save journal entry
 * POST /api/inbox/add     — add item to inbox.md
 *
 * Static files served from the dashboard directory
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// ─── Configuration ──────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT, 10) || 8765;
const SCRIPT_DIR = __dirname;

// Auto-detect brain root: walk up from __dirname looking for plan.md
function findBrainRoot() {
  let dir = SCRIPT_DIR;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'plan.md'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: read ~/.loci/brain-path
  const brainPathFile = path.join(
    process.env.HOME || process.env.USERPROFILE || '',
    '.loci',
    'brain-path'
  );
  if (fs.existsSync(brainPathFile)) {
    const p = fs.readFileSync(brainPathFile, 'utf-8').trim();
    if (fs.existsSync(path.join(p, 'plan.md'))) return p;
  }
  console.error('WARNING: Could not find brain root (no plan.md found). Using', path.resolve(SCRIPT_DIR, '..', '..', '..'));
  return path.resolve(SCRIPT_DIR, '..', '..', '..');
}

const LOCI_ROOT = findBrainRoot();
const DONE_HIDE_DAYS = 7;
const STALE_AFTER_DAYS = 30;

const CONFIG = {
  title: 'Loci Dashboard',
  username: 'User',
  description: 'Memory Palace for AI',
};

// ─── MIME Types ─────────────────────────────────────────────────────────────

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// ─── Markdown to HTML converter ─────────────────────────────────────────────

function mdToHtml(text) {
  if (!text) return '';
  let html = text;

  // Strip HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    code = code.trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const cls = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${cls}>${code}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Blockquotes
  html = html.replace(/(?:^>.*\n?)+/gm, (match) => {
    const lines = match.split('\n');
    const inner = lines.map(l => l.replace(/^>\s?/, '')).join('\n');
    return `<blockquote>${inner}</blockquote>`;
  });

  // Tables
  html = html.replace(/(?:^\|.+\|$\n?)+/gm, (match) => {
    const rows = match.trim().split('\n');
    if (rows.length < 2) return match;
    let result = '<table>';
    const headers = rows[0].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    result += '<thead><tr>';
    for (const h of headers) result += `<th>${h}</th>`;
    result += '</tr></thead><tbody>';
    for (let i = 2; i < rows.length; i++) {
      const cells = rows[i].trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      result += '<tr>';
      for (const c of cells) result += `<td>${c}</td>`;
      result += '</tr>';
    }
    result += '</tbody></table>';
    return result;
  });

  // Headings (h6 down to h1)
  for (let i = 6; i >= 1; i--) {
    const pattern = new RegExp('^' + '#'.repeat(i) + '\\s+(.+)$', 'gm');
    html = html.replace(pattern, `<h${i}>$1</h${i}>`);
  }

  // Horizontal rule
  html = html.replace(/^---+\s*$/gm, '<hr>');

  // Bold / Italic / Strikethrough
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links and images
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Checkbox list items
  html = html.replace(/^- \[x\]\s+(.+)$/gm,
    '<li class="task done"><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/^- \[ \]\s+(.+)$/gm,
    '<li class="task"><input type="checkbox" disabled> $1</li>');

  // List items
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs
  const lines = html.split('\n');
  const result = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      result.push('');
    } else if (stripped.startsWith('<')) {
      result.push(line);
    } else {
      result.push(`<p>${stripped}</p>`);
    }
  }
  html = result.join('\n');
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html.trim();
}

// ─── YAML frontmatter parser ────────────────────────────────────────────────

function parseFrontmatter(content) {
  if (!content || !content.startsWith('---')) {
    return [{}, content || ''];
  }
  const end = content.indexOf('---', 3);
  if (end === -1) return [{}, content];

  const yamlBlock = content.substring(3, end).trim();
  const body = content.substring(end + 3).trim();

  const meta = {};
  for (const line of yamlBlock.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.substring(0, colonIdx).trim();
    let value = trimmed.substring(colonIdx + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',');
      meta[key] = items
        .map(i => i.trim().replace(/^['"]|['"]$/g, ''))
        .filter(i => i);
    } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      meta[key] = value.toLowerCase() === 'true';
    } else if (/^-?\d+$/.test(value)) {
      meta[key] = parseInt(value, 10);
    } else if (/^-?\d+\.\d+$/.test(value)) {
      meta[key] = parseFloat(value);
    } else {
      meta[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }

  return [meta, body];
}

// ─── File reading helpers ───────────────────────────────────────────────────

function readMdFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const [meta, body] = parseFrontmatter(content);
    const html = mdToHtml(body);
    return {
      meta,
      content: html,
      raw: body,
      filename: path.basename(filepath),
      path: path.relative(LOCI_ROOT, filepath),
    };
  } catch (e) {
    return null;
  }
}

function readMdFileSimple(filepath) {
  const result = readMdFile(filepath);
  if (result) {
    const { raw, ...rest } = result;
    return rest;
  }
  return null;
}

function scanMdFiles(directory) {
  const results = [];
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return results;
  }
  const files = fs.readdirSync(directory).sort();
  for (const fname of files) {
    if (fname.toLowerCase().endsWith('.md') && fname !== 'README.md') {
      const parsed = readMdFileSimple(path.join(directory, fname));
      if (parsed) results.push(parsed);
    }
  }
  return results;
}

function scanMdFilesRecursive(directory) {
  const results = [];
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return results;
  }

  function walk(dir) {
    const entries = fs.readdirSync(dir).sort();
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      let stat;
      try { stat = fs.statSync(fullPath); } catch { continue; }
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.toLowerCase().endsWith('.md') && entry !== 'README.md') {
        const parsed = readMdFileSimple(fullPath);
        if (parsed) results.push(parsed);
      }
    }
  }

  walk(directory);
  return results;
}

// ─── Task database helpers ─────────────────────────────────────────────────

function taskDbPath() {
  return path.join(LOCI_ROOT, 'tasks', 'tasks.json');
}

function activeTaskViewPath() {
  return path.join(LOCI_ROOT, 'tasks', 'active.md');
}

function isoNow() {
  return new Date().toISOString();
}

// Reject path-traversal in user-supplied file keys/names. A safe segment has no
// slash, no "..", no NUL, and no leading dot — so it can never escape its dir.
function isSafeSegment(s) {
  s = String(s == null ? '' : s);
  if (!s || s.length > 200) return false;
  if (s.includes('/') || s.includes('\\') || s.includes('\0')) return false;
  if (s.includes('..') || s.startsWith('.')) return false;
  return true;
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const time = Date.parse(dateStr);
  if (!Number.isFinite(time)) return 0;
  return Math.floor((Date.now() - time) / 86400000);
}

function makeTaskId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `task_${stamp}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTask(task) {
  const now = isoNow();
  const status = task.status || (task.done ? 'done' : 'open');
  return {
    id: task.id || makeTaskId(),
    title: task.title || task.text || '',
    status,
    date: task.date || null,
    endDate: task.endDate || null,
    startTime: task.startTime || null,
    endTime: task.endTime || null,
    project: task.project || null,
    urgency: clampLevel(task.urgency),
    importance: clampLevel(task.importance),
    source: task.source || 'conversation',
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || task.createdAt || now,
    completedAt: task.completedAt || (status === 'done' ? (task.updatedAt || now) : null),
    archivedAt: task.archivedAt || null,
    // task detail fields — all optional, only written when the user sets them,
    // so existing tasks stay clean and untouched.
    location: task.location || null,
    color: task.color || null,
    note: task.note || null,
    // manual drag-to-reorder position; only present once the user has dragged.
    // Kept optional so untouched tasks stay clean and fall back to auto-sort.
    ...(typeof task.manualOrder === 'number' ? { manualOrder: task.manualOrder } : {}),
  };
}

function clampLevel(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(2, Math.round(n)));
}

function loadTaskRecords() {
  const filePath = taskDbPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
    if (!Array.isArray(tasks)) return [];
    return tasks.map(normalizeTask).filter(t => t.title);
  } catch (e) {
    console.error('Failed to read tasks.json:', e.message);
    return [];
  }
}

function saveTaskRecords(tasks) {
  const normalized = tasks.map(normalizeTask).filter(t => t.title);
  const filePath = taskDbPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ tasks: normalized }, null, 2) + '\n', 'utf-8');
  writeActiveTaskView(normalized);
  return normalized;
}

function isTaskStale(task) {
  return task.status === 'open' && daysSince(task.updatedAt || task.createdAt) >= STALE_AFTER_DAYS;
}

function isTaskVisible(task) {
  if (task.status === 'archived') return false;
  if (task.status === 'done') {
    return daysSince(task.completedAt || task.updatedAt) < DONE_HIDE_DAYS;
  }
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

function writeActiveTaskView(tasks) {
  const open = tasks.filter(t => t.status === 'open' && !isTaskStale(t));
  const stale = tasks.filter(t => t.status === 'open' && isTaskStale(t));
  const done = tasks.filter(t => t.status === 'done' && isTaskVisible(t));

  const lines = [
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
  ];

  fs.writeFileSync(activeTaskViewPath(), lines.join('\n') + '\n', 'utf-8');
}

// ─── Data builders ──────────────────────────────────────────────────────────

function buildPlan() {
  const filepath = path.join(LOCI_ROOT, 'plan.md');
  const result = readMdFileSimple(filepath);
  return result || { content: '', meta: {} };
}

function buildInbox() {
  const result = readMdFile(path.join(LOCI_ROOT, 'inbox.md'));
  const items = [];
  if (result && result.raw) {
    const lines = result.raw.split('\n');
    for (const line of lines) {
      const m = line.match(/^[-*]\s+(.+)/);
      if (m) {
        const text = m[1].trim();
        if (text && !text.startsWith('<!--')) {
          items.push({ text, created: result.meta?.updated || '' });
        }
      }
    }
  }
  return {
    content: result ? result.content : '',
    meta: result ? result.meta : {},
    items,
  };
}

function buildMe() {
  const meDir = path.join(LOCI_ROOT, 'me');
  const identity = readMdFileSimple(path.join(meDir, 'identity.md'));
  const goals = readMdFileSimple(path.join(meDir, 'goals.md'));
  const values = readMdFileSimple(path.join(meDir, 'values.md'));
  const learned = readMdFileSimple(path.join(meDir, 'learned.md'));
  const evolution = readMdFileSimple(path.join(meDir, 'evolution.md'));

  const evolutionEntries = [];
  const rawResult = readMdFile(path.join(meDir, 'evolution.md'));
  if (rawResult) {
    let raw = rawResult.raw;
    raw = raw.replace(/<!--[\s\S]*?-->/g, '');
    const entryRegex = /###\s+(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\n([\s\S]*?)(?=\n###|\s*$)/g;
    let match;
    while ((match = entryRegex.exec(raw)) !== null) {
      const cleanedBody = match[3].trim();
      if (cleanedBody) {
        evolutionEntries.push({
          date: match[1],
          type: match[2].trim(),
          content: mdToHtml(cleanedBody),
        });
      }
    }
  }

  return {
    identity: identity || { content: '', meta: {} },
    goals: goals || { content: '', meta: {} },
    values: values || { content: '', meta: {} },
    learned: learned || { content: '', meta: {} },
    evolution: evolution || { content: '', meta: {} },
    evolution_entries: evolutionEntries,
  };
}

function buildTasks() {
  const tasksDir = path.join(LOCI_ROOT, 'tasks');
  const taskRecords = loadTaskRecords();
  writeActiveTaskView(taskRecords);
  const active = readMdFileSimple(path.join(tasksDir, 'active.md'));
  const visibleTasks = taskRecords.filter(isTaskVisible).map(task => ({
    id: task.id,
    text: task.title,
    done: task.status === 'done',
    status: isTaskStale(task) ? 'stale' : task.status,
    stale: isTaskStale(task),
    date: task.date,
    endDate: task.endDate,
    startTime: task.startTime,
    endTime: task.endTime,
    project: task.project,
    urgency: task.urgency || 0,
    importance: task.importance || 0,
    manualOrder: task.manualOrder,
    location: task.location || null,
    color: task.color || null,
    note: task.note || null,
    source: task.source,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
  }));

  return {
    active: active || { content: '', meta: {} },
    records: taskRecords,
    active_tasks: { P1: visibleTasks },
  };
}

function buildPlanning() {
  const tasksDir = path.join(LOCI_ROOT, 'tasks');
  const journalFiles = scanMdFiles(path.join(tasksDir, 'journal'))
    .filter(f => !f.filename.includes('buffer'));
  const weekSummaries = scanMdFiles(path.join(tasksDir, 'journal', 'week'));
  const monthSummaries = scanMdFiles(path.join(tasksDir, 'journal', 'month'));

  let calendarEvents = {};
  const calPath = path.join(tasksDir, 'calendar.json');
  if (fs.existsSync(calPath)) {
    try {
      calendarEvents = JSON.parse(fs.readFileSync(calPath, 'utf-8'));
    } catch (e) {
      // ignore
    }
  }

  return {
    daily: scanMdFiles(path.join(tasksDir, 'daily')),
    monthly: [],
    quarterly: [],
    reviews: [],
    journal: journalFiles,
    journal_weeks: weekSummaries,
    journal_months: monthSummaries,
    calendar_events: calendarEvents,
  };
}

// Read the people relationship edges (people/.connections.json). Undirected:
// each [a, b] means a knows b. Returns { edges: [[a,b],...] }. Fault-tolerant.
function readPeopleConnections() {
  try {
    const f = path.join(LOCI_ROOT, 'people', '.connections.json');
    if (!fs.existsSync(f)) return { edges: [] };
    const parsed = JSON.parse(fs.readFileSync(f, 'utf-8'));
    // each edge: [a, b] or [a, b, "how they know each other"]
    const edges = Array.isArray(parsed.edges) ? parsed.edges.filter(e => Array.isArray(e) && e.length >= 2) : [];
    return { edges };
  } catch { return { edges: [] }; }
}

function buildPeople() {
  const peopleDir = path.join(LOCI_ROOT, 'people');
  const contacts = scanMdFiles(peopleDir);
  const { edges } = readPeopleConnections();
  // attach a `connections` list (other people's names) to each contact's meta,
  // so the relationship-graph view can draw person↔person links.
  const byName = new Map();
  for (const c of contacts) {
    const nm = (c.meta && c.meta.name) ? String(c.meta.name) : null;
    if (nm) byName.set(nm, c);
    if (c.meta) c.meta.connections = [];
  }
  for (const [a, b] of edges) {
    const ca = byName.get(a), cb = byName.get(b);
    if (ca && ca.meta && !ca.meta.connections.includes(b)) ca.meta.connections.push(b);
    if (cb && cb.meta && !cb.meta.connections.includes(a)) cb.meta.connections.push(a);
  }
  return {
    contacts,
    meetings: scanMdFiles(path.join(peopleDir, 'meetings')),
    connections: edges,
  };
}

function buildDecisions() {
  const decisionsDir = path.join(LOCI_ROOT, 'decisions');
  const decisions = scanMdFiles(decisionsDir);
  decisions.sort((a, b) => {
    const da = (a.meta && a.meta.date) || '';
    const db = (b.meta && b.meta.date) || '';
    return db.localeCompare(da);
  });
  return decisions;
}

function buildFinance() {
  const financeDir = path.join(LOCI_ROOT, 'finance');
  return { files: scanMdFiles(financeDir) };
}

function buildContent() {
  const contentDir = path.join(LOCI_ROOT, 'content');
  const files = scanMdFiles(contentDir);

  const platforms = { brands: [], accounts: [] };
  const platformsFile = path.join(contentDir, 'platforms.md');
  if (fs.existsSync(platformsFile)) {
    const result = readMdFile(platformsFile);
    if (result) {
      const raw = result.raw;
      const tableRows = [];
      for (const line of raw.split('\n')) {
        const m = line.match(/^\|(.+)\|$/);
        if (m) tableRows.push(m[1]);
      }
      if (tableRows.length >= 3) {
        for (let i = 2; i < tableRows.length; i++) {
          const cells = tableRows[i].split('|').map(c => c.trim()).filter(c => c);
          if (cells.length >= 4) {
            platforms.accounts.push({
              platform: cells[0],
              name: cells[1],
              content: cells[2] || '',
              frequency: cells[3] || '',
              status: cells[4] || 'active',
            });
          }
        }
      }
    }
  }

  return { files, platforms };
}

function buildLinks() {
  const linksDir = path.join(LOCI_ROOT, '.loci', 'links');
  const links = [];
  if (!fs.existsSync(linksDir) || !fs.statSync(linksDir).isDirectory()) {
    return links;
  }

  const entries = fs.readdirSync(linksDir);
  for (const entry of entries) {
    if (entry === 'registry.md' || entry.startsWith('.')) continue;
    const entryPath = path.join(linksDir, entry);
    let stat;
    try { stat = fs.statSync(entryPath); } catch { continue; }
    if (!stat.isDirectory()) continue;

    const profile = readMdFileSimple(path.join(entryPath, 'profile.md'));
    const toHq = readMdFileSimple(path.join(entryPath, 'to-hq.md'));
    const fromHq = readMdFileSimple(path.join(entryPath, 'from-hq.md'));

    let recentCount = 0;
    if (toHq) {
      const rawToHq = readMdFile(path.join(entryPath, 'to-hq.md'));
      if (rawToHq) {
        const matches = rawToHq.raw.match(/^\d{4}-\d{2}-\d{2}/gm);
        recentCount = matches ? matches.length : 0;
      }
    }

    let isSymlink = false;
    let realPath = entryPath;
    try {
      isSymlink = fs.lstatSync(entryPath).isSymbolicLink();
      if (isSymlink) realPath = fs.realpathSync(entryPath);
    } catch { /* ignore */ }

    links.push({
      name: entry,
      path: realPath,
      is_symlink: isSymlink,
      profile: profile ? profile.meta : {},
      profile_content: profile ? profile.content : '',
      recent_activity: recentCount,
      has_to_hq: toHq !== null,
      has_from_hq: fromHq !== null,
    });
  }

  return links;
}

function buildReferences() {
  const refsDir = path.join(LOCI_ROOT, 'references');
  if (!fs.existsSync(refsDir) || !fs.statSync(refsDir).isDirectory()) {
    return { files: [], total: 0 };
  }
  const files = scanMdFilesRecursive(refsDir);
  files.sort((a, b) => {
    const da = (a.meta && a.meta.date) || '';
    const db = (b.meta && b.meta.date) || '';
    return db.localeCompare(da);
  });
  return { files, total: files.length };
}

// ── Mounted folder sources ─────────────────────────────────────────────
// Loci can "mount" any folder of markdown (e.g. an Obsidian vault, a docs/ dir)
// as a note source. It aggregates, it does not own: the folder stays where it is,
// its files are scanned live each request, and only a small mount record is kept
// in notes/.sources.json — never the file bodies. Record shape:
//   { id, name, path, type, recursive }
function sourcesFile() { return path.join(LOCI_ROOT, 'notes', '.sources.json'); }

function readFolderSources() {
  try {
    const f = sourcesFile();
    if (!fs.existsSync(f)) return [];
    const arr = JSON.parse(fs.readFileSync(f, 'utf-8'));
    if (!Array.isArray(arr)) return [];
    return arr.filter(s => s && s.path && s.id).map(s => ({
      id: String(s.id),
      name: String(s.name || path.basename(s.path)),
      path: String(s.path),
      type: String(s.type || 'folder'),
      recursive: s.recursive !== false,   // default: recurse into subfolders
    }));
  } catch { return []; }
}

function writeFolderSources(list) {
  fs.mkdirSync(path.join(LOCI_ROOT, 'notes'), { recursive: true });
  fs.writeFileSync(sourcesFile(), JSON.stringify(list, null, 2), 'utf-8');
}

// Scan one mounted folder for .md files and return them shaped like note files,
// each carrying its absolute path (so the frontend makes it editable) and the
// owning source id/name (so the left rail can group by source). Live read; a big
// vault is capped so the dashboard never stalls.
function scanFolderSource(src, cap = 500) {
  let root = src.path;
  if (root.startsWith('~/')) root = path.join(require('os').homedir(), root.slice(2));
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return { missing: true, files: [] };
  }
  const out = [];
  const walk = (dir, depth) => {
    if (out.length >= cap) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const ent of entries) {
      if (out.length >= cap) return;
      if (ent.name.startsWith('.')) continue;            // skip .obsidian, .git, etc.
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (src.recursive && depth < 6) walk(full, depth + 1);
      } else if (/\.md$/i.test(ent.name) && ent.name !== 'README.md') {
        const parsed = readMdFileSimple(full);
        if (parsed) {
          out.push({
            filename: full,                               // absolute path = write target
            sourceId: src.id, sourceName: src.name, sourceType: src.type,
            rel: path.relative(root, full),
            content: parsed.content || '', meta: parsed.meta || {},
          });
        }
      }
    }
  };
  walk(root, 0);
  return { missing: false, files: out, capped: out.length >= cap };
}

// Serialize a directory into a folder tree the notes UI can render as a collapsible
// tree. Both "owned" (notes/) and "linked" (mounted vault) folders use this — they
// are the same shape underneath (dirs of markdown), differing only in ownership.
//   node = { id, kind:'folder', name, count, children:[...] }
//        | { id, kind:'note',   title, filename(abs), rel, content, meta, tags, date }
// `filename` is always the ABSOLUTE path → the write target for edits. `count` on a
// folder = total notes beneath it (recursive). Guards: skip dotfiles, cap total notes,
// max depth. `skip` filters files (e.g. index.md in notes/).
function dirToTree(rootAbs, opts = {}) {
  const { maxDepth = 8, cap = 800, skip = () => false, counter = { n: 0 } } = opts;
  const build = (dir, depth) => {
    const folders = [];
    const notes = [];
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return { folders, notes, count: 0 }; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    let count = 0;
    for (const ent of entries) {
      if (counter.n >= cap) break;
      if (ent.name.startsWith('.')) continue;                 // skip .obsidian/.git/…
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (depth >= maxDepth) continue;
        const sub = build(full, depth + 1);
        // hide empty folders — a dir with no markdown anywhere isn't a note folder
        if (sub.count > 0) {
          folders.push({
            id: 'd:' + full, kind: 'folder', name: ent.name,
            count: sub.count, children: [...sub.folders, ...sub.notes],
          });
          count += sub.count;
        }
      } else if (/\.md$/i.test(ent.name) && ent.name !== 'README.md' && !skip(full)) {
        counter.n++;
        const parsed = readMdFileSimple(full);
        const meta = (parsed && parsed.meta) || {};
        const title = meta.title ||
          ((parsed && parsed.content && (parsed.content.match(/<h1[^>]*>(.*?)<\/h1>/i) || [])[1]) || '')
            .replace(/<[^>]+>/g, '') ||
          ent.name.replace(/\.md$/i, '');
        notes.push({
          id: 'f:' + full, kind: 'note', title,
          filename: full, rel: path.relative(rootAbs, full),
          content: (parsed && parsed.content) || '', meta,
          tags: Array.isArray(meta.tags) ? meta.tags : (meta.tags ? [meta.tags] : []),
          date: meta.created || meta.date || '',
        });
        count++;
      }
    }
    return { folders, notes, count };
  };
  const top = build(rootAbs, 0);
  return { children: [...top.folders, ...top.notes], count: top.count, capped: counter.n >= cap };
}

// notes/ = the user's OWN notes (creation drafts, talk scripts, learning notes,
// inline notes). notes/index.md is a one-line pointer index. Like references/,
// this is L2 — shown on its own dashboard page, read-only here.
function buildNotes() {
  const notesDir = path.join(LOCI_ROOT, 'notes');
  if (!fs.existsSync(notesDir) || !fs.statSync(notesDir).isDirectory()) {
    return { index: null, files: [], total: 0 };
  }
  // The index file is rendered separately as the page header; don't list it among entries.
  const indexFile = readMdFileSimple(path.join(notesDir, 'index.md'));

  // Parse index.md's raw markdown into structured external pointers so the
  // frontend can list them like notes. Each pointer line follows the format:
  //   - **<title>** · <link> · <gist> · #tag1 #tag2
  // Parsing the raw markdown here is far more robust than parsing rendered HTML
  // on the client. `index.content` (rendered HTML) is left untouched for compat.
  const pointers = [];
  const indexRaw = readRawBody(path.join(notesDir, 'index.md')) || '';
  for (const rawLine of indexRaw.split('\n')) {
    const line = rawLine.trim();
    if (!line.startsWith('- ')) continue;
    // Accept both bold (`- **title** · …`) and plain (`- title · …`) index rows.
    // Link uses .+? (not \S+) so paths containing spaces (e.g. "Obsidian Vault") match.
    const m = line.match(/^-\s+(?:\*\*(.+?)\*\*|(.+?))\s*·\s*(.+?)\s*·\s*(.+?)\s*·\s*(#.+)$/);
    if (!m) continue;
    const title = (m[1] || m[2] || '').trim();
    const link = m[3].trim();
    // Only rows whose link is an ABSOLUTE path or a URL are real *external*
    // pointers (Obsidian vault file / Feishu / Notion). Rows pointing at
    // `notes/xxx.md` are just internal index lines for inline notes — skip
    // them here so they don't show up twice.
    const isExternal = /^(https?:\/\/|obsidian:\/\/|\/)/.test(link) || /^~\//.test(link);
    if (!isExternal) continue;
    let source = 'external';
    if (/^https?:\/\/(.*\.)?(feishu|larksuite)\./.test(link)) source = 'feishu';
    else if (/^https?:\/\/(.*\.)?notion\./.test(link)) source = 'notion';
    else if (/^obsidian:\/\//.test(link) || /\.md$/i.test(link)) source = 'obsidian';
    else if (/^https?:\/\//.test(link)) source = 'link';

    const ptr = {
      title,
      link,
      source,
      gist: m[4].trim(),
      tags: m[5].split(/\s+/).map(t => t.replace(/^#/, '')).filter(Boolean),
    };
    // A local markdown file (e.g. an Obsidian note) IS markdown — Loci can render
    // its body inline, read fresh from disk each request. This does NOT copy or
    // own the note: nothing is stored, edits happen only in the source app, and a
    // refresh here re-reads the current file. "Readable, not owned."
    let localPath = link;
    if (localPath.startsWith('~/')) localPath = path.join(require('os').homedir(), localPath.slice(2));
    if (path.isAbsolute(localPath) && /\.md$/i.test(localPath)) {
      const parsed = readMdFileSimple(localPath);   // null if missing/unreadable
      if (parsed) {
        ptr.content = parsed.content || '';
        ptr.meta = parsed.meta || {};
        ptr.missing = false;
      } else {
        ptr.missing = true;   // file moved/deleted → show a friendly notice
      }
    }
    pointers.push(ptr);
  }

  const files = scanMdFilesRecursive(notesDir).filter(f => f.filename !== 'index.md');
  files.sort((a, b) => {
    const da = (a.meta && (a.meta.created || a.meta.date)) || '';
    const db = (b.meta && (b.meta.created || b.meta.date)) || '';
    return db.localeCompare(da);
  });

  // User-created categories that have no notes yet, persisted in notes/.categories.json.
  // The left-pane tag nav merges these with tags drawn from actual notes.
  let customCategories = [];
  try {
    const catFile = path.join(notesDir, '.categories.json');
    if (fs.existsSync(catFile)) {
      const arr = JSON.parse(fs.readFileSync(catFile, 'utf-8'));
      if (Array.isArray(arr)) customCategories = arr.filter(c => typeof c === 'string');
    }
  } catch (e) { /* ignore malformed category file */ }

  // Mounted folders (Obsidian vaults, docs dirs, …): scan each live and expose
  // both the flattened note files and the source records for the left-rail nav.
  const folderSources = readFolderSources();
  const folderNotes = [];
  const sourceStates = [];
  for (const src of folderSources) {
    const scan = scanFolderSource(src);
    sourceStates.push({
      id: src.id, name: src.name, path: src.path, type: src.type,
      recursive: src.recursive, missing: !!scan.missing,
      count: scan.files.length, capped: !!scan.capped,
    });
    for (const f of scan.files) folderNotes.push(f);
  }

  // ── Collapsible folder trees (the new left-rail model) ──
  // "owned"  = notes/ itself, a tree Loci truly owns (files live here).
  // "linked" = each mounted folder, a tree Loci only points at (files stay put).
  // Same shape underneath; ownership is the only difference. index.md is not a note.
  const ownedIndex = path.join(notesDir, 'index.md');
  const owned = dirToTree(notesDir, { skip: (f) => f === ownedIndex });
  const linked = folderSources.map(src => {
    let root = src.path;
    if (root.startsWith('~/')) root = path.join(require('os').homedir(), root.slice(2));
    const missing = !fs.existsSync(root) || !fs.statSync(root).isDirectory();
    const tree = missing ? { children: [], count: 0, capped: false } : dirToTree(root, { cap: 500 });
    return {
      id: src.id, name: src.name, path: src.path, type: src.type,
      missing, count: tree.count, capped: tree.capped, children: tree.children,
    };
  });

  return {
    index: indexFile, pointers, files, folderNotes, sources: sourceStates,
    owned, linked,
    customCategories, total: owned.count + linked.reduce((s, l) => s + l.count, 0),
  };
}

// ---- Note editing. Two kinds of markdown files are editable, because they are
// the same thing underneath — plain .md on disk:
//   1. inline notes  → notes/<filename>.md      (identified by a bare filename)
//   2. local externals → e.g. an Obsidian vault  (identified by an absolute path)
// Only *web* links (Feishu/Notion URLs) stay read-only, since there is no local
// file to write. "Same as ours underneath → editable the same way."

// Roots outside the brain that Loci is allowed to write .md files into. Editing an
// absolute path is permitted only if it resolves inside one of these — a guard
// against path traversal writing arbitrary system files.
function noteWriteRoots() {
  const home = require('os').homedir();
  return [
    path.join(home, 'Documents'),   // Obsidian's default vault location
    path.join(home, 'Desktop'),
    path.join(home, 'Obsidian'),
    path.join(home, 'vaults'),
  ];
}

// Resolve a note identifier to a concrete, writable absolute path.
// Returns { file, id, external } or { error }.
//   - bare filename (no slash) → notes/<filename>.md (inline)
//   - absolute path .md within an allowed root → that file (external, editable)
function resolveNotePath(ident) {
  let s = String(ident || '').trim();
  if (!s) return { error: 'Bad filename' };
  if (s.startsWith('~/')) s = path.join(require('os').homedir(), s.slice(2));

  if (path.isAbsolute(s)) {
    if (!/\.md$/i.test(s)) return { error: 'Not a markdown file' };
    const real = path.resolve(s);
    const ok = noteWriteRoots().some(root => real === root || real.startsWith(root + path.sep));
    if (!ok) return { error: '这个位置不允许编辑' };
    return { file: real, id: real, external: true };
  }
  // otherwise treat as an inline note filename
  if (!isSafeSegment(s)) return { error: 'Bad filename' };
  if (!s.endsWith('.md')) return { error: 'Not a markdown file' };
  return { file: path.join(LOCI_ROOT, 'notes', s), id: s, external: false };
}

// Return the raw markdown of a note (inline or local-external) for the editor.
function handleNoteRaw(query) {
  const r = resolveNotePath(query && query.file);
  if (r.error) return { error: r.error };
  if (!fs.existsSync(r.file)) return { error: 'Note not found' };
  try {
    return { ok: true, filename: r.id, external: r.external, md: fs.readFileSync(r.file, 'utf-8') };
  } catch (e) {
    return { error: 'Could not read note' };
  }
}

// Overwrite a note's markdown with the edited text (inline or local-external).
function handleNoteSave(body) {
  const { filename, md } = body || {};
  if (typeof md !== 'string') return { error: 'Missing content' };
  const r = resolveNotePath(filename);
  if (r.error) return { error: r.error };
  if (!fs.existsSync(r.file)) return { error: 'Note not found' };
  try {
    fs.writeFileSync(r.file, md, 'utf-8');
    return { ok: true, filename: r.id };
  } catch (e) {
    return { error: 'Could not save note' };
  }
}

// Serialize a props object into a YAML frontmatter block. tags → inline array;
// values with YAML-special chars get JSON-quoted so they round-trip through
// parseFrontmatter. Order: title, tags, date/created/updated first, then the rest.
function propsToFrontmatter(props) {
  const lines = ['---'];
  const quote = v => {
    const s = String(v);
    return /[:#\[\]{}"']/.test(s) ? JSON.stringify(s) : s;
  };
  const emit = (k, v) => {
    if (v == null || v === '') return;
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map(x => quote(x)).join(', ')}]`);
    } else {
      lines.push(`${k}: ${quote(v)}`);
    }
  };
  // preferred order for the common fields
  const order = ['title', 'tags', 'created', 'date', 'updated', 'link'];
  order.forEach(k => { if (k in props) emit(k, props[k]); });
  // then any remaining custom fields, in their own order
  Object.keys(props).forEach(k => { if (!order.includes(k)) emit(k, props[k]); });
  lines.push('---');
  return lines.join('\n');
}

// Update a note's frontmatter (title/tags/date/link/custom) WITHOUT touching the
// body — reads the file, keeps the markdown body, rewrites only the YAML on top.
function handleNoteProps(body) {
  const { filename, props } = body || {};
  if (!props || typeof props !== 'object') return { error: 'Missing props' };
  const r = resolveNotePath(filename);
  if (r.error) return { error: r.error };
  if (!fs.existsSync(r.file)) return { error: 'Note not found' };
  try {
    const raw = fs.readFileSync(r.file, 'utf-8');
    const [, mdBody] = parseFrontmatter(raw);   // keep the body verbatim
    const next = { ...props };
    next.updated = new Date().toISOString().slice(0, 10);   // stamp edits
    const front = propsToFrontmatter(next);
    fs.writeFileSync(r.file, front + '\n\n' + (mdBody || '') + '\n', 'utf-8');
    return { ok: true, filename: r.id };
  } catch (e) {
    return { error: 'Could not save properties' };
  }
}

// Create a new inline note (a fresh notes/<slug>.md) and return its filename.
function handleNoteCreate(body) {
  const title = (body && body.title ? String(body.title) : '').trim() || '新笔记';
  // slugify: keep CJK + alnum, collapse the rest to '-'
  let slug = title.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'note';
  const notesDir = path.join(LOCI_ROOT, 'notes');
  try { fs.mkdirSync(notesDir, { recursive: true }); } catch (e) {}
  // avoid clobbering an existing file
  let filename = slug + '.md';
  let n = 2;
  while (fs.existsSync(path.join(notesDir, filename))) { filename = slug + '-' + n + '.md'; n++; }
  if (!isSafeSegment(filename)) return { error: 'Bad title' };
  const today = new Date().toISOString().slice(0, 10);
  const md = `---\ntitle: ${title}\ntags: []\ncreated: ${today}\nupdated: ${today}\n---\n\n# ${title}\n\n`;
  try {
    fs.writeFileSync(path.join(notesDir, filename), md, 'utf-8');
    return { ok: true, filename, md, title };
  } catch (e) {
    return { error: 'Could not create note' };
  }
}

// Create a subfolder inside notes/ (the owned tree). `parent` is a path relative to
// notes/ (each segment isSafeSegment-guarded, so no traversal out of notes/); empty
// parent = notes/ root. `name` is the new folder's name. Owned-only: we never mkdir
// inside a linked/external source.
function handleNoteMkdir(body) {
  const name = (body && body.name ? String(body.name) : '').trim();
  if (!name || !isSafeSegment(name)) return { error: '文件夹名不合法' };
  const parent = (body && body.parent ? String(body.parent) : '').trim();
  const notesDir = path.join(LOCI_ROOT, 'notes');
  let baseDir = notesDir;
  if (parent) {
    const segs = parent.split('/').filter(Boolean);
    for (const s of segs) {
      if (!isSafeSegment(s)) return { error: '父目录不合法' };
    }
    baseDir = path.join(notesDir, ...segs);
    // parent must resolve inside notes/ and already exist
    if (!path.resolve(baseDir).startsWith(path.resolve(notesDir) + path.sep) ||
        !fs.existsSync(baseDir)) {
      return { error: '父目录不存在' };
    }
  }
  const target = path.join(baseDir, name);
  if (fs.existsSync(target)) return { error: '这个文件夹已存在' };
  try {
    fs.mkdirSync(target, { recursive: false });
    return { ok: true, rel: path.relative(notesDir, target) };
  } catch (e) {
    return { error: '新建文件夹失败' };
  }
}

// Delete an inline note's .md file. Only removes notes/<filename>; never touches
// external pointers. Guarded by isSafeSegment against path traversal.
function handleNoteDelete(body) {
  const { filename } = body || {};
  // Resolve like save/props/raw do: accepts a bare inline filename OR an absolute
  // path inside an allowed root. The left-rail tree keys its leaves by ABSOLUTE
  // path (dirToTree → filename: full), so a plain isSafeSegment check here would
  // reject every tree-driven delete with "Bad filename". resolveNotePath keeps the
  // same path-traversal guard while handling both shapes.
  const r = resolveNotePath(filename);
  if (r.error) return { error: r.error };
  if (!fs.existsSync(r.file)) return { error: 'Note not found' };
  try {
    fs.unlinkSync(r.file);
    return { ok: true, filename };
  } catch (e) {
    return { error: 'Could not delete note' };
  }
}

// Import an EXTERNAL note (e.g. an Obsidian vault file) as a pointer, WITHOUT
// copying its body into the brain. Loci aggregates, it does not own: we read the
// file only to auto-fill title/gist/tags, then append one index line to
// notes/index.md whose link is the file's ABSOLUTE path. The original file is
// never modified or moved. Accepts an absolute path or a URL.
function handleNoteImport(body) {
  let src = (body && (body.path || body.link) ? String(body.path || body.link) : '').trim();
  if (!src) return { error: '缺少文件路径或链接' };
  // expand a leading ~ to the user's home
  if (src.startsWith('~/')) src = path.join(require('os').homedir(), src.slice(2));

  const isUrl = /^(https?:\/\/|obsidian:\/\/)/.test(src);
  let title = (body && body.title ? String(body.title).trim() : '');
  let gist = (body && body.gist ? String(body.gist).trim() : '');
  let tags = Array.isArray(body && body.tags) ? body.tags.map(String) : [];

  if (!isUrl) {
    // must be an absolute path to an existing readable file
    if (!path.isAbsolute(src)) return { error: '请用绝对路径(以 / 开头)或链接' };
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) return { error: '找不到这个文件' };
    try {
      const raw = fs.readFileSync(src, 'utf-8');
      const [meta, mdBody] = parseFrontmatter(raw);
      if (!title) {
        title = (meta && meta.title) ||
          ((mdBody.match(/^#\s+(.+)$/m) || [])[1]) ||
          path.basename(src).replace(/\.md$/i, '');
      }
      if (!tags.length && meta && Array.isArray(meta.tags)) tags = meta.tags.map(String);
      if (!gist) {
        // first non-empty, non-heading line → one-line gist
        const firstLine = (mdBody.split('\n')
          .map(l => l.trim())
          .find(l => l && !l.startsWith('#'))) || '';
        gist = firstLine.replace(/[*_`]/g, '').slice(0, 60);
      }
    } catch (e) {
      return { error: '读不了这个文件' };
    }
  }
  title = title || '外部笔记';
  gist = gist || '(外部笔记)';
  const tagStr = (tags.length ? tags : ['笔记']).map(t => '#' + String(t).replace(/^#/, '')).join(' ');

  // Append the pointer line to notes/index.md (create the file if missing).
  const notesDir = path.join(LOCI_ROOT, 'notes');
  const indexFile = path.join(notesDir, 'index.md');
  try {
    fs.mkdirSync(notesDir, { recursive: true });
    let content = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf-8') : '# Notes\n';
    // avoid importing the same file twice
    if (content.includes('· ' + src + ' ·')) {
      return { error: '这个文件已经引入过了' };
    }
    const line = `- ${title} · ${src} · ${gist} · ${tagStr}`;
    // Prefer to slot it under an "## 外部笔记" heading; create one if absent.
    const heading = '## 外部笔记';
    if (content.includes(heading)) {
      content = content.replace(heading, heading + '\n\n' + line);
    } else {
      content = content.replace(/\s*$/, '') + `\n\n${heading}\n\n${line}\n`;
    }
    fs.writeFileSync(indexFile, content, 'utf-8');
    return { ok: true, title, link: src, gist, tags };
  } catch (e) {
    return { error: '写入索引失败' };
  }
}

// Remove a pasted URL pointer: an external link isn't a file, it's ONE line in
// notes/index.md (format: "- title · link · gist · #tags"). handleNoteDelete only
// unlinks real files, so URL pointers need this — match the line by its link and
// drop it. Nothing on disk is touched beyond index.md; the remote doc is untouched.
function handleNoteUnlink(body) {
  const link = (body && body.link ? String(body.link) : '').trim();
  if (!link) return { error: '缺少链接' };
  const indexFile = path.join(LOCI_ROOT, 'notes', 'index.md');
  if (!fs.existsSync(indexFile)) return { error: '索引文件不存在' };
  try {
    const lines = fs.readFileSync(indexFile, 'utf-8').split('\n');
    // a pointer line contains the link between " · " separators
    const kept = lines.filter(l => !(l.trim().startsWith('- ') && l.includes('· ' + link + ' ·')));
    if (kept.length === lines.length) return { error: '没找到这个链接' };
    fs.writeFileSync(indexFile, kept.join('\n'), 'utf-8');
    return { ok: true, link };
  } catch (e) {
    return { error: '移除失败' };
  }
}

// Pop a native folder picker (macOS) so the user can choose a folder to mount.
function handleFolderBrowse() {
  if (process.platform !== 'darwin') return { error: '文件夹选择目前只支持 macOS' };
  try {
    const { execFileSync } = require('child_process');
    const script = 'POSIX path of (choose folder with prompt "选择要引入的笔记文件夹")';
    const out = execFileSync('osascript', ['-e', script], { timeout: 120000, encoding: 'utf-8' }).trim();
    if (!out) return { error: 'cancelled' };
    return { ok: true, path: out.replace(/\/+$/, '') };
  } catch (e) {
    return { error: 'cancelled' };
  }
}

// Reveal the notes/ folder (or a subfolder within it) in the OS file manager, so
// the user can create folders / drag files around with the native tools. Guarded:
// the target must resolve inside notes/ — no escaping the brain. `sub` is optional.
function handleNoteReveal(body) {
  const sub = (body && body.sub ? String(body.sub) : '').trim();
  const notesDir = path.join(LOCI_ROOT, 'notes');
  let target = notesDir;
  if (sub) {
    const resolved = path.resolve(notesDir, sub);
    if (resolved !== notesDir && !resolved.startsWith(notesDir + path.sep)) {
      return { error: '路径不允许' };
    }
    target = resolved;
  }
  if (!fs.existsSync(target)) { try { fs.mkdirSync(target, { recursive: true }); } catch (e) { return { error: '文件夹不存在' }; } }
  try {
    const { execFile } = require('child_process');
    const cmd = process.platform === 'darwin' ? 'open'
      : (process.platform === 'win32' ? 'explorer' : 'xdg-open');
    execFile(cmd, [target], () => {});   // fire-and-forget; don't block the response
    return { ok: true, path: target };
  } catch (e) {
    return { error: '打不开文件夹' };
  }
}

// Mount a folder as a note source: record it in notes/.sources.json. Nothing in
// the folder is copied or moved — Loci only remembers the path and scans it live.
// If the folder contains a `.obsidian/` dir, it's tagged as an Obsidian vault.
function handleSourceMount(body) {
  let p = (body && body.path ? String(body.path) : '').trim();
  if (!p) return { error: '缺少文件夹路径' };
  if (p.startsWith('~/')) p = path.join(require('os').homedir(), p.slice(2));
  if (!path.isAbsolute(p)) return { error: '请用绝对路径' };
  p = p.replace(/\/+$/, '');
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) return { error: '找不到这个文件夹' };

  // Only allow mounting folders under the same write-roots we allow editing in,
  // so a mounted note stays editable and we never index arbitrary system dirs.
  const real = path.resolve(p);
  const allowed = noteWriteRoots().some(root => real === root || real.startsWith(root + path.sep));
  if (!allowed) return { error: '这个位置不允许引入(仅限个人文件夹)' };

  const sources = readFolderSources();
  if (sources.some(s => path.resolve(s.path) === real)) return { error: '这个文件夹已经引入过了' };

  const isObsidian = fs.existsSync(path.join(p, '.obsidian'));
  const name = (body && body.name ? String(body.name).trim() : '') || path.basename(p);
  // stable-ish id without Date.now(): base on the path
  const id = 'src-' + Buffer.from(real).toString('base64').replace(/[^a-z0-9]/gi, '').slice(-12).toLowerCase();
  const record = { id, name, path: p, type: isObsidian ? 'obsidian' : 'folder', recursive: true };
  sources.push(record);
  try {
    writeFolderSources(sources);
    const scan = scanFolderSource(record);
    return { ok: true, source: record, count: scan.files.length };
  } catch (e) {
    return { error: '保存挂载记录失败' };
  }
}

// Unmount a folder source: remove its record from notes/.sources.json. This only
// forgets the folder — it never deletes or touches the folder or its files.
function handleSourceUnmount(body) {
  const id = (body && body.id ? String(body.id) : '').trim();
  if (!id) return { error: '缺少来源 id' };
  const sources = readFolderSources();
  const next = sources.filter(s => s.id !== id);
  if (next.length === sources.length) return { error: '找不到这个来源' };
  try {
    writeFolderSources(next);
    return { ok: true, id };
  } catch (e) {
    return { error: '移除失败' };
  }
}

function buildLearning() {
  const learningDir = path.join(LOCI_ROOT, 'content', 'learning');
  const entries = scanMdFiles(learningDir);
  entries.sort((a, b) => {
    const da = (a.meta && a.meta.date) || '';
    const db = (b.meta && b.meta.date) || '';
    return db.localeCompare(da);
  });
  return entries;
}

// Read a markdown file's body (frontmatter stripped), preserving raw text.
function readRawBody(filepath) {
  const parsed = readMdFile(filepath);
  return parsed ? parsed.raw : null;
}

// Read a connected project's own .loci/todo.json (guarded by loci-projtodo.js).
// Returns a sorted, lightweight array for the dashboard; never throws on a bad
// or missing file — a project simply shows no todos rather than breaking the page.
function readProjectTodos(repoPath) {
  try {
    const todoFile = path.join(repoPath, '.loci', 'todo.json');
    if (!fs.existsSync(todoFile)) return [];
    const parsed = JSON.parse(fs.readFileSync(todoFile, 'utf-8'));
    const todos = Array.isArray(parsed) ? parsed : parsed.todos;
    if (!Array.isArray(todos)) return [];
    return todos
      .filter(t => t && (t.text || t.title))
      .map(t => ({
        id: t.id || null,
        text: String(t.text || t.title || '').trim(),
        status: ['todo', 'doing', 'done'].includes(t.status) ? t.status : 'todo',
        category: (t.category && String(t.category).trim()) || 'Backlog',
        order: Number.isFinite(t.order) ? t.order : 0,
      }))
      .sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

// Read a connected project's own .loci/memory.md (its living dossier) for the
// detail panel. Never throws — a project with no/unreadable memory just shows
// nothing rather than breaking the page. Returns rendered html + meta.
function readProjectMemory(repoPath) {
  try {
    const memFile = path.join(repoPath, '.loci', 'memory.md');
    if (!fs.existsSync(memFile)) return null;
    return readMdFileSimple(memFile);
  } catch {
    return null;
  }
}

// Read a connected project's OWN decision stream (<repo>/.loci/decisions/*.md).
// The decision files are named YYYY-MM-DD-slug.md and start with "# Title".
// Fully fault-tolerant: no dir / unreadable → []. Returns newest-first
// [{ title, date }], capped at `limit`.
function readProjectDecisions(repoPath, limit = 5) {
  try {
    const decDir = path.join(repoPath, '.loci', 'decisions');
    if (!fs.existsSync(decDir)) return [];
    const files = fs.readdirSync(decDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse()
      .slice(0, limit);
    return files.map(f => {
      const dateMatch = f.match(/(\d{4})-(\d{2})-(\d{2})/);
      const date = dateMatch ? `${dateMatch[2]}-${dateMatch[3]}` : '';
      let title = f.replace(/\.md$/, '');
      try {
        const head = fs.readFileSync(path.join(decDir, f), 'utf-8').split('\n');
        const h1 = head.find(l => /^#\s+/.test(l));
        if (h1) title = h1.replace(/^#\s+/, '').trim();
      } catch {}
      return { title, date };
    });
  } catch {
    return [];
  }
}

// Read a connected project's recent git commits via `git log`. Fully
// fault-tolerant: not a git repo / git missing / timeout → []. Returns
// [{ sha, msg, rel }] newest-first, capped at `limit`.
function readProjectGitLog(repoPath, limit = 4) {
  try {
    const { execFileSync } = require('child_process');
    const SEP = '|::|';   // unlikely to appear in a commit subject
    const out = execFileSync(
      'git',
      ['-C', repoPath, 'log', `-${limit}`, '--no-merges', `--pretty=format:%h${SEP}%s${SEP}%cr`],
      { encoding: 'utf-8', timeout: 2000, stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return out.split('\n').filter(Boolean).map(line => {
      const [sha, msg, rel] = line.split(SEP);
      return { sha: sha || '', msg: msg || '', rel: rel || '' };
    });
  } catch {
    return [];
  }
}

// projects/index.md = light index of serious projects (one `## name` block each).
// projects/side.md  = embryos under `## Incubating` / `## Archive` (one `### name` each).
// The brain only aggregates: full project memory lives in each repo's .loci/.
function buildProjects() {
  const projectsDir = path.join(LOCI_ROOT, 'projects');

  // --- index.md: serious projects ---
  // Drop the leading template/help comment block, then split on top-level "## ".
  // Each real entry: "## name   <!-- status: X -->" + description lines.
  const indexRaw = readRawBody(path.join(projectsDir, 'index.md'));
  const serious = [];
  if (indexRaw) {
    const withoutComments = indexRaw.replace(/<!--(?!\s*status:)[\s\S]*?-->/g, '');
    const blocks = withoutComments.split(/^## +/m).slice(1);
    for (const block of blocks) {
      const lines = block.split('\n');
      const headline = lines.shift() || '';
      const statusMatch = headline.match(/<!--\s*status:\s*([a-z]+)\s*-->/i);
      const name = headline.replace(/<!--[\s\S]*?-->/g, '').trim();
      if (!name) continue;
      const bodyText = lines.join('\n').replace(/<!--[\s\S]*?-->/g, '').trim();
      // Each index entry carries "repo: <path>. memory: ..." — follow the repo
      // path into the project's own .loci/todo.json to show that project's todos.
      // Path may contain spaces (e.g. "loci copy"); terminate at ". memory:" or EOL.
      const repoMatch = bodyText.match(/repo:\s*(.+?)(?:\.\s*memory:|\.?\s*$)/m);
      const repoPath = repoMatch ? repoMatch[1].trim() : null;
      // The index line embeds "<desc>. repo: <path>. memory: <path>" — show the
      // human description only, strip the machine path trailer.
      const firstLine = bodyText.split('\n')[0] || '';
      const cleanSummary = firstLine.replace(/\.?\s*repo:.*$/i, '').trim();
      serious.push({
        name,
        status: statusMatch ? statusMatch[1].toLowerCase() : 'active',
        summary: cleanSummary || firstLine,
        detail: bodyText,
        repo: repoPath,
        // The project's full dossier lives in its OWN repo (.loci/memory.md). The
        // brain only indexes — so read it on demand here for the detail panel.
        memory: repoPath ? readProjectMemory(repoPath) : null,
        todos: repoPath ? readProjectTodos(repoPath) : [],
        // The project's own decision stream + recent git commits (both fault-
        // tolerant; absent → empty arrays, never breaks the page).
        decisions: repoPath ? readProjectDecisions(repoPath) : [],
        commits: repoPath ? readProjectGitLog(repoPath) : [],
      });
    }
  }

  // --- side.md: project embryos under Incubating / Archive ---
  const sideRaw = readRawBody(path.join(projectsDir, 'side.md'));
  const incubating = [];
  const archived = [];
  if (sideRaw) {
    let bucket = null;
    for (const rawLine of sideRaw.split('\n')) {
      const line = rawLine.trim();
      if (/^##\s+Incubating/i.test(line)) { bucket = incubating; continue; }
      if (/^##\s+Archive/i.test(line)) { bucket = archived; continue; }
      const m = line.match(/^###\s+(.+)/);
      if (m && bucket) {
        const text = m[1].replace(/<!--[\s\S]*?-->/g, '').trim();
        if (text) bucket.push({ name: text });
      }
    }
  }

  return {
    serious,
    side: { incubating, archived },
  };
}

// ─── Statistics ──────────────────────────────────────────────────────────────

function countTotalFiles() {
  let count = 0;
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const fullPath = path.join(dir, entry);
      let stat;
      try { stat = fs.statSync(fullPath); } catch { continue; }
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.md')) {
        count++;
      }
    }
  }
  walk(LOCI_ROOT);
  return count;
}

function buildStats(data) {
  const tasks = (data.tasks && data.tasks.active_tasks) || {};
  let totalTasks = 0;
  let doneTasks = 0;
  for (const key of Object.keys(tasks)) {
    totalTasks += tasks[key].length;
    doneTasks += tasks[key].filter(t => t.done).length;
  }

  return {
    total_files: countTotalFiles(),
    total_tasks: totalTasks,
    done_tasks: doneTasks,
    total_people: (data.people && data.people.contacts) ? data.people.contacts.length : 0,
    total_decisions: Array.isArray(data.decisions) ? data.decisions.length : 0,
    total_daily_plans: (data.planning && data.planning.daily) ? data.planning.daily.length : 0,
    total_monthly_plans: (data.planning && data.planning.monthly) ? data.planning.monthly.length : 0,
    total_quarterly_plans: (data.planning && data.planning.quarterly) ? data.planning.quarterly.length : 0,
    total_projects: (data.projects && data.projects.serious) ? data.projects.serious.length : 0,
    total_project_todos: projectTodoCount(data).total,
    done_project_todos: projectTodoCount(data).done,
  };
}

function projectTodoCount(data) {
  let total = 0;
  let done = 0;
  const serious = (data.projects && data.projects.serious) || [];
  for (const p of serious) {
    for (const t of (p.todos || [])) {
      total += 1;
      if (t.status === 'done') done += 1;
    }
  }
  return { total, done };
}

// ─── Overview (总览) ─────────────────────────────────────────────────────────
// Aggregates real data from tasks.json / decisions / notes / projects into the
// shape the Overview page renders. No fabricated metrics — every number traces
// back to a file. Built last in buildAllData() so it can read sibling sections.
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function stripHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function dayKey(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function buildOverview(data) {
  const records = loadTaskRecords(); // structured tasks.json
  const now = new Date();
  const todayKey = dayKey(now);

  const open = records.filter(t => t.status === 'open');
  const done = records.filter(t => t.status === 'done');

  // 7-day completion trend, oldest → newest, bucketed by completedAt
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ key: dayKey(d), label: WEEKDAY_SHORT[d.getDay()], count: 0 });
  }
  const byKey = Object.fromEntries(days.map(d => [d.key, d]));
  let doneThisWeek = 0;
  for (const t of done) {
    if (!t.completedAt) continue;
    const k = dayKey(new Date(t.completedAt));
    if (byKey[k]) { byKey[k].count += 1; doneThisWeek += 1; }
  }
  const trendMax = Math.max(1, ...days.map(d => d.count));

  // Today's tasks: dated today, or open & undated (always-relevant pool)
  const intersectsToday = t => {
    if (t.date && t.date <= todayKey && (!t.endDate || t.endDate >= todayKey)) return true;
    return false;
  };
  const todayTasks = open
    .filter(t => intersectsToday(t))
    .map(t => ({ id: t.id, text: t.title, date: t.date, startTime: t.startTime, project: t.project, status: t.status }));

  const recentDone = [...done]
    .filter(t => t.completedAt)
    .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
    .slice(0, 6)
    .map(t => ({ text: t.title, completedAt: t.completedAt }));

  const decisions = Array.isArray(data.decisions) ? data.decisions : [];
  const recentDecisions = decisions.slice(0, 6).map(d => ({
    title: stripHtml((d.content || '').split('\n')[0]) || d.filename,
    date: (d.meta && d.meta.date) || '',
    tags: (d.meta && d.meta.tags) || [],
  }));

  const noteFiles = (data.notes && data.notes.files) || [];
  const recentNotes = noteFiles.slice(0, 5).map(n => ({
    title: (n.meta && n.meta.title) || n.filename,
    date: (n.meta && (n.meta.created || n.meta.date)) || '',
    tags: (n.meta && n.meta.tags) || [],
  }));

  const serious = (data.projects && data.projects.serious) || [];
  const projects = serious.map(p => {
    const todos = p.todos || [];
    return {
      name: p.name,
      status: p.status || 'active',
      total: todos.length,
      done: todos.filter(t => t.status === 'done').length,
    };
  });

  return {
    kpis: {
      activeTasks: open.length,
      doneThisWeek,
      projects: serious.length,
      decisions: decisions.length,
    },
    trend: { days, max: trendMax },
    todayTasks,
    recentDone,
    recentDecisions,
    recentNotes,
    projects,
  };
}

// ─── Build all data ─────────────────────────────────────────────────────────

// The user's name lives in me/identity.md ("- **Name**: …"), written by setup.
function readUsername() {
  try {
    const identity = fs.readFileSync(path.join(LOCI_ROOT, 'me', 'identity.md'), 'utf-8');
    const m = identity.match(/\*\*Name\*\*[:：]\s*(.+)/);
    if (m && m[1].trim()) return m[1].trim();
  } catch { /* fall through to default */ }
  return CONFIG.username;
}

function buildAllData() {
  const data = { config: { ...CONFIG, username: readUsername() } };

  const sections = [
    ['plan', buildPlan],
    ['inbox', buildInbox],
    ['me', buildMe],
    ['tasks', buildTasks],
    ['planning', buildPlanning],
    ['people', buildPeople],
    ['decisions', buildDecisions],
    ['finance', buildFinance],
    ['content', buildContent],
    ['learning', buildLearning],
    ['links', buildLinks],
    ['references', buildReferences],
    ['notes', buildNotes],
    ['projects', buildProjects],
  ];

  for (const [name, builder] of sections) {
    data[name] = builder();
  }

  data.stats = buildStats(data);
  data.overview = buildOverview(data);
  const now = new Date();
  data.build_time = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');

  return data;
}

// ─── Write-back API handlers ────────────────────────────────────────────────

function handleTaskToggle(body) {
  const { id, task, checked } = body;
  const tasks = loadTaskRecords();
  const target = tasks.find(t => (id && t.id === id) || (!id && task && t.title.trim() === task.trim()));
  if (!target) return { error: 'Task not found' };

  target.status = checked ? 'done' : 'open';
  target.updatedAt = isoNow();
  target.completedAt = checked ? (target.completedAt || target.updatedAt) : null;
  saveTaskRecords(tasks);
  return { ok: true, task: target, checked };
}

// Project todos live in each project's own repo (.loci/todo.json), guarded by
// scripts/loci-projtodo.js. The dashboard writes back by invoking that script —
// so the validate/atomic-write logic stays in one place and is never duplicated.
function projTodoScript() {
  // server.js is at <brain>/.loci/dashboard/; the writer ships in the engine repo.
  // Prefer the engine repo the brain was set up from, but it's the SAME script in
  // every install, so resolve relative to this brain's scripts/ first, then repo.
  const candidates = [
    path.join(LOCI_ROOT, 'scripts', 'loci-projtodo.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function handleProjectTodo(action, body) {
  const { repo, id, text, category, status, order } = body;
  if (!repo) return { error: 'Missing repo path' };
  const script = projTodoScript();
  if (!script) return { error: 'loci-projtodo.js not found in this brain' };

  const { execFileSync } = require('child_process');
  const args = [script, action, '--repo', repo];
  if (action === 'add') {
    if (!text || !String(text).trim()) return { error: 'Missing todo text' };
    args.push('--text', String(text).trim());
    if (category) args.push('--category', String(category));
    if (status) args.push('--status', String(status));
  } else {
    if (!id) return { error: 'Missing todo id' };
    args.push('--id', String(id));
    if (action === 'update') {
      if (text != null) args.push('--text', String(text));
      if (category != null) args.push('--category', String(category));
      if (status != null) args.push('--status', String(status));
    }
    if (action === 'move') {
      if (order == null) return { error: 'Missing order' };
      args.push('--order', String(order));
    }
  }
  try {
    const out = execFileSync('node', args, { encoding: 'utf-8' });
    return JSON.parse(out);
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : e.message;
    try { return { error: JSON.parse(stderr).error || stderr }; }
    catch { return { error: stderr }; }
  }
}

// Connect a project for real: invoke scripts/loci-project.js connect, which
// creates <repo>/.loci/ (memory.md + todo.json + decisions/), injects the Loci
// block into the repo's CLAUDE.md + AGENTS.md, adds .loci/ to .gitignore, and
// writes the one-line entry into the brain's projects/index.md. Guarded/idempotent:
// an existing memory.md is left untouched. From then on the dashboard reads/writes
// this project's todos straight from its own .loci/todo.json.
function projectScript() {
  const c = path.join(LOCI_ROOT, 'scripts', 'loci-project.js');
  return fs.existsSync(c) ? c : null;
}

function handleProjectConnect(body) {
  const { name, repo, summary } = body || {};
  if (!repo || !String(repo).trim()) return { error: 'Missing repo path' };
  if (!name || !String(name).trim()) return { error: 'Missing project name' };
  const script = projectScript();
  if (!script) return { error: 'loci-project.js not found in this brain' };

  // Expand a leading ~ so the picker/typed path resolves to a real directory.
  let repoPath = String(repo).trim();
  if (repoPath === '~' || repoPath.startsWith('~/')) {
    repoPath = path.join(require('os').homedir(), repoPath.slice(1));
  }
  if (!fs.existsSync(repoPath) || !fs.statSync(repoPath).isDirectory()) {
    return { error: 'Folder not found on disk: ' + repoPath };
  }

  const { execFileSync } = require('child_process');
  const args = [script, 'connect', '--repo', repoPath, '--brain', LOCI_ROOT,
    '--name', String(name).trim()];
  if (summary && String(summary).trim()) args.push('--description', String(summary).trim());
  try {
    const out = execFileSync('node', args, { encoding: 'utf-8' });
    const result = JSON.parse(out);
    return { ok: true, ...result };
  } catch (e) {
    const stderr = e.stderr ? e.stderr.toString() : e.message;
    return { error: stderr.trim() || 'connect failed' };
  }
}

function handleTaskMove(body) {
  const { id, task, to } = body;
  if (!to) return { error: 'Missing target status' };
  const tasks = loadTaskRecords();
  const target = tasks.find(t => (id && t.id === id) || (!id && task && t.title.trim() === task.trim()));
  if (!target) return { error: 'Task not found' };

  if (to === 'done') {
    target.status = 'done';
    target.completedAt = target.completedAt || isoNow();
  } else if (to === 'archived') {
    target.status = 'archived';
    target.archivedAt = isoNow();
  } else {
    target.status = 'open';
    target.completedAt = null;
  }
  target.updatedAt = isoNow();
  saveTaskRecords(tasks);
  return { ok: true, task: target, to };
}

// Open a connected project's folder in the OS file manager (macOS Finder via
// `open`, Linux `xdg-open`, Windows `explorer`). SECURITY: only opens a path
// that is actually a connected project's repo (verified against projects/index.md)
// — never an arbitrary path from the request. Never throws to the client.
function handleProjectOpen(body) {
  const { repo } = body || {};
  if (!repo || typeof repo !== 'string') return { error: 'Missing repo path' };
  // verify this repo belongs to a connected project
  const known = buildProjects().serious.some(p => p.repo && p.repo === repo);
  if (!known) return { error: 'Unknown project repo' };
  if (!fs.existsSync(repo)) return { error: 'Folder not found on disk' };
  try {
    const { execFileSync } = require('child_process');
    const opener = process.platform === 'darwin' ? 'open'
      : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFileSync(opener, [repo], { timeout: 3000, stdio: 'ignore' });
    return { ok: true, opened: repo };
  } catch (e) {
    return { error: 'Could not open folder' };
  }
}

// Pop a native "choose folder" dialog and return the picked path. macOS only
// (uses osascript). Local machine only — in the demo build demoFetch no-ops, so
// this never runs there. Lets the connect-project form fill a repo path without
// hand-typing it.
function handleProjectBrowse() {
  if (process.platform !== 'darwin') {
    return { error: 'Folder picker only supported on macOS' };
  }
  try {
    const { execFileSync } = require('child_process');
    const script = 'POSIX path of (choose folder with prompt "选择项目仓库文件夹")';
    const out = execFileSync('osascript', ['-e', script], {
      timeout: 120000, encoding: 'utf-8'
    }).trim();
    if (!out) return { error: 'No folder chosen' };
    // strip trailing slash for a clean repo path
    const picked = out.replace(/\/+$/, '');
    return { ok: true, path: picked };
  } catch (e) {
    // user hit Cancel → osascript exits non-zero; treat as a quiet no-op
    return { error: 'cancelled' };
  }
}

// Disconnect a project from the brain: remove its `## name` block from
// projects/index.md. This ONLY removes the brain's index entry — it never
// touches the project's own files or repo on disk. Safe by design.
function handleProjectDisconnect(body) {
  const { name } = body || {};
  if (!name || typeof name !== 'string') return { error: 'Missing project name' };
  try {
    const indexFile = path.join(LOCI_ROOT, 'projects', 'index.md');
    if (!fs.existsSync(indexFile)) return { error: 'index.md not found' };
    const raw = fs.readFileSync(indexFile, 'utf-8');
    // Split into the leading section + per-project "## " blocks; drop the match.
    const lines = raw.split('\n');
    const out = [];
    let skipping = false;
    let removed = false;
    for (const line of lines) {
      const head = line.match(/^##\s+(.+?)(?:\s*<!--.*-->)?\s*$/);
      if (head) {
        const blockName = head[1].replace(/<!--[\s\S]*?-->/g, '').trim();
        skipping = (blockName === name.trim());
        if (skipping) { removed = true; continue; }
      }
      if (!skipping) out.push(line);
    }
    if (!removed) return { error: 'Project not found in index' };
    fs.writeFileSync(indexFile, out.join('\n'));
    return { ok: true, disconnected: name };
  } catch (e) {
    return { error: 'Could not update index: ' + e.message };
  }
}

// Add/remove an undirected people relationship edge in people/.connections.json.
// `op` is 'connect' or 'disconnect'. Validates both names exist as people.
function handlePeopleEdge(op, body) {
  const { a, b } = body || {};
  const how = body && body.how ? String(body.how).trim() : '';
  if (!a || !b || a === b) return { error: 'Need two distinct people' };
  // verify both are real people
  const names = new Set(scanMdFiles(path.join(LOCI_ROOT, 'people'))
    .map(c => c.meta && c.meta.name).filter(Boolean).map(String));
  if (!names.has(a) || !names.has(b)) return { error: 'Unknown person' };
  const f = path.join(LOCI_ROOT, 'people', '.connections.json');
  let data = { edges: [] };
  try { if (fs.existsSync(f)) data = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch {}
  if (!Array.isArray(data.edges)) data.edges = [];
  const same = (e, x, y) => (e[0] === x && e[1] === y) || (e[0] === y && e[1] === x);
  if (op === 'connect') {
    const existing = data.edges.find(e => same(e, a, b));
    if (existing) { if (how) existing[2] = how; }              // update label if given
    else data.edges.push(how ? [a, b, how] : [a, b]);
  } else {
    data.edges = data.edges.filter(e => !same(e, a, b));
  }
  try {
    if (!data._comment) data._comment = '人物关系边（无向）。dashboard 关系图读写这个文件。';
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
  } catch (e) { return { error: 'Could not write connections' }; }
  return { ok: true, op, a, b, count: data.edges.length };
}

// The person fields the dashboard can write to frontmatter, in display order.
// (Free-text "note" goes in the body, not frontmatter.)
const PERSON_FIELDS = ['name', 'relation', 'gender', 'photo', 'title', 'org', 'industry', 'location', 'age',
  'met_date', 'met_place', 'met_how', 'last_contact', 'frequency', 'strength',
  'phone', 'email', 'wechat', 'twitter', 'linkedin',
  'nickname', 'birthday', 'zodiac', 'mbti', 'blood', 'hobby', 'hometown', 'school', 'major'];

// Save an uploaded avatar (base64 data URL) to people/avatars/<slug>.<ext> and
// return its web path (/people-avatars-user/<file>) for the person's `photo` field.
function handleAvatarUpload(body) {
  const name = body && body.name ? String(body.name).trim() : '';
  const dataUrl = body && body.data ? String(body.data) : '';
  if (!name || !dataUrl) return { error: 'Need name and image data' };
  const m = dataUrl.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i);
  if (!m) return { error: 'Unsupported image data' };
  const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 3 * 1024 * 1024) return { error: 'Image too large (max 3MB)' };
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || ('p' + Date.now());
  const dir = path.join(LOCI_ROOT, 'people', 'avatars');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, slug + '.' + ext);
    fs.writeFileSync(file, buf);
    return { ok: true, photo: '/people-avatars-user/' + slug + '.' + ext };
  } catch (e) { return { error: 'Could not save image' }; }
}

// Build a YAML frontmatter + body markdown string from a person object.
function personToMd(p) {
  const lines = ['---'];
  for (const k of PERSON_FIELDS) {
    const v = p[k];
    if (v === undefined || v === null || v === '') continue;
    if (k === 'tags') continue;
    lines.push(k + ': ' + (/[:#\[\]]/.test(String(v)) ? JSON.stringify(String(v)) : v));
  }
  const tags = Array.isArray(p.tags) ? p.tags.map(t => String(t).trim()).filter(Boolean) : [];
  if (tags.length) lines.push('tags: [' + tags.join(', ') + ']');
  const reminders = Array.isArray(p.reminders) ? p.reminders.map(r => String(r).trim()).filter(Boolean) : [];
  if (reminders.length) lines.push('reminders: [' + reminders.map(r => JSON.stringify(r)).join(', ') + ']');
  lines.push('---', '');
  lines.push((p.note ? String(p.note).trim() : '') + '\n');
  return lines.join('\n');
}

// Create a new person: writes people/<slug>.md. Name required; everything else
// optional. Refuses if a person with that name already exists.
function handlePersonAdd(body) {
  const name = body && body.name ? String(body.name).trim() : '';
  if (!name) return { error: 'Need a name' };
  const peopleDir = path.join(LOCI_ROOT, 'people');
  const existing = scanMdFiles(peopleDir).map(c => c.meta && c.meta.name).filter(Boolean).map(String);
  if (existing.includes(name)) return { error: 'Person already exists' };
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) slug = 'person-' + Date.now();
  let file = path.join(peopleDir, slug + '.md');
  let n = 2;
  while (fs.existsSync(file)) { file = path.join(peopleDir, slug + '-' + n + '.md'); n++; }
  // collect known fields from the request; default last_contact to today
  const p = { name };
  for (const k of PERSON_FIELDS) { if (k !== 'name' && body[k] != null && body[k] !== '') p[k] = String(body[k]).trim(); }
  if (Array.isArray(body.tags)) p.tags = body.tags;
  if (Array.isArray(body.reminders)) p.reminders = body.reminders;
  if (body.note) p.note = body.note;
  if (!p.last_contact) p.last_contact = isoNow().slice(0, 10);
  try {
    if (!fs.existsSync(peopleDir)) fs.mkdirSync(peopleDir, { recursive: true });
    fs.writeFileSync(file, personToMd(p));
  } catch (e) { return { error: 'Could not create person file' }; }
  return { ok: true, name, file: path.basename(file) };
}

// Update an existing person: finds their .md by current name, merges the given
// fields into its frontmatter, rewrites the file. Renaming is allowed (name field).
function handlePersonUpdate(body) {
  const orig = body && body.origName ? String(body.origName).trim() : (body && body.name ? String(body.name).trim() : '');
  if (!orig) return { error: 'Need the person to update' };
  const peopleDir = path.join(LOCI_ROOT, 'people');
  const contacts = scanMdFiles(peopleDir);
  const target = contacts.find(c => c.meta && String(c.meta.name) === orig);
  if (!target) return { error: 'Person not found' };
  // merge: start from existing meta, overlay incoming fields
  const p = {};
  for (const k of PERSON_FIELDS) { const v = target.meta && target.meta[k]; if (v != null && v !== '') p[k] = v; }
  if (target.meta && Array.isArray(target.meta.tags)) p.tags = target.meta.tags;
  if (target.meta && Array.isArray(target.meta.reminders)) p.reminders = target.meta.reminders;
  // preserve the existing body text (note) by reading the raw file
  try {
    const raw = fs.readFileSync(path.join(peopleDir, target.filename), 'utf-8');
    const m = raw.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
    if (m && m[1].trim()) p.note = m[1].trim();
  } catch {}
  for (const k of PERSON_FIELDS) { if (body[k] !== undefined) p[k] = body[k] === null ? '' : String(body[k]).trim(); }
  if (body.tags !== undefined) p.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.reminders !== undefined) p.reminders = Array.isArray(body.reminders) ? body.reminders : [];
  if (body.note !== undefined) p.note = body.note;
  p.name = p.name || orig;
  const file = path.join(peopleDir, target.filename);
  try { fs.writeFileSync(file, personToMd(p)); }
  catch (e) { return { error: 'Could not save person' }; }
  return { ok: true, name: p.name, file: target.filename };
}

// Persist a manual task order. `order` is an array of task ids in the desired
// top-to-bottom sequence; each listed task gets manualOrder = its index. Tasks
// not in the list keep whatever they had (e.g. the done group is untouched).
function handleTaskReorder(body) {
  const { order } = body;
  if (!Array.isArray(order) || order.length === 0) return { error: 'Missing order array' };
  const tasks = loadTaskRecords();
  const byId = new Map(tasks.map(t => [t.id, t]));
  let changed = 0;
  order.forEach((id, i) => {
    const t = byId.get(id);
    if (t) { t.manualOrder = i; t.updatedAt = isoNow(); changed++; }
  });
  if (!changed) return { error: 'No matching tasks for given order' };
  saveTaskRecords(tasks);
  return { ok: true, reordered: changed };
}

function handleTaskAdd(body) {
  const { text, title, date, endDate, startTime, endTime, project, source,
          location, color, note, urgency, importance } = body;
  const taskTitle = (title || text || '').trim();
  if (!taskTitle) return { error: 'Missing task text' };

  const tasks = loadTaskRecords();
  const task = normalizeTask({
    title: taskTitle,
    status: 'open',
    date: date || null,
    endDate: endDate || null,
    startTime: startTime || null,
    endTime: endTime || null,
    project: project || null,
    source: source || 'dashboard',
    location: location || null,
    color: color || null,
    note: note || null,
    urgency: urgency,
    importance: importance,
  });
  tasks.push(task);
  saveTaskRecords(tasks);
  return { ok: true, task };
}

// Edit detail fields of an existing task (location / color / note / urgency /
// importance / date / time). Only provided fields are changed; the rest stay.
function handleTaskUpdateDetail(body) {
  const { id, title, location, color, note, urgency, importance,
          date, endDate, startTime, endTime } = body;
  if (!id) return { error: 'Missing task id' };
  const tasks = loadTaskRecords();
  const target = tasks.find(t => t.id === id);
  if (!target) return { error: 'Task not found' };

  // title is only changed when a non-empty value is sent (never blanked out)
  if (title !== undefined && String(title).trim()) target.title = String(title).trim();
  if (location !== undefined)  target.location  = location || null;
  if (color !== undefined)     target.color     = color || null;
  if (note !== undefined)      target.note      = note || null;
  if (urgency !== undefined)   target.urgency   = clampLevel(urgency);
  if (importance !== undefined) target.importance = clampLevel(importance);
  if (date !== undefined)      target.date      = date || null;
  if (endDate !== undefined)   target.endDate   = endDate || null;
  if (startTime !== undefined) target.startTime = startTime || null;
  if (endTime !== undefined)   target.endTime   = endTime || null;
  target.updatedAt = isoNow();
  saveTaskRecords(tasks);
  return { ok: true, task: target };
}

function handleJournalSave(body) {
  const { date, content } = body;
  if (!date || !content) return { error: 'Missing date or content' };

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Invalid date format (expected YYYY-MM-DD)' };
  }

  const journalDir = path.join(LOCI_ROOT, 'tasks', 'journal');
  if (!fs.existsSync(journalDir)) {
    fs.mkdirSync(journalDir, { recursive: true });
  }

  const filePath = path.join(journalDir, `${date}.md`);

  // If file exists, read it and update the content section
  // If not, create with frontmatter
  let fileContent;
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    const [meta, _] = parseFrontmatter(existing);
    meta.updated = date;
    fileContent = buildMdWithFrontmatter(meta, content);
  } else {
    const meta = { date, updated: date };
    fileContent = buildMdWithFrontmatter(meta, content);
  }

  fs.writeFileSync(filePath, fileContent, 'utf-8');
  return { ok: true, date, path: filePath };
}

function handleJournalNotesSave(body) {
  const { date, notes } = body;
  if (!date || !notes) return { error: 'Missing date or notes' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format' };

  const notesDir = path.join(LOCI_ROOT, 'tasks', 'journal', 'notes');
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true });

  const filePath = path.join(notesDir, `${date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(notes, null, 2), 'utf-8');
  return { ok: true, date };
}

function handleJournalNotesLoad(body) {
  const { date } = body;
  if (!date) return { error: 'Missing date' };

  const filePath = path.join(LOCI_ROOT, 'tasks', 'journal', 'notes', `${date}.json`);
  if (!fs.existsSync(filePath)) return { ok: true, notes: null };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { ok: true, notes: JSON.parse(content) };
  } catch (e) {
    return { ok: true, notes: null };
  }
}

function handlePlanSave(body) {
  const { type, key, items } = body;
  if (!type || !key || !items) return { error: 'Missing type, key, or items' };
  if (!['week', 'month'].includes(type)) return { error: 'Invalid type' };
  if (!isSafeSegment(key)) return { error: 'Invalid key' };

  const dir = path.join(LOCI_ROOT, 'tasks', 'plans', type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  return { ok: true, type, key };
}

function handlePlanLoad(body) {
  const { type, key } = body;
  if (!type || !key) return { error: 'Missing type or key' };
  if (!['week', 'month'].includes(type)) return { error: 'Invalid type' };
  if (!isSafeSegment(key)) return { error: 'Invalid key' };

  const filePath = path.join(LOCI_ROOT, 'tasks', 'plans', type, `${key}.json`);
  if (!fs.existsSync(filePath)) return { ok: true, items: null };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { ok: true, items: JSON.parse(content) };
  } catch (e) {
    return { ok: true, items: null };
  }
}

function handleInboxAdd(body) {
  const { text } = body;
  if (!text) return { error: 'Missing text' };

  const filePath = path.join(LOCI_ROOT, 'inbox.md');
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    // Create inbox.md if it doesn't exist
    content = '---\nupdated:\n---\n\n# Inbox\n\n## Unprocessed\n';
  }

  // Find ## Unprocessed section and append after it
  const lines = content.split('\n');
  let insertIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^##\s+Unprocessed/i)) {
      // Skip any comment lines and empty lines right after header
      let j = i + 1;
      while (j < lines.length) {
        const trimmed = lines[j].trim();
        if (trimmed.startsWith('<!--') || trimmed === '') {
          j++;
          // If we're in a comment, skip to end
          if (trimmed.startsWith('<!--') && !trimmed.includes('-->')) {
            while (j < lines.length && !lines[j].includes('-->')) j++;
            if (j < lines.length) j++; // skip the closing -->
          }
        } else {
          break;
        }
      }
      insertIdx = j;
      break;
    }
  }

  if (insertIdx === -1) {
    // No Unprocessed section, append to end
    lines.push('', `- ${text}`);
  } else {
    lines.splice(insertIdx, 0, `- ${text}`);
  }

  // Update the frontmatter 'updated' field
  const finalContent = lines.join('\n');
  fs.writeFileSync(filePath, finalContent, 'utf-8');
  return { ok: true, text };
}

function handleInboxRemove(body) {
  const { text } = body;
  if (!text) return { error: 'Missing text' };

  const filePath = path.join(LOCI_ROOT, 'inbox.md');
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return { error: 'Cannot read inbox.md: ' + e.message };
  }

  const lines = content.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^[-*]\s+(.+)/);
    if (m && m[1].trim() === text.trim()) {
      // Delete the whole item: this top-level "- …" line PLUS any indented
      // continuation lines that belong to it (sub-bullets, wrapped detail), i.e.
      // everything until the next top-level list item / heading / blank-then-list.
      let end = i + 1;
      while (end < lines.length) {
        const l = lines[end];
        if (/^[-*]\s+/.test(l)) break;          // next top-level item
        if (/^#{1,6}\s/.test(l)) break;         // next heading
        if (/^\s+\S/.test(l) || l.trim() === '') { end++; continue; }  // indented or blank → part of this item
        break;                                   // any other flush-left content ends it
      }
      // trim trailing blank lines back so we don't leave a growing gap
      while (end - 1 > i && lines[end - 1].trim() === '') end--;
      lines.splice(i, end - i);
      found = true;
      break;
    }
  }

  if (!found) return { error: 'Item not found: ' + text };
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return { ok: true, text };
}

// Add a user-created note category (a tag with no notes yet) to notes/.categories.json.
function handleNotesAddCategory(body) {
  const name = (body && body.name || '').trim();
  if (!name) return { error: 'Missing category name' };
  if (name.length > 24) return { error: 'Category name too long' };

  const notesDir = path.join(LOCI_ROOT, 'notes');
  if (!fs.existsSync(notesDir)) fs.mkdirSync(notesDir, { recursive: true });
  const catFile = path.join(notesDir, '.categories.json');

  let cats = [];
  try {
    if (fs.existsSync(catFile)) {
      const arr = JSON.parse(fs.readFileSync(catFile, 'utf-8'));
      if (Array.isArray(arr)) cats = arr.filter(c => typeof c === 'string');
    }
  } catch (e) { /* start fresh on malformed file */ }

  if (!cats.includes(name)) cats.push(name);
  fs.writeFileSync(catFile, JSON.stringify(cats, null, 2), 'utf-8');
  return { ok: true, categories: cats };
}

function handleReferenceAdd(body) {
  const { title, url, type, note } = body;
  const tags = Array.isArray(body && body.tags)
    ? body.tags.map(t => String(t).replace(/^#/, '').trim()).filter(Boolean)
    : [];
  if (!title && !url) return { error: 'Missing title or url' };

  const refsDir = path.join(LOCI_ROOT, 'references');
  if (!fs.existsSync(refsDir)) {
    fs.mkdirSync(refsDir, { recursive: true });
  }

  // Create a slug from title
  const slug = (title || url || 'untitled').toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const now = new Date();
  const dateStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  const fileName = `${dateStr}-${slug}.md`;
  const filePath = path.join(refsDir, fileName);

  let content = `---\ndate: ${dateStr}\ntitle: "${(title || '').replace(/"/g, '\\"')}"\n`;
  if (url) content += `url: "${url}"\n`;
  if (type) content += `type: ${type}\n`;
  const tagsYaml = tags.length ? '[' + tags.map(t => JSON.stringify(t)).join(', ') + ']' : '[]';
  content += `tags: ${tagsYaml}\nstatus: active\n---\n\n`;
  if (title) content += `# ${title}\n\n`;
  if (url) content += `- **Link:** ${url}\n`;
  if (note) content += `\n${note}\n`;

  fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true, file: fileName };
}

function handleReferenceRemove(body) {
  const { file } = body;
  if (!file) return { error: 'Missing file' };

  // Allow references inside subfolders (e.g. hackathon-2026/foo.md), not just the
  // references root. Guard against path traversal by resolving and confirming the
  // target stays inside references/. A plain isSafeSegment check rejected any file
  // with a '/', so subfolder saves could never be deleted.
  const refsRoot = path.join(LOCI_ROOT, 'references');
  const filePath = path.resolve(refsRoot, file);
  if (filePath !== refsRoot && !filePath.startsWith(refsRoot + path.sep)) {
    return { error: 'Invalid file' };
  }
  if (!fs.existsSync(filePath)) return { error: 'File not found: ' + file };

  // Move to archive instead of deleting (mirror the subfolder structure so names
  // from different folders can't collide in the archive).
  try {
    const rel = path.relative(refsRoot, filePath);
    const archiveTarget = path.join(LOCI_ROOT, 'archive', 'references', rel);
    fs.mkdirSync(path.dirname(archiveTarget), { recursive: true });
    fs.renameSync(filePath, archiveTarget);
    return { ok: true, file };
  } catch (e) { return { error: 'Could not archive file' }; }
}

function handleCalendarAdd(body) {
  const { date, title, startMin, endMin, location, note, startDate, endDate, allDay, fromTask, taskId } = body;
  if (!date || !title) return { error: 'Missing date or title' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format (YYYY-MM-DD)' };

  const calPath = path.join(LOCI_ROOT, 'tasks', 'calendar.json');
  let cal = {};
  if (fs.existsSync(calPath)) {
    try { cal = JSON.parse(fs.readFileSync(calPath, 'utf-8')); } catch {}
  }

  if (!cal[date]) cal[date] = [];
  const ev = { title };
  if (allDay || startDate || endDate) {
    ev.allDay = true;
    ev.startDate = startDate || date;
    ev.endDate = endDate || startDate || date;
  } else {
    ev.startKey = startMin || 540;
    ev.endKey = endMin || (startMin ? startMin + 60 : 600);
    ev.hour = Math.floor((startMin || 540) / 60);
  }
  if (location) ev.location = location;
  if (note) ev.note = note;
  if (fromTask) ev.fromTask = true;
  if (taskId) ev.taskId = taskId;
  cal[date].push(ev);

  fs.mkdirSync(path.dirname(calPath), { recursive: true });
  fs.writeFileSync(calPath, JSON.stringify(cal, null, 2), 'utf-8');
  return { ok: true, date, event: ev };
}

function handleDailyPlanSave(body) {
  const { date, content } = body;
  if (!date || !content) return { error: 'Missing date or content' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format (YYYY-MM-DD)' };

  const dailyDir = path.join(LOCI_ROOT, 'tasks', 'daily');
  if (!fs.existsSync(dailyDir)) fs.mkdirSync(dailyDir, { recursive: true });

  const filePath = path.join(dailyDir, `${date}.md`);
  let fileContent;
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    const [meta, _] = parseFrontmatter(existing);
    meta.updated = date;
    fileContent = buildMdWithFrontmatter(meta, content);
  } else {
    fileContent = buildMdWithFrontmatter({ date, updated: date }, content);
  }

  fs.writeFileSync(filePath, fileContent, 'utf-8');
  return { ok: true, date, path: filePath };
}

function handleDailyPlanToggle(body) {
  const { date, taskText, done } = body;
  if (!date || !taskText) return { error: 'Missing date or taskText' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format' };

  const filePath = path.join(LOCI_ROOT, 'tasks', 'daily', `${date}.md`);
  if (!fs.existsSync(filePath)) return { error: 'Daily plan not found' };

  let content = fs.readFileSync(filePath, 'utf-8');
  const escapedText = taskText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (done) {
    // Check off: - [ ] taskText → - [x] taskText
    const re = new RegExp(`^(- \\[ \\] )${escapedText}`, 'm');
    if (re.test(content)) {
      content = content.replace(re, `- [x] ${taskText}`);
    }
  } else {
    // Uncheck: - [x] taskText → - [ ] taskText
    const re = new RegExp(`^(- \\[x\\] )${escapedText}`, 'm');
    if (re.test(content)) {
      content = content.replace(re, `- [ ] ${taskText}`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true, date, taskText, done };
}

function handleDailyPlanAddTask(body) {
  const { date, task } = body;
  if (!date || !task) return { error: 'Missing date or task' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format' };

  const dailyDir = path.join(LOCI_ROOT, 'tasks', 'daily');
  if (!fs.existsSync(dailyDir)) fs.mkdirSync(dailyDir, { recursive: true });

  const filePath = path.join(dailyDir, `${date}.md`);
  let content;
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf-8');
    // Append task to end of file
    content = content.trimEnd() + '\n- [ ] ' + task + '\n';
  } else {
    // Create new daily plan
    const d = new Date(date + 'T00:00:00');
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    content = `---\ndate: ${date}\nstatus: planned\n---\n\n# ${date} ${days[d.getDay()]}\n\n## 日程\n\n- [ ] ${task}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true, date, task };
}

function handleDailyPlanRemoveTask(body) {
  const { date, task } = body;
  if (!date || !task) return { error: 'Missing date or task' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format' };

  const filePath = path.join(LOCI_ROOT, 'tasks', 'daily', `${date}.md`);
  if (!fs.existsSync(filePath)) return { error: 'Daily plan not found' };

  let content = fs.readFileSync(filePath, 'utf-8');
  const escapedTask = task.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Remove the line (checked or unchecked)
  const re = new RegExp(`^- \\[[x ]\\] ${escapedTask}\\n?`, 'm');
  if (re.test(content)) {
    content = content.replace(re, '');
    fs.writeFileSync(filePath, content, 'utf-8');
    return { ok: true, date, task };
  }
  return { error: 'Task not found in file' };
}

function buildMdWithFrontmatter(meta, body) {
  let yaml = '---\n';
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) {
      yaml += `${key}:\n`;
    } else if (Array.isArray(value)) {
      yaml += `${key}: [${value.map(v => `"${v}"`).join(', ')}]\n`;
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }
  yaml += '---\n\n';
  return yaml + body + '\n';
}

// ─── HTTP Server ────────────────────────────────────────────────────────────

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON: ' + e.message));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, data, statusCode = 200) {
  const json = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(json);
}

function sendError(res, message, statusCode = 400) {
  sendJson(res, { error: message }, statusCode);
}

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // API routes
  if (pathname === '/api/data' && req.method === 'GET') {
    try {
      const data = buildAllData();
      sendJson(res, data);
    } catch (e) {
      sendError(res, 'Build error: ' + e.message, 500);
    }
    return;
  }

  // Project todos: toggle / add / move / update — write back via loci-projtodo.js.
  {
    const m = pathname.match(/^\/api\/project-todos\/(toggle|add|move|update|done|remove)$/);
    if (m && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const result = handleProjectTodo(m[1], body);
        if (result.error) sendError(res, result.error);
        else sendJson(res, result);
      } catch (e) {
        sendError(res, e.message, 500);
      }
      return;
    }
  }

  // People relationship edges: connect / disconnect two people.
  {
    const m = pathname.match(/^\/api\/people\/(connect|disconnect)$/);
    if (m && req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const result = handlePeopleEdge(m[1], body);
        if (result.error) sendError(res, result.error);
        else sendJson(res, result);
      } catch (e) { sendError(res, e.message, 500); }
      return;
    }
  }

  // Add a new person (creates people/<slug>.md).
  if (pathname === '/api/people/add' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handlePersonAdd(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }

  // Update an existing person (rewrites their people/<slug>.md).
  if (pathname === '/api/people/update' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handlePersonUpdate(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }

  // Upload an avatar image (base64) → saves to people/avatars/, returns its path.
  if (pathname === '/api/people/avatar' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleAvatarUpload(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }

  // Connect a project for real — build its .loci/ + wire the brain index.
  if (pathname === '/api/project/connect' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleProjectConnect(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  // Open a connected project's folder in Finder/Explorer (local machine only).
  if (pathname === '/api/project/open' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleProjectOpen(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  // Pop a native folder picker; return the chosen path (macOS, local only).
  if (pathname === '/api/project/browse' && req.method === 'POST') {
    try {
      const result = handleProjectBrowse();
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  // Disconnect a project (remove its index entry; never touches repo files).
  if (pathname === '/api/project/disconnect' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleProjectDisconnect(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/tasks/move' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleTaskMove(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/tasks/toggle' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleTaskToggle(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/tasks/reorder' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleTaskReorder(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/tasks/add' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleTaskAdd(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/tasks/update-detail' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleTaskUpdateDetail(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/journal/save' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleJournalSave(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/inbox/add' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleInboxAdd(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/inbox/remove' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleInboxRemove(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/references/add' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleReferenceAdd(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/notes/add-category' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNotesAddCategory(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  // Inline-note editing: load raw md, save edits, create a new note.
  if (pathname === '/api/notes/raw' && req.method === 'GET') {
    try {
      const result = handleNoteRaw(Object.fromEntries(parsed.searchParams));
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/save' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNoteSave(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/props' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNoteProps(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/create' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNoteCreate(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/mkdir' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNoteMkdir(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/reveal' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNoteReveal(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/delete' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNoteDelete(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/import' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNoteImport(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/unlink' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleNoteUnlink(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/folder-browse' && req.method === 'POST') {
    try {
      const result = handleFolderBrowse();
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/source/mount' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleSourceMount(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }
  if (pathname === '/api/notes/source/unmount' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleSourceUnmount(body);
      if (result.error) sendError(res, result.error);
      else sendJson(res, result);
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }

  if (pathname === '/api/references/remove' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleReferenceRemove(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/calendar/add' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleCalendarAdd(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/daily/remove-task' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleDailyPlanRemoveTask(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/daily/add-task' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleDailyPlanAddTask(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/daily/toggle' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleDailyPlanToggle(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  if (pathname === '/api/plan/save' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handlePlanSave(body);
      if (result.error) { sendError(res, result.error); } else { sendJson(res, result); }
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }

  if (pathname === '/api/plan/load' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handlePlanLoad(body);
      if (result.error) { sendError(res, result.error); } else { sendJson(res, result); }
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }

  if (pathname === '/api/journal/save-notes' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleJournalNotesSave(body);
      if (result.error) { sendError(res, result.error); } else { sendJson(res, result); }
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }

  if (pathname === '/api/journal/load-notes' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleJournalNotesLoad(body);
      if (result.error) { sendError(res, result.error); } else { sendJson(res, result); }
    } catch (e) { sendError(res, e.message, 500); }
    return;
  }

  if (pathname === '/api/daily/save' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const result = handleDailyPlanSave(body);
      if (result.error) {
        sendError(res, result.error);
      } else {
        sendJson(res, result);
      }
    } catch (e) {
      sendError(res, e.message, 500);
    }
    return;
  }

  // Serve user-uploaded avatars from people/avatars/ (outside SCRIPT_DIR).
  if (pathname.startsWith('/people-avatars-user/')) {
    const fname = path.basename(decodeURIComponent(pathname.slice('/people-avatars-user/'.length)));
    const avPath = path.join(LOCI_ROOT, 'people', 'avatars', fname);
    if (path.resolve(avPath).startsWith(path.resolve(path.join(LOCI_ROOT, 'people', 'avatars'))) && fs.existsSync(avPath)) {
      serveStaticFile(res, avPath);
    } else { sendError(res, 'Not found', 404); }
    return;
  }

  // Static file serving
  let filePath;
  if (pathname === '/' || pathname === '/index.html' || pathname === '/clean' || pathname === '/clean.html') {
    // The Clean dashboard is the only build; '/clean' kept as an alias for old links
    filePath = path.join(SCRIPT_DIR, 'index.html');
  } else {
    filePath = path.join(SCRIPT_DIR, pathname);
  }

  // Security: prevent path traversal
  const resolvedPath = path.resolve(filePath);
  const resolvedScript = path.resolve(SCRIPT_DIR);
  if (!resolvedPath.startsWith(resolvedScript)) {
    sendError(res, 'Forbidden', 403);
    return;
  }

  serveStaticFile(res, filePath);
});

// ─── Port conflict resolution ───────────────────────────────────────────────

function killPortHolder(port) {
  try {
    const { execSync } = require('child_process');
    const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
    if (result) {
      const pids = result.split('\n').filter(p => p && p !== String(process.pid));
      if (pids.length > 0) {
        console.log(`  Killing ghost process(es) on port ${port}: PID ${pids.join(', ')}`);
        execSync(`kill -9 ${pids.join(' ')}`);
        return true;
      }
    }
  } catch (e) {
    // lsof returns exit code 1 if no matches — that's fine
  }
  return false;
}

function startServer(retried) {
  server.listen(PORT, () => {
    console.log(`Loci Dashboard`);
    console.log(`  Brain root: ${LOCI_ROOT}`);
    console.log(`  Server:     http://localhost:${PORT}`);
    console.log(`  API:        http://localhost:${PORT}/api/data`);
    console.log(`  Press Ctrl+C to stop`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !retried) {
      console.log(`Port ${PORT} is in use. Attempting to reclaim...`);
      server.close();
      if (killPortHolder(PORT)) {
        setTimeout(() => startServer(true), 500);
      } else {
        console.error(`Port ${PORT} is occupied by another application. Use PORT=XXXX to pick a different port.`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });
}

startServer(false);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
