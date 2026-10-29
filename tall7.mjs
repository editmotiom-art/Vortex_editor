/**
 * tall7.mjs — exportação de ponta a ponta com mídia real
 * (vídeo WebM, frame PNG, áudio WAV) + prévia antes de baixar.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE ?? 'http://127.0.0.1:8890';
const out = '/home/user/vortex/.cache/exports';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
const log = (...a) => console.log(...a);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// cria conta para entrar no editor
if (await page.locator('text=Criar sua conta').first().isVisible().catch(() => false)) {
  const email = `teste${Date.now()}@vortex.dev`;
  await page.fill('input[placeholder="Como quer ser chamado"]', 'Teste Export');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'vortex2026');
  await page.click('button:has-text("Criar conta e abrir o editor")');
  await page.waitForTimeout(1200);
}
log('tema aplicado:', await page.evaluate(() => document.documentElement.getAttribute('data-theme')));
log('editor carregado:', await page.locator('.topbar button:has-text("Exportar")').count());

log('— montando timeline com clipe real —');
log('  ', await page.evaluate(() => window.__vortexTeste()));
await page.waitForTimeout(500);

await page.click('.topbar button:has-text("Exportar")');
await page.waitForSelector('.modal');

const mp4desativado = await page.locator('.modal option[value=mp4]').isDisabled();
log('MP4 desabilitado neste navegador (sem H.264):', mp4desativado);

async function esperarPrevia(seletor, anterior) {
  // espera a prévia daquele tipo (o texto do cabeçalho) aparecer
  await page.waitForSelector(seletor, { timeout: 180000 });
  for (let i = 0; i < 40; i++) {
    const t = await page.locator('.exp-previa-info').innerText().catch(() => '');
    if (t && t !== anterior) return t;
    await page.waitForTimeout(250);
  }
  return await page.locator('.exp-previa-info').innerText();
}

async function baixar(nome) {
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }),
    page.click('.modal button:has-text("Baixar este arquivo")'),
  ]);
  const destino = `${out}/${nome}`;
  await dl.saveAs(destino);
  const kb = (fs.statSync(destino).size / 1024).toFixed(0);
  log(`  ✓ ${nome} — ${kb} kB`);
  return fs.statSync(destino).size;
}

// preset leve
await page.selectOption('.modal select >> nth=0', 'preview');
await page.waitForTimeout(150);

/* frame PNG */
await page.click('.modal button:has-text("Frame PNG")');
await page.waitForSelector('.exp-previa img', { timeout: 180000 });
let marca = await esperarPrevia('.exp-previa img', null);
log('prévia PNG:', marca);
const pngBytes = await baixar('frame.png');

/* áudio WAV */
await page.click('.modal button:has-text("Só áudio")');
await page.waitForSelector('.exp-previa audio', { timeout: 180000 });
marca = await esperarPrevia('.exp-previa audio', marca);
log('prévia WAV:', marca);
const wavBytes = await baixar('audio.wav');

/* vídeo */
await page.selectOption('.modal select >> nth=2', 'webm');
await page.waitForTimeout(150);
await page.click('.modal button:has-text("Exportar vídeo")');
await page.waitForSelector('.exp-previa video', { timeout: 180000 });
marca = await esperarPrevia('.exp-previa video', marca);
log('prévia vídeo (pode levar alguns segundos de render):', marca);
const webmBytes = await baixar('video.webm');

// o vídeo exportado toca de verdade?
const tocou = await page.evaluate(async () => {
  const v = document.querySelector('.exp-previa video');
  if (!v) return 'sem vídeo';
  v.muted = true;
  await v.play().catch(() => {});
  await new Promise((r) => setTimeout(r, 900));
  return { duracao: Number(v.duration.toFixed(2)), tempo: Number(v.currentTime.toFixed(2)), w: v.videoWidth, h: v.videoHeight };
});
log('vídeo exportado:', tocou);

await page.screenshot({ path: '/home/user/vortex/docs/screenshot-exportar.png' });
log('— resultado —');
log({ pngBytes, wavBytes, webmBytes, errs: errs.slice(0, 5) });
await browser.close();
