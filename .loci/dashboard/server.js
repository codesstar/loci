#!/usr/bin/env node
/**
 * Loci Dashboard — Node.js Local Server
 *
 * Zero npm dependencies. Uses only built-in modules.
 * Serves the dashboard and provides read/write API endpoints.
 *
 * GET  /api/data          — returns full dashboard JSON (same as build.py output)
 * POST /api/tasks/toggle  — toggle a task checkbox in active.md
 * POST /api/tasks/add     — add a task to active.md
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

// ─── Data builders ──────────────────────────────────────────────────────────

function buildPlan() {
  const filepath = path.join(LOCI_ROOT, 'plan.md');
  const result = readMdFileSimple(filepath);
  return result || { content: '', meta: {} };
}

function buildInbox() {
  const rootInbox = readMdFileSimple(path.join(LOCI_ROOT, 'inbox.md'));
  return {
    content: rootInbox ? rootInbox.content : '',
    meta: rootInbox ? rootInbox.meta : {},
    items: [],
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
  const active = readMdFileSimple(path.join(tasksDir, 'active.md'));
  const someday = readMdFileSimple(path.join(tasksDir, 'someday.md'));

  const activeTasks = { P0: [], P1: [], P2: [], P3: [] };
  const rawResult = readMdFile(path.join(tasksDir, 'active.md'));
  if (rawResult) {
    const raw = rawResult.raw;
    let currentPriority = null;
    for (const line of raw.split('\n')) {
      const pMatch = line.match(/^##\s+P(\d)/);
      if (pMatch) {
        currentPriority = `P${pMatch[1]}`;
        continue;
      }
      const taskMatch = line.match(/^- \[([ x])\]\s+(.+)$/);
      if (taskMatch && currentPriority) {
        activeTasks[currentPriority] = activeTasks[currentPriority] || [];
        activeTasks[currentPriority].push({
          text: taskMatch[2],
          done: taskMatch[1] === 'x',
        });
      }
    }
  }

  return {
    active: active || { content: '', meta: {} },
    someday: someday || { content: '', meta: {} },
    active_tasks: activeTasks,
  };
}

function buildPlanning() {
  const tasksDir = path.join(LOCI_ROOT, 'tasks');
  const journalFiles = scanMdFiles(path.join(tasksDir, 'journal'))
    .filter(f => !f.filename.includes('buffer'));

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
  ];

  for (const [name, builder] of sections) {
    data[name] = builder();
  }

  data.stats = buildStats(data);
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
  const { task, checked } = body;
  if (!task) return { error: 'Missing task text' };

  const filePath = path.join(LOCI_ROOT, 'tasks', 'active.md');
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return { error: 'Cannot read active.md: ' + e.message };
  }

  const lines = content.split('\n');
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match the task text (could be checked or unchecked)
    const taskMatch = line.match(/^(- \[)([ x])(\]\s+)(.+)$/);
    if (taskMatch && taskMatch[4].trim() === task.trim()) {
      const newState = checked ? 'x' : ' ';
      lines[i] = `${taskMatch[1]}${newState}${taskMatch[3]}${taskMatch[4]}`;
      found = true;
      break;
    }
  }

  if (!found) return { error: 'Task not found: ' + task };

  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return { ok: true, task, checked };
}

function handleTaskAdd(body) {
  const { text, priority } = body;
  if (!text) return { error: 'Missing task text' };

  const p = priority || 'P1';
  const filePath = path.join(LOCI_ROOT, 'tasks', 'active.md');
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return { error: 'Cannot read active.md: ' + e.message };
  }

  const lines = content.split('\n');
  const sectionHeader = `## ${p}`;
  let insertIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(sectionHeader)) {
      // Find the end of this section (next ## or end of file)
      let j = i + 1;
      while (j < lines.length && !lines[j].match(/^## /)) {
        j++;
      }
      // Insert before the next section header, or at end
      // Skip back over empty lines
      let insertAt = j;
      while (insertAt > i + 1 && lines[insertAt - 1].trim() === '') {
        insertAt--;
      }
      insertIdx = insertAt;
      break;
    }
  }

  if (insertIdx === -1) {
    // Section doesn't exist, append it
    lines.push('', sectionHeader, '');
    insertIdx = lines.length;
  }

  lines.splice(insertIdx, 0, `- [ ] ${text}`);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return { ok: true, text, priority: p };
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

function handleCalendarAdd(body) {
  const { date, title, startMin, endMin, location, note } = body;
  if (!date || !title) return { error: 'Missing date or title' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date format (YYYY-MM-DD)' };

  const calPath = path.join(LOCI_ROOT, 'tasks', 'calendar.json');
  let cal = {};
  if (fs.existsSync(calPath)) {
    try { cal = JSON.parse(fs.readFileSync(calPath, 'utf-8')); } catch {}
  }

  if (!cal[date]) cal[date] = [];
  const ev = {
    title,
    startKey: startMin || 540,
    endKey: endMin || (startMin ? startMin + 60 : 600),
    hour: Math.floor((startMin || 540) / 60),
  };
  if (location) ev.location = location;
  if (note) ev.note = note;
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
  if (pathname === '/' || pathname === '/index.html') {
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

server.listen(PORT, () => {
  console.log(`Loci Dashboard`);
  console.log(`  Brain root: ${LOCI_ROOT}`);
  console.log(`  Server:     http://localhost:${PORT}`);
  console.log(`  API:        http://localhost:${PORT}/api/data`);
  console.log(`  Press Ctrl+C to stop`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
