import { chromium, devices } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], hasTouch: true, isMobile: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Mobile');
  await p.fill('input[type=email]', `m${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1400);
}
// dispensa o aviso e confirma que não volta
await p.click('.rotate-hint button');
await p.waitForTimeout(300);
console.log('hint escondido:', await p.evaluate(() => getComputedStyle(document.querySelector('.rotate-hint')).display));
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(900);
console.log('hint depois do reload:', await p.evaluate(() => getComputedStyle(document.querySelector('.rotate-hint')).display));

// abre a gaveta de mídia e toca num template
await p.click('.dock-btn:has-text("Mídia")');
await p.waitForTimeout(500);
const card = p.locator('.lib-card, .lib-item, .card-item, .side-card').first();
console.log('cards visíveis:', await card.count() ? await card.first().isVisible() : 'nenhum');
if (await card.count()) { await card.first().click({ force: true }); await p.waitForTimeout(700); }
console.log('clips após tocar no card:', await p.evaluate(() => window.__vortexDoc().elements.length));
await p.screenshot({ path: '/home/user/vortex/docs/screenshot-mobile.png' });
console.log('errs:', errs.slice(0,3));
await b.close();
