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
const classes = await p.evaluate(() => {
  const alvo = [...document.querySelectorAll('*')].find((e) => (e.textContent || '').trim().startsWith('Titulo Pop') && e.children.length <= 3);
  const pais = [];
  let el = alvo;
  while (el && pais.length < 4) { pais.push(el.tagName + '.' + (el.className || '').toString().replace(/\s+/g, '.')); el = el.parentElement; }
  return pais;
});
console.log('caminho do card:', classes);
await p.locator('text=Titulo Pop').first().click();
await p.waitForTimeout(1600);
const els = await p.evaluate(() => window.__vortexDoc?.().elements.map((e) => ({ type: e.type, name: e.name, start: e.start, dur: e.duration })));
console.log('elementos após template:', JSON.stringify(els));
await p.locator('text=Cinematic').first().click();
await p.waitForTimeout(1500);
const els2 = await p.evaluate(() => window.__vortexDoc?.().elements.filter((e) => e.type === 'audio').map((e) => ({ name: e.name, dur: e.duration })));
console.log('áudios após música:', JSON.stringify(els2));
await b.close();
