#!/usr/bin/env node
'use strict';

// Claude Code PostToolUse hook: append changes to the cross-terminal ledger.
// Reads the official hook JSON payload from stdin; no shell variables needed.

const fs = require('fs');
const path = require('path');

const TRACKED = /^(?:inbox\.md|plan\.md|\.loci\/status\.yml|tasks\/|me\/|decisions\/|projects\/|people\/|references\/|\.loci\/links\/[^/]+\/(?:to-hq|from-hq)\.md)/;

function safeField(value) {
  return String(value || '').replace(/[|\r\n]/g, '_');
}

function relativeFile(root, file, cwd = root) {
  if (!file) return '';
  const absolute = path.isAbsolute(file) ? file : path.resolve(cwd, file);
  const relative = path.relative(root, absolute).split(path.sep).join('/');
  if (!relative || relative === '..' || relative.startsWith('../')) return '';
  return relative;
}

function recordChange(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..', '..'));
  const file = relativeFile(root, options.filePath, options.cwd || root);
  if (!file || !TRACKED.test(file)) return { recorded: false, file };
  const log = path.join(root, '.loci', 'changelog.log');
  const terminal = safeField(options.terminalId || process.env.LOCI_TERMINAL_ID || `terminal-${process.pid}`);
  const timestamp = Math.floor((options.now || Date.now()) / 1000);
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.appendFileSync(log, `${timestamp}|${terminal}|WRITE|${safeField(file)}|\n`, 'utf8');
  return { recorded: true, file };
}

function main() {
  try {
    const raw = fs.readFileSync(0, 'utf8').trim();
    const input = raw ? JSON.parse(raw) : {};
    const tool = input.tool_input || {};
    recordChange({
      root: path.resolve(__dirname, '..', '..'),
      cwd: input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd(),
      filePath: tool.file_path || tool.path || process.argv[2]
    });
  } catch {
    // Change tracking is best-effort and must never block the edit.
  }
}

module.exports = { recordChange, relativeFile, safeField };

if (require.main === module) main();
