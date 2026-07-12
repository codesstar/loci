/**
 * lib/reminders.js — server-side reminder scheduler.
 *
 * Line-for-line port of the browser reminder engine in index.html
 * (upcomingTimedItems + scanReminders): same two data sources — timed
 * calendar events AND tasks carrying date+startTime, read straight from the
 * task pool — same dedupe key (date#startKey#title), same lead/grace
 * semantics. Runs every 30s regardless of any browser tab, and delivers
 * through Web Push (lib/push/webpush.js) so a locked phone still buzzes.
 *
 * The browser engine stays: desktop-open gets instant in-page notifications,
 * each side keeps its own fired-set (one ping per device is by design).
 *
 * State under <brain>/.loci/push/:
 *   fired.json     {date, ids[]} — reset when the day changes, survives restarts
 *   settings.json  {lead} — minutes before start (0/15/30), default 15
 * Quiet hours honor config.yml wellbeing (wind_down_time → wake_up_time).
 */

const fs = require('fs');
const path = require('path');

const SCAN_MS = 30000;
// Fires from (start - lead) until 10min past start: covers the exact moment,
// the 30s scan grid, and "Mac just woke up, item started minutes ago" catch-up.
const GRACE_MS = 10 * 60 * 1000;
const LEAD_OPTIONS = [0, 15, 30];

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
  return { lead: LEAD_OPTIONS.includes(s.lead) ? s.lead : 15 };
}

function saveSettings(next) {
  const merged = { ...loadSettings(), ...next };
  if (!LEAD_OPTIONS.includes(merged.lead)) merged.lead = 15;
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

// Same sources + dedupe as the browser's upcomingTimedItems().
function upcomingTimedItems(now) {
  const out = [];
  const seen = new Set();
  const dayKeys = [];
  for (let d = 0; d <= 1; d++) {
    dayKeys.push(dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + d)));
  }
  const add = (key, startKey, title) => {
    const dedupe = key + '#' + startKey + '#' + (title || '');
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    const [y, m, dd] = key.split('-').map(Number);
    const start = new Date(y, m - 1, dd, 0, 0, 0, 0);
    start.setMinutes(startKey);
    out.push({ id: dedupe, title: title || '日程', startAt: start });
  };

  // Source 1: calendar events
  const cal = readJson(path.join(st.root, 'tasks', 'calendar.json'), {});
  for (const key of dayKeys) {
    const evs = cal[key];
    if (!Array.isArray(evs)) continue;
    for (const ev of evs) {
      if (!ev || typeof ev.startKey !== 'number') continue; // untimed → skip
      add(key, ev.startKey, ev.title);
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
    add(tk.date, startKey, tk.text || tk.title);
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
  const leadMs = loadSettings().lead * 60000;
  let dirty = false;

  for (const item of upcomingTimedItems(now)) {
    const startMs = item.startAt.getTime();
    const fireAt = startMs - leadMs;
    if (nowMs >= fireAt && nowMs < startMs + GRACE_MS && !fired.has(item.id)) {
      fired.add(item.id);
      dirty = true;
      const mins = Math.round((startMs - nowMs) / 60000);
      const hh = String(item.startAt.getHours()).padStart(2, '0');
      const mm = String(item.startAt.getMinutes()).padStart(2, '0');
      const body = mins < 0 ? `已开始 · ${hh}:${mm}` : mins === 0 ? `现在 · ${hh}:${mm}` : `${mins} 分钟后 · ${hh}:${mm}`;
      try {
        await webpush.sendToAll({ title: item.title, body, tag: item.id, url: '/' });
        console.log(`reminders: pushed "${item.title}" (${body})`);
      } catch (e) {
        console.error('reminders: push failed:', e.message);
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
