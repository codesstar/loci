#!/usr/bin/env node
// Loci Web Setup Wizard — zero npm dependencies
// Usage: node setup-web.js
// Opens a browser-based setup wizard at http://localhost:3456

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');

const PORT = 3456;
const BRAIN_ROOT = __dirname;
const HOME = os.homedir();

// ===== Helpers =====

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf-8'); } catch { return null; }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeFileSafe(p, content) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, content, 'utf-8');
}

function hasCommand(cmd) {
  try {
    const which = process.platform === 'win32' ? 'where' : 'command -v';
    execSync(`${which} ${cmd}`, { stdio: 'ignore', shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh' });
    return true;
  } catch {
    return false;
  }
}

function detectTools() {
  return {
    claude: hasCommand('claude') || fs.existsSync(path.join(HOME, '.claude')),
    codex: hasCommand('codex') || fs.existsSync(path.join(HOME, '.codex'))
  };
}

function normalizeToolSelection(tools) {
  if (Array.isArray(tools)) {
    const selected = new Set(tools.filter(t => t === 'claude' || t === 'codex'));
    return { claude: selected.has('claude'), codex: selected.has('codex') };
  }
  if (tools && typeof tools === 'object') {
    return { claude: !!tools.claude, codex: !!tools.codex };
  }
  return { claude: true, codex: true };
}

function getScheduleTimes(schedule) {
  const map = {
    'Morning':   { wake: '05:30', wind: '21:00' },
    'Daytime':   { wake: '07:00', wind: '22:30' },
    'Evening':   { wake: '10:00', wind: '01:00' },
    'Night owl': { wake: '14:00', wind: '04:00' },
    'Irregular': { wake: '07:00', wind: '22:30', disabled: true }
  };
  return map[schedule] || map['Daytime'];
}

// ===== File generators =====

function generateIdentity(data) {
  return `---
created: ${today()}
updated: ${today()}
tags: [identity, core]
status: active
---

# Who I Am

## Basics
- **Name**: ${data.name}
- **Role**: ${data.role}

## Current Season
- **Focus**: ${data.focus}
- **Schedule**: ${data.schedule}

## About
<!-- Add more about yourself as you go. Loci will help fill this in over time. -->
`;
}

function generatePlan(data) {
  return `---
created: ${today()}
updated: ${today()}
status: active
---

# Life Direction & Goals

> Your north star. Everything day-to-day should trace back here.

## Mission

${data.focus}

## Current Goals

### Goal 1: ${data.focus}
- Status: Just getting started
- Key result: Define clear milestones

## Principles

- Focus on what matters most
- Ship over perfection
- Reflect and adjust regularly
`;
}

function generateTaskDb(data) {
  const now = new Date().toISOString();
  const dateKey = today().replace(/-/g, '');
  const slug = String(data.focus || 'first-task')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'first_task';
  return JSON.stringify({
    tasks: [
      {
        id: `task_${dateKey}_${slug}`,
        title: data.focus,
        status: 'open',
        date: null,
        startTime: null,
        endTime: null,
        project: null,
        source: 'setup',
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        archivedAt: null
      }
    ]
  }, null, 2) + '\n';
}

function generateActiveTaskView(data) {
  return `---
updated: ${today()}
schema: task-view-v1
source: tasks.json
---

# Active Tasks

> Generated context cache from \`tasks/tasks.json\`. Do not edit by hand.

## Open

- [ ] ${data.focus}

## Stale

<!-- No stale tasks. -->

## Recently Done

<!-- No recently completed tasks. -->
`;
}

function generateConfig(data) {
  const times = getScheduleTimes(data.schedule);
  return `# Loci Configuration
# Modify these settings to customize your brain's behavior.

version: 1

language: ${data.language}              # en | zh | mix

persistence:
  mode: auto              # auto | manual
  notify: true            # show save notifications

wellbeing:
  enabled: ${times.disabled ? 'false' : 'true'}
  wind_down_time: "${times.wind}"
  wake_up_time: "${times.wake}"
  max_reminders: 2
`;
}

function generateGlobalBlock() {
  const templatePath = path.join(BRAIN_ROOT, 'templates', 'global-claude-block.md');
  let block = readFileSafe(templatePath);
  if (!block) {
    // Fallback to inline template
    block = `<!-- loci:start v2 -->
## Loci Brain Connection (Global)

- Brain path: \`<brain-path>\`
- These rules apply **in every project and directory**, not just the brain folder.

### Automatic Context
- On session start, read \`<brain-path>/plan.md\` for life direction and current goals
- Read \`<brain-path>/tasks/active.md\` for current priorities
- Check \`<brain-path>/inbox.md\` for pending items (latest 7 only)

### Persistence (any directory)
When the user mentions tasks, decisions, or insights — save them to the brain:
- Tasks → use the guarded task writer, not manual JSON edits:
  - Preferred: Dashboard API when \`<brain-path>/.loci/dashboard/server.js\` is running.
  - Fallback: run \`node <brain-path>/scripts/loci-task.js ...\`.
  - Validate with \`node <brain-path>/scripts/loci-task.js validate\`.
- Task with specific time → guarded writer also updates \`<brain-path>/tasks/calendar.json\` with \`fromTask: true\` and \`taskId\`
- Schedule-only time block → guarded writer/API writes only to \`<brain-path>/tasks/calendar.json\`
- Do not hand-edit \`<brain-path>/tasks/tasks.json\` or \`<brain-path>/tasks/calendar.json\` except as an emergency fallback.
- Decisions → \`<brain-path>/decisions/YYYY-MM-DD-slug.md\`
- Personal info → \`<brain-path>/me/\`
- Quick thoughts → \`<brain-path>/inbox.md\`
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.

### Cross-Project Memory
- In projects with \`.loci/\` directory: read \`.loci/memory.md\` for project context, use \`.loci/to-hq.md\` / \`.loci/from-hq.md\` for cross-project sync
- Tags: \`[decision]\` \`[architecture]\` \`[insight]\` \`[milestone]\` auto-push to brain; \`[local]\` \`[debug]\` \`[wip]\` stay local

### Commands
/loci-sync, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->`;
  }
  return block.replace(/<brain-path>/g, BRAIN_ROOT);
}

function generateCodexBlock() {
  return generateGlobalBlock();
}

function generateSettingsJson() {
  return {
    hooks: {
      PostToolUse: [
        {
          matcher: "Write|Edit",
          command: `.loci/hooks/on-file-change.sh "$FILE_PATH"`
        }
      ]
    }
  };
}

// ===== Setup logic =====

function runSetup(data) {
  const results = [];
  const tools = normalizeToolSelection(data.tools);

  // 1. me/identity.md
  writeFileSafe(path.join(BRAIN_ROOT, 'me', 'identity.md'), generateIdentity(data));
  results.push('me/identity.md');

  // 2. plan.md
  writeFileSafe(path.join(BRAIN_ROOT, 'plan.md'), generatePlan(data));
  results.push('plan.md');

  // 3. tasks/tasks.json + generated active.md view
  writeFileSafe(path.join(BRAIN_ROOT, 'tasks', 'tasks.json'), generateTaskDb(data));
  results.push('tasks/tasks.json');
  // Write a fallback view first, then let loci-task.js render the authoritative
  // active.md so it is byte-identical to what `validate` expects (no day-one stale).
  writeFileSafe(path.join(BRAIN_ROOT, 'tasks', 'active.md'), generateActiveTaskView(data));
  try {
    execSync(`node ${JSON.stringify(path.join(BRAIN_ROOT, 'scripts', 'loci-task.js'))} rebuild`, { stdio: 'ignore' });
  } catch { /* keep fallback view if the renderer is unavailable */ }
  results.push('tasks/active.md');

  // 4. .loci/config.yml
  writeFileSafe(path.join(BRAIN_ROOT, '.loci', 'config.yml'), generateConfig(data));
  results.push('.loci/config.yml');

  // 5. ~/.loci/brain-path
  const lociHome = path.join(HOME, '.loci');
  ensureDir(lociHome);
  writeFileSafe(path.join(lociHome, 'brain-path'), BRAIN_ROOT + '\n');
  results.push('~/.loci/brain-path');

  if (tools.claude) {
    // 6. ~/.claude/CLAUDE.md — append global block (backup if exists, replace if already has one)
    const claudeMdPath = path.join(HOME, '.claude', 'CLAUDE.md');
    const existingClaudeMd = readFileSafe(claudeMdPath);

    if (existingClaudeMd && existingClaudeMd.includes('<!-- loci:start')) {
      const cleaned = existingClaudeMd.replace(/<!-- loci:start[\s\S]*?<!-- loci:end -->/g, '').trimEnd();
      writeFileSafe(claudeMdPath, cleaned + '\n\n' + generateGlobalBlock() + '\n');
      results.push('~/.claude/CLAUDE.md (updated)');
    } else if (existingClaudeMd) {
      writeFileSafe(claudeMdPath + '.loci-backup', existingClaudeMd);
      writeFileSafe(claudeMdPath, existingClaudeMd.trimEnd() + '\n\n' + generateGlobalBlock() + '\n');
      results.push('~/.claude/CLAUDE.md (appended)');
    } else {
      ensureDir(path.join(HOME, '.claude'));
      writeFileSafe(claudeMdPath, generateGlobalBlock() + '\n');
      results.push('~/.claude/CLAUDE.md (created)');
    }

    // 7. Copy slash commands to ~/.claude/commands/
    const srcCommandsDir = path.join(BRAIN_ROOT, 'templates', 'commands');
    const destCommandsDir = path.join(HOME, '.claude', 'commands');
    if (fs.existsSync(srcCommandsDir)) {
      ensureDir(destCommandsDir);
      const commandFiles = fs.readdirSync(srcCommandsDir);
      for (const file of commandFiles) {
        const srcFile = path.join(srcCommandsDir, file);
        const destFile = path.join(destCommandsDir, file);
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
      results.push(`~/.claude/commands/ (${commandFiles.length} files)`);
    }
  } else {
    results.push('Claude Code connection skipped');
  }

  if (tools.codex) {
    const codexMdPath = path.join(HOME, '.codex', 'AGENTS.md');
    const existingCodexMd = readFileSafe(codexMdPath);

    if (existingCodexMd && existingCodexMd.includes('<!-- loci:start')) {
      const cleaned = existingCodexMd.replace(/<!-- loci:start[\s\S]*?<!-- loci:end -->/g, '').trimEnd();
      writeFileSafe(codexMdPath, cleaned + '\n\n' + generateCodexBlock() + '\n');
      results.push('~/.codex/AGENTS.md (updated)');
    } else if (existingCodexMd) {
      writeFileSafe(codexMdPath + '.loci-backup', existingCodexMd);
      writeFileSafe(codexMdPath, existingCodexMd.trimEnd() + '\n\n' + generateCodexBlock() + '\n');
      results.push('~/.codex/AGENTS.md (appended)');
    } else {
      ensureDir(path.join(HOME, '.codex'));
      writeFileSafe(codexMdPath, generateCodexBlock() + '\n');
      results.push('~/.codex/AGENTS.md (created)');
    }
  } else {
    results.push('Codex connection skipped');
  }

  // 8. .claude/settings.json — merge hook registration
  const settingsPath = path.join(BRAIN_ROOT, '.claude', 'settings.json');
  let existingSettings = {};
  const existingSettingsRaw = readFileSafe(settingsPath);
  if (existingSettingsRaw) {
    try { existingSettings = JSON.parse(existingSettingsRaw); } catch {}
  }
  const newHook = generateSettingsJson();
  // Merge hooks — handle both old format (direct command) and new format (nested hooks array)
  if (!existingSettings.hooks) existingSettings.hooks = {};
  if (!existingSettings.hooks.PostToolUse) existingSettings.hooks.PostToolUse = [];
  // Check if a Write|Edit on-file-change hook already exists (in any format)
  const hookExists = existingSettings.hooks.PostToolUse.some(h => {
    // Direct format: { matcher, command }
    if (h.command && typeof h.command === 'string' && h.command.includes('on-file-change')) return true;
    // Nested format: { matcher, hooks: [{ command }] }
    if (h.hooks && Array.isArray(h.hooks)) {
      return h.hooks.some(sub => sub.command && sub.command.includes('on-file-change'));
    }
    return false;
  });
  if (!hookExists) {
    existingSettings.hooks.PostToolUse.push(...newHook.hooks.PostToolUse);
  }
  ensureDir(path.join(BRAIN_ROOT, '.claude'));
  writeFileSafe(settingsPath, JSON.stringify(existingSettings, null, 2) + '\n');
  results.push('.claude/settings.json');

  // 9. Git: remove origin if codesstar/loci, set hooksPath
  try {
    const origin = execSync('git remote get-url origin', { cwd: BRAIN_ROOT, encoding: 'utf-8' }).trim();
    if (origin.includes('codesstar/loci')) {
      execSync('git remote remove origin', { cwd: BRAIN_ROOT });
      results.push('git: removed template origin');
    }
  } catch {
    // No origin or git not available — skip
  }

  try {
    execSync('git config core.hooksPath .githooks', { cwd: BRAIN_ROOT });
    results.push('git: hooksPath set');
  } catch {
    // Git not available — skip
  }

  return results;
}

// ===== HTTP server =====

const server = http.createServer((req, res) => {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET / — serve the wizard HTML
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const htmlPath = path.join(BRAIN_ROOT, 'setup-wizard.html');
    try {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Could not read setup-wizard.html: ' + err.message }));
    }
    return;
  }

  // GET /api/status
  if (req.method === 'GET' && req.url === '/api/status') {
    // Check if brain is already set up
    const planPath = path.join(BRAIN_ROOT, 'plan.md');
    const plan = readFileSafe(planPath) || '';
    const isReady = plan.includes('status: active');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ready: isReady, brain_path: BRAIN_ROOT, tools: detectTools() }));
    return;
  }

  // POST /api/setup
  if (req.method === 'POST' && req.url === '/api/setup') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);

        // Validate
        if (!data.name || !data.name.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Name is required' }));
          return;
        }

        const results = runSetup({
          language: data.language || 'en',
          name: data.name.trim(),
          role: data.role || 'Other',
          focus: data.focus || 'Getting started',
          schedule: data.schedule || 'Daytime',
          tools: data.tools
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          brain_path: BRAIN_ROOT,
          files_created: results
        }));

        // Auto-shutdown after 30 seconds
        console.log('\n  Setup complete! Server will shut down in 30 seconds...');
        setTimeout(() => {
          console.log('  Shutting down. Run `claude` in your brain folder to start.\n');
          process.exit(0);
        }, 30000);

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ===== Start =====

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`
  ╔══════════════════════════════════════════╗
  ║         Loci Setup Wizard                ║
  ║                                          ║
  ║   ${url}                ║
  ║                                          ║
  ║   Opening in your browser...             ║
  ╚══════════════════════════════════════════╝
  `);

  // Auto-open browser
  const platform = process.platform;
  const openCmd = platform === 'darwin' ? 'open'
    : platform === 'win32' ? 'start'
    : 'xdg-open';

  exec(`${openCmd} ${url}`, (err) => {
    if (err) {
      console.log(`  Could not open browser automatically.`);
      console.log(`  Please visit: ${url}\n`);
    }
  });

  // 5-minute timeout if no setup happens
  setTimeout(() => {
    console.log('\n  No setup detected. Shutting down (5 min timeout).\n');
    process.exit(0);
  }, 5 * 60 * 1000);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use. Is another setup wizard running?\n`);
  } else {
    console.error(`\n  Server error: ${err.message}\n`);
  }
  process.exit(1);
});
