#!/usr/bin/env node
'use strict';

// Build the small, read-only context map shared by Codex, Claude Code, and
// instruction-only clients. This file intentionally uses only Node built-ins
// so the same implementation runs in native Windows, macOS, and Linux.

const fs = require('fs');
const path = require('path');
const { normalizePath, resolveBrain } = require('./loci-path');

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
  const platform = options.platform || process.platform;
  const brain = resolveBrain([
    options.brain,
    path.join(__dirname, '..')
  ], { platform }) || normalizePath(options.brain || path.join(__dirname, '..'), platform);
  const workspace = normalizePath(
    options.workspace || process.env.LOCI_PROJECT_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd(),
    platform
  );

  let output = `[Loci] Lightweight startup map · ${localTimestamp(options.now)}\n`;
  output += `Brain: ${brain}\nWorkspace: ${workspace}\n`;
  output += 'This startup map is already loaded. Do not run it again in this session.\n';

  const preferences = compactPreferences(readText(path.join(brain, 'me', 'preferences.md')));
  output += section('Standing user preferences — honor in every reply', preferences);

  output += `\nLoci entry: ${brain}/LOCI.md\nOperation manual (first Loci use): ${brain}/LOCI-RULES.md\n`;

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
  takeUtf8
};

if (require.main === module) main();
