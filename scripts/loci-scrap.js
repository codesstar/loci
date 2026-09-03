#!/usr/bin/env node
/**
 * loci-scrap.js — guarded writer for 碎片 (collected things): thoughts, links,
 * quotes, images, files. Same storage and rules as the dashboard, so an AI
 * saving from chat and a person pasting in the browser produce identical files.
 *
 * Usage:
 *   node scripts/loci-scrap.js add --text "随手想到的话 #标签" [--note "我的标注"] [--tags "a,b"]
 *   node scripts/loci-scrap.js add --url https://… [--url https://second …] [--title "…"] [--note "用户说的话"] [--tags "a,b"]   (several --url = one scrap)
 *   node scripts/loci-scrap.js add --file /abs/a.png [--file /abs/b.png …] [--note "…"] [--tags "a,b"]   (several --file = one scrap)
 *   node scripts/loci-scrap.js add --text "一句引用" --by "谁说的"          (→ 摘录)
 *   node scripts/loci-scrap.js update --id ref:… [--title …] [--note …] [--tags "a,b"] [--accept-all]
 *   node scripts/loci-scrap.js remove --id ref:…        (moves to archive/references/)
 *   node scripts/loci-scrap.js list [--kind link|idea|image|file|quote] [--q 关键词] [--tag 标签] [--limit 30]
 *   node scripts/loci-scrap.js enrich --id ref:…        (redo title fetch + AI tags)
 *   node scripts/loci-scrap.js migrate-inbox            (turn every inbox.md line into a file)
 *
 * Rules the AI should follow when saving for the user:
 *   - what the USER said about the item goes in --note (标注); the AI's own guess
 *     goes nowhere — the enrichment pass writes ai_tags/summary by itself
 *   - never ask before saving; never file into folders; one command per item
 *   - the command logs to the activity ledger itself (do not log a second line)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const LOCI_ROOT = path.resolve(__dirname, '..');
const scraps = require(path.join(LOCI_ROOT, '.loci', 'dashboard', 'lib', 'scraps.js'));
let store = null;
try { store = require(path.join(LOCI_ROOT, '.loci', 'dashboard', 'lib', 'store.js')); } catch { /* plain writes */ }
scraps.init({ LOCI_ROOT, store });

function usage() {
  console.log(fs.readFileSync(__filename, 'utf-8').split('\n').slice(2, 22).map(l => l.replace(/^ \* ?/, '')).join('\n'));
}
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const it = argv[i]; if (!it.startsWith('--')) continue;
    const eq = it.indexOf('=');
    let k, v;
    if (eq !== -1) { k = it.slice(2, eq); v = it.slice(eq + 1); }
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) { k = it.slice(2); v = argv[i + 1]; i++; }
    else { k = it.slice(2); v = true; }
    a[k] = a[k] === undefined ? v : [].concat(a[k], v);   // a repeated flag collects (--file a --file b)
  }
  return a;
}
function logActivity(category, line) {
  try {
    const now = new Date(); const pad = (n) => String(n).padStart(2, '0');
    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`; const day = `${month}-${pad(now.getDate())}`;
    const dir = path.join(LOCI_ROOT, '.loci', 'activity'); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, month + '.md');
    let text = ''; try { text = fs.readFileSync(file, 'utf-8'); } catch { /* new month */ }
    const entry = `- ${pad(now.getHours())}:${pad(now.getMinutes())} · ${category} · ${line}`;
    if (text.includes(`## ${day}`)) {
      const idx = text.indexOf(`## ${day}`); const rest = text.slice(idx); const nextHead = rest.indexOf('\n## ', 4);
      const at = nextHead === -1 ? text.length : idx + nextHead;
      text = text.slice(0, at).replace(/\n*$/, '\n') + entry + '\n' + text.slice(at).replace(/^\n*/, '\n');
    } else {
      text = (text.trim() ? text.replace(/\n*$/, '\n\n') : `# ${month} Activity\n\n`) + `## ${day}\n${entry}\n`;
    }
    fs.writeFileSync(file, text.replace(/\n{3,}/g, '\n\n'));
  } catch { /* the ledger must never break a save */ }
}
function fileArg(p) {
  const abs = path.resolve(String(p).replace(/^~(?=\/)/, process.env.HOME || ''));
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.heic': 'image/heic', '.pdf': 'application/pdf' }[ext] || 'application/octet-stream';
  return { name: path.basename(abs), type: mime, data: `data:${mime};base64,` + buf.toString('base64') };
}
function enrichInBackground(id) {
  const port = parseInt(process.env.PORT, 10) || 8765;
  const body = JSON.stringify({ id });
  const req = http.request({ host: '127.0.0.1', port, path: '/api/scraps/enrich', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 1500 }, (res) => {
    res.resume();
    if (res.statusCode !== 200) detach(id);
  });
  req.on('error', () => detach(id));
  req.on('timeout', () => { req.destroy(); detach(id); });
  req.end(body);
}
function detach(id) {
  try {
    const child = spawn(process.execPath, [__filename, 'enrich', '--id', id, '--quiet'], { detached: true, stdio: 'ignore', cwd: LOCI_ROOT, env: process.env });
    child.unref();
  } catch { /* enrichment is optional */ }
}
function label(it) { return it.title || it.text.slice(0, 30) || it.url || it.file || it.id; }
function kindZh(k) { return { idea: '文字', link: '链接', image: '图片', file: '文件', quote: '摘录' }[k] || k; }

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
try {
  if (!cmd || cmd === 'help' || cmd === '--help') { usage(); process.exit(0); }
  if (cmd === 'add') {
    // the file is written synchronously; the title fetch + AI pass never block the caller:
    // the running dashboard takes it, otherwise a detached child does it in the background
    const input = { text: args.text || '', url: [].concat(args.url || [])[0] || '', urls: [].concat(args.url || []).filter(Boolean), title: args.title || '', note: args.note || '', tags: args.tags || [], by: args.by || '', kind: args.kind || '', source: args.source || 'chat', enrich: false };
    if (args.file) input.files = [].concat(args.file).map(fileArg);
    if (!input.text && !input.url && !input.file) throw new Error('give --text, --url or --file');
    const it = scraps.add(input);
    logActivity('碎片', `收进一条${kindZh(it.kind)}：${label(it)}`);
    const wantEnrich = !args['no-enrich'] && (scraps.status().enabled || (it.kind === 'link' && !it.title));
    if (wantEnrich) enrichInBackground(it.id);
    console.log(JSON.stringify({ ok: true, id: it.id, kind: it.kind, title: it.title, path: it.path, enrich: wantEnrich ? 'background' : 'off' }, null, 2));
  } else if (cmd === 'update') {
    if (!args.id) throw new Error('--id required');
    const patch = {};
    for (const k of ['title', 'note', 'tags', 'text', 'url', 'by']) if (args[k] !== undefined) patch[k] = args[k];
    if (args.kind) patch.kind = args.kind;
    if (args['accept-all']) patch.acceptAll = true;
    if (args.accept) patch.acceptTag = args.accept;
    const it = scraps.update(args.id, patch);
    logActivity('碎片', `修改了碎片：${label(it)}`);
    console.log(JSON.stringify({ ok: true, id: it.id, tags: it.tags, aiTags: it.aiTags, note: it.note }, null, 2));
  } else if (cmd === 'remove') {
    if (!args.id) throw new Error('--id required');
    const it = scraps.get(args.id); const r = scraps.remove(args.id);
    logActivity('碎片', `删掉了碎片：${it ? label(it) : args.id}`);
    console.log(JSON.stringify(r, null, 2));
  } else if (cmd === 'list') {
    let items = scraps.list().items;
    if (args.kind) items = items.filter(i => i.kind === args.kind);
    if (args.q) { const q = String(args.q).toLowerCase(); items = items.filter(i => [i.title, i.text, i.note, i.summary, i.caption, i.url, ...i.tags, ...i.aiTags].join(' ').toLowerCase().includes(q)); }
    if (args.tag) { const t = String(args.tag).replace(/^#/, '').toLowerCase(); items = items.filter(i => [...i.tags, ...i.aiTags].some(x => x.toLowerCase() === t)); }
    const limit = parseInt(args.limit, 10) || 30;
    for (const i of items.slice(0, limit)) {
      console.log(`${(i.created || '').slice(0, 16).replace('T', ' ')} · ${kindZh(i.kind)} · ${label(i)}${i.url ? ' · ' + i.site : ''}${i.tags.length ? ' · #' + i.tags.join(' #') : ''}${i.aiTags.length ? ' · ✦' + i.aiTags.join(' ✦') : ''}${i.note ? ' · 标注：' + i.note : ''} · ${i.id}`);
    }
    if (items.length > limit) console.log(`… 还有 ${items.length - limit} 条（--limit 调大）`);
  } else if (cmd === 'enrich') {
    if (!args.id) throw new Error('--id required');
    scraps.enrichLater(args.id);   // title fetch always runs; the AI pass only when a claude CLI is available
    const wait = () => { const s = scraps.status(); if (s.queue.length || s.running) return setTimeout(wait, 500); const it = scraps.get(args.id); if (!args.quiet) console.log(JSON.stringify({ ok: true, ai: s.enabled ? 'on' : 'off', aiTags: it && it.aiTags, summary: it && it.summary, caption: it && it.caption, title: it && it.title }, null, 2)); };
    wait();
  } else if (cmd === 'migrate-inbox') {
    const r = scraps.migrateInbox();
    logActivity('碎片', `把 ${r.migrated} 条随手记整理成了碎片`);
    console.log(JSON.stringify(r));
  } else { usage(); process.exit(1); }
} catch (e) {
  console.error('loci-scrap: ' + e.message); process.exit(1);
}
