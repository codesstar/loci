#!/usr/bin/env node
'use strict';

// Read cross-terminal changes since this terminal's last checkpoint.

const fs = require('fs');
const path = require('path');

function safeId(value) {
  return String(value || '').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 80) || 'default';
}

function timeLabel(seconds) {
  const date = new Date(Number(seconds) * 1000);
  if (Number.isNaN(date.getTime())) return String(seconds);
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);
}

function checkUpdates(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..', '..'));
  const terminal = safeId(options.terminalId || process.env.LOCI_TERMINAL_ID || `terminal-${process.pid}`);
  const log = path.join(root, '.loci', 'changelog.log');
  const checkpoint = path.join(root, '.loci', `last-check-${terminal}`);
  if (!fs.existsSync(log)) return { lines: [], message: 'No cross-terminal updates yet.' };

  const all = fs.readFileSync(log, 'utf8').split(/\r?\n/).filter(Boolean);
  let since = 0;
  try { since = Math.max(0, Number.parseInt(fs.readFileSync(checkpoint, 'utf8'), 10) || 0); } catch {}
  const lines = all.slice(since).filter((line) => line.split('|')[1] !== terminal);
  fs.writeFileSync(checkpoint, `${all.length}\n`, 'utf8');
  return {
    lines,
    message: lines.length ? '' : 'No cross-terminal updates since last session.'
  };
}

function format(result) {
  if (!result.lines.length) return result.message;
  const body = result.lines.map((line) => {
    const [timestamp, terminal, operation, file, description] = line.split('|');
    return `  [${timeLabel(timestamp)}] ${terminal}: ${operation} ${file}${description ? ` ${description}` : ''}`;
  });
  return ['=== Cross-terminal updates ===', ...body, '=============================='].join('\n');
}

function main() {
  try {
    process.stdout.write(format(checkUpdates()) + '\n');
  } catch {
    process.stdout.write('Cross-terminal update check unavailable; continue without retrying.\n');
  }
}

module.exports = { checkUpdates, format, safeId, timeLabel };

if (require.main === module) main();
