/**
 * chat.js — embedded AI chat panel (floating, bottom-right).
 *
 * Self-contained: own Vue app on #loci-chat-root, own styles, talks to
 * /api/chat/* and streams events over SSE. index.html only mounts it at the
 * @chat-mount anchor. Reuses the dashboard's design tokens (CSS variables).
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
    '.lc-panel{position:fixed;right:22px;bottom:86px;z-index:901;width:min(420px,calc(100vw - 32px));height:min(600px,calc(100vh - 120px));',
    '  background:var(--surface,#fff);border:1px solid var(--line,#ececea);border-radius:var(--radius,18px);',
    '  box-shadow:var(--shadow-lg,0 24px 56px rgba(0,0,0,.12));display:flex;flex-direction:column;overflow:hidden}',
    '.lc-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line,#ececea);background:var(--surface-2,#fafafa)}',
    '.lc-title{font-weight:600;font-size:14px;color:var(--ink,#1c1c1a);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.lc-iconbtn{border:0;background:transparent;cursor:pointer;color:var(--ink-3,#9a9a94);font-size:15px;padding:4px 6px;border-radius:8px}',
    '.lc-iconbtn:hover{background:var(--surface-3,#f5f5f3);color:var(--ink,#1c1c1a)}',
    '.lc-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
    '.lc-bubble{max-width:86%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word}',
    '.lc-user{align-self:flex-end;background:var(--accent,#10b981);color:#fff;border-bottom-right-radius:4px}',
    '.lc-ai{align-self:flex-start;background:var(--surface-3,#f5f5f3);color:var(--ink,#1c1c1a);border-bottom-left-radius:4px}',
    '.lc-sys{align-self:center;color:var(--red,#ef4444);font-size:12px;background:var(--red-weak,#fde8e8);padding:6px 10px;border-radius:10px}',
    '.lc-tool{align-self:flex-start;font-size:12px;color:var(--ink-2,#5b5b57);background:var(--surface-2,#fafafa);',
    '  border:1px dashed var(--line-2,#e3e3e0);border-radius:10px;padding:5px 10px;max-width:86%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.lc-tool b{color:var(--accent-ink,#047857);font-weight:600}',
    '.lc-typing{align-self:flex-start;color:var(--ink-3,#9a9a94);font-size:12px;padding-left:4px}',
    '.lc-input{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line,#ececea);background:var(--surface,#fff)}',
    '.lc-input textarea{flex:1;resize:none;border:1px solid var(--line-2,#e3e3e0);border-radius:12px;padding:9px 12px;font-size:13.5px;',
    '  font-family:inherit;line-height:1.4;max-height:110px;outline:none;background:var(--surface-2,#fafafa);color:var(--ink,#1c1c1a)}',
    '.lc-input textarea:focus{border-color:var(--accent,#10b981);background:var(--surface,#fff)}',
    '.lc-send{border:0;border-radius:12px;padding:0 16px;background:var(--accent,#10b981);color:#fff;cursor:pointer;font-size:14px;font-weight:600}',
    '.lc-send:disabled{opacity:.45;cursor:default}',
    '.lc-stop{background:var(--red,#ef4444)}',
    '.lc-sessions{position:absolute;top:46px;left:10px;right:10px;max-height:60%;overflow-y:auto;background:var(--surface,#fff);',
    '  border:1px solid var(--line,#ececea);border-radius:14px;box-shadow:var(--shadow,0 8px 24px rgba(0,0,0,.08));z-index:5;padding:6px}',
    '.lc-sessrow{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;cursor:pointer;font-size:13px;color:var(--ink,#1c1c1a)}',
    '.lc-sessrow:hover{background:var(--surface-3,#f5f5f3)}',
    '.lc-sessrow.active{background:var(--accent-weak,#d9f5e9);color:var(--accent-ink,#047857)}',
    '.lc-sessrow .t{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.lc-sessrow .x{color:var(--ink-4,#c4c4be);padding:2px 5px;border-radius:6px}',
    '.lc-sessrow .x:hover{color:var(--red,#ef4444);background:var(--red-weak,#fde8e8)}',
    '.lc-empty{text-align:center;color:var(--ink-3,#9a9a94);font-size:13px;margin-top:40%;padding:0 24px;line-height:1.7}',
    '.lc-health{align-self:center;text-align:center;color:var(--ink-2,#5b5b57);font-size:12.5px;background:var(--orange-weak,#fef3e2);',
    '  padding:8px 12px;border-radius:10px;line-height:1.6;max-width:90%}',
    '@media (max-width:640px){.lc-panel{right:8px;left:8px;width:auto;bottom:78px}}',
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  var lociUrl = window.lociUrl || function (p) { return p; };

  var App = {
    template: [
      '<button class="lc-fab" @click="toggle" :title="open ? \'收起\' : \'AI 助手\'">{{ open ? \'×\' : \'✦\' }}</button>',
      '<div class="lc-panel" v-if="open">',
      '  <div class="lc-head">',
      '    <button class="lc-iconbtn" @click="showSessions = !showSessions" title="会话列表">☰</button>',
      '    <div class="lc-title">{{ activeTitle }}</div>',
      '    <button class="lc-iconbtn" @click="newSession" title="新对话">＋</button>',
      '  </div>',
      '  <div class="lc-sessions" v-if="showSessions">',
      '    <div v-for="s in sessions" :key="s.id" class="lc-sessrow" :class="{active: s.id === activeId}" @click="openSession(s.id)">',
      '      <span class="t">{{ s.title }}</span>',
      '      <span style="color:var(--ink-4);font-size:11px">{{ s.messages }}</span>',
      '      <span class="x" @click.stop="removeSession(s.id)">×</span>',
      '    </div>',
      '    <div v-if="!sessions.length" style="padding:10px;color:var(--ink-3);font-size:12.5px;text-align:center">还没有对话</div>',
      '  </div>',
      '  <div class="lc-msgs" ref="msgs" @click="showSessions = false">',
      '    <div v-if="health && !health.ok" class="lc-health">AI 引擎不可用<br>{{ health.reason }}</div>',
      '    <div v-else-if="!items.length && !streaming" class="lc-empty">我是你的大脑助手，直接问我任务、日程、笔记，或让我帮你记录。</div>',
      '    <template v-for="(m, i) in items" :key="i">',
      '      <div v-if="m.role === \'user\'" class="lc-bubble lc-user">{{ m.text }}</div>',
      '      <div v-else-if="m.role === \'assistant\'" class="lc-bubble lc-ai">{{ m.text }}</div>',
      '      <div v-else-if="m.role === \'tool\'" class="lc-tool"><b>{{ m.name }}</b> {{ m.preview }}</div>',
      '      <div v-else-if="m.role === \'system\'" class="lc-sys">{{ m.text }}</div>',
      '    </template>',
      '    <div v-if="streaming" class="lc-bubble lc-ai">{{ streamText }}<span style="opacity:.5">▍</span></div>',
      '    <div v-else-if="running" class="lc-typing">思考中…</div>',
      '  </div>',
      '  <div class="lc-input">',
      '    <textarea ref="box" v-model="input" rows="1" placeholder="问点什么，或让我帮你记录…"',
      '      @keydown.enter.exact.prevent="send" @input="autosize"></textarea>',
      '    <button v-if="running" class="lc-send lc-stop" @click="stop">停止</button>',
      '    <button v-else class="lc-send" :disabled="!input.trim() || (health && !health.ok)" @click="send">发送</button>',
      '  </div>',
      '</div>',
    ].join('\n'),

    data: function () {
      return {
        open: false,
        showSessions: false,
        sessions: [],
        activeId: null,
        items: [],
        input: '',
        running: false,
        streaming: false,
        streamText: '',
        health: null,
        es: null,
      };
    },

    computed: {
      activeTitle: function () {
        var s = this.sessions.find(function (x) { return x.id === this.activeId; }, this);
        return (s && s.title) || 'AI 助手';
      },
    },

    methods: {
      toggle: function () {
        this.open = !this.open;
        if (this.open) this.boot();
      },
      boot: function () {
        var self = this;
        fetch(lociUrl('/api/chat/health')).then(function (r) { return r.json(); }).then(function (h) { self.health = h; });
        this.loadSessions().then(function () {
          if (!self.activeId && self.sessions.length) self.openSession(self.sessions[0].id);
        });
      },
      loadSessions: function () {
        var self = this;
        return fetch(lociUrl('/api/chat/sessions')).then(function (r) { return r.json(); })
          .then(function (d) { self.sessions = d.sessions || []; });
      },
      newSession: function () {
        var self = this;
        this.showSessions = false;
        fetch(lociUrl('/api/chat/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
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
        this.items = [];
        this.streaming = false; this.streamText = ''; this.running = false;
        fetch(lociUrl('/api/chat/history?session=' + encodeURIComponent(id)))
          .then(function (r) { return r.json(); })
          .then(function (h) {
            self.items = h.transcript || [];
            self.running = !!h.running;
            self.scroll();
            self.connectStream(id);
          });
      },
      connectStream: function (id) {
        var self = this;
        this.closeStream();
        var es = new EventSource(lociUrl('/api/chat/stream?session=' + encodeURIComponent(id)));
        this.es = es;
        function on(name, fn) { es.addEventListener(name, function (e) { var d = {}; try { d = JSON.parse(e.data); } catch (err) {} fn(d); self.scroll(); }); }
        on('user', function (d) {
          var last = self.items[self.items.length - 1];
          if (!last || last.role !== 'user' || last.text !== d.text) self.items.push({ role: 'user', text: d.text });
          self.running = true;
        });
        on('turn_start', function () { self.running = true; });
        on('assistant_delta', function (d) { self.streaming = true; self.streamText += d.text || ''; });
        on('assistant_text', function (d) {
          self.streaming = false; self.streamText = '';
          self.items.push({ role: 'assistant', text: d.text });
        });
        on('tool_use', function (d) { self.streaming = false; self.streamText = ''; self.items.push({ role: 'tool', name: d.name, preview: d.preview }); });
        on('tool_result', function () { /* keep the panel calm — tool cards already show the call */ });
        on('error', function (d) { self.items.push({ role: 'system', text: '出错了：' + (d.message || '') }); });
        on('turn_done', function (d) {
          self.running = false; self.streaming = false; self.streamText = '';
          if (d && d.stopped) self.items.push({ role: 'system', text: '已停止' });
          self.loadSessions();
        });
      },
      closeStream: function () { if (this.es) { this.es.close(); this.es = null; } },
      send: function () {
        var self = this;
        var text = this.input.trim();
        if (!text || this.running) return;
        var go = this.activeId ? Promise.resolve(this.activeId)
          : fetch(lociUrl('/api/chat/sessions'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
              .then(function (r) { return r.json(); })
              .then(function (s) { self.activeId = s.id; self.connectStream(s.id); return self.loadSessions().then(function () { return s.id; }); });
        go.then(function (id) {
          self.input = '';
          self.autosize();
          self.running = true;
          return fetch(lociUrl('/api/chat/send'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: id, message: text }),
          });
        }).then(function (r) {
          if (r && !r.ok) return r.json().then(function (d) {
            self.running = false;
            self.items.push({ role: 'system', text: '发送失败：' + (d.error || r.status) });
          });
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
      scroll: function () {
        var self = this;
        this.$nextTick(function () {
          var el = self.$refs.msgs;
          if (el) el.scrollTop = el.scrollHeight;
        });
      },
    },

    beforeUnmount: function () { this.closeStream(); },
  };

  Vue.createApp(App).mount('#loci-chat-root');
})();
