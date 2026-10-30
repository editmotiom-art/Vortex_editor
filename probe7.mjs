import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
p.setDefaultTimeout(40000);
await p.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'Alice');
await p.fill('input[type=email]', `p${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(2200);
await p.locator('.bandeja input[type=file]').first().setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm');
await p.waitForTimeout(3000);
const cores = async (tag) => {
  const r = await p.evaluate(() => {
    const c = document.querySelector('.canvas-shell canvas');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let branco = 0, preto = 0, cor = 0;
    for (let i = 0; i < d.length; i += 4000) {
      const [r0, g0, b0] = [d[i], d[i + 1], d[i + 2]];
      if (r0 > 240 && g0 > 240 && b0 > 240) branco += 1;
      else if (r0 < 20 && g0 < 20 && b0 < 20) preto += 1;
      else cor += 1;
    }
    const v = document.querySelector('video');
    return {
      branco, preto, cor,
      video: v ? { readyState: v.readyState, seeking: v.seeking, t: v.currentTime, w: v.videoWidth, paused: v.paused } : 'sem <video>',
      playhead: window.__vortexDoc?.()?.playhead,
    };
  });
  console.log(tag, JSON.stringify(r));
};
await cores('logo após importar  ');
await p.keyboard.press(' ');
await p.waitForTimeout(2500);
await cores('tocando (play)     ');
await p.locator('.canvas-shell').screenshot({ path: '/tmp/palco_play.png' });
await p.screenshot({ path: '/tmp/tela_play.png' });
await p.keyboard.press(' ');
await p.waitForTimeout(800);
await cores('pausado             ');
await b.close();
