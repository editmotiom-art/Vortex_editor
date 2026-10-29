import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(500);
await p.fill('input[placeholder="Como quer ser chamado"]', 'X');
await p.fill('input[type=email]', `x${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1800);
console.log('erro visível:', await p.locator('text=/inválido|existe|precisa/i').allInnerTexts().catch(()=>[]));
console.log({
  app: await p.locator('.app').count(),
  bandeja: await p.locator('.bandeja').count(),
  bandejaAbrir: await p.locator('.bandeja-abrir').count(),
  topbar: await p.locator('.topbar').count(),
  entrada: await p.locator('text=Criar sua conta').count(),
  errs: errs.slice(0,4),
});
await p.screenshot({ path: '/home/user/vortex/docs/diag-bandeja.png' });
await b.close();
