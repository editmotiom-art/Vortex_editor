/** reta final em produção: tudo que o dono pediu */
import { chromium } from 'playwright';
const BASE='https://vortex-editor.netlify.app';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
const r=[];

// 1. landing: vídeo e seções
await p.goto(BASE,{waitUntil:'networkidle'});
const vids=p.locator('.lp-player video');
await p.waitForTimeout(2500);
const dur=await vids.first().evaluate(v=>v.duration).catch(()=>0);
r.push({nome:'vídeo-demo na página de vendas', ok: dur>60, extra:`${Math.round(dur)}s`});
r.push({nome:'landing rola', ok: await p.evaluate(async()=>{window.scrollTo(0,2500);await new Promise(x=>setTimeout(x,300));return window.scrollY>1200;})});

// 2. celular
const cel=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const pc=await cel.newPage(); const errsCel=[]; pc.on('pageerror',e=>errsCel.push(e.message.slice(0,100)));
await pc.goto(BASE,{waitUntil:'networkidle'});
const rolaCel=await pc.evaluate(async()=>{window.scrollTo(0,2000);await new Promise(x=>setTimeout(x,300));return window.scrollY>900;});
const overflow=await pc.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
const videoCel=await pc.locator('.lp-player video').first().evaluate(v=>v.duration).catch(()=>0);
r.push({nome:'celular: rola + vídeo + sem estouro', ok: rolaCel && overflow<=1 && videoCel>60, extra:`overflow ${overflow}px · vídeo ${Math.round(videoCel)}s · erros ${errsCel.length}`});
await cel.close();

// 3. editor: pix padrão já vem preenchido (navegador limpo)
await p.click('.lp-nav-acoes button:has-text("Abrir editor")');
await p.waitForTimeout(400);
await p.fill('input[placeholder="Como quer ser chamado"]','VERIF FINAL');
await p.fill('input[type=email]',`vf${Date.now()}@v.dev`);
await p.fill('input[type=password]','vortex2026');
await p.click('button:has-text("Criar conta e abrir o editor")');
await p.waitForTimeout(1700);
await p.evaluate(()=>window.__vortexUI.getState().openModal('checkout'));
await p.waitForTimeout(800);
await p.locator('.modal button:has-text("Continuar com")').first().click({force:true});
await p.waitForTimeout(700);
const campos=p.locator('.modal input');
await campos.nth(0).fill('Cliente Final'); await campos.nth(1).fill('final@teste.dev');
if(await campos.count()>2) await campos.nth(2).fill('12345678900');
await p.locator('.modal button:has-text("Ir para pagamento")').click({force:true});
await p.waitForTimeout(700);
const pixBtn=p.locator('.modal button:has-text("PIX")').first(); if(await pixBtn.count()) await pixBtn.click({force:true});
await p.waitForTimeout(300);
await p.locator('.modal button:has-text("Pagar")').last().click({force:true});
await p.waitForTimeout(2500);
const qr=await p.locator('.qr-pix').count();
const sessao=await p.evaluate(()=>JSON.parse(localStorage.getItem('vortex.sessao.v1')??'{}'));
r.push({nome:'checkout: QR do Pix sem configurar nada', ok: qr>0, extra: qr?'QR gerado':'sem QR'});
r.push({nome:'checkout: plano só depois do pagamento', ok: sessao.plano==='free', extra:`plano=${sessao.plano}`});
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
await p.evaluate(()=>window.__vortexUI.getState().closeModal());

// 4. ferramentas: texto, forma, biblioteca
const antes=await p.evaluate(()=>window.__vortexDoc().elements.length);
await p.locator('.topbar button:has-text("+ Texto")').first().click(); await p.waitForTimeout(400);
await p.locator('.topbar button:has-text("+ Forma")').first().click(); await p.waitForTimeout(400);
await p.locator('.sidebar .tab:has-text("Biblioteca")').first().click();
await p.locator('.cat-chips .chip:has-text("Looks")').first().click(); await p.waitForTimeout(300);
await p.locator('.lib-card').first().click(); await p.waitForTimeout(800);
const depois=await p.evaluate(()=>window.__vortexDoc());
r.push({nome:'ferramentas: texto, forma e look aplicam', ok: depois.elements.length>=antes+2 && depois.elements.some(e=>e.effects.length>0), extra:`${antes}→${depois.elements.length} · fx ${depois.elements.filter(e=>e.effects.length).length}`});

// 5. chat + transcrição (rápidos)
await p.locator('.topbar button:has-text("IA")').first().click(); await p.waitForTimeout(900);
r.push({nome:'chat de skills abre', ok: (await p.locator('.cc-skill').count())>=12});
// fecha o chat (que abriu por cima) antes de abrir o painel de legenda
await p.locator('.overlay .modal-head button').last().click({force:true}).catch(()=>{});
await p.waitForTimeout(500);
await p.locator('.topbar button:has-text("Legenda")').first().click({force:true}).catch(()=>{});
await p.waitForTimeout(900);
r.push({nome:'painel de legenda abre', ok: (await p.locator('.tr-painel').count())>0});
r.push({nome:'legenda: escolhe áudio do projeto e idioma', ok: (await p.locator('.tr-select').count())>=2});

console.log('\n=== PRODUÇÃO ===');
for(const x of r) console.log(`${x.ok?'✓':'✗'} ${x.nome}${x.extra?' · '+x.extra:''}`);
console.log(`\n${r.filter(x=>x.ok).length}/${r.length} ok · ${errs.length} erro(s) de JS`);
if(errs.length) console.log([...new Set(errs)].join('\n'));
await b.close();
