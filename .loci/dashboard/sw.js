/**
 * sw.js — Loci service worker. Push only, no offline caching (deliberate:
 * a stale cached copy of the 20k-line SPA is worse than no cache).
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* non-JSON payload */ }
  event.waitUntil(self.registration.showNotification(data.title || 'Loci', {
    body: data.body || '',
    tag: data.tag || undefined,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // A specific destination (e.g. a maps link for a located reminder)
      // always opens there, even with a dashboard tab already open —
      // otherwise this would just focus that tab and go nowhere. The
      // "focus what's already open" shortcut is only for the plain '/' case.
      if (url !== '/') return self.clients.openWindow(url);
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
