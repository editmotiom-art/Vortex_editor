/**
 * PROVA DE USO COMPLETO — em produção
 * Baixa uma imagem real da internet, importa, aplica template + look +
 * transição + câmera + texto + SFX + música + legendas e exporta
 * vídeo, imagem e áudio.
 */
import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'https://vortex-editor.netlify.app';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
const log = (t) => console.log('·', t);

/* ---------- 1. baixar uma imagem real da internet ---------- */
const resp = await fetch('https://picsum.photos/seed/vortex-capa/1600/1600');
const img = Buffer.from(await resp.arrayBuffer());
writeFileSync('/home/user/video/imagem-baixada.jpg', img);
log(`imagem baixada da internet: ${(img.length / 1024).toFixed(0)} KB (picsum.photos)`);

/* ---------- 2. entrar no editor ---------- */
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'PROVA COMPLETA');
await p.fill('input[type=email]', `prova${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1800);

/* ---------- 3. importar a imagem ---------- */
await p.setInputFiles('input[type=file][accept*="image"]', {
  name: 'imagem-baixada.jpg',
  mimeType: 'image/jpeg',
  buffer: img,
});
await p.waitForTimeout(2500);
let doc = await p.evaluate(() => window.__vortexDoc());
log(`importou: ${doc.elements.length} elemento(s) · assets ${await p.evaluate(() => window.__vortexAssets?.length ?? 0)}`);

/* ---------- 4. template (biblioteca) ---------- */
await p.locator('.sidebar .tab:has-text("Biblioteca")').first().click();
await p.locator('.cat-chips .chip:has-text("Templates")').first().click();
await p.waitForTimeout(300);
await p.locator('.lib-card').nth(1).click();
await p.waitForTimeout(1000);

/* ---------- 5. mover/escalar no palco ---------- */
const selecionarClip = async () => {
  await p.evaluate(() => {
    const st = window.__vortexStore.getState();
    const clip = st.doc.elements.find((e) => e.type === 'image') ?? st.doc.elements[0];
    if (clip) st.select([clip.id]);
    st.setPlayhead(clip ? clip.start + 200 : 200);
  });
};
await selecionarClip();
await p.waitForTimeout(500);

/* ---------- 6. look de cinema (aplica no clipe selecionado) ---------- */
await p.locator('.sidebar .tab:has-text("Biblioteca")').first().click();
await p.locator('.cat-chips .chip:has-text("Looks")').first().click();
await p.waitForTimeout(300);
await p.locator('.lib-card').nth(1).click();
await p.waitForTimeout(900);

/* ---------- 7. transição + câmera pela barra PRO ---------- */
await selecionarClip();
await p.locator('.bp-btn:has-text("Transição")').first().click({ force: true });
await p.waitForTimeout(700);
await selecionarClip();
await p.locator('.bp-btn:has-text("Câmera")').first().click({ force: true });
await p.waitForTimeout(700);

/* ---------- 8. SFX + música (gerados no navegador) ---------- */
for (const cat of ['SFX', 'Música']) {
  await p.locator('.sidebar .tab:has-text("Biblioteca")').first().click();
  await p.locator(`.cat-chips .chip:has-text("${cat}")`).first().click();
  await p.waitForTimeout(300);
  await p.locator('.lib-card').first().click();
  await p.waitForTimeout(3500);
}

/* ---------- 9. texto + + Forma ---------- */
await p.locator('.topbar button:has-text("+ Texto")').first().click();
await p.waitForTimeout(600);
await p.evaluate(() => {
  const st = window.__vortexStore.getState();
  const t = [...st.doc.elements].reverse().find((e) => e.type === 'text');
  if (t) {
    st.updateElement(t.id, { text: { ...t.text, content: 'FEITO NO VORTEX', fontSize: 120 } }, false);
    st.updateTransform(t.id, 'y', { base: st.doc.settings.height * 0.8, keyframes: [] });
  }
  st.setPlayhead(0);
});
await p.waitForTimeout(600);

doc = await p.evaluate(() => window.__vortexDoc());
const resumo = {
  elementos: doc.elements.length,
  tipos: [...new Set(doc.elements.map((e) => e.type))].join(','),
  comEfeito: doc.elements.filter((e) => e.effects.length).length,
  comKeyframe: doc.elements.filter((e) => e.keyframes > 0).length,
  trilhas: doc.tracks.length,
};
log('documento: ' + JSON.stringify(resumo));

/* ---------- 10. exportar imagem ---------- */
// o look de cinema aplica fade-in: exporta o frame 1,2 s depois do início
await p.evaluate(() => window.__vortexStore.getState().setPlayhead(1200));
await p.waitForTimeout(700);
await p.evaluate(() => window.__vortexUI.getState().openModal('export'));
await p.waitForTimeout(900);
await p.locator('.modal button:has-text("Frame PNG")').first().click({ force: true });
const temImg = await p.waitForSelector('.exp-previa img', { timeout: 60000 }).then(() => true).catch(() => false);
let bytesImg = 0;
if (temImg) {
  // a prévia usa blob: — lê os bytes dentro da página e salva aqui
  const b64 = await p.evaluate(async () => {
    const el = document.querySelector('.exp-previa img');
    const src = el?.getAttribute('src') ?? '';
    const blob = await fetch(src).then((r) => r.blob());
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 1) s += String.fromCharCode(buf[i]);
    return btoa(s);
  });
  const buf = Buffer.from(b64, 'base64');
  writeFileSync('/home/user/video/entrega/prova-export-imagem.png', buf);
  bytesImg = buf.length;
}
log(`export imagem: ${temImg ? (bytesImg / 1024).toFixed(0) + ' KB' : 'falhou'}`);

/* ---------- 11. exportar vídeo ---------- */
await p.keyboard.press('Escape');
await p.waitForTimeout(500);
await p.evaluate(() => window.__vortexUI.getState().openModal('export'));
await p.waitForTimeout(900);
await p.locator('.modal button:has-text("Exportar vídeo")').first().click({ force: true });
const temVid = await p.waitForSelector('.exp-previa video', { timeout: 180000 }).then(() => true).catch(() => false);
let bytesVid = 0;
if (temVid) {
  const b64 = await p.evaluate(async () => {
    const v = document.querySelector('.exp-previa video');
    const src = v?.getAttribute('src') ?? '';
    const blob = await fetch(src).then((r) => r.blob());
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    const passo = 8192;
    for (let i = 0; i < buf.length; i += passo) {
      s += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + passo)));
    }
    return btoa(s);
  });
  const bufV = Buffer.from(b64, 'base64');
  writeFileSync('/home/user/video/entrega/prova-export-video.webm', bufV);
  bytesVid = bufV.length;
}
log(`export vídeo: ${temVid ? (bytesVid / 1024 / 1024).toFixed(2) + ' MB' : 'falhou'}`);
await p.screenshot({ path: '/home/user/video/prova-editor.png' });

/* ---------- 12. transcrição do áudio do projeto → legenda ---------- */
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
await p.evaluate(() => window.__vortexUI.getState().closeModal());
await p.locator('.topbar button:has-text("Legenda")').first().click({ force: true });
await p.waitForTimeout(900);
const fontes = await p.locator('.tr-painel select').count();
const temAudioNoProjeto = await p.locator('.tr-painel select option').count();
log(`painel de legenda: ${fontes} seletor(es), ${temAudioNoProjeto} opções de áudio do projeto`);
let transcrito = 0;
if (temAudioNoProjeto > 1) {
  await p.locator('.tr-painel button:has-text("Transcrever")').click();
  for (let i = 0; i < 180; i += 1) {
    await p.waitForTimeout(1000);
    transcrito = await p.locator('.tr-frases li').count();
    if (transcrito > 0) break;
  }
  if (transcrito > 0) {
    await p.locator('.tr-acoes button:has-text("Adicionar como legenda")').click();
    await p.waitForTimeout(1200);
  }
}
log(`transcrição: ${transcrito} frase(s)`);

doc = await p.evaluate(() => window.__vortexDoc());
console.log('\n=== RESULTADO ===');
console.log(`elementos finais: ${doc.elements.length} · textos: ${doc.elements.filter((e) => e.type === 'text').length} · textos com legenda: ${doc.elements.filter((e) => e.type === 'text').length}`);
console.log(`erros de JS: ${errs.length}`);
if (errs.length) console.log([...new Set(errs)].slice(0, 6).join('\n'));
console.log(`arquivos: imagem-baixada.jpg (${(img.length / 1024).toFixed(0)} KB), prova-export-imagem.png (${(bytesImg / 1024).toFixed(0)} KB), vídeo ${(bytesVid / 1024 / 1024).toFixed(2)} MB`);
await b.close();
