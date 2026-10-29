/** valida: autoplay/importa→timeline, bandeja de soltar, landing, modo computador no celular */
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const resumo = {};

/* ---------- desktop ---------- */
{
  const ctx = await b.newContext({ viewport: { width: 1500, height: 950 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
  resumo.landingVisivel = await p.locator('.lp-hero').isVisible();
  await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
  await p.waitForTimeout(400);
  await p.fill('input[placeholder="Como quer ser chamado"]', 'T10');
  await p.fill('input[type=email]', `t10${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1500);

  // solta arquivo na bandeja (input do seletor universal)
  await p.locator('.bandeja input[type=file]').setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm');
  await p.waitForTimeout(2200);
  const doc = await p.evaluate(() => window.__vortexDoc());
  resumo.aposSoltar = { elementos: doc.elements.length, assets: await p.evaluate(() => window.__vortexAssets.length) };
  // play e amostra do canvas
  await p.keyboard.press('Space');
  await p.waitForTimeout(1200);
  resumo.canvasTocando = await p.evaluate(() => {
    const c = document.querySelector('.stage canvas');
    const o = document.createElement('canvas'); o.width = o.height = 60;
    o.getContext('2d').drawImage(c, 0, 0, 60, 60);
    const d = o.getContext('2d').getImageData(0, 0, 60, 60).data;
    let cor = 0; for (let i = 0; i < d.length; i += 4) if (d[i]+d[i+1]+d[i+2] > 24) cor++;
    return cor;
  });
  await p.keyboard.press('Space');
  await p.waitForTimeout(900);
  resumo.canvasPausado = await p.evaluate(() => {
    const c = document.querySelector('.stage canvas');
    const o = document.createElement('canvas'); o.width = o.height = 60;
    o.getContext('2d').drawImage(c, 0, 0, 60, 60);
    const d = o.getContext('2d').getImageData(0, 0, 60, 60).data;
    let cor = 0; for (let i = 0; i < d.length; i += 4) if (d[i]+d[i+1]+d[i+2] > 24) cor++;
    return cor;
  });
  await p.screenshot({ path: '/home/user/vortex/docs/screenshot-bandeja.png' });
  resumo.errsDesktop = errs.slice(0, 3);
  await ctx.close();
}

/* ---------- celular em modo computador (390px, sem flags mobile) ---------- */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8890', { waitUntil: 'networkidle' });
  await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
  await p.waitForTimeout(400);
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Cel');
  await p.fill('input[type=email]', `cel${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1600);
  resumo.celular = {
    overflowX: await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    gavetaSwitch: await p.locator('.gaveta-switch').isVisible(),
    bandeja: await p.locator('.bandeja').isVisible(),
  };
  // abre a gaveta de biblioteca e adiciona um template
  await p.click('.gaveta-switch button:has-text("Biblioteca")');
  await p.waitForTimeout(500);
  resumo.celular.sidebarAberta = await p.locator('.sidebar.mobile-open').isVisible().catch(() => false);
  await p.locator('.lib-card').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(600);
  resumo.celular.clipes = await p.evaluate(() => window.__vortexDoc().elements.length);
  await p.screenshot({ path: '/home/user/vortex/docs/screenshot-celular-modo-pc.png' });
  resumo.errsCelular = errs.slice(0, 3);
  await ctx.close();
}

console.log(JSON.stringify(resumo, null, 1));
await b.close();
