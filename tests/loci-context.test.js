'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'loci-context.sh');
const NODE_SCRIPT = path.join(ROOT, 'scripts', 'loci-context.js');
const HOOK = path.join(ROOT, '.claude', 'hooks', 'loci-context.sh');
const DAILY_HOOK = path.join(ROOT, '.claude', 'hooks', 'daily-context.sh');
const NODE_HOOK = path.join(ROOT, '.claude', 'hooks', 'loci-context.js');
const GLOBAL_BLOCK = path.join(ROOT, 'templates', 'global-claude-block.md');
const NODE_DAILY_HOOK = path.join(ROOT, '.claude', 'hooks', 'daily-context.js');
const UPDATE = path.join(ROOT, 'update.sh');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'loci context 测试-'));
const brain = path.join(tmp, 'brain with 空格');
const repo = path.join(tmp, 'project with 空格');
const workspace = path.join(repo, 'nested');
const home = path.join(tmp, 'home');

// GitHub's Windows runner includes Git Bash. Convert native paths only for the
// retained shell fallback; the primary assertions run through native Node.
function bashPath(value) {
  if (process.platform !== 'win32') return value;
  const normalized = value.replace(/\\/g, '/');
  return normalized.replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
}

const scriptForBash = bashPath(SCRIPT);
const hookForBash = bashPath(HOOK);
const dailyHookForBash = bashPath(DAILY_HOOK);
const updateForBash = bashPath(UPDATE);
const brainForBash = bashPath(brain);
const repoForBash = bashPath(repo);
const workspaceForBash = bashPath(workspace);
const homeForBash = bashPath(home);

function write(rel, body) {
  const target = path.join(brain, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body, 'utf8');
}

function runContext(extraEnv = {}) {
  return execFileSync('bash', [scriptForBash, brainForBash], {
    encoding: 'utf8',
    env: { ...process.env, LOCI_PROJECT_DIR: workspaceForBash, ...extraEnv },
  });
}

function runNodeContext(extraEnv = {}) {
  return execFileSync(process.execPath, [NODE_SCRIPT, brain, workspace], {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv }
  });
}

function ok(name) {
  process.stdout.write(`  ok  ${name}\n`);
}

try {
  const globalBlockBytes = Buffer.byteLength(fs.readFileSync(GLOBAL_BLOCK, 'utf8'));
  assert(globalBlockBytes <= 4000, `global instructions grew to ${globalBlockBytes} bytes`);
  ok('global instruction block stays below 4 KB');

  fs.mkdirSync(workspace, { recursive: true });
  fs.mkdirSync(path.join(home, '.loci'), { recursive: true });
  fs.writeFileSync(path.join(home, '.loci', 'brain-path'), brainForBash, 'utf8');

  write('me/preferences.md', `---
status: active
---
# Preferences
- Call me 老板
- Reply briefly
`);
  write('plan.md', 'PLAN_SECRET_MUST_BE_ON_DEMAND\n');
  write('tasks/active.md', 'TASK_SECRET_MUST_BE_ON_DEMAND\n');
  write('inbox.md', '- INBOX_SECRET_MUST_BE_ON_DEMAND\n');
  write('tasks/journal/2026-08-21.md', 'JOURNAL_SECRET_MUST_BE_ON_DEMAND\n');
  const nativeProjectEntry = `## Unicode Project   <!-- status: active -->\nShort description. repo: ${repo}. memory: ${path.join(repo, '.loci', 'memory.md')}\n`;
  const bashProjectEntry = repoForBash === repo ? '' : `## Unicode Project   <!-- status: active -->\nShell path. repo: ${repoForBash}. memory: ${repoForBash}/.loci/memory.md\n`;
  write('projects/index.md', `# Projects\n\n${nativeProjectEntry}${bashProjectEntry}updated: 2026-08-22\n`);
  write('.loci/status.yml', `# comments must not be copied
state: focused
energy: high
updated: 2026-08-22T12:00:00+08:00
ttl: 4h
context: "Testing the compact startup map"
private_detail: STATUS_SECRET_MUST_BE_ON_DEMAND
`);

  execFileSync('bash', ['-n', scriptForBash]);
  execFileSync('bash', ['-n', hookForBash]);
  execFileSync('bash', ['-n', dailyHookForBash]);
  ok('shell scripts parse');

  const nativeOutput = runNodeContext();
  assert(nativeOutput.includes('[Loci] Lightweight startup map'));
  assert(nativeOutput.includes('Call me 老板'));
  assert(!nativeOutput.includes('status: active'));
  assert(nativeOutput.includes('Project: Unicode Project'));
  assert(!nativeOutput.includes('PLAN_SECRET'));
  assert(Buffer.byteLength(nativeOutput) <= 4400);
  ok('native Node builder is compact on the host platform');

  const output = runContext();
  assert(output.includes('[Loci] Lightweight startup map'));
  assert(output.includes('Call me 老板'));
  assert(!output.includes('status: active'), 'preference frontmatter leaked');
  assert(output.includes('Paths below are relative to Brain.'));
  assert(output.includes('Project: Unicode Project'));
  assert(output.includes(`Repo: ${repoForBash}`));
  assert(output.includes('state: focused'));
  assert(!output.includes('private_detail'));
  for (const secret of ['PLAN_SECRET', 'TASK_SECRET', 'INBOX_SECRET', 'JOURNAL_SECRET', 'STATUS_SECRET']) {
    assert(!output.includes(secret), `${secret} was preloaded`);
  }
  assert(Buffer.byteLength(output) < 4500, `startup output too large: ${Buffer.byteLength(output)} bytes`);
  ok('output is compact and keeps changing content on demand');

  // The Claude hook must delegate to the same builder instead of maintaining
  // a second payload. Copy the managed script into the fake installed brain.
  fs.mkdirSync(path.join(brain, 'scripts'), { recursive: true });
  fs.copyFileSync(SCRIPT, path.join(brain, 'scripts', 'loci-context.sh'));
  fs.copyFileSync(NODE_SCRIPT, path.join(brain, 'scripts', 'loci-context.js'));
  const hookRaw = execFileSync('bash', [hookForBash], {
    encoding: 'utf8',
    env: { ...process.env, HOME: homeForBash, CLAUDE_PROJECT_DIR: workspaceForBash },
  });
  const hookPayload = JSON.parse(hookRaw);
  const hookContext = hookPayload.hookSpecificOutput.additionalContext;
  assert(hookContext.includes('[Loci] Lightweight startup map'));
  assert(hookContext.includes('Project: Unicode Project'));
  assert(!hookContext.includes('PLAN_SECRET'));
  ok('Claude hook delegates to the shared lightweight builder');

  const dailyHookRaw = execFileSync('bash', [dailyHookForBash], {
    encoding: 'utf8',
    env: { ...process.env, HOME: homeForBash, CLAUDE_PROJECT_DIR: workspaceForBash },
  });
  const dailyHookContext = JSON.parse(dailyHookRaw).hookSpecificOutput.additionalContext;
  assert(dailyHookContext.includes('[Loci] Lightweight startup map'));
  assert(dailyHookContext.includes('Project: Unicode Project'));
  assert(!dailyHookContext.includes('PLAN_SECRET'));
  ok('project-level Claude hook delegates to the shared lightweight builder');

  // Git Bash needs /d/... paths, while native Node on Windows needs D:\\....
  // Switch the shared pointer back before exercising the native wrappers.
  fs.writeFileSync(path.join(home, '.loci', 'brain-path'), brain, 'utf8');
  const nodeHookEnv = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    CLAUDE_PROJECT_DIR: workspace
  };
  const nodeHookPayload = JSON.parse(execFileSync(process.execPath, [NODE_HOOK], {
    encoding: 'utf8', env: nodeHookEnv
  }));
  assert(nodeHookPayload.hookSpecificOutput.additionalContext.includes('Project: Unicode Project'));
  assert(!nodeHookPayload.hookSpecificOutput.additionalContext.includes('PLAN_SECRET'));
  fs.mkdirSync(path.join(workspace, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(workspace, '.claude', 'settings.json'), JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ command: 'node ".claude/hooks/daily-context.js"' }] }] }
  }), 'utf8');
  const skippedGlobalPayload = JSON.parse(execFileSync(process.execPath, [NODE_HOOK], {
    encoding: 'utf8', env: nodeHookEnv
  }));
  assert(!skippedGlobalPayload.hookSpecificOutput, 'global Claude hook should skip an active project hook');
  const nodeDailyPayload = JSON.parse(execFileSync(process.execPath, [NODE_DAILY_HOOK], {
    encoding: 'utf8', env: nodeHookEnv
  }));
  assert(nodeDailyPayload.hookSpecificOutput.additionalContext.includes('Project: Unicode Project'));
  ok('Claude Node hooks work without Bash or Python');

  for (const rel of ['.claude/CLAUDE.md', '.codex/AGENTS.md', '.workbuddy/MEMORY.md']) {
    const target = path.join(home, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `USER CONTENT BEFORE\n<!-- loci:start v1 -->\nOLD STARTUP CONTENT\n<!-- loci:end -->\nUSER CONTENT AFTER\n`, 'utf8');
  }
  execFileSync('bash', [updateForBash, '--refresh-blocks'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: homeForBash },
  });
  for (const rel of ['.claude/CLAUDE.md', '.codex/AGENTS.md', '.workbuddy/MEMORY.md']) {
    const refreshed = fs.readFileSync(path.join(home, rel), 'utf8');
    assert(refreshed.includes('USER CONTENT BEFORE'));
    assert(refreshed.includes('USER CONTENT AFTER'));
    assert(/lightweight startup/i.test(refreshed));
    assert(!refreshed.includes('OLD STARTUP CONTENT'));
  }
  const refreshedCodexHooks = JSON.parse(fs.readFileSync(path.join(home, '.codex', 'hooks.json'), 'utf8'));
  const refreshedLociHandlers = refreshedCodexHooks.hooks.SessionStart
    .flatMap((group) => group.hooks || [])
    .filter((handler) => /loci-context\.js/.test(handler.command || ''));
  assert.strictEqual(refreshedLociHandlers.length, 1);
  assert.strictEqual(refreshedLociHandlers[0].timeout, 3);
  ok('existing global instruction blocks refresh without touching user content');

  const longPrefs = Array.from({ length: 35 }, (_, i) => `- preference-${i + 1}`).join('\n');
  write('me/preferences.md', `---\nstatus: active\n---\n${longPrefs}\n`);
  const truncated = runContext();
  assert(truncated.includes('preference-30'));
  assert(!truncated.includes('preference-31'));
  assert(truncated.includes('Preferences truncated at startup'));
  ok('preferences have a defensive startup budget');

  write('me/preferences.md', '---\nstatus: template\n---\nTEMPLATE_MUST_NOT_LOAD\n');
  assert(!runContext().includes('TEMPLATE_MUST_NOT_LOAD'));
  ok('template preferences are skipped');

  write('me/preferences.md', '\uFEFF---\r\nstatus: active\r\n---\r\n# Preferences\r\n- Windows CRLF works\r\n');
  assert(runNodeContext().includes('Windows CRLF works'));
  assert(!runNodeContext().includes('\r'));
  ok('BOM and Windows CRLF input is normalized');

  write('me/preferences.md', `---\nstatus: active\n---\n${'偏好'.repeat(2000)}\n`);
  const unicodeBudget = runNodeContext();
  assert(Buffer.byteLength(unicodeBudget) <= 4400, `Unicode output exceeded budget: ${Buffer.byteLength(unicodeBudget)}`);
  assert(unicodeBudget.includes('Preferences truncated at startup'));
  ok('hard byte budget also holds for multi-byte Unicode');

  const { findProject } = require(NODE_SCRIPT);
  const windowsProject = findProject(
    '## Windows Project <!-- status: active -->\r\nDescription. repo: C:\\Users\\老板\\My Project. memory: C:\\Users\\老板\\My Project\\.loci\\memory.md\r\n',
    'c:\\users\\老板\\my project\\src',
    'win32'
  );
  assert(windowsProject && windowsProject.name === 'Windows Project');
  ok('Windows drive paths match case-insensitively');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
