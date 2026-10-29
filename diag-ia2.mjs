import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'IA2');
  await p.fill('input[type=email]', `i2${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1200);
}
await p.click('.topbar button:has-text("✦ IA")');
await p.waitForSelector('.estudio-ia');
await p.fill('.ia-prompt', 'retrato cinematografico na chuva, luz neon');
await p.click('.estudio-ia button:has-text("Gerar imagem")');
// com IA ligada, o pedido vai para a função (que responde "não configurada" sem chave)
let msg = '';
for (let i = 0; i < 30; i++) {
  await p.waitForTimeout(400);
  const t = await p.locator('.toast').last().innerText().catch(()=>'');
  if (t && t !== msg) { msg = t; break; }
}
console.log('resposta:', msg);
console.log('errs:', errs.slice(0,3));
await b.close();
