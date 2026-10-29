/** verificação em produção: landing, editor, importar→timeline, play sem tela preta, celular */
import { chromium, devices } from 'playwright';
const BASE = 'https://vortex-editor.netlify.app';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const out = {};
{
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE, { waitUntil: 'networkidle' });
  out.landing = { hero: await p.locator('.lp-hero').isVisible(), planos: await p.locator('.lp-plano').count(), resp: await p.locator('.lp-resp-grid > div').count() };
  out.tema = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
  await p.waitForTimeout(500);
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Prod Final');
  await p.fill('input[type=email]', `pf${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1800);
  out.editor = { topbar: await p.locator('.topbar').count(), bandeja: await p.locator('.bandeja').count(), temaBtn: await p.locator('.theme-btn').count() };
  // importa um arquivo real via seletor da bandeja
  await p.locator('.bandeja input[type=file]').setInputFiles('/home/user/vortex/.cache/midia-preview/foto.jpg');
  await p.waitForTimeout(1800);
  const doc = await p.evaluate(() => window.__vortexDoc());
  out.importar = { elementos: doc.elements.length, tipos: doc.elements.map((e) => e.type) };
  await p.keyboard.press('Space');
  await p.waitForTimeout(1000);
  out.canvasTocando = await p.evaluate(() => {
    const c = document.querySelector('.stage canvas');
    const o = document.createElement('canvas'); o.width = o.height = 60;
    o.getContext('2d').drawImage(c, 0, 0, 60, 60);
    const d = o.getContext('2d').getImageData(0, 0, 60, 60).data;
    let cor = 0; for (let i = 0; i < d.length; i += 4) if (d[i]+d[i+1]+d[i+2] > 24) cor++;
    return cor;
  });
  await p.keyboard.press('Space');
  await p.waitForTimeout(700);
  out.canvasPausado = await p.evaluate(() => {
    const c = document.querySelector('.stage canvas');
    const o = document.createElement('canvas'); o.width = o.height = 60;
    o.getContext('2d').drawImage(c, 0, 0, 60, 60);
    const d = o.getContext('2d').getImageData(0, 0, 60, 60).data;
    let cor = 0; for (let i = 0; i < d.length; i += 4) if (d[i]+d[i+1]+d[i+2] > 24) cor++;
    return cor;
  });
  await p.screenshot({ path: '/home/user/vortex/docs/screenshot-prod-final.png' });
  out.errs = errs.slice(0, 3);
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'networkidle' });
  out.celular = { overflowLanding: await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) };
  await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
  await p.waitForTimeout(400);
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Cel Prod');
  await p.fill('input[type=email]', `cp${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1800);
  out.celular.overflowEditor = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  out.celular.gaveta = await p.locator('.gaveta-switch').isVisible();
  out.celular.bandeja = await p.locator('.bandeja').isVisible();
  await p.screenshot({ path: '/home/user/vortex/docs/screenshot-prod-celular.png' });
  await ctx.close();
}
console.log(JSON.stringify(out, null, 1));
await b.close();
