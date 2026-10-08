'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { install, check } = require('../scripts/loci-install');
const { update } = require('../scripts/loci-update');
const { Transaction, replaceBlock } = require('../scripts/loci-install-lib');
const ROOT = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'loci migration-'));
const brain = path.join(tmp, "brain $& cash's 空格");
const home = path.join(tmp, 'home');
function write(root, rel, body) { const file = path.join(root, rel); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }
function read(root, rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function clone(to) { fs.cpSync(ROOT, to, { recursive: true, filter: src => !['.git', '.loci/backups'].some(rel => src === path.join(ROOT, rel) || src.startsWith(path.join(ROOT, rel) + path.sep)) }); }
function run(script, args) { return JSON.parse(execFileSync(process.execPath, [path.join(brain, 'scripts', script), ...args], { encoding: 'utf8' })); }
try {
  clone(brain);
  execFileSync('git', ['init', brain], { stdio: 'pipe' });
  execFileSync('git', ['remote', 'add', 'origin', 'https://github.com/codesstar/loci.git'], { cwd: brain });
  write(brain, 'CLAUDE.md', read(brain, 'CLAUDE.md') + '\nCUSTOM ROOT INSTRUCTION\n');
  write(home, '.workbuddy/MEMORY.md', '# My rules\nUser content.\n');
  const first = install({ brain, home, connect: 'workbuddy', name: '测试用户', lang: 'zh' });
  assert(first.ok);
  assert(read(brain, 'CLAUDE.md').includes('CUSTOM ROOT INSTRUCTION'));
  assert.strictEqual(execFileSync('git', ['remote', 'get-url', '--push', 'origin'], { cwd: brain, encoding: 'utf8' }).trim(), 'DISABLED-LOCI-PERSONAL-BRAIN');
  assert(!fs.existsSync(path.join(home, '.codex')));
  assert(read(home, '.workbuddy/MEMORY.md').includes('User content.'));
  write(brain, 'me/identity.md', 'PRIVATE_IDENTITY\n');
  write(brain, 'me/preferences.md', 'PREFERENCES\n');
  write(brain, 'plan.md', '---\nstatus: active\n---\nMY_GOALS\n');
  write(brain, '.loci/config.yml', 'version: 1\nlanguage: zh\npersistence:\n  mode: manual\n  notify: false\n\nwellbeing:\n  enabled: false\ncustom: keep\n');
  const task = run('loci-task.js', ['add', '--title', '测试待办', '--date', '2026-10-09', '--start', '09:00']);
  assert(task.ok);
  run('loci-task.js', ['schedule', '--title', '测试会议', '--date', '2026-10-09', '--start', '10:00']);
  run('loci-scrap.js', ['add', '--text', '一条保留的碎片']);
  const protectedFiles = ['me/identity.md', 'me/preferences.md', 'plan.md', 'tasks/tasks.json', 'tasks/calendar.json'];
  const before = Object.fromEntries(protectedFiles.map(rel => [rel, read(brain, rel)]));
  const second = install({ brain, home, connect: 'workbuddy', name: 'DO NOT OVERWRITE', force: true });
  assert(second.ok && second.warnings.some(s => s.includes('manual mode')));
  for (const [rel, data] of Object.entries(before)) assert.strictEqual(read(brain, rel), data, rel);
  assert(!read(brain, '.loci/config.yml').includes('persistence:'));
  assert(read(brain, '.loci/config.yml').includes('custom: keep'));
  assert(read(brain, '.loci/config.yml').includes('enabled: false'));
  assert.strictEqual(read(home, '.workbuddy/MEMORY.md').split('<!-- loci:start').length, 2);
  console.log('ok: fresh installation, same-brain rerun, guarded writes and manual-mode migration preserve data');

  write(home, '.claude/settings.json', '{ invalid JSON');
  const partial = install({ brain, home, connect: 'claude' });
  assert(partial.ok && partial.warnings.some(s => s.includes('hook unavailable')));
  assert.strictEqual(read(home, '.claude/settings.json'), '{ invalid JSON');
  assert(read(home, '.claude/CLAUDE.md').includes('LOCI-RULES.md'));
  assert.throws(() => replaceBlock('user\n<!-- loci:start v1 --> broken', 'new'), /Malformed/);
  console.log('ok: broken optional hook settings remain untouched; instruction fallback is installed');

  const other = path.join(tmp, 'other brain'); clone(other);
  assert.throws(() => install({ brain: other, home }), /Another brain/);
  assert(check({ brain, home }).ok);

  // Simulate a known published root rulebook and old duplicated files.
  write(brain, 'CLAUDE.md', require('zlib').gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures/legacy-CLAUDE.md.gz'))).toString());
  write(brain, 'AGENTS.md', require('zlib').gunzipSync(fs.readFileSync(path.join(__dirname, 'fixtures/legacy-AGENTS.md.gz'))).toString());
  write(brain, 'docs/behavior.md', 'old duplicated rules');
  const project = path.join(tmp, 'my project');
  write(project, 'AGENTS.md', 'CUSTOM BEFORE\n<!-- loci:project:start v1 -->\nold rules\n<!-- loci:project:end -->\nCUSTOM AFTER\n');
  write(brain, 'projects/index.md', `# Projects\n## My Project\nWork. repo: ${project}. memory: ${project}/.loci/memory.md\n`);
  const oldRoot = read(brain, 'CLAUDE.md');
  const upgraded = update({ brain, home, source: ROOT, connect: 'workbuddy' });
  assert(upgraded.ok);
  assert(!read(brain, 'CLAUDE.md').includes('MANDATORY FIRST ACTION'));
  assert(read(brain, 'CLAUDE.md').includes('LOCI-RULES.md'));
  assert(!fs.existsSync(path.join(brain, 'docs/behavior.md')));
  assert(read(project, 'AGENTS.md').includes('CUSTOM AFTER'));
  assert(!read(project, 'AGENTS.md').includes('old rules'));
  for (const [rel, data] of Object.entries(before)) assert.strictEqual(read(brain, rel), data, rel);
  Transaction.restore(upgraded.backup);
  assert.strictEqual(read(brain, 'CLAUDE.md'), oldRoot);
  assert(read(project, 'AGENTS.md').includes('old rules'));
  assert(read(brain, 'docs/behavior.md').includes('old duplicated rules'));
  console.log('ok: upgrade/rollback preserve personal data and custom project instructions');

  const again = update({ brain, home, source: ROOT, connect: 'workbuddy' });
  write(brain, 'CLAUDE.md', read(brain, 'CLAUDE.md') + '\nNEW USER EDIT\n');
  assert.throws(() => Transaction.restore(again.backup), /Changed since upgrade/);
  console.log('ok: rollback refuses to erase changes made after upgrade');

  // An invalid global block is detected after engine copy; rollback restores it all.
  write(home, '.workbuddy/MEMORY.md', 'USER CONTENT\n<!-- loci:start v2 --> incomplete');
  write(brain, 'LOCI.md', read(brain, 'LOCI.md') + '\nOLD ENGINE SENTINEL\n');
  const ruleBefore = read(brain, 'LOCI.md');
  assert.throws(() => update({ brain, home, source: ROOT, connect: 'workbuddy' }), /Malformed/);
  assert.strictEqual(read(brain, 'LOCI.md'), ruleBefore);
  assert(read(home, '.workbuddy/MEMORY.md').includes('USER CONTENT'));
  console.log('ok: failed migration rolls back engine and configuration changes');

  if (process.platform !== 'win32') {
    const external = path.join(tmp, 'external'); write(external, 'loci-task.js', 'DO NOT TOUCH');
    fs.rmSync(path.join(brain, 'scripts'), { recursive: true }); fs.symlinkSync(external, path.join(brain, 'scripts'));
    assert.throws(() => update({ brain, home, source: ROOT }), /symlink/);
    assert.strictEqual(read(external, 'loci-task.js'), 'DO NOT TOUCH');
    console.log('ok: engine update cannot follow symlinks into other data');
  }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
