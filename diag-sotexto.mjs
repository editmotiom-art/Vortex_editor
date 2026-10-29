import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Só texto');
  await p.fill('input[type=email]', `s${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1200);
}
console.log(await p.evaluate(() => window.__vortexTeste({ video: false, audio: false })));
await p.waitForTimeout(400);
await p.screenshot({ path: '/home/user/vortex/docs/diag-sotexto-preview.png' });
await p.click('.topbar button:has-text("Exportar")');
await p.waitForTimeout(400);
await p.click('.modal button:has-text("Frame PNG")');
await p.waitForSelector('.exp-previa img', { timeout: 60000 });
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.modal button:has-text("Baixar este arquivo")')]);
await dl.saveAs('/home/user/vortex/.cache/exports/sotexto.png');
console.log('ok', fs.statSync('/home/user/vortex/.cache/exports/sotexto.png').size);
await b.close();
