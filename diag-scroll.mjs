import { chromium, devices } from 'playwright';
const b = await chromium.launch();
for (const [nome, ctxcfg] of [
  ['iphone', { ...devices['iPhone 13'] }],
  ['android', { ...devices['Pixel 7'] }],
  ['modo-pc', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: false }],
]) {
  const ctx = await b.newContext(ctxcfg);
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  const antes = await p.evaluate(() => ({ y: window.scrollY, sh: document.documentElement.scrollHeight, ih: window.innerHeight, ovBody: getComputedStyle(document.body).overflow, ovHtml: getComputedStyle(document.documentElement).overflow }));
  await p.mouse.wheel(0, 1200).catch(() => {});
  await p.evaluate(() => window.scrollTo(0, 1400));
  await p.waitForTimeout(600);
  const depois = await p.evaluate(() => ({ y: window.scrollY, sh: document.documentElement.scrollHeight, ih: window.innerHeight }));
  console.log(nome, { antes, depois });
  await p.screenshot({ path: `/home/user/vortex/docs/diag-scroll-${nome}.png` });
  await ctx.close();
}
await b.close();
