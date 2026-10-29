/** simula "Modo computador" no celular: largura de celular, sem flags mobile */
import { chromium } from 'playwright';
const b = await chromium.launch();
const UA = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: UA, isMobile: false, hasTouch: true, deviceScaleFactor: 3 });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
await p.waitForTimeout(600);
const medir = async (rotulo) => {
  const r = await p.evaluate(() => {
    const doc = document.documentElement;
    const fora = [...document.querySelectorAll('body *')].filter((el) => {
      const q = el.getBoundingClientRect();
      return q.width > 0 && (q.right > window.innerWidth + 2 || q.left < -2);
    }).slice(0, 8).map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`);
    return { scrollW: doc.scrollWidth, innerW: window.innerWidth, fora };
  });
  console.log(rotulo, r);
};
await medir('landing 390px:');
await p.screenshot({ path: '/home/user/vortex/docs/diag-modo-pc-landing.png' });
// entra no editor
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(500);
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Pc');
  await p.fill('input[type=email]', `pc${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1600);
}
await medir('editor 390px:');
const vistos = await p.evaluate(() => ({
  topbar: !!document.querySelector('.topbar'),
  exportarVisivel: !!document.querySelector('.topbar button:last-child'),
  inspetor: getComputedStyle(document.querySelector('.inspector')).display,
  sidebar: getComputedStyle(document.querySelector('.sidebar')).display,
  dock: !!document.querySelector('.dock'),
}));
console.log(vistos);
await p.screenshot({ path: '/home/user/vortex/docs/diag-modo-pc-editor.png' });
console.log('errs:', errs.slice(0,3));
await b.close();
