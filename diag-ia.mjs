import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'IA');
  await p.fill('input[type=email]', `i${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1200);
}
await p.click('.topbar button:has-text("✦ IA")');
await p.waitForSelector('.estudio-ia');
console.log({
  aviso: await p.locator('.ia-aviso').isVisible(),
  estilos: await p.locator('.ia-chips .chip').count(),
  botao: await p.locator('.estudio-ia button:has-text("Gerar imagem")').isVisible(),
});
await p.click('.estudio-ia button:has-text("Gerar imagem")');
await p.waitForTimeout(500);
console.log('toast:', await p.locator('.toast').last().innerText().catch(()=>'(sem toast)'));
await p.screenshot({ path: '/home/user/vortex/docs/screenshot-ia.png' });
console.log('errs:', errs.slice(0,3));
await b.close();
