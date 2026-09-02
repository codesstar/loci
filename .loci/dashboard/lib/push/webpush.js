/**
 * lib/push/webpush.js — Web Push delivery. The ONE optional-dependency
 * exception to the zero-npm rule: RFC 8291 payload encryption (ECDH P-256 +
 * HKDF + aes128gcm) against Apple/Google's opaque push endpoints is not worth
 * hand-rolling. Feature-detected: without `web-push` installed the dashboard
 * runs exactly as before and the UI shows how to enable phone push
 * (cd .loci/dashboard && npm install web-push).
 *
 * State under <brain>/.loci/push/:
 *   vapid.json          keypair, generated on first use
 *   subscriptions.json  [{subscription, ua, addedAt}] — multi-device;
 *                       endpoints answering 404/410 are pruned automatically.
 */

const fs = require('fs');
const path = require('path');

let webpushLib = null;
try { webpushLib = require('web-push'); } catch { /* optional — not installed */ }

let st = null;

function init(ctx) {
  if (st) return;
  st = { root: ctx.LOCI_ROOT, store: ctx.store, vapid: null };
}

function pushDir() { return path.join(st.root, '.loci', 'push'); }
function subsFile() { return path.join(pushDir(), 'subscriptions.json'); }
function vapidFile() { return path.join(pushDir(), 'vapid.json'); }

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}

function available() { return !!webpushLib; }

function vapidKeys() {
  if (!webpushLib) return null;
  if (st.vapid) return st.vapid;
  let keys = readJson(vapidFile(), null);
  if (!keys || !keys.publicKey || !keys.privateKey) {
    keys = webpushLib.generateVAPIDKeys();
    st.store.atomicWriteSync(vapidFile(), JSON.stringify(keys, null, 2) + '\n', 'utf-8');
  }
  // Apple's push service 403s VAPID subjects it deems invalid — a bogus
  // localhost mailto was enough. A real https: URL passes.
  webpushLib.setVapidDetails('https://github.com/codesstar/loci', keys.publicKey, keys.privateKey);
  st.vapid = keys;
  return keys;
}

function publicKey() {
  const k = vapidKeys();
  return k ? k.publicKey : null;
}

function listSubs() { return readJson(subsFile(), []); }
function count() { return listSubs().length; }

function saveSubs(subs) {
  st.store.atomicWriteSync(subsFile(), JSON.stringify(subs, null, 2) + '\n', 'utf-8');
}

function subscribe(subscription, ua) {
  if (!subscription || !subscription.endpoint) return { error: 'invalid subscription' };
  const subs = listSubs().filter(s => s.subscription.endpoint !== subscription.endpoint);
  subs.push({ subscription, ua: String(ua || '').slice(0, 200), addedAt: new Date().toISOString() });
  saveSubs(subs);
  return { ok: true, count: subs.length };
}

function unsubscribe(endpoint) {
  const subs = listSubs();
  const kept = subs.filter(s => s.subscription.endpoint !== endpoint);
  saveSubs(kept);
  return { ok: true, removed: subs.length - kept.length, count: kept.length };
}

// A push endpoint that hangs must not stall the whole batch (and the caller's
// scan loop behind it) — web-push has no default request timeout.
const SEND_TIMEOUT_MS = 10000;
// Transient failures tolerated per subscription before it's dropped for good.
const MAX_FAILS = 5;

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('push send timeout')), ms);
    if (t.unref) t.unref();
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function sendToAll(payload) {
  if (!webpushLib) return { sent: 0, error: 'web-push not installed' };
  vapidKeys();
  const subs = listSubs();
  const body = JSON.stringify(payload);
  const dead = [];
  const failCounts = new Map(); // endpoint → new failCount (0 = clear)
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    const endpoint = s.subscription.endpoint;
    try {
      await withTimeout(webpushLib.sendNotification(s.subscription, body), SEND_TIMEOUT_MS);
      sent += 1;
      if (s.failCount) failCounts.set(endpoint, 0);
    } catch (e) {
      const code = e && e.statusCode;
      // 404/410: endpoint gone. 403/401: VAPID key mismatch (subscription was
      // made with different keys — e.g. .loci/push/ regenerated); it will NEVER
      // succeed, and left in place it burns a full HTTPS request per reminder
      // forever ("webpush: send failed" on repeat).
      if (code === 404 || code === 410 || code === 403 || code === 401) {
        dead.push(endpoint);
      } else {
        const fails = (s.failCount || 0) + 1;
        if (fails >= MAX_FAILS) dead.push(endpoint);
        else failCounts.set(endpoint, fails);
        let host = ''; try { host = new URL(endpoint).host; } catch { /* opaque */ }
        console.error(`webpush: send failed (${host}, ${fails}/${MAX_FAILS}):`, code || e.message);
      }
    }
  }));
  if (dead.length || failCounts.size) {
    const kept = listSubs()
      .filter(s => !dead.includes(s.subscription.endpoint))
      .map(s => {
        const fc = failCounts.get(s.subscription.endpoint);
        if (fc === undefined) return s;
        if (fc === 0) { const { failCount, ...rest } = s; return rest; }
        return { ...s, failCount: fc };
      });
    saveSubs(kept);
    if (dead.length) console.log(`webpush: pruned ${dead.length} dead subscription(s)`);
  }
  return { sent, pruned: dead.length };
}

module.exports = { init, available, publicKey, subscribe, unsubscribe, count, sendToAll };
