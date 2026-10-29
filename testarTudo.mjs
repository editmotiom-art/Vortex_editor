/**
 * PROVA COMPLETA DA RODADA — roda no servidor local ou em produção
 *   node testarTudo.mjs http://127.0.0.1:8888
 *
 * Cobre: voz (MP3 real na timeline), voz por frase, botão de skills do chat
 * (Vortex + Skywork + Google + FindSkill + importar por link), roteiro,
 * imagem, Pack do Editor (163 packs, pasta real do Drive), Baixa Tudo e as
 * abas novas do painel (Voz, Skills, Pack do Editor).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const PASTA = 'docs/prova';
mkdirSync(PASTA, { recursive: true });

const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
const r = [];
const ok = (nome, cond, extra = '') => r.push({ nome, ok: Boolean(cond), extra });

const fechar = async () => {
  for (let i = 0; i < 4; i += 1) {
    if (!(await p.locator('.overlay').count())) return;
    await p.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
    await p.waitForTimeout(250);
  }
};

await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'PROVA');
await p.fill('input[type=email]', `prova${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1800);

/* ================= 1. VOZ ================= */
await p.locator('.topbar button:has-text("Legenda")').first().click({ force: true });
await p.waitForSelector('.tr-painel', { timeout: 20000 });
ok('painel “Legenda” abre com bloco de voz', await p.locator('.tr-voz').count());
const nVozes = await p.locator('.tr-voz select option').count();
ok('catálogo de vozes', nVozes >= 7, `${nVozes} vozes`);

const t0 = Date.now();
await p.fill('.tr-textarea', 'Olá! Esta é a voz da sua narração dentro do Vortex.');
await p.locator('.tr-voz button:has-text("Narrar no playhead")').click();
let clipe = null;
for (let i = 0; i < 40; i += 1) {
  await p.waitForTimeout(400);
  clipe = await p.evaluate(() => window.__vortexDoc?.().elements.find((e) => e.type === 'audio' && /Voz/.test(e.name)) ?? null);
  if (clipe) break;
}
const tempoVoz = ((Date.now() - t0) / 1000).toFixed(1);
ok('voz vira clipe de áudio na timeline', clipe, clipe ? `${(clipe.duration / 1000).toFixed(1)}s · gerado em ${tempoVoz}s` : 'não criou');
ok('voz responde rápido (sem delay)', Number(tempoVoz) < 12, `${tempoVoz}s`);

const audio = await p.evaluate(async () => {
  const d = window.__vortexDoc?.();
  const el = d?.elements.find((e) => e.type === 'audio' && /Voz/.test(e.name));
  const asset = d?.assets.find((a) => a.id === el?.assetId);
  if (!asset) return null;
  const blob = await fetch(asset.url).then((x) => x.blob());
  const dur = await new Promise((okd) => {
    const a = new Audio();
    a.onloadedmetadata = () => okd(a.duration);
    a.onerror = () => okd(0);
    a.src = URL.createObjectURL(blob);
  });
  return { bytes: blob.size, tipo: blob.type, dur };
});
ok(
  'MP3 real, decodificável e com duração',
  audio && audio.bytes > 8000 && audio.dur > 1,
  audio ? `${(audio.bytes / 1024).toFixed(0)} KB · ${audio.dur.toFixed(2)}s · ${audio.tipo}` : 'sem asset',
);
await p.screenshot({ path: `${PASTA}/01-voz-na-timeline.png` });
await fechar();

/* ================= 2. CHAT + SKILLS ================= */
await p.locator('.topbar button:has-text("IA")').first().click({ force: true });
await p.waitForSelector('.cc-texto');
ok('botão “◈ Skills” dentro do chat', await p.locator('.cc-btn-skill').count());
await p.locator('.cc-btn-skill').click();
await p.waitForSelector('.sk-gaveta');
const nSkills = await p.locator('.sk-item').count();
const selos = [...new Set((await p.locator('.sk-origem').allInnerTexts()).map((s) => s.trim()))];
ok('gaveta com todas as fontes', nSkills >= 28 && selos.includes('SKYWORK') && selos.includes('GOOGLE') && selos.includes('FINDSKILL'), `${nSkills} skills · ${selos.join('/')}`);
await p.screenshot({ path: `${PASTA}/02-gaveta-de-skills.png` });

// escolhe uma skill do Skywork e outra do Google
await p.locator('.sk-item:has-text("Slides (Skywork)")').click();
await p.waitForTimeout(500);
const skillAtual = await p.locator('.cc-skill-atual').innerText();
ok('skill escolhida vira o cérebro do chat', /Skywork/.test(skillAtual), skillAtual.trim());

// importar por link
await p.locator('.cc-btn-skill').click();
await p.locator('.sk-importar input').fill('https://findskill.ai/skills/design-media/corporate-trust-design/corporate-trust-design.zip');
await p.locator('.sk-importar button').click();
let importou = false;
for (let i = 0; i < 50; i += 1) {
  await p.waitForTimeout(500);
  const t = await p.locator('.toast').last().innerText().catch(() => '');
  if (/adicionada/i.test(t)) { importou = true; break; }
  if (/Não consegui/i.test(t)) break;
}
ok('importar skill da web pelo link', importou, `${await p.locator('.sk-item').count()} skills agora`);
await p.locator('.sk-gaveta .sk-topo button').click();
await p.waitForTimeout(300);

/* roteiro (texto) */
await p.fill('.cc-texto', 'roteiro de 15 segundos sobre café especial');
await p.locator('.cc-botoes button:has-text("Roteiro")').click();
let roteiro = '';
for (let i = 0; i < 70; i += 1) {
  await p.waitForTimeout(1000);
  roteiro = await p.locator('.cc-msg.vortex .cc-balao:not(.cc-digitando)').last().innerText();
  if (roteiro.length > 150) break;
}
const fonteTxt = await p.locator('.cc-fonte').last().innerText().catch(() => '');
ok('chat cria roteiro (gerador de texto)', roteiro.length > 150, `${roteiro.length} caracteres · ${fonteTxt.replace(/\n/g, ' ').trim()}`);
await p.screenshot({ path: `${PASTA}/03-chat-roteiro.png` });

/* imagem */
await p.fill('.cc-texto', 'xícara de café com vapor, fundo escuro');
await p.locator('.cc-botoes button:has-text("Criar imagem")').click();
let temImg = false;
for (let i = 0; i < 80; i += 1) {
  await p.waitForTimeout(1000);
  if (await p.locator('.cc-img').count()) { temImg = true; break; }
}
ok('chat cria imagem', temImg);
await p.screenshot({ path: `${PASTA}/04-chat-imagem.png` });
await fechar();

/* ================= 3. PACK DO EDITOR ================= */
await p.locator('.topbar button:has-text("Conteúdo")').first().click({ force: true });
await p.waitForTimeout(700);
await p.locator('.tab:has-text("Pack do Editor")').click();
await p.waitForTimeout(900);
const nPacks = await p.locator('.pk-card').count();
ok('catálogo com 163 packs', nPacks >= 160, `${nPacks} packs`);
await p.screenshot({ path: `${PASTA}/05-pack-do-editor.png` });

await p.fill('.pk-busca', 'flyers');
await p.waitForTimeout(400);
await p.locator('.pk-card').first().click();
let arquivosPack = 0;
for (let i = 0; i < 40; i += 1) {
  await p.waitForTimeout(1000);
  arquivosPack = await p.locator('.pk-arquivo').count();
  const erro = await p.locator('.pk-aviso.erro').count();
  if (arquivosPack > 0 || erro) break;
}
const subpastas = await p.locator('.pk-subpastas button').count();
ok('abre a pasta real no Drive', arquivosPack > 0 || subpastas > 0, `${arquivosPack} arquivo(s), ${subpastas} subpasta(s)`);
await p.screenshot({ path: `${PASTA}/06-pack-pasta-drive.png` });
await fechar();

/* ================= 4. BAIXA TUDO ================= */
await p.locator('.topbar button:has-text("Baixa Tudo")').first().click({ force: true });
await p.waitForTimeout(600);
await p.locator('.bt-input').fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
await p.locator('.baixa-tudo button:has-text("Baixar")').first().click();
let btTxt = '';
for (let i = 0; i < 70; i += 1) {
  await p.waitForTimeout(1000);
  btTxt = await p.locator('.toast').last().innerText().catch(() => '');
  if (/baixado|não consegui|bloqueou|vazio/i.test(btTxt)) break;
}
ok('Baixa Tudo baixa e coloca na timeline', /baixado/i.test(btTxt), btTxt.slice(0, 90));
await fechar();

/* ================= 5. ADMIN ================= */
await p.goto(`${BASE}/#admin`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
if (await p.locator('input[type=password]').count()) {
  await p.locator('form input').first().fill('aliceoliveirade22@gmail.com');
  await p.fill('input[type=password]', '01082020');
  await p.locator('button:has-text("Entrar no painel")').click();
  await p.waitForTimeout(2000);
}
await p.locator('button:has-text("Voz e narração")').first().click();
await p.waitForTimeout(600);
ok('admin: aba “Voz e narração”', await p.locator('h2:has-text("Voz e narração")').count());
await p.screenshot({ path: `${PASTA}/07-admin-voz.png` });

await p.locator('button:has-text("Skills do chat")').first().click();
await p.waitForTimeout(600);
const fontes = await p.locator('input[type=checkbox]').count();
ok('admin: aba “Skills do chat” com fontes ligáveis', fontes >= 4, `${fontes} checkboxes`);
await p.screenshot({ path: `${PASTA}/08-admin-skills.png` });

await p.locator('button:has-text("Pack do Editor")').first().click();
await p.waitForTimeout(600);
ok('admin: aba “Pack do Editor” (cota e consumo)', await p.locator('h2:has-text("Pack do Editor")').count());
await p.screenshot({ path: `${PASTA}/09-admin-packs.png` });

await p.locator('button:has-text("Inteligência artificial")').first().click();
await p.waitForTimeout(600);
const temToggle = await p.locator('text=Gerador de texto (Prompt) sem chave').count();
await p.locator('button:has-text("Testar gerador de texto")').click();
let resultadoTxt = '';
for (let i = 0; i < 70; i += 1) {
  await p.waitForTimeout(1000);
  resultadoTxt = await p.locator('text=/respondeu via|não respondeu|Testando/').last().innerText().catch(() => '');
  if (/respondeu via|não respondeu|⚠/.test(resultadoTxt)) break;
}
ok('admin: gerador de texto grátis configurável e testado', temToggle && /respondeu via/.test(resultadoTxt), resultadoTxt.slice(0, 100));
await p.screenshot({ path: `${PASTA}/10-admin-ia-texto.png` });

/* ================= 6. CELULAR ================= */
const ctxCel = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const cel = await ctxCel.newPage();
await cel.goto(BASE, { waitUntil: 'networkidle' });
await cel.waitForTimeout(1200);
const alturaAntes = await cel.evaluate(() => document.body.scrollHeight);
await cel.mouse.wheel(0, 1400);
await cel.waitForTimeout(700);
const rolou = await cel.evaluate(() => window.scrollY);
ok('landing rola no celular', rolou > 200, `scrollY ${rolou} · página ${alturaAntes}px`);
await cel.screenshot({ path: `${PASTA}/11-celular.png` });

console.log('\n=== PROVA DA RODADA ===');
for (const x of r) console.log(`${x.ok ? '✓' : '✗'} ${x.nome}${x.extra ? ' · ' + x.extra : ''}`);
const passaram = r.filter((x) => x.ok).length;
console.log(`\n${passaram}/${r.length} passaram · ${errs.length} erro(s) de JS`);
if (errs.length) console.log([...new Set(errs)].slice(0, 8).join('\n'));
await b.close();
process.exit(passaram === r.length ? 0 : 1);
