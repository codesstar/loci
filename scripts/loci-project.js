#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LOCI_ROOT = path.resolve(__dirname, '..');
const START = '<!-- loci:project:start v1 -->';
const END = '<!-- loci:project:end -->';

function usage() {
  console.log(`Usage:
  node scripts/loci-project.js connect --repo /path/to/repo --name "Project" --description "One line" [--brain /path/to/brain]

Options:
  --goal "Goal text"             Fill memory.md Goal
  --state "Current state"        Fill memory.md Current State
  --next "Next step"             Fill memory.md Next Step
  --decision "Decision text"     Create an initial project decision file
  --decision-title "Title"       Title for the initial decision
  --force                        Replace an existing .loci/memory.md
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const eq = item.indexOf('=');
    if (eq !== -1) {
      args[item.slice(2, eq)] = item.slice(eq + 1);
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[item.slice(2)] = argv[i + 1];
      i += 1;
    } else {
      args[item.slice(2)] = true;
    }
  }
  return args;
}

function isoNow() {
  return new Date().toISOString();
}

function isoDate() {
  return isoNow().slice(0, 10);
}

function slugify(value) {
  return String(value || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'project';
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readFile(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return fallback;
  }
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function appendLineOnce(filePath, line) {
  const existing = readFile(filePath);
  const lines = existing.split(/\r?\n/).map(item => item.trim());
  if (lines.includes(line)) return false;
  const prefix = existing && !existing.endsWith('\n') ? `${existing}\n` : existing;
  writeFile(filePath, `${prefix}${line}\n`);
  return true;
}

function injectBlock(filePath, block) {
  const existing = readFile(filePath);
  const pattern = new RegExp(`${escapeRegex(START)}[\\s\\S]*?${escapeRegex(END)}`);
  const next = pattern.test(existing)
    ? existing.replace(pattern, block.trim())
    : `${existing.trimEnd()}${existing.trim() ? '\n\n' : ''}${block.trim()}\n`;
  writeFile(filePath, next);
}

function renderProjectBlock(brainPath) {
  const template = readFile(path.join(LOCI_ROOT, 'templates', 'project-claude-block.md'));
  if (!template) throw new Error('Missing templates/project-claude-block.md');
  return template.replace(/<brain-path>/g, brainPath);
}

function renderMemory(args) {
  const template = readFile(path.join(LOCI_ROOT, 'templates', 'project-memory.md'));
  if (!template) throw new Error('Missing templates/project-memory.md');
  const now = isoNow();
  return template
    .replace(/<name>/g, args.name)
    .replace(/<one-line>/g, args.description)
    .replace(/<one-line description>/g, args.description)
    .replace(/<brain-path>/g, args.brain)
    .replace(/<ISO8601>/g, now)
    .replace(/<Project Name>/g, args.name)
    .replace(/<this-repo-path>/g, args.repo)
    .replace('<!-- What this project is for. Updated in place when it changes. -->', args.goal || '<!-- What this project is for. Updated in place when it changes. -->')
    .replace('<!-- Where it is right now. Updated in place. -->', args.state || '<!-- Where it is right now. Updated in place. -->')
    .replace("<!-- What's next. Updated in place. -->", args.next || "<!-- What's next. Updated in place. -->")
    .replace(/<!-- Append-only, newest at bottom\. Each entry stamped:\n\[[^\]]+\] what happened \(milestone \/ change \/ decision pointer\) -->/,
      `[${now}] Project memory initialized by Loci.`);
}

// The project to-do list is a structured todo.json (guarded by loci-projtodo.js),
// so a dashboard can toggle / reorder / remove each item by its permanent id.
function renderTodo() {
  return `${JSON.stringify({ todos: [] }, null, 2)}\n`;
}

function ensureProjectIndex(brainPath, args) {
  const projectsDir = path.join(brainPath, 'projects');
  const indexPath = path.join(projectsDir, 'index.md');
  const now = isoNow();
  const header = `---
description: Light index of serious projects — the brain holds only this; full memory lives in each project's own repo.
updated: ${now}
---

# Projects

`;
  let content = readFile(indexPath, header);
  content = content.replace(/^updated: .+$/m, `updated: ${now}`);

  const entry = [
    `## ${args.name}   <!-- status: active -->`,
    `${args.description}. repo: ${args.repo}. memory: ${path.join(args.repo, '.loci', 'memory.md')}`,
    `updated: ${now}`,
    '',
  ].join('\n');

  const escaped = escapeRegex(args.name);
  const pattern = new RegExp(`^##\\s+${escaped}\\b[\\s\\S]*?(?=^##\\s+|\\s*$)`, 'm');
  content = pattern.test(content)
    ? content.replace(pattern, entry.trimEnd())
    : `${content.trimEnd()}\n\n${entry}`;
  writeFile(indexPath, `${content.trimEnd()}\n`);
}

function createInitialDecision(repo, args) {
  if (!args.decision) return null;
  const title = args['decision-title'] || args.decision.split(/[.\n]/)[0].slice(0, 80) || 'Project decision';
  const filePath = path.join(repo, '.loci', 'decisions', `${isoDate()}-${slugify(title)}.md`);
  if (fs.existsSync(filePath)) return filePath;
  const content = `---
date: ${isoDate()}
tags: [decision]
status: active
---

# ${title}

## Background

Recorded when Loci connected this project.

## Options

1. Keep the context only in the conversation.
2. Save the durable decision in the project repo.

## Decision

${args.decision}

## Follow-up

- [ ] Revisit when the project state changes.
`;
  writeFile(filePath, content);
  return filePath;
}

function connectProject(rawArgs) {
  const repo = path.resolve(rawArgs.repo || process.cwd());
  const brain = path.resolve(rawArgs.brain || LOCI_ROOT);
  const name = rawArgs.name || path.basename(repo);
  const description = rawArgs.description || rawArgs.summary || `Project memory for ${name}`;
  const args = { ...rawArgs, repo, brain, name, description };

  if (!fs.existsSync(repo) || !fs.statSync(repo).isDirectory()) {
    throw new Error(`Repo does not exist: ${repo}`);
  }
  if (!fs.existsSync(brain) || !fs.statSync(brain).isDirectory()) {
    throw new Error(`Brain does not exist: ${brain}`);
  }

  const lociDir = path.join(repo, '.loci');
  const decisionsDir = path.join(lociDir, 'decisions');
  fs.mkdirSync(decisionsDir, { recursive: true });

  const memoryPath = path.join(lociDir, 'memory.md');
  if (!fs.existsSync(memoryPath) || rawArgs.force) {
    writeFile(memoryPath, renderMemory(args));
  }

  const todoPath = path.join(lociDir, 'todo.json');
  if (!fs.existsSync(todoPath)) {
    writeFile(todoPath, renderTodo());
  }

  const block = renderProjectBlock(brain);
  injectBlock(path.join(repo, 'CLAUDE.md'), block);
  injectBlock(path.join(repo, 'AGENTS.md'), block);
  appendLineOnce(path.join(repo, '.gitignore'), '.loci/');
  const decisionPath = createInitialDecision(repo, args);
  ensureProjectIndex(brain, args);

  console.log(JSON.stringify({
    ok: true,
    repo,
    brain,
    files: {
      memory: memoryPath,
      todo: todoPath,
      decisions: decisionsDir,
      initialDecision: decisionPath,
      claude: path.join(repo, 'CLAUDE.md'),
      agents: path.join(repo, 'AGENTS.md'),
      gitignore: path.join(repo, '.gitignore'),
      projectIndex: path.join(brain, 'projects', 'index.md'),
    },
  }, null, 2));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (!command || args.help) {
    usage();
    return;
  }
  if (command === 'connect') return connectProject(args);
  throw new Error(`Unknown command: ${command}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
