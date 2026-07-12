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
  webpushLib.setVapidDetails('mailto:loci@localhost', keys.publicKey, keys.privateKey);
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

async function sendToAll(payload) {
  if (!webpushLib) return { sent: 0, error: 'web-push not installed' };
  vapidKeys();
  const subs = listSubs();
  const body = JSON.stringify(payload);
  const dead = [];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpushLib.sendNotification(s.subscription, body);
      sent += 1;
    } catch (e) {
      const code = e && e.statusCode;
      if (code === 404 || code === 410) dead.push(s.subscription.endpoint);
      else console.error('webpush: send failed:', code || e.message);
    }
  }));
  if (dead.length) {
    saveSubs(listSubs().filter(s => !dead.includes(s.subscription.endpoint)));
    console.log(`webpush: pruned ${dead.length} dead subscription(s)`);
  }
  return { sent, pruned: dead.length };
}

module.exports = { init, available, publicKey, subscribe, unsubscribe, count, sendToAll };
