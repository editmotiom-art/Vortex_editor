import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const p = await ctx.newPage();
p.setDefaultTimeout(40000);
p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 200)); });
p.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)));
p.on('download', (d) => console.log('DOWNLOAD:', d.suggestedFilename()));
await p.goto('http://127.0.0.1:3001', { waitUntil: 'networkidle' });
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]', 'Alice');
await p.fill('input[type=email]', `e${Date.now()}@v.dev`);
await p.fill('input[type=password]', 'vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(2000);
// assina
await p.evaluate(() => {
  const contas = JSON.parse(localStorage.getItem('vortex.contas.v1') ?? '[]');
  if (contas[0]) { contas[0].plano = 'pro'; localStorage.setItem('vortex.contas.v1', JSON.stringify(contas)); }
  const s = JSON.parse(localStorage.getItem('vortex.sessao.v1') ?? '{}');
  localStorage.setItem('vortex.sessao.v1', JSON.stringify({ ...s, plano: 'pro' }));
});
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(2200);
await p.locator('.bandeja input[type=file]').first().setInputFiles('/home/user/vortex/.cache/midia-preview/clipe.webm');
await p.waitForTimeout(2500);
await p.locator('.topbar button:has-text("Exportar")').click();
await p.waitForTimeout(1200);
console.log('modal:', (await p.locator('.overlay').innerText()).slice(0, 200).replace(/\n/g, ' | '));
await p.screenshot({ path: '/tmp/exp1.png' });
const botao = p.locator('.overlay button:has-text("Exportar vídeo")').first();
console.log('botão existe:', await botao.count(), 'texto:', await botao.innerText().catch(() => ''));
await botao.click().catch((e) => console.log('clique falhou:', e.message.slice(0, 120)));
let pronto = false;
for (let i = 0; i < 40; i += 1) {
  await p.waitForTimeout(2500);
  const txt = await p.locator('.overlay').innerText().catch(() => '');
  if (/Baixar este arquivo/.test(txt)) { pronto = true; console.log(`pronto em ${(i + 1) * 2.5}s`); break; }
}
console.log('arquivo gerado:', pronto);
if (pronto) {
  const espera = p.waitForEvent('download', { timeout: 60000 }).catch(() => null);
  await p.locator('.overlay button:has-text("Baixar este arquivo")').click({ timeout: 10000 }).catch(() => {});
  const d = await espera;
  console.log('download:', d ? await d.suggestedFilename() : 'nenhum');
  if (d) await d.saveAs('/tmp/export-teste.mp4');
}
await p.screenshot({ path: '/tmp/exp2.png' });
await b.close();
