'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { recordChange } = require('../.loci/hooks/on-file-change');
const { checkUpdates, format, safeId } = require('../.loci/hooks/check-updates');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'loci activity hooks-'));

function ok(name) {
  process.stdout.write(`  ok  ${name}\n`);
}

try {
  const task = path.join(root, 'tasks', 'tasks.json');
  const ignored = path.join(root, 'README.md');
  assert(recordChange({
    root, filePath: task, terminalId: 'terminal-a', now: 1_700_000_000_000
  }).recorded);
  assert(!recordChange({
    root, filePath: ignored, terminalId: 'terminal-a', now: 1_700_000_001_000
  }).recorded);
  assert(recordChange({
    root, filePath: 'me/preferences.md', cwd: root,
    terminalId: 'terminal-b', now: 1_700_000_002_000
  }).recorded);
  ok('write hook records only routed brain files from absolute or relative paths');

  const first = checkUpdates({ root, terminalId: 'terminal-a' });
  assert.strictEqual(first.lines.length, 1);
  assert(first.lines[0].includes('terminal-b|WRITE|me/preferences.md'));
  assert(format(first).includes('Cross-terminal updates'));
  const second = checkUpdates({ root, terminalId: 'terminal-a' });
  assert.strictEqual(second.lines.length, 0);
  assert.strictEqual(second.message, 'No cross-terminal updates since last session.');
  ok('read hook filters the current terminal and advances a line checkpoint');

  assert.strictEqual(safeId('../../bad|terminal'), '.._.._bad_terminal');
  ok('terminal identifiers cannot escape the checkpoint directory or corrupt log fields');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
