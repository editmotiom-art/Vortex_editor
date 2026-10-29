/**
 * GRAVADOR (versão enxuta)
 * ------------------------------------------------------------
 * Roda o roteiro numa instância real do sistema, grava a tela e salva
 * as marcas de tempo para sincronizar a narração.
 *
 *   node gravar2.mjs [base]
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { PASSOS } from './roteiro-demo.mjs';

const BASE = process.argv[2] ?? 'https://vortex-editor.netlify.app';
const RAIZ = path.resolve('../video');
const BRUTO = path.join(RAIZ, 'bruto2');
const MIDIA = '/home/user/vortex/.cache/midia-preview';
fs.mkdirSync(BRUTO, { recursive: true });
fs.mkdirSync(path.join(RAIZ, 'exports'), { recursive: true });

const log = (...a) => console.log(...a);
const inicioGravacao = Date.now();

const browser = await chromium.launch({
  args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  recordVideo: { dir: BRUTO, size: { width: 1440, height: 810 } },
  acceptDownloads: true,
});
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message.slice(0, 120)));

const pausa = (ms) => page.waitForTimeout(ms);
const mouse = (x, y, passos = 18) => page.mouse.move(x, y, { steps: passos });

async function clicar(sel, ms = 450) {
  const el = page.locator(sel).first();
  const caixa = await el.boundingBox({ timeout: 2500 }).catch(() => null);
  if (caixa) {
    await mouse(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2, 14);
    await pausa(140);
  }
  await el.click({ timeout: 3500 }).catch(async () => void (await el.click({ force: true, timeout: 2000 }).catch(() => {})));
  await pausa(ms);
}

/** fecha qualquer modal/gaveta aberta — evita que um overlay bloqueie o próximo passo */
async function limparModais() {
  for (let i = 0; i < 3; i += 1) {
    const abertos = await page.locator('.overlay').count();
    if (!abertos) break;
    await page.keyboard.press('Escape').catch(() => {});
    await pausa(250);
    const fechar = page.locator('.modal .btn.ghost.icon').last();
    if (await fechar.count()) await fechar.click({ force: true, timeout: 1500 }).catch(() => {});
    await pausa(250);
  }
  const gaveta = page.locator('.sidebar.mobile-open, .inspector.mobile-open');
  if (await gaveta.count()) await page.keyboard.press('Escape').catch(() => {});
  await pausa(150);
}

async function toast(re, tentativas = 14) {
  for (let i = 0; i < tentativas; i += 1) {
    const t = await page.locator('.toast').last().innerText({ timeout: 300 }).catch(() => '');
    if (t && re.test(t)) return t;
    await pausa(280);
  }
  return '';
}

const acoes = {
  async landing() {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await pausa(900);
    await mouse(760, 430);
    await pausa(700);
    await mouse(1180, 620);
    await pausa(700);
  },

  async rolarPlanos() {
    await page.evaluate(() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await pausa(1800);
    await mouse(700, 420);
    await pausa(500);
    await page.evaluate(() => document.getElementById('responsabilidade')?.scrollIntoView({ behavior: 'smooth' }));
    await pausa(1800);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await pausa(900);
  },

  async criarConta() {
    await clicar('.lp-nav-acoes button:has-text("Abrir editor")', 500);
    await page.fill('input[placeholder="Como quer ser chamado"]', 'Alice Oliveira');
    await pausa(250);
    await page.fill('input[type=email]', `alice.demo${Date.now()}@vortex.app`);
    await pausa(250);
    await page.fill('input[type=password]', '01082020');
    await pausa(350);
    await clicar('button:has-text("Criar conta e abrir o editor")', 1600);
  },

  async template() {
    await clicar('.cat-chips .chip:has-text("Templates")', 350);
    await mouse(120, 300);
    await clicar('.lib-card:has-text("Título Pop")', 1100);
    await page.evaluate(() => window.__vortexStore?.getState?.().setPlayhead(700));
    await pausa(700);
    await mouse(700, 300);
  },

  async importarVideo() {
    await page.evaluate(() => window.__vortexStore?.getState?.().setPlayhead(0));
    const entrada = page.locator('.bandeja input[type=file]');
    if (!(await entrada.count())) await clicar('.bandeja-abrir', 350);
    await entrada.setInputFiles(`${MIDIA}/clipe.webm`);
    await pausa(1700);
    await page.locator('.bandeja input[type=file]').setInputFiles(`${MIDIA}/musica.mp3`);
    await pausa(1500);
  },

  async baixaTudo() {
    await clicar('.topbar button:has-text("Baixa Tudo")', 600);
    await page.locator('.bt-input').fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
    await pausa(400);
    await clicar('.baixa-tudo .chip:has-text("480p")', 250);
    await clicar('.baixa-tudo button:has-text("Baixar")', 500);
    log('   baixa tudo:', (await toast(/baixado|timeline/, 30)) || 'sem toast');
    await pausa(900);
    if (await page.locator('.baixa-tudo').count()) await page.keyboard.press('Escape');
    await pausa(400);
  },

  async manipular() {
    await page.evaluate(() => {
      const st = window.__vortexStore;
      if (!st) return;
      const d = st.getState();
      const el = d.doc.elements.find((e) => e.type === 'text') ?? d.doc.elements[0];
      if (el) {
        d.select([el.id]);
        d.setPlayhead(el.start + 200);
      }
    });
    await pausa(700);
    const alca = page.locator('.sel-handle').first();
    const c = await alca.boundingBox({ timeout: 3000 }).catch(() => null);
    if (c) {
      const x = c.x + c.width / 2;
      const y = c.y + c.height / 2;
      await mouse(x, y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i += 1) {
        await page.mouse.move(x + i * 5, y + i * 3);
        await pausa(45);
      }
      await page.mouse.up();
      await pausa(600);
    }
    await mouse(700, 330);
    await page.mouse.down();
    for (let i = 1; i <= 6; i += 1) {
      await page.mouse.move(700 - i * 6, 330 + i * 3);
      await pausa(45);
    }
    await page.mouse.up();
    await pausa(500);
    /* volta o clipe para o centro (o vídeo continua visível no palco) */
    await page.evaluate(() => {
      const st = window.__vortexStore?.getState?.();
      if (!st) return;
      const el = st.doc.elements.find((e) => e.type === 'text');
      if (el) {
        st.updateTransform(el.id, 'x', { base: st.doc.settings.width / 2, keyframes: [] });
        st.updateTransform(el.id, 'y', { base: st.doc.settings.height * 0.42, keyframes: [] });
        st.updateTransform(el.id, 'scale', { base: 1, keyframes: [] });
        st.updateTransform(el.id, 'rotation', { base: 0, keyframes: [] });
      }
    });
    await pausa(600);
  },

  async efeitos() {
    await clicar('.bp-btn:has-text("Transição")', 450);
    await clicar('.bp-painel button:has-text("Fade")', 700);
    await toast(/Fade/, 8);
    await clicar('.bp-btn:has-text("Cinema")', 450);
    await clicar('.bp-painel button:has-text("Teal")', 900);
    await toast(/Look/, 8);
    await clicar('.bp-btn:has-text("Câmera")', 400);
    await clicar('.bp-painel button:has-text("Zoom in")', 700);
    await pausa(500);
  },

  async sons() {
    await clicar('.cat-chips .chip:has-text("SFX")', 400);
    await clicar('.lib-card:has-text("Whoosh")', 1000);
    await clicar('.cat-chips .chip:has-text("Música")', 400);
    await clicar('.lib-card:has-text("Lo-Fi")', 1400);
    await toast(/adicionado/, 10);
    await pausa(600);
  },

  async extrair() {
    await clicar('.topbar button:has-text("Extrair")', 700);
    await page.locator('.ex-input').first().fill('https://drive.google.com/drive/folders/1w0s5U8I8wO6bprAz7DxQTqKtILShSu-g').catch(() => {});
    await pausa(350);
    await clicar('.extrair button:has-text("Extrair")', 600);
    await page.waitForSelector('.ex-item', { timeout: 30000, state: 'attached' }).catch(() => {});
    await pausa(900);
    const n = await page.locator('.ex-item').count();
    log('   itens do drive:', n);
    if (n) {
      await mouse(700, 500);
      await pausa(400);
      const caixas = page.locator('.ex-item input[type=checkbox]');
      for (let i = 0; i < Math.min(3, await caixas.count()); i += 1) {
        await caixas.nth(i).check({ force: true }).catch(() => {});
        await pausa(120);
      }
      await clicar('.extrair button:has-text("na timeline")', 700);
      log('   extrair:', (await toast(/timeline|Mídia/, 40)) || 'sem toast');
      await pausa(900);
    }
    await limparModais();
    log('   modais abertos após extrair:', await page.locator('.overlay').count());
  },

  async play() {
    await limparModais();
    await page.evaluate(() => window.__vortexStore?.getState?.().setPlayhead(600));
    await clicar('.transport button:nth-child(2)', 300);
    await pausa(3400);
    await clicar('.transport button:nth-child(2)', 500);
    await mouse(720, 300);
    await pausa(400);
  },

  async exportVideo() {
    await limparModais();
    await clicar('.topbar button:has-text("Exportar")', 800);
    if (!(await page.locator('.modal').count())) {
      log('   ! modal de exportação não abriu, tentando de novo');
      await limparModais();
      await clicar('.topbar button:has-text("Exportar")', 800);
    }
    await page.selectOption('.modal select >> nth=0', 'preview').catch(() => {});
    await pausa(350);
    await page.selectOption('.modal select >> nth=2', 'webm').catch(() => {});
    await pausa(250);
    await clicar('.modal button:has-text("Exportar vídeo")', 400);
    await page.waitForSelector('.exp-previa video', { timeout: 150000, state: 'attached' });
    await pausa(900);
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 90000 }),
      clicar('.modal button:has-text("Baixar este arquivo")', 400),
    ]);
    await dl.saveAs(path.join(RAIZ, 'exports', 'demo-video.webm'));
    log('   vídeo:', fs.statSync(path.join(RAIZ, 'exports/demo-video.webm')).size);
    await page.evaluate(async () => {
      const v = document.querySelector('.exp-previa video');
      if (v) {
        v.muted = false;
        await v.play().catch(() => {});
      }
    });
    await pausa(2200);
    // frame PNG
    await clicar('.modal button:has-text("Frame PNG")', 400);
    await page.waitForSelector('.exp-previa img', { timeout: 90000, state: 'attached' });
    await pausa(700);
    const [dl2] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      clicar('.modal button:has-text("Baixar este arquivo")', 350),
    ]);
    await dl2.saveAs(path.join(RAIZ, 'exports', 'demo-frame.png'));
    await pausa(500);
    // áudio WAV
    await clicar('.modal button:has-text("Só áudio")', 400);
    await page.waitForSelector('.exp-previa audio', { timeout: 90000, state: 'attached' });
    await pausa(600);
    const [dl3] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      clicar('.modal button:has-text("Baixar este arquivo")', 350),
    ]);
    await dl3.saveAs(path.join(RAIZ, 'exports', 'demo-audio.wav'));
    await page.evaluate(async () => {
      const a = document.querySelector('.exp-previa audio');
      if (a) await a.play().catch(() => {});
    });
    await pausa(2000);
    log('   imagem e áudio exportados');
    await page.keyboard.press('Escape');
    await pausa(400);
  },

  async celular() {
    await page.setViewportSize({ width: 430, height: 810 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await pausa(900);
    await page.evaluate(() => window.scrollTo({ top: 760, behavior: 'smooth' }));
    await pausa(1200);
    await page.evaluate(() => window.scrollTo({ top: 2100, behavior: 'smooth' }));
    await pausa(1300);
    await page.evaluate(() => window.scrollTo({ top: 3300, behavior: 'smooth' }));
    await pausa(1200);
  },

  async admin() {
    await page.setViewportSize({ width: 1440, height: 810 });
    await page.goto(`${BASE}/#admin`, { waitUntil: 'networkidle' });
    await pausa(1100);
    const campos = page.locator('input');
    await campos.nth(0).fill('aliceoliveirade22@gmail.com').catch(() => {});
    await pausa(250);
    await campos.nth(1).fill('01082020').catch(() => {});
    await pausa(250);
    await clicar('button:has-text("Entrar")', 1400);
    await mouse(600, 320);
    for (const aba of ['Clientes', 'Planos e preços', 'Pagamento', 'Inteligência artificial', 'App e marca']) {
      await clicar(`text=${aba}`, 750).catch(() => {});
    }
    await pausa(500);
  },
};

const video = page.video();
const marcas = [];
log(`gravando ${BASE}`);

for (const passo of PASSOS) {
  const fn = acoes[passo.acao];
  if (!fn) continue;
  marcas.push({ id: passo.id, capitulo: passo.capitulo, inicio: Date.now() - inicioGravacao, narra: passo.narra });
  log(`▶ ${passo.capitulo}`);
  try {
    await fn();
  } catch (e) {
    log(`   ! ${passo.capitulo}: ${e.message.slice(0, 140)}`);
  }
}
marcas.push({ id: 'fim', capitulo: 'fim', inicio: Date.now() - inicioGravacao, narra: '' });

await pausa(600);
const caminho = await video.path();
await ctx.close();
await browser.close();
fs.copyFileSync(caminho, path.join(RAIZ, 'demo2-bruto.webm'));
fs.writeFileSync(
  path.join(RAIZ, 'marcas2.json'),
  JSON.stringify({ base: BASE, duracaoMs: Date.now() - inicioGravacao, marcas, erros }, null, 2),
);
log('pronto:', path.join(RAIZ, 'demo2-bruto.webm'), '| erros:', erros.length, erros.slice(0, 4));
