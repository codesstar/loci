#!/usr/bin/env node
'use strict';
// loci-automem — survey what Claude Code's built-in auto memory has accumulated
// across every project on this machine, and how stale each one is.
//
//   node scripts/loci-automem.js

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(os.homedir(), '.claude', 'projects');
const OUT = path.join(os.homedir(), '.loci', 'inspect', 'auto-memory.html');
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kb = (n) => n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
const days = (ms) => Math.floor((Date.now() - ms) / 86400000);

function survey() {
  const out = [];
  if (!fs.existsSync(ROOT)) return out;
  for (const dir of fs.readdirSync(ROOT)) {
    const mem = path.join(ROOT, dir, 'memory');
    if (!fs.existsSync(mem) || !fs.statSync(mem).isDirectory()) continue;
    const files = fs.readdirSync(mem).filter((f) => f.endsWith('.md'))
      .map((f) => {
        const p = path.join(mem, f);
        const st = fs.statSync(p);
        return { name: f, size: st.size, mtime: st.mtimeMs, body: fs.readFileSync(p, 'utf8') };
      });
    if (!files.length) continue;
    const index = files.find((f) => f.name === 'MEMORY.md');
    const topics = files.filter((f) => f.name !== 'MEMORY.md').sort((a, b) => b.mtime - a.mtime);
    // the file often states its own "last updated" date — compare it with reality
    const claimed = index && (index.body.match(/最后更新[:：]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/)
      || index.body.match(/last updated[:：]?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i));
    out.push({
      project: dir.replace(/^-Users-[^-]+-/, '').replace(/-/g, '/'),
      raw: dir,
      index, topics,
      total: files.reduce((n, f) => n + f.size, 0),
      newest: Math.max(...files.map((f) => f.mtime)),
      claimedDate: claimed ? claimed[1] : null,
    });
  }
  return out.sort((a, b) => b.newest - a.newest);
}

const projects = survey();
const totalBytes = projects.reduce((n, p) => n + p.total, 0);
const stale = projects.filter((p) => days(p.newest) > 60).length;

const heat = (d) => d <= 7 ? '#15803d' : d <= 30 ? '#ca8a04' : d <= 90 ? '#c2410c' : '#b91c1c';

const card = (p) => {
  const d = days(p.newest);
  const drift = p.claimedDate && p.index
    && p.claimedDate !== new Date(p.index.mtime).toISOString().slice(0, 10);
  return `<div class="proj">
  <div class="ph">
    <span class="dot" style="background:${heat(d)}"></span>
    <span class="pn">${esc(p.project)}</span>
    <span class="pm">${p.topics.length + (p.index ? 1 : 0)} 个文件 · ${kb(p.total)}</span>
    <span class="pd" style="color:${heat(d)}">${d} 天前</span>
  </div>
  ${drift ? `<div class="drift">文件里自称「最后更新 ${esc(p.claimedDate)}」，但实际改于
    ${new Date(p.index.mtime).toISOString().slice(0, 10)} —— <b>自述的时效性本身就是过期的</b></div>` : ''}
  ${p.index ? `<details><summary>MEMORY.md · ${kb(p.index.size)} · 每次会话都加载</summary>
    <pre><code>${esc(p.index.body.slice(0, 40000))}</code></pre></details>` : ''}
  ${p.topics.length ? `<details><summary>${p.topics.length} 个 topic 文件 · 按需加载，不进开场上下文</summary>
    <div class="tl">${p.topics.map((t) => `<div class="ti"><span>${esc(t.name)}</span>
      <i>${kb(t.size)} · ${days(t.mtime)} 天前</i></div>`).join('')}</div>
    ${p.topics.map((t) => `<details class="sub"><summary>${esc(t.name)}</summary>
      <pre><code>${esc(t.body.slice(0, 20000))}</code></pre></details>`).join('')}</details>` : ''}
</div>`;
};

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Claude auto memory 全景</title><style>
:root{--bg:#f7f7f5;--surface:#fff;--ink:#1a1a18;--muted:#6b6b66;--line:#e2e2dd;--on:#c2410c;--code:#f4f4f1;
--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#16161a;--surface:#1e1e23;--ink:#ececea;
--muted:#9b9b96;--line:#2e2e35;--on:#fb923c;--code:#242429}}
*{box-sizing:border-box;min-width:0}html,body{overflow-x:hidden}
body{margin:0;background:var(--bg);color:var(--ink);font:14.5px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
.wrap{max-width:1060px;margin:0 auto;padding:42px 16px 80px}
h1{font-size:25px;margin:0 0 6px}h2{font-size:17px;margin:38px 0 12px;padding-bottom:7px;
border-bottom:2px solid var(--on);display:inline-block}
.sub{color:var(--muted);font-size:13px;margin:0 0 20px}
.tot{font-family:var(--mono);font-size:12.5px;background:var(--surface);border:1px solid var(--line);
border-radius:9px;padding:14px 18px;margin:0 0 24px;line-height:2}
.tot b{color:var(--on)}
.proj{background:var(--surface);border:1px solid var(--line);border-radius:10px;margin:10px 0;overflow:hidden}
.ph{display:flex;align-items:center;gap:11px;padding:13px 16px}
.dot{width:8px;height:8px;border-radius:50%;flex:none}
.pn{font-weight:600;font-size:13.5px;font-family:var(--mono)}
.pm{font-size:12px;color:var(--muted);margin-left:auto;font-family:var(--mono)}
.pd{font-size:12px;font-family:var(--mono);font-weight:600;width:66px;text-align:right}
.drift{margin:0 16px 12px;padding:9px 13px;background:#fffbeb;border:1px solid #fde68a;border-radius:7px;
font-size:12.5px;color:#92400e}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .drift{background:#2a2214;border-color:#78350f;color:#fbbf24}}
details{border-top:1px solid var(--line)}
summary{padding:10px 16px;cursor:pointer;font-size:12.5px;list-style:none;color:var(--muted);
display:flex;align-items:center;gap:8px}
summary::-webkit-details-marker{display:none}
summary::before{content:"\\25B8";font-size:10px;transition:transform .15s}
details[open]>summary::before{transform:rotate(90deg)}
summary:hover{background:var(--code);color:var(--ink)}
details.sub{border-top:1px dashed var(--line);margin:0 16px}
pre{margin:0;padding:14px 16px;overflow:auto;background:var(--code);max-height:520px}
pre code{background:none;font-size:11.5px;line-height:1.7;white-space:pre-wrap;word-break:break-word;font-family:var(--mono)}
.tl{padding:6px 16px 12px;display:grid;gap:4px}
.ti{display:flex;font-size:12px;font-family:var(--mono);gap:12px;color:var(--muted)}
.ti span{color:var(--ink)}.ti i{margin-left:auto;font-style:normal}
.legend{display:flex;gap:16px;font-size:12px;color:var(--muted);margin:14px 0 0;flex-wrap:wrap}
.legend span{display:flex;align-items:center;gap:6px}
.legend i{width:8px;height:8px;border-radius:50%;display:inline-block}
.note{color:var(--muted);font-size:13px;margin:14px 0}
</style></head><body><div class="wrap">
<h1>Claude Code 自己攒的记忆</h1>
<p class="sub">这是 Claude 内置的 auto memory，跟 Loci 无关——它自己写、自己读，每个项目一份。</p>
<div class="tot">
共 <b>${projects.length}</b> 个项目有记忆 · 合计 <b>${kb(totalBytes)}</b> ·
其中 <b>${stale}</b> 个超过 60 天没更新<br>
只有每份 <b>MEMORY.md</b> 会进开场上下文（前 200 行 / 25 KB），topic 文件靠模型按需去读
<div class="legend">
<span><i style="background:#15803d"></i>7 天内</span>
<span><i style="background:#ca8a04"></i>30 天内</span>
<span><i style="background:#c2410c"></i>90 天内</span>
<span><i style="background:#b91c1c"></i>更久</span>
</div>
</div>
${projects.map(card).join('\n')}
<p class="note">页面由 <code>scripts/loci-automem.js</code> 生成，重跑即重新测量。</p>
</div></body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log('共 ' + projects.length + ' 个项目有 auto memory，合计 ' + kb(totalBytes));
for (const p of projects) {
  console.log('  ' + String(days(p.newest)).padStart(3) + ' 天前  '
    + kb(p.total).padStart(8) + '  '
    + String(p.topics.length + (p.index ? 1 : 0)).padStart(2) + ' 个  '
    + p.project.slice(0, 46)
    + (p.claimedDate ? '   [自称更新于 ' + p.claimedDate + ']' : ''));
}
console.log('\n已生成: ' + OUT);
