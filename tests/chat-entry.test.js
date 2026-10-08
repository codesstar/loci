'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chatContext } = require('../.loci/dashboard/lib/chat/context');
const { buildContext } = require('../scripts/loci-context');
const root = path.resolve(__dirname, '..');
const brain = fs.mkdtempSync(path.join(os.tmpdir(), 'loci-chat-'));
try {
  fs.mkdirSync(path.join(brain, 'me'));
  fs.mkdirSync(path.join(brain, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts/loci-context.js'), path.join(brain, 'scripts/loci-context.js'));
  fs.copyFileSync(path.join(root, 'LOCI.md'), path.join(brain, 'LOCI.md'));
  fs.writeFileSync(path.join(brain, 'me/preferences.md'), 'CALL_ME_TEST_PERSON');
  fs.mkdirSync(path.join(brain, 'tasks'));
  fs.writeFileSync(path.join(brain, 'tasks/tasks.json'), 'PRIVATE_TASK_POOL_MUST_NOT_LOAD');
  const context = chatContext(brain);
  assert(context.includes('CALL_ME_TEST_PERSON'));
  assert(context.includes('LOCI-RULES.md'));
  assert(context.includes('首次涉及记忆'));
  assert(!context.includes('<brain-path>'));
  assert(!context.includes('PRIVATE_TASK_POOL'));
  assert(context.includes(fs.readFileSync(path.join(root, 'LOCI.md'), 'utf8').replaceAll('<brain-path>', () => brain.replace(/\\/g, '/'))));
  assert(buildContext({ brain }).includes('CALL_ME_TEST_PERSON'));
  console.log('ok: Dashboard shares the short entry and startup reader; tasks remain on demand');
} finally { fs.rmSync(brain, { recursive: true, force: true }); }
