/**
 * TESTE DE FERRAMENTAS — cada recurso do editor tem de MUDAR o documento.
 * Roda contra o build local (dev-server na 8888) ou produção.
 *   node testarFerramentas.mjs http://127.0.0.1:8888
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const flt = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await flt.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
p.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text().slice(0, 160)));

const rel = [];
const snap = () =>
  p.evaluate(() => {
    const d = window.__vortexDoc?.();
    if (!d) return null;
    const els = d.elements ?? [];
    return {
      n: els.length,
      tipos: els.map((e) => e.type).sort().join(','),
      texto: els.map((e) => e.text?.content ?? '').join('|').slice(0, 120),
      efeitos: els.reduce((s, e) => s + (e.effects?.length ?? 0), 0),
      fx: els.map((e) => (e.effects ?? []).map((f) => f.type).join('+')).join('|'),
      filtro: els.map((e) => e.filter ?? '').join('|').slice(0, 80),
      blend: els.map((e) => e.blendMode ?? '').join('|').slice(0, 80),
      anim: els.map((e) => (e.keyframes ? JSON.stringify(e.keyframes).length : 0)).join(','),
      duracao: d.elements?.length ? Math.max(...els.map((e) => e.start + e.duration)) : 0,
      cfg: JSON.stringify(d.settings ?? {}).length,
    };
  });

const registrar = (nome, antes, depois, extra = '') => {
  const mudou =
    JSON.stringify(antes) !== JSON.stringify(depois) ||
    (depois && antes && (depois.efeitos > antes.efeitos || depois.n > antes.n || depois.anim !== antes.anim));
  rel.push({ nome, mudou, antes: antes?.n, depois: depois?.n, extra });
  return mudou;
};

/* ---------- entrar no editor ---------- */
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(500);
await p.fill('input[placeholder="Como quer ser chamado"]', 'TESTE FERRAMENTAS');
await p.fill('input[type=email]', `tf${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1800);

/* ---------- 1. criar cada tipo de elemento pela barra de ferramentas ---------- */
const ferramentas = [
  { nome: 'texto', botao: 'button[title="Adicionar texto"], .topbar button:has-text("Texto"), button:has-text("+ Texto")' },
  { nome: 'forma', botao: '.tl-toolbar button:has-text("Forma"), .tl-toolbar button:has-text("+")' },
];
for (const f of ferramentas) {
  const antes = await snap();
  const btn = p.locator(f.botao).first();
  if (await btn.count()) {
    await btn.click({ force: true }).catch(() => {});
    await p.waitForTimeout(700);
    registrar('criar ' + f.nome, antes, await snap());
  } else rel.push({ nome: 'criar ' + f.nome, mudou: false, extra: 'botão não encontrado' });
}

/* ---------- 2. biblioteca: aplicar itens de categorias diferentes ---------- */
const cats = ['Templates', 'Transições', 'Looks', 'Texto', 'Formas', 'Elementos', 'SFX', 'Música', 'Overlays', 'Fundos'];
await p.locator('.sidebar .tab:has-text("Biblioteca")').first().click().catch(() => {});
await p.waitForTimeout(500);
for (const cat of cats) {
  const chip = p.locator(`.cat-chips .chip:has-text("${cat}")`).first();
  if (!(await chip.count())) {
    rel.push({ nome: 'biblioteca › ' + cat, mudou: false, extra: 'categoria ausente' });
    continue;
  }
  await chip.click();
  await p.waitForTimeout(400);
  const card = p.locator('.lib-card').first();
  const antes = await snap();
  await card.click({ force: true });
  await p.waitForTimeout(1100);
  registrar('biblioteca › ' + cat, antes, await snap(), (await card.innerText().catch(() => '')).slice(0, 40));
}

/* ---------- 3. BarraPro: botões rápidos (cada um deve aplicar) ---------- */
const proBtns = await p.locator('.bp-btn, .barra-pro button').count();
rel.push({ nome: 'BarraPro encontrada', mudou: proBtns > 0, extra: `${proBtns} botões` });
for (let i = 0; i < Math.min(proBtns, 12); i += 1) {
  const btn = p.locator('.bp-btn, .barra-pro button').nth(i);
  const rotulo = (await btn.innerText().catch(() => '')).trim().slice(0, 26);
  const antes = await snap();
  await btn.click({ force: true }).catch(() => {});
  await p.waitForTimeout(650);
  registrar('pro › ' + (rotulo || `#${i}`), antes, await snap());
}

/* ---------- 4. inspetor: cor, opacidade, filtro ---------- */
await p.evaluate(() => {
  const st = (window).__vortexStore?.getState?.();
  const el = st?.doc?.elements?.[0];
  if (el) st.select(el.id);
});
await p.waitForTimeout(400);
const antesInsp = await snap();
const sliders = await p.locator('.inspector input[type=range]').count();
if (sliders) {
  await p.locator('.inspector input[type=range]').first().evaluate((el) => {
    const inp = el;
    inp.value = String(Number(inp.max) * 0.5);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await p.waitForTimeout(500);
}
registrar('inspetor › ajuste numérico', antesInsp, await snap(), `${sliders} sliders`);

/* ---------- 5. reprodução + playhead ---------- */
const antesPlay = await p.evaluate(() => (window).__vortexStore.getState().playhead);
await p.keyboard.press('Space');
await p.waitForTimeout(1200);
const depoisPlay = await p.evaluate(() => (window).__vortexStore.getState().playhead);
await p.keyboard.press('Space');
rel.push({ nome: 'play avança o playhead', mudou: depoisPlay > antesPlay, extra: `${Math.round(antesPlay)}→${Math.round(depoisPlay)}` });

/* ---------- 6. desfazer/refazer ---------- */
const antesUndo = await snap();
await p.keyboard.press('Control+z');
await p.waitForTimeout(500);
const depoisUndo = await snap();
await p.keyboard.press('Control+Shift+z');
await p.waitForTimeout(500);
registrar('desfazer/refazer', antesUndo, await snap(), JSON.stringify(depoisUndo) !== JSON.stringify(antesUndo) ? 'undo mudou' : 'undo inerte');

/* ---------- 7. modais abrem e fecham ---------- */
for (const m of ['Legenda', 'IA', 'Conteúdo', 'Atalhos']) {
  const antes = await p.locator('.modal').count();
  await p.locator(`.topbar button:has-text("${m}")`).first().click().catch(() => {});
  await p.waitForTimeout(600);
  const aberto = (await p.locator('.modal').count()) > antes;
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  rel.push({ nome: 'modal › ' + m, mudou: aberto });
}

/* ---------- resultado ---------- */
const falhas = rel.filter((r) => !r.mudou);
console.log('\n=== RELATÓRIO ===');
for (const r of rel) console.log(`${r.mudou ? '✓' : '✗'} ${r.nome}${r.extra ? ' · ' + r.extra : ''}`);
console.log(`\n${rel.length - falhas.length}/${rel.length} passaram · ${errs.length} erro(s) de JS`);
if (errs.length) console.log([...new Set(errs)].slice(0, 10).join('\n'));
await b.close();
process.exit(falhas.length ? 1 : 0);
