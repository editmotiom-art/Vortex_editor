import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 810 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0,140)));
p.on('console', m => m.type()==='error' && errs.push(m.text().slice(0,140)));
await p.goto('http://127.0.0.1:8888', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")'); await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'Diag Export');
await p.fill('input[type=email]', `de${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")'); await p.waitForTimeout(1500);
// monta: texto + clipe webm + musica + youtube
await p.click('.lib-card:has-text("Título Pop")'); await p.waitForTimeout(700);
await p.locator('.bandeja input[type=file]').setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm'); await p.waitForTimeout(1800);
console.log('canPlay H264:', await p.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"')));
// canvas com playhead 0.5s
await p.evaluate(() => window.__vortexStore.getState().setPlayhead(500));
await p.waitForTimeout(900);
const cor = async () => p.evaluate(() => {
  const c = document.querySelector('.stage canvas');
  const o = document.createElement('canvas'); o.width = o.height = 40;
  o.getContext('2d').drawImage(c, 0, 0, 40, 40);
  const d = o.getContext('2d').getImageData(0,0,40,40).data; let n=0;
  for (let i=0;i<d.length;i+=4) if (d[i]+d[i+1]+d[i+2] > 24) n++;
  return n;
});
console.log('canvas com texto+video no 0.5s:', await cor());
const doc = await p.evaluate(() => window.__vortexDoc());
console.log('elementos:', doc.elements.map(e => `${e.type}:${e.name.slice(0,22)}@${e.start}+${e.duration}`));
// exporta
await p.click('.topbar button:has-text("Exportar")'); await p.waitForTimeout(700);
await p.selectOption('.modal select >> nth=0', 'preview');
await p.click('.modal button:has-text("Exportar vídeo")');
for (let i = 0; i < 40; i++) {
  await p.waitForTimeout(2000);
  const t = await p.locator('.toast').last().innerText({timeout:300}).catch(()=>'');
  const prog = await p.locator('.modal .progress + div, .modal .export-row b').last().innerText({timeout:300}).catch(()=>'');
  const tem = await p.locator('.exp-previa video').count();
  if (t) console.log(`  [${i}] toast:`, t);
  if (tem) { console.log('  prévia apareceu no passo', i); break; }
}
console.log('errs:', errs.slice(0,6));
await p.screenshot({ path: '/home/user/vortex/docs/diag-exp2.png' });
await b.close();
