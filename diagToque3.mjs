/** Gesto de toque "realista" via CDP (synthesizeScrollGesture) + página de controle */
import { chromium, devices } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
const gesto = async () => {
  await cdp.send('Input.synthesizeScrollGesture', {
    x: 195, y: 500, yDistance: -500, gestureSourceType: 'touch', speed: 1000, repeatCount: 1,
  });
  await p.waitForTimeout(900);
};
for (const url of ['https://example.com', 'https://vortex-editor-gwyd.vercel.app', 'https://vortex-editor-gwyd.vercel.app/#planos']) {
  await p.goto(url, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const alt = await p.evaluate(() => document.documentElement.scrollHeight);
  await gesto();
  const y1 = await p.evaluate(() => window.scrollY);
  await gesto();
  const y2 = await p.evaluate(() => window.scrollY);
  console.log(url.replace('https://', ''), '| altura', alt, '| scrollY', y1, '→', y2);
}
await b.close();
