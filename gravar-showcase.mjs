/**
 * VÍDEO DE APRESENTAÇÃO — SHOWCASE (só o sistema, uma narração, sem edição)
 * ------------------------------------------------------------
 * O que mudou em relação às versões anteriores (que o cliente rejeitou):
 *  · SEM narração por capítulo emendada (era o que atropelava as vozes).
 *    Agora existe UM texto único, narrado em um arquivo só, e ele é
 *    encaixado por ffmpeg no tempo — nunca dois áudios ao mesmo tempo.
 *  · SEM edição "de produto": a tela faz as ações de verdade, em ritmo
 *    constante, com zoom suave e legenda curta em cada passo.
 *  · Áudio final normalizado (loudnorm) e com trilha bem discreta.
 *
 *   node gravar-showcase.mjs [base]     # padrão http://127.0.0.1:3001
 *
 * Saída: video-demo/showcase/*.webm (tela crua) + passos.json (tempos)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:3001';
const RAIZ = path.resolve('video-demo/showcase');
/* limpa só a gravação — os áudios (video-demo/vozes) são preservados */
for (const f of ['tela.webm', 'passos.json', 'relatorio.json']) fs.rmSync(path.join(RAIZ, f), { force: true });
fs.mkdirSync(RAIZ, { recursive: true });
fs.readdirSync(RAIZ).filter((f) => f.endsWith('.webm') && f !== 'tela.webm').forEach((f) => fs.rmSync(path.join(RAIZ, f), { force: true }));

const LARG = 1920;
const ALT = 1080;
const MIDIA = path.resolve('.cache/midia-preview');

/* conta de demonstração criada no banco (mesma API do app) */
const K_SUPA =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZnVlYWxobW55bGxycWhvbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3NTMsImV4cCI6MjEwODc3ODc1M30.-clD1uKofTBHIM_-YeF2BKTbPJL_Y-_mKLGhCOyEtcM';
const rpcBanco = async (nome, args = {}) => {
  const r = await fetch(`https://pufuealhmnyllrqholye.supabase.co/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: { apikey: K_SUPA, authorization: `Bearer ${K_SUPA}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  return r.json().catch(() => ({}));
};

const passos = [];
const t0 = Date.now();
const marca = (nome) => {
  const t = (Date.now() - t0) / 1000;
  passos.push({ nome, inicio: Number(t.toFixed(2)) });
  console.log(`  ${t.toFixed(1)}s  ${nome}`);
};

const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=1'],
});
const ctx = await browser.newContext({
  viewport: { width: LARG, height: ALT },
  /* a gravação de tela é feita pelo próprio Playwright: um .webm com o
     tempo real das ações (o screencast do CDP só entrega JPEG/PNG) */
  recordVideo: { dir: RAIZ, size: { width: LARG, height: ALT } },
});

/* conta de demo com horas de sobra */
const conta = await rpcBanco('vortex_criar_conta', {
  p_nome: 'Apresentação Vortex',
  p_email: `showcase.${Date.now()}@vortex.dev`,
  p_senha: 'vortex2026',
});
const adm = await rpcBanco('vortex_entrar', { p_email: 'aliceoliveirade22@gmail.com', p_senha: '01082020' });
const lista = await rpcBanco('vortex_admin_listar', { p_token: adm.token });
const eu = (lista.usuarios ?? []).find((u) => u.email?.startsWith('showcase.')) ?? null;
if (eu) await rpcBanco('vortex_admin_set_horas', { p_token: adm.token, p_usuario: eu.id, p_horas: 24, p_tipo: 'pro', p_motivo: 'showcase' });

await ctx.addInitScript((t) => localStorage.setItem('vortex.token.v1', t), conta.token);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  aviso JS:', e.message.slice(0, 120)));

const espera = (ms) => page.waitForTimeout(ms);
/* zoom suave apenas na área do editor; nunca corta a barra de ferramentas */
const zoom = async () => {
  await espera(400);
};

console.log('gravando apresentação…');

/* ---------- 1. o editor aberto (panorâmica) ---------- */
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await espera(4500);
marca('editor');

/* importa dois clipes para a tela não ficar vazia */
await page.locator('.bandeja input[type=file]').first().setInputFiles(MIDIA + '/vertical.webm').catch(() => {});
await espera(2500);
marca('midia na timeline');

await zoom(1.06, 1200);

/* ---------- 2. biblioteca de conteúdo ---------- */
await page.locator('.sidebar .tab', { hasText: /Biblioteca|Library/i }).first().click().catch(() => {});
await espera(2000);
marca('biblioteca');

/* ---------- 3. Baixar conteúdo (a ferramenta única) ---------- */
await page.locator('.topbar button', { hasText: /^⬇ Baixar conteúdo$/ }).first().click();
await espera(900);
await page.locator('.bt-input').fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
await espera(700);
marca('baixar conteudo');
await page.locator('.baixar-conteudo button:has-text("Analisar link")').click();
await espera(6500);
marca('link analisado');
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(600);

/* ---------- 4. acervo / packs ---------- */
await page.locator('.topbar button', { hasText: /^Conteúdo$/ }).first().click();
await espera(1500);
marca('acervo');
await page.locator('.tab:has-text("Pack do Editor")').click().catch(() => {});
await espera(2500);
marca('packs');
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(500);

/* ---------- 5. legenda / voz ---------- */
await page.locator('.topbar button:has-text("Legenda")').first().click();
await espera(1800);
await page.locator('.tr-textarea').fill('Legenda automática e voz dentro do editor.').catch(() => {});
await espera(900);
marca('legenda e voz');
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(500);

/* ---------- 6. IA de criação ---------- */
await page.locator('.topbar button', { hasText: /^✦ IA$/ }).first().click();
await espera(2200);
marca('ia');
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(500);

/* ---------- 7. plano: barra de horas + checkout ---------- */
await page.locator('.topbar button[title="Conta e assinatura"]').first().click();
await espera(2200);
marca('conta e plano');
await page.locator('.pc-tab:has-text("Downloads")').click().catch(() => {});
await espera(1800);
marca('meus downloads');
await page.locator('.pc-tab:has-text("Plano e horas")').click().catch(() => {});
await espera(1800);
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(600);

/* ---------- 8. admin: horas e pagamento ---------- */
await page.goto(`${BASE}/#admin`, { waitUntil: 'domcontentloaded' });
await espera(2200);
await page.fill('input[autocomplete="username"]', 'aliceoliveirade22@gmail.com').catch(() => {});
await page.fill('input[autocomplete="current-password"]', '01082020').catch(() => {});
await page.locator('button[type="submit"]').click().catch(() => {});
await espera(3500);
marca('admin visao');
await page.locator('text=Clientes').first().click().catch(() => {});
await espera(2500);
marca('admin clientes');
await page.locator('text=Horas de plano').first().click().catch(() => {});
await espera(2200);
marca('admin horas');
await page.locator('text=Pagamentos').first().click().catch(() => {});
await espera(2200);
marca('admin pagamentos');

/* ---------- 9. volta ao editor e exporta ---------- */
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await espera(3500);
await zoom(1.0, 600);
await page.locator('.bandeja input[type=file]').first().setInputFiles(MIDIA + '/vertical.webm').catch(() => {});
await espera(2200);
await page.locator('.topbar button', { hasText: /^Exportar$/ }).click();
await espera(1600);
marca('exportar');
await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
await espera(1200);

/* dá um instante na tela final antes de cortar */
await espera(1500);
const video = page.video();
await ctx.close();
await browser.close();
if (video) {
  const caminho = await video.path();
  fs.copyFileSync(caminho, path.join(RAIZ, 'tela.webm'));
}

const total = (Date.now() - t0) / 1000;
fs.writeFileSync(path.join(RAIZ, 'passos.json'), JSON.stringify({ base: BASE, total: Number(total.toFixed(2)), passos }, null, 2));
console.log(`\ntela.webm gravada (${total.toFixed(1)}s) · passos.json com ${passos.length} marcos`);
