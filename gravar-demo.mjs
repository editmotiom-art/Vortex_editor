/**
 * VÍDEO DE APRESENTAÇÃO — GRAVAÇÃO POR CAPÍTULOS
 * ------------------------------------------------------------
 * Por que refazer: nas versões anteriores a narração era encaixada por tempo
 * em cima de uma gravação única, e uma voz entrava por cima da outra. Aqui
 * cada capítulo é gravado SEPARADO e recebe a própria narração:
 *
 *   capítulo 1 → tela1.webm + voz1.mp3 → trecho 1
 *   capítulo 2 → tela2.webm + voz2.mp3 → trecho 2   ...
 *
 * A montagem (montar-demo.mjs) só concatena trechos: é impossível duas vozes
 * falarem juntas, e o corte de cada trecho é o corte do próprio capítulo.
 *
 * Toda ação aqui é real: conta criada no banco, download do Drive de
 * verdade, biblioteca baixando arquivo, narração gerada pelo servidor.
 *
 *   node gravar-demo.mjs [base]      # padrão http://localhost:3001
 *
 * Saída: video-demo/demo/capN.webm + indice.json (tempos de corte)
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3001';
const RAIZ = path.resolve('video-demo/demo');
const MIDIA = path.resolve('.cache/midia-preview');
const LARG = 1920;
const ALT = 1080;

fs.rmSync(RAIZ, { recursive: true, force: true });
fs.mkdirSync(RAIZ, { recursive: true });

/* ---------------- conta de demonstração no banco ---------------- */
const K_SUPA =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZnVlYWxobW55bGxycWhvbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3NTMsImV4cCI6MjEwODc3ODc1M30.-clD1uKofTBHIM_-YeF2BKTbPJL_Y-_mKLGhCOyEtcM';
const rpc = async (nome, args = {}) => {
  const r = await fetch(`https://pufuealhmnyllrqholye.supabase.co/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: { apikey: K_SUPA, authorization: `Bearer ${K_SUPA}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  return r.json().catch(() => ({}));
};

const conta = await rpc('vortex_criar_conta', {
  p_nome: 'Vortex Demo',
  p_email: `demo.${Date.now()}@vortex.dev`,
  p_senha: 'vortex2026',
});
if (!conta?.token) throw new Error('não consegui criar a conta de demonstração no banco');
console.log('conta de demonstração:', conta.token.slice(0, 8) + '…');

/* ---------------- utilidades ---------------- */
const dur = (arq) =>
  Number(
    execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq])
      .toString()
      .trim(),
  );

const textos = fs.existsSync('video-demo/vozes/textos.json')
  ? JSON.parse(fs.readFileSync('video-demo/vozes/textos.json', 'utf8'))
  : [];

/** abre um navegador novo para o capítulo (cada um com gravação própria) */
const abrirCapitulo = async (indice) => {
  const browser = await chromium.launch({
    channel: 'chromium',
    args: ['--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=1'],
  });
  const ctx = await browser.newContext({
    viewport: { width: LARG, height: ALT },
    recordVideo: { dir: path.join(RAIZ, `cap${indice}`), size: { width: LARG, height: ALT } },
  });
  await ctx.addInitScript((t) => localStorage.setItem('vortex.token.v1', t), conta.token);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('   aviso JS:', e.message.slice(0, 100)));
  const t0 = Date.now();
  const marca = () => Number(((Date.now() - t0) / 1000).toFixed(2));
  return { browser, ctx, page, t0, marca };
};

const index = [];
const gravar = async (indice, nome, roteiro, minSeg) => {
  console.log(`\n▶ capítulo ${indice}: ${nome}`);
  const { browser, ctx, page, marca } = await abrirCapitulo(indice);
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const inicioAcao = marca(); // aqui a tela já está no editor
  await roteiro(page);
  /* garante tempo de tela para a narração inteira deste capítulo */
  const gasto = marca() - inicioAcao;
  if (gasto < minSeg) await page.waitForTimeout(Math.round((minSeg - gasto) * 1000));
  await page.waitForTimeout(900);
  const fimAcao = marca();
  const video = page.video();
  await ctx.close();
  await browser.close();
  const arquivo = video ? await video.path() : '';
  const destino = path.join(RAIZ, `cap${indice}.webm`);
  if (arquivo) fs.copyFileSync(arquivo, destino);
  const durVideo = fs.existsSync(destino) ? await dur(destino) : 0;
  index.push({ indice, nome, arquivo: destino, inicio: inicioAcao, fim: fimAcao, durVideo });
  console.log(`   tela ${durVideo.toFixed(1)}s · ação ${(fimAcao - inicioAcao).toFixed(1)}s`);
};

/* ============================================================
   CAPÍTULOS (um por bloco de narração)
   ============================================================ */

await gravar(
  1,
  'O editor aberto',
  async (page) => {
    await page.locator('.bandeja input[type=file]').first().setInputFiles(`${MIDIA}/vertical.webm`).catch(() => {});
    await page.waitForTimeout(2200);
    await page.locator('.bandeja input[type=file]').first().setInputFiles(`${MIDIA}/clipe.webm`).catch(() => {});
    await page.waitForTimeout(1800);
    await page.locator('.clip').first().click().catch(() => {});
    await page.waitForTimeout(1200);
  },
  13.5,
);

await gravar(
  2,
  'Biblioteca com música real',
  async (page) => {
    await page.locator('.sidebar .tab', { hasText: 'Biblioteca' }).first().click().catch(() => {});
    await page.waitForTimeout(1500);
    const musica = page.locator('.bib-real-card', { hasText: 'Música' }).first();
    await musica.locator('button:has-text("Mídia")').click();
    await page.waitForTimeout(12000);
    const fundo = page.locator('.bib-real-card').filter({ has: page.locator('.bib-real-sub', { hasText: 'Fundos' }) }).first();
    await fundo.locator('button:has-text("Mídia")').click();
    await page.waitForTimeout(9000);
    await page.locator('.sidebar .tab', { hasText: 'Mídia' }).first().click().catch(() => {});
    await page.waitForTimeout(2500);
  },
  13.5,
);

await gravar(
  3,
  'Conteúdo do Drive',
  async (page) => {
    await page.locator('.topbar button', { hasText: /^Conteúdo$/ }).first().click();
    await page.waitForTimeout(1200);
    await page.locator('.tab:has-text("Pack do Editor")').click().catch(() => {});
    await page.waitForTimeout(2500);
    const alvo = page.locator('.pk-pronto', { hasText: 'Action Fx' }).locator('button:has-text("timeline")').first();
    await alvo.click();
    await page.waitForTimeout(22000);
    await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
  },
  15.5,
);

await gravar(
  4,
  'Legenda e voz',
  async (page) => {
    await page.locator('.bandeja input[type=file]').first().setInputFiles(`${MIDIA}/vertical.webm`).catch(() => {});
    await page.waitForTimeout(1800);
    await page.locator('.topbar button:has-text("Legenda")').first().click();
    await page.waitForTimeout(1200);
    await page.locator('.tr-textarea').fill('Voz de verdade dentro do editor, escolhida por você.').catch(() => {});
    await page.waitForTimeout(800);
    const vozes = page.locator('.tr-voz select');
    if (await vozes.count()) {
      await vozes.first().selectOption({ index: 1 }).catch(() => {});
      await page.waitForTimeout(600);
    }
    await page.locator('.tr-voz button:has-text("Narrar no playhead"), button:has-text("Narrar")').first().click().catch(() => {});
    await page.waitForTimeout(9000);
    await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
  },
  14.2,
);

await gravar(
  5,
  'Plano por horas',
  async (page) => {
    await page.locator('.topbar button[title="Conta e assinatura"]').first().click();
    await page.waitForTimeout(1800);
    await page.locator('.pc-tab:has-text("Downloads")').click().catch(() => {});
    await page.waitForTimeout(2200);
    await page.locator('.pc-tab:has-text("Plano e horas")').click().catch(() => {});
    await page.waitForTimeout(2500);
    await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
    await page.locator('.topbar button', { hasText: /^Exportar$/ }).click();
    await page.waitForTimeout(2000);
  },
  14.6,
);

fs.writeFileSync(
  path.join(RAIZ, 'indice.json'),
  JSON.stringify({ base: BASE, capitulos: index, narracao: textos }, null, 2),
);
console.log('\ncapítulos gravados:', index.map((c) => `${c.nome} (${c.durVideo.toFixed(1)}s)`).join(' · '));
