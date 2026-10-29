/** reproduz: importar arquivo pela UI → colocar na timeline → play → canvas preto? */
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => m.type()==='error' && errs.push(m.text()));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Black');
  await p.fill('input[type=email]', `b${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1400);
}
// 1) importa arquivo de verdade pelo botão Importar
const fileInput = p.locator('input[type=file]').first();
await fileInput.setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm');
await p.waitForTimeout(2500);
console.log('assets após importar:', await p.evaluate(() => window.__vortexAssets?.length ?? 'n/a'));
await p.screenshot({ path: '/home/user/vortex/docs/diag-import1.png' });
// 2) aba Mídia na sidebar
await p.click('.side-tabs button:has-text("Mídia"), button:has-text("Mídia")').catch(()=>{});
await p.waitForTimeout(400);
console.log('assets:', await p.evaluate(() => window.__vortexDoc().elements.length), 'elementos na timeline');
const mediaItem = p.locator('.media-item').first();
console.log('media item visível:', await mediaItem.isVisible().catch(()=>false));
if (await mediaItem.isVisible().catch(()=>false)) { await mediaItem.dblclick(); await p.waitForTimeout(1200); }
console.log('depois de duplo clique, elementos:', await p.evaluate(() => window.__vortexDoc().elements.length));
// 3) play e medir se o canvas tem cor
const amostra = async (rotulo) => {
  const r = await p.evaluate(async () => {
    const c = document.querySelector('.stage canvas') || document.querySelector('canvas');
    const off = document.createElement('canvas'); off.width = 60; off.height = 60;
    const x = off.getContext('2d'); x.drawImage(c, 0, 0, 60, 60);
    const d = x.getImageData(0, 0, 60, 60).data;
    let naoPreto = 0, soma = 0;
    for (let i = 0; i < d.length; i += 4) { const v = d[i]+d[i+1]+d[i+2]; soma += v; if (v > 24) naoPreto++; }
    return { pixelsComCor: naoPreto, total: d.length/4, media: Math.round(soma/(d.length/4)) };
  });
  console.log(rotulo, r);
  return r;
};
await amostra('parado:');
await p.click('.transport button:nth-child(2), button:has-text("▶")').catch(()=>{});
await p.keyboard.press('Space');
await p.waitForTimeout(1500);
await amostra('durante o play:');
console.log('playhead:', await p.evaluate(() => window.__vortexDoc && document.querySelector('.time-display')?.textContent));
console.log('errs:', errs.slice(0,6));
await p.screenshot({ path: '/home/user/vortex/docs/diag-tela-preta.png' });
await b.close();
