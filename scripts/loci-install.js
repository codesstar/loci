#!/usr/bin/env node
'use strict';
// One installer for native Windows, macOS and Linux. Node built-ins only.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { normalizePath, resolveBrain, comparablePath } = require('./loci-path');
const { Transaction, replaceBlock, migrateRoot } = require('./loci-install-lib');
const ROOT = path.resolve(__dirname, '..');
const HOSTS = { claude: '.claude/CLAUDE.md', codex: '.codex/AGENTS.md', workbuddy: '.workbuddy/MEMORY.md' };

function parseArgs(args) {
  const out = {};
  const flags = new Set(['check', 'refresh', 'switch-brain', 'non-interactive', 'force', 'help']);
  const values = new Set(['brain', 'home', 'name', 'role', 'focus', 'about', 'lang', 'connect', 'source']);
  for (let i = 0; i < args.length; i++) {
    const key = args[i].replace(/^--/, '');
    if (flags.has(key)) out[key] = true;
    else if (values.has(key) && args[i + 1] && !args[i + 1].startsWith('--')) out[key] = args[++i];
    else throw new Error(`Unknown or incomplete option: ${args[i]}`);
  }
  return out;
}
function selectHosts(value, home) {
  if (!value || value === 'auto') return Object.keys(HOSTS).filter(k => fs.existsSync(path.join(home, path.dirname(HOSTS[k]))));
  if (value === 'none') return [];
  if (value === 'both') return ['claude', 'codex']; // legacy setup.sh alias
  const result = [...new Set(String(value).split(','))];
  for (const host of result) if (!HOSTS[host]) throw new Error(`Unsupported automatic adapter: ${host}`);
  return result;
}
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function check(options = {}) {
  const brain = normalizePath(options.brain || ROOT);
  const home = normalizePath(options.home || os.homedir());
  const required = ['LOCI.md', 'LOCI-RULES.md', 'scripts/loci-context.js', 'scripts/loci-task.js', 'scripts/loci-scrap.js', 'scripts/loci-project.js', 'scripts/loci-projtodo.js'];
  const missing = required.filter(rel => !fs.existsSync(path.join(brain, rel)));
  const active = /^status:\s*active\s*$/m.test(read(path.join(brain, 'plan.md')));
  const pointer = resolveBrain([read(path.join(home, '.loci/brain-path'))]);
  const entry = missing.includes('LOCI.md') ? '' : read(path.join(brain, 'LOCI.md')).replaceAll('<brain-path>', () => brain).trim();
  const roots = ['CLAUDE.md', 'AGENTS.md'].every(rel => entry && read(path.join(brain, rel)).includes(entry));
  const hosts = Object.fromEntries(selectHosts(options.connect, home).map(k => [k, read(path.join(home, HOSTS[k])).includes(entry) && !!entry]));
  return { ok: !missing.length && active && roots && comparablePath(pointer) === comparablePath(brain) && Object.values(hosts).every(Boolean), brain, missing, active, roots, pointer, hosts,
    note: 'Checks files and connections, not model compliance. Open a new agent conversation to verify reading and tool access.' };
}
function install(options = {}, transaction) {
  const brain = normalizePath(options.brain || ROOT);
  const home = normalizePath(options.home || os.homedir());
  if (/[\r\n`]/.test(brain)) throw new Error('Brain path cannot contain newlines or backticks (Markdown entry).');
  const hosts = selectHosts(options.connect, home);
  const pointerFile = path.join(home, '.loci/brain-path');
  const existing = resolveBrain([read(pointerFile)]);
  if (existing && comparablePath(existing) !== comparablePath(brain) && !options['switch-brain']) {
    throw new Error(`Another brain is already connected: ${existing}. Update it, or explicitly use --switch-brain.`);
  }
  for (const rel of ['LOCI.md', 'LOCI-RULES.md', 'scripts/loci-context.js', 'scripts/loci-task.js', 'scripts/loci-scrap.js', 'scripts/loci-project.js', 'scripts/loci-projtodo.js']) {
    if (!fs.existsSync(path.join(brain, rel))) throw new Error(`Missing ${rel}; download the complete Loci repository first.`);
  }
  const tx = transaction || new Transaction(brain, home, 'install');
  const warnings = [];
  try {
    const entry = read(path.join(brain, 'LOCI.md')).replaceAll('<brain-path>', () => brain).trim() + '\n';
    const rootEntries = ['CLAUDE.md', 'AGENTS.md'].map(rel => [path.join(brain, rel), migrateRoot(read(path.join(brain, rel)), entry, warnings)]);
    // Validate every instruction block before making any changes.
    const globalEntries = hosts.map(k => [path.join(home, HOSTS[k]), replaceBlock(read(path.join(home, HOSTS[k])), entry)]);
    if (!options.refresh) {
      const planFile = path.join(brain, 'plan.md');
      const oldPlan = read(planFile);
      const fresh = !oldPlan || /^status:\s*template\s*$/m.test(oldPlan);
      const stamp = new Date().toISOString();
      const yaml = v => JSON.stringify(String(v));
      const initial = (rel, content) => {
        const file = path.join(brain, rel), before = read(file);
        if (!before || /^status:\s*template\s*$/m.test(before)) tx.write(file, content);
      };
      if (fresh) {
        if (['zh', 'en', 'mix'].includes(options.lang)) {
          const file = path.join(brain, '.loci/config.yml'), old = read(file);
          if (old) tx.write(file, old.replace(/^language:.*$/m, 'language: ' + options.lang));
        }
        initial('plan.md', `---\nstatus: active\nupdated: ${stamp}\n---\n# Focus\n\n${options.focus || 'Ready to start; goals will be added when you choose them.'}\n`);
        initial('me/identity.md', `---\nstatus: active\nname: ${yaml(options.name || '')}\nrole: ${yaml(options.role || '')}\ncreated: ${stamp}\n---\n${options.about || ''}\n`);
        initial('me/preferences.md', `---\nstatus: active\n---\n# Preferences\n\n${options.lang === 'zh' ? '- 用中文交流。' : options.lang === 'en' ? '- Reply in English.' : '- Follow the user’s language.'}\n`);
      }
      if (!read(path.join(brain, '.loci/config.yml'))) tx.write(path.join(brain, '.loci/config.yml'), `version: 1\nlanguage: ${['zh', 'en', 'mix'].includes(options.lang) ? options.lang : 'mix'}\nwellbeing:\n  enabled: true\n  wind_down_time: "22:30"\n  wake_up_time: "07:00"\n  max_reminders: 2\nlast_greeted: ""\n`);
      // Empty stores are created only when absent; never reset an existing pool.
      for (const [rel, data] of [['tasks/tasks.json', '{"tasks":[]}\n'], ['tasks/calendar.json', '{}\n'], ['projects/index.md', '# Projects\n'], ['notes/index.md', '# Notes\n']]) {
        if (!fs.existsSync(path.join(brain, rel))) tx.write(path.join(brain, rel), data);
      }
    }
    // Prevent accidental publication of private files to the template origin.
    // Only a real cloned repository has a local .git/config; development worktrees are untouched.
    const gitConfig = path.join(brain, '.git/config');
    if (!options.refresh && fs.existsSync(gitConfig)) {
      let origin = '';
      try { origin = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: brain, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch {}
      if (/^(?:https:\/\/github\.com\/|git@github\.com:)codesstar\/loci(?:\.git)?$/.test(origin)) {
        tx.capture(gitConfig);
        execFileSync('git', ['config', 'remote.origin.pushurl', 'DISABLED-LOCI-PERSONAL-BRAIN'], { cwd: brain });
        tx.recordAfter(gitConfig);
      }
    }
    const configFile = path.join(brain, '.loci/config.yml');
    let config = read(configFile);
    if (/^persistence:\s*/m.test(config)) {
      if (/^\s+mode:\s*manual\b/m.test(config)) warnings.push('Legacy manual mode retired: clear durable signals may now be saved; sensitive/ambiguous content still requires confirmation.');
      config = config.replace(/^persistence:[^\n]*(?:\n(?:[ \t]+[^\n]*|[ \t]*))*/m, '');
      tx.write(configFile, config);
    }
    for (const [file, content] of [...rootEntries, ...globalEntries]) tx.write(file, content);
    tx.write(pointerFile, brain + '\n');
    // Optional hooks. Preserve invalid host settings; native instruction entry remains available.
    for (const host of hosts) {
      const rels = host === 'claude' ? ['.claude/settings.json', '.claude/settings.json.loci-backup', '.claude/hooks/loci-context.js'] : host === 'codex' ? ['.codex/hooks.json', '.codex/hooks.json.loci-backup'] : [];
      const hookFiles = rels.map(rel => path.join(home, rel));
      if (host === 'claude') hookFiles.push(path.join(brain, '.claude/settings.json'), path.join(brain, '.claude/settings.json.loci-backup'));
      if (host === 'codex') for (const rel of ['.codex/hooks.json', '.codex/hooks.json.loci-backup', '.codex/hooks/daily-context.sh', '.codex/hooks/daily-context.sh.loci-backup', '.codex/hooks/loci-context.sh', '.codex/hooks/loci-context.sh.loci-backup']) hookFiles.push(path.join(brain, rel));
      for (const file of hookFiles) tx.capture(file);
      try {
        if (host === 'claude') {
          tx.write(path.join(home, '.claude/hooks/loci-context.js'), read(path.join(brain, '.claude/hooks/loci-context.js')));
          const result = require(path.join(brain, 'scripts/loci-claude-settings.js')).install({ brain, home });
          if (result.project?.error) warnings.push(`Claude project hook: ${result.project.error}`);
        }
        if (host === 'codex') {
          const result = require(path.join(brain, 'scripts/loci-codex-hook.js')).install({ brain, home });
          if (result.projectCleanup?.error) warnings.push(`Codex legacy hook: ${result.projectCleanup.error}`);
        }
      } catch (error) { warnings.push(`${host} hook unavailable: ${error.message}. Use the instruction entry fallback.`); }
      for (const file of hookFiles) tx.recordAfter(file);
    }
    if (hosts.includes('claude')) {
      for (const command of ['loci-sync', 'loci-settings', 'loci-scan', 'loci-consolidate']) {
        const source = path.join(brain, 'templates/commands', command + '.md');
        const target = path.join(home, '.claude/commands', command + '.md');
        if (fs.existsSync(source)) tx.write(target, read(source));
      }
      tx.remove(path.join(home, '.claude/commands/loci-brain-settings.md'));
    }
    if (!hosts.length) warnings.push('No automatic host connection selected. Paste the generated LOCI.md block into a verified native instruction entry, then test it.');
    // Do not install shell profiles or replace unrelated launchers. Direct Node commands work everywhere.
    const result = { ...check({ brain, home, connect: hosts.length ? hosts.join(',') : 'none' }), warnings, backup: tx.dir };
    if (!transaction) tx.finish();
    return result;
  } catch (error) {
    if (!transaction) tx.rollback();
    throw error;
  }
}
if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) console.log('node scripts/loci-install.js [--brain PATH] [--home PATH] [--connect auto|claude,codex,workbuddy|none] [--name NAME] [--lang zh|en|mix] [--refresh] [--check] [--switch-brain]\nExisting personal data is preserved. --force is a legacy no-op; it never resets data.');
    else {
      const result = args.check ? check(args) : install(args);
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) process.exitCode = 1;
    }
  } catch (error) { console.error(`[Loci] ${error.message}`); process.exitCode = 1; }
}
module.exports = { HOSTS, parseArgs, selectHosts, check, install };
