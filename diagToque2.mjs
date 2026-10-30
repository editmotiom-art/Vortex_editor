/** Descobre quem está engolindo o gesto: testa com e sem a landing, e checa listeners */
import { chromium, devices } from 'playwright';
const URL = process.argv[2] ?? 'https://vortex-editor-gwyd.vercel.app';
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const cdp = await ctx.newCDPSession(p);
const arrastar = async () => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 600 }] });
  for (let i = 1; i <= 10; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 600 - i * 40 }] });
    await p.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(600);
};
// conta eventos que chegam no window para saber se o navegador está recebendo o toque
await p.evaluate(() => {
  window.__ev = { touchstart: 0, touchmove: 0, scroll: 0 };
  ['touchstart', 'touchmove', 'scroll'].forEach((n) =>
    window.addEventListener(n, () => { window.__ev[n] += 1; }, { passive: true, capture: true }),
  );
});
await arrastar();
console.log('eventos:', await p.evaluate(() => window.__ev), 'scrollY:', await p.evaluate(() => window.scrollY));
console.log('scrollingElement:', await p.evaluate(() => document.scrollingElement?.tagName));
console.log('overflow html/body:', await p.evaluate(() => [getComputedStyle(document.documentElement).overflow, getComputedStyle(document.body).overflow]));
// rolagem programática funciona?
await p.evaluate(() => window.scrollTo(0, 500));
console.log('após scrollTo(500):', await p.evaluate(() => window.scrollY));
// insight: quem bloqueia? testa sem JS de arraste: navega #planos
await p.goto(URL + '/#planos', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.evaluate(() => window.scrollTo(0, 0));
await arrastar();
console.log('#planos scrollY:', await p.evaluate(() => window.scrollY));
await b.close();
