import { chromium, devices } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const url = process.argv[2] ?? 'http://127.0.0.1:3001';
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const cdp = await ctx.newCDPSession(p);
const g = async () => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 600, id: 1 }] });
  for (let i = 1; i <= 12; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 600 - i * 35, id: 1 }] });
    await p.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(600);
};
await g(); const a = await p.evaluate(() => window.scrollY);
await g(); const c = await p.evaluate(() => window.scrollY);
await g(); const d = await p.evaluate(() => window.scrollY);
console.log('GESTO REAL no celular → scrollY:', a, '→', c, '→', d);
await p.screenshot({ path: 'docs/prova/30-rolagem-celular.png' });
await b.close();
