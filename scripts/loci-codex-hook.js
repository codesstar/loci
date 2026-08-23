#!/usr/bin/env node
'use strict';

// Safely install one Loci SessionStart hook without replacing user hooks.
// The hook definition stays stable across Loci updates, so Codex does not ask
// the user to trust a changed command every time the builder implementation is
// refreshed.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { normalizePath } = require('./loci-path');

const LOCI_MARKER = /loci-context\.(?:js|sh|cmd)|Loading Loci startup map/i;
const LEGACY_PROJECT_MARKER = /(?:\.codex[\\/]hooks[\\/](?:daily-context|loci-context)\.sh|on-file-change\.(?:js|sh))/i;

function quote(value, platform) {
  const string = String(value);
  if (platform === 'win32') return `"${string.replace(/"/g, '""')}"`;
  return `'${string.replace(/'/g, `'"'"'`)}'`;
}

function hookHandler(brain, platform = process.platform) {
  const api = platform === 'win32' ? path.win32 : path;
  const script = api.join(brain, 'scripts', 'loci-context.js');
  const command = `node ${quote(script, platform)} ${quote(brain, platform)}`;
  const handler = {
    type: 'command',
    command,
    timeout: 3,
    statusMessage: 'Loading Loci startup map',
    additionalContextLimit: 1200
  };
  if (platform === 'win32') handler.commandWindows = command;
  return handler;
}

function isLociHandler(handler) {
  if (!handler || typeof handler !== 'object') return false;
  return LOCI_MARKER.test(`${handler.command || ''}\n${handler.commandWindows || ''}\n${handler.statusMessage || ''}`);
}

function isLegacyProjectHandler(handler) {
  if (!handler || typeof handler !== 'object') return false;
  return LEGACY_PROJECT_MARKER.test(`${handler.command || ''}\n${handler.commandWindows || ''}`);
}

function mergeHooks(config, brain, platform = process.platform) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('hooks.json must contain a JSON object');
  }
  if (!config.hooks) config.hooks = {};
  if (typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
    throw new Error('hooks.json "hooks" must be an object');
  }

  const current = config.hooks.SessionStart === undefined ? [] : config.hooks.SessionStart;
  if (!Array.isArray(current)) throw new Error('hooks.json SessionStart must be an array');

  const preserved = [];
  for (const group of current) {
    if (!group || typeof group !== 'object' || !Array.isArray(group.hooks)) {
      preserved.push(group);
      continue;
    }
    const otherHandlers = group.hooks.filter((handler) => !isLociHandler(handler));
    if (otherHandlers.length) preserved.push({ ...group, hooks: otherHandlers });
  }

  preserved.push({
    // Resume keeps the existing conversation context. Re-inject only when a
    // context is new or has been cleared/compacted, avoiding repeated payloads.
    matcher: 'startup|clear|compact',
    hooks: [hookHandler(brain, platform)]
  });
  config.hooks.SessionStart = preserved;
  return config;
}

function readConfig(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Cannot parse ${file}: ${error.message}`);
  }
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

function cleanupLegacyProjectConfig(file) {
  if (!fs.existsSync(file)) return { changed: false, file, removedFile: false };
  const config = readConfig(file);
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('project hooks.json must contain a JSON object');
  }
  if (config.hooks !== undefined &&
      (typeof config.hooks !== 'object' || config.hooks === null || Array.isArray(config.hooks))) {
    throw new Error('project hooks.json "hooks" must be an object');
  }

  let changed = false;
  for (const [event, groups] of Object.entries(config.hooks || {})) {
    if (!Array.isArray(groups)) continue;
    const preservedGroups = [];
    for (const group of groups) {
      if (!group || typeof group !== 'object' || !Array.isArray(group.hooks)) {
        preservedGroups.push(group);
        continue;
      }
      const handlers = group.hooks.filter((handler) => !isLegacyProjectHandler(handler));
      if (handlers.length !== group.hooks.length) changed = true;
      if (handlers.length) preservedGroups.push({ ...group, hooks: handlers });
    }
    if (preservedGroups.length) config.hooks[event] = preservedGroups;
    else delete config.hooks[event];
  }
  if (!changed) return { changed: false, file, removedFile: false };
  if (config.hooks && !Object.keys(config.hooks).length) delete config.hooks;

  const backup = `${file}.loci-backup`;
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  const removedFile = !Object.keys(config).length;
  if (removedFile) fs.unlinkSync(file);
  else atomicWrite(file, JSON.stringify(config, null, 2) + '\n');
  return { changed: true, file, removedFile };
}

function cleanupLegacyProjectArtifacts(brain) {
  const removedScripts = [];
  for (const name of ['daily-context.sh', 'loci-context.sh']) {
    const file = path.join(brain, '.codex', 'hooks', name);
    if (!fs.existsSync(file)) continue;
    const backup = `${file}.loci-backup`;
    if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
    fs.unlinkSync(file);
    removedScripts.push(file);
  }
  const config = cleanupLegacyProjectConfig(path.join(brain, '.codex', 'hooks.json'));
  return { changed: removedScripts.length > 0 || config.changed, config, removedScripts };
}

function install(options = {}) {
  const home = options.home || os.homedir();
  const platform = options.platform || process.platform;
  const brain = options.brain || path.join(__dirname, '..');
  const normalizedBrain = normalizePath(brain, platform);
  let projectCleanup = { changed: false };
  try {
    projectCleanup = cleanupLegacyProjectArtifacts(brain);
  } catch (error) {
    projectCleanup = { changed: false, error: error.message };
  }
  const file = options.file || path.join(home, '.codex', 'hooks.json');
  const existed = fs.existsSync(file);
  const before = existed ? fs.readFileSync(file, 'utf8') : '';
  const config = mergeHooks(readConfig(file), normalizedBrain, platform);
  const after = JSON.stringify(config, null, 2) + '\n';
  if (before === after) return { changed: false, file, projectCleanup };

  if (existed) {
    const backup = `${file}.loci-backup`;
    if (!fs.existsSync(backup)) {
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.copyFileSync(file, backup);
    }
  }
  atomicWrite(file, after);
  return { changed: true, file, projectCleanup };
}

function argument(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function main(args = process.argv.slice(2)) {
  if ((args[0] || 'install') !== 'install') {
    process.stderr.write('Usage: node scripts/loci-codex-hook.js install --brain <path> [--home <path>]\n');
    process.exitCode = 2;
    return;
  }
  try {
    const result = install({
      brain: argument(args, '--brain'),
      home: argument(args, '--home'),
      platform: argument(args, '--platform')
    });
    if (result.projectCleanup && result.projectCleanup.error) {
      process.stderr.write(`[Loci] Legacy project hook not changed: ${result.projectCleanup.error}\n`);
    }
    process.stdout.write(`${result.changed ? 'installed' : 'unchanged'} ${result.file}\n`);
  } catch (error) {
    process.stderr.write(`[Loci] Codex hook not changed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  cleanupLegacyProjectArtifacts,
  cleanupLegacyProjectConfig,
  hookHandler,
  install,
  isLegacyProjectHandler,
  isLociHandler,
  mergeHooks,
  readConfig
};

if (require.main === module) main();
