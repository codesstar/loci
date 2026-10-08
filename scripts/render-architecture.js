#!/usr/bin/env node
'use strict';

// GitHub-safe SVG: native text only, no foreignObject, remote fonts or scripts.
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../docs/assets');
const copy = {
  zh: {
    title: '一个入口，一本手册，一套本地数据',
    subtitle: '规则让 Agent 知道怎么用；工具负责执行；文件保存记忆。',
    install: '安装一次', entry: ['LOCI.md', '短入口 · 大脑路径与触发条件'],
    native: ['安装到各 Agent 原生指令入口', 'Claude Code · Codex · WorkBuddy', 'CLAUDE.md / AGENTS.md / MEMORY.md'],
    start: '每次启动：只取短偏好', hook: ['有 Hook：自动提供', '无 Hook：Agent 按入口调用', '两条路径共用同一个读取器'],
    prefs: ['loci-context.js', '读取 me/preferences.md', '输出短偏好、路径和手册指针'],
    use: '首次需要记忆：读手册，再操作',
    manual: ['LOCI-RULES.md', '完整读一次', '有效且未变时复用'],
    read: ['按需读取数据', '先查索引', '再打开相关记录'],
    write: ['脚本 / 本地 API', '校验、写入、关联', '按操作记录活动'],
    dashboard: ['Dashboard', '人查看、修改同一份数据'],
    data: ['本地 Markdown · JSON · 附件', '任务 / 日程 / 偏好 / 人脉 / 笔记 / 碎片', '项目正文留在项目仓库，大脑保存索引。'],
    foot: 'Hook 增强送达，不保证模型遵守；实际数据始终按需读取。',
    desc: '安装器将 LOCI.md 写入 Agent 指令入口。启动由可选 Hook 或入口调用同一偏好读取器。首次使用记忆时完整读取 LOCI-RULES.md，再按需读数据并调用脚本或本地 API。Dashboard 与 Agent 共用本地文件。'
  },
  en: {
    title: 'One entry. One manual. Shared local data.',
    subtitle: 'Instructions guide the agent. Tools execute. Files keep the memory.',
    install: 'Install once', entry: ['LOCI.md', 'Brain path + when to load rules'],
    native: ['Install into native agent instructions', 'Claude Code · Codex · WorkBuddy', 'CLAUDE.md / AGENTS.md / MEMORY.md'],
    start: 'At session start: compact preferences', hook: ['With a hook: automatic context', 'Without one: the agent calls it', 'Both paths use the same reader'],
    prefs: ['loci-context.js', 'Reads me/preferences.md', 'Returns preferences + file pointers'],
    use: 'At first memory use: read the manual, then act',
    manual: ['LOCI-RULES.md', 'Read in full once', 'Reuse while valid'],
    read: ['Read on demand', 'Look up an index', 'Open relevant records'],
    write: ['Scripts / local API', 'Validate, write, link', 'Log the operation'],
    dashboard: ['Dashboard', 'People view and edit the same data'],
    data: ['Local Markdown · JSON · attachments', 'Tasks / calendar / preferences / people / notes / scraps', 'Project details stay in their repository; the brain keeps an index.'],
    foot: 'Hooks improve delivery, not compliance. Actual data stays on demand.',
    desc: 'The installer copies LOCI.md into native agent instructions. An optional hook or instruction fallback calls the same preference reader at startup. At first memory use, the agent reads LOCI-RULES.md, retrieves relevant data and uses scripts or local APIs. Dashboard and agents share local files.'
  }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));

function render(lang, dark) {
  const c = copy[lang];
  const p = dark
    ? {bg:'#101915',panel:'#1a2820',line:'#3d5647',ink:'#edf4ee',muted:'#b3c8ba',accent:'#9cdbb6',soft:'#203c2c',arrow:'#87b79b'}
    : {bg:'#f6f8f4',panel:'#ffffff',line:'#d2dfd5',ink:'#243b2d',muted:'#52685a',accent:'#236941',soft:'#e7f1e6',arrow:'#67967b'};
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960" role="img" aria-labelledby="title desc" xml:lang="${lang}">`,
    `<title id="title">${esc(c.title)}</title><desc id="desc">${esc(c.desc)}</desc>`,
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 L8 5 L1 9" fill="none" stroke="${p.arrow}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`,
    `<rect width="960" height="960" rx="20" fill="${p.bg}"/>`,
    `<g font-family="'PingFang SC','Microsoft YaHei','Noto Sans CJK SC',Helvetica,sans-serif">`];
  const text = (x,y,value,size=21,color=p.ink,weight=400) => parts.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${esc(value)}</text>`);
  const rect = (x,y,w,h,fill=p.panel) => parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${p.line}"/>`);
  const arrow = (x1,y1,x2,y2,both=false) => parts.push(`<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${p.arrow}" stroke-width="2.3" marker-end="url(#arrow)"${both?' marker-start="url(#arrow)"':''}/>`);
  const stage = (n,y,label) => { text(40,y,n,18,p.accent,700); text(83,y,label,22,p.ink,650); };
  const card = (x,y,w,h,lines,fill) => { rect(x,y,w,h,fill); lines.forEach((s,i)=>text(x+22,y+33+i*28,s,i===0?22:19,i===0?p.ink:p.muted,i===0?650:400)); };
  text(40,38,'LOCI / ARCHITECTURE',14,p.accent,700);
  text(40,83,c.title,lang==='zh'?34:32,p.ink,700);
  text(40,117,c.subtitle,20,p.muted);

  stage('01',169,c.install);
  card(40,189,314,116,c.entry);
  arrow(369,247,407,247);
  card(423,189,497,116,c.native);

  stage('02',354,c.start);
  card(40,374,411,117,c.hook);
  arrow(465,432,495,432);
  card(511,374,409,117,c.prefs);

  stage('03',545,c.use);
  card(40,565,260,118,c.manual,p.soft);
  arrow(310,624,339,624);
  card(351,565,260,118,c.read);
  arrow(621,624,650,624);
  card(662,565,258,118,c.write);
  card(40,704,382,78,c.dashboard);
  arrow(231,790,231,819,true);
  arrow(791,696,791,818,true);
  rect(40,831,880,65,p.soft);
  text(61,858,c.data[0],23,p.ink,650);
  text(61,882,c.data[2],17,p.muted);
  text(40,930,c.foot,17,p.muted);
  parts.push('</g></svg>');
  return parts.join('\n')+'\n';
}
fs.mkdirSync(out,{recursive:true});
for (const lang of ['zh','en']) for (const theme of ['light','dark']) {
  const name = `architecture-${lang}-${theme}.svg`;
  fs.writeFileSync(path.join(out,name),render(lang,theme==='dark'));
  console.log(name);
}
