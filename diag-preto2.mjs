import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Preto');
  await p.fill('input[type=email]', `p${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1200);
}
const amostra = async (rotulo) => {
  const r = await p.evaluate(() => {
    const c = document.querySelector('.stage canvas');
    const off = document.createElement('canvas'); off.width = 80; off.height = 80;
    const x = off.getContext('2d'); x.drawImage(c, 0, 0, 80, 80);
    const d = x.getImageData(0,0,80,80).data; let cor = 0, soma = 0;
    for (let i=0;i<d.length;i+=4){const v=d[i]+d[i+1]+d[i+2]; soma+=v; if(v>24)cor++;}
    return { cor, media: Math.round(soma/(d.length/4)) };
  });
  console.log(rotulo, r);
};
await p.evaluate(() => window.__vortexTeste({ texto: false, audio: false }));
// estava tocando? para
await p.evaluate(() => { const s = document.querySelector('.transport'); });
await amostra('vídeo parado no tempo 0:');
// agora dá play e pausa
await p.click('.transport button:nth-child(2)').catch(()=>p.keyboard.press('Space'));
await p.waitForTimeout(1500);
await p.keyboard.press('Space');
await p.waitForTimeout(900);
await amostra('depois de pausar:');
// move o playhead pelo tempo (scrub) para 1s
const bar = await p.locator('.transport .scrub, .transport input[type=range], .seek').first();
console.log('scrub encontrado:', await bar.count());
await p.screenshot({ path: '/home/user/vortex/docs/diag-preto2.png' });
await b.close();
