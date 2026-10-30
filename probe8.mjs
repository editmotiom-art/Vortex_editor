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
await p.waitForTimeout(2000);
await p.locator('.bandeja input[type=file]').first().setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm');
await p.waitForTimeout(3000);
const info = await p.evaluate(async () => {
  const d = window.__vortexDoc();
  const a = d.assets[0];
  const v = document.createElement('video');
  v.src = a.url; v.muted = true; v.preload = 'auto';
  document.body.appendChild(v);
  await new Promise((ok) => { v.onloadeddata = ok; setTimeout(ok, 5000); });
  return {
    asset: { kind: a.kind, url: (a.url || '').slice(0, 40) },
    meuVideo: { readyState: v.readyState, w: v.videoWidth, h: v.videoHeight, dur: v.duration },
    totalVideosNoDOM: document.querySelectorAll('video').length,
  };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
