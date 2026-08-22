#!/usr/bin/env node
'use strict';

// Safely merge the native Node SessionStart wrapper into Claude Code settings.
// Existing non-Loci hooks and top-level settings are preserved byte-for-byte
// semantically; malformed JSON is never replaced.

const fs = require('fs');
const os = require('os');
const path = require('path');

const LOCI_MARKER = /loci-context\.(?:js|sh)/i;
const PROJECT_CONTEXT_MARKER = /daily-context\.(?:js|sh)/i;
const ACTIVITY_MARKER = /on-file-change\.(?:js|sh)/i;

function quote(value) {
  const string = String(value);
  if (process.platform === 'win32') return `"${string.replace(/"/g, '""')}"`;
  return `'${string.replace(/'/g, `'"'"'`)}'`;
}

function read(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); } catch (error) {
    throw new Error(`Cannot parse ${file}: ${error.message}`);
  }
}

function isLoci(handler) {
  return !!handler && typeof handler === 'object' && LOCI_MARKER.test(handler.command || '');
}

function merge(config, hookFile) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('settings.json must contain a JSON object');
  }
  if (!config.hooks) config.hooks = {};
  if (typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
    throw new Error('settings.json "hooks" must be an object');
  }
  const current = config.hooks.SessionStart === undefined ? [] : config.hooks.SessionStart;
  if (!Array.isArray(current)) throw new Error('settings.json SessionStart must be an array');

  const preserved = [];
  for (const group of current) {
    if (!group || typeof group !== 'object' || !Array.isArray(group.hooks)) {
      preserved.push(group);
      continue;
    }
    const other = group.hooks.filter((handler) => !isLoci(handler));
    if (other.length) preserved.push({ ...group, hooks: other });
  }
  preserved.push({
    // Claude Code refreshes SessionStart after new/resumed sessions, /clear,
    // compaction, and forked/branched sessions. Cover every current source so
    // the lightweight map remains available after any context reset.
    matcher: 'startup|resume|clear|compact|fork',
    hooks: [{ type: 'command', command: `node ${quote(hookFile)}`, timeout: 3 }]
  });
  config.hooks.SessionStart = preserved;
  return config;
}

function withoutHandlers(groups, predicate) {
  if (groups === undefined) return [];
  if (!Array.isArray(groups)) throw new Error('hook event must be an array');
  const preserved = [];
  for (const group of groups) {
    if (!group || typeof group !== 'object' || !Array.isArray(group.hooks)) {
      preserved.push(group);
      continue;
    }
    const handlers = group.hooks.filter((handler) => !predicate(handler));
    if (handlers.length) preserved.push({ ...group, hooks: handlers });
  }
  return preserved;
}

function mergeProject(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('project settings.json must contain a JSON object');
  }
  if (!config.hooks) config.hooks = {};
  if (typeof config.hooks !== 'object' || Array.isArray(config.hooks)) {
    throw new Error('project settings.json "hooks" must be an object');
  }
  const contextHandler = (handler) => !!handler && PROJECT_CONTEXT_MARKER.test(handler.command || '');
  const activityHandler = (handler) => !!handler && ACTIVITY_MARKER.test(handler.command || '');
  const session = withoutHandlers(config.hooks.SessionStart, contextHandler);
  session.push({
    matcher: 'startup|resume|clear|compact|fork',
    hooks: [{ type: 'command', command: 'node ".claude/hooks/daily-context.js"', timeout: 3 }]
  });
  config.hooks.SessionStart = session;
  const postTool = withoutHandlers(config.hooks.PostToolUse, activityHandler);
  postTool.push({
    matcher: 'Write|Edit',
    hooks: [{ type: 'command', command: 'node ".loci/hooks/on-file-change.js"', timeout: 3 }]
  });
  config.hooks.PostToolUse = postTool;
  return config;
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.loci-tmp-${process.pid}`;
  fs.writeFileSync(temporary, content, 'utf8');
  try { fs.renameSync(temporary, file); } catch (error) {
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function installProject(file) {
  if (!fs.existsSync(file)) return { changed: false, file };
  const before = fs.readFileSync(file, 'utf8');
  const after = JSON.stringify(mergeProject(read(file)), null, 2) + '\n';
  if (before === after) return { changed: false, file };
  const backup = `${file}.loci-backup`;
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  atomicWrite(file, after);
  return { changed: true, file };
}

function install(options = {}) {
  const home = options.home || os.homedir();
  const brain = options.brain || path.join(__dirname, '..');
  let project = { changed: false };
  try {
    project = installProject(path.join(brain, '.claude', 'settings.json'));
  } catch (error) {
    project = { changed: false, error: error.message };
  }
  const file = options.file || path.join(home, '.claude', 'settings.json');
  const hookFile = options.hookFile || path.join(home, '.claude', 'hooks', 'loci-context.js');
  const existed = fs.existsSync(file);
  const before = existed ? fs.readFileSync(file, 'utf8') : '';
  const after = JSON.stringify(merge(read(file), hookFile), null, 2) + '\n';
  if (before === after) return { changed: false, file, project };
  if (existed) {
    const backup = `${file}.loci-backup`;
    if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
  }
  atomicWrite(file, after);
  return { changed: true, file, project };
}

function argument(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function main(args = process.argv.slice(2)) {
  try {
    const result = install({
      brain: argument(args, '--brain'),
      home: argument(args, '--home')
    });
    if (result.project && result.project.error) {
      process.stderr.write(`[Loci] Project settings not changed: ${result.project.error}\n`);
    }
    process.stdout.write(`${result.changed ? 'installed' : 'unchanged'} ${result.file}\n`);
  } catch (error) {
    process.stderr.write(`[Loci] Claude settings not changed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { install, installProject, isLoci, merge, mergeProject, read, withoutHandlers };

if (require.main === module) main();
