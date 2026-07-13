// tests/mobile-probe.js — needs playwright-core (npm i playwright-core) and a
// cached Chromium (adjust executablePath). Usage: node tests/mobile-probe.js "#today" out.png <hash> <out.png> — iPhone-13 emulation via playwright-core against
// the cached Chromium. Screenshots the page AND reports every element wider
// than the viewport (the horizontal-overflow culprits), plus page scrollWidth.
'use strict';
const { chromium } = require('playwright-core');

const page1 = process.argv[2] || '#today';
const out = process.argv[3] || 'probe.png';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/Users/callum/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell',
    headless: true,
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8766/?e2e=1' + page1, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3500);

  const report = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const bad = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 2 || r.right > vw + 6) {
        const cls = (typeof el.className === 'string' ? el.className : '').split(/\s+/).slice(0, 4).join('.');
        bad.push({
          sel: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
          w: Math.round(r.width), right: Math.round(r.right),
        });
      }
      if (bad.length > 40) break;
    }
    // keep the OUTERMOST offenders: drop entries whose parent is also listed
    return {
      viewport: vw,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: bad.slice(0, 25),
    };
  });
  console.log(JSON.stringify(report, null, 1));
  await page.screenshot({ path: out });
  await browser.close();
})().catch(e => { console.error('PROBE FAIL:', e.message); process.exit(1); });
