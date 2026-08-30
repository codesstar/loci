/**
 * lib/routes/recurring.js — Recurring reminders API.
 *
 * Standing rules ("drink water Mon–Fri at 9/14/17") — not tied to one date,
 * so they live as their own list in tasks/recurring.json instead of being
 * materialized into tasks.json or calendar.json. Both reminder scanners
 * (browser scanReminders() in index.html, server-side lib/reminders.js)
 * read this file and compute today's instances live from the rule.
 *
 *   POST /api/recurring/add     {title, days:[1-7 Mon..Sun], times:["HH:MM",...]}
 *   POST /api/recurring/toggle  {id}   — flip active on/off
 *   POST /api/recurring/remove  {id}
 *
 * (data.recurring in GET /api/data — read side — comes from buildRecurring()
 * in server.js, alongside buildTasks/buildPeople/etc.)
 */

const fs = require('fs');
const path = require('path');

function filePath(ctx) { return path.join(ctx.LOCI_ROOT, 'tasks', 'recurring.json'); }
// Same cross-process lock dir as server.js's writeLockDir() — serializes this
// route against the dashboard's other writers and scripts/loci-task.js.
function lockDir(ctx) { return path.join(ctx.LOCI_ROOT, '.loci', '.write-lock'); }

function readRules(ctx) {
  try {
    const f = filePath(ctx);
    if (!fs.existsSync(f)) return [];
    const parsed = JSON.parse(fs.readFileSync(f, 'utf-8'));
    return Array.isArray(parsed.rules) ? parsed.rules : [];
  } catch { return []; }
}

function writeRules(ctx, rules) {
  ctx.store.atomicWriteSync(filePath(ctx), JSON.stringify({ rules }, null, 2) + '\n', 'utf-8');
}

function genId() {
  return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

module.exports = {
  async handle(req, res, parsed, ctx) {
    const p = parsed.pathname;
    if (!p.startsWith('/api/recurring/')) return false;

    if (p === '/api/recurring/add' && req.method === 'POST') {
      const body = await ctx.parseJsonBody(req).catch(() => ({}));
      const title = String(body.title || '').trim();
      if (!title) { ctx.sendError(res, 'Missing title'); return true; }
      const days = Array.isArray(body.days) ? [...new Set(body.days.map(Number).filter(d => d >= 1 && d <= 7))].sort((a, b) => a - b) : [];
      if (!days.length) { ctx.sendError(res, 'Missing days'); return true; }
      const times = Array.isArray(body.times) ? [...new Set(body.times.map(String).filter(t => /^\d{2}:\d{2}$/.test(t)))].sort() : [];
      if (!times.length) { ctx.sendError(res, 'Missing times'); return true; }
      const rule = { id: genId(), title, days, times, active: true, createdAt: new Date().toISOString() };
      ctx.store.withLock(lockDir(ctx), () => {
        const rules = readRules(ctx);
        rules.push(rule);
        writeRules(ctx, rules);
      });
      ctx.sendJson(res, { ok: true, rule });
      return true;
    }

    if (p === '/api/recurring/toggle' && req.method === 'POST') {
      const body = await ctx.parseJsonBody(req).catch(() => ({}));
      if (!body.id) { ctx.sendError(res, 'Missing id'); return true; }
      let updated = null;
      ctx.store.withLock(lockDir(ctx), () => {
        const rules = readRules(ctx);
        const rule = rules.find(r => r.id === body.id);
        if (rule) { rule.active = !rule.active; updated = rule; writeRules(ctx, rules); }
      });
      if (!updated) { ctx.sendError(res, 'Rule not found', 404); return true; }
      ctx.sendJson(res, { ok: true, rule: updated });
      return true;
    }

    if (p === '/api/recurring/remove' && req.method === 'POST') {
      const body = await ctx.parseJsonBody(req).catch(() => ({}));
      if (!body.id) { ctx.sendError(res, 'Missing id'); return true; }
      let removed = false;
      ctx.store.withLock(lockDir(ctx), () => {
        const rules = readRules(ctx);
        const next = rules.filter(r => r.id !== body.id);
        removed = next.length !== rules.length;
        if (removed) writeRules(ctx, next);
      });
      ctx.sendJson(res, { ok: removed });
      return true;
    }

    return false;
  },
};
