/** diagnóstico: barra PRO, inspetor e modal Conteúdo com seleção correta */
import { chromium } from 'playwright';
const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', (e) => console.log('ERRO JS:', e.message.slice(0, 140)));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'PRO');
await p.fill('input[type=email]', `pr${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1600);

// cria texto + seleciona de verdade (array)
await p.locator('.topbar button:has-text("+ Texto")').first().click();
await p.waitForTimeout(500);
await p.evaluate(() => { const st = window.__vortexStore.getState(); st.select([st.doc.elements[st.doc.elements.length-1].id]); });
await p.waitForTimeout(400);
const info = () => p.evaluate(() => {
  const st = window.__vortexStore.getState();
  const e = st.doc.elements[0];
  return { n: st.doc.elements.length, sel: st.selection.length, fx: (e.effects||[]).map(f=>f.type), kf: e.transform.scale.keyframes.length, op: e.transform.opacity.base, sc: e.transform.scale.base };
});
console.log('depois do texto:', JSON.stringify(await info()));

for (const nome of ['Transição','Cinema','Câmera','Keyframe','Congelar','Separar áudio','Foco suave']) {
  await p.evaluate(() => { const st = window.__vortexStore.getState(); st.select([st.doc.elements[0].id]); });
  await p.locator(`.bp-btn:has-text("${nome}")`).first().click({ force: true }).catch((e)=>console.log('  clique falhou', e.message.slice(0,50)));
  await p.waitForTimeout(700);
  const t = await p.locator('.toast').last().innerText().catch(()=>'(sem toast)');
  console.log(`[${nome}] "${t}"`, JSON.stringify(await info()));
}

// inspetor com seleção
console.log('inspetor sliders:', await p.locator('.inspector input[type=range]').count(), '· inputs:', await p.locator('.inspector input').count(), '· sec-heads:', await p.locator('.inspector .sec-head').count());
const heads = await p.locator('.inspector .sec-head').allInnerTexts();
console.log('seções:', heads.join(' | '));
// muda opacidade pelo slider
const sl = p.locator('.inspector input[type=range]').first();
if (await sl.count()) {
  await sl.evaluate((el) => { el.value = '35'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); });
  await p.waitForTimeout(400);
  console.log('após slider:', JSON.stringify(await info()));
}

// modal Conteúdo
const btn = p.locator('.topbar button:has-text("Conteúdo")');
console.log('Conteúdo existe:', await btn.count());
await btn.first().click({ force: true });
await p.waitForTimeout(900);
console.log('overlays:', await p.locator('.overlay').count(), '· modais:', await p.locator('.modal').count());
console.log('modal classes:', await p.locator('.overlay > *').evaluateAll((els)=>els.map(e=>e.className).slice(0,3)));
await p.keyboard.press('Escape');
await b.close();
