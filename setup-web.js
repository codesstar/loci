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
  const about = (data.about || '').trim();
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
${about ? `\n## About Me\n${about}\n` : ''}`;
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

<!-- Define your mission — what drives you? -->

## Current Goals

### Goal 1: ${data.focus}
- Status: Just started
- Key results: (define what success looks like)
`;
}

function buildInitialTask(data) {
  const now = new Date().toISOString();
  const dateKey = today().replace(/-/g, '');
  const slug = String(data.focus || 'first-task')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'first_task';
  return {
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
  };
}

function generateTaskDb(task) {
  // The initial task goes ONLY into tasks/tasks.json — it is never projected
  // onto tasks/calendar.json (task/schedule separation).
  return JSON.stringify({ tasks: [task] }, null, 2) + '\n';
}

function generateActiveTaskView(data, task) {
  return `---
updated: ${today()}
schema: task-view-v1
source: tasks.json
---

# Active Tasks

> Generated context cache from \`tasks/tasks.json\`. Do not edit by hand.

## Open

- [ ] ${data.focus} <!-- id: ${task.id}; source: setup; updated: ${task.updatedAt} -->

## Stale

<!-- No stale tasks. -->

## Recently Done

<!-- No recently completed tasks. -->
`;
}

// Mirrors setup.sh's .loci/dashboard/data.json (zero-dependency dashboard).
function generateDashboardData(data, task) {
  const d = today();
  const about = (data.about || '').trim();
  const aboutHtml = about ? `<h2>About Me</h2><p>${about}</p>` : '';
  const now = new Date();
  const hms = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
  return JSON.stringify({
    config: {
      title: 'Loci Dashboard',
      username: data.name,
      description: 'Memory Palace for AI'
    },
    plan: {
      meta: { created: d, updated: d, status: 'active' },
      content: `<h1>Life Direction &amp; Goals</h1><blockquote>Your north star.</blockquote><h2>Current Goals</h2><h3>Goal 1: ${data.focus}</h3><ul><li>Status: Just started</li></ul>`,
      filename: 'plan.md',
      path: 'plan.md'
    },
    inbox: {
      content: '<h1>Inbox</h1><blockquote>Brain dump. Sort weekly.</blockquote>',
      meta: { updated: d },
      items: []
    },
    me: {
      identity: {
        meta: { created: d, updated: d, tags: ['identity', 'core'], status: 'active' },
        content: `<h1>Who I Am</h1><h2>Basics</h2><ul><li><strong>Name</strong>: ${data.name}</li><li><strong>Role</strong>: ${data.role}</li></ul><h2>Current Season</h2><ul><li><strong>Focus</strong>: ${data.focus}</li></ul>${aboutHtml}`,
        filename: 'identity.md',
        path: 'me/identity.md'
      },
      goals: { meta: { created: d, tags: ['goals'], status: 'template' }, content: '<h1>Long-term Goals</h1>', filename: 'goals.md', path: 'me/goals.md' },
      values: { meta: { created: d, tags: ['values'], status: 'template' }, content: '<h1>Values &amp; Principles</h1>', filename: 'values.md', path: 'me/values.md' },
      learned: { meta: { created: d, tags: ['learning'], status: 'template' }, content: "<h1>What I've Learned</h1>", filename: 'learned.md', path: 'me/learned.md' },
      evolution: { meta: { created: d, tags: ['evolution'] }, content: '<h1>Evolution Timeline</h1>', filename: 'evolution.md', path: 'me/evolution.md' },
      evolution_entries: []
    },
    tasks: {
      active: {
        meta: { updated: d, schema: 'task-view-v1', source: 'tasks.json' },
        content: '<h1>Active Tasks</h1>',
        filename: 'active.md',
        path: 'tasks/active.md'
      },
      records: [Object.assign({}, task, { text: task.title, done: false })],
      active_tasks: { P1: [{ id: task.id, text: task.title, title: task.title, done: false, status: 'open', date: null, stale: false }] },
      finished: []
    },
    planning: { daily: [], monthly: [], quarterly: [], reviews: [], journal: [], calendar_events: {} },
    people: { contacts: [], meetings: [] },
    decisions: [],
    finance: { files: [] },
    content: { files: [], platforms: { brands: [], accounts: [] } },
    learning: [],
    links: [],
    references: { files: [], total: 0 },
    network: { nodes: [], memories: 0, connections: 0, days_active: 0 },
    stats: { total_files: 5, total_tasks: 1, done_tasks: 0, total_people: 0, total_decisions: 0, total_daily_plans: 0, total_monthly_plans: 0, total_quarterly_plans: 0 },
    build_time: `${d} ${hms}`
  }, null, 2) + '\n';
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
- Task with specific time → still write ONLY to \`<brain-path>/tasks/tasks.json\` via the guarded writer; it is NOT projected onto the calendar (the dashboard reminder reads timed tasks straight from the task pool)
- Schedule-only time block → guarded writer/API writes only to \`<brain-path>/tasks/calendar.json\`
- Do not hand-edit \`<brain-path>/tasks/tasks.json\` or \`<brain-path>/tasks/calendar.json\` except as an emergency fallback.
- Decisions → \`<brain-path>/decisions/YYYY-MM-DD-slug.md\`
- Personal info → \`<brain-path>/me/\`
- Quick thoughts → \`<brain-path>/inbox.md\`
- Factual info: auto-save + one-line confirm. Subjective/strategic: ask before writing.

### Cross-Project Memory
- Loci aggregates memory, it does not own it: a serious project's memory belongs in that project's own repo (\`.loci/memory.md\` + \`.loci/decisions/\`), while the brain keeps only a one-line index in \`<brain-path>/projects/index.md\`.
- In connected project repos: read \`.loci/memory.md\` for project context. Write durable project decisions to \`.loci/decisions/YYYY-MM-DD-slug.md\`; update \`.loci/memory.md\` for goal/current-state/next-step/progress changes.
- Tags: \`[decision]\` and project-local facts stay in the project repo. Promote only \`[insight]\` / \`[milestone]\` summaries to the brain's project index when they matter outside the repo. \`[local]\` \`[debug]\` \`[wip]\` stay local.
- Connect projects through the guarded writer when available: \`node <brain-path>/scripts/loci-project.js connect --repo <repo-path> --brain <brain-path> --name "<project>" --description "<one-line>"\`. It creates project memory, injects both \`CLAUDE.md\` and \`AGENTS.md\`, updates \`.gitignore\`, and writes the brain index.

### Commands
/loci-sync, /loci-settings, /loci-scan, /loci-consolidate
<!-- loci:end -->`;
  }
  return block.replace(/<brain-path>/g, BRAIN_ROOT);
}

function generateCodexBlock() {
  return generateGlobalBlock();
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
  // The initial task goes only into tasks.json — no calendar projection.
  const initialTask = buildInitialTask(data);
  writeFileSafe(path.join(BRAIN_ROOT, 'tasks', 'tasks.json'), generateTaskDb(initialTask));
  results.push('tasks/tasks.json');
  // Write a fallback view first, then let loci-task.js render the authoritative
  // active.md so it is byte-identical to what `validate` expects (no day-one stale).
  writeFileSafe(path.join(BRAIN_ROOT, 'tasks', 'active.md'), generateActiveTaskView(data, initialTask));
  try {
    execSync(`node ${JSON.stringify(path.join(BRAIN_ROOT, 'scripts', 'loci-task.js'))} rebuild`, { stdio: 'ignore' });
  } catch { /* keep fallback view if the renderer is unavailable */ }
  results.push('tasks/active.md');

  // 4. .loci/config.yml
  writeFileSafe(path.join(BRAIN_ROOT, '.loci', 'config.yml'), generateConfig(data));
  results.push('.loci/config.yml');

  // 4a. .loci/dashboard/data.json — zero-dependency dashboard seed
  writeFileSafe(path.join(BRAIN_ROOT, '.loci', 'dashboard', 'data.json'), generateDashboardData(data, initialTask));
  results.push('.loci/dashboard/data.json');

  // 4a'. .loci/status.yml — user state (local, gitignored); mirror setup.sh
  const statusPath = path.join(BRAIN_ROOT, '.loci', 'status.yml');
  if (!fs.existsSync(statusPath)) {
    writeFileSafe(statusPath,
      '# User State — Auto-updated by the AI based on conversation signals.\n' +
      '# You can also set it manually by telling the AI how you feel.\n' +
      '#\n' +
      '# Fields:\n' +
      '#   state:    fresh-start | focused | exploring | winding-down | low-energy | away\n' +
      '#   energy:   low | moderate | high\n' +
      '#   updated:  ISO timestamp of last update\n' +
      '#   ttl:      how long this state is valid (e.g. "4h", "1d")\n' +
      '#   context:  free-text description of current situation\n' +
      '#   override: user-set values (highest priority, expires after ttl)\n' +
      '\n' +
      'state: fresh-start\n' +
      'energy: null\n' +
      'updated: null\n' +
      'ttl: 4h\n' +
      'context: "New brain — not yet personalized"\n');
    results.push('.loci/status.yml');
  }

  // 4b. .loci/activity/<YYYY-MM>.md — activity ledger (audit layer)
  const activityMonth = path.join(BRAIN_ROOT, '.loci', 'activity', today().slice(0, 7) + '.md');
  if (!fs.existsSync(activityMonth)) {
    writeFileSafe(activityMonth,
      '<!-- Activity ledger — a plain-language log of every change made to your brain.\n' +
      '     The AI appends one line per change; ask "what did I do today?" to get a timeline.\n' +
      '     Not loaded into context automatically. One file per month. -->\n');
  }
  results.push('.loci/activity/');

  // 4c. notes/index.md — the user's own notes (index of external + inline notes)
  const notesIndex = path.join(BRAIN_ROOT, 'notes', 'index.md');
  if (!fs.existsSync(notesIndex)) {
    writeFileSafe(notesIndex,
      '---\nupdated:\n---\n\n' +
      '# Notes\n\n' +
      '> Your own notes — pointers to where they live. One line each.\n' +
      '> Format: `- <title> · <link or local path> · <one-line gist> · #tags`\n' +
      '> External notes (Obsidian / Feishu / Notion) stay in their app; only the pointer lives here.\n' +
      '> Short inline notes become `notes/<slug>.md` and also get a line here.\n\n');
  }
  results.push('notes/');

  // 5. ~/.loci/brain-path
  const lociHome = path.join(HOME, '.loci');
  ensureDir(lociHome);
  writeFileSafe(path.join(lociHome, 'brain-path'), BRAIN_ROOT + '\n');
  results.push('~/.loci/brain-path');

  if (tools.claude) {
    // 6. ~/.claude/CLAUDE.md — append global block (backup if exists, skip if already connected)
    const claudeMdPath = path.join(HOME, '.claude', 'CLAUDE.md');
    const existingClaudeMd = readFileSafe(claudeMdPath);

    if (existingClaudeMd && existingClaudeMd.includes('<!-- loci:start')) {
      // Same as setup.sh: already connected — leave the existing block untouched.
      results.push('~/.claude/CLAUDE.md (already connected)');
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

    // 7a. Install the global SessionStart hook script that global-settings.json
    // points to (~/.claude/hooks/loci-context.sh) — mirror setup.sh
    const srcContextHook = path.join(BRAIN_ROOT, '.claude', 'hooks', 'loci-context.sh');
    if (fs.existsSync(srcContextHook)) {
      const destHooksDir = path.join(HOME, '.claude', 'hooks');
      ensureDir(destHooksDir);
      const destContextHook = path.join(destHooksDir, 'loci-context.sh');
      fs.copyFileSync(srcContextHook, destContextHook);
      try { fs.chmodSync(destContextHook, 0o755); } catch { /* best effort */ }
      results.push('~/.claude/hooks/loci-context.sh');
    }

    // 8. ~/.claude/settings.json — global hooks (mirror setup.sh configure_global)
    const globalSettingsPath = path.join(HOME, '.claude', 'settings.json');
    const settingsTemplatePath = path.join(BRAIN_ROOT, 'templates', 'global-settings.json');
    if (fs.existsSync(settingsTemplatePath)) {
      const hookTemplate = fs.readFileSync(settingsTemplatePath, 'utf-8').replace(/\$HOME/g, HOME);
      const existingGlobalSettings = readFileSafe(globalSettingsPath);
      if (existingGlobalSettings !== null) {
        if (existingGlobalSettings.includes('loci-context')) {
          results.push('~/.claude/settings.json (hooks already configured)');
        } else {
          writeFileSafe(globalSettingsPath + '.loci-backup', existingGlobalSettings);
          if (Buffer.byteLength(existingGlobalSettings) < 10) {
            writeFileSafe(globalSettingsPath, hookTemplate);
            results.push('~/.claude/settings.json (hooks configured)');
          } else {
            results.push('~/.claude/settings.json exists — merge hooks manually (see templates/global-settings.json)');
          }
        }
      } else {
        writeFileSafe(globalSettingsPath, hookTemplate);
        results.push('~/.claude/settings.json (hooks configured)');
      }
    }
  } else {
    results.push('Claude Code connection skipped');
  }

  if (tools.codex) {
    const codexMdPath = path.join(HOME, '.codex', 'AGENTS.md');
    const existingCodexMd = readFileSafe(codexMdPath);

    if (existingCodexMd && existingCodexMd.includes('<!-- loci:start')) {
      // Same as setup.sh: already connected — leave the existing block untouched.
      results.push('~/.codex/AGENTS.md (already connected)');
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

  // 9. Git safety: remove origin if codesstar/loci, set hooksPath, make hooks executable
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

  // Ensure hooks are executable (mirror setup.sh git_safety)
  for (const dir of ['.githooks', path.join('.loci', 'hooks'), path.join('.claude', 'hooks')]) {
    const abs = path.join(BRAIN_ROOT, dir);
    try {
      for (const f of fs.readdirSync(abs)) {
        const p = path.join(abs, f);
        try { if (fs.statSync(p).isFile()) fs.chmodSync(p, 0o755); } catch {}
      }
    } catch { /* directory missing — skip */ }
  }

  // 10. `loci` launcher (mirror setup.sh install_launcher) — Unix only
  if (process.platform !== 'win32') {
    const launcherSrc = path.join(BRAIN_ROOT, 'bin', 'loci');
    if (fs.existsSync(launcherSrc)) {
      try {
        fs.chmodSync(launcherSrc, 0o755);
        const binDir = path.join(HOME, '.local', 'bin');
        ensureDir(binDir);
        const dest = path.join(binDir, 'loci');
        try { fs.unlinkSync(dest); } catch { /* not there yet */ }
        fs.symlinkSync(launcherSrc, dest);
        results.push('~/.local/bin/loci (`loci` command)');
        // Patch PATH for future shells if ~/.local/bin isn't already on it
        const onPath = (process.env.PATH || '').split(':').includes(binDir);
        if (!onPath) {
          const line = '\nexport PATH="$HOME/.local/bin:$PATH" # loci:path\n';
          let added = false;
          for (const rc of [path.join(HOME, '.zshrc'), path.join(HOME, '.bashrc')]) {
            if (fs.existsSync(rc) && !fs.readFileSync(rc, 'utf-8').includes('# loci:path')) {
              fs.appendFileSync(rc, line);
              added = true;
            }
          }
          if (!added && !fs.existsSync(path.join(HOME, '.zshrc')) && !fs.existsSync(path.join(HOME, '.bashrc'))) {
            fs.appendFileSync(path.join(HOME, '.zshrc'), line.trimStart());
            added = true;
          }
          if (added) results.push('PATH += ~/.local/bin (new terminals)');
        }
      } catch { /* launcher install is best-effort */ }
    }
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
          about: typeof data.about === 'string' ? data.about : '',
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
