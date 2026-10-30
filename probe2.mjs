import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 810 } });
const p = await ctx.newPage();
p.setDefaultTimeout(60000);
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERRO:', m.text().slice(0, 200)); });
p.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)));
await p.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'Probe');
await p.fill('input[type=email]', `p${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(2000);
await p.locator('.bandeja input[type=file]').first().setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm');
await p.waitForTimeout(3500);
const st = await p.evaluate(() => {
  const shell = document.querySelector('.canvas-shell');
  const videos = [...document.querySelectorAll('video')].map((v) => ({
    src: (v.src || '').slice(-40), ready: v.readyState, dur: v.duration, t: v.currentTime,
    w: v.videoWidth, h: v.videoHeight, paused: v.paused, display: getComputedStyle(v).display,
    opacity: getComputedStyle(v).opacity, vis: getComputedStyle(v).visibility,
  }));
  const canvas = document.querySelector('.canvas-shell canvas');
  return {
    shellHTML: (shell?.innerHTML ?? '').slice(0, 400),
    videos,
    temCanvas: Boolean(canvas),
    playhead: window.__vortexDoc?.()?.playhead ?? null,
    assets: window.__vortexAssets ? Object.keys(window.__vortexAssets).length : 'sem __vortexAssets',
  };
});
console.log(JSON.stringify(st, null, 1));
await b.close();
