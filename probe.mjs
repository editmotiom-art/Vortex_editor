import { chromium } from 'playwright';
import path from 'node:path';
const b = await chromium.launch({ channel: 'chromium' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
p.setDefaultTimeout(60000);
await p.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(500);
await p.fill('input[placeholder="Como quer ser chamado"]', 'Probe');
await p.fill('input[type=email]', `p${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(2200);
await p.locator('.bandeja input[type=file]').first().setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm');
await p.waitForTimeout(3000);
const doc = await p.evaluate(() => {
  const d = window.__vortexDoc?.();
  return d ? { elementos: d.elements.map((e) => ({ type: e.type, name: e.name, dur: Math.round(e.duration), track: e.track })) } : null;
});
console.log('DOC:', JSON.stringify(doc, null, 1));
const classes = await p.evaluate(() => {
  const set = new Set();
  document.querySelectorAll('*').forEach((e) => (e.className || '').toString().split(/\s+/).forEach((c) => c && set.add(c)));
  return [...set].filter((c) => /clip|tl-|track|trilha|element/i.test(c)).sort();
});
console.log('CLASSES:', classes.join(' '));
await p.screenshot({ path: '/tmp/probe.png' });
await b.close();
