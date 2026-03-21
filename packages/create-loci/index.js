#!/usr/bin/env node
// create-loci — Cross-platform installer for Loci (Memory Palace for AI)
// Usage: npx create-loci [target-dir]
// Zero dependencies. Works on Mac, Linux, and Windows.

const { execSync, exec } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

// ─── Config ─────────────────────────────────────────────────────────────────
const REPO = 'codesstar/loci';
const BRANCH = 'main';
const DEFAULT_DIR = path.join(os.homedir(), 'loci');

// ─── Colors (works on all terminals including Windows) ──────────────────────
const bold  = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const cyan  = (s) => `\x1b[36m${s}\x1b[0m`;
const dim   = (s) => `\x1b[2m${s}\x1b[0m`;
const red   = (s) => `\x1b[31m${s}\x1b[0m`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function hasCommand(cmd) {
  try {
    execSync(`${process.platform === 'win32' ? 'where' : 'which'} ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'create-loci' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Extract .tar.gz without external tools (pure Node.js)
function extractTarGz(buffer, destDir) {
  const decompressed = zlib.gunzipSync(buffer);

  // Simple tar parser — handles standard POSIX tar format
  let offset = 0;
  const files = [];

  while (offset < decompressed.length) {
    // Read header (512 bytes)
    const header = decompressed.slice(offset, offset + 512);
    offset += 512;

    // Check for end-of-archive (two zero blocks)
    if (header.every((b) => b === 0)) break;

    // Parse header fields
    let rawName = header.slice(0, 100).toString('utf-8').replace(/\0/g, '');
    const sizeStr = header.slice(124, 136).toString('utf-8').replace(/\0/g, '').trim();
    const typeFlag = header[156];
    const prefix = header.slice(345, 500).toString('utf-8').replace(/\0/g, '');

    if (prefix) rawName = prefix + '/' + rawName;

    const size = parseInt(sizeStr, 8) || 0;
    const blocks = Math.ceil(size / 512);
    const data = decompressed.slice(offset, offset + size);
    offset += blocks * 512;

    // Strip the top-level directory (e.g., "loci-main/")
    const parts = rawName.split('/');
    if (parts.length <= 1) continue;
    const relPath = parts.slice(1).join('/');
    if (!relPath) continue;

    const fullPath = path.join(destDir, relPath);

    if (typeFlag === 53 || rawName.endsWith('/')) {
      // Directory
      fs.mkdirSync(fullPath, { recursive: true });
    } else if (typeFlag === 0 || typeFlag === 48) {
      // Regular file
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, data);
      files.push(relPath);
    }
  }

  return files;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  ${bold('create-loci')} — Set up a Loci brain

  ${bold('Usage:')}
    npx create-loci [target-dir]

  ${bold('Options:')}
    --help, -h     Show this help
    --web          Force web-based setup wizard
    --cli          Force terminal-based setup (Mac/Linux only)

  ${bold('Examples:')}
    npx create-loci              # Install to ~/loci
    npx create-loci ./my-brain   # Install to custom path
`);
    process.exit(0);
  }

  const forceWeb = args.includes('--web');
  const forceCli = args.includes('--cli');
  const targetDir = args.find((a) => !a.startsWith('-')) || DEFAULT_DIR;
  const resolvedDir = path.resolve(targetDir);

  console.log('');
  console.log(bold('  Loci — Memory Palace for AI'));
  console.log('');

  // ── Check if already exists ──
  if (fs.existsSync(resolvedDir) && fs.existsSync(path.join(resolvedDir, 'plan.md'))) {
    console.log(`  ${dim('Brain already exists at')} ${bold(resolvedDir)}`);
    console.log(`  ${dim('To reconfigure, run:')} cd ${resolvedDir} && node setup-web.js`);
    console.log('');
    process.exit(0);
  }

  // ── Download ──
  if (fs.existsSync(resolvedDir) && fs.readdirSync(resolvedDir).length > 0) {
    console.log(red(`  Directory ${resolvedDir} already exists and is not empty.`));
    console.log(dim(`  Choose a different path: npx create-loci ./other-dir`));
    console.log('');
    process.exit(1);
  }

  if (hasCommand('git')) {
    // Prefer git clone (preserves .git for updates)
    console.log(dim('  Cloning repository...'));
    try {
      execSync(`git clone --depth 1 https://github.com/${REPO}.git "${resolvedDir}"`, {
        stdio: 'pipe',
      });
      console.log(`  ${green('✓')} Cloned to ${bold(resolvedDir)}`);
    } catch (err) {
      console.log(red(`  Failed to clone: ${err.message}`));
      process.exit(1);
    }
  } else {
    // No git — download tarball and extract
    console.log(dim('  Downloading...'));
    try {
      const tarUrl = `https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz`;
      const buffer = await httpsGet(tarUrl);
      console.log(`  ${green('✓')} Downloaded`);

      console.log(dim('  Extracting...'));
      fs.mkdirSync(resolvedDir, { recursive: true });
      const files = extractTarGz(buffer, resolvedDir);
      console.log(`  ${green('✓')} Extracted ${files.length} files to ${bold(resolvedDir)}`);
    } catch (err) {
      console.log(red(`  Failed to download: ${err.message}`));
      process.exit(1);
    }
  }

  // ── Make scripts executable (Unix only) ──
  if (process.platform !== 'win32') {
    try {
      const scripts = ['setup.sh', 'install.sh', 'update.sh'];
      for (const s of scripts) {
        const p = path.join(resolvedDir, s);
        if (fs.existsSync(p)) fs.chmodSync(p, 0o755);
      }
      // Hooks
      for (const dir of ['.githooks', '.loci/hooks', '.claude/hooks']) {
        const hookDir = path.join(resolvedDir, dir);
        if (fs.existsSync(hookDir)) {
          for (const f of fs.readdirSync(hookDir)) {
            const fp = path.join(hookDir, f);
            if (fs.statSync(fp).isFile()) fs.chmodSync(fp, 0o755);
          }
        }
      }
    } catch {}
  }

  // ── Run setup ──
  console.log('');

  const isWindows = process.platform === 'win32';
  const hasBash = hasCommand('bash');
  const isTTY = process.stdin.isTTY;

  if (forceCli || (!forceWeb && !isWindows && hasBash && isTTY)) {
    // Unix with TTY — use the beautiful terminal setup
    console.log(dim('  Starting terminal setup...'));
    console.log('');
    try {
      execSync('bash setup.sh', {
        cwd: resolvedDir,
        stdio: 'inherit',
      });
    } catch (err) {
      // setup.sh may exit with non-zero on user cancel
      if (err.status !== 0) {
        console.log('');
        console.log(dim('  Setup was cancelled. You can run it later:'));
        console.log(`  cd ${resolvedDir} && bash setup.sh`);
      }
    }
  } else {
    // Windows or no TTY — use web wizard
    console.log(dim('  Starting setup wizard in your browser...'));
    console.log('');
    try {
      execSync('node setup-web.js', {
        cwd: resolvedDir,
        stdio: 'inherit',
      });
    } catch {}
  }
}

main().catch((err) => {
  console.error(red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
