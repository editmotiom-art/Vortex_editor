/**
 * TESTE: vozes, botão de skills no chat, gerador de texto e Baixa Tudo.
 *   node testarVozChat.mjs http://127.0.0.1:8888
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 140)));
const r = [];
const fechar = async () => {
  for (let i = 0; i < 4; i += 1) {
    if (!(await p.locator('.overlay').count())) break;
    await p.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(300);
  }
};

await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'VOZ CHAT');
await p.fill('input[type=email]', `vz${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1700);

/* ---------- 1. VOZ: narrar no playhead ---------- */
await p.locator('.topbar button:has-text("Legenda")').first().click({ force: true });
await p.waitForSelector('.tr-painel', { timeout: 15000 });
await p.waitForTimeout(500);
r.push({ nome: 'painel de voz aparece', ok: (await p.locator('.tr-voz').count()) > 0 });
const vozes = await p.locator('.tr-voz select option').count();
r.push({ nome: 'catálogo de vozes', ok: vozes >= 7, extra: `${vozes} vozes` });

await p.fill('.tr-textarea', 'Olá! Esta narração foi criada dentro do Vortex.');
await p.locator('.tr-voz button:has-text("Narrar no playhead")').click();
let audioClip = null;
for (let i = 0; i < 40; i += 1) {
  await p.waitForTimeout(500);
  const d = await p.evaluate(() => window.__vortexDoc());
  audioClip = d.elements.find((e) => e.type === 'audio' && /Voz/.test(e.name));
  if (audioClip) break;
}
r.push({
  nome: 'voz vira clipe na timeline',
  ok: Boolean(audioClip),
  extra: audioClip ? `${Math.round(audioClip.duration / 100) / 10}s · início ${Math.round(audioClip.start)}ms` : 'não criou',
});

/* o áudio tem de ser decodificável e com duração > 1s */
const info = await p.evaluate(async () => {
  const assets = (window.__vortexAssets || []).filter((a) => /Voz/.test(a.name));
  if (!assets.length) return null;
  const a = assets[assets.length - 1];
  const blob = await fetch(a.url).then((r) => r.blob());
  const duracao = await new Promise((ok) => {
    const el = new Audio();
    el.onloadedmetadata = () => ok(el.duration);
    el.onerror = () => ok(0);
    el.src = URL.createObjectURL(blob);
  });
  return { bytes: blob.size, tipo: blob.type, duracao };
});
r.push({
  nome: 'áudio da voz é válido',
  ok: Boolean(info && info.bytes > 8000 && info.duracao > 1),
  extra: info ? `${(info.bytes / 1024).toFixed(0)} KB · ${info.duracao.toFixed(2)}s · ${info.tipo}` : 'sem asset',
});

/* ---------- 2. VOZ: frase transcrita → narração no tempo dela ---------- */
// o painel é uma lista longa: leva o elemento até a área visível e espera
const campoArquivo = p.locator('.tr-painel input[type=file]').first();
await campoArquivo.waitFor({ state: 'attached', timeout: 20000 });
const antesVoz = await p.evaluate(() => window.__vortexDoc().elements.filter((e) => e.type === 'audio').length);
await campoArquivo.setInputFiles({
  name: 'fala.mp3',
  mimeType: 'audio/mpeg',
  buffer: readFileSync('/home/user/video/narra2/n02.mp3'),
});
await p.waitForTimeout(1200);
await p.locator('.tr-painel button:has-text("Transcrever")').click();
let frases = 0;
for (let i = 0; i < 120; i += 1) {
  await p.waitForTimeout(1000);
  frases = await p.locator('.tr-frases li').count();
  if (frases > 0) break;
}
r.push({ nome: 'transcrição funciona', ok: frases > 0, extra: `${frases} frase(s)` });
if (frases > 0) {
  await p.locator('.tr-frases li').first().locator('.tr-voz-btn').click();
  let ok = false;
  for (let i = 0; i < 40; i += 1) {
    await p.waitForTimeout(500);
    const n = await p.evaluate(() => window.__vortexDoc().elements.filter((e) => e.type === 'audio').length);
    if (n > antesVoz) {
      ok = true;
      break;
    }
  }
  r.push({ nome: 'voz por frase (no tempo da legenda)', ok });
  const inicioFrase = await p.evaluate(() => {
    const d = window.__vortexDoc();
    const voz = d.elements.filter((e) => e.type === 'audio' && /Voz/.test(e.name)).pop();
    return voz ? Math.round(voz.start) : -1;
  });
  r.push({ nome: 'voz começa no instante da frase', ok: inicioFrase >= 0 && inicioFrase < 2000, extra: `${inicioFrase}ms` });
}
await fechar();

/* ---------- 3. CHAT: botão de skills ---------- */
await p.locator('.topbar button:has-text("IA")').first().click({ force: true });
await p.waitForTimeout(900);
r.push({ nome: 'botão de skills no chat', ok: (await p.locator('.cc-btn-skill').count()) > 0 });
await p.locator('.cc-btn-skill').click();
await p.waitForTimeout(700);
const naGaveta = await p.locator('.sk-item').count();
r.push({ nome: 'gaveta lista skills', ok: naGaveta >= 24, extra: `${naGaveta} skills (Vortex + plataformas + web)` });
const selos = await p.locator('.sk-origem').allInnerTexts();
const fontes = [...new Set(selos.map((x) => x.trim()))].join('/');
r.push({
  nome: 'fontes Skywork + Google + FindSkill',
  ok: /SKYWORK/.test(fontes) && /GOOGLE/.test(fontes) && /FINDSKILL/.test(fontes),
  extra: fontes,
});

/* escolhe uma skill da web */
await p.locator('.sk-filtros .chip:has-text("Da web")').click();
await p.waitForTimeout(400);
const webSkills = await p.locator('.sk-item').count();
r.push({ nome: 'skills da web embutidas', ok: webSkills >= 5, extra: `${webSkills} da findskill.ai` });
if (webSkills > 0) {
  await p.locator('.sk-item').first().click();
  await p.waitForTimeout(600);
  const atual = await p.locator('.cc-skill-atual').innerText();
  r.push({ nome: 'skill escolhida aparece no chat', ok: /FindSkill/.test(atual), extra: atual.trim() });
}

/* ---------- 4. importar skill por link ---------- */
await p.locator('.cc-btn-skill').click();
await p.waitForTimeout(500);
await p.locator('.sk-importar input').fill(
  'https://findskill.ai/skills/design-media/corporate-trust-design/corporate-trust-design.zip',
);
await p.locator('.sk-importar button').click();
let importou = false;
for (let i = 0; i < 40; i += 1) {
  await p.waitForTimeout(500);
  const t = await p.locator('.toast').last().innerText().catch(() => '');
  if (/adicionada/i.test(t)) {
    importou = true;
    break;
  }
  if (/Não consegui/i.test(t)) break;
}
const total = await p.locator('.sk-item').count();
r.push({ nome: 'importar skill pelo link', ok: importou, extra: `${total} skills agora` });
await p.locator('.sk-gaveta .sk-topo button').click();
await p.waitForTimeout(400);

/* ---------- 5. CHAT: roteiro de vídeo (texto) ---------- */
await p.fill('.cc-texto', 'roteiro de 15 segundos sobre café especial');
await p.locator('.cc-botoes button:has-text("Roteiro")').click();
let roteiro = '';
for (let i = 0; i < 60; i += 1) {
  await p.waitForTimeout(1000);
  roteiro = await p.locator('.cc-msg.vortex .cc-balao').last().innerText();
  if (roteiro.length > 120) break;
}
r.push({
  nome: 'chat cria roteiro (texto)',
  ok: roteiro.length > 120,
  extra: `${roteiro.length} caracteres · fonte ${await p.locator('.cc-fonte').last().innerText().catch(() => 'local')}`,
});

/* ---------- 6. CHAT: criar imagem ---------- */
await p.fill('.cc-texto', 'foto de uma xícara de café com vapor');
await p.locator('.cc-botoes button:has-text("Criar imagem")').click();
let temImg = false;
for (let i = 0; i < 75; i += 1) {
  await p.waitForTimeout(1000);
  if ((await p.locator('.cc-img').count()) > 0) {
    temImg = true;
    break;
  }
}
r.push({ nome: 'chat cria imagem', ok: temImg });
await fechar();

/* ---------- 7. Baixa Tudo ---------- */
await p.locator('.topbar button:has-text("Baixa Tudo")').first().click();
await p.waitForTimeout(600);
await p.locator('.bt-input').fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
await p.locator('.baixa-tudo button:has-text("Baixar")').first().click();
let bt = '';
for (let i = 0; i < 60; i += 1) {
  await p.waitForTimeout(1000);
  bt = await p.locator('.toast').last().innerText().catch(() => '');
  if (/baixado|não consegui|vazio|bloqueou/i.test(bt)) break;
}
r.push({ nome: 'Baixa Tudo', ok: /baixado/i.test(bt), extra: bt.slice(0, 80) });

/* ---------- 8. ADMIN: aba de skills ---------- */
await fechar();
await p.goto(`${BASE}/#admin`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
if (await p.locator('input[type=password]').count()) {
  await p.locator('form input').first().fill('aliceoliveirade22@gmail.com');
  await p.fill('input[type=password]', '01082020');
  await p.locator('button:has-text("Entrar no painel")').click();
  await p.waitForTimeout(1800);
}
await p.locator('button:has-text("Skills do chat")').first().click();
await p.waitForTimeout(600);
const blocos = await p.locator('h2:has-text("Skills do chat")').count();
r.push({ nome: 'admin: aba Skills do chat', ok: blocos > 0 });
const fontesAdmin = await p.locator('input[type=checkbox]').count();
r.push({ nome: 'admin: fontes ligáveis', ok: fontesAdmin >= 4, extra: `${fontesAdmin} fontes` });
await p.locator('label:has-text("ligada")').first().click();
await p.locator('button:has-text("Salvar fontes")').click();
await p.waitForTimeout(500);
const tSkills = await p.locator('.toast').last().innerText().catch(() => '');
r.push({ nome: 'admin: salvar fontes', ok: /skills/.test(tSkills), extra: tSkills.slice(0, 60) });

console.log('\n=== RELATÓRIO ===');
for (const x of r) console.log(`${x.ok ? '✓' : '✗'} ${x.nome}${x.extra ? ' · ' + x.extra : ''}`);
console.log(`\n${r.filter((x) => x.ok).length}/${r.length} passaram · ${errs.length} erro(s) de JS`);
if (errs.length) console.log([...new Set(errs)].slice(0, 6).join('\n'));
await b.close();
