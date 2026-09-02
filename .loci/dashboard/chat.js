/**
 * chat.js — embedded AI chat panel (floating, bottom-right).
 *
 * Self-contained: own Vue app on #loci-chat-root, own styles, talks to
 * /api/chat/* and streams events over SSE. index.html only mounts it at the
 * @chat-mount anchor. Reuses the dashboard's design tokens (CSS variables)
 * and the vendored marked.min.js when present.
 *
 * Interaction contract:
 *   Enter = send, Shift+Enter = newline — never during IME composition.
 *   Consecutive tool steps collapse into one expandable "N 步操作" row; the
 *   live current step shows in the status line while the AI works.
 *   Connection drops show one status line and auto-resync, never bubbles.
 *   A send while the AI is replying keeps your text and tells you why.
 */
(function () {
  'use strict';
  if (!window.Vue || !document.getElementById('loci-chat-root')) return;

  var css = [
    '#loci-chat-root{font-family:var(--sans,-apple-system,sans-serif)}',
    '.lc-fab{position:fixed;right:22px;bottom:22px;z-index:900;width:52px;height:52px;border-radius:50%;border:0;cursor:pointer;',
    '  background:var(--accent,#10b981);color:#fff;font-size:22px;box-shadow:var(--shadow-lg,0 8px 24px rgba(0,0,0,.15));',
    '  display:flex;align-items:center;justify-content:center;transition:transform .15s}',
    '.lc-fab:hover{transform:scale(1.06)}',
    '.lc-fabdot{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;background:var(--orange,#f59e0b);border:2px solid #fff;animation:lc-pulse 1.2s ease-in-out infinite}',
    '@keyframes lc-pulse{0%,100%{opacity:1}50%{opacity:.4}}',
    '.lc-panel{position:fixed;right:22px;bottom:86px;z-index:901;width:min(420px,calc(100vw - 32px));height:min(600px,calc(100vh - 120px));',
    '  background:var(--surface,#fff);border:1px solid var(--line,#ececea);border-radius:var(--radius,18px);',
    '  box-shadow:var(--shadow-lg,0 24px 56px rgba(0,0,0,.12));display:flex;flex-direction:column;overflow:hidden;transition:width .18s,height .18s}',
    '.lc-panel.lc-big{width:min(760px,calc(100vw - 32px));height:min(calc(100vh - 120px),860px)}',
    '.lc-head{display:flex;align-items:center;gap:6px;padding:12px 14px;border-bottom:1px solid var(--line,#ececea);background:var(--surface-2,#fafafa)}',
    '.lc-title{font-weight:600;font-size:14px;color:var(--ink,#1c1c1a);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.lc-iconbtn{border:0;background:transparent;cursor:pointer;color:var(--ink-3,#9a9a94);font-size:15px;padding:4px 6px;border-radius:8px}',
    '.lc-iconbtn:hover{background:var(--surface-3,#f5f5f3);color:var(--ink,#1c1c1a)}',
    '.lc-closebtn{margin-left:auto;font-weight:700}',
    '.lc-closebtn:hover{background:#fde8e8;color:#c0504d}',
    '.lc-engsel{border:1px solid var(--line-2,#e3e3e0);background:var(--surface,#fff);color:var(--ink-2,#5b5b57);',
    '  border-radius:8px;font-size:11.5px;padding:3px 4px;outline:none;cursor:pointer}',
    '.lc-engtag{font-size:10px;color:var(--ink-4,#c4c4be);border:1px solid var(--line,#ececea);border-radius:5px;padding:0 4px}',
    '.lc-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;position:relative}',
    '.lc-bubble{max-width:86%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.55;word-break:break-word}',
    '.lc-user{align-self:flex-end;background:var(--accent,#10b981);color:#fff;border-bottom-right-radius:4px;white-space:pre-wrap}',
    '.lc-user.lc-pending{opacity:.66}',
    '.lc-aiwrap{align-self:flex-start;max-width:86%;position:relative}',
    '.lc-aiwrap .lc-bubble{max-width:none}',
    '.lc-ai{background:var(--surface-3,#f5f5f3);color:var(--ink,#1c1c1a);border-bottom-left-radius:4px}',
    '.lc-ai.lc-stream{white-space:pre-wrap}',
    '.lc-copy{position:absolute;top:-8px;right:-6px;border:1px solid var(--line,#ececea);background:var(--surface,#fff);color:var(--ink-3,#9a9a94);',
    '  font-size:11px;border-radius:7px;padding:1px 7px;cursor:pointer;opacity:0;transition:opacity .12s;box-shadow:var(--shadow-xs,0 1px 2px rgba(0,0,0,.05))}',
    '.lc-aiwrap:hover .lc-copy{opacity:1}',
    '.lc-copy:hover{color:var(--ink,#1c1c1a)}',
    '.lc-md p{margin:0 0 6px}.lc-md p:last-child{margin:0}',
    '.lc-md ul,.lc-md ol{margin:2px 0 6px;padding-left:18px}.lc-md li{margin:2px 0}',
    '.lc-md code{background:var(--surface-2,#fafafa);border:1px solid var(--line,#ececea);border-radius:4px;padding:0 4px;font-family:var(--mono,monospace);font-size:12px}',
    '.lc-md pre{background:var(--surface-2,#fafafa);border:1px solid var(--line,#ececea);border-radius:8px;padding:8px;overflow-x:auto;margin:4px 0}',
    '.lc-md pre code{border:0;background:none;padding:0}',
    '.lc-md h1,.lc-md h2,.lc-md h3{font-size:13.5px;margin:6px 0 4px}',
    '.lc-md blockquote{border-left:3px solid var(--line-2,#e3e3e0);margin:4px 0;padding-left:8px;color:var(--ink-2,#5b5b57)}',
    '.lc-sys{align-self:center;color:var(--ink-2,#5b5b57);font-size:12px;background:var(--surface-2,#fafafa);padding:6px 10px;border-radius:10px;max-width:90%;text-align:center}',
    '.lc-sys.lc-err{color:var(--red,#ef4444);background:var(--red-weak,#fde8e8)}',
    // collapsed tool steps
    '.lc-steps{align-self:flex-start;max-width:86%;font-size:12px;color:var(--ink-2,#5b5b57)}',
    '.lc-steps-head{display:inline-flex;align-items:center;gap:5px;cursor:pointer;border:1px dashed var(--line-2,#e3e3e0);border-radius:10px;padding:4px 10px;background:var(--surface-2,#fafafa)}',
    '.lc-steps-head:hover{color:var(--ink,#1c1c1a)}',
    '.lc-steps-list{margin-top:5px;display:flex;flex-direction:column;gap:4px;border-left:2px solid var(--line,#ececea);padding-left:8px}',
    '.lc-step{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.lc-step b{color:var(--accent-ink,#047857);font-weight:600}',
    '.lc-typing{align-self:flex-start;color:var(--ink-3,#9a9a94);font-size:12px;padding-left:4px;max-width:90%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.lc-jump{position:sticky;bottom:2px;align-self:center;border:1px solid var(--line,#ececea);background:var(--surface,#fff);color:var(--ink-2,#5b5b57);',
    '  border-radius:999px;padding:4px 12px;font-size:12px;cursor:pointer;box-shadow:var(--shadow,0 4px 12px rgba(0,0,0,.08))}',
    '.lc-jump:hover{color:var(--ink,#1c1c1a)}',
    '.lc-jump.lc-new{color:var(--accent-ink,#047857);border-color:var(--accent-weak,#d9f5e9)}',
    '.lc-input{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line,#ececea);background:var(--surface,#fff);align-items:flex-end}',
    '.lc-input textarea{flex:1;resize:none;border:1px solid var(--line-2,#e3e3e0);border-radius:12px;padding:9px 12px;font-size:13.5px;',
    '  font-family:inherit;line-height:1.4;max-height:110px;outline:none;background:var(--surface-2,#fafafa);color:var(--ink,#1c1c1a)}',
    '.lc-input textarea:focus{border-color:var(--accent,#10b981);background:var(--surface,#fff)}',
    '.lc-send{border:0;border-radius:12px;padding:9px 16px;background:var(--accent,#10b981);color:#fff;cursor:pointer;font-size:14px;font-weight:600}',
    '.lc-send:disabled{opacity:.45;cursor:default}',
    '.lc-stop{background:var(--red,#ef4444)}',
    '.lc-hintline{font-size:11px;color:var(--ink-4,#c4c4be);padding:0 14px 8px;text-align:right}',
    '.lc-sessions{position:absolute;top:46px;left:10px;right:10px;max-height:60%;overflow-y:auto;background:var(--surface,#fff);',
    '  border:1px solid var(--line,#ececea);border-radius:14px;box-shadow:var(--shadow,0 8px 24px rgba(0,0,0,.08));z-index:5;padding:6px}',
    '.lc-sessrow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;cursor:pointer;font-size:13px;color:var(--ink,#1c1c1a)}',
    '.lc-sessrow:hover{background:var(--surface-3,#f5f5f3)}',
    '.lc-sessrow.active{background:var(--accent-weak,#d9f5e9);color:var(--accent-ink,#047857)}',
    '.lc-sessrow .t{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.lc-sessrow .x{color:var(--ink-4,#c4c4be);padding:2px 5px;border-radius:6px}',
    '.lc-sessrow .x:hover{color:var(--red,#ef4444);background:var(--red-weak,#fde8e8)}',
    '.lc-empty{text-align:center;color:var(--ink-3,#9a9a94);font-size:13px;margin-top:26%;padding:0 24px;line-height:1.7}',
    '.lc-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:14px}',
    '.lc-chip{border:1px solid var(--line-2,#e3e3e0);background:var(--surface,#fff);color:var(--ink-2,#5b5b57);border-radius:999px;',
    '  padding:6px 13px;font-size:12.5px;cursor:pointer;transition:all .12s}',
    '.lc-chip:hover{border-color:var(--accent,#10b981);color:var(--accent-ink,#047857);background:var(--accent-weak,#d9f5e9)}',
    '.lc-health{align-self:center;text-align:center;color:var(--ink-2,#5b5b57);font-size:12.5px;background:var(--orange-weak,#fef3e2);',
    '  padding:8px 12px;border-radius:10px;line-height:1.6;max-width:90%}',
    '@media (max-width:640px){.lc-panel,.lc-panel.lc-big{right:8px;left:8px;width:auto;bottom:78px}}',
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var lociUrl = window.lociUrl || function (p) { return p; };

  // Friendly labels for tool cards — the user is not a developer.
  var TOOL_LABELS = {
    Bash: '执行', Read: '查看', Write: '写入', Edit: '修改',
    Grep: '搜索', Glob: '搜索', WebFetch: '联网', WebSearch: '联网搜索', Task: '子任务',
  };

  var CHIPS = [
    { label: '今天有什么任务？', text: '今天有什么任务？', auto: true },
    { label: '帮我把今天理一理', text: '帮我把今天的任务和日程理一理，给个建议顺序', auto: true },
    { label: '记一下…', text: '记一下：', auto: false },
  ];

  // Markdown for finished assistant replies. Raw HTML is neutralized before
  // parsing (single-user local app, but no reason to render model HTML).
  // Memoized: the panel is one Vue component, so every streaming delta and
  // every think-timer tick re-runs the whole render function — without the
  // cache that meant re-parsing EVERY historical message per keystroke of
  // streamed output. Message text never changes once rendered.
  var mdCache = new Map();
  function renderMd(text) {
    var key = String(text == null ? '' : text);
    var hit = mdCache.get(key);
    if (hit !== undefined) return hit;
    var safe = key.replace(/</g, '&lt;');
    var out;
    if (window.marked && window.marked.parse) {
      try { out = window.marked.parse(safe, { gfm: true, breaks: true, async: false }); }
      catch (e) { out = safe.replace(/\n/g, '<br>'); }
    } else {
      out = safe.replace(/\n/g, '<br>');
    }
    if (mdCache.size >= 600) mdCache.clear(); // bounded; 400-entry transcripts fit
    mdCache.set(key, out);
    return out;
  }

  // Group the flat transcript into render blocks: consecutive tool steps
  // fold into ONE expandable row so a busy turn doesn't wallpaper the panel.
  function groupItems(items) {
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.role === 'tool') {
        var last = out[out.length - 1];
        if (last && last.type === 'tools') last.tools.push(it);
        else out.push({ type: 'tools', key: 'g' + i, tools: [it] });
      } else {
        out.push({ type: 'msg', key: 'm' + i, m: it });
      }
    }
    return out;
  }

  var App = {
    template: [
      '<button class="lc-fab" @click="toggle" :title="open ? \'收起\' : \'AI 助手\'">{{ open ? \'×\' : \'✦\' }}<span v-if="running && !open" class="lc-fabdot" title="AI 正在处理"></span></button>',
      '<div class="lc-panel" :class="{\'lc-big\': big}" v-if="open">',
      '  <div class="lc-head">',
      '    <button class="lc-iconbtn" @click="showSessions = !showSessions" title="会话列表">☰</button>',
      '    <div class="lc-title">{{ activeTitle }}</div>',
      '    <select class="lc-engsel" v-model="engine" @change="engineChanged" title="新对话使用的 AI 引擎">',
      '      <option value="claude">Claude</option>',
      '      <option value="codex">Codex</option>',
      '    </select>',
      '    <button class="lc-iconbtn" @click="toggleBig" :title="big ? \'缩小\' : \'放大\'">{{ big ? "⤡" : "⤢" }}</button>',
      '    <button class="lc-iconbtn" @click="newSession" title="新对话">＋</button>',
      '    <button class="lc-iconbtn lc-closebtn" @click="toggle" title="收起">✕</button>',
      '  </div>',
      '  <div class="lc-sessions" v-if="showSessions">',
      '    <div v-for="s in sessions" :key="s.id" class="lc-sessrow" :class="{active: s.id === activeId}" @click="openSession(s.id)">',
      '      <span class="t">{{ s.title }}</span>',
      '      <span class="lc-engtag" v-if="s.engine && s.engine !== \'claude\'">{{ s.engine }}</span>',
      '      <span style="color:var(--ink-4);font-size:11px">{{ s.messages }}</span>',
      '      <span class="x" @click.stop="confirmRemove(s.id)" :title="confirmId === s.id ? \'再点一次确认删除\' : \'删除\'">{{ confirmId === s.id ? "确认?" : "×" }}</span>',
      '    </div>',
      '    <div v-if="!sessions.length" style="padding:10px;color:var(--ink-3);font-size:12.5px;text-align:center">还没有对话</div>',
      '  </div>',
      '  <div class="lc-msgs" ref="msgs" @scroll="onScroll" @click="showSessions = false">',
      '    <div v-if="health && !health.ok" class="lc-health">AI 引擎不可用<br>{{ health.reason }}</div>',
      '    <div v-else-if="!items.length && !streaming" class="lc-empty">',
      '      我是你的大脑助手，任务、日程、笔记都可以直接吩咐。',
      '      <div class="lc-chips">',
      '        <button v-for="c in chips" :key="c.label" class="lc-chip" @click="useChip(c)">{{ c.label }}</button>',
      '      </div>',
      '    </div>',
      '    <template v-for="b in blocks" :key="b.key">',
      '      <template v-if="b.type === \'msg\'">',
      '        <div v-if="b.m.role === \'user\'" class="lc-bubble lc-user" :class="{\'lc-pending\': b.m.pending}" :title="b.m.ts">{{ b.m.text }}</div>',
      '        <div v-else-if="b.m.role === \'assistant\'" class="lc-aiwrap">',
      '          <div class="lc-bubble lc-ai lc-md" :title="b.m.ts" v-html="renderMd(b.m.text)"></div>',
      '          <button class="lc-copy" @click="copyText(b.m.text, b.key)">{{ copiedKey === b.key ? "✓ 已复制" : "复制" }}</button>',
      '        </div>',
      '        <div v-else-if="b.m.role === \'system\'" class="lc-sys" :class="{\'lc-err\': b.m.error}">{{ b.m.text }}</div>',
      '      </template>',
      '      <div v-else-if="b.tools.length === 1" class="lc-steps">',
      '        <div class="lc-steps-head" style="cursor:default"><b style="color:var(--accent-ink)">{{ toolLabel(b.tools[0].name) }}</b>&nbsp;{{ b.tools[0].preview }}</div>',
      '      </div>',
      '      <div v-else class="lc-steps">',
      '        <div class="lc-steps-head" @click="toggleSteps(b.key)">⚙ {{ b.tools.length }} 步操作 <span>{{ openSteps[b.key] ? "▾" : "▸" }}</span></div>',
      '        <div class="lc-steps-list" v-if="openSteps[b.key]">',
      '          <div v-for="(t, ti) in b.tools" :key="ti" class="lc-step"><b>{{ toolLabel(t.name) }}</b> {{ t.preview }}</div>',
      '        </div>',
      '      </div>',
      '    </template>',
      '    <div v-if="streaming" class="lc-aiwrap"><div class="lc-bubble lc-ai lc-stream">{{ streamText }}<span style="opacity:.5">▍</span></div></div>',
      '    <div v-else-if="running" class="lc-typing">{{ liveStatus }}</div>',
      '    <div v-if="connLost" class="lc-typing">连接中断，正在重连…</div>',
      '    <button v-if="!atBottom" class="lc-jump" :class="{\'lc-new\': hasNew}" @click="jumpDown">{{ hasNew ? "有新内容 ↓" : "回到底部 ↓" }}</button>',
      '  </div>',
      '  <div class="lc-input">',
      '    <textarea ref="box" v-model="input" rows="1" placeholder="问点什么，或让我帮你记录…"',
      '      @keydown="onKey" @input="autosize"></textarea>',
      '    <button v-if="running" class="lc-send lc-stop" @click="stop">停止</button>',
      '    <button v-else class="lc-send" :disabled="!input.trim() || (health && !health.ok)" @click="send">发送</button>',
      '  </div>',
      '  <div class="lc-hintline">Enter 发送 · Shift+Enter 换行</div>',
      '</div>',
    ].join('\n'),

    data: function () {
      var savedOpen = false;
      var savedEngine = 'claude';
      var savedBig = false;
      try {
        savedOpen = localStorage.getItem('loci.chat.open') === '1';
        savedEngine = localStorage.getItem('loci.chat.engine') || 'claude';
        savedBig = localStorage.getItem('loci.chat.big') === '1';
      } catch (e) {}
      return {
        open: savedOpen,
        big: savedBig,
        engine: savedEngine === 'codex' ? 'codex' : 'claude',
        confirmId: null,
        confirmTimer: null,
        showSessions: false,
        sessions: [],
        activeId: null,
        items: [],
        openSteps: {},
        copiedKey: null,
        input: '',
        running: false,
        streaming: false,
        streamText: '',
        health: null,
        connLost: false,
        atBottom: true,
        hasNew: false,
        thinkSecs: 0,
        thinkTimer: null,
        chips: CHIPS,
        es: null,
      };
    },

    computed: {
      activeTitle: function () {
        var self = this;
        var s = this.sessions.find(function (x) { return x.id === self.activeId; });
        return (s && s.title) || 'AI 助手';
      },
      blocks: function () { return groupItems(this.items); },
      // While the AI works, surface the CURRENT step instead of a blind
      // spinner: “正在：查看 tasks.json · 8s”.
      liveStatus: function () {
        var secs = this.thinkSecs ? ' · ' + this.thinkSecs + 's' : '';
        for (var i = this.items.length - 1; i >= 0; i--) {
          var it = this.items[i];
          if (it.role === 'user' || it.role === 'assistant') break;
          if (it.role === 'tool') {
            var p = it.preview ? '：' + it.preview : '';
            return '正在' + (TOOL_LABELS[it.name] || it.name) + p + secs;
          }
        }
        return '思考中…' + secs;
      },
    },

    watch: {
      running: function (v) {
        var self = this;
        clearInterval(this.thinkTimer);
        this.thinkSecs = 0;
        if (v) this.thinkTimer = setInterval(function () { self.thinkSecs += 1; }, 1000);
      },
    },

    methods: {
      renderMd: renderMd,
      toolLabel: function (name) { return TOOL_LABELS[name] || name; },
      toggleSteps: function (key) { this.openSteps[key] = !this.openSteps[key]; },
      toggleBig: function () {
        this.big = !this.big;
        try { localStorage.setItem('loci.chat.big', this.big ? '1' : '0'); } catch (e) {}
        this.scroll(true);
      },
      useChip: function (c) {
        if (c.auto) { this.input = c.text; this.send(); }
        else {
          this.input = c.text;
          var self = this;
          this.$nextTick(function () { if (self.$refs.box) { self.$refs.box.focus(); self.autosize(); } });
        }
      },
      copyText: function (text, key) {
        var self = this;
        var done = function () { self.copiedKey = key; setTimeout(function () { if (self.copiedKey === key) self.copiedKey = null; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
        } else {
          var ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); done(); } catch (e) {}
          document.body.removeChild(ta);
        }
      },

      toggle: function () {
        this.open = !this.open;
        try { localStorage.setItem('loci.chat.open', this.open ? '1' : '0'); } catch (e) {}
        if (this.open) this.boot();
      },
      engineChanged: function () {
        try { localStorage.setItem('loci.chat.engine', this.engine); } catch (e) {}
        this.checkHealth();
      },
      checkHealth: function () {
        var self = this;
        fetch(lociUrl('/api/chat/health?engine=' + this.engine))
          .then(function (r) { return r.json(); })
          .then(function (h) { self.health = h; })
          .catch(function () {});
      },
      boot: function () {
        var self = this;
        this.checkHealth();
        this.loadSessions().then(function () {
          if (self.activeId) return;
          var saved = null;
          try { saved = localStorage.getItem('loci.chat.session'); } catch (e) {}
          var target = self.sessions.find(function (s) { return s.id === saved; }) || self.sessions[0];
          if (target) self.openSession(target.id);
        });
        this.$nextTick(function () { if (self.$refs.box) self.$refs.box.focus(); });
      },
      confirmRemove: function (id) {
        var self = this;
        if (this.confirmId === id) {
          this.confirmId = null;
          clearTimeout(this.confirmTimer);
          this.removeSession(id);
          return;
        }
        this.confirmId = id;
        clearTimeout(this.confirmTimer);
        this.confirmTimer = setTimeout(function () { self.confirmId = null; }, 2500);
      },
      loadSessions: function () {
        var self = this;
        return fetch(lociUrl('/api/chat/sessions')).then(function (r) { return r.json(); })
          .then(function (d) { self.sessions = d.sessions || []; })
          .catch(function () {});
      },
      newSession: function () {
        var self = this;
        this.showSessions = false;
        fetch(lociUrl('/api/chat/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engine: this.engine }) })
          .then(function (r) { return r.json(); })
          .then(function (s) { return self.loadSessions().then(function () { self.openSession(s.id); }); });
      },
      removeSession: function (id) {
        var self = this;
        fetch(lociUrl('/api/chat/sessions/remove'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) })
          .then(function () {
            if (self.activeId === id) { self.activeId = null; self.items = []; self.closeStream(); }
            return self.loadSessions();
          });
      },
      openSession: function (id) {
        var self = this;
        this.showSessions = false;
        this.activeId = id;
        try { localStorage.setItem('loci.chat.session', id); } catch (e) {}
        this.items = [];
        this.openSteps = {};
        this.streaming = false; this.streamText = ''; this.running = false;
        this.refreshHistory(id).then(function () { self.connectStream(id); });
        this.$nextTick(function () { if (self.$refs.box) self.$refs.box.focus(); });
      },
      refreshHistory: function (id) {
        var self = this;
        return fetch(lociUrl('/api/chat/history?session=' + encodeURIComponent(id)))
          .then(function (r) { return r.json(); })
          .then(function (h) {
            self.items = h.transcript || [];
            self.running = !!h.running;
            self.scroll(true);
          })
          .catch(function () {});
      },

      connectStream: function (id) {
        var self = this;
        this.closeStream();
        var es = new EventSource(lociUrl('/api/chat/stream?session=' + encodeURIComponent(id)));
        this.es = es;
        // Native EventSource error = connection dropped (server restart, sleep,
        // …). It auto-reconnects — show a status line, never transcript spam.
        es.onerror = function (e) { if (e && e.data) return; self.connLost = true; };
        es.onopen = function () {
          if (self.connLost) {
            self.connLost = false;
            self.refreshHistory(id); // a turn may have died while we were away
          }
        };
        function on(name, fn) {
          es.addEventListener(name, function (e) {
            if (!e.data) return;
            var d = {};
            try { d = JSON.parse(e.data); } catch (err) {}
            fn(d);
            self.scroll();
          });
        }
        on('user', function (d) {
          var last = self.items[self.items.length - 1];
          if (last && last.role === 'user' && last.pending && last.text === d.text) { last.pending = false; last.ts = d.ts; }
          else if (!last || last.role !== 'user' || last.text !== d.text) self.items.push({ role: 'user', text: d.text, ts: d.ts });
          self.running = true;
        });
        on('turn_start', function () { self.running = true; });
        on('assistant_delta', function (d) { self.streaming = true; self.streamText += d.text || ''; });
        on('assistant_text', function (d) {
          self.streaming = false; self.streamText = '';
          self.items.push({ role: 'assistant', text: d.text, ts: d.ts });
        });
        on('tool_use', function (d) { self.streaming = false; self.streamText = ''; self.items.push({ role: 'tool', name: d.name, preview: d.preview, ts: d.ts }); });
        on('tool_result', function () { /* the step row already shows the call */ });
        on('error', function (d) { self.items.push({ role: 'system', error: true, text: '出错了：' + (d.message || '未知错误') }); });
        on('turn_done', function (d) {
          self.running = false; self.streaming = false; self.streamText = '';
          if (d && d.stopped) self.items.push({ role: 'system', text: '已停止' });
          self.loadSessions();
        });
      },
      closeStream: function () { if (this.es) { this.es.close(); this.es = null; } },

      onKey: function (e) {
        if (e.key !== 'Enter' || e.shiftKey) return;
        // IME composition (Chinese/Japanese input) confirms candidates with
        // Enter — that must NOT send. keyCode 229 covers older WebKit.
        if (e.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        this.send();
      },

      send: function () {
        var self = this;
        var text = this.input.trim();
        if (!text) return;
        if (this.running) {
          this.items.push({ role: 'system', text: '上一条还没回完 — 等它说完，或点「停止」再发' });
          this.scroll(true);
          return; // keep the draft in the box
        }
        var go = this.activeId ? Promise.resolve(this.activeId)
          : fetch(lociUrl('/api/chat/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engine: this.engine }) })
              .then(function (r) { return r.json(); })
              .then(function (s) { self.activeId = s.id; self.connectStream(s.id); return self.loadSessions().then(function () { return s.id; }); });
        // optimistic bubble; confirmed (un-dimmed) by the SSE echo
        this.items.push({ role: 'user', text: text, pending: true });
        this.input = '';
        this.autosize();
        this.scroll(true);
        go.then(function (id) {
          self.running = true;
          return fetch(lociUrl('/api/chat/send'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: id, message: text }),
          });
        }).then(function (r) {
          if (r && !r.ok) {
            return r.json().catch(function () { return {}; }).then(function (d) {
              self.running = false;
              var last = self.items[self.items.length - 1];
              if (last && last.role === 'user' && last.pending) self.items.pop();
              self.input = text;
              self.autosize();
              var msg = d.error === 'busy' ? '上一条还没回完 — 等它说完，或点「停止」再发' : '发送失败：' + (d.error || r.status);
              self.items.push({ role: 'system', error: d.error !== 'busy', text: msg });
              self.scroll(true);
            });
          }
        }).catch(function () {
          self.running = false;
          var last = self.items[self.items.length - 1];
          if (last && last.role === 'user' && last.pending) self.items.pop();
          self.input = text;
          self.items.push({ role: 'system', error: true, text: '发送失败：连不上服务器' });
          self.scroll(true);
        });
      },
      stop: function () {
        fetch(lociUrl('/api/chat/stop'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: this.activeId }),
        });
      },
      autosize: function () {
        var el = this.$refs.box;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 110) + 'px';
      },
      onScroll: function () {
        var el = this.$refs.msgs;
        if (!el) return;
        this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (this.atBottom) this.hasNew = false;
      },
      jumpDown: function () {
        this.hasNew = false;
        this.scroll(true);
      },
      // Follow the stream only when the user is already near the bottom —
      // scrolling up to read history must not be yanked away.
      scroll: function (force) {
        var self = this;
        if (!force && !this.atBottom) { this.hasNew = true; return; }
        // rAF-coalesced: this fires on every SSE event (every streamed token),
        // and reading scrollHeight forces a synchronous layout each time.
        if (this._scrollQueued) return;
        this._scrollQueued = true;
        requestAnimationFrame(function () {
          self._scrollQueued = false;
          self.$nextTick(function () {
            var m = self.$refs.msgs;
            if (m) { m.scrollTop = m.scrollHeight; self.atBottom = true; self.hasNew = false; }
          });
        });
      },
    },

    mounted: function () { if (this.open) this.boot(); },

    beforeUnmount: function () { this.closeStream(); clearInterval(this.thinkTimer); },
  };

  // test hook: lets a headless harness compile the template & poke pure logic;
  // vm lets mobile.js drive the panel (its bottom bar replaces the FAB)
  window.__lociChat = { App: App, groupItems: groupItems, renderMd: renderMd };
  window.__lociChat.vm = Vue.createApp(App).mount('#loci-chat-root');
})();
