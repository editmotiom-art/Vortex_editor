import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 810 } });
const p = await ctx.newPage();
const logs = []; p.on('console', m => logs.push(m.type()+': '+m.text().slice(0,150)));
p.on('pageerror', e => logs.push('pageerror: '+e.message.slice(0,200)));
const cor = () => p.evaluate(() => {
  const c = document.querySelector('.stage canvas');
  const o = document.createElement('canvas'); o.width = o.height = 40;
  o.getContext('2d').drawImage(c, 0, 0, 40, 40);
  const d = o.getContext('2d').getImageData(0,0,40,40).data; let n=0;
  for (let i=0;i<d.length;i+=4) if (d[i]+d[i+1]+d[i+2] > 24) n++;
  return n;
});
await p.goto('http://127.0.0.1:8888', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")'); await p.waitForTimeout(300);
await p.fill('input[placeholder="Como quer ser chamado"]', 'D5');
await p.fill('input[type=email]', `d5${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")'); await p.waitForTimeout(1400);
const passo = async (nome, fn) => { await fn(); await p.waitForTimeout(1200); console.log(nome, 'cor:', await cor()); };
await passo('template', async () => { await p.click('.lib-card:has-text("Título Pop")'); });
await passo('clipe local', async () => { await p.locator('.bandeja input[type=file]').setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm'); });
await passo('musica', async () => { await p.locator('.bandeja input[type=file]').setInputFiles('/home/user/vortex/.cache/midia-preview/musica.mp3'); });
await passo('youtube', async () => {
  await p.click('.topbar button:has-text("Baixa Tudo")'); await p.waitForTimeout(500);
  await p.locator('.bt-input').fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
  await p.click('.baixa-tudo .chip:has-text("480p")');
  await p.click('.baixa-tudo button:has-text("Baixar")');
  for (let i=0;i<40;i++){ await p.waitForTimeout(1000); const t = await p.locator('.toast').last().innerText({timeout:300}).catch(()=>''); if (/baixado/.test(t)) break; }
  await p.keyboard.press('Escape');
});
await passo('sons woosh', async () => { await p.click('.cat-chips .chip:has-text("SFX")'); await p.waitForTimeout(300); await p.click('.lib-card:has-text("Whoosh")'); });
await passo('sons lofi', async () => { await p.click('.cat-chips .chip:has-text("Música")'); await p.waitForTimeout(300); await p.click('.lib-card:has-text("Lo-Fi")'); });
const d = await p.evaluate(() => window.__vortexDoc());
console.log('doc:', d.elements.map(e=>`${e.type}:${e.name.slice(0,14)}@${e.start}+${e.duration}`).join(' | '));
console.log('assets:', await p.evaluate(() => window.__vortexAssets.map(a=>a.kind+':'+a.url.slice(0,10))));
await p.screenshot({ path: '/home/user/vortex/docs/diag-exp5.png' });
// export
await p.click('.topbar button:has-text("Exportar")'); await p.waitForTimeout(600);
await p.selectOption('.modal select >> nth=0', 'preview');
await p.click('.modal button:has-text("Exportar vídeo")');
for (let i = 0; i < 40; i++) {
  await p.waitForTimeout(2000);
  const prog = await p.evaluate(() => document.querySelector('.modal .progress + div')?.textContent ?? '(sem barra)');
  const t = await p.locator('.toast').last().innerText({timeout:300}).catch(()=>'');
  const tem = await p.locator('.exp-previa video').count();
  console.log(` [${i*2}s]`, prog.slice(0,40), t.slice(0,60), tem?'PRÉVIA':'');
  if (tem || /Falha/.test(t)) break;
}
console.log('logs:', logs.slice(0,6));
await b.close();
