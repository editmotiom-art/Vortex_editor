import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(300);
await p.fill('input[placeholder="Como quer ser chamado"]', 'Baixa Tudo Teste');
await p.fill('input[type=email]', `bt${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1500);
await p.click('.topbar button:has-text("Baixa Tudo")');
await p.waitForSelector('.baixa-tudo');
// teste real com Vimeo (link curto e público)
await p.fill('.bt-input', 'https://www.youtube.com/watch?v=jNQXAC9IVRw');
await p.click('.baixa-tudo .chip:has-text("480p")').catch(()=>{});
await p.click('.baixa-tudo button:has-text("Baixar")');
let toast = '';
for (let i = 0; i < 120; i++) {
  await p.waitForTimeout(700);
  const t = await p.locator('.toast').last().innerText().catch(()=> '');
  if (t && t !== toast) { toast = t; if (/baixado|Baixa Tudo|timeline|erro|demorou/i.test(t)) break; }
}
console.log('toast:', toast);
const doc = await p.evaluate(() => window.__vortexDoc());
console.log('elementos:', doc.elements.length, doc.elements.map(e=>e.type+' '+e.name).join(' | '));
console.log('errs:', errs.slice(0,4));
await p.screenshot({ path: '/home/user/vortex/docs/screenshot-baixa-tudo.png' });
await b.close();
