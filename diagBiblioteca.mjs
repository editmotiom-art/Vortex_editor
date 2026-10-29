/** varre TODOS os cards da biblioteca e diz quais NÃO aplicam nada */
import { chromium } from 'playwright';
const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', (e) => console.log('ERRO JS:', e.message.slice(0, 130)));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'BIB');
await p.fill('input[type=email]', `b${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1500);

const hash = () => p.evaluate(() => {
  const d = window.__vortexDoc();
  return JSON.stringify({ n: d.elements.length, e: d.elements.map(x => [x.type, x.start, x.duration, x.effects.map(f=>f.type).join('+'), x.blend, x.text, x.shape, x.opacity].join('~')) }) + '|assets:' + document.querySelectorAll('.media-item, .mi').length;
});

await p.locator('.sidebar .tab:has-text("Biblioteca")').first().click().catch(()=>{});
const cats = await p.locator('.cat-chips .chip').allInnerTexts();
const ruins = [];
let total = 0;
for (const cat of cats.filter(c => c !== 'Tudo')) {
  await p.locator(`.cat-chips .chip:has-text("${cat}")`).first().click();
  await p.waitForTimeout(250);
  const n = await p.locator('.lib-card').count();
  for (let i = 0; i < n; i++) {
    const card = p.locator('.lib-card').nth(i);
    const nome = (await card.innerText().catch(()=>'?')).split('\n').filter(t=>t && t!=='GRÁTIS' && t!=='PACK')[0] ?? '?';
    const antes = await hash();
    await card.click({ force: true }).catch(()=>{});
    await p.waitForTimeout(450);
    const depois = await hash();
    total++;
    if (antes === depois) ruins.push(`${cat} › ${nome}`);
  }
  console.log(`${cat}: ${n} cards`);
}
console.log(`\n${total - ruins.length}/${total} cards aplicaram algo`);
if (ruins.length) console.log('NÃO aplicaram:\n' + ruins.join('\n'));
await b.close();
