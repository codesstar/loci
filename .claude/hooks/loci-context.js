#!/usr/bin/env node
'use strict';

// Native Node wrapper for Claude Code's SessionStart hook. The builder stays
// in the brain, while this small file can also be copied to ~/.claude/hooks.

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

function resolveBrain(values, options = {}) {
  const platform = options.platform || process.platform;
  const exists = options.exists || fs.existsSync;
  const api = platform === 'win32' ? path.win32 : path.posix;
  for (const value of values || []) {
    const input = cleanPath(value);
    if (!input) continue;
    const candidates = [];
    if (platform === 'win32' && windowsShellPath(input) !== input) {
      candidates.push(normalizePath(input, platform, true));
    }
    candidates.push(normalizePath(input, platform, false));
    if (platform === 'win32') candidates.push(normalizePath(input, platform, true));
    for (const candidate of [...new Set(candidates)]) {
      if (candidate && exists(api.join(candidate, 'scripts', 'loci-context.js'))) return candidate;
    }
  }
  return '';
}

function reply(additionalContext) {
  const payload = { continue: true };
  if (additionalContext) {
    payload.hookSpecificOutput = {
      hookEventName: 'SessionStart',
      additionalContext
    };
  }
  process.stdout.write(JSON.stringify(payload) + '\n');
}

function run(options = {}) {
  try {
    const project = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const projectSettings = path.join(project, '.claude', 'settings.json');
    // Skip only for the current native project hook. A stale Bash entry must
    // not suppress this working Node fallback on Windows or after migration.
    const projectRunsContextHook = fs.existsSync(projectSettings)
      && /daily-context\.js/.test(fs.readFileSync(projectSettings, 'utf8'));
    if (options.skipProjectHook && projectRunsContextHook) {
      reply();
      return;
    }

    const pointer = path.join(os.homedir(), '.loci', 'brain-path');
    const fallback = path.resolve(__dirname, '..', '..');
    const configured = fs.existsSync(pointer) ? fs.readFileSync(pointer, 'utf8') : '';
    const brain = resolveBrain([
      options.brain,
      process.env.LOCI_BRAIN_PATH,
      configured,
      fallback
    ]);
    const builderFile = path.join(brain, 'scripts', 'loci-context.js');
    if (!brain || !fs.existsSync(builderFile)) {
      reply('[Loci] Startup map unavailable. Continue without it; do not retry or preload brain files.');
      return;
    }

    const { buildContext } = require(builderFile);
    reply(buildContext({ brain, workspace: project }));
  } catch {
    reply('[Loci] Startup map unavailable. Continue without it; do not retry or preload brain files.');
  }
}

module.exports = { cleanPath, normalizePath, resolveBrain, run, windowsShellPath };

if (require.main === module) run({ skipProjectHook: true, brain: process.argv[2] });
