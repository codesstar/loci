#!/usr/bin/env node
'use strict';

// Native Node wrapper for Claude Code's SessionStart hook. The builder stays
// in the brain, while this small file can also be copied to ~/.claude/hooks.

const fs = require('fs');
const os = require('os');
const path = require('path');

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
    const projectRunsContextHook = fs.existsSync(projectSettings)
      && /daily-context\.(?:js|sh)/.test(fs.readFileSync(projectSettings, 'utf8'));
    if (options.skipProjectHook && projectRunsContextHook) {
      reply();
      return;
    }

    const pointer = path.join(os.homedir(), '.loci', 'brain-path');
    const fallback = path.resolve(__dirname, '..', '..');
    const brain = fs.existsSync(pointer) ? fs.readFileSync(pointer, 'utf8').trim() : fallback;
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

module.exports = { run };

if (require.main === module) run({ skipProjectHook: true });
