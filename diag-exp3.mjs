import { chromium } from 'playwright';
import fs from 'node:fs';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 810 }, acceptDownloads: true });
const p = await ctx.newPage();
const logs = []; p.on('console', m => logs.push(m.type()+': '+m.text().slice(0,120)));
p.on('pageerror', e => logs.push('pageerror: '+e.message.slice(0,120)));
await p.goto('http://127.0.0.1:8888', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")'); await p.waitForTimeout(300);
await p.fill('input[placeholder="Como quer ser chamado"]', 'D3');
await p.fill('input[type=email]', `d3${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")'); await p.waitForTimeout(1400);
// monta igual à gravação: template + clipe + musica + youtube + sons
await p.click('.lib-card:has-text("Título Pop")'); await p.waitForTimeout(600);
await p.locator('.bandeja input[type=file]').setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm'); await p.waitForTimeout(1500);
await p.locator('.bandeja input[type=file]').setInputFiles('/home/user/vortex/.cache/midia-preview/musica.mp3'); await p.waitForTimeout(1200);
await p.click('.cat-chips .chip:has-text("Música")'); await p.waitForTimeout(400);
await p.click('.lib-card:has-text("Lo-Fi")'); await p.waitForTimeout(1500);
console.log('doc:', (await p.evaluate(() => window.__vortexDoc())).elements.map(e=>e.type+'@'+e.start+'+'+e.duration).join(' '));
await p.click('.topbar button:has-text("Exportar")'); await p.waitForTimeout(600);
await p.selectOption('.modal select >> nth=0', 'preview');
await p.click('.modal button:has-text("Exportar vídeo")');
let apareceu = false;
for (let i = 0; i < 45; i++) {
  await p.waitForTimeout(2000);
  const prog = await p.evaluate(() => {
    const el = document.querySelector('.modal .progress + div');
    return el ? el.textContent : '';
  });
  const tem = await p.locator('.exp-previa video').count();
  if (i % 5 === 0) console.log(` [${i*2}s]`, prog, tem ? 'PRÉVIA ✓' : '');
  if (tem) { apareceu = true; break; }
}
console.log('apareceu:', apareceu);
console.log('logs:', logs.slice(0,8));
if (apareceu) {
  const [dl] = await Promise.all([p.waitForEvent('download', {timeout: 60000}), p.click('.modal button:has-text("Baixar este arquivo")')]);
  await dl.saveAs('/tmp/exp3.webm');
  console.log('baixado:', fs.statSync('/tmp/exp3.webm').size, 'bytes');
}
await b.close();
