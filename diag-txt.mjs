import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Diag');
  await p.fill('input[type=email]', `d${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1200);
}
const info = await p.evaluate(async () => {
  await window.__vortexTeste();
  const s = window.__vortexEditor?.getState?.() ?? null;
  return { temStore: !!s };
});
console.log(info);
// inspeciona elementos via canvas: pega o doc pelo localStorage? usa renderFrame do bundle?
const els = await p.evaluate(() => {
  const c = document.querySelector('.stage canvas') || document.querySelector('canvas');
  return { canvas: c ? [c.width, c.height] : null };
});
console.log(els);
await p.screenshot({ path: '/home/user/vortex/docs/diag-txt.png' });
await b.close();
