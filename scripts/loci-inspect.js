#!/usr/bin/env node
'use strict';
// loci-inspect — see exactly what goes into the model each turn, and what comes back.
//
// Claude Code writes a full transcript per session under ~/.claude/projects/.
// It records not just the conversation but every piece of injected context:
// the system prompt, each CLAUDE.md that was loaded, hook output, the skill
// listing, environment snapshot. This reads one and renders it as a page.
//
//   node scripts/loci-inspect.js                 newest session
//   node scripts/loci-inspect.js --list          list recent sessions
//   node scripts/loci-inspect.js --session <id>
//   node scripts/loci-inspect.js --out <path>

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : args[i + 1]; };

function sessions() {
  const out = [];
  if (!fs.existsSync(PROJECTS)) return out;
  for (const dir of fs.readdirSync(PROJECTS)) {
    const full = path.join(PROJECTS, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const file of fs.readdirSync(full)) {
      if (!file.endsWith('.jsonl')) continue;
      const p = path.join(full, file);
      const st = fs.statSync(p);
      out.push({ id: file.replace(/\.jsonl$/, ''), project: dir, path: p, mtime: st.mtimeMs, size: st.size });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

const B = (s) => Buffer.byteLength(String(s || ''), 'utf8');
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kb = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB'
  : n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
// Rough but consistent: CJK ~1 token/char, ASCII ~4 chars/token.
const tok = (s) => {
  const str = String(s || '');
  const cjk = (str.match(/[㐀-鿿豈-﫿]/g) || []).length;
  return Math.round(cjk + (str.length - cjk) / 4);
};

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((c) => {
      if (typeof c === 'string') return c;
      if (!c || typeof c !== 'object') return '';
      if (c.type === 'text') return c.text || '';
      if (c.type === 'thinking') return '[thinking] ' + (c.thinking || '');
      if (c.type === 'tool_use') return '[tool_use ' + (c.name || '?') + '] ' + JSON.stringify(c.input || {});
      if (c.type === 'tool_result') return '[tool_result] ' + textOf(c.content);
      return '';
    }).filter(Boolean).join('\n');
  }
  return '';
}

function parse(file) {
  const rows = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { /* skip */ }
  }

  const preamble = [];      // everything injected before/around the first prompt
  const turns = [];
  let turn = null;

  const pushPre = (label, body, meta) => preamble.push({ label, body, meta: meta || '' });

  for (const row of rows) {
    const a = row.attachment;
    if (row.type === 'attachment' && a && typeof a === 'object') {
      const t = a.type;
      if (t === 'prompt_snapshot') {
        pushPre('系统提示词', (a.systemPrompt || []).map(textOf).join('\n\n'), 'Claude Code 内置');
      } else if (t === 'instructions') {
        for (const f of a.files || []) {
          pushPre('CLAUDE.md · ' + (f.type || '') , f.content || '', f.path || '');
        }
      } else if (t === 'hook_additional_context') {
        pushPre('钩子注入 · ' + (a.hookEvent || a.hookName || ''), textOf(a.content), '由钩子生成');
      } else if (t === 'hook_success') {
        pushPre('钩子执行 · ' + (a.hookName || ''),
          'command: ' + (a.command || '') + '\nexit: ' + a.exitCode + '  (' + (a.durationMs || 0) + 'ms)\nstdout: ' + (a.stdout || ''),
          (a.durationMs || 0) + 'ms');
      } else if (t === 'skill_listing') {
        pushPre('Skills 列表', textOf(a.content), (a.skillCount || 0) + ' 个');
      } else if (t === 'environment') {
        pushPre('环境快照', JSON.stringify(a.snapshot || {}, null, 2), '');
      } else if (t === 'session_context') {
        pushPre('会话上下文', JSON.stringify(a.context || {}, null, 2), '');
      } else if (t === 'deferred_tools_record' || t === 'deferred_tools_delta') {
        pushPre('延迟工具', (a.addedLines || a.addedNames || []).join('\n'), '');
      } else if (t === 'mcp_instructions_delta') {
        pushPre('MCP 指令', (a.addedBlocks || []).map(textOf).join('\n'), '');
      } else if (t === 'agent_listing_delta') {
        pushPre('Agent 列表', (a.addedLines || []).join('\n'), '');
      }
      continue;
    }

    if (row.type === 'user' && row.message) {
      const text = textOf(row.message.content);
      const isToolResult = Array.isArray(row.message.content)
        && row.message.content.some((c) => c && c.type === 'tool_result');
      if (!isToolResult && text.trim()) {
        turn = { prompt: text, at: row.timestamp, out: [], tools: 0 };
        turns.push(turn);
      } else if (turn) {
        turn.out.push({ kind: 'tool_result', text });
      }
      continue;
    }

    if (row.type === 'assistant' && row.message && turn) {
      const content = row.message.content;
      if (Array.isArray(content)) {
        for (const c of content) {
          if (!c || typeof c !== 'object') continue;
          if (c.type === 'text' && c.text) turn.out.push({ kind: 'text', text: c.text });
          else if (c.type === 'thinking' && c.thinking) turn.out.push({ kind: 'thinking', text: c.thinking });
          else if (c.type === 'tool_use') { turn.tools += 1; turn.out.push({ kind: 'tool', name: c.name, text: JSON.stringify(c.input || {}, null, 1) }); }
        }
      }
      if (row.message.usage) turn.usage = row.message.usage;
      continue;
    }

    if (row.type === 'system' && row.subtype === 'turn_duration' && turn) {
      turn.durationMs = row.durationMs || row.duration || null;
    }
  }
  return { preamble, turns };
}

// ── render ──────────────────────────────────────────────────────────────────
function render(meta, data) {
  const preTotal = data.preamble.reduce((n, p) => n + B(p.body), 0);
  const maxPre = Math.max(1, ...data.preamble.map((p) => B(p.body)));

  const preRows = data.preamble.map((p, i) => {
    const size = B(p.body);
    const pct = (size * 100 / preTotal).toFixed(1);
    return `<details class="blk">
      <summary><span class="nm">${esc(p.label)}</span>
        <span class="bar"><span style="width:${(size / maxPre * 100).toFixed(1)}%"></span></span>
        <span class="sz">${kb(size)} · ${pct}% · ~${tok(p.body)} tok</span></summary>
      ${p.meta ? `<div class="meta">${esc(p.meta)}</div>` : ''}
      <pre><code>${esc(p.body.slice(0, 60000))}${p.body.length > 60000 ? '\n… (截断)' : ''}</code></pre>
    </details>`;
  }).join('\n');

  const turnRows = data.turns.map((t, i) => {
    const outText = t.out.filter(o => o.kind === 'text').map(o => o.text).join('\n\n');
    const thinking = t.out.filter(o => o.kind === 'thinking').map(o => o.text).join('\n\n');
    const tools = t.out.filter(o => o.kind === 'tool');
    const u = t.usage || {};
    return `<div class="turn">
      <div class="turn-h"><span class="idx">#${i + 1}</span>
        <span class="tm">${t.at ? esc(String(t.at).slice(11, 19)) : ''}</span>
        <span class="stat">输入 ~${tok(t.prompt)} tok · 工具 ${t.tools} 次${
          u.input_tokens ? ` · 实际 in ${u.input_tokens}${u.cache_read_input_tokens ? ' (缓存 ' + u.cache_read_input_tokens + ')' : ''} / out ${u.output_tokens || 0}` : ''}</span></div>
      <details class="side in" open><summary>用户输入 · ${kb(B(t.prompt))}</summary><pre><code>${esc(t.prompt.slice(0, 8000))}</code></pre></details>
      ${thinking ? `<details class="side th"><summary>思考 · ${kb(B(thinking))}</summary><pre><code>${esc(thinking.slice(0, 12000))}</code></pre></details>` : ''}
      ${tools.length ? `<details class="side tl"><summary>工具调用 ${tools.length} 次</summary><pre><code>${esc(tools.map(x => '▸ ' + x.name + '\n' + x.text).join('\n\n').slice(0, 14000))}</code></pre></details>` : ''}
      ${outText ? `<details class="side out" open><summary>模型回复 · ${kb(B(outText))}</summary><pre><code>${esc(outText.slice(0, 14000))}</code></pre></details>` : ''}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>会话透视 · ${esc(meta.id.slice(0,8))}</title><style>
:root{--bg:#f7f7f5;--surface:#fff;--ink:#1a1a18;--muted:#6b6b66;--line:#e2e2dd;--on:#c2410c;
--on-bg:#fff4ed;--code:#f4f4f1;--in:#2563eb;--out:#15803d;--th:#7c3aed;--tl:#b45309;
--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#16161a;--surface:#1e1e23;
--ink:#ececea;--muted:#9b9b96;--line:#2e2e35;--on:#fb923c;--on-bg:#2a1d15;--code:#242429;
--in:#60a5fa;--out:#4ade80;--th:#a78bfa;--tl:#fbbf24}}
*{box-sizing:border-box;min-width:0}html,body{overflow-x:hidden}
body{margin:0;background:var(--bg);color:var(--ink);font:14.5px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:40px 16px 80px}
h1{font-size:25px;margin:0 0 6px}h2{font-size:18px;margin:44px 0 12px;padding-bottom:8px;
border-bottom:2px solid var(--on);display:inline-block}
.sub{color:var(--muted);font-size:13px;font-family:var(--mono);margin:0 0 8px}
.tot{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 18px}
.tot span{font-family:var(--mono);font-size:11.5px;background:var(--surface);border:1px solid var(--line);
border-radius:20px;padding:5px 13px;color:var(--muted)}.tot b{color:var(--on)}
details{background:var(--surface);border:1px solid var(--line);border-radius:9px;margin:8px 0;overflow:hidden}
summary{padding:11px 16px;cursor:pointer;font-size:13px;list-style:none;display:flex;
align-items:center;gap:12px;user-select:none}
summary::-webkit-details-marker{display:none}
summary::before{content:"\\25B8";color:var(--muted);font-size:10px;transition:transform .15s;flex:none}
details[open]>summary::before{transform:rotate(90deg)}
summary:hover{background:var(--code)}
.nm{font-weight:600;flex:none;min-width:190px}
.bar{flex:1;height:5px;background:var(--code);border-radius:3px;overflow:hidden;min-width:60px}
.bar span{display:block;height:100%;background:var(--on);border-radius:3px}
.sz{font-family:var(--mono);font-size:11.5px;color:var(--muted);flex:none}
.meta{padding:8px 16px;font-family:var(--mono);font-size:11.5px;color:var(--muted);
border-top:1px solid var(--line);background:var(--code)}
pre{margin:0;padding:14px 16px;overflow:auto;background:var(--code);border-top:1px solid var(--line);max-height:560px}
pre code{background:none;padding:0;font-size:11.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word;font-family:var(--mono)}
.turn{background:var(--surface);border:1px solid var(--line);border-radius:11px;margin:14px 0;padding:12px 14px}
.turn-h{display:flex;align-items:center;gap:12px;margin-bottom:8px;flex-wrap:wrap}
.idx{font-family:var(--mono);font-weight:700;color:var(--on);font-size:14px}
.tm{font-family:var(--mono);font-size:11.5px;color:var(--muted)}
.stat{font-family:var(--mono);font-size:11.5px;color:var(--muted);margin-left:auto}
.side{margin:6px 0;border-left:3px solid var(--line)}
.side.in{border-left-color:var(--in)}.side.out{border-left-color:var(--out)}
.side.th{border-left-color:var(--th)}.side.tl{border-left-color:var(--tl)}
.note{color:var(--muted);font-size:13px;margin:10px 0 0}
</style></head><body><div class="wrap">
<h1>会话透视</h1>
<p class="sub">${esc(meta.project)} · ${esc(meta.id)}</p>
<div class="tot">
  <span>轮数 <b>${data.turns.length}</b></span>
  <span>开场注入 <b>${kb(preTotal)}</b> ≈ <b>${tok(data.preamble.map(p=>p.body).join(''))}</b> tok</span>
  <span>其中 ${data.preamble.length} 个来源</span>
  <span>文件 ${kb(meta.size)}</span>
</div>

<h2>一、模型看到你第一句话之前，上下文里已经有这些</h2>
<p class="note">按体积排序。这些是<b>每一轮都在</b>的固定成本。</p>
${preRows || '<p class="note">（这个会话没有记录开场注入）</p>'}

<h2>二、逐轮输入 / 输出</h2>
${turnRows || '<p class="note">（没有解析到对话轮次）</p>'}

</div></body></html>`;
}


// ── payload mode ────────────────────────────────────────────────────────────
// Renders a real request body captured by loci-capture.js — the exact bytes
// that went to the model, including the tool definitions no transcript shows.
function splitReminders(text) {
  const out = [];
  const re = /<system-reminder>([\s\S]*?)<\/system-reminder>/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last && text.slice(last, m.index).trim()) out.push(['用户实际输入', text.slice(last, m.index)]);
    out.push(['system-reminder', m[1]]);
    last = re.lastIndex;
  }
  if (last < text.length && text.slice(last).trim()) out.push(['用户实际输入', text.slice(last)]);
  return out.length ? out : [['内容', text]];
}


// A single message often carries several unrelated blocks glued together
// (hook output, then the agent list, then the skill catalogue). Split them so
// each is measured on its own.
const LANDMARKS = [
  ['Loci 钩子注入', 'SessionStart hook additional context:'],
  ['Loci 钩子注入', '[Loci] Lightweight startup map'],
  ['Agent 类型列表', 'Available agent types for the Agent tool'],
  ['Skills 列表', 'The following skills are available'],
  ['延迟工具列表', 'The following deferred tools'],
  ['MCP 服务器说明', 'MCP Server Instructions'],
  ['已连接的 MCP', 'The following MCP servers are configured'],
];

function splitLandmarks(text) {
  // The CLAUDE.md bundle has its own structure: one "Contents of <path>:"
  // header per file. Split on those instead of the generic landmarks — the
  // rule text itself quotes landmark phrases and would false-positive.
  if (/^\s*Codebase and user instructions are shown below/.test(text)) {
    const re = /^Contents of (.+?) \(([^)]*)\):$/gm;
    const marks = [];
    let m;
    while ((m = re.exec(text))) marks.push({ at: m.index, path: m[1], kind: m[2] });
    if (!marks.length) return null;
    const out = [];
    if (marks[0].at > 40) out.push(['说明头', text.slice(0, marks[0].at)]);
    marks.forEach((mk, i) => {
      const end = i + 1 < marks.length ? marks[i + 1].at : text.length;
      const short = mk.path.replace(process.env.HOME || '~', '~');
      out.push(['CLAUDE.md · ' + short, text.slice(mk.at, end)]);
    });
    return out;
  }

  const hits = [];
  for (const [name, needle] of LANDMARKS) {
    // require the phrase to start a line, so quoted mentions inside rule text
    // do not masquerade as a section boundary
    const at = text.indexOf('\n' + needle) >= 0 ? text.indexOf('\n' + needle) + 1
      : (text.startsWith(needle) ? 0 : -1);
    if (at >= 0) hits.push({ name, at });
  }
  if (!hits.length) return null;
  hits.sort((a, b) => a.at - b.at);
  // drop duplicates that resolve to the same region
  const kept = hits.filter((h, i) => i === 0 || h.at - hits[i - 1].at > 40);
  const out = [];
  if (kept[0].at > 40) out.push(['开头', text.slice(0, kept[0].at)]);
  kept.forEach((h, i) => {
    const end = i + 1 < kept.length ? kept[i + 1].at : text.length;
    out.push([h.name, text.slice(h.at, end)]);
  });
  return out;
}

function label(body) {
  const head = body.trim().slice(0, 120);
  if (head.includes('Codebase and user instructions')) return 'CLAUDE.md（全局 + 项目，合并注入）';
  if (head.includes('SessionStart hook additional context')) return 'SessionStart 钩子输出 + 附带内容';
  if (head.includes('userEmail')) return '会话上下文（邮箱 / git 状态）';
  if (head.includes('Attribution for git commits')) return 'Git 署名规则';
  if (head.includes('The following skills')) return 'Skills 列表';
  return null;
}

function renderPayload(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const b = d.body;
  const total = B(JSON.stringify(b));
  const rows = [];

  for (const [i, s] of (b.system || []).entries()) {
    rows.push({ group: 'system', name: 'system[' + i + ']' + (s.cache_control ? ' · 缓存' : ''), body: s.text || '' });
  }
  for (const [i, m] of (b.messages || []).entries()) {
    const text = typeof m.content === 'string' ? m.content : (m.content || []).map((c) => c.text || '').join('');
    for (const [kind, body] of splitReminders(text)) {
      const pieces = splitLandmarks(body);
      if (pieces && pieces.length > 1) {
        for (const [pname, pbody] of pieces) {
          rows.push({ group: 'messages', name: 'messages[' + i + '] · ' + m.role + ' · ' + pname, body: pbody });
        }
      } else {
        rows.push({ group: 'messages', name: 'messages[' + i + '] · ' + m.role + ' · ' + (label(body) || kind), body });
      }
    }
  }
  const toolsSorted = [...(b.tools || [])].sort((x, y) => B(JSON.stringify(y)) - B(JSON.stringify(x)));
  for (const t of toolsSorted) {
    rows.push({ group: 'tools', name: 'tool · ' + t.name, body: JSON.stringify(t, null, 1) });
  }

  const groups = { system: '系统提示词', messages: '消息（CLAUDE.md / 钩子 / 你说的话都在这里）', tools: '工具定义' };
  const gTotal = {};
  for (const r of rows) gTotal[r.group] = (gTotal[r.group] || 0) + B(r.body);
  const maxRow = Math.max(1, ...rows.map((r) => B(r.body)));

  const section = (g) => {
    const list = rows.filter((r) => r.group === g);
    if (!list.length) return '';
    return '<h2>' + esc(groups[g]) + ' · ' + kb(gTotal[g]) + ' · ' + (gTotal[g] * 100 / total).toFixed(1) + '%</h2>'
      + list.map((r) => {
        const size = B(r.body);
        return '<details class="blk"><summary><span class="nm">' + esc(r.name) + '</span>'
          + '<span class="bar"><span style="width:' + (size / maxRow * 100).toFixed(1) + '%"></span></span>'
          + '<span class="sz">' + kb(size) + ' · ' + (size * 100 / total).toFixed(1) + '% · ~' + tok(r.body) + ' tok</span></summary>'
          + '<pre><code>' + esc(r.body.slice(0, 120000)) + (r.body.length > 120000 ? '\n… (截断)' : '') + '</code></pre></details>';
      }).join('\n');
  };

  const bars = Object.keys(groups).filter((g) => gTotal[g]).map((g) =>
    '<div class="gr"><span>' + esc(groups[g].split('（')[0]) + '</span>'
    + '<span class="bar"><span style="width:' + (gTotal[g] * 100 / total).toFixed(1) + '%"></span></span>'
    + '<b>' + kb(gTotal[g]) + '</b><i>' + (gTotal[g] * 100 / total).toFixed(1) + '%</i></div>').join('');

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>真实请求体</title><style>
:root{--bg:#f7f7f5;--surface:#fff;--ink:#1a1a18;--muted:#6b6b66;--line:#e2e2dd;--on:#c2410c;--code:#f4f4f1;
--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#16161a;--surface:#1e1e23;--ink:#ececea;
--muted:#9b9b96;--line:#2e2e35;--on:#fb923c;--code:#242429}}
*{box-sizing:border-box;min-width:0}html,body{overflow-x:hidden}
body{margin:0;background:var(--bg);color:var(--ink);font:14.5px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:40px 16px 80px}
h1{font-size:25px;margin:0 0 6px}h2{font-size:17px;margin:38px 0 10px;padding-bottom:7px;
border-bottom:2px solid var(--on);display:inline-block}
.sub{color:var(--muted);font-size:12.5px;font-family:var(--mono);margin:0 0 20px}
.gr{display:flex;align-items:center;gap:12px;margin:7px 0;font-size:13px}
.gr>span:first-child{width:120px;flex:none;color:var(--muted)}
.gr b{font-family:var(--mono);font-size:12px;width:76px;text-align:right}
.gr i{font-family:var(--mono);font-size:12px;color:var(--on);font-style:normal;width:56px;text-align:right}
.bar{flex:1;height:8px;background:var(--code);border-radius:4px;overflow:hidden;min-width:50px}
.bar span{display:block;height:100%;background:var(--on);border-radius:4px}
details{background:var(--surface);border:1px solid var(--line);border-radius:9px;margin:7px 0;overflow:hidden}
summary{padding:10px 15px;cursor:pointer;font-size:12.5px;list-style:none;display:flex;align-items:center;gap:12px}
summary::-webkit-details-marker{display:none}
summary::before{content:"\\25B8";color:var(--muted);font-size:10px;transition:transform .15s;flex:none}
details[open]>summary::before{transform:rotate(90deg)}
summary:hover{background:var(--code)}
.nm{font-weight:600;flex:none;min-width:290px}
.sz{font-family:var(--mono);font-size:11px;color:var(--muted);flex:none}
pre{margin:0;padding:14px 16px;overflow:auto;background:var(--code);border-top:1px solid var(--line);max-height:600px}
pre code{background:none;font-size:11.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word;font-family:var(--mono)}
.tot{font-family:var(--mono);font-size:12px;background:var(--surface);border:1px solid var(--line);
border-radius:9px;padding:14px 18px;margin:16px 0 26px}
</style></head><body><div class="wrap">
<h1>真正发给模型的请求体</h1>
<p class="sub">${esc(path.basename(file))} · ${esc(b.model)} · 抓取于 ${esc(d.capturedAt || '')}</p>
<div class="tot">合计 <b style="color:var(--on)">${kb(total)}</b> ≈ ${tok(JSON.stringify(b))} tokens　|　
tools ${(b.tools || []).length} 个　|　messages ${(b.messages || []).length} 条${bars}</div>
${section('messages')}
${section('tools')}
${section('system')}
</div></body></html>`;
}

// ── main ────────────────────────────────────────────────────────────────────
const payloadFile = flag('--payload');
if (payloadFile || args.includes('--payload-latest')) {
  const f = payloadFile || require('child_process')
    .execSync('ls -t ~/.loci/inspect/payload-*.json | head -1', { shell: '/bin/bash' }).toString().trim();
  const outDir2 = path.join(os.homedir(), '.loci', 'inspect');
  const out2 = flag('--out') || path.join(outDir2, path.basename(f).replace(/\.json$/, '.html'));
  fs.writeFileSync(out2, renderPayload(f));
  console.log('已生成:', out2);
  process.exit(0);
}

const all = sessions();
if (args.includes('--list')) {
  console.log('最近的会话：');
  for (const s of all.slice(0, 20)) {
    console.log('  ' + new Date(s.mtime).toISOString().slice(0, 16).replace('T', ' ')
      + '  ' + s.id.slice(0, 8)
      + '  ' + kb(s.size).padStart(9)
      + '  ' + s.project.slice(0, 62));
  }
  process.exit(0);
}

const wanted = flag('--session');
const target = wanted ? all.find((s) => s.id.startsWith(wanted)) : all[0];
if (!target) { console.error('没找到会话' + (wanted ? ': ' + wanted : '')); process.exit(1); }

const data = parse(target.path);
const outDir = path.join(os.homedir(), '.loci', 'inspect');
fs.mkdirSync(outDir, { recursive: true });
const out = flag('--out') || path.join(outDir, target.id + '.html');
fs.writeFileSync(out, render(target, data));

const preTotal = data.preamble.reduce((n, p) => n + B(p.body), 0);
console.log('会话   ', target.id);
console.log('项目   ', target.project);
console.log('轮数   ', data.turns.length);
console.log('开场注入', kb(preTotal), '≈', tok(data.preamble.map(p => p.body).join('')), 'tokens，来自', data.preamble.length, '个来源：');
for (const p of [...data.preamble].sort((a, b) => B(b.body) - B(a.body))) {
  console.log('   ' + p.label.slice(0, 34).padEnd(34)
    + kb(B(p.body)).padStart(10)
    + (B(p.body) * 100 / preTotal).toFixed(1).padStart(7) + '%');
}
console.log('\n已生成:', out);
