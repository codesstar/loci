/**
 * lib/scraps.js — 碎片 (scraps): everything the user *collected* rather than
 * wrote. A thought, a link, a quote, a screenshot, a PDF. (Research write-ups are
 * notes, not scraps — they live in notes/ and show in the notes tree.)
 *
 * Storage (files are the truth, no database):
 *   references/<YYYY-MM-DD>-<slug>.md   one item = one markdown file with frontmatter
 *   references/files/<stamp>-<name>     binaries (images, PDFs) referenced by `file:`
 *   inbox.md                            legacy bullet lines are surfaced as read-mostly
 *                                       scraps and migrate into files when first edited
 *
 * Frontmatter written by this module (all optional except type/created):
 *   type      idea | link | image | file | quote
 *   title / url / site / file / created (ISO) / date (YYYY-MM-DD) / source
 *   tags      the user's own tags — authoritative
 *   ai_tags   suggestions from the enrichment pass; accepting moves them into tags
 *   summary   one line from the AI, for search only
 *   caption   one line describing an image (AI) — images are unsearchable without it
 *   note      标注 — only ever the user's own words
 *   title_pending  true while a link's title could not be fetched yet
 *
 * Enrichment is best-effort and asynchronous: the card exists the moment it is
 * saved; title fetch and AI tags fill in seconds later (or never — nothing here
 * can block or lose a capture). Zero npm dependencies.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const zlib = require('zlib');
const { spawn, execFileSync } = require('child_process');

let ctx = null; // { LOCI_ROOT, store, readMdFile?, notifyReload? }
function init(c) { ctx = Object.assign({}, c); return ctx; }
const root = () => ctx.LOCI_ROOT;
const refsDir = () => path.join(root(), 'references');
const filesDir = () => path.join(refsDir(), 'files');

const KINDS = ['idea', 'link', 'image', 'file', 'quote'];
const IMG_EXT = /\.(png|jpe?g|gif|webp|heic|heif|bmp|svg)$/i;
// leading pictographs (emoji, symbols, variation selectors, ZWJ) on an inbox line
const LEAD_EMOJI = /^\s*(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]+)\s*/u;

// ── tiny helpers ────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
function localIso(d = new Date()) {
  const off = -d.getTimezoneOffset(); const sign = off >= 0 ? '+' : '-'; const a = Math.abs(off);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}
function toIso(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s + 'T00:00:00';
  const t = Date.parse(s); return Number.isFinite(t) ? localIso(new Date(t)) : '';
}
function host(url) {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function uniq(list) { const out = []; for (const x of list || []) { const v = String(x || '').replace(/^#/, '').trim(); if (v && !out.includes(v)) out.push(v); } return out; }
function arr(v) { return Array.isArray(v) ? uniq(v) : (v ? uniq(String(v).split(/[,，]/)) : []); }
function slugify(s) {
  return String(s || '').toLowerCase().replace(/https?:\/\//, '').replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'scrap';
}
function hash(s) { return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 10); }
function extractHashtags(text) {
  const tags = []; let clean = String(text || '');
  // collapse runs of spaces only — blank lines are paragraph breaks and must survive
  clean = clean.replace(/(^|\s)#([^\s#，,。；;]+)/g, (m, sp, t) => { tags.push(t); return sp; }).replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim();
  return { clean, tags: uniq(tags) };
}
const URL_RE = /https?:\/\/[^\s<>"'）)]+/g;
function firstUrl(text) { const m = String(text || '').match(URL_RE); return m ? m[0] : ''; }
function allUrls(text) { return uniq(String(text || '').match(URL_RE) || []); }
const LINK_LINE = /^-\s+(?:\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/\S+))\s*$/;
function linkLines(raw) {
  const out = [];
  for (const l of String(raw || '').split('\n')) { const m = l.trim().match(LINK_LINE); if (m) out.push({ url: m[2] || m[3], title: (m[1] || '').trim() }); }
  return out;
}
function stripLeadingEmoji(s) { return String(s || '').replace(LEAD_EMOJI, ''); }

// ── frontmatter (own copy so the CLI works without server.js) ───────────────
function parseFrontmatter(content) {
  if (!content || !content.startsWith('---')) return [{}, content || ''];
  const end = content.indexOf('---', 3);
  if (end === -1) return [{}, content];
  const yaml = content.substring(3, end).trim();
  const body = content.substring(end + 3).trim();
  const meta = {};
  for (const line of yaml.split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const i = t.indexOf(':'); if (i === -1) continue;
    const key = t.slice(0, i).trim(); const v = t.slice(i + 1).trim();
    if (v.startsWith('[') && v.endsWith(']')) meta[key] = v.slice(1, -1).split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    else if (/^(true|false)$/i.test(v)) meta[key] = v.toLowerCase() === 'true';
    else meta[key] = v.replace(/^['"]|['"]$/g, '');
  }
  return [meta, body];
}
function yamlValue(v) {
  if (Array.isArray(v)) return '[' + v.map(x => JSON.stringify(String(x).replace(/[\[\],]/g, ' ').trim())).join(', ') + ']';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  const s = String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();
  if (!s) return '';
  if (/^[\[\]'"]/.test(s) || /^(true|false)$/i.test(s) || /^-?\d+(\.\d+)?$/.test(s) || s.startsWith('#')) return JSON.stringify(s.replace(/"/g, '”'));
  return s;
}
const META_ORDER = ['type', 'title', 'url', 'site', 'file', 'files', 'created', 'date', 'source', 'tags', 'ai_tags', 'summary', 'caption', 'note', 'by', 'title_pending', 'og_image', 'status'];
function serialize(meta, body) {
  const keys = [...META_ORDER.filter(k => k in meta), ...Object.keys(meta).filter(k => !META_ORDER.includes(k))];
  let out = '---\n';
  for (const k of keys) {
    const v = meta[k];
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && !v.length && k !== 'tags') continue;
    out += `${k}: ${yamlValue(v)}\n`;
  }
  out += '---\n\n' + String(body || '').replace(/\s+$/, '') + '\n';
  return out;
}
function readMd(fp) {
  if (ctx.readMdFile) return ctx.readMdFile(fp);
  try { const c = fs.readFileSync(fp, 'utf-8'); const [meta, raw] = parseFrontmatter(c); return { meta, raw, content: '', filename: path.basename(fp), path: path.relative(root(), fp) }; } catch { return null; }
}
function writeFile(fp, data) {
  if (ctx.store && ctx.store.atomicWriteSync) ctx.store.atomicWriteSync(fp, data);
  else { fs.mkdirSync(path.dirname(fp), { recursive: true }); fs.writeFileSync(fp, data); }
}

// ── reading ─────────────────────────────────────────────────────────────────
function bodyText(raw) {
  return String(raw || '').replace(/<!--[\s\S]*?-->/g, '').split('\n')
    .filter(l => !/^#\s/.test(l) && !/^-\s+\*\*Link:\*\*/i.test(l) && !/^\*\*Link:\*\*/i.test(l) && !LINK_LINE.test(l.trim()))
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
// a card excerpt for long documents: markdown markers stripped, one paragraph
function attachedFiles(input) {
  return [].concat(Array.isArray(input.files) ? input.files : [], input.file ? [input.file] : []).filter(f => f && f.data);
}
function normalizeKind(meta, raw, files, url) {
  const t = String(meta.type || '').toLowerCase();
  if (files.length) return files.every(f => IMG_EXT.test(f)) ? 'image' : 'file';
  if (['image', 'img', '图片', '截图'].includes(t)) return 'image';
  if (['file', 'pdf', '文件'].includes(t)) return 'file';
  if (['idea', 'thought', '想法', '灵感'].includes(t)) return 'idea';
  if (['quote', '摘录', '引用'].includes(t)) return 'quote';
  return url ? 'link' : 'idea';   // long text is still text — a document belongs in notes/, not here
}
function firstHeading(raw) { const m = String(raw || '').match(/^#\s+(.+)$/m); return m ? m[1].trim() : ''; }
function fileUrlFor(file) { return file ? '/scrap-files/' + encodeURIComponent(path.basename(file)) : ''; }

function fromFile(fullPath, md) {
  const meta = md.meta || {}; const raw = md.raw || '';
  const rel = path.relative(refsDir(), fullPath).split(path.sep).join('/');
  const files = arr(meta.files);
  if (meta.file && !files.includes(String(meta.file))) files.unshift(String(meta.file));
  const file = files[0] || '';
  const url = meta.url ? String(meta.url) : '';
  const kind = normalizeKind(meta, raw, files, url);
  let text = bodyText(raw);
  let note = meta.note ? String(meta.note) : '';
  if (!note && !meta.source && kind === 'link' && text && text.length < 400) { note = text; text = ''; }   // pre-scraps bookmark: body was the remark
  let created = toIso(meta.created || meta.date || meta.saved);
  if (!created) { try { created = localIso(fs.statSync(fullPath).birthtime); } catch { created = ''; } }
  const item = {
    id: 'ref:' + rel, path: 'references/' + rel, legacy: false,
    kind, subtype: String(meta.type || ''),
    title: meta.title ? String(meta.title) : firstHeading(raw),
    text,
    note,
    url, site: meta.site ? String(meta.site) : host(url), links: [],
    file, files, fileUrl: fileUrlFor(file), fileUrls: files.map(fileUrlFor), fileSize: 0,
    caption: meta.caption ? String(meta.caption) : '',
    summary: meta.summary ? String(meta.summary) : (meta['one-line'] ? String(meta['one-line']) : ''),
    tags: arr(meta.tags), aiTags: arr(meta.ai_tags),
    created, source: meta.source ? String(meta.source) : 'legacy',
    titlePending: meta.title_pending === true,
    ogImage: meta.og_image ? String(meta.og_image) : '',
    by: meta.by ? String(meta.by) : (meta.author ? String(meta.author) : ''),
    contentHtml: (kind === 'link' && text.length >= 400) ? (md.content || '') : '',
    hasBody: text.length > 0,
  };
  for (const f of files) { try { item.fileSize += fs.statSync(path.join(refsDir(), f)).size; } catch { /* missing file */ } }
  const extras = linkLines(raw).filter(l => l.url !== url);
  if (url) item.links.push({ url, title: item.title, site: item.site, pending: item.titlePending && !item.title });
  for (const l of extras) item.links.push({ url: l.url, title: l.title, site: host(l.url), pending: !l.title });
  item.urls = item.links.map(l => l.url);
  if (!item.title && (kind === 'image' || kind === 'file') && file) item.title = path.basename(file).replace(/^\d{8}-\d{6}-/, '');
  return item;
}

function fromInboxLine(rawLine, fallbackCreated) {
  let text = String(rawLine || '').trim();
  const dm = text.match(/[（(](\d{4}-\d{2}-\d{2})[）)]\s*$/);
  const created = dm ? dm[1] + 'T00:00:00' : (fallbackCreated || '');
  if (dm) text = text.slice(0, dm.index).trim();
  text = stripLeadingEmoji(text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/~~(.+?)~~/g, '$1'));
  const { clean, tags } = extractHashtags(text);
  const cat = clean.match(/^([一-鿿A-Za-z]{1,6}?(想法|笔记|选题|清单|计划|流程|工作流|复盘))[:：]/u);
  if (cat) tags.push(cat[1]);
  const url = firstUrl(clean);
  return {
    id: 'inbox:' + hash(rawLine), path: 'inbox.md', legacy: true, raw: rawLine,
    kind: url && clean.replace(url, '').trim().length < 12 ? 'link' : 'idea', subtype: '',
    title: '', text: clean, note: '', url, site: host(url), links: url ? [{ url, title: '', site: host(url), pending: false }] : [], urls: url ? [url] : [], file: '', files: [], fileUrl: '', fileUrls: [], fileSize: 0,
    caption: '', summary: '', tags: uniq(tags), aiTags: [], created, source: 'inbox',
    titlePending: false, ogImage: '', by: '', contentHtml: '', hasBody: true,
  };
}

function walkMd(dir, out) {
  let entries = []; try { entries = fs.readdirSync(dir).sort(); } catch { return; }
  for (const e of entries) {
    const fp = path.join(dir, e); let st; try { st = fs.statSync(fp); } catch { continue; }
    if (st.isDirectory()) { if (e === 'files' || e.startsWith('.')) continue; walkMd(fp, out); }
    else if (/\.md$/i.test(e) && e !== 'README.md') out.push(fp);
  }
}
function inboxLines() {
  const md = readMd(path.join(root(), 'inbox.md'));
  if (!md || !md.raw) return { lines: [], updated: '' };
  const lines = [];
  for (const line of md.raw.split('\n')) {
    const m = line.match(/^[-*]\s+(.+)/);
    if (m && m[1].trim() && !m[1].trim().startsWith('<!--')) lines.push(m[1].trim());
  }
  return { lines, updated: toIso(md.meta && md.meta.updated) };
}
function listItems() {
  const files = []; walkMd(refsDir(), files);
  const items = [];
  for (const fp of files) { const md = readMd(fp); if (md) items.push(fromFile(fp, md)); }
  const ib = inboxLines();
  for (const line of ib.lines) items.push(fromInboxLine(line, ib.updated));
  items.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
  return items;
}
function tagVocab(items, limit = 80) {
  const n = new Map();
  for (const it of items) for (const t of [...it.tags, ...it.aiTags]) n.set(t, (n.get(t) || 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([tag, count]) => ({ tag, count }));
}
function list() {
  const items = listItems();
  return { items, total: items.length, tags: tagVocab(items), pending: [...queue], enrich: aiEnabled() ? 'on' : 'off' };
}
function get(id) { return listItems().find(x => x.id === id) || null; }

// ── writing ─────────────────────────────────────────────────────────────────
function uniquePath(dir, base, ext) {
  let fp = path.join(dir, base + ext); let n = 2;
  while (fs.existsSync(fp)) { fp = path.join(dir, `${base}-${n}${ext}`); n += 1; }
  return fp;
}
function saveBinary(file, now) {
  const m = String(file.data || '').match(/^data:([^;]+);base64,(.+)$/s);
  const buf = Buffer.from(m ? m[2] : String(file.data || ''), 'base64');
  if (!buf.length) throw new Error('empty file');
  if (buf.length > 25 * 1024 * 1024) throw new Error('file too large (max 25MB)');
  const safe = String(file.name || 'file').replace(/[\\/:*?"<>|,]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file';
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  fs.mkdirSync(filesDir(), { recursive: true });
  const ext = path.extname(safe); const base = safe.slice(0, safe.length - ext.length);
  const fp = uniquePath(filesDir(), `${stamp}-${base}`, ext);
  writeFile(fp, buf);
  return { name: path.basename(fp), mime: m ? m[1] : (file.type || ''), size: buf.length };
}
function detectKind(input) {
  if (input.kind && KINDS.includes(input.kind)) return input.kind;
  const fl = attachedFiles(input);
  if (fl.length) {
    const isImg = (f) => /^image\//.test(String(f.type || (String(f.data).match(/^data:([^;]+)/) || [])[1] || '')) || IMG_EXT.test(f.name || '');
    return fl.every(isImg) ? 'image' : 'file';
  }
  const text = String(input.text || '').trim();
  const url = String(input.url || '').trim() || (Array.isArray(input.urls) && input.urls[0]) || firstUrl(text);
  if (url) return 'link';
  if (input.by && text) return 'quote';
  if (/^[「“"'].+[」”"']$/.test(text)) return 'quote';
  return 'idea';
}

function add(input) {
  input = input || {};
  const now = input.created ? new Date(input.created) : new Date();
  const created = input.created ? (toIso(input.created) || localIso(now)) : localIso(now);
  const dateStr = created.slice(0, 10);
  const kind = detectKind(input);
  const savedAll = attachedFiles(input).map(f => saveBinary(f, now));
  const saved = savedAll[0] || null;
  const rawText = String(input.text || '').trim();
  let urls = uniq([].concat(Array.isArray(input.urls) ? input.urls : [], input.url ? [String(input.url)] : []).map(u => String(u).trim()).filter(Boolean));
  let text = rawText;
  if (kind === 'link' && !urls.length) { urls = allUrls(rawText); text = urls.reduce((t, u) => t.split(u).join(' '), rawText).replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+\n/g, '\n').trim(); }
  const url = kind === 'link' ? (urls[0] || '') : '';
  const extraUrls = kind === 'link' ? urls.slice(1) : urls;
  const { clean, tags: inline } = extractHashtags(text);
  const noteX = extractHashtags(String(input.note || ''));   // "#标签" typed into the 标注 is a tag, not part of the words
  const tags = uniq([...(arr(input.tags)), ...inline, ...noteX.tags]);
  let title = String(input.title || '').replace(/[\r\n]+/g, ' ').trim();
  if (!title && (kind === 'image' || kind === 'file') && saved) {
    const first = attachedFiles(input)[0];
    title = String((first && first.name) || saved.name).replace(/\.[a-z0-9]+$/i, '');
    if (savedAll.length > 1) title += ' +' + (savedAll.length - 1);
  }
  // the typed text is the body for thoughts/quotes/docs, and the 标注 for anything attached
  const bodyParts = [];
  if (clean) bodyParts.push(clean);
  if (extraUrls.length) bodyParts.push(extraUrls.map(u => '- ' + u).join('\n'));
  const body = bodyParts.join('\n\n');
  const note = noteX.clean.trim();
  const meta = {
    type: kind, title, url, site: host(url), file: saved ? 'files/' + saved.name : '', files: savedAll.length > 1 ? savedAll.map(x => 'files/' + x.name) : [],
    created, date: dateStr, source: input.source || 'paste',
    tags, ai_tags: [], summary: '', caption: '', note, by: String(input.by || '').trim(),
  };
  if (kind === 'link' && !title) meta.title_pending = true;
  const slugBase = title || clean.slice(0, 40) || (saved && saved.name) || host(url) || 'scrap';
  fs.mkdirSync(refsDir(), { recursive: true });
  const fp = uniquePath(refsDir(), `${dateStr}-${slugify(slugBase)}`, '.md');
  writeFile(fp, serialize(meta, body));
  const item = fromFile(fp, readMd(fp));
  if (input.enrich !== false) enrichLater(item.id);
  return item;
}

function cleanInboxRaw(raw) {
  const t = String(raw).trim().replace(/[（(](\d{4}-\d{2}-\d{2})[）)]\s*$/, '').trim();
  return stripLeadingEmoji(t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/~~(.+?)~~/g, '$1'));
}
function removeInboxLine(rawLine) {
  const fp = path.join(root(), 'inbox.md');
  let content; try { content = fs.readFileSync(fp, 'utf-8'); } catch { return false; }
  const lines = content.split('\n'); const want = String(rawLine || '').trim();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^[-*]\s+(.+)/);
    if (m && m[1].trim() === want) {
      let end = i + 1;
      while (end < lines.length) { const l = lines[end]; if (/^[-*]\s+/.test(l) || /^#{1,6}\s/.test(l)) break; if (/^\s+\S/.test(l) || l.trim() === '') { end++; continue; } break; }
      while (end - 1 > i && lines[end - 1].trim() === '') end--;
      lines.splice(i, end - i);
      writeFile(fp, lines.join('\n'));
      return true;
    }
  }
  return false;
}
function ensureFile(id) {
  // legacy inbox line → real file (first edit migrates it)
  const item = get(id); if (!item) throw new Error('not found: ' + id);
  if (!item.legacy) return item;
  const made = add({ kind: item.kind, text: cleanInboxRaw(item.raw), url: item.url, tags: item.tags, source: 'inbox', created: item.created || undefined, enrich: false });
  removeInboxLine(item.raw);
  return made;
}
function refPath(id) {
  const rel = String(id).replace(/^ref:/, '');
  const fp = path.resolve(refsDir(), rel);
  if (fp !== refsDir() && !fp.startsWith(refsDir() + path.sep)) throw new Error('invalid id');
  return fp;
}
// read-modify-write under the shared brain lock: the dashboard (user edits) and the
// enrichment pass (AI tags) can touch the same file within the same second
function locked(fn) {
  // own lock dir: nesting it inside .loci/.write-lock would leave that dir behind and
  // stall every task writer (they mkdir .write-lock itself as their lock)
  if (ctx.store && typeof ctx.store.withLock === 'function') return ctx.store.withLock(path.join(root(), '.loci', '.scraps-lock'), fn);
  return fn();
}
function patchFile(id, patch, bodyPatch) {
  const fp = refPath(id);
  return locked(() => {
    const c = fs.readFileSync(fp, 'utf-8');
    const [meta, body] = parseFrontmatter(c);
    const next = Object.assign({}, meta, patch);
    for (const k of Object.keys(next)) if (next[k] === null) delete next[k];
    writeFile(fp, serialize(next, bodyPatch === undefined ? body : bodyPatch));
    return fromFile(fp, readMd(fp));
  });
}
function update(id, patch) {
  let item = get(id); if (!item) throw new Error('not found: ' + id);
  if (item.legacy) item = ensureFile(id);
  const p = {}; let body;
  if (patch.title !== undefined) { p.title = String(patch.title).replace(/[\r\n]+/g, ' ').trim(); if (p.title) p.title_pending = null; }
  if (patch.note !== undefined) p.note = String(patch.note).replace(/\r/g, '').trim();
  if (patch.tags !== undefined) p.tags = arr(patch.tags);
  if (patch.aiTags !== undefined) p.ai_tags = arr(patch.aiTags);
  if (patch.acceptTag) { const t = String(patch.acceptTag).trim(); p.tags = uniq([...item.tags, t]); p.ai_tags = item.aiTags.filter(x => x !== t); }
  if (patch.acceptAll) { p.tags = uniq([...item.tags, ...item.aiTags]); p.ai_tags = []; }
  if (patch.kind && KINDS.includes(patch.kind)) p.type = patch.kind;
  if (patch.text !== undefined) {
    const [, oldBody] = parseFrontmatter(fs.readFileSync(refPath(item.id), 'utf-8'));
    const keep = linkLines(oldBody).map(l => l.title ? `- [${l.title}](${l.url})` : `- ${l.url}`);
    body = [String(patch.text).trim(), keep.join('\n')].filter(Boolean).join('\n\n');
  }
  if (patch.url !== undefined) { p.url = String(patch.url).trim(); p.site = host(p.url); }
  if (patch.by !== undefined) p.by = String(patch.by).trim();
  return patchFile(item.id, p, body);
}
function remove(id) {
  const item = get(id); if (!item) throw new Error('not found: ' + id);
  if (item.legacy) return removeInboxLine(item.raw) ? { ok: true, id } : { error: 'line not found' };
  const fp = refPath(item.id);
  const rel = path.relative(refsDir(), fp);
  const target = path.join(root(), 'archive', 'references', rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.renameSync(fp, target);
  for (const f of item.files || []) {
    const bin = path.join(refsDir(), f);
    const binTarget = path.join(root(), 'archive', 'references', f);
    try { fs.mkdirSync(path.dirname(binTarget), { recursive: true }); fs.renameSync(bin, binTarget); } catch { /* keep going */ }
  }
  return { ok: true, id, archived: 'archive/references/' + rel.split(path.sep).join('/') };
}
function migrateInbox() {
  const ib = inboxLines(); let n = 0;
  for (const line of ib.lines) {
    const it = fromInboxLine(line, ib.updated);
    add({ kind: it.kind, text: cleanInboxRaw(line), url: it.url, tags: it.tags, source: 'inbox', created: it.created || undefined, enrich: false });
    removeInboxLine(line); n += 1;
  }
  return { migrated: n };
}

// ── link metadata (title / og:image): 8s, ≤600KB, ≤4 redirects, gbk-aware ──
function fetchMeta(url, hops = 0) {
  return new Promise((resolve) => {
    let u; try { u = new URL(url); } catch { return resolve(null); }
    if (!/^https?:$/.test(u.protocol) || hops > 4) return resolve(null);
    const mod = u.protocol === 'https:' ? https : http;
    const headers = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 Loci/1.0', 'Accept': 'text/html,*/*;q=0.8', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8', 'Accept-Encoding': 'gzip, deflate, br' };
    const req = mod.get(u, { headers, timeout: 8000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return resolve(fetchMeta(new URL(res.headers.location, u).href, hops + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      if (!/text\/html|application\/xhtml/i.test(String(res.headers['content-type'] || 'text/html'))) { res.resume(); return resolve(null); }
      const chunks = []; let size = 0;
      res.on('data', (d) => { size += d.length; if (size <= 600 * 1024) chunks.push(d); else req.destroy(); });
      res.on('end', () => resolve(parseHtmlMeta(inflate(Buffer.concat(chunks), String(res.headers['content-encoding'] || '')), String(res.headers['content-type'] || ''), u)));
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}
// servers like bilibili gzip even unasked; a compressed body has no <title> to find
function inflate(buf, enc) {
  try {
    if (/gzip/i.test(enc) || (buf[0] === 0x1f && buf[1] === 0x8b)) return zlib.gunzipSync(buf);
    if (/deflate/i.test(enc)) return zlib.inflateSync(buf);
    if (/br/i.test(enc)) return zlib.brotliDecompressSync(buf);
  } catch { /* truncated stream (size cap) — fall through to the raw bytes */ }
  return buf;
}
function parseHtmlMeta(buf, contentType, u) {
  let charset = (contentType.match(/charset=([\w-]+)/i) || [])[1] || '';
  let html = buf.toString('utf-8');
  if (!charset) charset = (html.slice(0, 4096).match(/charset=["']?\s*([\w-]+)/i) || [])[1] || 'utf-8';
  if (/^(gbk|gb2312|gb18030)$/i.test(charset)) { try { html = new TextDecoder('gbk').decode(buf); } catch { /* keep utf-8 */ } }
  const meta = (names) => {
    for (const n of names) {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']*)["']`, 'i');
      const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${n}["']`, 'i');
      const m = html.match(re) || html.match(re2); if (m && m[1].trim()) return decodeEntities(m[1].trim());
    }
    return '';
  };
  let title = meta(['og:title', 'twitter:title']) || decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
  title = title.replace(/\s*[-_|–—]\s*(哔哩哔哩.*|bilibili.*|知乎|微信公众平台|YouTube|Twitter|X)$/i, '').trim();
  let image = meta(['og:image', 'twitter:image']);
  if (image && !/^https?:/.test(image)) { try { image = new URL(image, u).href; } catch { image = ''; } }
  const description = meta(['og:description', 'description', 'twitter:description']).slice(0, 200);
  return { title: title.slice(0, 160), image, description, site: meta(['og:site_name']) || host(u.href) };
}
function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|#39);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[e.toLowerCase()] || m;
  });
}

// ── AI enrichment (best-effort, serialized, headless claude) ────────────────
let cachedBin;
function claudeBin() {
  if (cachedBin !== undefined) return cachedBin;
  const c = [];
  try { const w = execFileSync('/usr/bin/which', ['claude'], { encoding: 'utf-8' }).trim(); if (w) c.push(w); } catch { /* not on PATH */ }
  const home = process.env.HOME || '';
  c.push(path.join(home, '.local', 'bin', 'claude'), path.join(home, '.claude', 'local', 'claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude');
  cachedBin = null;
  for (const x of c) { try { fs.accessSync(x, fs.constants.X_OK); cachedBin = x; break; } catch { /* next */ } }
  return cachedBin;
}
function aiEnabled() {
  if (/^(off|0|false|no)$/i.test(process.env.LOCI_ENRICH || '')) return false;
  try {
    const cfg = fs.readFileSync(path.join(root(), '.loci', 'config.yml'), 'utf-8');
    if (/^\s*(scraps_ai|ai_enrich|enrich)\s*:\s*(off|false|no|none)\s*$/mi.test(cfg)) return false;
  } catch { /* no config */ }
  return !!claudeBin();
}
const ENRICH_MODEL = process.env.LOCI_ENRICH_MODEL || 'haiku';
const ENRICH_TIMEOUT_MS = 120000;
const queue = []; let running = false; let lastError = '';
function enrichLater(id) { if (!queue.includes(id)) queue.push(id); setTimeout(pump, 50); }
async function pump() {
  if (running) return; running = true;
  while (queue.length) {
    const id = queue[0];
    try { await enrichOne(id); lastError = ''; }
    catch (e) { lastError = e.message; console.error('scraps: enrich failed for', id, '-', e.message); }
    queue.shift();
  }
  running = false;
}
async function enrichOne(id) {
  let item = get(id); if (!item || item.legacy) return;
  if (item.kind === 'link' && item.titlePending && item.url) {
    const m = await fetchMeta(item.url);
    if (m && m.title) item = patchFile(item.id, { title: m.title, site: m.site || item.site, og_image: m.image || '', title_pending: null });
    else item = patchFile(item.id, { fetch_tried: localIso() });
    if (ctx.notifyReload) ctx.notifyReload(item.path);
  }
  const pendingExtras = (item.links || []).slice(item.kind === 'link' ? 1 : 0).filter(l => l.pending).slice(0, 6);
  if (pendingExtras.length) {
    const titles = {};
    for (const l of pendingExtras) { const m = await fetchMeta(l.url); if (m && m.title) titles[l.url] = m.title; }
    if (Object.keys(titles).length) {
      const fp = refPath(item.id);
      locked(() => {
        const [meta, body] = parseFrontmatter(fs.readFileSync(fp, 'utf-8'));
        const lines = body.split('\n').map(l => { const m = l.trim().match(LINK_LINE); const u = m && (m[2] || m[3]); return (u && titles[u] && !m[1]) ? `- [${titles[u].replace(/[\[\]]/g, ' ')}](${u})` : l; });
        writeFile(fp, serialize(meta, lines.join('\n')));
      });
      item = get(item.id) || item;
      if (ctx.notifyReload) ctx.notifyReload(item.path);
    }
  }
  if (!aiEnabled()) return;
  const out = await runClaude(item);
  if (!out) return;
  const p = {};
  if (Array.isArray(out.tags)) p.ai_tags = uniq(out.tags).filter(t => !item.tags.includes(t)).slice(0, 3);
  if (typeof out.summary === 'string' && out.summary.trim()) p.summary = out.summary.trim().slice(0, 120);
  if (item.kind === 'image' && typeof out.caption === 'string' && out.caption.trim()) p.caption = out.caption.trim().slice(0, 200);
  if (item.kind === 'link' && item.titlePending && typeof out.title === 'string' && out.title.trim()) { p.title = out.title.trim().slice(0, 120); p.title_pending = null; }
  if (Object.keys(p).length) { patchFile(item.id, p); if (ctx.notifyReload) ctx.notifyReload(item.path); }
}
const KIND_ZH = { idea: '文字', link: '链接', image: '图片', file: '文件', quote: '摘录' };
function buildPrompt(item, vocab) {
  const lines = [
    '你在给 Loci 大脑里的一条"碎片"补检索线索。只输出一个 JSON 对象，不要解释，不要 markdown 代码块。',
    '格式：{"tags": ["…","…"], "summary": "…", "caption": "…", "title": "…"}',
    '规则：tags 给 2 到 3 个短词（优先从已有标签里选：' + (vocab.length ? vocab.join('、') : '无') + '）；summary 一句话不超过 40 字，说这条是什么、为什么值得留；',
    '图片才写 caption：一句话描述画面，图里有文字就抄出关键文字，不超过 80 字，不是图片时 caption 为空字符串；title 只在这条没有标题时给一个不超过 20 字的标题，否则为空字符串。',
    '',
    '碎片：',
    '类型：' + (KIND_ZH[item.kind] || item.kind),
  ];
  if (item.title) lines.push('标题：' + item.title);
  if (item.url) lines.push('网址：' + item.url);
  if (item.note) lines.push('用户的标注：' + item.note);
  if (item.text) lines.push('正文：' + item.text.slice(0, 1500));
  if (item.tags.length) lines.push('用户已打的标签：' + item.tags.join('、'));
  return lines.join('\n');
}
function runClaude(item) {
  return new Promise((resolve) => {
    const bin = claudeBin(); if (!bin) return resolve(null);
    const vocab = tagVocab(listItems(), 60).map(x => x.tag);
    let prompt = buildPrompt(item, vocab);
    const args = ['-p', '--output-format', 'json', '--model', ENRICH_MODEL, '--strict-mcp-config', '--setting-sources', 'local'];
    if (item.kind === 'image' && item.file) {
      const abs = path.join(refsDir(), item.file);
      prompt = `先用 Read 工具打开这张图片：${abs}\n看完后按下面要求输出。\n\n` + prompt;
      args.push('--allowedTools', 'Read', '--max-turns', '4');
    } else {
      args.push('--max-turns', '1');
    }
    const cwd = path.join(os.tmpdir(), 'loci-enrich'); try { fs.mkdirSync(cwd, { recursive: true }); } catch { /* fine */ }
    let child; try { child = spawn(bin, args, { cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { return resolve(null); }
    let out = ''; let err = ''; let done = false;
    const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    const timer = setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } console.error('scraps: enrich timed out'); finish(null); }, ENRICH_TIMEOUT_MS);
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; if (err.length > 4000) err = err.slice(-4000); });
    child.on('error', () => finish(null));
    child.on('close', () => {
      let text = out;
      try { const j = JSON.parse(out); text = typeof j.result === 'string' ? j.result : JSON.stringify(j); } catch { /* raw text */ }
      const m = String(text).match(/\{[\s\S]*\}/);
      if (!m) { if (err) console.error('scraps: enrich returned no JSON -', err.slice(-300).trim()); return finish(null); }
      try { finish(JSON.parse(m[0])); } catch { finish(null); }
    });
    child.stdin.end(prompt);
  });
}
function status() { return { enabled: aiEnabled(), model: ENRICH_MODEL, queue: [...queue], running, lastError }; }

module.exports = { init, list, get, add, update, remove, migrateInbox, enrichLater, fetchMeta, status, KINDS, parseFrontmatter, serialize, host, localIso, fileUrlFor };
