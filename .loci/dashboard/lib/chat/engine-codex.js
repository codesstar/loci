/**
 * lib/chat/engine-codex.js — OpenAI Codex CLI engine.
 *
 * One `codex exec --json` process per turn (JSONL events on stdout), context
 * resumed via `codex exec resume <thread_id>`. Events are mapped onto the
 * same normalized shape engine-claude.js emits, so the manager and UI don't
 * know which engine is underneath.
 *
 * Codex has no --append-system-prompt equivalent, so the embedded-chat
 * guidance is prepended to the FIRST prompt of each session (resumed turns
 * already carry it in-thread).
 */

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TURN_TIMEOUT_MS = 10 * 60 * 1000;

const SYSTEM_PREAMBLE = [
  '【环境说明，务必遵守】你正嵌在 Loci dashboard 网页的聊天窗口里，替用户打理他们的大脑（= 当前工作目录）。',
  '1. 用户只能发文字，无法给你发图片、截图或文件。需要了解任何文件就自己读，绝不让用户看代码或截图。',
  '2. 用户是非技术用户：不展示代码、不暴露路径和内部术语，办完事用一两句话说结果。',
  '3. 改任务/日程只用守卫命令：加任务 node scripts/loci-task.js add --title "..." [--date YYYY-MM-DD] [--start HH:MM] [--note "..."]；',
  '   加日程 node scripts/loci-task.js schedule --title "..." --date YYYY-MM-DD --start HH:MM [--end HH:MM] [--note "..."] [--location "..."]；',
  '   完成 done --id <id>；绝不直接编辑 tasks/tasks.json 或 tasks/calendar.json。',
  '4. 回复简短口语化，遵守大脑 CLAUDE.md/AGENTS.md 的记忆与偏好规则。',
  '',
  '用户消息：',
].join('\n');

let cachedBin;
function resolveBin() {
  if (cachedBin !== undefined) return cachedBin;
  const candidates = [];
  try {
    const w = execFileSync('/usr/bin/which', ['codex'], { encoding: 'utf-8' }).trim();
    if (w) candidates.push(w);
  } catch { /* not on PATH */ }
  const home = process.env.HOME || '';
  candidates.push(
    '/opt/homebrew/bin/codex',
    '/usr/local/bin/codex',
    path.join(home, '.local', 'bin', 'codex')
  );
  cachedBin = null;
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); cachedBin = c; break; } catch { /* next */ }
  }
  return cachedBin;
}

let cachedHealth = null;
function health() {
  if (cachedHealth && cachedHealth.ok) return Promise.resolve(cachedHealth);
  const bin = resolveBin();
  if (!bin) {
    return Promise.resolve({ ok: false, engine: 'codex', reason: '找不到 codex 命令 — 请先安装 Codex CLI' });
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    let child;
    try { child = spawn(bin, ['--version'], { env: process.env }); }
    catch (e) { return finish({ ok: false, engine: 'codex', bin, reason: e.message }); }
    let out = '';
    const timer = setTimeout(() => { try { child.kill(); } catch { } finish({ ok: false, engine: 'codex', bin, reason: 'codex --version 超时' }); }, 15000);
    if (timer.unref) timer.unref();
    child.stdout.on('data', (c) => { out += c; });
    child.on('error', (e) => { clearTimeout(timer); finish({ ok: false, engine: 'codex', bin, reason: e.message }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) { cachedHealth = { ok: true, engine: 'codex', bin, version: out.trim() }; finish(cachedHealth); }
      else finish({ ok: false, engine: 'codex', bin, reason: 'codex --version 退出码 ' + code });
    });
  });
}

function clip(s, max = 200) {
  const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

// codex wraps commands as `/bin/zsh -lc "actual command"` — unwrap for display.
function cleanCommand(cmd) {
  const m = String(cmd || '').match(/^\/bin\/\w+\s+-lc\s+"?([\s\S]*?)"?$/);
  return clip(m ? m[1] : cmd);
}

function startTurn(opts) {
  const bin = resolveBin();
  if (!bin) {
    process.nextTick(() => opts.onExit({ code: -1, killed: false, timedOut: false, sessionId: opts.resumeSessionId || null, error: 'codex not found' }));
    return { kill() { }, pid: null };
  }

  // `codex exec resume` takes a narrower flag set than `codex exec` — no
  // --sandbox/--cd (the resumed thread keeps its original config).
  const prompt = opts.resumeSessionId ? String(opts.prompt) : SYSTEM_PREAMBLE + String(opts.prompt);
  const args = opts.resumeSessionId
    ? ['exec', 'resume', '--json', '--skip-git-repo-check', opts.resumeSessionId, prompt]
    : ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'workspace-write', '--cd', opts.cwd, prompt];

  const child = spawn(bin, args, { cwd: opts.cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });

  let buf = '';
  let stderrTail = '';
  let sessionId = opts.resumeSessionId || null;
  let killed = false;
  let timedOut = false;

  function handleMessage(msg) {
    if (msg.type === 'thread.started') {
      if (msg.thread_id) sessionId = msg.thread_id;
      opts.onEvent({ type: 'turn_start', sessionId });
      return;
    }
    if (msg.type === 'item.started' && msg.item) {
      const it = msg.item;
      if (it.type === 'command_execution') {
        opts.onEvent({ type: 'tool_use', name: 'Bash', inputPreview: cleanCommand(it.command) });
      } else if (it.type === 'web_search') {
        opts.onEvent({ type: 'tool_use', name: 'WebSearch', inputPreview: clip(it.query || '') });
      } else if (it.type === 'file_change' || it.type === 'patch_apply') {
        opts.onEvent({ type: 'tool_use', name: 'Edit', inputPreview: clip(it.path || it.summary || '修改文件') });
      }
      return;
    }
    if (msg.type === 'item.completed' && msg.item) {
      const it = msg.item;
      if (it.type === 'agent_message' && it.text) {
        opts.onEvent({ type: 'assistant_text', text: it.text });
      } else if (it.type === 'command_execution') {
        opts.onEvent({ type: 'tool_result', ok: it.exit_code === 0, preview: clip(it.aggregated_output || '') });
      }
      return;
    }
    if (msg.type === 'turn.completed') {
      opts.onEvent({ type: 'result', ok: true, text: '', sessionId });
      return;
    }
    if (msg.type === 'turn.failed' || msg.type === 'error') {
      const message = (msg.error && msg.error.message) || msg.message || 'codex turn failed';
      opts.onEvent({ type: 'result', ok: false, text: '', sessionId });
      stderrTail = (stderrTail + '\n' + message).slice(-2000);
    }
  }

  child.stdout.on('data', (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line || line[0] !== '{') continue; // codex mixes plain-text notices into stdout
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      try { handleMessage(msg); } catch (e) { console.error('codex: event handling error:', e.message); }
    }
  });
  child.stderr.on('data', (c) => { stderrTail = (stderrTail + c).slice(-2000); });

  const timeout = setTimeout(() => { timedOut = true; kill(); }, TURN_TIMEOUT_MS);
  if (timeout.unref) timeout.unref();

  function kill() {
    if (killed) return;
    killed = true;
    try { child.kill('SIGTERM'); } catch { /* gone */ }
    const hardKill = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } }, 3000);
    if (hardKill.unref) hardKill.unref();
  }

  child.on('close', (code) => {
    clearTimeout(timeout);
    // codex ERROR-level log noise lands on stderr even on success — only
    // surface it when the run actually failed.
    opts.onExit({ code, killed, timedOut, sessionId, stderr: code !== 0 && !killed ? stderrTail : '' });
  });
  child.on('error', (e) => {
    clearTimeout(timeout);
    opts.onExit({ code: -1, killed, timedOut, sessionId, error: e.message });
  });

  return { kill, pid: child.pid };
}

module.exports = { startTurn, health };
