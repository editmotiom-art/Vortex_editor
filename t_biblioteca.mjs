import { chromium } from 'playwright';
const URL = process.argv[2] ?? 'http://localhost:3001';
const b = await chromium.launch({ channel: 'chromium' });
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
const erros = [];
pg.on('pageerror', (e) => erros.push(String(e).slice(0, 120)));
// conta de teste: token via TOK=… node t_biblioteca.mjs
const TOK = process.env.TOK;
if (TOK) await pg.addInitScript((t) => localStorage.setItem('vortex.token.v1', t), TOK);
await pg.goto(URL, { waitUntil: 'domcontentloaded' });
await pg.waitForTimeout(3000);
// se caiu na página de vendas, abre o editor pelo caminho normal
if (await pg.locator('button:has-text("Criar conta e abrir o editor")').first().isVisible().catch(() => false)) {
  await pg.locator('button:has-text("Criar conta e abrir o editor")').first().click();
  await pg.waitForTimeout(1500);
  await pg.locator('input[autocomplete="username"]').first().fill(`bib${Date.now().toString().slice(-6)}@v.dev`).catch(() => {});
  await pg.locator('input[autocomplete="current-password"], input[type="password"]').first().fill('senha123').catch(() => {});
  await pg.locator('button[type="submit"], button:has-text("Criar")').last().click().catch(() => {});
  await pg.waitForTimeout(4000);
}
const fechar = pg.locator('.overlay .modal-head button').last();
if (await fechar.isVisible().catch(() => false)) await fechar.click();
await pg.locator('.tab:has-text("Biblioteca")').first().click();
await pg.waitForTimeout(1500);
const cards = await pg.locator('.bib-real-card').count();
const thumbs = await pg.locator('.bib-real-capa img').count();
console.log('cards na biblioteca:', cards, '| miniaturas:', thumbs);
console.log('aba ativa:', await pg.locator('.lib-modo button.active').innerText());
// 1) adiciona uma música
const musica = pg.locator('.bib-real-card', { hasText: 'Música' }).first();
const nome = (await musica.locator('.bib-real-nome').innerText()).trim();
await musica.locator('button:has-text("Mídia")').click();
await pg.waitForTimeout(6000);
const toast1 = await pg.locator('.toast').last().innerText().catch(() => 'sem toast');
console.log('1) música:', nome, '→', toast1.replace(/\n/g, ' '));
// 2) adiciona um fundo (imagem)
const fundo = pg.locator('.bib-real-card').filter({ has: pg.locator('.bib-real-sub', { hasText: 'Fundos' }) }).first();
const nomeF = (await fundo.locator('.bib-real-nome').innerText()).trim();
await fundo.locator('button:has-text("Mídia")').click();
await pg.waitForTimeout(6000);
console.log('2) fundo:', nomeF, '→', (await pg.locator('.toast').last().innerText().catch(() => 'sem toast')).replace(/\n/g, ' '));
// 3) confere que os dois entraram na aba Mídia
await pg.locator('.tab:has-text("Mídia")').click();
await pg.waitForTimeout(800);
const midias = await pg.locator('.media-item').count();
const nomes = await pg.locator('.media-item .media-name').allInnerTexts();
console.log('3) mídias no projeto:', midias, '→', nomes.join(' | ').slice(0, 120));
// 4) manda tudo para a timeline
await pg.locator('button:has-text("Tudo na timeline")').click();
await pg.waitForTimeout(1500);
console.log('4) clipes na timeline:', await pg.locator('.clip').count());
// 5) efeitos prontos continuam funcionando
await pg.locator('.tab:has-text("Biblioteca")').click();
await pg.locator('.lib-modo button:has-text("Efeitos")').click();
await pg.waitForTimeout(800);
console.log('5) efeitos/templates:', await pg.locator('.lib-card').count());
await pg.screenshot({ path: 'prova-biblioteca.png' });
console.log('erros JS:', erros.length ? erros : 'nenhum');
await b.close();
