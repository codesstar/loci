'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'loci web setup-'));
const brain = path.join(tmp, 'brain with spaces');
const home = path.join(tmp, 'home with spaces');

function ok(name) {
  process.stdout.write(`  ok  ${name}\n`);
}

try {
  fs.cpSync(ROOT, brain, {
    recursive: true,
    filter(source) {
      const relative = path.relative(ROOT, source);
      return relative !== '.git' && !relative.startsWith(`.git${path.sep}`)
        && relative !== path.join('.claude', 'worktrees')
        && !relative.startsWith(path.join('.claude', 'worktrees') + path.sep);
    }
  });
  fs.mkdirSync(path.join(home, '.workbuddy'), { recursive: true });
  const memory = path.join(home, '.workbuddy', 'MEMORY.md');
  fs.writeFileSync(memory, '# Existing user memory\n', 'utf8');

  const input = JSON.stringify({
    language: 'zh',
    name: 'Web Test',
    role: 'Developer',
    focus: 'Test setup',
    schedule: 'Daytime',
    about: '',
    tools: { claude: false, codex: false, workbuddy: true }
  });
  const program = [
    "const setup = require(process.argv[1]);",
    "const data = JSON.parse(process.argv[2]);",
    "setup.runSetup(data);",
    "setup.runSetup(data);"
  ].join('');
  execFileSync(process.execPath, ['-e', program, path.join(brain, 'setup-web.js'), input], {
    cwd: brain,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    stdio: 'pipe'
  });

  const installed = fs.readFileSync(memory, 'utf8');
  assert(installed.includes('# Existing user memory'));
  assert.strictEqual((installed.match(/<!-- loci:start/g) || []).length, 1);
  assert.strictEqual(fs.readFileSync(`${memory}.loci-backup`, 'utf8'), '# Existing user memory\n');
  assert(!fs.existsSync(path.join(home, '.claude')));
  assert(!fs.existsSync(path.join(home, '.codex')));
  ok('web setup installs WorkBuddy only, preserves user memory, and is idempotent');

  const { normalizeToolSelection } = require('../setup-web');
  assert.deepStrictEqual(normalizeToolSelection(['claude', 'workbuddy']), {
    claude: true, codex: false, workbuddy: true
  });
  ok('web setup accepts independent WorkBuddy selections');

  const manifest = fs.readFileSync(path.join(ROOT, '.loci', 'engine-files.yml'), 'utf8');
  assert(manifest.includes('- setup-web.js'));
  assert(manifest.includes('- setup-wizard.html'));
  ok('web setup files are included in managed upgrades');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
