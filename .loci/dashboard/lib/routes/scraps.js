/**
 * lib/routes/scraps.js — API for 碎片 (collected things): thoughts, links,
 * images, files, quotes, docs. Reads live from references/ (+ legacy inbox.md).
 *
 *   GET  /api/scraps                       { items, total, tags, pending, enrich }
 *   POST /api/scraps/add                   { text?, url?, title?, tags?, note?, kind?, by?,
 *                                            file?: { name, type, data: dataURL }, source? } → item
 *   POST /api/scraps/update                { id, title?, note?, tags?, aiTags?, acceptTag?, acceptAll?, kind?, text?, url? } → item
 *   POST /api/scraps/remove                { id } → { ok, archived }
 *   POST /api/scraps/enrich                { id } → queue the AI/title pass again
 *   GET  /api/scraps/status                enrichment status
 *   GET  /scrap-files/<name>               the binary behind an image/file scrap
 */

const path = require('path');
const fs = require('fs');
const scraps = require('../scraps.js');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.heic': 'image/heic', '.bmp': 'image/bmp', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.json': 'application/json', '.csv': 'text/csv; charset=utf-8' };

module.exports = {
  init(ctx) {
    scraps.init({ LOCI_ROOT: ctx.LOCI_ROOT, store: ctx.store, readMdFile: ctx.readMdFile, notifyReload: ctx.notifyReload });
  },

  async handle(req, res, parsed, ctx) {
    const p = parsed.pathname;

    if (p.startsWith('/scrap-files/')) {
      const name = path.basename(decodeURIComponent(p.slice('/scrap-files/'.length)));
      const dir = path.join(ctx.LOCI_ROOT, 'references', 'files');
      const fp = path.join(dir, name);
      if (!path.resolve(fp).startsWith(path.resolve(dir) + path.sep) || !fs.existsSync(fp)) { ctx.sendError(res, 'Not found', 404); return true; }
      const ext = path.extname(name).toLowerCase();
      const st = fs.statSync(fp);
      const etag = `"${Math.floor(st.mtimeMs).toString(36)}-${st.size.toString(36)}"`;
      if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); res.end(); return true; }
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Content-Length': st.size, ETag: etag, 'Cache-Control': 'private, max-age=86400', 'Content-Disposition': 'inline' });
      fs.createReadStream(fp).pipe(res);
      return true;
    }

    if (!p.startsWith('/api/scraps')) return false;

    if (p === '/api/scraps' && req.method === 'GET') { ctx.sendJson(res, scraps.list()); return true; }
    if (p === '/api/scraps/status' && req.method === 'GET') { ctx.sendJson(res, scraps.status()); return true; }

    if (req.method !== 'POST') { ctx.sendError(res, 'Method not allowed', 405); return true; }
    let body;
    try { body = await ctx.parseJsonBody(req); } catch (e) { ctx.sendError(res, e.message); return true; }
    try {
      if (p === '/api/scraps/add') {
        const atts = [].concat(Array.isArray(body.files) ? body.files : [], body.file ? [body.file] : []).filter(f => f && f.data);
        if (!(body.text || body.url || (Array.isArray(body.urls) && body.urls.length) || atts.length)) { ctx.sendError(res, 'nothing to save'); return true; }
        ctx.sendJson(res, { ok: true, item: scraps.add(body) });
        return true;
      }
      if (p === '/api/scraps/update') { ctx.sendJson(res, { ok: true, item: scraps.update(String(body.id || ''), body) }); return true; }
      if (p === '/api/scraps/remove') { ctx.sendJson(res, scraps.remove(String(body.id || ''))); return true; }
      if (p === '/api/scraps/enrich') {
        const it = scraps.get(String(body.id || ''));
        if (!it) { ctx.sendError(res, 'not found', 404); return true; }
        if (it.legacy) { ctx.sendError(res, 'legacy inbox line — edit it first'); return true; }
        scraps.enrichLater(it.id);
        ctx.sendJson(res, { ok: true, queued: it.id, enrich: scraps.status().enabled ? 'on' : 'off' });
        return true;
      }
      if (p === '/api/scraps/migrate-inbox') { ctx.sendJson(res, scraps.migrateInbox()); return true; }
    } catch (e) {
      ctx.sendError(res, e.message, /not found/.test(e.message) ? 404 : 400);
      return true;
    }
    return false;
  },
};
