/** Diagnóstico: gesto de arrastar de verdade (touch) na landing */
import { chromium, devices } from 'playwright';
const URL = process.argv[2] ?? 'https://vortex-editor-gwyd.vercel.app';
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);

// quem está por cima em vários pontos da tela?
const pontos = await p.evaluate(() => {
  const ys = [50, 200, 350, 500, 650];
  return ys.map((y) => {
    const el = document.elementFromPoint(195, y);
    const cs = el ? getComputedStyle(el) : null;
    return { y, tag: el?.tagName, cls: (el?.className ?? '').toString().slice(0, 50), pos: cs?.position, touch: cs?.touchAction, overflow: cs?.overflow };
  });
});
console.log('pontos:', JSON.stringify(pontos, null, 1));

// arrasto real via CDP (touch)
const cdp = await ctx.newCDPSession(p);
const deslizar = async (de, para) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: de }] });
  for (let i = 1; i <= 8; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: de + ((para - de) * i) / 8 }] });
    await p.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(500);
};
const antes = await p.evaluate(() => window.scrollY);
await deslizar(600, 150);
const depois1 = await p.evaluate(() => window.scrollY);
await deslizar(600, 150);
const depois2 = await p.evaluate(() => window.scrollY);
console.log('scrollY:', antes, '→', depois1, '→', depois2);
await b.close();
