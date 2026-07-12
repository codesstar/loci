/**
 * lib/chat/engine-claude.js — headless Claude Code engine.
 *
 * One `claude -p` child process per conversation turn (stream-json output),
 * context carried across turns via --resume <session_id>. The process runs in
 * the brain directory, so the spawned agent picks up the brain's CLAUDE.md and
 * all Loci memory behaviors automatically.
 *
 * Normalized events emitted through onEvent:
 *   turn_start        {sessionId}
 *   assistant_delta   {text}                — streaming text fragment
 *   assistant_text    {text}                — one complete assistant text block
 *   tool_use          {name, inputPreview}
 *   tool_result       {ok, preview}
 *   result            {ok, text, costUsd, durationMs, sessionId}
 */

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Headless runs can't pop a permission prompt — anything not allowed here is
// refused. The list covers day-to-day brain management (read/write brain
// files, the guarded CLI writers, read-only git) and nothing destructive.
// Deliberately NOT --dangerously-skip-permissions, and no bare Bash.
const ALLOWED_TOOLS = [
  'Read', 'Edit', 'Write', 'Glob', 'Grep',
  'Bash(node scripts/*)',
  'Bash(date)', 'Bash(date:*)',
  'Bash(git status:*)', 'Bash(git log:*)', 'Bash(git diff:*)',
].join(' ');

const TURN_TIMEOUT_MS = 10 * 60 * 1000;

let cachedBin;
function resolveBin() {
  if (cachedBin !== undefined) return cachedBin;
  const candidates = [];
  try {
    const w = execFileSync('/usr/bin/which', ['claude'], { encoding: 'utf-8' }).trim();
    if (w) candidates.push(w);
  } catch { /* not on PATH (e.g. launchd) — try known install spots */ }
  const home = process.env.HOME || '';
  candidates.push(
    path.join(home, '.local', 'bin', 'claude'),
    path.join(home, '.claude', 'local', 'claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude'
  );
  cachedBin = null;
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); cachedBin = c; break; } catch { /* next */ }
  }
  return cachedBin;
}

let cachedHealth = null;
function health() {
  if (cachedHealth && cachedHealth.ok) return cachedHealth;
  const bin = resolveBin();
  if (!bin) {
    return { ok: false, engine: 'claude', reason: '找不到 claude 命令 — 请先安装 Claude Code（https://claude.com/claude-code）' };
  }
  try {
    const version = execFileSync(bin, ['--version'], { encoding: 'utf-8', timeout: 15000 }).trim();
    cachedHealth = { ok: true, engine: 'claude', bin, version };
  } catch (e) {
    cachedHealth = { ok: false, engine: 'claude', bin, reason: 'claude --version 执行失败：' + e.message };
  }
  return cachedHealth;
}

function preview(v, max = 200) {
  let s;
  if (typeof v === 'string') s = v;
  else { try { s = JSON.stringify(v); } catch { s = String(v); } }
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

/**
 * Run one turn. Returns { kill(reason), pid }.
 * opts: { cwd, prompt, resumeSessionId, onEvent(ev), onExit({code, killed, sessionId, error?, stderr?}) }
 */
function startTurn(opts) {
  const bin = resolveBin();
  if (!bin) {
    process.nextTick(() => opts.onExit({ code: -1, killed: false, sessionId: opts.resumeSessionId || null, error: 'claude not found' }));
    return { kill() { /* nothing to kill */ }, pid: null };
  }

  const args = [
    '-p',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--verbose',
    '--permission-mode', 'acceptEdits',
    '--allowedTools', ALLOWED_TOOLS,
  ];
  if (opts.resumeSessionId) args.push('--resume', opts.resumeSessionId);

  const child = spawn(bin, args, {
    cwd: opts.cwd,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.on('error', () => { /* child died before reading the prompt */ });
  child.stdin.write(String(opts.prompt));
  child.stdin.end();

  let buf = '';
  let stderrTail = '';
  let sessionId = opts.resumeSessionId || null;
  let killed = false;

  function handleMessage(msg) {
    if (msg.session_id) sessionId = msg.session_id;
    if (msg.type === 'system' && msg.subtype === 'init') {
      opts.onEvent({ type: 'turn_start', sessionId });
      return;
    }
    if (msg.type === 'stream_event' && msg.event) {
      const ev = msg.event;
      if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta' && ev.delta.text) {
        opts.onEvent({ type: 'assistant_delta', text: ev.delta.text });
      }
      return;
    }
    if (msg.type === 'assistant' && msg.message && Array.isArray(msg.message.content)) {
      for (const block of msg.message.content) {
        if (block.type === 'text' && block.text) {
          opts.onEvent({ type: 'assistant_text', text: block.text });
        } else if (block.type === 'tool_use') {
          opts.onEvent({ type: 'tool_use', name: block.name, inputPreview: preview(block.input) });
        }
      }
      return;
    }
    if (msg.type === 'user' && msg.message && Array.isArray(msg.message.content)) {
      for (const block of msg.message.content) {
        if (block.type === 'tool_result') {
          opts.onEvent({ type: 'tool_result', ok: !block.is_error, preview: preview(block.content) });
        }
      }
      return;
    }
    if (msg.type === 'result') {
      opts.onEvent({
        type: 'result',
        ok: msg.subtype === 'success',
        text: typeof msg.result === 'string' ? msg.result : '',
        costUsd: msg.total_cost_usd,
        durationMs: msg.duration_ms,
        sessionId,
      });
    }
  }

  child.stdout.on('data', (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; /* partial/no-JSON noise */ }
      try { handleMessage(msg); } catch (e) { console.error('chat: event handling error:', e.message); }
    }
  });
  child.stderr.on('data', (c) => { stderrTail = (stderrTail + c).slice(-2000); });

  const timeout = setTimeout(() => kill('turn timeout'), TURN_TIMEOUT_MS);
  if (timeout.unref) timeout.unref();

  function kill() {
    if (killed) return;
    killed = true;
    try { child.kill('SIGTERM'); } catch { /* already gone */ }
    const hardKill = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } }, 3000);
    if (hardKill.unref) hardKill.unref();
  }

  child.on('close', (code) => {
    clearTimeout(timeout);
    opts.onExit({ code, killed, sessionId, stderr: code !== 0 && !killed ? stderrTail : '' });
  });
  child.on('error', (e) => {
    clearTimeout(timeout);
    opts.onExit({ code: -1, killed, sessionId, error: e.message });
  });

  return { kill, pid: child.pid };
}

module.exports = { startTurn, health, ALLOWED_TOOLS };
