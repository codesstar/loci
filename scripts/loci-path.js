#!/usr/bin/env node
'use strict';

// Resolve and register the one-line ~/.loci/brain-path pointer. Windows users
// may run setup from Git Bash, which writes /c/... paths that native Node does
// not interpret as C:/.... Keep the pointer readable by shell fallbacks while
// giving native Node, PowerShell, and cmd a canonical path.

const fs = require('fs');
const os = require('os');
const path = require('path');

function cleanPath(value) {
  let result = String(value || '').replace(/^\uFEFF/, '').trim();
  if (result.length >= 2 && ((result[0] === '"' && result.at(-1) === '"')
      || (result[0] === "'" && result.at(-1) === "'"))) {
    result = result.slice(1, -1).trim();
  }
  return result;
}

function windowsShellPath(value) {
  const input = cleanPath(value);
  if (!input) return '';
  const slash = input.replace(/\\/g, '/');
  const mounted = slash.match(/^\/(?:cygdrive|mnt)\/([A-Za-z])(?:\/(.*))?$/);
  if (mounted) return mounted[2]
    ? `${mounted[1].toUpperCase()}:/${mounted[2]}`
    : `${mounted[1].toUpperCase()}:/`;
  const msys = slash.match(/^\/([A-Za-z])(?:\/(.*))?$/);
  if (msys) return msys[2]
    ? `${msys[1].toUpperCase()}:/${msys[2]}`
    : `${msys[1].toUpperCase()}:/`;
  return input;
}

function normalizePath(value, platform = process.platform, translateShell = true) {
  let input = cleanPath(value);
  if (!input) return '';
  if (platform === 'win32' && translateShell) input = windowsShellPath(input);
  const api = platform === 'win32' ? path.win32 : path.posix;
  let normalized = api.isAbsolute(input) ? api.normalize(input) : api.resolve(input);
  if (platform === 'win32') normalized = normalized.replace(/\\/g, '/');
  if (normalized.length > 1 && !/^[A-Za-z]:\/$/.test(normalized)) normalized = normalized.replace(/\/$/, '');
  return normalized;
}

function pathCandidates(value, platform = process.platform) {
  const input = cleanPath(value);
  if (!input) return [];
  const candidates = [];
  const add = (candidate) => {
    if (candidate && !candidates.some((item) => comparablePath(item, platform) === comparablePath(candidate, platform))) {
      candidates.push(candidate);
    }
  };
  // A leading /g/... is the drive syntax written by Git Bash, so prefer the
  // translated G:/... candidate. Explicit native root-relative paths normally
  // use a backslash and remain unchanged by windowsShellPath().
  if (platform === 'win32' && windowsShellPath(input) !== input) {
    add(normalizePath(input, platform, true));
  }
  add(normalizePath(input, platform, false));
  if (platform === 'win32') add(normalizePath(input, platform, true));
  return candidates;
}

function comparablePath(value, platform = process.platform) {
  const normalized = normalizePath(value, platform, false).replace(/[\\/]+$/, '');
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function resolveBrain(values, options = {}) {
  const platform = options.platform || process.platform;
  const exists = options.exists || fs.existsSync;
  const api = platform === 'win32' ? path.win32 : path.posix;
  for (const value of values || []) {
    for (const candidate of pathCandidates(value, platform)) {
      if (exists(api.join(candidate, 'scripts', 'loci-context.js'))) {
        return normalizePath(candidate, platform, false);
      }
    }
  }
  return '';
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.loci-tmp-${process.pid}`;
  fs.writeFileSync(temporary, content, 'utf8');
  try {
    fs.renameSync(temporary, file);
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function registerBrain(options = {}) {
  const platform = options.platform || process.platform;
  const home = normalizePath(options.home || os.homedir(), platform);
  const requested = resolveBrain([
    options.brain || path.resolve(__dirname, '..')
  ], { platform });
  if (!requested) throw new Error('Brain path does not contain scripts/loci-context.js');

  const pointer = options.pointer || (platform === 'win32'
    ? path.win32.join(home, '.loci', 'brain-path')
    : path.join(home, '.loci', 'brain-path'));
  const before = fs.existsSync(pointer) ? fs.readFileSync(pointer, 'utf8') : '';
  const current = resolveBrain([before], { platform });

  // An existing, valid pointer to another brain is intentional unless setup
  // explicitly uses --force. Invalid/stale pointers and alternate spellings of
  // this same brain are repaired automatically.
  if (current && comparablePath(current, platform) !== comparablePath(requested, platform) && !options.force) {
    return { changed: false, brain: current, pointer, preserved: true };
  }

  const content = `${requested}\n`;
  if (before === content) return { changed: false, brain: requested, pointer, preserved: false };
  if (before && !fs.existsSync(`${pointer}.loci-backup`)) {
    fs.mkdirSync(path.dirname(pointer), { recursive: true });
    fs.copyFileSync(pointer, `${pointer}.loci-backup`);
  }
  atomicWrite(pointer, content);
  return { changed: true, brain: requested, pointer, preserved: false };
}

function argument(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function main(args = process.argv.slice(2)) {
  if ((args[0] || 'register') !== 'register') {
    process.stderr.write('Usage: node scripts/loci-path.js register [--brain <path>] [--home <path>] [--force]\n');
    process.exitCode = 2;
    return;
  }
  try {
    const result = registerBrain({
      brain: argument(args, '--brain'),
      home: argument(args, '--home'),
      force: args.includes('--force')
    });
    process.stdout.write(`${result.brain}\n`);
  } catch (error) {
    process.stderr.write(`[Loci] Brain path not changed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  cleanPath,
  comparablePath,
  normalizePath,
  pathCandidates,
  registerBrain,
  resolveBrain,
  windowsShellPath
};

if (require.main === module) main();
