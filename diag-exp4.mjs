import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 810 } });
const p = await ctx.newPage();
const logs = []; p.on('console', m => logs.push(m.type()+': '+m.text().slice(0,150)));
p.on('pageerror', e => logs.push('pageerror: '+e.message.slice(0,150)));
await p.goto('http://127.0.0.1:8888', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")'); await p.waitForTimeout(300);
await p.fill('input[placeholder="Como quer ser chamado"]', 'D4');
await p.fill('input[type=email]', `d4${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")'); await p.waitForTimeout(1400);
// baixa do youtube (mesma coisa da gravação)
await p.click('.topbar button:has-text("Baixa Tudo")'); await p.waitForTimeout(600);
await p.locator('.bt-input').fill('https://www.youtube.com/watch?v=jNQXAC9IVRw');
await p.click('.baixa-tudo .chip:has-text("480p")');
await p.click('.baixa-tudo button:has-text("Baixar")');
for (let i=0;i<60;i++){ await p.waitForTimeout(1000); const t = await p.locator('.toast').last().innerText({timeout:300}).catch(()=>''); if (/baixado/.test(t)) { console.log('baixa tudo ok em', i, 's'); break; } }
await p.keyboard.press('Escape');
const d = await p.evaluate(() => window.__vortexDoc());
console.log('doc:', d.elements.map(e=>e.type+'@'+e.start+'+'+e.duration).join(' '));
console.log('assets:', await p.evaluate(() => window.__vortexAssets.map(a=>a.kind+':'+a.name.slice(0,20)+':'+a.url.slice(0,22))));
await p.click('.topbar button:has-text("Exportar")'); await p.waitForTimeout(600);
await p.selectOption('.modal select >> nth=0', 'preview');
await p.click('.modal button:has-text("Exportar vídeo")');
for (let i = 0; i < 30; i++) {
  await p.waitForTimeout(2000);
  const prog = await p.evaluate(() => document.querySelector('.modal .progress + div')?.textContent ?? '');
  const tem = await p.locator('.exp-previa video').count();
  if (i % 3 === 0) console.log(` [${i*2}s]`, prog, tem?'PRÉVIA ✓':'');
  if (tem) { console.log('OK exportou em', i*2, 's'); break; }
}
console.log('logs:', logs.slice(0,6));
await b.close();
