import { chromium, devices } from 'playwright';
const b = await chromium.launch();
for (const [nome, cfg] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['celular', devices['iPhone 13']]]) {
  const ctx = await b.newContext({ ...cfg });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(nome, {
    overflowX: overflow,
    planos: await p.locator('.lp-plano').count(),
    precos: await p.locator('.lp-preco').allInnerTexts(),
    recursos: await p.locator('.lp-card').count(),
    respBlocos: await p.locator('.lp-resp-grid > div').count(),
    errs: errs.slice(0,2),
  });
  await p.screenshot({ path: `/home/user/vortex/docs/screenshot-landing-${nome}.png`, fullPage: nome === 'celular' ? false : true });
  await ctx.close();
}
await b.close();
