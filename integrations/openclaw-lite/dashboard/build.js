#!/usr/bin/env node
/**
 * Loci Lite — Dashboard Data Builder (Node.js)
 *
 * Reads tasks, daily plans, and journal entries from ~/.loci/lite/
 * and outputs data.json for the dashboard.
 *
 * Zero npm dependencies — uses only Node.js built-in modules.
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ──────────────────────────────────────────────────────────

const LITE_ROOT = process.env.LOCI_LITE_PATH || path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.loci',
  'lite'
);
const OUTPUT_PATH = path.join(__dirname, 'data.json');

// ─── Helpers ────────────────────────────────────────────────────────────────

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
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    meta[key] = value;
  }
  return [meta, body];
}

function mdToHtml(text) {
  if (!text) return '';
  let html = text;

  // Headings
  for (let i = 6; i >= 1; i--) {
    const pattern = new RegExp('^' + '#'.repeat(i) + '\\s+(.+)$', 'gm');
    html = html.replace(pattern, `<h${i}>$1</h${i}>`);
  }

  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Checkbox list items
  html = html.replace(/^- \[x\]\s+(.+)$/gm,
    '<li class="done"><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/^- \[ \]\s+(.+)$/gm,
    '<li><input type="checkbox" disabled> $1</li>');

  // Plain list items
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Paragraphs for remaining plain lines
  const lines = html.split('\n');
  const result = [];
  for (const line of lines) {
    const s = line.trim();
    if (!s) {
      result.push('');
    } else if (s.startsWith('<')) {
      result.push(line);
    } else {
      result.push(`<p>${s}</p>`);
    }
  }
  return result.join('\n').trim();
}

function readMd(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const [meta, body] = parseFrontmatter(content);
    return {
      meta,
      content: mdToHtml(body),
      raw: body,
      filename: path.basename(filepath),
    };
  } catch (e) {
    return null;
  }
}

function scanMd(directory) {
  const results = [];
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return results;
  }
  const files = fs.readdirSync(directory).sort();
  for (const fname of files) {
    if (fname.endsWith('.md') && fname !== 'README.md') {
      const parsed = readMd(path.join(directory, fname));
      if (parsed) {
        const { raw, ...rest } = parsed;
        results.push(rest);
      }
    }
  }
  return results;
}

// ─── Data Builders ──────────────────────────────────────────────────────────

function buildTasks() {
  const filepath = path.join(LITE_ROOT, 'tasks', 'active.md');
  const result = readMd(filepath);
  const tasks = { P0: [], P1: [], P2: [] };

  if (result) {
    let currentP = null;
    for (const line of result.raw.split('\n')) {
      const pMatch = line.match(/^##\s+P(\d)/);
      if (pMatch) {
        currentP = `P${pMatch[1]}`;
        continue;
      }
      const tMatch = line.match(/^- \[([ x])\]\s+(.+)$/);
      if (tMatch && currentP && tasks[currentP] !== undefined) {
        tasks[currentP].push({
          text: tMatch[2],
          done: tMatch[1] === 'x',
        });
      }
    }
  }

  let total = 0, done = 0;
  for (const key of Object.keys(tasks)) {
    total += tasks[key].length;
    done += tasks[key].filter(t => t.done).length;
  }

  return { active_tasks: tasks, total, done };
}

function buildDailyPlans() {
  return scanMd(path.join(LITE_ROOT, 'tasks', 'daily'));
}

function buildJournal() {
  const entries = scanMd(path.join(LITE_ROOT, 'journal'));
  entries.reverse(); // newest first
  return entries;
}

function buildWeekOverview() {
  const today = new Date();
  const weekday = today.getDay(); // Sunday=0
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const dailyFile = path.join(LITE_ROOT, 'tasks', 'daily', `${ds}.md`);
    const journalFile = path.join(LITE_ROOT, 'journal', `${ds}.md`);

    const dayData = {
      date: ds,
      weekday: dayNames[i],
      is_today: ds === today.toISOString().slice(0, 10),
      has_plan: fs.existsSync(dailyFile),
      has_journal: fs.existsSync(journalFile),
    };

    if (dayData.has_plan) {
      const parsed = readMd(dailyFile);
      if (parsed) {
        const tasksTotal = (parsed.raw.match(/^- \[[ x]\]/gm) || []).length;
        const tasksDone = (parsed.raw.match(/^- \[x\]/gm) || []).length;
        dayData.tasks_total = tasksTotal;
        dayData.tasks_done = tasksDone;
      }
    }

    days.push(dayData);
  }

  return days;
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(LITE_ROOT) || !fs.statSync(LITE_ROOT).isDirectory()) {
    console.log(`Loci Lite directory not found: ${LITE_ROOT}`);
    console.log('The AI will create it on first conversation.');
    return;
  }

  console.log(`Building from: ${LITE_ROOT}`);

  const now = new Date();
  const buildTime = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');

  const data = {
    config: {
      title: 'Loci Lite',
      description: 'Your daily command center',
    },
    tasks: buildTasks(),
    daily_plans: buildDailyPlans(),
    journal: buildJournal(),
    week: buildWeekOverview(),
    build_time: buildTime,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Tasks: ${data.tasks.done}/${data.tasks.total} done`);
  console.log(`Journal entries: ${data.journal.length}`);
}

main();
