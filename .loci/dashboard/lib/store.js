/**
 * lib/store.js — write-safety primitives for brain files. Zero dependencies.
 *
 * Two tools, shared by the dashboard server (and requirable from scripts/):
 *   atomicWriteSync(file, data[, options])  — tmp + rename full-file replace;
 *     readers never see a half-written file. Worst case under a racing writer
 *     is one lost update, never a corrupt file.
 *   withLock(lockDir, fn)                   — cross-process advisory lock via
 *     mkdir (atomic on every platform). Serializes read-modify-write sections
 *     across the dashboard, CLI writers, and spawned agents.
 */

const fs = require('fs');
const path = require('path');

const LOCK_TIMEOUT_MS = 5000; // give up waiting and proceed (atomic write still protects integrity)
// A holder silent this long is presumed dead. Kept just ABOVE the wait
// timeout: real critical sections are millisecond-scale, so anything older
// than the longest possible legitimate wait is a crash leftover — reap it
// instead of letting every writer burn the full 5s timeout on a dead lock.
const LOCK_STALE_MS = 10000;
const LOCK_RETRY_MS = 50;

function atomicWriteSync(filePath, data, options) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, '.' + path.basename(filePath) + '.' + process.pid + '.' + Date.now() + '.tmp');
  try {
    fs.writeFileSync(tmp, data, options);
    fs.renameSync(tmp, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* already renamed or never created */ }
    throw e;
  }
}

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* busy fallback — contention is rare and short */ }
  }
}

function withLock(lockDir, fn) {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let acquired = false;
  while (!acquired) {
    try {
      fs.mkdirSync(lockDir, { recursive: false });
      acquired = true;
    } catch (e) {
      if (e.code === 'ENOENT') {
        // parent missing — create it and retry the atomic mkdir
        fs.mkdirSync(path.dirname(lockDir), { recursive: true });
        continue;
      }
      if (e.code !== 'EEXIST') throw e;
      try {
        const st = fs.statSync(lockDir);
        if (Date.now() - st.mtimeMs > LOCK_STALE_MS) {
          try { fs.rmdirSync(lockDir); } catch { /* raced another reaper */ }
          continue;
        }
      } catch { continue; /* lock vanished between mkdir and stat — retry */ }
      if (Date.now() > deadline) {
        console.error(`store: lock timeout on ${lockDir} — writing without lock`);
        return fn();
      }
      sleepSync(LOCK_RETRY_MS);
    }
  }
  try {
    return fn();
  } finally {
    try { fs.rmdirSync(lockDir); } catch { /* reaped as stale — nothing to do */ }
  }
}

module.exports = { atomicWriteSync, withLock };
