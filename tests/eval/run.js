#!/usr/bin/env node
// Behavior eval — do the routing rules actually survive contact with the model?
//
// tests/ covers the deterministic writers. This covers the 969 lines of prompt
// that tell the model WHERE to write. One case = a throwaway brain + one message
// through `claude -p` + a filesystem diff.
//
// No LLM judge is needed: every rule under test has exactly one right answer,
// so the diff scores itself.
//
//   node tests/eval/run.js                 run every case
//   node tests/eval/run.js --case <id>     run one
//   node tests/eval/run.js --dry-run       build fixtures, skip the model
//   node tests/eval/run.js --keep          keep the brains for inspection

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..', '..');
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8')).cases;
const args = process.argv.slice(2);
const only = args.includes('--case') ? args[args.indexOf('--case') + 1] : null;
const dryRun = args.includes('--dry-run');
const keep = args.includes('--keep');
// CLAUDE_CONFIG_DIR isolates the global CLAUDE.md but can also break login on some
// setups. --no-isolate keeps the real config dir and instead WATCHES the host's own
// brain for contamination, so a polluted run is reported rather than silently scored.
const noIsolate = args.includes('--no-isolate');
const TIMEOUT_MS = 180000;

// config.yml writes a greeting timestamp on its own; that is not a routing decision.
const IGNORED = ['.loci/config.yml'];

// Where the host's global rules would send the model if they leak through.
function hostBrains() {
  const out = [];
  const globalMd = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  if (fs.existsSync(globalMd)) {
    const text = fs.readFileSync(globalMd, 'utf8');
    // Trim to the brain root: .../loci-demo-brain/.loci/x.md -> .../loci-demo-brain
    for (const m of text.matchAll(/\/Users\/[^\s`'")]*?(?:brain|loci)[\w-]*/gi)) {
      if (!out.includes(m[0])) out.push(m[0]); // watched even if absent — the model may create it
    }
  }
  return out;
}

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'loci-eval-'));
const BASE = path.join(ROOT, 'base');
const HOME = path.join(ROOT, 'fake-home'); // keeps the host's global CLAUDE.md out

// Mirror the real ~/.claude so login/settings survive, but blank the global
// CLAUDE.md — otherwise the host's own Loci rules point the model at the real brain.
function buildFakeHome() {
  fs.mkdirSync(HOME, { recursive: true });
  const real = path.join(os.homedir(), '.claude');
  if (fs.existsSync(real)) {
    for (const entry of fs.readdirSync(real)) {
      if (entry === 'CLAUDE.md' || entry.startsWith('CLAUDE.md.')) continue;
      try { fs.symlinkSync(path.join(real, entry), path.join(HOME, entry)); } catch (_) { /* ignore */ }
    }
  }
  fs.writeFileSync(path.join(HOME, 'CLAUDE.md'), '');
  const account = path.join(os.homedir(), '.claude.json'); // account state lives beside the config dir
  if (fs.existsSync(account)) fs.copyFileSync(account, path.join(HOME, '.claude.json'));
}

function buildBase() {
  execFileSync('rsync', ['-a',
    '--exclude=.git', '--exclude=node_modules', '--exclude=site', '--exclude=archive',
    '--exclude=voice-demo', '--exclude=tests/eval',
    '--exclude=.loci/dashboard', '--exclude=.loci/decisions', '--exclude=.loci/progress',
    '--exclude=.loci/knowledge', '--exclude=.loci/activity', '--exclude=docs/reports',
    '--exclude=*.jpg', '--exclude=*.jpeg', '--exclude=*.png', '--exclude=*.gif',
    REPO + '/', BASE + '/']);
  // A template brain tells the model to stop and run setup.sh, so activate it.
  for (const f of ['plan.md', 'me/preferences.md']) {
    const p = path.join(BASE, f);
    if (fs.existsSync(p)) fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/^status: template$/m, 'status: active'));
  }
}

function applyConfig(brain, overrides) {
  if (!overrides) return;
  const p = path.join(brain, '.loci', 'config.yml');
  let text = fs.readFileSync(p, 'utf8');
  for (const [key, value] of Object.entries(overrides)) {
    const leaf = key.split('.').pop();
    const re = new RegExp('^(\\s+' + leaf + ':\\s*)\\S+', 'm');
    if (!re.test(text)) throw new Error('config key not found: ' + key);
    text = text.replace(re, '$1' + value);
  }
  fs.writeFileSync(p, text);
}

function snapshot(dir, prefix = '', acc = {}) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) snapshot(full, rel, acc);
    else if (entry.isFile()) acc[rel] = fs.statSync(full).size + ':' + fs.readFileSync(full).length;
  }
  return acc;
}

function diff(before, after) {
  const changed = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (IGNORED.includes(key)) continue;
    if (before[key] !== after[key]) changed.push(key);
  }
  return changed.sort();
}

// A run that never reached the model must never be scored. Without this, a case
// expecting "writes nothing" passes when claude fails to start — the harness
// reports 100% while testing nothing at all.
function sanity(proc, reply) {
  if (proc.error) return 'claude 没跑起来: ' + proc.error.message;
  if (proc.status !== 0) return 'claude 退出码 ' + proc.status + ' — ' + reply.trim().slice(0, 160);
  if (!reply.trim()) return 'claude 没有任何输出';
  if (/not logged in|please run \/login|invalid api key|authentication failed/i.test(reply)) {
    return '未登录 — ' + reply.trim().slice(0, 120);
  }
  if (reply.trim().length < 10) return '输出过短，模型可能没真正回答: ' + JSON.stringify(reply.trim());
  return null;
}

function score(expect, changed, reply) {
  const fails = [];
  const hit = (p) => changed.some((c) => c === p || c.startsWith(p));

  if (Array.isArray(expect.writes)) {
    if (expect.writes.length === 0 && changed.length > 0) fails.push('应该什么都不写，实际写了: ' + changed.join(', '));
    for (const want of expect.writes) if (!hit(want)) fails.push('没写 ' + want);
  }
  if (expect.writesAnyOf && !expect.writesAnyOf.some(hit)) {
    fails.push('这几个里一个都没写: ' + expect.writesAnyOf.join(' / '));
  }
  for (const forbidden of expect.notWrites || []) {
    if (hit(forbidden)) fails.push('不该写却写了 ' + forbidden);
  }
  if (expect.replyMatches && !new RegExp(expect.replyMatches).test(reply || '')) {
    fails.push('回复里没出现 "' + expect.replyMatches + '"（没有当场生效）');
  }
  return fails;
}

function runCase(testCase) {
  const brain = path.join(ROOT, testCase.id);
  execFileSync('cp', ['-R', BASE, brain]);
  applyConfig(brain, testCase.config);
  const before = snapshot(brain);

  if (dryRun) return { id: testCase.id, skipped: true };

  const watched = noIsolate ? hostBrains() : [];
  const watchBefore = watched.map((d) => snapshot(d));

  const started = Date.now();
  const proc = spawnSync('claude', ['-p', testCase.prompt,
    '--permission-mode', 'acceptEdits',
    '--allowedTools', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
    { cwd: brain, encoding: 'utf8', timeout: TIMEOUT_MS,
      env: noIsolate ? process.env : { ...process.env, CLAUDE_CONFIG_DIR: HOME } });

  const reply = (proc.stdout || '') + (proc.stderr || '');
  const changed = diff(before, snapshot(brain));
  let broken = sanity(proc, reply);
  if (!broken) {
    watched.forEach((dir, i) => {
      const leaked = diff(watchBefore[i], snapshot(dir));
      if (leaked.length) broken = '模型写到了评测之外的大脑 ' + dir + ' — ' + leaked.slice(0, 3).join(', ');
    });
  }
  return {
    id: testCase.id, why: testCase.why, changed, reply, error: broken,
    seconds: ((Date.now() - started) / 1000).toFixed(0),
    fails: broken ? [] : score(testCase.expect, changed, reply),
  };
}

buildFakeHome();
buildBase();
const selected = only ? CASES.filter((c) => c.id === only) : CASES;
if (!selected.length) { console.error('没有匹配的样本: ' + only); process.exit(1); }

console.log('\n临时大脑: ' + ROOT + (dryRun ? '  (dry-run，不调模型)' : '') + '\n');
const results = [];
for (const testCase of selected) {
  process.stdout.write('  跑 ' + testCase.id + ' ... ');
  const result = runCase(testCase);
  results.push(result);
  if (result.skipped) { console.log('skipped'); continue; }
  if (result.error) {
    console.log('ERROR (' + result.seconds + 's)');
    console.log('      ⚠ 评测没跑成，不是产品的结果: ' + result.error);
    continue;
  }
  console.log(result.fails.length ? 'FAIL (' + result.seconds + 's)' : 'pass (' + result.seconds + 's)');
  console.log('      写入: ' + (result.changed.length ? result.changed.join(', ') : '(无)'));
  for (const f of result.fails) console.log('      ✗ ' + f);
}

if (!dryRun) {
  const errored = results.filter((r) => r.error);
  const scored = results.filter((r) => !r.error);
  const passed = scored.filter((r) => !r.fails.length).length;
  console.log('\n' + passed + ' / ' + scored.length + ' 通过' +
    (errored.length ? '   （另有 ' + errored.length + ' 条没跑成，未计入）' : ''));
  fs.writeFileSync(path.join(__dirname, 'last-run.json'), JSON.stringify(results, null, 2));
  console.log('明细: tests/eval/last-run.json');
}
if (!keep) fs.rmSync(ROOT, { recursive: true, force: true });
else console.log('大脑保留在 ' + ROOT);
process.exit(results.some((r) => r.error || (r.fails && r.fails.length)) ? 1 : 0);
