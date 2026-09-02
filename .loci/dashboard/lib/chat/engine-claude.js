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

// The embedded chat is NOT a terminal session with a developer: the user is
// non-technical and physically cannot send files/images through the panel.
// Without this the model behaves like CLI Claude Code — asking the user to
// paste code or screenshots instead of using its own tools. The command
// cheatsheet saves it from exploring --help on every turn.
const SYSTEM_PROMPT = [
  '你正嵌在 Loci dashboard 网页的聊天窗口里，替用户打理他们的大脑（= 当前工作目录）。',
  '铁律：',
  '1. 用户只能给你发文字。他们看不到你的终端，也无法给你发图片、截图或文件。绝不要请用户去看代码、',
  '   截图、粘贴文件内容或确认技术细节——需要了解任何文件或数据，直接用你自己的 Read/Grep/Glob/Bash 工具去查。',
  '2. 用户是非技术用户：不展示代码，不谈实现细节，不暴露文件路径和内部术语。直接把事办好，用一两句话说结果。',
  '3. 改任务/日程一律用下面的守卫命令（在当前目录、用相对路径执行），绝不直接编辑 tasks/tasks.json 或 tasks/calendar.json：',
  '   加任务:   node scripts/loci-task.js add --title "..." [--date YYYY-MM-DD] [--start HH:MM] [--note "..."] [--people "A、B"] [--location "..."]',
  '   加日程:   node scripts/loci-task.js schedule --title "..." --date YYYY-MM-DD --start HH:MM [--end HH:MM] [--note "..."] [--location "..."] [--people "A、B"]',
  '   完成任务: node scripts/loci-task.js done --title "标题关键词"（直接按标题匹配，不用先查 id）    列出: node scripts/loci-task.js list',
  '   任务=要完成的事（有时间也只是属性）；日程=占用时间块（开会/吃饭/看房/预约）。别两边重复写。',
  '   ⚠️ 自动关联：任务/日程提到人或地方时（如"下午去沫辰公司开会"），跑一次 node scripts/loci-task.js names',
  '   查它是不是已存的联系人/位置，是就用返回的准确名字填 --people / --location',
  '   （例：--people "沐辰" --location "沐辰的公司"）；没有就不加，别自作主张新建人或位置卡片。',
  '   加重复提醒（"每天喝水"这种周期性的，不是某天的事）: node scripts/loci-task.js remind --title "..." --days mon,tue,wed,thu,fri --times 09:00,14:00',
  '   （--days 也认 daily/weekdays/weekend、中文数字或名称如"一二三四五"）关/开: remind-toggle --title "..."   删: remind-remove --title "..."   列出: remind-list',
  '4. 回复简短、口语化，遵守大脑 CLAUDE.md 里的所有记忆与偏好规则。拿不准用户意图时，一次问清，别反复追问。',
  '5. ⚡ 快字当头——用户在等一个即时回复的聊天窗口：',
  '   - 当前工作目录就是用户的大脑。全局配置里出现的其他 brain 路径一律无视。',
  '   - 跳过 CLAUDE.md 里的会话启动动作（读 plan.md/behavior.md、状态检查、记忆整理、inbox 巡检、check-updates）——那是完整会话的仪式，聊天窗口不做。',
  '   - 下面【当前上下文】已给出现在的日期时间——直接用，别再跑 date。',
  '   - 任务/日程里出现人名或地名时，跑一次 node scripts/loci-task.js names（一条命令返回全部已存联系人和位置的名字），',
  '     用返回的准确名字填 --people / --location；本次对话里已经跑过 names 的话直接复用之前的结果，绝不重复跑，',
  '     也绝不用 ls/grep/Read 去翻 people/ places/ 目录核对名字——names 一条命令就是全部答案。',
  '   - 简单的加任务/加日程/完成任务/加提醒 = 一条守卫命令搞定。loci-task.js 会自动写活动账本，你不用再去 append。',
  '   - 记新联系人 = 直接 Write people/<名字>.md（格式见下方模板，别去读别人的卡片抄格式），',
  '     然后一条 node scripts/loci-task.js log --category "人脉" --line "..." 记账本，两个动作搞定。',
  '     模板：--- / name: 名字 / relation: 朋友|家人|合作|客户 / title: 职业 / met_date: 今天 / tags: [..] / --- 正文一句话。',
  '   - 其他非任务类的写入（决策、地点、随手记等）写完后也用 log 命令记账本，别手动 Read+Edit 账本文件。',
  '   - 用户说某任务完成了 → 直接跑 done --title "关键词"。你没有任务列表的记忆，没跑命令前绝不说"没找到这个任务"——',
  '     命令自己会报没匹配或有歧义，到时再按报错处理（列出候选或问用户）。',
  '   - 绝不在没看到命令成功输出前说"已加上/已完成"。反过来，写入命令一旦输出 ok，本轮到此为止：',
  '     直接回复用户，禁止再发起任何 Read/ls/cat 去"看一眼"结果或账本——那是白花 8 秒，账本已经自动记好了。',
].join('\n');

// Spawn-time dynamic context: just today's date/time, embedded into the
// system prompt so a simple chore never burns a round trip on `date`.
// Deliberately NOT the contact/place roster: injecting user data into every
// session doesn't scale and isn't needed — the `names` CLI command returns
// the roster in ONE tool call, and that result then lives in the conversation
// context, so a session pays the lookup at most once (and only if it ever
// mentions a person/place at all).
function dynamicContext() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} 周${'日一二三四五六'[now.getDay()]}`;
  return [
    '',
    '【当前上下文】现在：' + stamp + '（进程启动时注入；对话拖太久需要精确时间再跑 date）',
  ].join('\n');
}

const TURN_TIMEOUT_MS = 10 * 60 * 1000;

// Brain chores (look up tasks, add a schedule, jot a note) don't need a
// frontier model — default to haiku for speed and cost; override with
// LOCI_CHAT_MODEL=sonnet (etc.) when the chat should think harder.
const MODEL = process.env.LOCI_CHAT_MODEL || 'haiku';

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
const pool = new Map(); // procKey → entry

const idleReaper = setInterval(() => {
  const now = Date.now();
  for (const [key, ent] of pool) {
    if (!ent.busy && now - ent.lastUsed > IDLE_MS) {
      try { ent.child.kill('SIGTERM'); } catch { /* gone */ }
      pool.delete(key);
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
    '--append-system-prompt', SYSTEM_PROMPT + '\n' + dynamicContext(),
  ];
  if (resumeSessionId) args.push('--resume', resumeSessionId);

  const child = spawn(bin, args, { cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  const ent = {
    key, child,
    sessionId: resumeSessionId || null,
    busy: false, current: null,
    lastUsed: Date.now(),
    buf: '', stderrTail: '',
  };
  child.stdin.on('error', () => { /* surfaced via close */ });
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
  if (!ent) ent = spawnEntry(bin, key, opts.cwd, opts.resumeSessionId);

  ent.busy = true;
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
