'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'loci setup integration-'));
const brain = path.join(tmp, 'brain with spaces');
const home = path.join(tmp, 'home with spaces');

function ok(name) {
  process.stdout.write(`  ok  ${name}\n`);
}

function handlers(config, event) {
  return (config.hooks[event] || []).flatMap((group) => group.hooks || []);
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
  fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'settings.json'), JSON.stringify({
    permissions: { allow: ['Read'] },
    hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node keep-claude.js' }] }] }
  }), 'utf8');
  fs.writeFileSync(path.join(home, '.codex', 'hooks.json'), JSON.stringify({
    custom: 'keep',
    hooks: { Stop: [{ hooks: [{ type: 'command', command: 'node keep-codex.js' }] }] }
  }), 'utf8');

  execFileSync('bash', [
    path.join(brain, 'setup.sh'), '--non-interactive', '--force',
    '--name', 'Setup Test', '--connect', 'both', '--lang', 'zh'
  ], {
    cwd: brain,
    env: { ...process.env, HOME: home, USERPROFILE: home, TERM: 'xterm' },
    stdio: 'pipe'
  });

  const claudeFile = path.join(home, '.claude', 'settings.json');
  const codexFile = path.join(home, '.codex', 'hooks.json');
  const claude = JSON.parse(fs.readFileSync(claudeFile, 'utf8'));
  const codex = JSON.parse(fs.readFileSync(codexFile, 'utf8'));

  assert(handlers(claude, 'SessionStart').some((hook) => /loci-context\.js/.test(hook.command || '')));
  assert(handlers(claude, 'Stop').some((hook) => hook.command === 'node keep-claude.js'));
  assert.strictEqual(claude.permissions.allow[0], 'Read');
  assert(fs.existsSync(`${claudeFile}.loci-backup`));

  const loci = handlers(codex, 'SessionStart').filter((hook) => /loci-context\.js/.test(hook.command || ''));
  assert.strictEqual(loci.length, 1);
  assert.strictEqual(loci[0].timeout, 3);
  assert.strictEqual(loci[0].additionalContextLimit, 1200);
  if (process.platform === 'win32') assert.strictEqual(loci[0].commandWindows, loci[0].command);
  assert(handlers(codex, 'Stop').some((hook) => hook.command === 'node keep-codex.js'));
  assert.strictEqual(codex.custom, 'keep');
  assert(fs.existsSync(`${codexFile}.loci-backup`));
  ok('real setup preserves user config and installs native Claude/Codex hooks');

  const context = execFileSync(process.execPath, [path.join(brain, 'scripts', 'loci-context.js'), brain], {
    encoding: 'utf8'
  });
  assert(Buffer.byteLength(context) <= 4400);
  assert(context.includes('Lightweight startup map'));
  ok('installed builder remains within the hard startup budget');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
