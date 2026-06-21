#!/usr/bin/env node
/**
 * Loci Dashboard — Node.js Local Server
 *
 * Zero npm dependencies. Uses only built-in modules.
 * Serves the dashboard and provides read/write API endpoints.
 *
 * GET  /api/data          — returns full dashboard JSON (same as build.py output)
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

function buildPeople() {
  const peopleDir = path.join(LOCI_ROOT, 'people');
  return {
    contacts: scanMdFiles(peopleDir),
    meetings: scanMdFiles(path.join(peopleDir, 'meetings')),
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
    const m = line.match(/^-\s+\*\*(.+?)\*\*\s*·\s*(\S+)\s*·\s*(.+?)\s*·\s*(#.+)$/);
    if (m) {
      pointers.push({
        title: m[1].trim(),
        link: m[2].trim(),
        gist: m[3].trim(),
        tags: m[4].split(/\s+/).map(t => t.replace(/^#/, '')).filter(Boolean),
      });
    }
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

  return { index: indexFile, pointers, files, customCategories, total: files.length };
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

function buildAllData() {
  const data = { config: CONFIG };

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

function handleTaskAdd(body) {
  const { text, title, date, endDate, startTime, endTime, project, source } = body;
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
  });
  tasks.push(task);
  saveTaskRecords(tasks);
  return { ok: true, task };
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

  const dir = path.join(LOCI_ROOT, 'tasks', 'plans', type);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${key}.json`);
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  return { ok: true, type, key };
}

function handlePlanLoad(body) {
  const { type, key } = body;
  if (!type || !key) return { error: 'Missing type or key' };

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
      lines.splice(i, 1);
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
  content += `tags: []\nstatus: active\n---\n\n`;
  if (title) content += `# ${title}\n\n`;
  if (url) content += `- **Link:** ${url}\n`;
  if (note) content += `\n${note}\n`;

  fs.writeFileSync(filePath, content, 'utf-8');
  return { ok: true, file: fileName };
}

function handleReferenceRemove(body) {
  const { file } = body;
  if (!file) return { error: 'Missing file' };

  const filePath = path.join(LOCI_ROOT, 'references', file);
  if (!fs.existsSync(filePath)) return { error: 'File not found: ' + file };

  // Move to archive instead of deleting
  const archiveDir = path.join(LOCI_ROOT, 'archive', 'references');
  if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
  fs.renameSync(filePath, path.join(archiveDir, path.basename(file)));
  return { ok: true, file };
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

  // Static file serving
  let filePath;
  if (pathname === '/' || pathname === '/index.html' || pathname === '/clean' || pathname === '/clean.html') {
    // Default theme is now the Clean dashboard; '/clean' kept as an alias for old links
    filePath = path.join(SCRIPT_DIR, 'index-clean.html');
  } else if (pathname === '/sci' || pathname === '/sci.html') {
    // Original sci-fi theme — moved off the root, kept available under /sci
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
