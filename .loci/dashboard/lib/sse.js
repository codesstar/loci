/**
 * lib/sse.js — minimal Server-Sent Events helper. Zero dependencies.
 *
 * const stream = sse.openStream(req, res);
 * stream.send('event-name', { any: 'json' });   // → false once the client is gone
 * stream.close();
 *
 * A comment-line heartbeat keeps proxies (tailscale serve, etc.) from timing
 * out idle streams. EventSource on the client reconnects automatically.
 */

function openStream(req, res, opts) {
  const heartbeatMs = (opts && opts.heartbeatMs) || 25000;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { /* connection gone; close() follows */ }
  }, heartbeatMs);
  if (heartbeat.unref) heartbeat.unref();

  const stream = {
    closed: false,
    send(event, data) {
      if (stream.closed) return false;
      try {
        if (event) res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data === undefined ? null : data)}\n\n`);
        return true;
      } catch {
        stream.closed = true;
        return false;
      }
    },
    close() {
      stream.closed = true;
      clearInterval(heartbeat);
      try { res.end(); } catch { /* already closed */ }
    },
  };

  req.on('close', () => {
    stream.closed = true;
    clearInterval(heartbeat);
  });

  return stream;
}

module.exports = { openStream };
