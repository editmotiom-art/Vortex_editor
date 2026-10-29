import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(300);
await p.fill('input[placeholder="Como quer ser chamado"]', 'Insp');
await p.fill('input[type=email]', `i${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1200);
// abre cada painel e lista botões
for (const [nome, sel] of [['topbar', '.topbar'], ['barra-pro', '.barra-pro'], ['timeline', '.timeline-shell'], ['inspetor', '.inspector']]) {
  const botoes = await p.locator(`${sel} button`).allInnerTexts();
  console.log(nome, JSON.stringify(botoes.slice(0, 40)));
}
console.log('categorias:', JSON.stringify(await p.locator('.cat-chips .chip').allInnerTexts()));
await p.click('.barra-pro button:has-text("Cinema")'); await p.waitForTimeout(400);
console.log('cinema:', JSON.stringify(await p.locator('.bp-painel button').allInnerTexts()));
await p.click('.barra-pro button:has-text("Transição")'); await p.waitForTimeout(400);
console.log('transicao:', JSON.stringify(await p.locator('.bp-painel button').allInnerTexts()));
await b.close();
