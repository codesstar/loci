#!/usr/bin/env node
// lib/scraps.js — capture, kinds, legacy inbox migration, tags/notes, archive.
// Runs against a throwaway brain in the OS temp dir; no network, no AI (LOCI_ENRICH=off).
process.env.LOCI_ENRICH = 'off';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'loci-scraps-'));
const LIB = path.join(__dirname, '..', '.loci', 'dashboard', 'lib');
const scraps = require(path.join(LIB, 'scraps.js'));
const store = require(path.join(LIB, 'store.js'));
fs.mkdirSync(path.join(ROOT, '.loci'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'inbox.md'), '---\nupdated: 2026-07-09\n---\n\n# Inbox\n\n## Unprocessed\n\n- 💡 产品想法：做一个 AI 写日记的产品（2026-05-07）\n- 设计技巧:做一个可以调节参数的html\n');
scraps.init({ LOCI_ROOT: ROOT, store });

let n = 0;
const ok = (name) => { n += 1; console.log('  ok ' + n + ' ' + name); };

// a thought with hashtags
const a = scraps.add({ text: '做一个可以调节参数的 html #设计 #工作流', source: 'test' });
assert.equal(a.kind, 'idea'); assert.deepEqual(a.tags, ['设计', '工作流']); assert(!a.text.includes('#'));
assert(fs.existsSync(path.join(ROOT, a.path)));
ok('thought + hashtags → idea file');

// a link with a trailing sentence → note; title pending until fetched
const b = scraps.add({ text: 'https://www.bilibili.com/video/BV1pSzkB4EdK/ 这个运镜不错', source: 'test', enrich: false });
assert.equal(b.kind, 'link'); assert.equal(b.url, 'https://www.bilibili.com/video/BV1pSzkB4EdK/');
assert.equal(b.text, '这个运镜不错'); assert.equal(b.note, ''); assert.equal(b.site, 'bilibili.com'); assert.equal(b.titlePending, true);
ok('link + words → link, words are a text block');

// quote
const c = scraps.add({ text: 'Your first 100 videos will suck.', by: 'MrBeast', source: 'test' });
assert.equal(c.kind, 'quote'); assert.equal(c.by, 'MrBeast');
ok('quote via --by');

// image: the binary lands under references/files and the typed text is the 标注
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const d = scraps.add({ text: '侧栏玻璃感参考 #界面', file: { name: 'sidebar shot.png', type: 'image/png', data: 'data:image/png;base64,' + png.toString('base64') }, source: 'test' });
assert.equal(d.kind, 'image'); assert(d.file.startsWith('files/')); assert(fs.existsSync(path.join(ROOT, 'references', d.file)));
assert.equal(d.text, '侧栏玻璃感参考'); assert.deepEqual(d.tags, ['界面']); assert.equal(d.title, 'sidebar shot'); assert(d.fileUrl.startsWith('/scrap-files/'));
ok('image → file saved, text kept as a block, tag kept');

// pdf-ish file
const e = scraps.add({ file: { name: '个人记忆系统调研.pdf', type: 'application/pdf', data: 'data:application/pdf;base64,' + Buffer.from('%PDF-1.4\n').toString('base64') }, note: '第 6 页有三家对比 #调研', source: 'test' });
assert.equal(e.kind, 'file'); assert.equal(e.note, '第 6 页有三家对比'); assert.deepEqual(e.tags, ['调研']); assert.equal(e.title, '个人记忆系统调研');
ok('pdf → file, #tag in the 标注 becomes a tag');

// long text is still text (documents belong in notes/, there is no doc kind)
const longOne = scraps.add({ text: '案例库。'.repeat(200), source: 'test' });
assert.equal(longOne.kind, 'idea'); assert.equal(longOne.text.length, 800); assert.equal(longOne.contentHtml, '');
ok('long text stays text');

// frontmatter round-trip with awkward characters
const g = scraps.add({ text: '[草稿] 标题里有: 冒号 "引号" 和 #标签, 逗号', title: '[草稿] 有: 冒号 "引号"', source: 'test' });
const g2 = scraps.get(g.id);
assert.equal(g2.title, '[草稿] 有: 冒号 ”引号”'); assert.deepEqual(g2.tags, ['标签']);
ok('frontmatter survives brackets / colons / quotes');

// legacy inbox lines surface as scraps and migrate on first edit
let list = scraps.list();
const legacy = list.items.filter(i => i.legacy);
assert.equal(legacy.length, 2);
const idea = legacy.find(i => i.text.startsWith('产品想法'));
assert.equal(idea.created, '2026-05-07T00:00:00'); assert.deepEqual(idea.tags, ['产品想法']);
const m = scraps.update(idea.id, { note: '日记页已经在往这个方向走' });
assert(m.id.startsWith('ref:')); assert.equal(m.note, '日记页已经在往这个方向走'); assert.equal(m.created.slice(0, 10), '2026-05-07');
assert(!fs.readFileSync(path.join(ROOT, 'inbox.md'), 'utf-8').includes('AI 写日记'));
ok('inbox.md line → shown as scrap → becomes a file when edited');

// tags: accept an AI suggestion, hand-written title clears title_pending
let u = scraps.update(b.id, { aiTags: ['音乐', '演奏'] });
u = scraps.update(b.id, { acceptTag: '音乐' });
assert.deepEqual(u.tags, ['音乐']); assert.deepEqual(u.aiTags, ['演奏']);
u = scraps.update(b.id, { title: '弹小提琴视频' });
assert.equal(u.title, '弹小提琴视频'); assert.equal(u.titlePending, false);
ok('accept AI tag, manual title');

// remove → archive, binary moves along
const r = scraps.remove(d.id);
assert(r.ok); assert(!fs.existsSync(path.join(ROOT, 'references', d.file))); assert(fs.existsSync(path.join(ROOT, 'archive', 'references', d.file)));
ok('remove archives the file and its binary');

// two images pasted together → one scrap with two attachments
const two = scraps.add({ text: '两张一起 #对比', files: [{ name: 'a.png', type: 'image/png', data: 'data:image/png;base64,' + png.toString('base64') }, { name: 'b.png', type: 'image/png', data: 'data:image/png;base64,' + png.toString('base64') }], source: 'test' });
assert.equal(two.kind, 'image'); assert.equal(two.files.length, 2); assert.equal(two.fileUrls.length, 2); assert.equal(two.title, 'a +1'); assert.equal(two.text, '两张一起');
assert(fs.existsSync(path.join(ROOT, 'references', two.files[1])));
const two2 = scraps.get(two.id); assert.equal(two2.files.length, 2);
const r2 = scraps.remove(two.id); assert(r2.ok); assert(fs.existsSync(path.join(ROOT, 'archive', 'references', two.files[1])));
ok('several files → one scrap, all archived together');

// two links pasted together → one scrap; the second lives in the body as a link line
const tl = scraps.add({ text: '两个都值得看 #对比', urls: ['https://example.com/a', 'https://example.org/b'], source: 'test', enrich: false });
assert.equal(tl.kind, 'link'); assert.equal(tl.url, 'https://example.com/a'); assert.equal(tl.links.length, 2); assert.equal(tl.links[1].url, 'https://example.org/b'); assert.equal(tl.text, '两个都值得看'); assert.deepEqual(tl.tags, ['对比']);
assert(fs.readFileSync(path.join(ROOT, tl.path), 'utf-8').includes('- https://example.org/b'));
// urls inside free text are pulled out the same way
const tl2 = scraps.add({ text: 'https://example.com/x https://example.com/y 都是同一个作者', source: 'test', enrich: false });
assert.equal(tl2.links.length, 2); assert.equal(tl2.text, '都是同一个作者');
const tl3 = scraps.add({ text: '一大段内容\n\n第二段', urls: ['https://example.com/z'], note: '这是我的标注', source: 'test', enrich: false });
assert.equal(tl3.text, '一大段内容\n\n第二段'); assert.equal(tl3.note, '这是我的标注'); assert.equal(tl3.links.length, 1);
const tl4 = scraps.update(tl3.id, { text: '改过的内容' }); assert.equal(tl4.text, '改过的内容'); assert.equal(tl4.links.length, 1); scraps.remove(tl3.id);
scraps.remove(tl.id); scraps.remove(tl2.id);
ok('several links → one scrap, note kept, body holds the extras');

// migrate the rest of inbox.md
const mig = scraps.migrateInbox();
assert.equal(mig.migrated, 1); assert.equal(scraps.list().items.filter(i => i.legacy).length, 0);
ok('migrate-inbox empties the legacy lines');

list = scraps.list();
assert.equal(list.items.length, 8);   // 7 added − 1 archived + 2 migrated inbox lines
assert(list.tags.find(t => t.tag === '设计'));
ok('list: ' + list.items.length + ' items, tag vocab built');

// the add route: a pasted screenshot with no words is a scrap (files-only payload), an empty payload is not
(async () => {
  const route = require(path.join(LIB, 'routes', 'scraps.js'));
  route.init({ LOCI_ROOT: ROOT, store });
  async function post(pathname, body) {
    let out = null;
    const ctx = { LOCI_ROOT: ROOT, store, parseJsonBody: async () => body,
      sendJson: (res, o) => { out = { status: 200, body: o }; }, sendError: (res, msg, code) => { out = { status: code || 400, body: { error: msg } }; } };
    await route.handle({ method: 'POST', headers: {} }, {}, { pathname }, ctx);
    return out;
  }
  const onlyFile = await post('/api/scraps/add', { text: '', url: '', urls: [], note: '', files: [{ name: '63fc15830d17991fc0e8e7b5a5350aa1.png', type: 'image/png', data: 'data:image/png;base64,' + png.toString('base64') }] });
  assert.equal(onlyFile.status, 200); assert.equal(onlyFile.body.item.kind, 'image'); assert.equal(onlyFile.body.item.text, '');
  const onlyLinks = await post('/api/scraps/add', { text: '', urls: ['https://example.com/only'], enrich: false });
  assert.equal(onlyLinks.status, 200); assert.equal(onlyLinks.body.item.kind, 'link');
  const empty = await post('/api/scraps/add', { text: '', files: [], urls: [] });
  assert.equal(empty.body.error, 'nothing to save');
  scraps.remove(onlyFile.body.item.id); scraps.remove(onlyLinks.body.item.id);
  ok('route: files-only and links-only payloads save, empty payload refused');

  fs.rmSync(ROOT, { recursive: true, force: true });
  console.log('scraps.test.js: all ' + n + ' checks passed');
})().catch(e => { console.error(e); process.exit(1); });
