import { chromium, devices } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
async function medir(nome, prep) {
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  if (prep) await p.evaluate(prep);
  const cdp = await ctx.newCDPSession(p);
  const g = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let i = 1; i <= 12; i += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 35, id: 1 }] });
      await p.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(500);
  };
  await g(195, 600);
  const y = await p.evaluate(() => window.scrollY);
  console.log(nome.padEnd(42), 'scrollY =', y);
  await ctx.close();
}
await medir('original', null);
await medir('landing inteira com pointer-events:none', () => {
  document.querySelector('.landing').style.pointerEvents = 'none';
});
await medir('sem .lp-frame (vídeo falso)', () => {
  document.querySelectorAll('.lp-frame').forEach((e) => e.remove());
});
await medir('sem backdrop-filter/fixed', () => {
  document.querySelectorAll('*').forEach((e) => {
    const c = getComputedStyle(e);
    if (c.position === 'fixed') e.remove();
  });
});
await b.close();
