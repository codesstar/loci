/**
 * lib/routes/push.js — Web Push subscription API + reminder scheduler boot.
 *
 *   GET  /api/push/status        {available, count, publicKey, lead, quietHours}
 *   POST /api/push/subscribe     {subscription} (from PushManager.subscribe)
 *   POST /api/push/unsubscribe   {endpoint}
 *   POST /api/push/settings      {lead: 0|15|30}
 *   POST /api/push/test          sends a test notification to every device
 *
 * init(ctx) runs once at server start: boots the server-side reminder
 * scheduler (lib/reminders.js) so timed tasks/events push to phones with no
 * browser tab open.
 */

const webpush = require('../push/webpush.js');
const reminders = require('../reminders.js');

module.exports = {
  init(ctx) {
    webpush.init(ctx);
    reminders.start(ctx, webpush);
  },

  async handle(req, res, parsed, ctx) {
    const p = parsed.pathname;
    if (!p.startsWith('/api/push/')) return false;
    webpush.init(ctx);

    if (p === '/api/push/status' && req.method === 'GET') {
      ctx.sendJson(res, {
        available: webpush.available(),
        count: webpush.count(),
        publicKey: webpush.available() ? webpush.publicKey() : null,
        lead: reminders.loadSettings().lead,
        hint: webpush.available() ? null : '手机推送未启用：在电脑上运行 cd .loci/dashboard && npm install web-push 然后重启 dashboard',
      });
      return true;
    }

    if (p === '/api/push/subscribe' && req.method === 'POST') {
      try {
        const body = await ctx.parseJsonBody(req);
        const r = webpush.subscribe(body.subscription, req.headers['user-agent']);
        if (r.error) ctx.sendError(res, r.error);
        else ctx.sendJson(res, r);
      } catch (e) { ctx.sendError(res, e.message, 500); }
      return true;
    }

    if (p === '/api/push/unsubscribe' && req.method === 'POST') {
      const body = await ctx.parseJsonBody(req).catch(() => ({}));
      ctx.sendJson(res, webpush.unsubscribe(String(body.endpoint || '')));
      return true;
    }

    if (p === '/api/push/settings' && req.method === 'POST') {
      const body = await ctx.parseJsonBody(req).catch(() => ({}));
      ctx.sendJson(res, reminders.saveSettings({ lead: Number(body.lead) }));
      return true;
    }

    if (p === '/api/push/test' && req.method === 'POST') {
      if (!webpush.available()) {
        ctx.sendError(res, 'web-push not installed — cd .loci/dashboard && npm install web-push', 501);
        return true;
      }
      const r = await webpush.sendToAll({
        title: 'Loci 测试推送',
        body: '收到这条说明手机提醒已经打通',
        tag: 'loci-test-' + Date.now(),
        url: '/',
      });
      ctx.sendJson(res, r);
      return true;
    }

    return false;
  },
};
