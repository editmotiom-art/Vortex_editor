/** diagnóstico focado: por que alguns itens não mudam o documento */
import { chromium } from 'playwright';
const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', (e) => console.log('ERRO JS:', e.message.slice(0, 140)));

await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'DIAG');
await p.fill('input[type=email]', `d${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1600);

const doc = () =>
  p.evaluate(() => {
    const d = window.__vortexDoc();
    return {
      n: d.elements.length,
      sel: window.__vortexStore.getState().selection,
      els: d.elements.map((e) => ({
        id: e.id, type: e.type, fx: (e.effects || []).map((f) => f.type),
        filtro: e.filter ?? null, blend: e.blendMode ?? null, op: e.opacity ?? null,
        kf: e.keyframes ? Object.keys(e.keyframes) : [],
      })),
    };
  });

console.log('estado inicial:', JSON.stringify(await doc()));

/* 1. + Forma (botão do topo) */
const btnForma = p.locator('.topbar button:has-text("+ Forma")');
console.log('botões + Forma:', await btnForma.count());
await btnForma.first().click().catch((e) => console.log('clique forma falhou', e.message.slice(0, 80)));
await p.waitForTimeout(600);
console.log('após + Forma:', JSON.stringify(await doc()));

/* 2. Looks e Transições aplicados sobre o clipe selecionado */
await p.evaluate(() => {
  const st = window.__vortexStore.getState();
  st.select([st.doc.elements[0].id]);
});
for (const cat of ['Looks', 'Transições', 'Overlays']) {
  await p.locator('.sidebar .tab:has-text("Biblioteca")').first().click().catch(() => {});
  await p.locator(`.cat-chips .chip:has-text("${cat}")`).first().click();
  await p.waitForTimeout(300);
  const card = p.locator('.lib-card').first();
  const nome = (await card.innerText()).split('\n')[1];
  await card.click();
  await p.waitForTimeout(900);
  const t = await p.locator('.toast').last().innerText().catch(() => '(sem toast)');
  console.log(`[${cat}] clicou "${nome}" → toast: ${t}`);
  console.log('   doc:', JSON.stringify(await doc()));
}

/* 3. barra pro com clipe selecionado */
for (const nome of ['Transição', 'Cinema', 'Câmera', 'Keyframe', 'Separar áudio']) {
  await p.evaluate(() => {
    const st = window.__vortexStore.getState();
    st.select([st.doc.elements[0].id]);
  });
  await p.locator(`.bp-btn:has-text("${nome}")`).first().click({ force: true }).catch((e) => console.log('  clique falhou', nome, e.message.slice(0, 60)));
  await p.waitForTimeout(800);
  const t = await p.locator('.toast').last().innerText().catch(() => '(sem toast)');
  const d = await doc();
  console.log(`[pro ${nome}] toast: ${t} · elementos: ${d.n} · fx: ${JSON.stringify(d.els.map((e) => e.fx))} · kf: ${JSON.stringify(d.els.map((e) => e.kf))}`);
}

/* 4. inspetor */
console.log('inspetor presente:', await p.locator('.inspector').count(), '· sliders:', await p.locator('.inspector input[type=range]').count());
console.log('inspetor inputs:', await p.locator('.inspector input').count());
console.log('html inspetor:', (await p.locator('.inspector').innerHTML().catch(() => '')).slice(0, 300));

/* 5. modais do topo */
for (const m of ['IA', 'Conteúdo', 'Atalhos']) {
  const sel = `.topbar button:has-text("${m}")`;
  console.log(`[modal ${m}] existe: ${await p.locator(sel).count()}`);
  await p.locator(sel).first().click({ force: true }).catch((e) => console.log('  falhou', e.message.slice(0, 60)));
  await p.waitForTimeout(700);
  console.log(`   modais abertos: ${await p.locator('.modal').count()} · overlay: ${await p.locator('.overlay').count()}`);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
}
await b.close();
