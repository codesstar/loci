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

function authorize(req, parsedUrl) {
  if (isLoopback(req)) return true;
  const bearer = String(req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  const presented = req.headers['x-loci-token'] || bearer
    || (parsedUrl && parsedUrl.searchParams.get('token')) || '';
  return !!presented && timingSafeEqual(presented, TOKEN);
}

// Never served, even to authenticated clients.
function isForbiddenPath(pathname) {
  const p = String(pathname || '').toLowerCase();
  return p === '/.token' || p.startsWith('/.git') || p.startsWith('/lib/') || p.includes('..');
}

module.exports = { TOKEN, TOKEN_FILE, authorize, isLoopback, isForbiddenPath };
