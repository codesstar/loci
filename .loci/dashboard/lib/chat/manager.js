/**
 * lib/chat/manager.js — chat session registry + turn lifecycle.
 *
 * Sessions persist to .loci/dashboard/chat-sessions.json (instance data,
 * gitignored, never synced between machines) so the UI keeps its history
 * across server restarts; conversational context itself is resumed by the
 * engine (claude --resume). One active turn per session; child processes are
 * tracked globally and cleaned up on server exit.
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const engines = {
  claude: require('./engine-claude.js'),
  codex: require('./engine-codex.js'),
};

const MAX_TRANSCRIPT = 400; // entries kept per session (UI history, not context)

let st = null; // singleton, initialized on first use

function init(ctx) {
  if (st) return st;
  st = {
    file: path.join(ctx.SCRIPT_DIR, 'chat-sessions.json'),
    root: ctx.LOCI_ROOT,
    store: ctx.store,
    sessions: new Map(),   // id -> session
    subscribers: new Map(), // id -> Set<sse stream>
    turns: new Map(),       // id -> { kill, pid }
    saveTimer: null,
  };
  try {
    const parsed = JSON.parse(fs.readFileSync(st.file, 'utf-8'));
    for (const s of parsed.sessions || []) {
      s.running = false; // a restart orphans no turns — children die with us
      st.sessions.set(s.id, s);
    }
  } catch { /* first run */ }

  const reap = () => {
    for (const t of st.turns.values()) { try { t.kill(); } catch { /* gone */ } }
    try { persistNow(); } catch { /* best effort on the way out */ }
  };
  process.on('exit', reap);
  process.on('SIGINT', () => { reap(); process.exit(0); });
  process.on('SIGTERM', () => { reap(); process.exit(0); });
  return st;
}

function persistNow() {
  if (st.saveTimer) { clearTimeout(st.saveTimer); st.saveTimer = null; }
  const sessions = [...st.sessions.values()].map(({ running, ...rest }) => rest);
  try {
    st.store.atomicWriteSync(st.file, JSON.stringify({ sessions }) + '\n', 'utf-8');
  } catch (e) { console.error('chat: persist failed:', e.message); }
}

// Debounced full-file rewrite — every transcript entry triggers this, and an
// active turn emits events in bursts, so the window is deliberately wide
// (synchronous stringify+write of ALL sessions blocks the event loop).
// Turn end (onExit) and process exit call persistNow() so nothing is lost.
function persistSoon() {
  if (st.saveTimer) return;
  st.saveTimer = setTimeout(() => { st.saveTimer = null; persistNow(); }, 2500);
  if (st.saveTimer.unref) st.saveTimer.unref();
}

function broadcast(sessionId, event, payload) {
  const subs = st.subscribers.get(sessionId);
  if (!subs) return;
  for (const stream of [...subs]) {
    if (!stream.send(event, payload)) subs.delete(stream);
  }
}

function summary(s) {
  return {
    id: s.id,
    engine: s.engine,
    title: s.title,
    createdAt: s.createdAt,
    lastActive: s.lastActive,
    running: !!s.running,
    messages: s.transcript.length,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

function list(ctx) {
  init(ctx);
  return [...st.sessions.values()]
    .sort((a, b) => String(b.lastActive).localeCompare(String(a.lastActive)))
    .map(summary);
}

function create(ctx, engine) {
  init(ctx);
  const eng = engines[engine] ? engine : 'claude';
  const now = new Date().toISOString();
  const s = {
    id: 'chat_' + crypto.randomBytes(6).toString('hex'),
    engine: eng,
    title: '新对话',
    engineSessionId: null,
    createdAt: now,
    lastActive: now,
    transcript: [],
    running: false,
  };
  st.sessions.set(s.id, s);
  persistSoon();
  // No prewarm here: creating a session doesn't mean a message is coming
  // (mis-clicks, "new chat" spam), and the panel's stream subscription —
  // which always follows a real open — prewarms with full context anyway.
  return summary(s);
}

function remove(ctx, id) {
  init(ctx);
  stop(ctx, id);
  const existed = st.sessions.delete(id);
  st.subscribers.delete(id);
  persistSoon();
  return existed;
}

function history(ctx, id) {
  init(ctx);
  const s = st.sessions.get(id);
  if (!s) return null;
  return { ...summary(s), transcript: s.transcript };
}

function subscribe(ctx, id, stream) {
  init(ctx);
  const s = st.sessions.get(id);
  if (!s) return false;
  if (!st.subscribers.has(id)) st.subscribers.set(id, new Set());
  st.subscribers.get(id).add(stream);
  // panel (re)opened on this session → warm its CLI process (resuming prior
  // context) so the next message doesn't pay the spawn inside the turn
  const eng = engines[s.engine] || engines.claude;
  if (!s.running && typeof eng.prewarm === 'function') {
    eng.prewarm({ cwd: st.root, procKey: id, resumeSessionId: s.engineSessionId });
  }
  return true;
}

function unsubscribe(ctx, id, stream) {
  init(ctx);
  const subs = st.subscribers.get(id);
  if (!subs) return;
  subs.delete(stream);
  if (subs.size === 0) st.subscribers.delete(id);
}

function health(ctx, engine) {
  init(ctx);
  const eng = engines[engine || 'claude'];
  return eng ? eng.health() : Promise.resolve({ ok: false, reason: 'unknown engine' });
}

// Warm the engine health caches in the background at server start.
function warm() {
  for (const eng of Object.values(engines)) {
    eng.health().catch(() => { /* surfaces via /api/chat/health */ });
  }
}

function stop(ctx, id) {
  init(ctx);
  const turn = st.turns.get(id);
  if (!turn) return false;
  turn.kill();
  return true;
}

function send(ctx, id, message) {
  init(ctx);
  const s = st.sessions.get(id);
  if (!s) return { error: 'no such session' };
  if (s.running) return { error: 'busy', busy: true };
  const text = String(message || '').trim();
  if (!text) return { error: 'empty message' };

  const engine = engines[s.engine] || engines.claude;
  const now = new Date().toISOString();
  s.running = true;
  s.lastActive = now;
  if (s.transcript.length === 0) {
    s.title = text.length > 24 ? text.slice(0, 24) + '…' : text;
  }
  s.transcript.push({ role: 'user', text, ts: now });
  if (s.transcript.length > MAX_TRANSCRIPT) s.transcript.splice(0, s.transcript.length - MAX_TRANSCRIPT);
  persistSoon();
  broadcast(id, 'user', { text, ts: now });

  // Streaming deltas double as a safety net: if the engine never emits the
  // complete assistant message (seen in the wild), the accumulated delta text
  // is persisted at turn end so the reply survives a page reload.
  let deltaBuf = '';
  let persistedThisTurn = false;

  const turn = engine.startTurn({
    cwd: st.root,
    prompt: text,
    procKey: id, // persistent-process pool key (claude engine)
    resumeSessionId: s.engineSessionId,
    onEvent(ev) {
      const ts = new Date().toISOString();
      if (ev.sessionId) s.engineSessionId = ev.sessionId;
      switch (ev.type) {
        case 'turn_start':
          broadcast(id, 'turn_start', { ts });
          break;
        case 'assistant_delta':
          deltaBuf += ev.text || '';
          broadcast(id, 'assistant_delta', { text: ev.text });
          break;
        case 'assistant_text':
          deltaBuf = '';
          persistedThisTurn = true;
          s.transcript.push({ role: 'assistant', text: ev.text, ts });
          persistSoon();
          broadcast(id, 'assistant_text', { text: ev.text, ts });
          break;
        case 'tool_use':
          deltaBuf = ''; // deltas before a tool call were interim thinking-out-loud
          s.transcript.push({ role: 'tool', name: ev.name, preview: ev.inputPreview, ts });
          persistSoon();
          broadcast(id, 'tool_use', { name: ev.name, preview: ev.inputPreview, ts });
          break;
        case 'tool_result':
          broadcast(id, 'tool_result', { ok: ev.ok, preview: ev.preview, ts });
          break;
        case 'result':
          if (ev.sessionId) s.engineSessionId = ev.sessionId;
          // Safety net: text that streamed but never arrived as a complete
          // message (deltaBuf survives only until the next assistant_text /
          // tool_use, so anything left here was lost) — or a whole turn whose
          // only trace is the result summary.
          if (deltaBuf.trim() || (!persistedThisTurn && ev.ok && String(ev.text || '').trim())) {
            const recovered = deltaBuf.trim() || String(ev.text).trim();
            persistedThisTurn = true;
            deltaBuf = '';
            s.transcript.push({ role: 'assistant', text: recovered, ts });
            persistSoon();
            broadcast(id, 'assistant_text', { text: recovered, ts });
          }
          break;
      }
    },
    onExit(res) {
      s.running = false;
      s.lastActive = new Date().toISOString();
      if (res.sessionId) s.engineSessionId = res.sessionId;
      st.turns.delete(id);
      persistNow(); // turn boundary: flush whatever the debounce is holding
      if (res.killed && res.timedOut) {
        const msg = '这轮处理超过 10 分钟，已自动中止';
        s.transcript.push({ role: 'system', text: msg, ts: new Date().toISOString() });
        broadcast(id, 'error', { message: msg });
        broadcast(id, 'turn_done', { ok: false });
      } else if (res.killed) {
        broadcast(id, 'turn_done', { ok: false, stopped: true });
      } else if (res.code !== 0) {
        // keep the bubble humane — full stderr goes to the server log
        const raw = res.error || res.stderr || `exit code ${res.code}`;
        if (res.stderr) console.error(`chat: turn failed (session ${id}):`, res.stderr);
        const reason = String(raw).replace(/\s+/g, ' ').slice(0, 200);
        s.transcript.push({ role: 'system', text: '出错了：' + reason, ts: new Date().toISOString() });
        broadcast(id, 'error', { message: reason });
        broadcast(id, 'turn_done', { ok: false });
      } else {
        broadcast(id, 'turn_done', { ok: true });
      }
    },
  });
  st.turns.set(id, turn);
  return { ok: true, accepted: true };
}

module.exports = { list, create, remove, history, subscribe, unsubscribe, send, stop, health, warm };
