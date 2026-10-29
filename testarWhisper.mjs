/** testa o Whisper no navegador isoladamente, mostrando a rede */
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8888';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERRO JS:', e.message.slice(0, 160)));
p.on('response', (r) => {
  const u = r.url();
  if (/huggingface|jsdelivr|onnx|wasm|model/i.test(u) && r.status() >= 400) {
    console.log('HTTP', r.status(), u.slice(0, 120));
  }
});
p.on('requestfailed', (r) => {
  const u = r.url();
  if (/huggingface|jsdelivr|wasm|onnx/i.test(u)) console.log('FALHOU', u.slice(0, 110), r.failure()?.errorText);
});

await p.goto(BASE, { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'WHISPER');
await p.fill('input[type=email]', `wh${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1600);
await p.click('.topbar button:has-text("Legenda")');
await p.waitForTimeout(800);

const { readFileSync } = await import('node:fs');
await p.locator('.tr-painel input[type=file]').setInputFiles({
  name: 'fala.mp3',
  mimeType: 'audio/mpeg',
  buffer: readFileSync('/home/user/video/narra2/n03.mp3'),
});
await p.waitForTimeout(1000);
await p.click('.tr-painel button:has-text("Transcrever")');

for (let i = 0; i < 180; i += 1) {
  await p.waitForTimeout(1000);
  const est = await p.locator('.tr-progresso span').innerText().catch(() => '');
  if (i % 5 === 0) console.log(`[${i}s]`, est.slice(0, 110));
  if (/Erro/.test(est)) break;
  if ((await p.locator('.tr-frases li').count()) > 0) {
    const frases = await p.locator('.tr-frases li').allInnerTexts();
    console.log('\nTRANSCRIÇÃO OK:', frases.join(' | '));
    break;
  }
}
await b.close();
