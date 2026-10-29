import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Doc');
  await p.fill('input[type=email]', `d${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1200);
}
console.log(await p.evaluate(() => window.__vortexTeste()));
const d = await p.evaluate(() => window.__vortexDoc()); console.log(JSON.stringify(d.tracks)); console.log(JSON.stringify(d.elements));
await b.close();
