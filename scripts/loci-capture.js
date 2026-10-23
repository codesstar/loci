#!/usr/bin/env node
'use strict';
// loci-capture — a local pass-through proxy that records the EXACT request body
// Claude Code sends to the model, then forwards it upstream untouched.
//
// Credentials are forwarded but never written to disk: every auth-bearing
// header is redacted before the dump is saved.
//
//   node scripts/loci-capture.js            start on :8788, capture one request, exit
//   node scripts/loci-capture.js --keep     stay up and capture every request
//   node scripts/loci-capture.js --port N
//
// Then in another terminal:
//   ANTHROPIC_BASE_URL=http://localhost:8788 claude -p "hi"

const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const PORT = Number(flag('--port') || 8788);
const KEEP = args.includes('--keep');
const UPSTREAM = 'api.anthropic.com';
const OUT_DIR = path.join(os.homedir(), '.loci', 'inspect');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SECRET = /^(authorization|x-api-key|proxy-authorization|cookie|anthropic-api-key)$/i;
const redact = (headers) => {
  const safe = {};
  for (const [k, v] of Object.entries(headers)) safe[k] = SECRET.test(k) ? '[redacted]' : v;
  return safe;
};

let captured = 0;

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks);

    // Record only the model calls, not auxiliary endpoints.
    if (req.method === 'POST' && req.url.includes('/v1/messages') && raw.length) {
      try {
        const body = JSON.parse(raw.toString('utf8'));
        captured += 1;
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const file = path.join(OUT_DIR, `payload-${stamp}-${captured}.json`);
        fs.writeFileSync(file, JSON.stringify({
          capturedAt: new Date().toISOString(),
          url: req.url,
          headers: redact(req.headers),
          body
        }, null, 2));
        const B = (x) => Buffer.byteLength(JSON.stringify(x || ''), 'utf8');
        console.log(`\n捕获 #${captured}  ${file}`);
        console.log(`  model     ${body.model}`);
        console.log(`  system    ${B(body.system)} 字节`);
        console.log(`  messages  ${(body.messages || []).length} 条, ${B(body.messages)} 字节`);
        console.log(`  tools     ${(body.tools || []).length} 个, ${B(body.tools)} 字节`);
        console.log(`  合计      ${(raw.length / 1024).toFixed(1)} KB`);
      } catch (e) {
        console.error('  (解析失败，仍照常转发):', e.message);
      }
    }

    const headers = { ...req.headers, host: UPSTREAM };
    delete headers['content-length'];
    const upstream = https.request({
      hostname: UPSTREAM, port: 443, path: req.url, method: req.method, headers
    }, (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
      up.on('end', () => {
        if (!KEEP && captured > 0) {
          console.log('\n已捕获，代理退出。');
          setTimeout(() => process.exit(0), 150);
        }
      });
    });
    upstream.on('error', (e) => {
      console.error('转发失败:', e.message);
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('proxy error: ' + e.message);
    });
    if (raw.length) upstream.write(raw);
    upstream.end();
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`代理已启动  http://localhost:${PORT}  →  https://${UPSTREAM}`);
  console.log(`模式: ${KEEP ? '持续捕获' : '捕获一次后退出'}`);
  console.log(`输出: ${OUT_DIR}/payload-*.json   (凭证字段已脱敏，不落盘)`);
  console.log(`\n在另一个终端跑：`);
  console.log(`  ANTHROPIC_BASE_URL=http://localhost:${PORT} claude -p "hi"\n`);
});
