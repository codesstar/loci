/**
 * mobile.js — bottom tab bar for phones. Self-contained, like chat.js:
 * renders outside the Vue app and drives navigation by clicking the app's
 * own (off-canvas) sidebar buttons, so it needs no hooks inside the SPA.
 * mobile.css shows it only ≤640px.
 */
(function () {
  'use strict';
  if (document.getElementById('loci-mobile-nav')) return;

  var TABS = [
    { key: 'overview', ic: '◉', label: '总览', match: ['总览', 'Overview'] },
    { key: 'today',    ic: '☀', label: '今日', match: ['今日', 'Today'] },
    { key: 'chat',     ic: '✦', label: '助手' },
    { key: 'journal',  ic: '✎', label: '日记', match: ['日记', 'Journal'] },
    { key: 'more',     ic: '☰', label: '更多' },
  ];

  function clickSidebarItem(labels) {
    var items = document.querySelectorAll('.sbA-item');
    for (var i = 0; i < items.length; i++) {
      var lbl = items[i].querySelector('.sbA-lbl');
      if (lbl && labels.indexOf(lbl.textContent.trim()) !== -1) {
        items[i].click();
        return true;
      }
    }
    return false;
  }

  function openDrawer() {
    // the mobile header's hamburger toggles sidebarOpen inside the app
    var btn = document.querySelector('div[class*="md:hidden"][class*="fixed"] button');
    if (btn) btn.click();
  }

  function toggleChat() {
    var hook = window.__lociChat;
    if (hook && hook.vm && typeof hook.vm.toggle === 'function') { hook.vm.toggle(); return; }
    var fab = document.querySelector('.lc-fab');
    if (fab) fab.click();
  }

  var nav = document.createElement('nav');
  nav.id = 'loci-mobile-nav';
  var buttons = {};

  function setActive(key) {
    for (var k in buttons) buttons[k].classList.toggle('active', k === key);
  }

  TABS.forEach(function (tab) {
    var b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<span class="mn-ic">' + tab.ic + '</span><span>' + tab.label + '</span>';
    b.addEventListener('click', function () {
      if (tab.key === 'chat') { toggleChat(); setActive('chat'); return; }
      if (tab.key === 'more') { openDrawer(); return; }
      // close the chat panel when navigating pages so it doesn't cover them
      var hook = window.__lociChat;
      if (hook && hook.vm && hook.vm.open) hook.vm.toggle();
      if (clickSidebarItem(tab.match)) setActive(tab.key);
    });
    buttons[tab.key] = b;
    nav.appendChild(b);
  });
  document.body.appendChild(nav);

  // initial highlight from the URL hash the app maintains (#today etc.)
  var page = (location.hash || '').replace('#', '') || 'overview';
  setActive(buttons[page] ? page : 'overview');
  window.addEventListener('hashchange', function () {
    var p = (location.hash || '').replace('#', '');
    if (buttons[p]) setActive(p);
  });
})();
