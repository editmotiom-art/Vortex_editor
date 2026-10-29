/** export de imagem depois de importar foto (o caso que saía preto) */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', e => console.log('ERRO:', e.message.slice(0,120)));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]','FRAME');
await p.fill('input[type=email]',`fr${Date.now()}@v.dev`);
await p.fill('input[type=password]','vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1700);
await p.setInputFiles('input[type=file][accept*="image"]', {
  name: 'imagem-baixada.jpg', mimeType: 'image/jpeg', buffer: readFileSync('/home/user/video/imagem-baixada.jpg'),
});
await p.waitForTimeout(2000);
// exporta o frame imediatamente (sem dar tempo de carregar)
await p.evaluate(() => window.__vortexUI.getState().openModal('export'));
await p.waitForTimeout(600);
await p.locator('.modal button:has-text("Frame PNG")').first().click({ force: true });
await p.waitForSelector('.exp-previa img', { timeout: 30000 });
const b64 = await p.evaluate(async () => {
  const el = document.querySelector('.exp-previa img');
  const blob = await fetch(el.getAttribute('src')).then(r => r.blob());
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i=0;i<buf.length;i+=8192) s += String.fromCharCode.apply(null, Array.from(buf.subarray(i,i+8192)));
  return btoa(s);
});
const buf = Buffer.from(b64,'base64');
writeFileSync('/home/user/video/frame-teste.png', buf);
console.log('PNG bytes:', buf.length);
await b.close();
