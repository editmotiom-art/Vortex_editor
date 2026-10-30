/** prova real: baixar arquivos do Drive pela ferramenta única */
import { chromium } from 'playwright';
const BASE = process.argv[2] ?? 'http://localhost:3001';
const K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZnVlYWxobW55bGxycWhvbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3NTMsImV4cCI6MjEwODc3ODc1M30.-clD1uKofTBHIM_-YeF2BKTbPJL_Y-_mKLGhCOyEtcM';
const rpc=async(n,a)=>{const r=await fetch('https://pufuealhmnyllrqholye.supabase.co/rest/v1/rpc/'+n,{method:'POST',headers:{apikey:K,authorization:'Bearer '+K,'content-type':'application/json'},body:JSON.stringify(a)});return await r.json();};
const c = await rpc('vortex_criar_conta',{p_nome:'Cliente Drive',p_email:'drive.'+Date.now()+'@vortex.dev',p_senha:'senha123'});
const b = await chromium.launch({ channel: 'chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript((t) => localStorage.setItem('vortex.token.v1', t), c.token);
const p = await ctx.newPage();
const erros=[]; p.on('pageerror', e=>erros.push(e.message));
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3500);
await p.locator('button:has-text("Baixar conteúdo")').first().click();
await p.waitForTimeout(1200);
await p.fill('.bt-input', 'https://drive.google.com/drive/folders/1bBjUwqm7fxEqrkIEd1nrHRD3JLuHKQlT'); // Still Textures
console.log('fonte detectada:', (await p.locator('.baixar-conteudo').innerText()).match(/Reconhecido como: (.+)/)?.[1]);
await p.locator('button:has-text("Analisar link")').click();
await p.waitForTimeout(20000);
const itens = await p.locator('.bc-item').count();
const nomes = await p.locator('.bc-item .bc-nome').allInnerTexts().catch(()=>[]);
console.log(`itens do Drive: ${itens}`);
console.log('primeiros:', nomes.slice(0,5).join(' | ').slice(0, 200));
await p.screenshot({ path: 'docs/prova/plano/drive-lista.png' });
if (itens > 0) {
  // deixa só 1 selecionado (arquivo pequeno de imagem) para o teste ser rápido
  await p.locator('.bc-item input[type=checkbox]').first().click({ force: true }).catch(()=>{});
  await p.waitForTimeout(300);
  await p.locator('.baixar-conteudo button.btn.primary:has-text("⬇ Baixar")').click();
  await p.waitForTimeout(45000);
  const clipes = await p.locator('.clip').count();
  const estados = await p.locator('.bc-estado').allInnerTexts();
  console.log(`clipes na régua: ${clipes} · estados: ${estados.join(',')}`);
  await p.screenshot({ path: 'docs/prova/plano/drive-baixado.png' });
}
console.log('erros JS:', erros.length ? erros.slice(0,2) : 'nenhum');
await b.close();
