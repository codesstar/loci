#!/usr/bin/env node
'use strict';
// Native SVG only: readable in GitHub images, with no foreignObject or remote fonts.
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../docs/assets');
const words = {
  zh: {
    title: '换个 Agent，记忆仍在。', sub: '两份规则负责指路，一套本地数据持续积累。',
    install: '安装一次', installLine: 'LOCI.md → 各 Agent 原生指令入口',
    first: '每次会话开始', later: '需要使用记忆时',
    names: ['找到大脑', '带上偏好', '读懂规则', '执行操作'],
    files: ['LOCI.md', '启动地图', 'LOCI-RULES.md', '文件工具 / 脚本 / API'],
    notes: [ ['大脑在哪里，', '何时读取完整规则。'], ['Hook 已提供就复用；', '否则调用同一读取器。'], ['首次记忆操作时完整读；', '有效、未变时复用。'], ['先查索引，再取相关数据；', '写入后核对结果。'] ],
    output: '短偏好 + 路径 + 指针', readwrite: '按需读 / 写', shared: '你的本地大脑',
    data: '任务 · 日程 · 人脉 · 笔记 · 碎片 · 个人记忆', formats: 'Markdown  /  JSON  /  附件',
    you: '你也能看，也能改', dashboard: 'Dashboard', direct: '同一份数据',
    foot: '项目正文留在各自仓库，大脑只留索引。',
    desc: '安装将 LOCI.md 合并进各 Agent 原生入口。会话启动获取同源短偏好。首次记忆操作读取 LOCI-RULES.md，再按需检索并执行工具。Agent 和 Dashboard 读写同一份本地数据，项目正文留在项目仓库。'
  },
  en: {
    title: 'A new agent. The same memory.', sub: 'Two instruction files. One shared home for your data.',
    install: 'INSTALL ONCE', installLine: 'LOCI.md → native agent instructions',
    first: 'AT SESSION START', later: 'WHEN MEMORY IS NEEDED',
    names: ['Find the brain', 'Get preferences', 'Read the rules', 'Take action'],
    files: ['LOCI.md', 'Startup map', 'LOCI-RULES.md', 'File tools / scripts / API'],
    notes: [ ['Where the brain lives.', 'When to load the manual.'], ['Reuse hook output, or', 'call the same reader.'], ['Read in full at first use.', 'Reuse while valid.'], ['Index first, relevant data next.', 'Verify after writing.'] ],
    output: 'Preferences + file pointers', readwrite: 'READ / WRITE', shared: 'Your local brain',
    data: 'Tasks · Calendar · People · Notes · Scraps · Profile', formats: 'Markdown  /  JSON  /  Attachments',
    you: 'See it. Edit it.', dashboard: 'Dashboard', direct: 'SAME DATA',
    foot: 'Project details stay in their own repositories; the brain keeps an index.',
    desc: 'LOCI.md is installed in native agent instructions. At startup a hook or the same reader supplies compact preferences. At first memory use the agent reads LOCI-RULES.md, retrieves relevant data, and executes tools. Agents and Dashboard share local files.'
  }
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function render(lang, dark, mobile) {
  const c = words[lang];
  const p = dark
    ? {bg:'#111e19',ink:'#edf3e9',muted:'#aec1af',line:'#3b5546',accent:'#bee391',paper:'#21362b',soft:'#253e30',store:'#dcebbf',storeInk:'#22392b',detail:'#516949'}
    : {bg:'#f6f8f1',ink:'#243f31',muted:'#63765e',line:'#c8d6bc',accent:'#3f6845',paper:'#fffef8',soft:'#e5edda',store:'#284d38',storeInk:'#f1f6e6',detail:'#c3d9ae'};
  const w=mobile?640:1240, h=mobile?1380:800;
  const a=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc" xml:lang="${lang}">`,
    `<title id="title">${esc(c.title)}</title><desc id="desc">${esc(c.desc)}</desc>`,
    `<defs><marker id="arrow" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M3 2L9 6L3 10" fill="none" stroke="${p.accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>`,
    `<rect width="${w}" height="${h}" rx="18" fill="${p.bg}"/>`,
    `<g font-family="'Avenir Next','PingFang SC','Microsoft YaHei',sans-serif">`];
  const text=(x,y,s,size=22,fill=p.ink,weight=400,extra='')=>a.push(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${esc(s)}</text>`);
  const line=(d,stroke=p.line,width=1.5,extra='')=>a.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`);
  const rect=(x,y,width,height,rx=8,fill=p.paper,stroke='none')=>a.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`);
  const arrow=(d,both=false)=>line(d,p.accent,2,`marker-end="url(#arrow)"${both?' marker-start="url(#arrow)"':''}`);
  const icon=(x,y,type)=>{
    a.push(`<g transform="translate(${x} ${y})">`);
    if(type===0){
      rect(7,7,71,87,6,p.soft);rect(0,0,71,87,6,p.paper,p.line);
      line('M18 24H47M18 36H55M18 48H41',p.line,3);
      a.push(`<circle cx="54" cy="69" r="18" fill="${p.accent}"/>`);
      line('M46 69H61M56 64L61 69L56 74',p.bg,2);
    } else if(type===1){
      rect(0,8,92,72,8,p.paper,p.line);
      [25,45,65].forEach((yy,i)=>{a.push(`<circle cx="17" cy="${yy}" r="4" fill="${i===0?p.accent:p.line}"/>`);line(`M30 ${yy}H${i===1?63:74}`,i===0?p.accent:p.line,3);});
      a.push(`<circle cx="85" cy="14" r="14" fill="${p.soft}" stroke="${p.line}"/>`);line('M85 7V14L90 18',p.accent,1.8);
    } else if(type===2){
      a.push(`<path d="M0 12Q20 2 42 12Q65 2 87 12V79Q65 69 42 79Q20 69 0 79Z" fill="${p.paper}" stroke="${p.line}" stroke-width="1.5"/>`);
      line('M42 12V79',p.accent,2);line('M12 28H29M12 41H29M12 54H24M55 28H74M55 41H74M55 54H68',p.line,2.5);
      a.push(`<path d="M58 5V27L64 23L70 27V5" fill="${p.accent}"/>`);
    } else {
      rect(0,9,92,72,8,p.paper,p.line);line('M0 28H92',p.line,1.5);
      [13,22,31].forEach(xx=>a.push(`<circle cx="${xx}" cy="19" r="2" fill="${p.line}"/>`));
      line('M18 43L28 52L18 61M39 61H60',p.accent,3);
      a.push(`<circle cx="86" cy="75" r="15" fill="${p.accent}"/>`);line('M80 75L84 79L92 70',p.bg,2.2);
    }
    a.push('</g>');
  };
  const dashboard=(x,y)=>{
    rect(x,y,70,50,5,p.paper,p.line);line(`M${x} ${y+12}H${x+70}M${x+18} ${y+12}V${y+50}`,p.line);
    rect(x+27,y+21,14,19,2,p.soft);rect(x+46,y+21,15,8,2,p.soft);line(`M${x+46} ${y+36}H${x+61}`,p.accent,2);
  };
  text(48,49,'LOCI  /  HOW MEMORY WORKS',14,p.accent,600,'letter-spacing="2"');
  text(48,108,c.title,mobile?(lang==='zh'?37:31):43,p.ink,600);
  text(48,146,c.sub,mobile?21:23,p.muted);
  if(!mobile){
    rect(48,179,1144,55,6,p.soft);
    text(68,213,c.install,15,p.accent,600);
    text(lang==='zh'?180:218,214,c.installLine,20,p.ink,500);
    text(1169,213,'Claude Code · Codex · WorkBuddy',17,p.muted,400,'text-anchor="end"');
    text(48,278,c.first,15,p.muted,600);line(`M${lang==='zh'?184:238} 273H575`);
    text(636,278,c.later,15,p.muted,600);line(`M${lang==='zh'?795:890} 273H1192`);
    [48,342,636,930].forEach((x,i)=>{
      icon(x,305,i);
      if(i<3)arrow(`M${x+193} 349H${x+258}`);
      text(x,438,'0'+(i+1),14,p.accent,600);
      text(x+34,440,c.names[i],lang==='zh'?27:25,p.ink,600);
      text(x,475,c.files[i],i===3?18:22,p.accent,550);
      c.notes[i].forEach((s,j)=>text(x,509+j*27,s,18,p.muted));
    });
    arrow('M1061 557V582Q1061 596 1047 596H761V622',true);
    text(1080,585,c.readwrite,13,p.muted,500);
    rect(48,630,772,118,10,p.store);
    text(75,669,c.shared,28,p.storeInk,600);
    text(75,702,c.data,19,p.detail);
    text(75,729,c.formats,15,p.detail);
    dashboard(979,634);text(1064,650,c.you,lang==='zh'?16:17,p.muted);
    text(979,716,c.dashboard,26,p.ink,550);
    arrow('M838 687H953',true);text(896,674,c.direct,12,p.muted,500,'text-anchor="middle"');
    text(48,779,c.foot,16,p.muted);
  }else{
    rect(48,173,544,92,6,p.soft);text(66,204,c.install+' · '+c.installLine,lang==='zh'?18:15,p.ink,500);
    text(66,241,'Claude Code · Codex · WorkBuddy',20,p.muted);
    text(48,309,c.first,17,p.muted,600);line('M220 303H590');
    const ys=[338,512,747,921];
    ys.forEach((y,i)=>{
      icon(57,y+4,i);
      text(179,y+24,'0'+(i+1),16,p.accent,600);text(212,y+25,c.names[i],30,p.ink,600);
      text(179,y+62,c.files[i],24,p.accent,500);
      c.notes[i].forEach((s,j)=>text(179,y+98+j*29,s,23,p.muted));
      if(i===0||i===2)arrow(`M101 ${y+109}V${y+146}`);
    });
    text(48,712,c.later,17,p.muted,600);line('M270 706H590');
    arrow('M101 1033V1063H320V1091',true);
    text(349,1076,c.readwrite,17,p.muted);
    rect(48,1102,544,122,10,p.store);
    text(70,1142,c.shared,30,p.storeInk,600);
    text(70,1177,c.data,lang==='zh'?20:16,p.detail);
    text(70,1206,c.formats,18,p.detail);
    arrow('M320 1236V1263',true);
    dashboard(112,1275);text(200,1298,c.dashboard,27,p.ink,550);text(200,1327,c.you+' · '+c.direct,19,p.muted);
    text(320,1361,c.foot,lang==='zh'?17:13,p.muted,400,'text-anchor="middle"');
  }
  a.push('</g></svg>');return a.join('\n')+'\n';
}
fs.mkdirSync(out,{recursive:true});
for(const lang of ['zh','en'])for(const theme of ['light','dark']){
  const name=`architecture-${lang}-${theme}.svg`;
  fs.writeFileSync(path.join(out,name),render(lang,theme==='dark',false));console.log(name);
}
fs.writeFileSync(path.join(out,'architecture-zh-mobile.svg'),render('zh',false,true));
