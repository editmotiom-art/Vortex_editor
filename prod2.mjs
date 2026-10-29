import { chromium, devices } from 'playwright';
const U='https://vortex-editor.netlify.app/';
const b = await chromium.launch();
const R={};
const entrar = async (p,nome)=>{
  await p.goto(U,{waitUntil:'networkidle',timeout:60000});
  await p.evaluate(()=>localStorage.clear());
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(700);
  await p.locator('input[autocomplete=name]').fill(nome);
  await p.locator('input[type=email]').fill(nome.toLowerCase().replace(/\s/g,'')+Date.now()+'@t.com');
  await p.locator('input[type=password]').fill('senha123');
  await p.locator('button[type=submit]').click(); await p.waitForTimeout(2500);
};
// desktop: biblioteca + seleção + painel cliente
{
  const p = await b.newPage({viewport:{width:1500,height:950}}); const e=[]; p.on('pageerror',x=>e.push(x.message));
  await entrar(p,'Prod Final');
  const cards = await p.locator('.lib-card').count();
  const falhas=[];
  for (const i of [0,8,20,33,41,50,60,66]) {
    const c = p.locator('.lib-card').nth(i);
    await c.scrollIntoViewIfNeeded().catch(()=>{});
    const nome = await c.locator('.lib-name').textContent().catch(()=>'?');
    await c.click({timeout:5000}).catch(()=>{});
    await p.waitForTimeout(320);
    const t = (await p.locator('.toast').last().textContent({timeout:1000}).catch(()=>'')) || '';
    if (t.length<3) falhas.push(nome);
  }
  await p.locator('.clip').first().click().catch(()=>{});
  await p.waitForTimeout(500);
  const insp = (await p.locator('.inspector').innerText().catch(()=>'')).slice(0,28).replace(/\s+/g,' ');
  await p.locator('.topbar button',{hasText:'FREE'}).click(); await p.waitForTimeout(700);
  const abasCliente = await p.locator('.pc-tab').allTextContents();
  await p.screenshot({path:'docs/screenshot-prod-cliente.png'});
  R.desktop = { cards, falhas, insp, abasCliente, errs:e.slice(0,3) };
  await p.close();
}
// admin
{
  const p = await b.newPage({viewport:{width:1400,height:950}});
  await p.goto(U+'#admin',{waitUntil:'networkidle'});
  await p.evaluate(()=>sessionStorage.clear());
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(900);
  await p.locator('input[type=text], input[autocomplete=username]').first().fill('admin');
  await p.locator('input[type=password]').fill('vortex2026');
  await p.locator('button[type=submit], .btn.primary').first().click(); await p.waitForTimeout(1600);
  R.admin = { abas: (await p.locator('aside button').allTextContents()).filter(a=>a.length<30) };
  await p.close();
}
// celular retrato + paisagem
{
  const ctx = await b.newContext({...devices['iPhone 13']});
  const p = await ctx.newPage(); const e=[]; p.on('pageerror',x=>e.push(x.message));
  await entrar(p,'Mobile Retrato');
  await p.locator('.dock-btn').nth(0).click(); await p.waitForTimeout(700);
  const cards = await p.locator('.lib-card').count();
  await p.locator('.lib-card').first().click(); await p.waitForTimeout(900);
  R.mobileRetrato = { cards, clips: await p.locator('.clip').count(), errs:e.slice(0,2) };
  await p.screenshot({path:'docs/screenshot-prod-mobile-retrato.png'});
  await ctx.close();
}
{
  const ctx = await b.newContext({...devices['iPhone 13'], viewport:{width:844,height:390}, isMobile:true, hasTouch:true});
  const p = await ctx.newPage(); const e=[]; p.on('pageerror',x=>e.push(x.message));
  await entrar(p,'Mobile Paisa');
  await p.locator('.dock-btn').nth(0).click(); await p.waitForTimeout(600);
  await p.locator('.lib-card').nth(3).click(); await p.waitForTimeout(1000);
  await p.locator('.clip').first().click(); await p.waitForTimeout(800);
  R.mobilePaisagem = { inspetor: (await p.locator('.inspector.mobile-open').count())>0, errs:e.slice(0,2) };
  await ctx.close();
}
console.log(JSON.stringify(R,null,1));
await b.close();
