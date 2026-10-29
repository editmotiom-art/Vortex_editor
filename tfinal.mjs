import { chromium, devices } from 'playwright';
const U='http://127.0.0.1:8888/';
const b = await chromium.launch();
const R={};
const entrar = async (p,nome)=>{
  await p.goto(U,{waitUntil:'networkidle',timeout:60000});
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(600);
  await p.locator('input[autocomplete=name]').fill(nome);
  await p.locator('input[type=email]').fill(nome.toLowerCase().replace(/\s/g,'')+Date.now()+'@t.com');
  await p.locator('input[type=password]').fill('senha123');
  await p.locator('button[type=submit]').click(); await p.waitForTimeout(2300);
};
// A) painel do cliente + sair
{
  const p = await b.newPage({viewport:{width:1400,height:950}}); const e=[]; p.on('pageerror',x=>e.push(x.message));
  await entrar(p,'Cliente Painel');
  await p.locator('.topbar button', {hasText:'FREE'}).click({timeout:15000}); await p.waitForTimeout(700);
  const abas = await p.locator('.pc-tab').allTextContents();
  await p.locator('.pc-tab',{hasText:'Plano'}).click(); await p.waitForTimeout(400);
  const planos = await p.locator('.pc-plano-nome').allTextContents();
  await p.locator('.pc-tab',{hasText:'Dados'}).click(); await p.waitForTimeout(300);
  const formSenha = await p.locator('.pc-form input[type=password]').count();
  await p.screenshot({path:'docs/screenshot-cliente-painel.png'});
  await p.locator('.pc-acoes .btn.danger').click(); await p.waitForTimeout(1200);
  const voltouLogin = (await p.locator('input[autocomplete=name]').count())>0;
  R.cliente = { abas, planos, formSenha, saiuParaLogin: voltouLogin, errs:e.slice(0,2) };
  await p.close();
}
// B) mídia em massa: subir 3 arquivos + tudo na timeline + limpar
{
  const p = await b.newPage({viewport:{width:1400,height:950}}); const e=[]; p.on('pageerror',x=>e.push(x.message));
  await entrar(p,'Midia Massa');
  const buf = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6300010000050001','hex');
  await p.locator('.topbar input[type=file]').setInputFiles([
    {name:'a.png', mimeType:'image/png', buffer:buf},
    {name:'b.png', mimeType:'image/png', buffer:buf},
    {name:'c.png', mimeType:'image/png', buffer:buf},
  ]);
  await p.waitForTimeout(1500);
  await p.locator('.tab',{hasText:'Mídia'}).click(); await p.waitForTimeout(500);
  const naMidia = await p.locator('.media-item').count();
  await p.locator('.btn',{hasText:'Tudo na timeline'}).click(); await p.waitForTimeout(1200);
  const clipes = await p.locator('.clip').count();
  // seleção múltipla
  await p.locator('.clip').nth(0).click();
  await p.keyboard.down('Shift'); await p.locator('.clip').nth(2).click(); await p.keyboard.up('Shift');
  await p.waitForTimeout(500);
  const painelMulti = await p.locator('.inspector').innerText().catch(()=>'');
  await p.screenshot({path:'docs/screenshot-massa.png'});
  R.massa = { naMidia, clipes, multiSelecao: /selecionados/.test(painelMulti), errs:e.slice(0,2) };
  await p.close();
}
// C) admin: novas abas + sair
{
  const p = await b.newPage({viewport:{width:1400,height:950}}); const e=[]; p.on('pageerror',x=>e.push(x.message));
  await p.goto(U+'#admin',{waitUntil:'networkidle'});
  await p.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(800);
  await p.locator('input[type=text], input[autocomplete=username]').first().fill('admin');
  await p.locator('input[type=password]').fill('vortex2026');
  await p.locator('button[type=submit], .btn.primary').first().click(); await p.waitForTimeout(1500);
  const abas = await p.locator('aside button').allTextContents();
  await p.locator('aside button',{hasText:'App e marca'}).click(); await p.waitForTimeout(500);
  const marcaOk = (await p.locator('main').innerText()).includes('Cor principal');
  await p.locator('aside button',{hasText:'Acervo e mídia'}).click(); await p.waitForTimeout(500);
  const acervoOk = (await p.locator('main').innerText()).includes('Varrer o Drive');
  await p.locator('aside button',{hasText:'Sair do painel'}).click(); await p.waitForTimeout(900);
  const voltouLogin = (await p.locator('input[type=password]').count())>0;
  R.admin = { abas: abas.filter(a=>a.length<30), marcaOk, acervoOk, saiuParaLogin: voltouLogin, errs:e.slice(0,2) };
  await p.close();
}
// D) celular retrato: editor utilizável + gavetas
{
  const ctx = await b.newContext({...devices['iPhone 13']});
  const p = await ctx.newPage(); const e=[]; p.on('pageerror',x=>e.push(x.message));
  await entrar(p,'Mobile Retrato');
  await p.locator('.dock-btn').nth(0).click(); await p.waitForTimeout(600);
  const gavetaLarga = await p.evaluate(()=>document.querySelector('.sidebar')?.getBoundingClientRect().width ?? 0);
  const cards = await p.locator('.lib-card').count();
  await p.locator('.lib-card').first().click(); await p.waitForTimeout(900);
  const clips = await p.locator('.clip').count();
  await p.screenshot({path:'docs/screenshot-mobile-retrato.png'});
  R.mobileRetrato = { gavetaLargura: Math.round(gavetaLarga), tela: 390, cards, clips, errs:e.slice(0,2) };
  await ctx.close();
}
console.log(JSON.stringify(R,null,1));
await b.close();
