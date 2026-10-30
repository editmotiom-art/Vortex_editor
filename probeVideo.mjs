import { chromium, devices } from 'playwright';
const b = await chromium.launch({ channel: 'chromium' });
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
await p.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
const v = p.locator('.lp-video video').first();
await v.scrollIntoViewIfNeeded();
const box = await v.boundingBox();
console.log('video no celular:', JSON.stringify({ w: Math.round(box.width), h: Math.round(box.height) }));
console.log('carregou:', JSON.stringify(await p.evaluate(() => {
  const el = document.querySelector('.lp-video video');
  return { src: el.currentSrc.split('/').pop(), dur: Number(el.duration.toFixed(1)), ready: el.readyState };
})));
await p.screenshot({ path: 'docs/prova/31-video-celular.png' });
console.log('botões < 36px:', await p.evaluate(() =>
  [...document.querySelectorAll('.landing button, .landing a.btn')].filter((x) => x.offsetParent && x.getBoundingClientRect().height < 36).length));
await p.evaluate(() => document.querySelector('.lp-video video').play()).catch((e) => console.log('play:', e.message.slice(0, 60)));
await p.waitForTimeout(1600);
console.log('tocando:', JSON.stringify(await p.evaluate(() => {
  const el = document.querySelector('.lp-video video');
  return { paused: el.paused, t: Number(el.currentTime.toFixed(1)) };
})));
await b.close();
