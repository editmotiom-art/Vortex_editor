/** tall8.mjs — verificação em produção (sem mídia local) */
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'https://vortex-editor.netlify.app';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
console.log('tema:', await p.evaluate(() => document.documentElement.getAttribute('data-theme')));
if (await p.locator('text=Criar sua conta').first().isVisible().catch(()=>false)) {
  await p.fill('input[placeholder="Como quer ser chamado"]', 'Prod');
  await p.fill('input[type=email]', `prod${Date.now()}@v.dev`);
  await p.fill('input[type=password]', 'vortex2026');
  await p.click('button:has-text("Criar conta e abrir o editor")');
  await p.waitForTimeout(1500);
}
// adiciona texto e um template da biblioteca
await p.locator('.lib-card, .lib-item, .card-item').first().click({ force: true }).catch(()=>{});
await p.waitForTimeout(600);
console.log('clipes:', await p.evaluate(() => window.__vortexDoc().elements.length));
console.log('botão IA:', await p.locator('.topbar button:has-text("✦ IA")').count());
console.log('tema btn:', await p.locator('.theme-btn').count());
console.log('alças de seleção:', await p.locator('.sel-layer').count(), await p.locator('.sel-handle').count());

// exporta frame PNG
await p.click('.topbar button:has-text("Exportar")');
await p.waitForSelector('.modal');
await p.click('.modal button:has-text("Frame PNG")');
await p.waitForSelector('.exp-previa img', { timeout: 60000 });
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.modal button:has-text("Baixar este arquivo")')]);
await dl.saveAs('/home/user/vortex/.cache/exports/prod-frame.png');
console.log('PNG prod:', fs.statSync('/home/user/vortex/.cache/exports/prod-frame.png').size, 'bytes');

// exporta vídeo (WebM)
await p.selectOption('.modal select >> nth=2', 'webm');
await p.click('.modal button:has-text("Exportar vídeo")');
await p.waitForSelector('.exp-previa video', { timeout: 120000 });
const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('.modal button:has-text("Baixar este arquivo")')]);
await dl2.saveAs('/home/user/vortex/.cache/exports/prod-video.webm');
console.log('WebM prod:', fs.statSync('/home/user/vortex/.cache/exports/prod-video.webm').size, 'bytes');
await p.screenshot({ path: '/home/user/vortex/docs/screenshot-prod-export.png' });
console.log('errs:', errs.slice(0,4));
await b.close();
