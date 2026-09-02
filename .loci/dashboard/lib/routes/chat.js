/**
 * lib/routes/chat.js — API for the embedded AI chat panel.
 *
 *   GET  /api/chat/health              engine availability (claude CLI found?)
 *   GET  /api/chat/sessions            list sessions
 *   POST /api/chat/sessions            create session {engine?}
 *   POST /api/chat/sessions/remove     {id}
 *   GET  /api/chat/history?session=id  full transcript
 *   POST /api/chat/send                {sessionId, message} → 202, events on stream
 *   POST /api/chat/stop                {sessionId}
 *   GET  /api/chat/stream?session=id   SSE: user/turn_start/assistant_delta/
 *                                      assistant_text/tool_use/tool_result/
 *                                      error/turn_done
 */

const manager = require('../chat/manager.js');

module.exports = {
  init() {
    manager.warm(); // engine health cache, off the request path
  },

  async handle(req, res, parsed, ctx) {
    const p = parsed.pathname;
    if (!p.startsWith('/api/chat/')) return false;

    if (p === '/api/chat/health' && req.method === 'GET') {
      ctx.sendJson(res, await manager.health(ctx, parsed.searchParams.get('engine')));
      return true;
    }

    if (p === '/api/chat/sessions' && req.method === 'GET') {
      ctx.sendJson(res, { sessions: manager.list(ctx) });
      return true;
    }

    if (p === '/api/chat/sessions' && req.method === 'POST') {
      const body = await ctx.parseJsonBody(req).catch(() => ({}));
      ctx.sendJson(res, manager.create(ctx, body.engine));
      return true;
    }

    if (p === '/api/chat/sessions/remove' && req.method === 'POST') {
      const body = await ctx.parseJsonBody(req).catch(() => ({}));
      ctx.sendJson(res, { ok: manager.remove(ctx, String(body.id || '')) });
      return true;
    }

    if (p === '/api/chat/history' && req.method === 'GET') {
      const h = manager.history(ctx, parsed.searchParams.get('session') || '');
      if (!h) ctx.sendError(res, 'no such session', 404);
      else ctx.sendJson(res, h);
      return true;
    }

    if (p === '/api/chat/send' && req.method === 'POST') {
      try {
        const body = await ctx.parseJsonBody(req);
        const r = manager.send(ctx, String(body.sessionId || ''), body.message);
        if (r.error) ctx.sendError(res, r.error, r.busy ? 409 : 400);
        else ctx.sendJson(res, r, 202);
      } catch (e) {
        ctx.sendError(res, e.message, 500);
      }
      return true;
    }

    if (p === '/api/chat/stop' && req.method === 'POST') {
      const body = await ctx.parseJsonBody(req).catch(() => ({}));
      ctx.sendJson(res, { ok: manager.stop(ctx, String(body.sessionId || '')) });
      return true;
    }

    if (p === '/api/chat/stream' && req.method === 'GET') {
      const id = parsed.searchParams.get('session') || '';
      // onClose drops the subscriber immediately — otherwise dead streams
      // linger in the set until the session's next broadcast (EventSource
      // auto-reconnect makes them accumulate on flaky networks).
      const stream = ctx.sse.openStream(req, res, {
        onClose: (s) => manager.unsubscribe(ctx, id, s),
      });
      if (!manager.subscribe(ctx, id, stream)) {
        stream.send('error', { message: 'no such session' });
        stream.close();
      }
      return true;
    }

    return false;
  },
};
