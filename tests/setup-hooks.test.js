'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { normalizePath } = require('../scripts/loci-path');

const ROOT = path.join(__dirname, '..');
// On Windows, keep the fixture on the checkout drive. Git Bash then exposes a
// real /d/... path like a user's /g/loci install instead of its runner-specific
// virtual /tmp mount.
const tmpParent = process.platform === 'win32' ? path.dirname(ROOT) : os.tmpdir();
const tmp = fs.mkdtempSync(path.join(tmpParent, 'loci setup integration-'));
const brain = path.join(tmp, "brain $cash's & 空格");
const home = path.join(tmp, 'home & 空格');

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

  const setupOutput = execFileSync('bash', [
    path.join(brain, 'setup.sh'), '--non-interactive', '--force',
    '--name', 'Setup Test', '--connect', 'both', '--lang', 'zh'
  ], {
    cwd: brain,
    env: { ...process.env, HOME: home, USERPROFILE: home, TERM: 'xterm' },
    encoding: 'utf8'
  });

  const claudeFile = path.join(home, '.claude', 'settings.json');
  const codexFile = path.join(home, '.codex', 'hooks.json');
  const registeredBrain = fs.readFileSync(path.join(home, '.loci', 'brain-path'), 'utf8').trim();
  assert(fs.existsSync(registeredBrain), `registered brain does not exist: ${registeredBrain}\n${setupOutput}`);
  assert.strictEqual(
    normalizePath(fs.realpathSync(registeredBrain)),
    normalizePath(fs.realpathSync(brain))
  );
  if (process.platform === 'win32') assert(!/^\/[a-z]\//i.test(registeredBrain));
  const claude = JSON.parse(fs.readFileSync(claudeFile, 'utf8'));
  const codex = JSON.parse(fs.readFileSync(codexFile, 'utf8'));
  assert(fs.readFileSync(path.join(home, '.claude', 'CLAUDE.md'), 'utf8').includes(registeredBrain));
  assert(fs.readFileSync(path.join(home, '.codex', 'AGENTS.md'), 'utf8').includes(registeredBrain));

  assert(handlers(claude, 'SessionStart').some((hook) => /loci-context\.js/.test(hook.command || '')));
  const claudeLociGroup = claude.hooks.SessionStart.find((group) =>
    (group.hooks || []).some((hook) => /loci-context\.js/.test(hook.command || '')));
  const claudeLoci = claudeLociGroup.hooks.find((hook) => /loci-context\.js/.test(hook.command || ''));
  assert.strictEqual(claudeLociGroup.matcher, 'startup|resume|clear|compact|fork');
  assert.strictEqual(claudeLoci.timeout, 3);
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

  const plainWorkspace = path.join(tmp, 'plain workspace');
  fs.mkdirSync(plainWorkspace, { recursive: true });
  const installedHook = path.join(home, '.claude', 'hooks', 'loci-context.js');
  const hookPayload = JSON.parse(execFileSync(process.execPath, [installedHook], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_PROJECT_DIR: plainWorkspace }
  }));
  assert(hookPayload.hookSpecificOutput.additionalContext.includes('Lightweight startup map'));
  assert(!hookPayload.hookSpecificOutput.additionalContext.includes('Startup map unavailable'));
  ok('fresh setup pointer drives the installed Claude hook outside the brain repo');

  const context = execFileSync(process.execPath, [path.join(brain, 'scripts', 'loci-context.js'), brain], {
    encoding: 'utf8'
  });
  assert(Buffer.byteLength(context) <= 4400);
  assert(context.includes('Lightweight startup map'));
  ok('installed builder remains within the hard startup budget');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
