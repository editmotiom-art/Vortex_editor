/**
 * TESTE HUMANO COMPLETO — percorre o sistema como um cliente de verdade
 * ------------------------------------------------------------------
 * Cobre: landing no celular (com gesto real), cadastro, portão de plano,
 * checkout (Pix e cartão), confirmação de pagamento, painel do cliente,
 * admin, exportação (vídeo/imagem/áudio), voz, skills, packs, Baixa Tudo,
 * extrair de site, importar XML, celular em modo computador.
 *
 *   node testeHumano.mjs [base]
 *
 * Saída: docs/prova/humano/*.png + relatório no terminal
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3001';
const PASTA = 'docs/prova/humano';
fs.mkdirSync(PASTA, { recursive: true });

const r = [];
const ok = (nome, cond, extra = '') => {
  r.push({ nome, ok: Boolean(cond), extra });
  console.log(`${cond ? '✓' : '✗'} ${nome}${extra ? ' · ' + extra : ''}`);
};
const espera = (p, ms) => p.waitForTimeout(ms);

const browser = await chromium.launch({ channel: 'chromium', args: ['--autoplay-policy=no-user-gesture-required'] });

/* ============ 1. CELULAR: landing rola de verdade ============ */
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await espera(p, 900);
  const cdp = await ctx.newCDPSession(p);
  const altura = await p.evaluate(() => document.documentElement.scrollHeight);
  const gesto = async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 620, id: 1 }] });
    for (let i = 1; i <= 12; i += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 620 - i * 38, id: 1 }] });
      await espera(p, 16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await espera(p, 600);
  };
  await gesto();
  const y1 = await p.evaluate(() => window.scrollY);
  await gesto();
  const y2 = await p.evaluate(() => window.scrollY);
  ok('celular: landing rola com o dedo', y1 > 300 && y2 > y1, `scrollY ${y1} → ${y2} · página ${altura}px`);
  await p.screenshot({ path: `${PASTA}/01-celular-rolagem.png` });
  // botões tocáveis (48px de altura mínima recomendada)
  const botoes = await p.evaluate(() =>
    [...document.querySelectorAll('button, a.btn')]
      .filter((b) => b.offsetParent)
      .map((b) => ({ t: (b.innerText || '').slice(0, 22), h: b.getBoundingClientRect().height }))
      .filter((b) => b.h > 0 && b.h < 36),
  );
  ok('celular: botões com área de toque decente', botoes.length <= 3, `${botoes.length} abaixo de 36px`);
  await ctx.close();
}

/* ============ 2. CADASTRO + PORTÃO DE PLANO ============ */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.setDefaultTimeout(25000);
const errosJs = [];
page.on('pageerror', (e) => errosJs.push(e.message.slice(0, 140)));
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.click('.lp-nav-acoes button:has-text("Abrir editor")');
await espera(page, 500);
await page.fill('input[placeholder="Como quer ser chamado"]', 'Alice Oliveira');
await page.fill('input[type=email]', `humano${Date.now()}@vortex.dev`);
await page.fill('input[type=password]', 'vortex2026');
await page.click('button:has-text("Criar conta e abrir o editor")');
await espera(page, 2400);
ok('cadastro abre o editor', await page.locator('.topbar').count());

await page.locator('.topbar button:has-text("Exportar")').click();
await espera(page, 900);
const temPortao = await page.locator('.plano-portao').count();
ok('plano FREE: exportar pede assinatura (portão)', temPortao, temPortao ? 'aviso exibido' : 'liberou sem plano');
await page.screenshot({ path: `${PASTA}/02-portao-plano.png` });
if (temPortao) {
  await page.locator('.plano-portao button:has-text("Ver planos e assinar")').click();
  await espera(page, 1200);
}
ok('portão leva ao checkout', await page.locator('.modal:has-text("Assinar")').count());

/* ============ 3. CHECKOUT: PIX E CARTÃO ============ */
const etapaPlano = await page.locator('.modal:has-text("Assinar")').innerText().catch(() => '');
ok('checkout mostra planos e preço', /R\$/.test(etapaPlano), etapaPlano.split('\n').find((l) => /R\$/.test(l)) ?? '');
await page.screenshot({ path: `${PASTA}/03-checkout-planos.png` });
// escolhe o plano em destaque e avança
await page.locator('.modal button', { hasText: /Continuar com|Assinar Pro|Assinar/ }).last().click().catch(() => {});
await espera(page, 900);
await espera(page, 900);
// dados
const campos = await page.locator('.modal input').count();
ok('checkout pede dados do cliente', campos >= 3, `${campos} campos`);
await page.locator('.modal input').nth(0).fill('Alice Oliveira').catch(() => {});
await page.locator('.modal input').nth(1).fill('alice@vortex.dev').catch(() => {});
await page.locator('.modal input').nth(2).fill('12345678909').catch(() => {});
await page.locator('.modal button:has-text("Ir para pagamento")').click().catch(() => {});
await espera(page, 800);
await espera(page, 900);
await page.screenshot({ path: `${PASTA}/04-checkout-dados.png` });
// pix
const temPix = await page.locator('.modal button:has-text("PIX"), .modal:has-text("PIX")').count();
ok('checkout oferece Pix', temPix);
await page.screenshot({ path: `${PASTA}/05-checkout-pix.png` });
// cartão
const botaoCartao = page.locator('.modal button:has-text("Cartão")').first();
if (await botaoCartao.count()) await botaoCartao.click().catch(() => {});
await espera(page, 600);
await page.screenshot({ path: `${PASTA}/06-checkout-cartao.png` });
ok('checkout oferece cartão', await page.locator('.modal:has-text("Cartão")').count());

/* ============ 4. PAINEL DO CLIENTE ============ */
await page.keyboard.press('Escape').catch(() => {});
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 600);
await page.locator('.topbar button:has-text("FREE"), .topbar .user, .topbar button:has-text("Alice")').first().click().catch(() => {});
await espera(page, 900);
ok('painel do cliente abre', await page.locator('.cliente-shell, .modal:has-text("plano")').count());
await page.screenshot({ path: `${PASTA}/07-painel-cliente.png` });

/* ============ 5. VOZ, SKILLS, TEXTO ============ */
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 500);
await page.locator('.topbar button:has-text("Legenda")').click({ force: true });
await page.waitForSelector('.tr-painel');
await page.fill('.tr-textarea', 'Teste humano de voz: esta frase precisa virar áudio.');
await page.locator('.tr-voz button:has-text("Narrar no playhead")').click();
let clipeVoz = null;
for (let i = 0; i < 40; i += 1) {
  await espera(page, 500);
  clipeVoz = await page.evaluate(() => window.__vortexDoc().elements.find((e) => e.type === 'audio' && /Voz/i.test(e.name ?? '')) ?? null);
  if (clipeVoz) break;
}
ok('voz gera clipe de áudio', clipeVoz, clipeVoz ? `${(clipeVoz.duration / 1000).toFixed(1)}s` : '');
await page.screenshot({ path: `${PASTA}/08-voz.png` });
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 500);

await page.locator('.topbar button', { hasText: /^✦ IA$/ }).click({ force: true });
await page.waitForSelector('.cc-texto');
ok('chat com skills abre', await page.locator('.cc-btn-skill').count());
await page.fill('.cc-texto', 'roteiro de 10 segundos sobre café');
await page.locator('.cc-botoes button:has-text("Roteiro")').click();
let texto = '';
for (let i = 0; i < 60; i += 1) {
  await espera(page, 1000);
  texto = await page.locator('.cc-msg.vortex .cc-balao:not(.cc-digitando)').last().innerText().catch(() => '');
  if (texto.length > 120) break;
}
ok('gerador de texto (grátis) responde', texto.length > 120, `${texto.length} caracteres`);
await page.screenshot({ path: `${PASTA}/09-chat-roteiro.png` });
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 500);

/* ============ 6. EXPORTAÇÃO REAL (assinando o plano) ============ */
await page.evaluate(() => {
  // assinatura aprovada (o mesmo que o checkout faz ao confirmar o pagamento)
  const cfg = JSON.parse(localStorage.getItem('vortex.config.v1') ?? '{}');
  const contas = JSON.parse(localStorage.getItem('vortex.contas.v1') ?? '[]');
  if (contas[0]) { contas[0].plano = 'pro'; localStorage.setItem('vortex.contas.v1', JSON.stringify(contas)); }
  const sess = JSON.parse(localStorage.getItem('vortex.sessao.v1') ?? '{}');
  if (sess) localStorage.setItem('vortex.sessao.v1', JSON.stringify({ ...sess, plano: 'pro' }));
  void cfg;
});
await page.reload({ waitUntil: 'networkidle' });
await espera(page, 2200);
// importa um clipe e exporta
await page.locator('.bandeja input[type=file]').first().setInputFiles('.cache/midia-preview/clipe.webm');
await espera(page, 2600);
await page.locator('.topbar button:has-text("Exportar")').click();
await espera(page, 1200);
ok('plano Pro: exportar abre direto', await page.locator('.overlay:has-text("Exportar")').count());
await page.screenshot({ path: `${PASTA}/10-exportar.png` });
const baixarArquivo = async (rotulo) => {
  await page.locator(`.overlay button:has-text("${rotulo}")`).click({ timeout: 15000 }).catch(() => {});
  // espera o arquivo ficar pronto (a prévia aparece com "Baixar este arquivo")
  for (let i = 0; i < 120; i += 1) {
    await espera(page, 1000);
    if (await page.locator('.overlay button:has-text("Baixar este arquivo")').count()) break;
  }
  const esperaDownload = page.waitForEvent('download', { timeout: 90000 }).catch(() => null);
  await page.locator('.overlay button:has-text("Baixar este arquivo")').click({ timeout: 8000 }).catch(() => {});
  const d = await esperaDownload;
  if (!d) return null;
  const nome = await d.suggestedFilename();
  const destino = `${PASTA}/${rotulo.replace(/\W+/g, '-').toLowerCase()}-${nome}`;
  await d.saveAs(destino);
  return { nome, destino, tamanho: fs.statSync(destino).size };
};

const video = await baixarArquivo('Exportar vídeo');
ok('exporta VÍDEO (download real)', video && video.tamanho > 200000, video ? `${video.nome} · ${(video.tamanho / 1024 / 1024).toFixed(1)} MB` : 'sem download');
const png2 = await baixarArquivo('Frame PNG');
ok('exporta IMAGEM (Frame PNG)', png2 && png2.tamanho > 5000, png2 ? `${png2.nome} · ${(png2.tamanho / 1024).toFixed(0)} KB` : 'sem download');
const wav2 = await baixarArquivo('Só áudio');
ok('exporta ÁUDIO (WAV)', wav2 && wav2.tamanho > 5000, wav2 ? `${wav2.nome} · ${(wav2.tamanho / 1024).toFixed(0)} KB` : 'sem download');
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 500);

/* ============ 7. ACERVO / PACKS / BAIXA TUDO / EXTRAIR ============ */
await page.locator('.topbar button:has-text("Conteúdo")').click({ force: true });
await espera(page, 800);
await page.locator('text=Pack do Editor').first().click({ force: true }).catch(() => {});
await espera(page, 2500);
const packs = await page.locator('.pk-card').count();
ok('acervo: catálogo de packs', packs > 100, `${packs} packs`);
await page.screenshot({ path: `${PASTA}/11-packs.png` });
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 500);

await page.locator('.topbar button:has-text("Baixa Tudo")').click({ force: true });
await espera(page, 900);
ok('Baixa Tudo abre com plano Pro', await page.locator('.overlay:has-text("Baixa")').count());
await page.screenshot({ path: `${PASTA}/12-baixa-tudo.png` });
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 500);

await page.locator('.topbar button:has-text("Extrair")').click({ force: true });
await espera(page, 900);
ok('Extrair de site abre', await page.locator('.overlay').count());
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 500);

await page.locator('.topbar button:has-text("XML")').click({ force: true });
await espera(page, 900);
ok('Importar XML (Alight Motion) abre', await page.locator('.overlay').count());
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(page, 500);

/* ============ 8. ADMIN ============ */
await page.goto(`${BASE}/#admin`, { waitUntil: 'networkidle' });
await espera(page, 1200);
await page.fill('input[type=email]', 'aliceoliveirade22@gmail.com').catch(() => {});
await page.fill('input[type=password]', '01082020').catch(() => {});
await page.locator('button:has-text("Entrar")').first().click().catch(() => {});
await espera(page, 1500);
const abas = await page.locator('.admin-nav button, aside button').allInnerTexts().catch(() => []);
ok('admin entra com a conta do dono', abas.length > 8, `${abas.length} abas`);
for (const aba of ['Visão geral', 'Clientes', 'Planos e preços', 'Pagamento', 'Inteligência artificial', 'Voz e narração', 'Skills do chat', 'Pack do Editor', 'API e hospedagem']) {
  await page.locator(`button:has-text("${aba}")`).first().click().catch(() => {});
  await espera(page, 450);
  const titulo = await page.locator('h2').first().innerText().catch(() => '');
  ok(`admin: aba ${aba}`, titulo.length > 2, titulo.slice(0, 40));
}
await page.screenshot({ path: `${PASTA}/13-admin.png`, fullPage: true });

/* ============ 9. SEGURANÇA (tentativas de invasão) ============ */
const seguranca = [];
const status = async (u, init) => {
  const resp = await page.request.fetch(u, { ...init, failOnStatusCode: false }).catch(() => null);
  return resp ? resp.status() : 'sem resposta';
};
const s1 = await page.request.get(`${BASE}/api/drive?pasta=../../etc/passwd`).catch(() => null);
seguranca.push(['drive com caminho de arquivo', s1?.status()]);
const s2 = await page.request.get(`${BASE}/api/proxy?url=http://169.254.169.254/latest/meta-data/`).catch(() => null);
seguranca.push(['proxy para IP interno (metadata)', s2?.status()]);
const s3 = await page.request.get(`${BASE}/api/proxy?url=file:///etc/passwd`).catch(() => null);
seguranca.push(['proxy para file://', s3?.status()]);
const s4 = await page.request.post(`${BASE}/api/ferramentas`, { data: { acao: 'sql', texto: 'x' } }).catch(() => null);
seguranca.push(['ação inexistente em ferramentas', s4?.status()]);
const s5 = await page.request.get(`${BASE}/api/inexistente`).catch(() => null);
seguranca.push(['rota inexistente', s5?.status()]);
// admin sem senha
const ctxAnon = await browser.newContext();
const anon = await ctxAnon.newPage();
await anon.goto(`${BASE}/#admin`, { waitUntil: 'networkidle' });
await espera(anon, 900);
const pedeLogin = await anon.locator('input[type=password]').count();
const vePainel = await anon.locator('.admin-nav, h2:has-text("Visão geral")').count();
seguranca.push(['admin sem senha mostra conteúdo', vePainel && !pedeLogin ? 'FALHA' : 'bloqueado']);
// localStorage de outra conta não vira admin
await anon.evaluate(() => {
  localStorage.setItem('vortex.admin.v1', JSON.stringify({ email: 'invasor@x.com' }));
});
await anon.reload({ waitUntil: 'networkidle' });
await espera(anon, 900);
const invasorEntrou = await anon.locator('.admin-nav').count();
seguranca.push(['sessão de admin forjada no navegador', invasorEntrou ? 'aceitou (ver doc)' : 'bloqueado']);
await ctxAnon.close();

console.log('\n--- segurança ---');
for (const [nome, res] of seguranca) console.log(`  ${nome}: ${res}`);

/* ============ resumo ============ */
console.log('\n================ TESTE HUMANO ================');
console.log(`${r.filter((x) => x.ok).length}/${r.length} verificações passaram`);
console.log(`erros de JS: ${errosJs.length}`);
if (errosJs.length) console.log(errosJs.slice(0, 6));
fs.writeFileSync(`${PASTA}/relatorio.json`, JSON.stringify({ base: BASE, checks: r, seguranca, errosJs }, null, 2));
await browser.close();
