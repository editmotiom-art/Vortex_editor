import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
p.setDefaultTimeout(60000);
await p.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'Alice');
await p.fill('input[type=email]', `p${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1800);
await p.locator('.bandeja input[type=file]').first().setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm');
await p.waitForTimeout(3000);
// toca 1,5 s e fotografa o palco
await p.locator('.topbar button[title*="play"], .transport button').first().click().catch(() => {});
await p.keyboard.press(' ');
await p.waitForTimeout(1600);
await p.locator('.canvas-shell').screenshot({ path: '/tmp/palco1.png' });
const px = await p.evaluate(() => {
  const c = document.querySelector('.canvas-shell canvas');
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let branco = 0, outros = 0;
  for (let i = 0; i < d.length; i += 4000) {
    if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) branco += 1; else outros += 1;
  }
  return { largura: c.width, altura: c.height, branco, outros };
});
console.log('pixels do canvas:', JSON.stringify(px));
const temVid = await p.evaluate(() => (window.__vortexDoc?.().elements ?? []).map((e) => ({ t: e.type, asset: e.assetId, start: e.start, dur: e.duration })));
console.log('elementos:', JSON.stringify(temVid));
await b.close();
