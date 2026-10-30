import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 }, acceptDownloads: true });
if (process.env.TOK) await ctx.addInitScript((t) => localStorage.setItem('vortex.token.v1', t), process.env.TOK);
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(e.message.slice(0, 120)));
await p.goto('http://localhost:3001/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.locator('.topbar button', { hasText: /^Conteúdo$/ }).first().click();
await p.waitForTimeout(900);
await p.locator('.tab:has-text("Pack do Editor")').click();
await p.waitForTimeout(1500);

console.log('aba:', await p.locator('.overlay .lib-modo button.active').innerText());
const prontos = await p.locator('.pk-pronto').count();
const botoes = await p.locator('.pk-pronto button:has-text("timeline")').count();
console.log('packs prontos:', prontos, '| arquivos com + timeline:', botoes);
const nomes = await p.locator('.pk-pronto .pk-arquivo .pk-nome').allInnerTexts();
console.log('primeiros:', nomes.slice(0, 5).join(' | '));

// baixa o primeiro arquivo que caiba (PREVIEW de ~10MB)
const antes = await p.locator('.clip').count();
const alvo = p.locator('.pk-pronto', { hasText: 'Action Fx' }).locator('button:has-text("timeline")').first();
const nomeAlvo = (await p.locator('.pk-pronto', { hasText: 'Action Fx' }).locator('.pk-nome').first().innerText()).trim();
await alvo.click();
await p.waitForTimeout(25000);
console.log('toast:', (await p.locator('.toast').allInnerTexts()).slice(-2).join(' / ').replace(/\n/g, ' '));
await p.locator('.overlay .modal-head button').last().click();
await p.locator('.tab:has-text("Mídia")').first().click();
await p.waitForTimeout(600);
const midias = await p.locator('.media-item .media-name').allInnerTexts().catch(() => []);
console.log('alvo:', nomeAlvo, '| mídias no projeto:', midias.join(' | ') || '(nenhuma)');
console.log('clipes antes/depois:', antes, '→', await p.locator('.clip').count());
console.log('erros JS:', erros.length ? erros : 'nenhum');
await p.screenshot({ path: 'prova-drive.png' });
await b.close();
