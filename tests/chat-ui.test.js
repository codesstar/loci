// Headless harness for chat.js: compiles the Vue template with the real
// vendored Vue (catches template syntax errors node --check can't see) and
// unit-tests the pure helpers via the window.__lociChat test hook.
'use strict';
const fs = require('fs');
const path = require('path');

const DASH = require('path').join(__dirname, '..', '.loci', 'dashboard');

// --- browser stubs ---
global.window = global;
// Vue's browser build decodes HTML entities in attribute values through a
// real DOM div (innerHTML → children[0].getAttribute) — emulate just enough.
function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}
function makeDecoderDiv() {
  return {
    _html: '', value: '', style: {},
    set innerHTML(v) { this._html = v; },
    get innerHTML() { return this._html; },
    set textContent(v) { this._html = v; },
    get textContent() { return decodeEntities(this._html); },
    get children() {
      const m = this._html.match(/foo="([\s\S]*)">/);
      const val = m ? m[1] : '';
      return [{ getAttribute: () => decodeEntities(val) }];
    },
    select() {}, setAttribute() {},
  };
}
global.document = {
  getElementById: () => ({}),
  createElement: makeDecoderDiv,
  head: { appendChild() {} },
  body: { appendChild() {}, removeChild() {} },
  querySelector: () => null,
  addEventListener() {},
};
Object.defineProperty(global, 'navigator', { value: { userAgent: 'node-test' }, configurable: true });
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.EventSource = function () { return { addEventListener() {}, close() {} }; };
global.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) });

// --- load REAL Vue (full build incl. compiler), stash it ---
(0, eval)(fs.readFileSync(path.join(DASH, 'vendor', 'vue.global.prod.js'), 'utf8'));
const realVue = global.Vue;
if (!realVue || !realVue.compile) { console.error('FAIL: vendored Vue has no compiler'); process.exit(1); }

// --- execute chat.js against a FAKE Vue so mount() is inert ---
global.Vue = { createApp: () => ({ mount() {} }) };
(0, eval)(fs.readFileSync(path.join(DASH, 'chat.js'), 'utf8'));
const hook = global.window.__lociChat;
if (!hook || !hook.App) { console.error('FAIL: chat.js did not expose __lociChat'); process.exit(1); }

let failures = 0;
const check = (name, cond, detail) => {
  if (cond) console.log('  ok  ' + name);
  else { failures++; console.error('FAIL  ' + name + (detail ? ' — ' + detail : '')); };
};

// 1. template compiles under the real Vue compiler
let compileErr = null;
try { realVue.compile(hook.App.template, { onError: (e) => { compileErr = e; } }); }
catch (e) { compileErr = e; }
check('template compiles', !compileErr, compileErr && compileErr.message);

// 2. groupItems: consecutive tools fold, messages break groups
const items = [
  { role: 'user', text: 'q' },
  { role: 'tool', name: 'Bash', preview: 'a' },
  { role: 'tool', name: 'Read', preview: 'b' },
  { role: 'tool', name: 'Grep', preview: 'c' },
  { role: 'assistant', text: 'ans' },
  { role: 'tool', name: 'Bash', preview: 'd' },
  { role: 'system', text: 's' },
];
const blocks = hook.groupItems(items);
check('block count', blocks.length === 5, 'got ' + blocks.length);
check('tools folded', blocks[1].type === 'tools' && blocks[1].tools.length === 3);
check('group broken by message', blocks[3].type === 'tools' && blocks[3].tools.length === 1);
check('keys unique', new Set(blocks.map(b => b.key)).size === blocks.length);

// 3. renderMd: fallback path (no marked in this harness) escapes + breaks lines
const html = hook.renderMd('a<b\nc');
check('html neutralized', html.indexOf('a&lt;b') !== -1 && html.indexOf('<b>') === -1, html);
check('line breaks', html.indexOf('<br>') !== -1, html);

// 4. data() runs clean under stubs
let data = null;
try { data = hook.App.data(); } catch (e) { check('data() runs', false, e.message); }
if (data) {
  check('data() runs', true);
  check('engine default', data.engine === 'claude');
  check('computed deps present', 'items' in data && 'openSteps' in data && 'atBottom' in data);
}

// 5. liveStatus logic via a bound fake instance
const ctx = Object.assign({}, data, { items: [
  { role: 'user', text: 'q' },
  { role: 'tool', name: 'Read', preview: 'tasks.json' },
], thinkSecs: 8 });
const liveStatus = Object.getOwnPropertyDescriptor(hook.App.computed, 'liveStatus').value.call(ctx);
check('liveStatus shows current step', liveStatus.indexOf('查看') !== -1 && liveStatus.indexOf('8s') !== -1, liveStatus);

process.exit(failures ? 1 : 0);
