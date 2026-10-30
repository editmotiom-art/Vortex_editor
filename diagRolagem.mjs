/** Diagnóstico: por que a landing não rola no celular */
import { chromium, devices } from 'playwright';
const URL = process.argv[2] ?? 'https://vortex-editor-gwyd.vercel.app';
const b = await chromium.launch({ channel: 'chromium' });
for (const nome of ['iPhone 13', 'Pixel 7', 'iPhone SE']) {
  const dev = devices[nome] ?? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
  const p = await (await b.newContext({ ...dev })).newPage();
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const info = await p.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const html = getComputedStyle(document.documentElement);
    return {
      bodyOverflow: cs.overflow, bodyAltura: cs.height, htmlOverflow: html.overflow,
      scrollHeight: document.documentElement.scrollHeight, clientHeight: document.documentElement.clientHeight,
      bodyScroll: document.body.scrollHeight, pos: cs.position, touchAction: cs.touchAction,
    };
  });
  await p.evaluate(() => window.scrollBy(0, 800));
  await p.waitForTimeout(400);
  const depois = await p.evaluate(() => window.scrollY);
  console.log(nome, JSON.stringify(info), 'scrollY após rolar:', depois);
  await p.close();
}
await b.close();
