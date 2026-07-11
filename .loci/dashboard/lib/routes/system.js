/**
 * lib/routes/system.js — foundation self-test endpoints, and the reference
 * implementation for pluggable route modules.
 *
 * Contract: export { handle(req, res, parsed, ctx) } returning true when the
 * request was handled. ctx provides { LOCI_ROOT, SCRIPT_DIR, auth, sse, store,
 * sendJson, sendError, parseJsonBody } so modules don't re-implement helpers.
 * Feature tracks (chat, push) each add their own file here — server.js itself
 * stays untouched.
 */

module.exports = {
  async handle(req, res, parsed, ctx) {
    const p = parsed.pathname;

    if (p === '/api/system/health' && req.method === 'GET') {
      ctx.sendJson(res, {
        ok: true,
        now: new Date().toISOString(),
        loopback: ctx.auth.isLoopback(req),
      });
      return true;
    }

    // Streams a tick every second for 30s — verifies SSE end-to-end,
    // including through reverse proxies (watch for buffering).
    if (p === '/api/system/sse-test' && req.method === 'GET') {
      const stream = ctx.sse.openStream(req, res, { heartbeatMs: 5000 });
      let n = 0;
      const timer = setInterval(() => {
        n += 1;
        if (!stream.send('tick', { n }) || n >= 30) {
          clearInterval(timer);
          stream.close();
        }
      }, 1000);
      req.on('close', () => clearInterval(timer));
      return true;
    }

    return false;
  },
};
