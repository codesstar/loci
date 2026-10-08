#!/usr/bin/env node
'use strict';
// Copy only shipped engine files. Personal data is never a download target.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { Transaction } = require('./loci-install-lib');
const { install } = require('./loci-install');
const ROOT = path.resolve(__dirname, '..');
const RETIRED = ['setup-web.js', 'setup-wizard.html', 'scripts/adapt.sh', 'templates/global-claude-block.md', 'templates/commands/loci-brain-settings.md', 'docs/behavior.md', 'docs/how-it-works.md', 'docs/how-it-works.zh-CN.md', 'docs/distillation.md', 'docs/distillation.zh-CN.md', 'docs/synapse.md', 'docs/synapse.zh-CN.md', 'README.zh-CN.md', 'packages/create-loci/index.js', 'packages/create-loci/package.json', 'packages/create-loci/README.md'];
function engineFiles(source) {
  const manifest = fs.readFileSync(path.join(source, '.loci/engine-files.yml'), 'utf8');
  const patterns = manifest.split(/\r?\n/).map(line => line.match(/^\s+- ([A-Za-z0-9_.\/*-]+)\s*$/)?.[1]).filter(Boolean);
  const exact = new Set(patterns.filter(p => !p.endsWith('/**')));
  const dirs = patterns.filter(p => p.endsWith('/**')).map(p => p.slice(0, -2));
  for (const p of patterns) if (p.split('/').includes('..')) throw new Error('Invalid engine manifest path');
  // Only engine directories are eligible even if a bad manifest asks for user data.
  const allowed = rel => /^(scripts\/|bin\/|templates\/|integrations\/|docs\/|\.loci\/hooks\/|\.loci\/dashboard\/|\.claude\/hooks\/|\.githooks\/)/.test(rel)
    || ['LOCI.md', 'LOCI-RULES.md', 'README.md', 'README.en.md', 'CHANGELOG.md', 'LICENSE', 'setup.sh', 'install.sh', 'update.sh', '.loci/engine-files.yml'].includes(rel)
    || /^(me|tasks|decisions|references|archive)\/README.md$/.test(rel);
  const files = [];
  function walk(dir, prefix = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix + entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Symlink in engine source: ${rel}`);
      if (entry.isDirectory()) {
        if (patterns.some(p => p.startsWith(rel + '/') || rel.startsWith(p.replace(/\*\*$/, '')))) walk(path.join(dir, entry.name), rel + '/');
      } else if (exact.has(rel) || dirs.some(d => rel.startsWith(d))) {
        if (!allowed(rel) || /(^|\/)(\.token|\.env|node_modules)(\/|$)/.test(rel)) throw new Error(`Manifest attempts to manage private data: ${rel}`);
        files.push(rel);
      }
    }
  }
  walk(source);
  for (const rel of ['LOCI.md', 'LOCI-RULES.md', 'scripts/loci-install.js', 'scripts/loci-context.js']) if (!files.includes(rel)) throw new Error(`Incomplete release: ${rel}`);
  return files;
}
function update(options = {}) {
  const brain = path.resolve(options.brain || ROOT), home = path.resolve(options.home || os.homedir());
  let temp;
  try {
    const source = options.source ? path.resolve(options.source) : (temp = fs.mkdtempSync(path.join(os.tmpdir(), 'loci-release-')));
    if (temp) execFileSync('git', ['clone', '--depth', '1', 'https://github.com/codesstar/loci.git', source], { stdio: 'pipe', timeout: 120000 });
    if (source === brain) throw new Error('Update source must be separate from your brain.');
    const files = engineFiles(source);
    if (options.check) return { ok: true, source, managedFiles: files.length, installed: fs.readFileSync(path.join(brain, '.loci/engine-files.yml'), 'utf8').match(/^version:\s*(.*)/m)?.[1], available: fs.readFileSync(path.join(source, '.loci/engine-files.yml'), 'utf8').match(/^version:\s*(.*)/m)?.[1] };
    const tx = new Transaction(brain, home, 'update');
    try {
      for (const rel of files) {
        const target = path.join(brain, rel), input = path.join(source, rel);
        tx.write(target, fs.readFileSync(input));
        fs.chmodSync(target, fs.statSync(input).mode);
        tx.recordAfter(target);
      }
      for (const rel of RETIRED) tx.remove(path.join(brain, rel));
      // Load the new installer, not a cached older version in this process.
      for (const key of Object.keys(require.cache)) if (key.startsWith(path.join(brain, 'scripts') + path.sep)) delete require.cache[key];
      const result = require(path.join(brain, 'scripts/loci-install')).install({ ...options, brain, home, refresh: true }, tx);
      if (!result.ok) throw new Error('Installation check failed after update: ' + JSON.stringify(result));
      // Existing connected projects keep data; replace only their owned entry blocks.
      const index = fs.existsSync(path.join(brain, 'projects/index.md')) ? fs.readFileSync(path.join(brain, 'projects/index.md'), 'utf8') : '';
      const template = fs.readFileSync(path.join(brain, 'templates/project-claude-block.md'), 'utf8').replaceAll('<brain-path>', () => brain.replace(/\\/g, '/')).trim();
      for (const match of index.matchAll(/repo: (.+?)\. memory: /g)) {
        const repo = path.resolve(match[1]);
        for (const name of ['CLAUDE.md', 'AGENTS.md']) {
          const file = path.join(repo, name);
          if (!fs.existsSync(file)) continue;
          const before = fs.readFileSync(file, 'utf8');
          const block = /<!-- loci:project:start v\d+ -->[\s\S]*?<!-- loci:project:end -->/g;
          if ([...before.matchAll(block)].length !== 1) continue;
          tx.roots.push(repo);
          tx.write(file, before.replace(block, () => template));
        }
      }
      tx.finish();
      return { ...result, updatedFiles: files.length, backup: tx.dir };
    } catch (error) { tx.rollback(); throw error; }
  } finally { if (temp) fs.rmSync(temp, { recursive: true, force: true }); }
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    let result;
    if (args[0] === '--rollback') {
      if (!args[1]) throw new Error('Pass the exact backup directory printed by installation/update.');
      Transaction.restore(path.resolve(args[1])); result = { ok: true, restored: args[1] };
    } else if (args.includes('--help')) result = 'node scripts/loci-update.js [--brain PATH] [--home PATH] [--source LOCAL_RELEASE] [--connect auto|claude,codex,workbuddy|none] [--check]\nnode scripts/loci-update.js --rollback BACKUP_DIRECTORY';
    else {
      const options = require('./loci-install').parseArgs(args.filter(a => a !== '--refresh-blocks'));
      result = args.includes('--refresh-blocks') ? install({ ...options, refresh: true }) : update(options);
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(`[Loci] Update failed: ${error.message}`); process.exitCode = 1; }
}
module.exports = { update, engineFiles, RETIRED };
