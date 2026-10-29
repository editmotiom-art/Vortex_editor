/**
 * GRAVADOR DO VÍDEO DE DEMONSTRAÇÃO
 * ------------------------------------------------------------
 * Executa o roteiro (roteiro-demo.mjs) numa produção real, grava a tela
 * em vídeo e narra cada capítulo com a voz gerada.
 *
 *   node gravar-demo.mjs [base]     # padrão: produção na Netlify
 *
 * Saída: ../video/bruto.webm (tela) + ../video/narra/*.mp3
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { PASSOS } from './roteiro-demo.mjs';

const BASE = process.argv[2] ?? 'https://vortex-editor.netlify.app';
const RAIZ = path.resolve('../video');
const NARRA = path.join(RAIZ, 'narra');
const BRUTO = path.join(RAIZ, 'bruto');
fs.mkdirSync(NARRA, { recursive: true });
fs.mkdirSync(BRUTO, { recursive: true });

const MIDIA = '/home/user/vortex/.cache/midia-preview';
const log = (...a) => console.log(...a);

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-features=IsolateOrigins'],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  recordVideo: { dir: BRUTO, size: { width: 1440, height: 810 } },
  acceptDownloads: true,
});
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text().slice(0, 160)));

/* ---------------- utilidades ---------------- */
const pausa = (ms) => page.waitForTimeout(ms);
const mouse = (x, y) => page.mouse.move(x, y, { steps: 22 });

async function clicar(locator, ms = 700) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  await el.scrollIntoViewIfNeeded().catch(() => {});
  const caixa = await el.boundingBox().catch(() => null);
  if (caixa) {
    await mouse(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
    await pausa(160);
  }
  await el.click({ timeout: 3500 }).catch(async () => {
    await el.click({ force: true }).catch(() => {});
  });
  await pausa(ms);
}

/** espera o toast aparecer — cada leitura tem prazo curto (não trava o vídeo) */
async function esperarToast(re, limite = 14) {
  for (let i = 0; i < limite; i += 1) {
    const t = await page
      .locator('.toast')
      .last()
      .innerText({ timeout: 400 })
      .catch(() => '');
    if (t && re.test(t)) return t;
    await pausa(300);
  }
  return '';
}

/* ---------------- ações do roteiro ---------------- */
const acoes = {
  async landing() {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await pausa(700);
    await mouse(700, 400);
    await pausa(450);
    await mouse(1100, 640);
  },

  async rolarPlanos() {
    await page.evaluate(() => document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' }));
    await pausa(900);
    await page.evaluate(() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }));
    await pausa(1000);
    await mouse(720, 520);
    await pausa(600);
    await page.evaluate(() => document.getElementById('responsabilidade')?.scrollIntoView({ behavior: 'smooth' }));
    await pausa(1100);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await pausa(700);
  },

  async criarConta() {
    await clicar('.lp-nav-acoes button:has-text("Abrir editor")', 600);
    await page.fill('input[placeholder="Como quer ser chamado"]', 'Alice Oliveira');
    await pausa(300);
    await page.fill('input[type=email]', `alice.demo${Date.now()}@vortex.app`);
    await pausa(300);
    await page.fill('input[type=password]', '01082020');
    await pausa(400);
    await mouse(1133, 581);
    await pausa(300);
    await clicar('button:has-text("Criar conta e abrir o editor")', 2200);
    await pausa(1000);
  },

  async apresentarEditor() {
    const areas = [
      [300, 400],
      [700, 300],
      [700, 700],
      [1300, 400],
    ];
    for (const [x, y] of areas) {
      await mouse(x, y);
      await pausa(450);
    }
    await mouse(700, 300);
  },

  async template() {
    await clicar('.cat-chips .chip:has-text("Templates")', 500);
    await clicar('.lib-card:has-text("Título Pop")', 1400);
    await page.evaluate(() => useEditor?.getState?.().setPlayhead?.(700)).catch(() => {});
    await pausa(550);
  },

  async importarVideo() {
    const entrada = page.locator('.bandeja input[type=file]');
    if (!(await entrada.count())) await clicar('.bandeja-abrir', 400);
    await entrada.setInputFiles(`${MIDIA}/clipe.webm`);
    await pausa(800);
    await esperarToast(/na timeline|importado/, 20);
    await pausa(700);
    // segundo arquivo: música, para o mix do export
    await page.locator('.bandeja input[type=file]').setInputFiles(`${MIDIA}/musica.mp3`);
    await pausa(1000);
  },

  async baixaTudo() {
    await clicar('.topbar button:has-text("Baixa Tudo")', 800);
    await page.fill('.bt-input', 'https://www.youtube.com/watch?v=jNQXAC9IVRw');
    await pausa(500);
    await clicar('.baixa-tudo .chip:has-text("480p")', 300);
    await mouse(680, 300);
    await clicar('.baixa-tudo button:has-text("Baixar")', 800);
    const ok = await esperarToast(/baixado|timeline|Baixa Tudo/, 30);
    log('   baixa tudo:', ok || 'sem toast');
    await pausa(1500);
    if (await page.locator('.baixa-tudo').count()) await page.keyboard.press('Escape');
    await pausa(600);
  },

  async manipular() {
    await page.evaluate(() => {
      const st = window.__vortexStore;
      if (!st) return;
      const d = st.getState();
      const el = d.doc.elements.find((e) => e.type === 'text') ?? d.doc.elements[0];
      if (el) d.select([el.id]);
      d.setPlayhead(el ? el.start + 200 : 0);
    });
    await pausa(600);
    await clicar('[title^="Abrir"]', 300).catch(() => {});
    // seleciona o primeiro clipe de texto na timeline
    await clicar('.tl-clip, .clip', 500).catch(() => {});
    const alca = page.locator('.sel-handle').first();
    const caixa = await alca.boundingBox().catch(() => null);
    if (caixa) {
      const cx = caixa.x + caixa.width / 2;
      const cy = caixa.y + caixa.height / 2;
      await mouse(cx, cy);
      await page.mouse.down();
      for (let i = 1; i <= 12; i += 1) {
        await page.mouse.move(cx + i * 9, cy + i * 4);
        await pausa(45);
      }
      await page.mouse.up();
      await pausa(450);
    }
    // arrasta o elemento no palco
    await page.mouse.move(700, 330);
    await page.mouse.down();
    for (let i = 1; i <= 10; i += 1) {
      await page.mouse.move(700 - i * 8, 330 + i * 5);
      await pausa(45);
    }
    await page.mouse.up();
    await pausa(800);
  },

  async transicao() {
    await clicar('.bp-btn:has-text("Transição")', 600);
    await clicar('.bp-painel button:has-text("Fade")', 900);
    await esperarToast(/Fade/, 12);
    await pausa(800);
  },

  async cinema() {
    await clicar('.bp-btn:has-text("Cinema")', 600);
    await clicar('.bp-painel button:has-text("Teal")', 1100);
    await esperarToast(/Look/, 12);
    await pausa(550);
  },

  async camera() {
    await clicar('.bp-btn:has-text("Câmera")', 600);
    await clicar('.bp-painel button:has-text("Zoom in")', 900);
    await pausa(450);
    await clicar('.bp-painel button:has-text("Punch")', 900);
    await pausa(450);
  },

  async texto() {
    await clicar('.cat-chips .chip:has-text("Texto")', 400);
    await clicar('.lib-card:has-text("Título Pop")', 1200);
    await page.evaluate(() => useEditor.getState().setPlayhead(400));
    await pausa(550);
  },

  async sons() {
    await clicar('.cat-chips .chip:has-text("SFX")', 500);
    await clicar('.lib-card:has-text("Whoosh")', 1300);
    await clicar('.cat-chips .chip:has-text("Música")', 500);
    await clicar('.lib-card:has-text("Lo-Fi")', 1800);
    await esperarToast(/adicionado/, 15);
    await pausa(800);
  },

  async extrair() {
    await clicar('.topbar button:has-text("Extrair")', 900);
    await page.locator('.ex-input').first().fill('https://drive.google.com/drive/folders/1w0s5U8I8wO6bprAz7DxQTqKtILShSu-g').catch(() => {});
    await pausa(400);
    await clicar('.extrair button:has-text("Extrair")', 800);
    await page.waitForSelector('.ex-item', { timeout: 25000 }).catch(() => {});
    await pausa(1500);
    const itens = await page.locator('.ex-item').count();
    log('   itens do drive:', itens);
    // filtra imagens e manda as três primeiras para a timeline
    await clicar('.ex-resumo .chip:has-text("Imagens")', 600).catch(() => {});
    const caixas = page.locator('.ex-item input[type=checkbox]');
    for (let i = 0; i < Math.min(2, await caixas.count()); i += 1) await caixas.nth(i).check().catch(() => {});
    await pausa(400);
    await clicar('.extrair button:has-text("na timeline")', 1200).catch(() => {});
    const r = await esperarToast(/timeline|Mídia/, 40);
    log('   extrair:', r || 'sem toast');
    await pausa(700);
    if (await page.locator('.extrair').count()) await page.keyboard.press('Escape');
    await pausa(500);
  },

  async transcricao() {
    await clicar('.topbar button:has-text("Extrair")', 700);
    await clicar('.extrair .tab:has-text("Transcrição")', 700);
    await mouse(700, 420);
    await pausa(700);
    const aviso = await page.locator('.ex-bloco').first().innerText().catch(() => '');
    log('   transcrição disponível:', !/não tem reconhecimento/.test(aviso));
    await clicar('.extrair button:has-text("Transcrever")', 2500).catch(() => {});
    await page.keyboard.press('Escape');
    await pausa(600);
  },

  async play() {
    await page.evaluate(() => useEditor.getState().setPlayhead(0));
    await clicar('.transport button:nth-child(2)', 400);
    await pausa(1600);
    await clicar('.transport button:nth-child(2)', 600);
    await mouse(720, 300);
  },

  async exportVideo() {
    await clicar('.topbar button:has-text("Exportar")', 1000);
    await page.selectOption('.modal select >> nth=0', 'preview').catch(() => {});
    await pausa(400);
    await page.selectOption('.modal select >> nth=2', 'webm').catch(() => {});
    await pausa(300);
    await clicar('.modal button:has-text("Exportar vídeo")', 600);
    await page.waitForSelector('.exp-previa video', { timeout: 150000, state: 'attached' });
    await pausa(1000);
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 120000 }),
      clicar('.modal button:has-text("Baixar este arquivo")', 500),
    ]);
    fs.mkdirSync(path.join(RAIZ, 'exports'), { recursive: true });
    await dl.saveAs(path.join(RAIZ, 'exports', 'demo-video.webm'));
    log('   vídeo exportado:', fs.statSync(path.join(RAIZ, 'exports/demo-video.webm')).size, 'bytes');
    // toca a prévia do export
    await page.evaluate(async () => {
      const v = document.querySelector('.exp-previa video');
      if (v) {
        v.muted = false;
        await v.play().catch(() => {});
      }
    });
    await pausa(1400);
  },

  async exportImagem() {
    await clicar('.modal button:has-text("Frame PNG")', 600);
    await page.waitForSelector('.exp-previa img', { timeout: 90000, state: 'attached' });
    await pausa(550);
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      clicar('.modal button:has-text("Baixar este arquivo")', 400),
    ]);
    await dl.saveAs(path.join(RAIZ, 'exports', 'demo-frame.png'));
    log('   imagem exportada:', fs.statSync(path.join(RAIZ, 'exports/demo-frame.png')).size, 'bytes');
    await pausa(450);
  },

  async exportAudio() {
    await clicar('.modal button:has-text("Só áudio")', 600);
    await page.waitForSelector('.exp-previa audio', { timeout: 90000, state: 'attached' });
    await pausa(450);
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      clicar('.modal button:has-text("Baixar este arquivo")', 400),
    ]);
    await dl.saveAs(path.join(RAIZ, 'exports', 'demo-audio.wav'));
    log('   áudio exportado:', fs.statSync(path.join(RAIZ, 'exports/demo-audio.wav')).size, 'bytes');
    await page.evaluate(async () => {
      const a = document.querySelector('.exp-previa audio');
      if (a) await a.play().catch(() => {});
    });
    await pausa(1300);
    await page.keyboard.press('Escape');
    await pausa(500);
  },

  async celular() {
    // tela de celular em modo computador, num iframe não: abre outra página no mesmo contexto
    const cel = await ctx.newPage();
    await cel.setViewportSize({ width: 414, height: 860 });
    await cel.goto(BASE, { waitUntil: 'networkidle' });
    await cel.screenshot({ path: path.join(RAIZ, 'exports', 'celular-1.png') });
    await cel.evaluate(() => window.scrollTo({ top: 900, behavior: 'smooth' }));
    await cel.waitForTimeout(1400);
    await cel.screenshot({ path: path.join(RAIZ, 'exports', 'celular-2.png') });
    await cel.evaluate(() => window.scrollTo({ top: 2300, behavior: 'smooth' }));
    await cel.waitForTimeout(1400);
    await cel.screenshot({ path: path.join(RAIZ, 'exports', 'celular-3.png') });
    // no vídeo principal: mostra a landing em moldura estreita usando o zoom do sistema
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 430, height: 810 });
    await pausa(700);
    await page.evaluate(() => window.scrollTo({ top: 700, behavior: 'smooth' }));
    await pausa(800);
    await page.evaluate(() => window.scrollTo({ top: 2200, behavior: 'smooth' }));
    await pausa(900);
    await page.setViewportSize({ width: 1440, height: 810 });
    await pausa(800);
    await cel.close();
  },

};

/* --------- o admin tem ações próprias (login) --------- */
acoes.admin = async () => {
  await page.goto(`${BASE}/#admin`, { waitUntil: 'networkidle' });
  await pausa(800);
  const campos = page.locator('.admin input, input');
  const n = await campos.count();
  log('   campos no login do admin:', n);
  if (n >= 2) {
    await campos.nth(0).fill('aliceoliveirade22@gmail.com').catch(() => {});
    await pausa(300);
    await campos.nth(1).fill('01082020').catch(() => {});
    await pausa(300);
  }
  await clicar('button:has-text("Entrar")', 1800);
  await mouse(600, 300);
  const abas = ['Clientes', 'Planos e preços', 'Pagamento', 'Inteligência artificial', 'App e marca'];
  for (const aba of abas) {
    await clicar(`text=${aba}`, 900).catch(() => {});
  }
  await pausa(800);
};

acoes.fechamento = async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await pausa(1500);
  await mouse(720, 400);
  await pausa(700);
};

/* ---------------- execução ---------------- */
const video = page.video();
const marcas = [];
const t0 = Date.now();
log(`gravando ${BASE}`);

for (const passo of PASSOS) {
  const fn = acoes[passo.acao];
  if (!fn) {
    log('  (sem ação)', passo.acao);
    continue;
  }
  marcas.push({ id: passo.id, capitulo: passo.capitulo, inicio: Date.now() - t0, narra: passo.narra });
  log(`▶ ${passo.capitulo}`);
  try {
    await fn();
  } catch (e) {
    log(`   ! ${passo.capitulo}: ${e.message.slice(0, 160)}`);
  }
}
marcas.push({ id: 'fim', capitulo: 'fim', inicio: Date.now() - t0, narra: '' });

await page.waitForTimeout(800);
await ctx.close();
await browser.close();

const arquivo = await video.path();
fs.copyFileSync(arquivo, path.join(RAIZ, 'demo-bruto.webm'));
fs.writeFileSync(
  path.join(RAIZ, 'marcas.json'),
  JSON.stringify({ base: BASE, duracaoMs: Date.now() - t0, marcas, erros }, null, 2),
);
log('tela gravada:', path.join(RAIZ, 'demo-bruto.webm'));
log('marcas:', marcas.length, '| erros de JS:', erros.length);
if (erros.length) log(erros.slice(0, 6));
