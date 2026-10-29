/**
 * TESTE das funções novas: chat com skills, imagem gratuita, transcrição,
 * pagamento bloqueado e vídeo na landing.
 *   node testarNovidades.mjs http://127.0.0.1:8888
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 150)));
p.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 150)));
const r = [];

/** fecha qualquer modal aberto (o ✕ ou o clique no fundo) */
const fechar = async () => {
  for (let i = 0; i < 4; i += 1) {
    if (!(await p.locator('.overlay').count())) break;
    await p.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(350);
    if (await p.locator('.overlay').count()) {
      await p.evaluate(() => document.querySelector('.overlay')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      await p.waitForTimeout(300);
    }
  }
};

/* ---------- 1. landing com vídeo ---------- */
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const temVideo = await p.locator('.lp-player video').count();
const prontoVideo = async () => {
  const vids = p.locator('.lp-player video');
  const n = await vids.count();
  let ok = 0;
  for (let i = 0; i < n; i += 1) {
    await vids.nth(i).evaluate((v) => v.load()).catch(() => {});
    const info = await vids.nth(i).evaluate(async (v) => {
      for (let t = 0; t < 40 && !(v.duration > 60); t += 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
      return {
        src: v.currentSrc || v.src || v.querySelector('source')?.getAttribute('src') || '',
        dur: v.duration,
        rs: v.readyState,
        w: v.videoWidth,
      };
    });
    if (info.dur > 60 && info.w > 0) ok += 1;
    r.push({ nome: `vídeo #${i + 1}`, ok: info.dur > 60, extra: `${Math.round(info.dur)}s ${info.w}px` });
  }
  return { n, ok };
};
const vinfo = await prontoVideo();
r.push({ nome: 'landing: player de vídeo', ok: temVideo >= 2 && vinfo.ok >= 2, extra: `${vinfo.ok}/${vinfo.n} prontos` });

/* ---------- 2. entrar no editor ---------- */
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(500);
await p.fill('input[placeholder="Como quer ser chamado"]', 'TESTE NOVIDADES');
await p.fill('input[type=email]', `tn${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1800);
r.push({ nome: 'editor abriu', ok: (await p.locator('.topbar').count()) > 0 });

/* ---------- 3. chat com skills ---------- */
await p.click('.topbar button:has-text("IA")');
await p.waitForTimeout(800);
const skills = await p.locator('.cc-skill').count();
r.push({ nome: 'chat: seletor de skills', ok: skills >= 10, extra: `${skills} skills` });
const motor = await p.locator('.cc-motor').innerText().catch(() => '');
r.push({ nome: 'chat: mostra o motor', ok: /gratuito|painel/i.test(motor), extra: motor });

// escolhe uma skill, escreve o pedido e gera de verdade
await p.locator('.cc-skill').nth(1).click();
await p.waitForTimeout(300);
await p.waitForSelector('.cc-texto', { timeout: 15000 });
await p.fill('.cc-texto', 'frasco de perfume âmbar sobre pedra clara');
await p.click('.cc-botoes button:has-text("Criar imagem")');
let imagemOk = false;
for (let i = 0; i < 75; i += 1) {
  await p.waitForTimeout(1000);
  if ((await p.locator('.cc-img').count()) > 0) {
    imagemOk = true;
    break;
  }
  const erro = await p.locator('.cc-msg.erro').count();
  if (erro) break;
}
const infoImg = imagemOk
  ? await p.locator('.cc-img').first().evaluate((el) => ({
      w: el.naturalWidth,
      h: el.naturalHeight,
      src: el.getAttribute('src')?.slice(0, 22),
    }))
  : null;
r.push({
  nome: 'chat: gerou imagem (motor gratuito)',
  ok: imagemOk && infoImg?.w > 200,
  extra: infoImg ? `${infoImg.w}×${infoImg.h} ${infoImg.src}` : 'sem imagem',
});

if (imagemOk) {
  await p.click('.cc-img-acoes button:has-text("Usar na timeline")');
  await p.waitForTimeout(1200);
  const d = await p.evaluate(() => window.__vortexDoc());
  r.push({
    nome: 'chat: imagem vai para a timeline',
    ok: d.elements.some((e) => e.type === 'image'),
    extra: `${d.elements.length} elementos`,
  });
} else {
  r.push({ nome: 'chat: imagem vai para a timeline', ok: false, extra: 'pulado' });
}

/* ---------- 4. roteiro de vídeo pela skill ---------- */
const aindaAberto = await p.locator('.chat-criacao').count();
if (!aindaAberto) {
  await fechar();
  await p.click('.topbar button:has-text("IA")');
  await p.waitForTimeout(900);
}
await p.waitForSelector('.cc-texto', { timeout: 15000 });
await p.fill('.cc-texto', 'vídeo de 15s sobre edição no celular');
await p.click('.cc-botoes button:has-text("Roteiro")');
await p.waitForTimeout(700);
const msgRoteiro = await p.locator('.cc-msg.vortex').last().innerText().catch(() => '');
r.push({ nome: 'chat: roteiro por skill', ok: /CENA 1/.test(msgRoteiro) && /CENA 3/.test(msgRoteiro) });
await fechar();

/* ---------- 5. transcrição (Whisper no navegador) com áudio real ---------- */
await ctx.grantPermissions([]);
await p.click('.topbar button:has-text("Legenda")');
await p.waitForTimeout(800);
r.push({ nome: 'painel de transcrição abre', ok: (await p.locator('.tr-painel').count()) > 0 });
const inputArquivo = p.locator('.tr-painel input[type=file]');
const { readFileSync } = await import('node:fs');
await inputArquivo.setInputFiles({
  name: 'fala.mp3',
  mimeType: 'audio/mpeg',
  buffer: readFileSync('/home/user/video/narra2/n01.mp3'),
});
await p.waitForTimeout(1200);
await p.click('.tr-painel button:has-text("Transcrever")');
let transcrito = false;
for (let i = 0; i < 150; i += 1) {
  await p.waitForTimeout(1000);
  if ((await p.locator('.tr-frases li').count()) > 0) {
    transcrito = true;
    break;
  }
  const fase = await p.locator('.tr-progresso span').innerText().catch(() => '');
  if (/Erro/.test(fase)) {
    r.push({ nome: 'transcrição: detalhe do erro', ok: false, extra: fase.slice(0, 90) });
    break;
  }
}
r.push({ nome: 'transcrição: frases geradas', ok: transcrito, extra: `${await p.locator('.tr-frases li').count()} frases` });
if (transcrito) {
  const antes = await p.evaluate(() => window.__vortexDoc().elements.length);
  await p.click('.tr-acoes button:has-text("Adicionar como legenda")');
  await p.waitForTimeout(1200);
  const depois = await p.evaluate(() => window.__vortexDoc());
  r.push({
    nome: 'transcrição: legenda na timeline',
    ok: depois.elements.length > antes,
    extra: `${antes}→${depois.elements.length} elementos`,
  });
}
await fechar();

/* ---------- 6. pagamento NÃO libera sem confirmação ---------- */
await fechar();
await p.evaluate(() => window.__vortexStore && localStorage.setItem('vortex.planoEscolhido', 'pro'));
await p.evaluate(() => {
  const w = window;
  const st = w.__vortexUI?.getState?.();
  if (st?.openModal) st.openModal('checkout');
});
await p.waitForTimeout(800);
let abriuCheckout = (await p.locator('.modal').count()) > 0;
if (!abriuCheckout) {
  // abre pelo painel do cliente → aba Plano → Assinar
  await p.locator('.topbar button:has-text("Conta"), .user-chip, .perfil').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(700);
  await p.locator('.modal >> text=Assinar').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(700);
  abriuCheckout = (await p.locator('.modal').count()) > 0;
}

if (abriuCheckout) {
  // passo 1 → dados
  await p.locator('.modal button:has-text("Continuar com")').first().click({ force: true });
  await p.waitForTimeout(700);
  // passo 2 → preenche nome/e-mail
  const camposPag = p.locator('.modal input');
  await camposPag.nth(0).fill('Cliente Teste');
  await camposPag.nth(1).fill('cliente@teste.dev');
  if ((await camposPag.count()) > 2) await camposPag.nth(2).fill('12345678900');
  await p.locator('.modal button:has-text("Ir para pagamento")').click({ force: true });
  await p.waitForTimeout(800);
  // passo 3 → pagamento: escolhe Pix e finaliza de verdade
  const pixBtn = p.locator('.modal button:has-text("PIX")').first();
  if (await pixBtn.count()) await pixBtn.click({ force: true });
  await p.waitForTimeout(400);
  const pagar = p.locator('.modal button:has-text("Pagar")').last();
  if (await pagar.count()) await pagar.click({ force: true });
  await p.waitForTimeout(3000);
}
const selo = await p.locator('.pg-selo').count();
const qr = await p.locator('.qr-pix').count();
const cobranca = await p.evaluate(() => JSON.parse(localStorage.getItem('vortex.pagamentos.v1') ?? '[]'));
const sessao = await p.evaluate(() => JSON.parse(localStorage.getItem('vortex.sessao.v1') ?? '{}'));
r.push({ nome: 'pagamento: cobrança criada', ok: cobranca.length > 0, extra: `${cobranca.length} registro(s)` });
r.push({
  nome: 'pagamento: tela de aguardando confirmação',
  ok: selo > 0,
  extra: selo > 0 ? 'selo presente' : 'não apareceu',
});
r.push({
  nome: 'pagamento: plano NÃO liberado sem confirmação',
  ok: (sessao.plano ?? 'free') === 'free' && cobranca.every((c) => c.status !== 'pago'),
  extra: `plano=${sessao.plano ?? 'free'} · status=${cobranca.map((c) => c.status).join(',') || '-'}`,
});
r.push({ nome: 'pagamento: QR do Pix desenhado', ok: qr > 0, extra: qr ? 'svg gerado' : 'sem chave Pix configurada' });

/* ---------- 7. admin: blocos novos ---------- */
await fechar();
await p.goto(`${BASE}/#admin`, { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
const camposAdmin = p.locator('input');
await camposAdmin.nth(0).fill('aliceoliveirade22@gmail.com');
await camposAdmin.nth(1).fill('01082020');
await p.click('button:has-text("Entrar")');
await p.waitForTimeout(1400);
await p.locator('text=Inteligência artificial').first().click();
await p.waitForTimeout(900);
const textoIA = await p.locator('main').innerText();
r.push({ nome: 'admin: motor gratuito configurável', ok: /Motor gratuito/i.test(textoIA) && /Pollinations/i.test(textoIA) });
r.push({ nome: 'admin: API própria compatível', ok: /compatível com OpenAI/i.test(textoIA) && /Endereço base/i.test(textoIA) });
await p.click('text=Pagamento');
await p.waitForTimeout(800);
const textoPg = await p.locator('main').innerText();
r.push({ nome: 'admin: chave Pix + cobranças', ok: /Chave PIX/i.test(textoPg) && /Cobranças/i.test(textoPg) });

/* ---------- relatório ---------- */
console.log('\n=== RELATÓRIO ===');
for (const x of r) console.log(`${x.ok ? '✓' : '✗'} ${x.nome}${x.extra ? ' · ' + x.extra : ''}`);
const falhas = r.filter((x) => !x.ok).length;
console.log(`\n${r.length - falhas}/${r.length} passaram · ${errs.length} erro(s) de JS`);
if (errs.length) console.log([...new Set(errs)].slice(0, 8).join('\n'));
await b.close();
process.exit(falhas ? 1 : 0);
