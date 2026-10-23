#!/usr/bin/env node
'use strict';
// loci-compare-harness — put Claude Code and Codex side by side: what each one
// actually sends to the model, broken into addressable fragments.
//
// Claude Code has no way to show this, so its data comes from a captured request
// (scripts/loci-capture.js). Codex ships `codex debug prompt-input`, so its data
// is official output. That asymmetry is itself one of the findings.
//
//   node scripts/loci-compare-harness.js [--claude <payload.json>] [--codex <prompt-input.json>]

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const B = (s) => Buffer.byteLength(typeof s === 'string' ? s : JSON.stringify(s || ''), 'utf8');
const kb = (n) => n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tok = (s) => { const t = String(s || ''); const cjk = (t.match(/[㐀-鿿]/g) || []).length;
  return Math.round(cjk + (t.length - cjk) / 4); };

// ── Claude Code: reconstruct fragments from a captured request body ──────────
function parseClaude(file) {
  const body = JSON.parse(fs.readFileSync(file, 'utf8')).body;
  const out = [];
  for (const [i, m] of (body.messages || []).entries()) {
    const text = typeof m.content === 'string' ? m.content : (m.content || []).map((c) => c.text || '').join('');
    // pull each <system-reminder> apart
    const chunks = [];
    const re = /<system-reminder>([\s\S]*?)<\/system-reminder>/g;
    let last = 0, mm;
    while ((mm = re.exec(text))) {
      if (mm.index > last && text.slice(last, mm.index).trim()) chunks.push(text.slice(last, mm.index));
      chunks.push(mm[1]); last = re.lastIndex;
    }
    if (last < text.length && text.slice(last).trim()) chunks.push(text.slice(last));
    for (const chunk of (chunks.length ? chunks : [text])) {
      // the CLAUDE.md bundle splits again, one entry per file
      if (/^\s*Codebase and user instructions/.test(chunk)) {
        const fr = /^Contents of (.+?) \(/gm; const marks = []; let x;
        while ((x = fr.exec(chunk))) marks.push({ at: x.index, p: x[1] });
        marks.forEach((mk, k) => {
          const end = k + 1 < marks.length ? marks[k + 1].at : chunk.length;
          out.push({ role: m.role, name: mk.p.replace(os.homedir(), '~'), body: chunk.slice(mk.at, end) });
        });
        continue;
      }
      const sk = chunk.indexOf('The following skills are available');
      const ag = chunk.indexOf('Available agent types');
      if (chunk.includes('SessionStart hook additional context') && (sk > 0 || ag > 0)) {
        const cut = Math.min(...[sk, ag].filter((n) => n > 0));
        out.push({ role: m.role, name: 'SessionStart 钩子输出', body: chunk.slice(0, cut) });
        if (ag > 0) out.push({ role: m.role, name: 'Agent 类型列表', body: chunk.slice(ag, sk > ag ? sk : chunk.length) });
        if (sk > 0) out.push({ role: m.role, name: 'Skills 列表', body: chunk.slice(sk) });
        continue;
      }
      const head = chunk.trim().slice(0, 60);
      const name = chunk.includes('userEmail') ? '会话上下文（邮箱 / git）'
        : chunk.includes('Attribution for git') ? 'Git 署名规则'
        : chunk.trim().length < 300 ? '你实际说的话' : esc(head);
      out.push({ role: m.role, name, body: chunk });
    }
  }
  const tools = (body.tools || []).reduce((n, t) => n + B(t), 0);
  const sys = (body.system || []).reduce((n, s) => n + B(s.text || ''), 0);
  return { fragments: out, tools, sys, model: body.model };
}

// ── Codex: official `codex debug prompt-input` output ────────────────────────
// Codex concatenates every AGENTS.md into ONE fragment and labels it with the
// project path only, so the global file's contribution is invisible. Split it
// back apart by locating each source file's real content inside the blob.
function splitAgentsBlob(text) {
  const sources = [
    { label: '全局 ~/.codex/AGENTS.md', file: path.join(os.homedir(), '.codex', 'AGENTS.md') },
    { label: '项目 AGENTS.md', file: path.join(process.cwd(), 'AGENTS.md') },
  ];
  const marks = [];
  for (const src of sources) {
    if (!fs.existsSync(src.file)) continue;
    const content = fs.readFileSync(src.file, 'utf8').trim();
    // anchor on a distinctive run of the file that survives concatenation
    for (const probe of [content.slice(0, 120), content.split('\n').filter((l) => l.trim().length > 30)[0] || '']) {
      if (!probe) continue;
      const at = text.indexOf(probe.trim());
      if (at >= 0) { marks.push({ at, label: src.label, bytes: Buffer.byteLength(content, 'utf8') }); break; }
    }
  }
  if (marks.length < 2) return null;
  marks.sort((a, b) => a.at - b.at);
  const parts = [];
  if (marks[0].at > 20) parts.push({ label: 'Codex 加的标题行', body: text.slice(0, marks[0].at) });
  marks.forEach((mk, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].at : text.length;
    parts.push({ label: mk.label, body: text.slice(mk.at, end) });
  });
  return parts;
}

function parseCodex(file) {
  const items = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = [];
  for (const it of items) {
    for (const c of (it.content || [])) {
      const t = c.text || '';
      if (/^#\s*AGENTS\.md instructions for/.test(t.trim())) {
        const parts = splitAgentsBlob(t);
        if (parts) {
          for (const pt of parts) {
            out.push({ role: it.role, name: pt.label, body: pt.body, merged: true });
          }
          continue;
        }
      }
      // fragments announce themselves with an XML-ish marker
      const mk = t.trim().match(/^<([a-z_ ]+)>/i) || t.trim().match(/^#\s*(AGENTS\.md[^\n]*)/i);
      const name = mk ? mk[1].trim() : t.trim().slice(0, 44).replace(/\s+/g, ' ');
      out.push({ role: it.role, name, body: t });
    }
  }
  return { fragments: out };
}

const claudeFile = flag('--claude')
  || execSync('ls -t ~/.loci/inspect/payload-*.json | head -1', { shell: '/bin/bash' }).toString().trim();
const codexFile = flag('--codex') || '/tmp/codex-prompt.json';
if (!fs.existsSync(codexFile)) {
  console.error('缺 Codex 数据。先跑：codex debug prompt-input "hi" > /tmp/codex-prompt.json');
  process.exit(1);
}
const C = parseClaude(claudeFile);
const X = parseCodex(codexFile);

const sum = (fs_) => fs_.reduce((n, f) => n + B(f.body), 0);
const cTotal = sum(C.fragments), xTotal = sum(X.fragments);
const maxAll = Math.max(1, ...C.fragments.map((f) => B(f.body)), ...X.fragments.map((f) => B(f.body)));

const column = (title, sub, frags, total, accent) => `
<div class="col" style="--accent:${accent}">
  <div class="ch"><b>${esc(title)}</b><span>${esc(sub)}</span></div>
  <div class="cnum">${kb(total)} · ~${tok(frags.map((f) => f.body).join(''))} tok · ${frags.length} 个片段</div>
  ${frags.map((f) => {
    const size = B(f.body);
    return `<details${f.merged ? ' class="merged"' : ''}><summary>
      <span class="rl ${f.role}">${esc(f.role)}</span>
      ${f.merged ? '<span class="mg">合并在同一片段内</span>' : ''}
      <span class="nm">${esc(f.name)}</span>
      <span class="bar"><span style="width:${(size / maxAll * 100).toFixed(1)}%"></span></span>
      <span class="sz">${kb(size)}</span></summary>
    <pre><code>${esc(f.body.slice(0, 80000))}${f.body.length > 80000 ? '\n… (截断)' : ''}</code></pre></details>`;
  }).join('')}
</div>`;

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>两个 harness 的上下文对照</title><style>
:root{--bg:#f7f7f5;--surface:#fff;--ink:#1a1a18;--muted:#6b6b66;--line:#e2e2dd;--code:#f4f4f1;
--claude:#c2410c;--codex:#2563eb;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#16161a;--surface:#1e1e23;
--ink:#ececea;--muted:#9b9b96;--line:#2e2e35;--code:#242429;--claude:#fb923c;--codex:#60a5fa}}
*{box-sizing:border-box;min-width:0}html,body{overflow-x:hidden}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
.wrap{max-width:1500px;margin:0 auto;padding:40px 16px 80px}
h1{font-size:25px;margin:0 0 6px}h2{font-size:17px;margin:34px 0 12px;padding-bottom:7px;
border-bottom:2px solid var(--claude);display:inline-block}
.sub{color:var(--muted);font-size:13px;margin:0 0 22px}
table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--line);
border-radius:10px;overflow:hidden;font-size:13.5px;margin:0 0 26px}
th,td{padding:11px 15px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top}
th{background:var(--code);font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)}
tr:last-child td{border-bottom:0}td:first-child{font-weight:600;white-space:nowrap}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
@media(max-width:1000px){.cols{grid-template-columns:1fr}}
.col{background:var(--surface);border:1px solid var(--line);border-top:3px solid var(--accent);
border-radius:10px;overflow:hidden}
.ch{padding:14px 16px 4px}.ch b{font-size:16px;color:var(--accent)}
.ch span{display:block;font-size:12px;color:var(--muted);margin-top:3px}
.cnum{padding:0 16px 12px;font-family:var(--mono);font-size:12px;color:var(--muted);
border-bottom:1px solid var(--line)}
details{border-bottom:1px solid var(--line)}details:last-child{border-bottom:0}
summary{padding:9px 14px;cursor:pointer;list-style:none;display:flex;align-items:center;gap:9px;font-size:12px}
summary::-webkit-details-marker{display:none}
summary:hover{background:var(--code)}
.rl{font-family:var(--mono);font-size:9.5px;padding:2px 6px;border-radius:4px;flex:none;
background:var(--code);color:var(--muted);text-transform:uppercase}
.rl.developer{background:var(--accent);color:#fff;opacity:.85}
.nm{flex:none;max-width:290px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.bar{flex:1;height:5px;background:var(--code);border-radius:3px;overflow:hidden;min-width:30px}
.bar span{display:block;height:100%;background:var(--accent);border-radius:3px}
.sz{font-family:var(--mono);font-size:11px;color:var(--muted);flex:none;width:62px;text-align:right}
.mg{font-size:9.5px;padding:2px 6px;border-radius:4px;flex:none;background:#fef3c7;color:#92400e;white-space:nowrap}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .mg{background:#422006;color:#fbbf24}}
details.merged{border-left:3px solid #f59e0b}
details.merged+details.merged{border-top:1px dashed var(--line)}
pre{margin:0;padding:13px 15px;overflow:auto;background:var(--code);border-top:1px solid var(--line);max-height:520px}
pre code{background:none;font-size:11px;line-height:1.7;white-space:pre-wrap;word-break:break-word;font-family:var(--mono)}
.note{color:var(--muted);font-size:12.5px;margin:12px 0 0;line-height:1.75}
.note b{color:var(--ink)}
</style></head><body><div class="wrap">

<h1>同一句「hi」，两个 harness 送给模型什么</h1>
<p class="sub">左边靠抓包反推（Claude Code 没有别的办法），右边是官方命令的输出——<b>这个不对称本身就是一条结论</b>。</p>

<h2>关键差异</h2>
<table>
<tr><th></th><th>Claude Code</th><th>Codex</th></tr>
<tr><td>怎么看到这些</td><td>❌ 无内置方式，得起代理抓包</td><td>✅ <code>codex debug prompt-input</code> 官方命令</td></tr>
<tr><td>消息部分</td><td>${kb(cTotal)}</td><td>${kb(xTotal)}</td></tr>
<tr><td>工具定义</td><td>${kb(C.tools)}（55 个，抓包可见）</td><td>该命令不输出</td></tr>
<tr><td>系统提示词</td><td>${kb(C.sys)}（独立 system 数组）</td><td>并入 developer 消息</td></tr>
<tr><td>分层</td><td>几乎全塞进 <code>role=user</code> 的一个 <code>&lt;system-reminder&gt;</code></td><td><b>按角色分</b>：系统级进 <code>developer</code>，指令文件进 <code>user</code></td></tr>
<tr><td>片段边界</td><td>无标记，只能靠字符串特征反推</td><td><b>每段独立 XML 标记</b>，内部还有 <code>content_kind</code> 类型</td></tr>
<tr><td>Loci 注入在哪</td><td>钩子输出 + 全局 CLAUDE.md</td><td>AGENTS.md 那一段里</td></tr>
<tr><td><b>多文件是否可分辨</b></td>
<td>✅ 每个文件单独一行 <code>Contents of &lt;路径&gt;</code>，来源清楚</td>
<td>❌ <b>全局 + 项目的 AGENTS.md 被拼成一整段</b>，标题只写项目路径，看不出边界<br>
<span style="color:var(--muted);font-size:12.5px">（右栏里橙色左边线的几条，是我按源文件内容还原出来的真实边界——Codex 自己没标）</span></td></tr>
</table>

<h2>逐片段对照</h2>
<div class="cols">
${column('Claude Code', path.basename(claudeFile) + (C.model ? ' · ' + C.model : ''), C.fragments, cTotal, 'var(--claude)')}
${column('Codex', 'codex debug prompt-input', X.fragments, xTotal, 'var(--codex)')}
</div>

<p class="note">
<b>为什么两边数字不能直接相减</b>：Claude 那份来自真实请求体，含 ${kb(C.tools)} 工具定义和 ${kb(C.sys)} 系统提示词；
Codex 那份是 <code>prompt-input</code> 的输出，只有 input 列表。上表只拿<b>消息部分</b>作比。<br>
<b>重跑</b>：<code>node scripts/loci-capture.js --keep</code> 抓 Claude，
<code>codex debug prompt-input "hi" &gt; /tmp/codex-prompt.json</code> 抓 Codex，再跑本脚本。
</p>

</div></body></html>`;

const out = path.join(os.homedir(), '.loci', 'inspect', 'harness-compare.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Claude Code  ' + kb(cTotal) + '  ' + C.fragments.length + ' 个片段  (另有 tools ' + kb(C.tools) + ' · system ' + kb(C.sys) + ')');
console.log('Codex        ' + kb(xTotal) + '  ' + X.fragments.length + ' 个片段');
console.log('\n已生成: ' + out);
