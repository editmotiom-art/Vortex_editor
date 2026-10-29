/** Screenshot da aba nova: Admin → API e hospedagem (com API apontada para o Worker) */
import { chromium } from 'playwright';
const APP = process.argv[2] ?? 'http://127.0.0.1:8888';
const WORKER = process.argv[3] ?? 'http://127.0.0.1:8787';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
await p.goto(APP, { waitUntil: 'domcontentloaded' });
await p.evaluate((w) => {
  const cfg = JSON.parse(localStorage.getItem('vortex.config.v1') ?? '{}');
  cfg.api = { url: w, ativo: true };
  localStorage.setItem('vortex.config.v1', JSON.stringify(cfg));
  localStorage.setItem('vortex.admin.v1', JSON.stringify({ email: 'aliceoliveirade22@gmail.com', nome: 'Alice', desde: Date.now() }));
}, WORKER);
await p.goto(`${APP}/#admin`, { waitUntil: 'networkidle' });
await p.evaluate((w) => {
  const cfg = JSON.parse(localStorage.getItem('vortex.config.v1') ?? '{}');
  cfg.api = { url: w, ativo: true };
  localStorage.setItem('vortex.config.v1', JSON.stringify(cfg));
}, WORKER);
await p.reload({ waitUntil: 'networkidle' });
await p.fill('input[type=email]', 'aliceoliveirade22@gmail.com').catch(() => {});
await p.fill('input[type=password]', '01082020').catch(() => {});
await p.locator('button:has-text("Entrar")').first().click().catch(() => {});
await p.waitForTimeout(1200);
const aba = p.locator('button:has-text("API e hospedagem")').first();
console.log('aba existe:', await aba.count());
await aba.click();
await p.waitForTimeout(500);
await p.locator('button:has-text("Testar /api/ping")').click();
await p.waitForTimeout(2500);
console.log('resultado:', (await p.locator('text=/API respondeu|Não respondeu/').first().innerText().catch(() => '—')));
await p.screenshot({ path: 'docs/prova/15-admin-api.png', fullPage: true });
await b.close();
