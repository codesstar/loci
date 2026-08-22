'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const { install: installCodex, hookHandler, isLociHandler } = require('../scripts/loci-codex-hook');
const { install: installClaude, isLoci: isClaudeLoci } = require('../scripts/loci-claude-settings');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'loci hook 测试-'));
const home = path.join(tmp, 'home with 空格');
const brain = path.join(tmp, "brain $cash's 空格");

function ok(name) {
  process.stdout.write(`  ok  ${name}\n`);
}

function lociHandlers(groups, predicate) {
  return groups.flatMap((group) => Array.isArray(group.hooks) ? group.hooks : []).filter(predicate);
}

try {
  fs.mkdirSync(path.join(brain, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(brain, 'me'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'scripts', 'loci-context.js'), path.join(brain, 'scripts', 'loci-context.js'));
  fs.writeFileSync(path.join(brain, 'me', 'preferences.md'), '- Hook test preference\n', 'utf8');

  const codexFile = path.join(home, '.codex', 'hooks.json');
  fs.mkdirSync(path.dirname(codexFile), { recursive: true });
  const originalCodex = {
    customSetting: { keep: true },
    hooks: {
      SessionStart: [
        { matcher: 'startup', hooks: [{ type: 'command', command: 'node user-hook.js' }] },
        { matcher: 'startup', hooks: [{ type: 'command', command: 'bash /old/loci-context.sh' }] },
        { matcher: 'compact', hooks: [{ type: 'command', command: 'node /duplicate/loci-context.js' }] }
      ],
      Stop: [{ hooks: [{ type: 'command', command: 'node stop.js' }] }]
    }
  };
  fs.writeFileSync(codexFile, JSON.stringify(originalCodex, null, 2), 'utf8');
  const first = installCodex({ home, brain });
  assert(first.changed);
  const codex = JSON.parse(fs.readFileSync(codexFile, 'utf8'));
  assert.deepStrictEqual(codex.customSetting, { keep: true });
  assert.strictEqual(codex.hooks.Stop[0].hooks[0].command, 'node stop.js');
  assert.strictEqual(lociHandlers(codex.hooks.SessionStart, isLociHandler).length, 1);
  assert(codex.hooks.SessionStart.some((group) => group.hooks.some((hook) => hook.command === 'node user-hook.js')));
  const handler = lociHandlers(codex.hooks.SessionStart, isLociHandler)[0];
  assert.strictEqual(handler.timeout, 3);
  assert.strictEqual(handler.additionalContextLimit, 1200);
  if (process.platform === 'win32') {
    assert.strictEqual(handler.commandWindows, handler.command);
  } else {
    assert(!handler.commandWindows, 'POSIX install should not add an unused Windows command');
  }
  assert(fs.existsSync(`${codexFile}.loci-backup`));
  const installedBytes = fs.readFileSync(codexFile, 'utf8');
  assert.strictEqual(installCodex({ home, brain }).changed, false);
  assert.strictEqual(fs.readFileSync(codexFile, 'utf8'), installedBytes);
  ok('Codex merge preserves user hooks, dedupes Loci, backs up, and is idempotent');

  const hookOutput = execSync(handler.command, { cwd: brain, encoding: 'utf8' });
  assert(hookOutput.includes('Hook test preference'));
  assert(Buffer.byteLength(hookOutput) <= 4400);
  ok('installed Codex command executes the native builder');

  const win = hookHandler('C:\\Users\\老板\\Loci Brain', 'win32');
  assert.strictEqual(win.commandWindows, win.command);
  assert(win.commandWindows.includes('C:\\Users\\老板\\Loci Brain\\scripts\\loci-context.js'));
  assert(!win.commandWindows.includes('bash'));
  ok('Windows hook uses native Node through commandWindows');

  const invalidCodexFile = path.join(home, '.codex-invalid', 'hooks.json');
  fs.mkdirSync(path.dirname(invalidCodexFile), { recursive: true });
  fs.writeFileSync(invalidCodexFile, '{ nope', 'utf8');
  assert.throws(() => installCodex({ file: invalidCodexFile, home, brain }), /Cannot parse/);
  assert.strictEqual(fs.readFileSync(invalidCodexFile, 'utf8'), '{ nope');
  ok('invalid Codex JSON is never overwritten');

  const claudeFile = path.join(home, '.claude', 'settings.json');
  fs.mkdirSync(path.dirname(claudeFile), { recursive: true });
  fs.writeFileSync(claudeFile, JSON.stringify({
    permissions: { allow: ['Read'] },
    hooks: {
      SessionStart: [
        { matcher: 'startup', hooks: [{ type: 'command', command: 'node user-claude-hook.js' }] },
        { matcher: 'startup', hooks: [{ type: 'command', command: 'bash "$HOME/.claude/hooks/loci-context.sh"' }] }
      ]
    }
  }, null, 2), 'utf8');
  const claudeResult = installClaude({ home });
  assert(claudeResult.changed);
  const claude = JSON.parse(fs.readFileSync(claudeFile, 'utf8'));
  assert.deepStrictEqual(claude.permissions, { allow: ['Read'] });
  assert.strictEqual(lociHandlers(claude.hooks.SessionStart, isClaudeLoci).length, 1);
  assert(claude.hooks.SessionStart.some((group) => group.hooks.some((hook) => hook.command === 'node user-claude-hook.js')));
  const claudeHandler = lociHandlers(claude.hooks.SessionStart, isClaudeLoci)[0];
  assert(claudeHandler.command.startsWith('node '));
  assert(!claudeHandler.command.includes('loci-context.sh'));
  assert.strictEqual(claudeHandler.timeout, 3);
  assert.strictEqual(installClaude({ home }).changed, false);
  ok('Claude settings migrate from Bash to Node without losing user settings');

  const invalidClaudeFile = path.join(home, '.claude-invalid', 'settings.json');
  fs.mkdirSync(path.dirname(invalidClaudeFile), { recursive: true });
  fs.writeFileSync(invalidClaudeFile, '[invalid', 'utf8');
  assert.throws(() => installClaude({ file: invalidClaudeFile, home }), /Cannot parse/);
  assert.strictEqual(fs.readFileSync(invalidClaudeFile, 'utf8'), '[invalid');
  ok('invalid Claude JSON is never overwritten');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
