/** transcrição com mídia gerada pelo próprio editor (WAV do SFX/música) */
import { chromium } from 'playwright';
const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', e => console.log('ERRO:', e.message.slice(0, 140)));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]','LEG3');
await p.fill('input[type=email]',`l3${Date.now()}@v.dev`);
await p.fill('input[type=password]','vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1700);
// gera música no navegador (asset interno)
await p.locator('.sidebar .tab:has-text("Biblioteca")').first().click();
await p.locator('.cat-chips .chip:has-text("Música")').first().click();
await p.waitForTimeout(300);
await p.locator('.lib-card').first().click();
await p.waitForTimeout(4000);
await p.locator('.topbar button:has-text("Legenda")').first().click();
await p.waitForTimeout(900);
const opts = await p.locator('.tr-painel select option').allInnerTexts();
console.log('opções:', opts.join(' | '));
await p.locator('.tr-painel button:has-text("Transcrever")').click();
for (let i = 0; i < 120; i++) {
  await p.waitForTimeout(1000);
  const est = await p.locator('.tr-progresso span').innerText().catch(()=>'');
  if (i % 4 === 0) console.log(`[${i}s]`, est.slice(0,100));
  if (/Erro/.test(est)) break;
  if (await p.locator('.tr-frases li').count()) { console.log('FRASES:', (await p.locator('.tr-frases li').allInnerTexts()).join(' | ')); break; }
}
await b.close();
