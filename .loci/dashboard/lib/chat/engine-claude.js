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
// files, the guarded CLI writers, read-only shell staples, read-only git)
// and nothing destructive. Models reach for `grep/cat/ls` before the Grep
// tool — refusing those degrades the assistant into asking the USER to look
// things up, so the common read-only commands are explicitly allowed. The
// guarded writers are allowed by relative AND absolute path (models often
// expand cwd). Deliberately NOT --dangerously-skip-permissions, no bare Bash.
function allowedTools(cwd) {
  return [
    'Read', 'Edit', 'Write', 'Glob', 'Grep',
    'Bash(node scripts/*)',
    `Bash(node ${cwd}/scripts/*)`,
    'Bash(date)', 'Bash(date:*)',
    'Bash(grep:*)', 'Bash(rg:*)', 'Bash(cat:*)', 'Bash(ls:*)',
    'Bash(head:*)', 'Bash(tail:*)', 'Bash(wc:*)', 'Bash(find:*)',
    'Bash(sed -n:*)', 'Bash(echo:*)', 'Bash(pwd)',
    'Bash(git status:*)', 'Bash(git log:*)', 'Bash(git diff:*)',
  ].join(' ');
}

const { chatContext } = require('./context');

const TURN_TIMEOUT_MS = 10 * 60 * 1000;

// Default is sonnet, and it's a MEASURED choice, not a "bigger is better"
// guess: on a mainland-China network the same 3-chore benchmark ran
// haiku 24.8/22.8/14.5s vs sonnet 11.4/5.1/4.0s vs opus 11.6/4.9/4.3s —
// haiku spends seconds visibly "thinking" before its first tool call, while
// sonnet/opus emit the command almost immediately, so the smarter model is
// also ~3x FASTER here (and more reliable about following the command
// cheatsheet). Override with LOCI_CHAT_MODEL=haiku to trade speed for cost.
const MODEL = process.env.LOCI_CHAT_MODEL || 'sonnet';

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

// Async on purpose: the server is single-threaded — a synchronous version
// check here would freeze every dashboard request for seconds. The result is
// cached once ok; init() warms it in the background at server start.
let cachedHealth = null;
function health() {
  if (cachedHealth && cachedHealth.ok) return Promise.resolve(cachedHealth);
  const bin = resolveBin();
  if (!bin) {
    return Promise.resolve({ ok: false, engine: 'claude', reason: '找不到 claude 命令 — 请先安装 Claude Code（https://claude.com/claude-code）' });
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = (result) => { if (!done) { done = true; resolve(result); } };
    let child;
    try {
      child = spawn(bin, ['--version'], { env: process.env });
    } catch (e) {
      return finish({ ok: false, engine: 'claude', bin, reason: 'claude 启动失败：' + e.message });
    }
    let out = '';
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* gone */ }
      finish({ ok: false, engine: 'claude', bin, reason: 'claude --version 超时' });
    }, 15000);
    if (timer.unref) timer.unref();
    child.stdout.on('data', (c) => { out += c; });
    child.on('error', (e) => { clearTimeout(timer); finish({ ok: false, engine: 'claude', bin, reason: e.message }); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        cachedHealth = { ok: true, engine: 'claude', bin, version: out.trim() };
        finish(cachedHealth);
      } else {
        finish({ ok: false, engine: 'claude', bin, reason: 'claude --version 退出码 ' + code });
      }
    });
  });
}

function preview(v, max = 200) {
  let s;
  if (typeof v === 'string') s = v;
  else { try { s = JSON.stringify(v); } catch { s = String(v); } }
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// Human-readable one-liner for a tool call — the chat user is not a
// developer, so show intent (Bash description, file name, search pattern)
// instead of the raw input JSON.
function toolPreview(name, input) {
  if (!input || typeof input !== 'object') return preview(input);
  switch (name) {
    case 'Bash': return preview(input.description || input.command || '');
    case 'Read': case 'Write': case 'Edit': case 'NotebookEdit':
      return preview(String(input.file_path || '').split('/').pop());
    case 'Grep': case 'Glob': return preview(input.pattern || '');
    case 'WebFetch': case 'WebSearch': return preview(input.url || input.query || '');
    default: return preview(input);
  }
}

// ─── Persistent process pool ────────────────────────────────────────────────
// One live `claude -p --input-format stream-json` per chat session: follow-up
// messages are written to stdin instead of paying a fresh CLI boot (3–6s)
// every turn. Idle processes are reaped; a killed/timed-out/reaped process is
// transparently respawned next turn with --resume, so context never breaks.

const IDLE_MS = 15 * 60 * 1000;
// A prewarmed process that never ran a turn is pure speculation — reap it much
// sooner than one that carries a live conversation (each claude process holds
// 100–200MB, so speculative spawns must not linger for 15 minutes).
const WARM_UNUSED_MS = 3 * 60 * 1000;
// Hard cap: each process is 100–200MB, and prewarm fires on every panel open /
// old-session click — without a cap a browsing user stacks up GBs of idle CLIs.
const MAX_POOL = 3;
const pool = new Map(); // procKey → entry

// Kick out the least-recently-used idle process. Returns true if one was freed.
function evictIdle() {
  let victim = null;
  for (const ent of pool.values()) {
    if (!ent.busy && (!victim || ent.lastUsed < victim.lastUsed)) victim = ent;
  }
  if (!victim) return false;
  try { victim.child.kill('SIGTERM'); } catch { /* gone */ }
  pool.delete(victim.key);
  return true;
}

const idleReaper = setInterval(() => {
  const now = Date.now();
  for (const [key, ent] of pool) {
    if (!ent.busy) {
      const limit = ent.everUsed ? IDLE_MS : WARM_UNUSED_MS;
      if (now - ent.lastUsed > limit) {
        try { ent.child.kill('SIGTERM'); } catch { /* gone */ }
        pool.delete(key);
      }
    } else if (now - ent.lastUsed > TURN_TIMEOUT_MS + 60 * 1000) {
      // Last-resort self-heal: a busy turn should have ended via the turn
      // timeout long ago. If the process ignored SIGTERM (hung native code,
      // stuck child command), it would otherwise stay "busy" forever — the
      // session permanently 409s and the reaper above skips it. Force-kill
      // and end the turn by hand so the session becomes usable again.
      try { ent.child.kill('SIGKILL'); } catch { /* gone */ }
      pool.delete(key);
      finishTurn(ent, { code: -1, killed: true, error: 'AI 进程无响应，已强制结束' });
    }
  }
}, 60 * 1000);
if (idleReaper.unref) idleReaper.unref();

process.on('exit', () => {
  for (const ent of pool.values()) {
    try { ent.child.kill('SIGKILL'); } catch { /* gone */ }
  }
});

function routeMessage(ent, msg) {
  if (msg.session_id) ent.sessionId = msg.session_id;
  const cur = ent.current;
  if (!cur) return; // init/noise outside a turn
  if (msg.type === 'stream_event' && msg.event) {
    const ev = msg.event;
    if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta' && ev.delta.text) {
      cur.onEvent({ type: 'assistant_delta', text: ev.delta.text });
    }
    return;
  }
  if (msg.type === 'assistant' && msg.message && Array.isArray(msg.message.content)) {
    for (const block of msg.message.content) {
      if (block.type === 'text' && block.text) {
        cur.onEvent({ type: 'assistant_text', text: block.text });
      } else if (block.type === 'tool_use') {
        cur.onEvent({ type: 'tool_use', name: block.name, inputPreview: toolPreview(block.name, block.input) });
      }
    }
    return;
  }
  if (msg.type === 'user' && msg.message && Array.isArray(msg.message.content)) {
    for (const block of msg.message.content) {
      if (block.type === 'tool_result') {
        cur.onEvent({ type: 'tool_result', ok: !block.is_error, preview: preview(block.content) });
      }
    }
    return;
  }
  if (msg.type === 'result') {
    const ok = msg.subtype === 'success';
    cur.onEvent({
      type: 'result',
      ok,
      text: typeof msg.result === 'string' ? msg.result : '',
      costUsd: msg.total_cost_usd,
      durationMs: msg.duration_ms,
      sessionId: ent.sessionId,
    });
    finishTurn(ent, { code: ok ? 0 : 1 });
  }
}

function finishTurn(ent, res) {
  const cur = ent.current;
  if (!cur) return;
  ent.current = null;
  ent.busy = false;
  ent.lastUsed = Date.now();
  clearTimeout(cur.timeout);
  cur.onExit({
    code: res.code,
    killed: !!res.killed,
    timedOut: !!cur.timedOut,
    sessionId: ent.sessionId,
    stderr: res.code !== 0 && !res.killed ? ent.stderrTail : '',
    error: res.error,
  });
}

function spawnEntry(bin, key, cwd, resumeSessionId) {
  const args = [
    '-p',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--verbose',
    '--permission-mode', 'acceptEdits',
    '--model', MODEL,
    // brain chores never touch MCP — without this the CLI boots every MCP
    // server from the user's global config (playwright & co.), adding many
    // seconds of dead time before the first token of a "加个任务" turn
    '--strict-mcp-config',
    // load only the BRAIN's own CLAUDE.md/settings: the user's global
    // ~/.claude/CLAUDE.md may point at a different brain path entirely
    // (measured: it sent the model ls-ing the wrong directory) and its extra
    // tokens slow every request on this already-slow network
    '--setting-sources', 'project',
    '--allowedTools', allowedTools(cwd),
    '--append-system-prompt', chatContext(cwd),
  ];
  if (resumeSessionId) args.push('--resume', resumeSessionId);

  const child = spawn(bin, args, { cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  const ent = {
    key, child,
    sessionId: resumeSessionId || null,
    busy: false, current: null,
    lastUsed: Date.now(),
    everUsed: false,
    buf: '', stderrTail: '',
  };
  child.stdin.on('error', () => { /* surfaced via close */ });
  // Without an explicit encoding each chunk is decoded independently — a
  // multi-byte UTF-8 char (every Chinese char) split across a chunk boundary
  // decodes to �. setEncoding makes Node buffer the partial char correctly.
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    ent.buf += chunk;
    let nl;
    while ((nl = ent.buf.indexOf('\n')) >= 0) {
      const line = ent.buf.slice(0, nl).trim();
      ent.buf = ent.buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; /* non-JSON noise */ }
      try { routeMessage(ent, msg); } catch (e) { console.error('chat: event handling error:', e.message); }
    }
  });
  child.stderr.on('data', (c) => { ent.stderrTail = (ent.stderrTail + c).slice(-2000); });
  child.on('close', (code) => {
    if (pool.get(key) === ent) pool.delete(key);
    // a mid-turn death (user stop, timeout, crash) must still end the turn
    finishTurn(ent, { code: code == null ? -1 : code, killed: ent.killedByUser || (ent.current && ent.current.timedOut) });
  });
  child.on('error', (e) => {
    if (pool.get(key) === ent) pool.delete(key);
    finishTurn(ent, { code: -1, error: e.message });
  });
  pool.set(key, ent);
  return ent;
}

/**
 * Pre-warm the process pool for a session: spawn the CLI in the background so
 * the user's FIRST message lands on an already-booted process instead of
 * paying spawn + init inside the visible turn. No-op if a live process for
 * this key already exists. Safe to call optimistically (panel open, session
 * create) — an unused warm process is reaped by the idle timer like any other.
 */
function prewarm(opts) {
  const bin = resolveBin();
  if (!bin || !opts || !opts.procKey || !opts.cwd) return;
  const ent = pool.get(opts.procKey);
  if (ent && ent.child.exitCode === null) return; // already live
  // Prewarm is speculative — never worth evicting a live process for, and
  // never worth exceeding the cap. The real turn spawns on demand anyway.
  if (pool.size >= MAX_POOL) return;
  try { spawnEntry(bin, opts.procKey, opts.cwd, opts.resumeSessionId || null); } catch { /* next turn spawns normally */ }
}

/**
 * Run one turn. Returns { kill(), pid }.
 * opts: { cwd, prompt, procKey, resumeSessionId, onEvent(ev), onExit({code, killed, timedOut, sessionId, error?, stderr?}) }
 */
function startTurn(opts) {
  const bin = resolveBin();
  if (!bin) {
    process.nextTick(() => opts.onExit({ code: -1, killed: false, timedOut: false, sessionId: opts.resumeSessionId || null, error: 'claude not found' }));
    return { kill() { /* nothing to kill */ }, pid: null };
  }

  const key = opts.procKey || 'session:' + (opts.resumeSessionId || Math.random().toString(36).slice(2));
  let ent = pool.get(key);
  if (ent && (ent.child.exitCode !== null || ent.busy)) ent = null; // dead or (shouldn't happen) mid-turn
  if (!ent) {
    // A real turn beats the cap: make room by evicting an idle process. If
    // every slot is mid-turn, spawn anyway — user work is never refused.
    if (pool.size >= MAX_POOL) evictIdle();
    ent = spawnEntry(bin, key, opts.cwd, opts.resumeSessionId);
  }

  ent.busy = true;
  ent.everUsed = true;
  ent.lastUsed = Date.now();
  ent.stderrTail = '';
  ent.killedByUser = false;
  ent.current = {
    onEvent: opts.onEvent,
    onExit: opts.onExit,
    timedOut: false,
    timeout: setTimeout(() => {
      if (ent.current) ent.current.timedOut = true;
      try { ent.child.kill('SIGTERM'); } catch { /* gone */ }
      // SIGTERM can be ignored by a hung process — without this the turn
      // never ends and the session stays busy forever.
      const hardKill = setTimeout(() => { try { ent.child.kill('SIGKILL'); } catch { /* gone */ } }, 3000);
      if (hardKill.unref) hardKill.unref();
    }, TURN_TIMEOUT_MS),
  };
  if (ent.current.timeout.unref) ent.current.timeout.unref();

  // synthetic turn_start: a reused process emits no init message
  opts.onEvent({ type: 'turn_start', sessionId: ent.sessionId });

  const payload = JSON.stringify({
    type: 'user',
    message: { role: 'user', content: [{ type: 'text', text: String(opts.prompt) }] },
  }) + '\n';
  try {
    ent.child.stdin.write(payload);
  } catch (e) {
    finishTurn(ent, { code: -1, error: '发送到 AI 进程失败：' + e.message });
  }

  return {
    kill() {
      ent.killedByUser = true;
      try { ent.child.kill('SIGTERM'); } catch { /* gone */ }
      const hardKill = setTimeout(() => { try { ent.child.kill('SIGKILL'); } catch { /* gone */ } }, 3000);
      if (hardKill.unref) hardKill.unref();
    },
    get pid() { return ent.child.pid; },
  };
}

module.exports = { startTurn, prewarm, health, allowedTools };
