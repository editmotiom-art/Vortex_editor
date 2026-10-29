/** Prova de segurança: API configurada mas MORTA → o editor volta sozinho para a Netlify */
import { chromium } from 'playwright';
const APP = process.argv[2] ?? 'http://127.0.0.1:8888';
const MORTA = 'http://127.0.0.1:9'; // porta fechada de propósito
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
const r = []; const ok = (n, c, e = '') => r.push({ n, c: Boolean(c), e });
const pedidos = []; p.on('request', (q) => { if (q.url().includes('/.netlify/') || q.url().startsWith(MORTA)) pedidos.push(q.url()); });
const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 100)));

await p.goto(APP, { waitUntil: 'domcontentloaded' });
await p.evaluate((morta) => {
  const cfg = JSON.parse(localStorage.getItem('vortex.config.v1') ?? '{}');
  cfg.api = { url: morta, ativo: true };
  localStorage.setItem('vortex.config.v1', JSON.stringify(cfg));
}, MORTA);
await p.goto(APP, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")'); await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'FALL');
await p.fill('input[type=email]', `fb${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")'); await p.waitForTimeout(1800);

await p.locator('.topbar button:has-text("Legenda")').first().click({ force: true });
await p.waitForSelector('.tr-painel');
await p.fill('.tr-textarea', 'A API configurada está fora, mas o editor continua.');
await p.locator('.tr-voz button:has-text("Narrar no playhead")').click();
let clipe = null;
for (let i = 0; i < 50; i += 1) {
  await p.waitForTimeout(500);
  clipe = await p.evaluate(() => window.__vortexDoc().elements.find((e) => e.type === 'audio' && /Voz/.test(e.name)) ?? null);
  if (clipe) break;
}
ok('voz funciona mesmo com a API morta (fallback)', clipe, clipe ? `${(clipe.duration / 1000).toFixed(1)}s` : 'não criou');
ok('tentou a API e caiu para a Netlify', pedidos.some((u) => u.startsWith(MORTA)) && pedidos.some((u) => u.includes('/.netlify/')));
await p.screenshot({ path: 'docs/prova/14-fallback-netlify.png' });
console.log('\n=== RESERVA (Netlify) COM API FORA ===');
for (const x of r) console.log(`${x.c ? '✓' : '✗'} ${x.n}${x.e ? ' · ' + x.e : ''}`);
console.log(`erros JS: ${errs.length}`);
await b.close();
