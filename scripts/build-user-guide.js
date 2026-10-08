#!/usr/bin/env node
'use strict';
// Public guide: one Markdown source, a static reader, no browser Markdown runtime.
const fs = require('node:fs');
const path = require('node:path');
const { marked } = require('../.loci/dashboard/vendor/marked.min.js');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'site/handbook');
const md = fs.readFileSync(path.join(root, 'docs/user-guide.md'), 'utf8');
const imageManifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/assets/handbook/images.json'), 'utf8'));
const publicAssets = new Set(['assets/architecture-zh-mobile.svg']);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = text => text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-');
const titles = [
  '安装与连接', '认识 Loci', '架构与三类上下文', '保存与读取规则', '设计取舍',
  '任务与日历', '人脉与地点', '笔记与碎片', '个人档案与记忆', '项目记忆',
  '总览与日记', '问题与解决进展', '接下来的改进', '常见问题', '反馈与参与'
];
const groups = [
  ['开始使用', [1, 2]],
  ['日常使用', [6, 7, 8, 9, 10, 11]],
  ['了解设计', [3, 4, 5]],
  ['帮助与参与', [14, 12, 13, 15]]
];
const order = groups.flatMap(([, ids]) => ids);
const ids = new Set();
const sections = [];
marked.use({ renderer: {
  html(token) { return escape(token.text); },
  heading(token) {
    let id = slug(token.text);
    const base = id;
    let suffix = 2;
    while (ids.has(id)) id = base + '-' + suffix++;
    ids.add(id);
    if (token.depth === 3) sections.push({ id, title: token.text });
    return '<h' + token.depth + ' id="' + escape(id) + '">' + this.parser.parseInline(token.tokens) + '</h' + token.depth + '>\n';
  },
  code(token) {
    const isRule = token.text.startsWith('<!-- loci:start');
    const isMap = token.text.startsWith('[Loci] Lightweight startup map');
    const isTree = token.text.startsWith('brain/');
    const example = !isRule && !isMap && !isTree && (!token.lang || token.lang === 'text');
    const label = isTree ? '目录结构' : isRule ? 'LOCI.md · 入口模板' : isMap ? '启动读取器的示例输出' : example ? '可以这样对 AI 说' : (token.lang || '示例');
    let block = '<div class="code-wrap' + (example ? ' ai-example' : '') + '"><div class="code-toolbar"><span>' + label + '</span><button type="button" class="copy-code" aria-label="复制' + escape(label) + '">复制</button></div><pre><code>' + escape(token.text) + '</code></pre></div>\n';
    if (isRule || isMap) block = '<details class="source-detail"><summary>' + (isRule ? '展开查看 LOCI.md 完整入口' : '展开查看启动地图输出') + '</summary>' + block + '</details>\n';
    return block;
  },
  image(token) {
    let dims;
    if (token.href === 'assets/architecture-zh-light.svg') {
      const svg = fs.readFileSync(path.join(root, 'docs', token.href), 'utf8');
      const box = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
      if (!box) throw new Error('Architecture dimensions missing');
      dims = [Number(box[1]), Number(box[2])];
    } else {
      const entry = imageManifest[token.href];
      if (!entry) throw new Error('Review public image before adding: ' + token.href);
      dims = [entry.width, entry.height];
    }
    publicAssets.add(token.href);
    return '<img src="' + escape(token.href) + '" alt="' + escape(token.text) + '" width="' + dims[0] + '" height="' + dims[1] + '" loading="lazy">';
  }
}});
const parts = md.split(/^## (\d\d) · (.+)$/m);
if ((parts.length - 1) / 3 !== titles.length) throw new Error('Expected 15 guide chapters');
const chapters = [];
for (let i = 1; i < parts.length; i += 3) {
  const number = Number(parts[i]);
  const fullTitle = parts[i + 1];
  sections.length = 0;
  let content = marked.parse(parts[i + 2], { gfm: true });
  content = content.replace(/<table>/g, '<div class="table-scroll" tabindex="0" role="region" aria-label="表格，可横向滚动"><table>').replace(/<\/table>/g, '</table></div>');
  content = content.replace(/<p>(<img [^>]+>)<\/p>/g, (match, img) => {
    const src = img.match(/src="([^"]+)"/)[1];
    const caption = img.match(/alt="([^"]*)"/)[1];
    if (src === 'assets/architecture-zh-light.svg') {
      return '<figure class="architecture-figure"><a href="' + src + '" target="_blank" rel="noopener" aria-label="查看架构大图"><picture><source media="(max-width: 720px)" srcset="assets/architecture-zh-mobile.svg" width="640" height="1380">' + img + '</picture></a><figcaption>四步读懂 Loci。点击图片查看大图。</figcaption></figure>';
    }
    return '<figure class="article-figure" data-label="' + escape(imageManifest[src].label) + '"><a href="' + src + '" target="_blank" rel="noopener" aria-label="查看大图：' + caption + '">' + img + '</a><figcaption>' + caption + '<span>点击查看大图 ↗</span></figcaption></figure>';
  });
  let galleryNumber = 0;
  content = content.replace(/(?:<figure class="article-figure"(?:(?!<\/figure>)[\s\S])*<\/figure>\s*){2,}/g, run => {
    const figures = Array.from(run.matchAll(/<figure class="article-figure"[\s\S]*?<\/figure>/g), m => m[0]);
    const prefix = 'gallery-' + number + '-' + (++galleryNumber);
    const buttons = figures.map((figure, i) => '<button type="button" role="tab" id="' + prefix + '-tab-' + i + '" aria-controls="' + prefix + '-panel-' + i + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? '0' : '-1') + '">' + figure.match(/data-label="([^"]+)"/)[1] + '</button>').join('');
    return '<div class="image-gallery"><div class="gallery-tabs" role="tablist" aria-label="选择操作配图">' + buttons + '</div>' + figures.map((figure, i) => figure.replace('<figure ', '<figure role="tabpanel" id="' + prefix + '-panel-' + i + '" aria-labelledby="' + prefix + '-tab-' + i + '" ')).join('') + '</div>';
  });
  content = content.replace(/<p>((?:来源|依据|源码依据)：[\s\S]*?)<\/p>/g, '<p class="sources">$1</p>');
  const toc = sections.length > 2 ? '<details class="in-page"><summary>本页内容 · ' + sections.length + ' 个小节</summary><nav aria-label="本页目录">' + sections.map(s => '<a href="#' + escape(s.id) + '">' + escape(s.title) + '</a>').join('') + '</nav></details>' : '';
  const group = groups.find(([, nums]) => nums.includes(number))[0];
  const idx = order.indexOf(number);
  const adjacent = (num, prev) => '<a href="#chapter-' + String(num).padStart(2, '0') + '"><small>' + (prev ? '← 上一篇' : '下一篇 →') + '</small>' + titles[num - 1] + '</a>';
  const pagination = '<nav class="chapter-pagination" aria-label="相邻章节">' + (idx > 0 ? adjacent(order[idx - 1], true) : '<a href="#home"><small>← 返回</small>指南首页</a>') + (idx < order.length - 1 ? adjacent(order[idx + 1], false) : '<a href="#home"><small>回到首页 →</small>开始使用 Loci</a>') + '</nav>';
  chapters.push('<article class="chapter" id="chapter-' + parts[i] + '" data-title="' + escape(titles[number - 1]) + '"><div class="breadcrumb"><a href="#home">使用指南</a><span>/</span><span>' + group + '</span></div><div class="chapter-label">LOCI GUIDE · ' + String(order.indexOf(number) + 1).padStart(2, '0') + '</div><h2 class="chapter-title">' + escape(fullTitle) + '</h2>' + toc + content + pagination + '<footer class="reading-footer">让记忆留在自己手里。<a href="https://github.com/codesstar/loci/issues" target="_blank" rel="noopener">反馈问题 ↗</a></footer></article>');
}
const prompts = Array.from(parts[3].matchAll(/\x60{3}text\n([\s\S]*?)\n\x60{3}/g), m => m[1]);
if (prompts.length < 2) throw new Error('Missing install and connection prompts');
const toc = '<a href="#home">指南首页</a>' + groups.map(([label, nums]) => '<p class="nav-group">' + label + '</p>' + nums.map(num => '<a href="#chapter-' + String(num).padStart(2, '0') + '">' + titles[num - 1] + '</a>').join('')).join('');
const drawing = '<svg class="memory-drawing" viewBox="0 0 290 286" fill="none" role="img" aria-labelledby="memory-title"><title id="memory-title">不同 Agent，读取同一份本地记忆</title><path d="M28 182L135 147L264 181L154 224Z" fill="#DFE8D0" stroke="#9BAF8E"/><path d="M28 174L135 139L264 173L154 216Z" fill="#EEF2E5" stroke="#9BAF8E"/><path d="M28 166L135 131L264 165L154 208Z" fill="#FFFDF8" stroke="#9BAF8E"/><path d="M114 78V108L91 133M226 95V117L205 136" stroke="#8DA182" stroke-dasharray="3 5"/><path d="M90 49L149 63L125 91L67 77Z" fill="#E3EDCE" stroke="#7F9C6F"/><path d="M207 57L258 75L226 102L175 84Z" fill="#F5F5EB" stroke="#8BA37B"/><circle cx="105" cy="70" r="5" fill="#426B40"/><path d="M210 75L216 69L222 80L228 74" stroke="#426B40" stroke-width="2"/><path d="M92 162L137 148L204 166M108 171L153 158L191 168M121 181L155 171" stroke="#B0C1A1" stroke-width="2"/><text x="62" y="38" font-family="sans-serif" font-size="10" fill="#62775D">一个 AI</text><text x="197" y="44" font-family="sans-serif" font-size="10" fill="#62775D">另一个 AI</text><path d="M153 222V241" stroke="#9CAF8F"/><text x="150" y="260" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#41633F">同一份记忆，留在本地</text></svg>';
const promptPanel = (index, label, desc, target) => '<div class="start-content" id="prompt-panel-' + index + '" role="tabpanel" aria-labelledby="prompt-tab-' + index + '"' + (index ? ' hidden' : '') + '><p class="start-instruction">' + desc + '</p><pre class="prompt-text">' + escape(prompts[index]) + '</pre><div class="start-foot"><a href="#' + target + '">' + label + '的完整说明 ↗</a><button type="button" class="copy-primary">复制这段话</button></div></div>';
const explore = [
  ['tasks', '把安排说给 AI', '待办与日历，各自清楚，也能相互关联。'],
  ['knowledge', '留住值得再看的内容', '笔记、链接、截图和灵感，在需要时找回来。'],
  ['people', '不只记名字，也记来往', '人物卡片、关系图，以及一起经历的事。'],
  ['architecture', '看懂 AI 到底读了什么', '短入口、启动地图、完整规则，一次讲明白。']
].map(([id, title, desc]) => '<a class="explore-link" href="#' + id + '"><span><strong>' + title + '</strong><small>' + desc + '</small></span><span class="arrow" aria-hidden="true">↗</span></a>').join('');
const page = '<!DOCTYPE html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>Loci 使用指南 · 让不同 AI 接着用</title><meta name="description" content="把安装或连接指令发给你的 AI，从任务、日历、人脉和知识库开始使用 Loci。了解短入口、启动地图和完整规则，以及设计取舍。"><link rel="canonical" href="https://www.tryloci.com/handbook/"><meta property="og:title" content="Loci 使用指南"><meta property="og:description" content="把记忆留在自己手里，让不同 AI 接着用。"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 40 40%27%3E%3Crect width=%2740%27 height=%2740%27 rx=%278%27 fill=%27%23276044%27/%3E%3Ctext x=%2710%27 y=%2729%27 font-size=%2728%27 font-family=%27serif%27 fill=%27%23f8f9f4%27%3EL%3C/text%3E%3C/svg%3E"><link rel="stylesheet" href="style.css"><script src="app.js" defer></script></head><body><a class="skip" href="#content">跳到正文</a><aside class="rail" id="navigation"><a class="brand" href="#home" aria-label="Loci 使用指南首页">Loci<span class="brand-dot"></span></a><p class="brand-label">使用指南 / FIELD GUIDE</p><nav class="toc" aria-label="指南目录">' + toc + '</nav><div class="rail-foot"><a href="https://www.tryloci.com/landing/">Loci 官网 ↗</a><a href="https://github.com/codesstar/loci" target="_blank" rel="noopener">GitHub ↗</a></div></aside><button class="backdrop" type="button" aria-label="关闭目录"></button><div class="shell"><header class="toolbar"><button class="menu-button" type="button" id="menu" aria-controls="navigation" aria-expanded="false">目录</button><div class="search-wrap"><label class="sr-only" for="search">搜索指南</label><input id="search" type="search" placeholder="搜索用法、问题或关键词…" autocomplete="off" aria-controls="search-results"><div class="search-results" id="search-results" hidden></div></div><div class="toolbar-actions"><a class="site-link" href="https://www.tryloci.com/demo/" target="_blank" rel="noopener">体验示例大脑 ↗</a><button type="button" class="text-button" id="print">打印指南</button></div><div class="progress" aria-hidden="true"></div></header><main id="content" tabindex="-1"><section class="home" id="home"><div class="hero-grid"><div class="hero"><div class="eyebrow">YOUR MEMORY. YOUR LOCI.</div><h1>把记忆留下，<br><em>换个 AI，也能接着用。</em></h1><p class="lead">让偏好、安排、人物和灵感有一个共同的归处。<br>Loci 把它们保存在本地，你和 AI 都能看、都能改。</p><div class="hero-links"><a href="#chapter-02">先认识 Loci ↗</a><a href="#architecture">了解它如何工作 ↗</a></div></div>' + drawing + '</div><div class="home-intro"><h2>从一句话开始。</h2><p>复制后发给 AI，查找、安装与配置交给它。</p></div><div class="start-panel"><div class="switcher" role="tablist" aria-label="选择安装场景"><button type="button" id="prompt-tab-0" role="tab" aria-selected="true" aria-controls="prompt-panel-0">第一次使用 Loci</button><button type="button" id="prompt-tab-1" role="tab" aria-selected="false" aria-controls="prompt-panel-1" tabindex="-1">连接新的 AI</button></div>' + promptPanel(0, '安装', '在 Claude Code、Codex、WorkBuddy 等能操作本地文件的 Agent 中发送：', 'start') + promptPanel(1, '连接', '已经有 Loci？直接把这段话发给新装的千问、豆包或其他 Agent：', 'connect') + '</div><p class="start-note">接入需要客户端支持本地文件与工具。已有大脑由 AI 自动查找，保留原数据，不用你找路径。</p><section class="explore"><p class="section-kicker">从日常用法，到背后的设计</p><div class="explore-grid">' + explore + '</div></section><footer class="home-footer"><span>记下重要的事，给下一次对话留一点线索。</span><a href="#faq">还有疑问？看看常见问题 ↗</a></footer></section>' + chapters.join('\n') + '</main></div><div class="toast" id="copy-status" role="status" aria-live="polite" hidden></div></body></html>\n';
if (/面试|创始人|adc37db|\/Users\/|file:\/\/|sources\//.test(page)) throw new Error('Internal or private material found in public guide');
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
for (const asset of publicAssets) {
  const destination = path.join(output, asset);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, 'docs', asset), destination);
}
fs.writeFileSync(path.join(output, 'index.html'), page);
console.log('Built public guide: ' + chapters.length + ' chapters, ' + Buffer.byteLength(page) + ' bytes.');
