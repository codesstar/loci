/**
 * lib/reminders.js — server-side reminder scheduler.
 *
 * Line-for-line port of the browser reminder engine in index.html
 * (upcomingTimedItems + scanReminders): same three data sources — timed
 * calendar events, tasks carrying date+startTime (read straight from the
 * task pool), and recurring rules (tasks/recurring.json, computed live for
 * today/tomorrow's weekday) — same dedupe key (date#startKey#title), same
 * lead/grace semantics. Runs every 30s regardless of any browser tab, and
 * delivers through Web Push (lib/push/webpush.js) so a locked phone still buzzes.
 *
 * The browser engine stays: desktop-open gets instant in-page notifications,
 * each side keeps its own fired-set (one ping per device is by design).
 *
 * State under <brain>/.loci/push/:
 *   fired.json     {date, ids[]} — reset when the day changes, survives restarts
 *   settings.json  {leads[]} — extra heads-up minutes before start (15/30, both
 *                  OK), default [15]. "At the moment" (offset 0) is implicit
 *                  and always fires once push is on — it is not a choice.
 * Quiet hours honor config.yml wellbeing (wind_down_time → wake_up_time).
 */

const fs = require('fs');
const path = require('path');

const SCAN_MS = 30000;
// Fires from (start - offset) until 10min past start: covers the exact moment,
// the 30s scan grid, and "Mac just woke up, item started minutes ago" catch-up.
const GRACE_MS = 10 * 60 * 1000;
const LEAD_OPTIONS = [15, 30];   // optional extra heads-up; 0 ("at the moment") is implicit

let st = null;

function pushDir() { return path.join(st.root, '.loci', 'push'); }
function firedFile() { return path.join(pushDir(), 'fired.json'); }
function settingsFile() { return path.join(pushDir(), 'settings.json'); }

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}

function loadSettings() {
  const s = readJson(settingsFile(), {});
  if (Array.isArray(s.leads)) return { leads: s.leads.filter(l => LEAD_OPTIONS.includes(l)) };
  // migrate the old single-value {lead} shape; its 0 ("at the moment") is
  // dropped since that's implicit now, not a selectable option.
  if (LEAD_OPTIONS.includes(s.lead)) return { leads: [s.lead] };
  return { leads: [15] };
}

function saveSettings(next) {
  const merged = { ...loadSettings(), ...next };
  merged.leads = Array.isArray(merged.leads) ? [...new Set(merged.leads.filter(l => LEAD_OPTIONS.includes(l)))].sort((a, b) => a - b) : [15];
  st.store.atomicWriteSync(settingsFile(), JSON.stringify(merged, null, 2) + '\n', 'utf-8');
  return merged;
}

// Minimal YAML peek — config.yml is simple enough for a line scan.
function quietWindow() {
  try {
    const text = fs.readFileSync(path.join(st.root, '.loci', 'config.yml'), 'utf-8');
    const block = text.split(/^wellbeing:/m)[1] || '';
    const get = (key, dflt) => {
      const m = block.match(new RegExp('^\\s+' + key + ':\\s*"?([^"\\n#]+)"?', 'm'));
      return m ? m[1].trim() : dflt;
    };
    if (/^\s+enabled:\s*false/m.test(block)) return null;
    return { from: get('wind_down_time', '22:30'), to: get('wake_up_time', '07:00') };
  } catch { return { from: '22:30', to: '07:00' }; }
}

function minutesOf(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function inQuietHours(now) {
  const q = quietWindow();
  if (!q) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const from = minutesOf(q.from);
  const to = minutesOf(q.to);
  return from <= to ? (cur >= from && cur < to) : (cur >= from || cur < to);
}

// Server-side twin of the client's mapLinks() (index.html) — amap only,
// since that's the one link a push notification actually jumps to on tap.
function amapUrl(location) {
  return 'https://uri.amap.com/search?keyword=' + encodeURIComponent(String(location).trim()) + '&callnative=1';
}

// Same sources + dedupe as the browser's upcomingTimedItems().
function upcomingTimedItems(now) {
  const out = [];
  const seen = new Set();
  const dayKeys = [];
  for (let d = 0; d <= 1; d++) {
    dayKeys.push(dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)));
  }
  const add = (key, startKey, title, kind, location) => {
    const dedupe = key + '#' + startKey + '#' + (title || '');
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    const [y, m, dd] = key.split('-').map(Number);
    const start = new Date(y, m - 1, dd, 0, 0, 0, 0);
    start.setMinutes(startKey);
    out.push({ id: dedupe, title: title || '日程', startAt: start, kind, location: location || null });
  };

  // Source 1: calendar events
  const cal = readJson(path.join(st.root, 'tasks', 'calendar.json'), {});
  for (const key of dayKeys) {
    const evs = cal[key];
    if (!Array.isArray(evs)) continue;
    for (const ev of evs) {
      if (!ev || typeof ev.startKey !== 'number') continue; // untimed → skip
      add(key, ev.startKey, ev.title, 'event', ev.location);
    }
  }

  // Source 2: timed tasks (date + startTime), read straight from the task pool
  const db = readJson(path.join(st.root, 'tasks', 'tasks.json'), {});
  const records = Array.isArray(db) ? db : (db.tasks || []);
  for (const tk of records) {
    if (!tk || tk.status === 'archived' || tk.status === 'done' || tk.done) continue;
    if (!tk.date || !tk.startTime || !dayKeys.includes(tk.date)) continue;
    const parts = String(tk.startTime).split(':');
    const startKey = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
    add(tk.date, startKey, tk.text || tk.title, 'task', tk.location);
  }

  // Source 3: recurring rules (standing weekly reminders — "drink water
  // Mon-Fri"), not tied to one date. Computed live for today/tomorrow rather
  // than materialized into calendar.json/tasks.json.
  const recurring = readJson(path.join(st.root, 'tasks', 'recurring.json'), {});
  const rules = Array.isArray(recurring.rules) ? recurring.rules : [];
  if (rules.length) {
    for (const key of dayKeys) {
      const [y, m, dd] = key.split('-').map(Number);
      const jsDay = new Date(y, m - 1, dd).getDay();       // 0=Sun..6=Sat
      const isoDay = jsDay === 0 ? 7 : jsDay;               // 1=Mon..7=Sun
      for (const rule of rules) {
        if (!rule || rule.active === false) continue;
        if (!Array.isArray(rule.days) || !rule.days.includes(isoDay)) continue;
        for (const t of (rule.times || [])) {
          const parts = String(t).split(':');
          const startKey = (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
          add(key, startKey, rule.title, 'recurring');
        }
      }
    }
  }
  return out;
}

function loadFired(todayKey) {
  const f = readJson(firedFile(), {});
  return new Set(f.date === todayKey && Array.isArray(f.ids) ? f.ids : []);
}

function saveFired(todayKey, fired) {
  st.store.atomicWriteSync(firedFile(), JSON.stringify({ date: todayKey, ids: [...fired] }, null, 2) + '\n', 'utf-8');
}

async function scan() {
  const webpush = st.webpush;
  if (!webpush.available() || webpush.count() === 0) return; // nobody to notify
  const now = new Date();
  if (inQuietHours(now)) return;

  const todayKey = dateKey(now);
  const fired = loadFired(todayKey);
  const nowMs = now.getTime();
  // "At the moment" (offset 0) always fires; 15/30 are optional extra
  // heads-up and both can be on at once. Same rule for tasks and events —
  // mirrors the browser engine's scanReminders() in index.html.
  const offsets = [0, ...loadSettings().leads];
  let dirty = false;

  for (const item of upcomingTimedItems(now)) {
    const startMs = item.startAt.getTime();
    const hh = String(item.startAt.getHours()).padStart(2, '0');
    const mm = String(item.startAt.getMinutes()).padStart(2, '0');
    for (const offset of offsets) {
      const fireAt = startMs - offset * 60000;
      const fireId = item.id + '#' + offset;
      if (nowMs >= fireAt && nowMs < startMs + GRACE_MS && !fired.has(fireId)) {
        fired.add(fireId);
        dirty = true;
        const mins = Math.round((startMs - nowMs) / 60000);
        let body = offset === 0
          ? (item.kind === 'task' ? (mins < 0 ? `已到截止 · ${hh}:${mm}` : `截止 · ${hh}:${mm}`) : (mins < 0 ? `已开始 · ${hh}:${mm}` : `现在 · ${hh}:${mm}`))
          : item.kind === 'task'
          ? `${offset} 分钟后到期 · ${hh}:${mm}`
          : `${offset} 分钟后 · ${hh}:${mm}`;
        // Has a location → tap the notification to jump straight into 高德
        // (amap) navigation instead of back to the dashboard. Picked amap
        // specifically because Google/Apple Maps are weak-to-unusable from
        // mainland China; see the reminder-nav-link-preview.html A/B check.
        const url = item.location ? amapUrl(item.location) : '/';
        if (item.location) body += ` · ${item.location}`;
        try {
          await webpush.sendToAll({ title: item.title, body, tag: fireId, url });
          console.log(`reminders: pushed "${item.title}" (${body})`);
        } catch (e) {
          console.error('reminders: push failed:', e.message);
        }
      }
    }
  }
  if (dirty) saveFired(todayKey, fired);
}

function start(ctx, webpush) {
  if (st) return;
  st = { root: ctx.LOCI_ROOT, store: ctx.store, webpush };
  const timer = setInterval(() => { scan().catch(e => console.error('reminders:', e.message)); }, SCAN_MS);
  if (timer.unref) timer.unref();
}

module.exports = { start, loadSettings, saveSettings, upcomingTimedItems: (now) => upcomingTimedItems(now || new Date()) };
