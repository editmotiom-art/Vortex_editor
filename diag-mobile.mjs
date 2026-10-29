import { chromium, devices } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Mobile');
  await p.fill('input[type=email]', `m${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1500);
}
const vis = async (sel) => p.locator(sel).first().isVisible().catch(() => false);
console.log({
  themeBtn: await vis('.theme-btn'),
  exportar: await vis('.topbar button:has-text("Exportar")'),
  canvas: await vis('canvas'),
  timeline: await vis('.timeline-shell'),
  tema: await p.evaluate(() => document.documentElement.getAttribute('data-theme')),
});
// tocar num template da biblioteca
const card = p.locator('.lib-card, .lib-item, .card-item, .side-card').first();
try { if (await card.count()) { await card.click({ force: true, timeout: 4000 }); await p.waitForTimeout(700); } } catch (e) { console.log('clique no card:', e.message.slice(0,60)); }
console.log('hint oculto:', await p.evaluate(() => !!document.querySelector('.rotate-hint.oculto') || getComputedStyle(document.querySelector('.rotate-hint')).display === 'none'));
console.log('clips:', await p.evaluate(() => window.__vortexDoc().elements.length));
await p.screenshot({ path: '/home/user/vortex/docs/screenshot-mobile.png' });
console.log('errs:', errs.slice(0, 4));
await b.close();
