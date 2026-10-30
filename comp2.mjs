import { chromium, devices } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
async function medir(nome, url, prep) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  if (prep) await p.evaluate(prep);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 600, id: 1 }] });
  for (let i = 1; i <= 12; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 600 - i * 35, id: 1 }] });
    await p.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({ y: window.scrollY, alt: document.documentElement.scrollHeight }));
  console.log(nome.padEnd(46), 'scrollY =', r.y, '| altura', r.alt);
  await ctx.close();
}
await medir('landing (como está)', 'http://127.0.0.1:3001');
await medir('landing sem touch-action/overscroll no body', 'http://127.0.0.1:3001', () => {
  document.body.style.touchAction = 'auto';
  document.body.style.overscrollBehaviorY = 'auto';
  document.documentElement.style.touchAction = 'auto';
});
await medir('landing com html/body overflow visible', 'http://127.0.0.1:3001', () => {
  document.documentElement.style.overflow = 'visible';
  document.body.style.overflow = 'visible';
});
await medir('admin (#admin)', 'http://127.0.0.1:3001/#admin');
await b.close();
