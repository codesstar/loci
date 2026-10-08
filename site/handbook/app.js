'use strict';
const chapters = Array.from(document.querySelectorAll('.chapter'));
const home = document.querySelector('#home');
const links = Array.from(document.querySelectorAll('.toc a'));
const search = document.querySelector('#search');
const results = document.querySelector('#search-results');
const alias = {
  start: 'chapter-01', install: '第一次使用-loci',
  connect: '已有-loci连接千问豆包或新的-agent',
  architecture: 'chapter-03', rules: 'chapter-04',
  tasks: 'chapter-06', people: 'chapter-07', knowledge: 'chapter-08',
  memory: 'chapter-09', projects: 'chapter-10', review: 'chapter-11',
  faq: 'chapter-14',
  '已有-cc--codex后来又装了千问或豆包': '已有-loci连接千问豆包或新的-agent'
};
function closeMenu() {
  document.body.classList.remove('nav-open');
  document.querySelector('#menu').setAttribute('aria-expanded', 'false');
}
function route() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
  if (id === 'content') { document.querySelector('#content').focus(); return; }
  id = alias[id] || id;
  let target = document.getElementById(id);
  const chapter = target && target.closest('.chapter');
  chapters.forEach(c => { c.hidden = c !== chapter; });
  home.hidden = Boolean(chapter);
  links.forEach(a => {
    const active = chapter ? a.hash === '#' + chapter.id : a.hash === '#home';
    a.classList.toggle('active', active);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = chapter ? chapter.dataset.title + ' · Loci 使用指南' : 'Loci 使用指南 · 让不同 AI 接着用';
  results.hidden = true;
  closeMenu();
  if (target) for (let p = target.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
  requestAnimationFrame(() => {
    if (chapter && target !== chapter) target.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
    updateProgress();
  });
}
function updateProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('.progress').style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
}
addEventListener('hashchange', route);
addEventListener('scroll', updateProgress, { passive: true });
addEventListener('resize', updateProgress);
route();
document.querySelector('#menu').addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  document.querySelector('#menu').setAttribute('aria-expanded', String(open));
});
document.querySelector('.backdrop').addEventListener('click', closeMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); results.hidden = true; } });

const searchable = chapters.map(chapter => ({
  chapter, title: chapter.dataset.title,
  sections: Array.from(chapter.querySelectorAll('h3')).map(heading => {
    let content = heading.textContent;
    for (let next = heading.nextElementSibling; next && next.tagName !== 'H3'; next = next.nextElementSibling) content += ' ' + next.textContent;
    return { heading, content };
  })
}));
search.addEventListener('input', () => {
  const q = search.value.trim().toLowerCase();
  results.replaceChildren();
  results.hidden = !q;
  if (!q) return;
  let count = 0;
  for (const item of searchable) {
    const found = item.sections.find(s => s.heading.textContent.toLowerCase().includes(q))
      || item.sections.find(s => s.content.toLowerCase().includes(q));
    if (!found && !item.chapter.textContent.toLowerCase().includes(q)) continue;
    const a = document.createElement('a');
    a.href = '#' + (found ? found.heading.id : item.chapter.id);
    a.textContent = item.title;
    const snippet = document.createElement('span');
    snippet.textContent = found ? found.heading.textContent : item.chapter.querySelector('p').textContent.slice(0, 55);
    a.append(snippet);
    a.addEventListener('click', () => { results.hidden = true; search.blur(); });
    results.append(a);
    if (++count >= 10) break;
  }
  if (!count) {
    const p = document.createElement('p');
    p.textContent = '没有找到，试试“任务”“启动地图”或“连接”。';
    results.append(p);
  }
});
search.addEventListener('keydown', e => {
  if (e.key === 'Escape') { search.value = ''; results.hidden = true; }
  if (e.key === 'Enter') { const a = results.querySelector('a'); if (a) a.click(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) results.hidden = true; });

let toastTimer;
async function copyText(text, button) {
  const label = button.textContent;
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const field = document.createElement('textarea');
      field.value = text;
      field.style.position = 'fixed';
      field.style.opacity = '0';
      document.body.append(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      if (!copied) throw new Error('clipboard unavailable');
    }
    button.textContent = '已复制';
    const toast = document.querySelector('#copy-status');
    toast.textContent = '已复制，直接发给你的 AI 即可';
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
    setTimeout(() => { button.textContent = label; }, 1800);
  } catch {
    button.textContent = '请选中文字复制';
  }
}
document.querySelectorAll('.copy-code').forEach(button => button.addEventListener('click', () => copyText(button.closest('.code-wrap').querySelector('code').textContent, button)));
document.querySelectorAll('.copy-primary').forEach(button => button.addEventListener('click', () => copyText(button.closest('.start-content').querySelector('.prompt-text').textContent, button)));
const tabs = Array.from(document.querySelectorAll('[role=tab]'));
function activateTab(tab) {
  tabs.forEach(button => {
    const on = button === tab;
    button.setAttribute('aria-selected', String(on));
    button.tabIndex = on ? 0 : -1;
    document.getElementById(button.getAttribute('aria-controls')).hidden = !on;
  });
}
tabs.forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const next = e.key === 'Home' ? tabs[0] : e.key === 'End' ? tabs[tabs.length - 1] : tabs[(tabs.indexOf(tab) + 1) % tabs.length];
      activateTab(next); next.focus();
    }
  });
});
let printDetails;
addEventListener('beforeprint', () => {
  printDetails = Array.from(document.querySelectorAll('.source-detail')).map(d => [d, d.open]);
  printDetails.forEach(([d]) => { d.open = true; });
});
addEventListener('afterprint', () => { (printDetails || []).forEach(([d, open]) => { d.open = open; }); });
document.querySelector('#print').addEventListener('click', () => window.print());
