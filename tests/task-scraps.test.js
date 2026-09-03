#!/usr/bin/env node
// A task links to scraps by id (`--scraps`), and only to scraps that exist. Runs the real CLI
// against a throwaway brain assembled in the OS temp dir.
process.env.LOCI_ENRICH = 'off';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'loci-task-scraps-'));
for (const rel of ['scripts/loci-task.js', 'scripts/loci-scrap.js', '.loci/dashboard/lib/store.js', '.loci/dashboard/lib/scraps.js']) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true });
  fs.copyFileSync(path.join(REPO, rel), path.join(ROOT, rel));
}
fs.mkdirSync(path.join(ROOT, 'tasks'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'tasks', 'tasks.json'), JSON.stringify({ tasks: [] }, null, 2));
const run = (args) => JSON.parse(execFileSync('node', [path.join(ROOT, 'scripts', 'loci-task.js'), ...args], { cwd: ROOT, encoding: 'utf-8', env: Object.assign({}, process.env, { LOCI_ENRICH: 'off' }) }));
const scraps = require(path.join(ROOT, '.loci', 'dashboard', 'lib', 'scraps.js'));
scraps.init({ LOCI_ROOT: ROOT, store: require(path.join(ROOT, '.loci', 'dashboard', 'lib', 'store.js')) });
const tasksOnDisk = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'tasks', 'tasks.json'), 'utf-8')).tasks;

let n = 0; const ok = (name) => { n += 1; console.log('  ok ' + n + ' ' + name); };

const a = scraps.add({ text: '参考这条 #灵感', source: 'test' });
const b = scraps.add({ url: 'https://example.com/ref', source: 'test', enrich: false });

// add: the ids that exist stick, the typo is reported and dropped
let out = run(['add', '--title', '写介绍', '--scraps', a.id + ',' + b.id + ',ref:nope.md,garbage']);
assert.deepEqual(out.task.scraps, [a.id, b.id]);
assert.deepEqual(out.links.unknownScraps, ['ref:nope.md', 'garbage']);
assert.deepEqual(tasksOnDisk()[0].scraps, [a.id, b.id]);
ok('add --scraps keeps existing ids, reports the rest');

// update: replace, then clear
out = run(['update', '--id', out.task.id, '--scraps', b.id]);
assert.deepEqual(out.task.scraps, [b.id]);
out = run(['update', '--id', out.task.id, '--scraps=']);
assert(!out.task.scraps);
assert(!('scraps' in tasksOnDisk()[0]) || tasksOnDisk()[0].scraps == null);
ok('update --scraps replaces; --scraps= clears');

// a task without links stays clean
out = run(['add', '--title', '没关联']);
assert(!('scraps' in out.task));
ok('no --scraps → no field');

fs.rmSync(ROOT, { recursive: true, force: true });
console.log('task-scraps.test.js: all ' + n + ' checks passed');
