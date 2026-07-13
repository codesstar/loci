/**
 * lib/auth.js — single-user bearer-token auth. Zero dependencies.
 *
 * Loopback requests are exempt so the local `loci` launcher and same-machine
 * browser keep their zero-friction flow. Anything else (LAN bind, reverse
 * proxy like `tailscale serve`) must present the token, via:
 *   X-Loci-Token: <token>       — normal fetches (the SPA injects this)
 *   Authorization: Bearer <t>   — curl / API clients
 *   ?token=<t>                  — EventSource, first-visit bootstrap links
 *
 * The token is generated on first start and stored in .loci/dashboard/.token
 * (gitignored, never served). `loci token` prints it.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKEN_FILE = path.join(__dirname, '..', '.token');

function loadOrCreateToken() {
  try {
    const t = fs.readFileSync(TOKEN_FILE, 'utf-8').trim();
    if (t) return t;
  } catch { /* first run */ }
  const t = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(TOKEN_FILE, t + '\n', { mode: 0o600 });
  return t;
}

const TOKEN = loadOrCreateToken();

function isLoopback(req) {
  const a = (req.socket && req.socket.remoteAddress) || '';
  if (a !== '127.0.0.1' && a !== '::1' && a !== '::ffff:127.0.0.1') return false;
  // A reverse proxy (e.g. `tailscale serve`) connects from loopback but
  // forwards a remote client — the exemption must not extend to it.
  if (req.headers['x-forwarded-for']) return false;
  return true;
}

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function tokenFromCookie(req) {
  const m = /(?:^|;\s*)loci_token=([^;]+)/.exec(req.headers.cookie || '');
  try { return m ? decodeURIComponent(m[1]) : ''; } catch { return ''; }
}

// Returns { ok, via } — `via: 'query'` tells the server to mint the session
// cookie. The cookie matters because subresources (script/link/img tags)
// are fetched by the browser itself: they can't carry a custom header or a
// ?token=, so without a cookie the SPA's own JS/CSS 401s behind a proxy and
// the page renders blank.
function authorize(req, parsedUrl) {
  if (isLoopback(req)) return { ok: true, via: 'loopback' };
  const bearer = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  const header = req.headers['x-loci-token'] || bearer;
  if (header && timingSafeEqual(header, TOKEN)) return { ok: true, via: 'header' };
  const query = (parsedUrl && parsedUrl.searchParams.get('token')) || '';
  if (query && timingSafeEqual(query, TOKEN)) return { ok: true, via: 'query' };
  const cookie = tokenFromCookie(req);
  if (cookie && timingSafeEqual(cookie, TOKEN)) return { ok: true, via: 'cookie' };
  return { ok: false };
}

function sessionCookie() {
  // one year; HttpOnly so page JS never sees it; Lax survives normal navigation
  return 'loci_token=' + encodeURIComponent(TOKEN) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000';
}

// Never served, even to authenticated clients.
function isForbiddenPath(pathname) {
  const p = String(pathname || '').toLowerCase();
  return p === '/.token' || p.startsWith('/.git') || p.startsWith('/lib/') || p.includes('..');
}

module.exports = { TOKEN, TOKEN_FILE, authorize, sessionCookie, isLoopback, isForbiddenPath };
