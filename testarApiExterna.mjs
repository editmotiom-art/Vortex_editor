/**
 * Prova que o editor funciona com a API no Cloudflare Worker:
 * abre o app no servidor local (serve o bundle), configura Admin → API com a
 * URL do Worker e repete os testes de voz, texto, skills e Drive.
 *   node testarApiExterna.mjs http://127.0.0.1:8888 http://127.0.0.1:8787
 */
import { chromium } from 'playwright';
const APP = process.argv[2] ?? 'http://127.0.0.1:8888';
const WORKER = process.argv[3] ?? 'http://127.0.0.1:8787';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
const r = [];
const ok = (nome, cond, extra = '') => r.push({ nome, ok: Boolean(cond), extra });
const pedidos = [];
p.on('request', (q) => { if (q.url().includes('/api/') || q.url().includes('/.netlify/')) pedidos.push(q.url()); });
const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));

/* 1. configura a API em localStorage antes de abrir o editor */
await p.goto(APP, { waitUntil: 'domcontentloaded' });
await p.evaluate((worker) => {
  const cfg = JSON.parse(localStorage.getItem('vortex.config.v1') ?? '{}');
  cfg.api = { url: worker, ativo: true };
  localStorage.setItem('vortex.config.v1', JSON.stringify(cfg));
}, WORKER);

await p.goto(APP, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'API');
await p.fill('input[type=email]', `api${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1800);

/* 2. voz pelo Worker */
await p.locator('.topbar button:has-text("Legenda")').first().click({ force: true });
await p.waitForSelector('.tr-painel');
await p.fill('.tr-textarea', 'Esta narração veio da API no Cloudflare Worker.');
await p.locator('.tr-voz button:has-text("Narrar no playhead")').click();
let clipe = null;
for (let i = 0; i < 40; i += 1) {
  await p.waitForTimeout(500);
  clipe = await p.evaluate(() => window.__vortexDoc().elements.find((e) => e.type === 'audio' && /Voz/.test(e.name)) ?? null);
  if (clipe) break;
}
ok('voz via Worker', clipe, clipe ? `${(clipe.duration / 1000).toFixed(1)}s` : 'não criou');
const usouWorker = pedidos.some((u) => u.startsWith(WORKER));
const usouNetlify = pedidos.some((u) => u.includes('/.netlify/'));
ok('chamadas foram para o Worker', usouWorker && usouNetlify === false, usouWorker ? `${pedidos.filter((u) => u.startsWith(WORKER)).length} chamadas` : 'nada');
await p.locator('.overlay .modal-head button').last().click({ force: true });
await p.waitForTimeout(300);

/* 3. chat: skills + roteiro pelo Worker */
await p.locator('.topbar button:has-text("IA")').first().click({ force: true });
await p.waitForSelector('.cc-texto');
await p.locator('.cc-btn-skill').click();
await p.waitForSelector('.sk-gaveta');
ok('gaveta de skills (30)', (await p.locator('.sk-item').count()) >= 28, `${await p.locator('.sk-item').count()} skills`);
await p.locator('.sk-item:has-text("Slides (Skywork)")').click();
await p.waitForTimeout(400);
await p.locator('.cc-btn-skill').click();
await p.locator('.sk-importar input').fill('https://findskill.ai/skills/design-media/corporate-trust-design/corporate-trust-design.zip');
await p.locator('.sk-importar button').click();
let importou = false;
for (let i = 0; i < 50; i += 1) {
  await p.waitForTimeout(500);
  const t = await p.locator('.toast').last().innerText().catch(() => '');
  if (/adicionada/i.test(t)) { importou = true; break; }
  if (/Não consegui/i.test(t)) break;
}
ok('importar skill pelo Worker', importou);
await p.locator('.sk-gaveta .sk-topo button').click();
await p.fill('.cc-texto', 'roteiro de 15 segundos sobre café especial');
await p.locator('.cc-botoes button:has-text("Roteiro")').click();
let txt = '';
for (let i = 0; i < 70; i += 1) {
  await p.waitForTimeout(1000);
  txt = await p.locator('.cc-msg.vortex .cc-balao:not(.cc-digitando)').last().innerText();
  if (txt.length > 150) break;
}
ok('roteiro pelo Worker', txt.length > 150, `${txt.length} caracteres`);
await p.locator('.overlay .modal-head button').last().click({ force: true });

/* 4. Pack do Editor (Drive pelo Worker) */
await p.locator('.topbar button:has-text("Conteúdo")').first().click({ force: true });
await p.waitForTimeout(600);
await p.locator('.tab:has-text("Pack do Editor")').click();
await p.waitForTimeout(600);
await p.fill('.pk-busca', 'flyers');
await p.waitForTimeout(300);
await p.locator('.pk-card').first().click();
let arqs = 0;
for (let i = 0; i < 40; i += 1) { await p.waitForTimeout(1000); arqs = await p.locator('.pk-arquivo').count(); if (arqs) break; }
ok('Drive pelo Worker (pasta do pack)', arqs > 0, `${arqs} arquivo(s)`);

console.log('\n=== API EXTERNA (Cloudflare Worker) ===');
for (const x of r) console.log(`${x.ok ? '✓' : '✗'} ${x.nome}${x.extra ? ' · ' + x.extra : ''}`);
console.log(`\n${r.filter((x) => x.ok).length}/${r.length} · erros JS: ${errs.length}`);
const netlify = pedidos.filter((u) => u.includes('/.netlify/'));
console.log('chamadas ao Worker:', pedidos.filter((u) => u.startsWith(WORKER)).length, '· fallback Netlify:', netlify.length);
await b.close();
