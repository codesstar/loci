#!/usr/bin/env node
'use strict';

// Build the small, read-only context map shared by Codex, Claude Code, and
// instruction-only clients. This file intentionally uses only Node built-ins
// so the same implementation runs in native Windows, macOS, and Linux.

const fs = require('fs');
const path = require('path');

const MAX_PREFERENCE_LINES = 30;
const MAX_PREFERENCE_BYTES = 2000;
const MAX_OUTPUT_BYTES = 4400;

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  } catch {
    return '';
  }
}

function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

function takeUtf8(value, maxBytes) {
  if (byteLength(value) <= maxBytes) return value;
  let used = 0;
  let result = '';
  for (const character of value) {
    const size = byteLength(character);
    if (used + size > maxBytes) break;
    result += character;
    used += size;
  }
  return result;
}

function stripFrontmatter(text) {
  const lines = text.split('\n');
  if ((lines[0] || '').trim() !== '---') return text;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  return end === -1 ? text : lines.slice(end + 1).join('\n');
}

function compactPreferences(text) {
  if (/^status:\s*template\s*$/m.test(text)) return '';
  const lines = stripFrontmatter(text).split('\n');
  const kept = [];
  let used = 0;
  let truncated = false;

  for (const line of lines) {
    if (kept.length >= MAX_PREFERENCE_LINES) {
      truncated = true;
      break;
    }
    const separator = kept.length ? 1 : 0;
    const available = MAX_PREFERENCE_BYTES - used - separator;
    if (available <= 0) {
      truncated = true;
      break;
    }
    const clipped = takeUtf8(line, available);
    kept.push(clipped);
    used += separator + byteLength(clipped);
    if (clipped !== line) {
      truncated = true;
      break;
    }
  }

  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  const body = kept.join('\n').trim();
  if (!body) return '';
  return body + (truncated
    ? '\n[Preferences truncated at startup; read me/preferences.md on demand for the remainder.]'
    : '');
}

function pathApi(platform) {
  return platform === 'win32' ? path.win32 : path;
}

function comparablePath(value, platform = process.platform) {
  if (!value) return '';
  const api = pathApi(platform);
  let normalized;
  try {
    normalized = api.normalize(api.resolve(String(value).trim()));
  } catch {
    normalized = String(value).trim();
  }
  normalized = normalized.replace(/[\\/]+$/, '');
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isWithin(workspace, repo, platform = process.platform) {
  const api = pathApi(platform);
  const current = comparablePath(workspace, platform);
  const root = comparablePath(repo, platform);
  return !!root && (current === root || current.startsWith(root + api.sep));
}

function findProject(indexText, workspace, platform = process.platform) {
  let name = '';
  for (const line of indexText.replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^##\s+(.+?)(?:\s*<!--\s*status:.*)?$/);
    if (heading) {
      name = heading[1].trim();
      continue;
    }
    const repoAt = line.indexOf('repo: ');
    if (repoAt === -1) continue;
    const rest = line.slice(repoAt + 6).trim();
    const memoryMarker = '. memory: ';
    const memoryAt = rest.indexOf(memoryMarker);
    const repo = (memoryAt === -1 ? rest : rest.slice(0, memoryAt)).trim();
    const api = pathApi(platform);
    const memory = (memoryAt === -1
      ? api.join(repo, '.loci', 'memory.md')
      : rest.slice(memoryAt + memoryMarker.length).trim());
    if (isWithin(workspace, repo, platform)) return { name, repo, memory };
  }
  return null;
}

function stateSummary(text) {
  const allowed = new Set(['state', 'energy', 'updated', 'ttl', 'context']);
  const result = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!match || !allowed.has(match[1])) continue;
    const clipped = takeUtf8(`${match[1]}: ${match[2]}`, 240);
    result.push(`- ${clipped}${clipped.length < match[0].length ? '...' : ''}`);
  }
  return result.join('\n');
}

function localTimestamp(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    weekday: 'short'
  }).formatToParts(now).reduce((all, part) => {
    all[part.type] = part.value;
    return all;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} ${parts.weekday}`;
}

function section(title, body) {
  return body ? `\n===== ${title} =====\n${body}\n` : '';
}

function buildContext(options = {}) {
  const brain = path.resolve(options.brain || path.join(__dirname, '..'));
  const workspace = path.resolve(options.workspace || process.env.LOCI_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const platform = options.platform || process.platform;

  let output = `[Loci] Lightweight startup map · ${localTimestamp(options.now)}\n`;
  output += `Brain: ${brain}\nWorkspace: ${workspace}\n`;
  output += 'This startup map is already loaded. Do not run it again in this session.\n';

  const preferences = compactPreferences(readText(path.join(brain, 'me', 'preferences.md')));
  output += section('Standing user preferences — honor in every reply', preferences);

  output += section('On-demand memory map — open only when the request needs it', [
    'Paths below are relative to Brain.',
    '- Life direction and goals -> plan.md',
    '- Current tasks -> tasks/active.md; full task data -> tasks/tasks.json',
    "- Serious projects -> projects/index.md; then open only the matching repo's .loci/memory.md",
    '- Personal context -> me/',
    '- Decisions -> decisions/',
    '- People and places -> people/ and places/',
    '- User notes -> notes/index.md; saved external material -> references/',
    '- Quick thoughts -> inbox.md',
    '- Recent activity, only when asked what happened -> .loci/activity/'
  ].join('\n'));

  const project = findProject(readText(path.join(brain, 'projects', 'index.md')), workspace, platform);
  if (project) {
    output += section('Current workspace project pointer', [
      `- Project: ${project.name}`,
      `- Repo: ${project.repo}`,
      `- Memory (read on demand): ${project.memory}`
    ].join('\n'));
  }

  output += section(
    'Current state summary — refresh the file if freshness matters',
    stateSummary(readText(path.join(brain, '.loci', 'status.yml')))
  );

  const footer = '\nDo not preload plans, tasks, inbox, journals, project memory, or history. Read the smallest relevant source on demand and cache it for this session.\n===== end of lightweight startup map =====\n';
  const budget = Math.max(0, MAX_OUTPUT_BYTES - byteLength(footer));
  if (byteLength(output) > budget) {
    output = takeUtf8(output, Math.max(0, budget - 80)).trimEnd()
      + '\n[Startup map truncated; use the on-demand paths above.]\n';
  }
  return output + footer;
}

function main(argv = process.argv.slice(2)) {
  try {
    const output = buildContext({ brain: argv[0], workspace: argv[1] });
    process.stdout.write(output);
  } catch {
    // Startup context is an optimization, never a reason to block a session.
    process.exitCode = 0;
  }
}

module.exports = {
  MAX_OUTPUT_BYTES,
  buildContext,
  compactPreferences,
  comparablePath,
  findProject,
  isWithin,
  stateSummary,
  takeUtf8
};

if (require.main === module) main();
