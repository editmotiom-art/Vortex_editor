/** Prova de download real do Pack do Editor: imagem vira asset da biblioteca */
import { chromium } from 'playwright';
const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")'); await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'PACK');
await p.fill('input[type=email]', `pk${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")'); await p.waitForTimeout(1800);
await p.locator('.topbar button:has-text("Conteúdo")').first().click({ force: true }); await p.waitForTimeout(600);
await p.locator('.tab:has-text("Pack do Editor")').click(); await p.waitForTimeout(700);

/* pack de efeitos sonoros que tem imagem de mídia dentro */
await p.fill('.pk-busca', 'assault'); await p.waitForTimeout(400);
await p.locator('.pk-card').first().click();
let arqs = 0;
for (let i = 0; i < 45; i += 1) { await p.waitForTimeout(1000); arqs = await p.locator('.pk-arquivo').count(); if (arqs) break; }
console.log('pasta:', await p.locator('.pk-topo b').first().innerText(), '·', arqs, 'arquivo(s)');
const temBotaoBaixar = await p.locator('.pk-arquivo button').count();
const temLinkDrive = await p.locator('.pk-arquivo a').count();
console.log('botões ↓ (mídia):', temBotaoBaixar, '· links ↗ (instalação):', temLinkDrive);
await p.screenshot({ path: 'docs/prova/12-pack-arquivos.png' });

if (temBotaoBaixar) {
  const nome = await p.locator('.pk-arquivo:has(button) .pk-nome').first().innerText();
  console.log('baixando:', nome);
  await p.locator('.pk-arquivo:has(button) button').first().click();
  let msg = '';
  for (let i = 0; i < 90; i += 1) { await p.waitForTimeout(1000); msg = await p.locator('.toast').last().innerText().catch(() => ''); if (/na aba Mídia|Não consegui/.test(msg)) break; }
  console.log('resultado:', msg.replace(/\n/g, ' ').slice(0, 120));
  const assets = await p.evaluate(() => window.__vortexDoc().assets.map((a) => `${a.kind}:${a.name.slice(0, 40)}`));
  console.log('assets na biblioteca:', assets);
  console.log('cota mostrada:', await p.locator('.pk-cota').first().innerText());
  await p.screenshot({ path: 'docs/prova/13-pack-baixado.png' });
}
console.log('erros JS:', errs.length);
await b.close();
