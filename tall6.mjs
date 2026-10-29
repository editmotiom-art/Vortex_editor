import { chromium } from 'playwright';
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
  await p.locator('button[type=submit]').click(); await p.waitForTimeout(2400);
};
const p = await b.newPage({viewport:{width:1500,height:960}});
const e=[]; p.on('pageerror',x=>e.push(x.message));
await entrar(p,'Nova Rodada');
// 1) tema claro
await p.locator('.theme-btn').click(); await p.waitForTimeout(600);
R.tema = await p.evaluate(()=>({attr: document.documentElement.getAttribute('data-theme'), bg: getComputedStyle(document.body).backgroundColor}));
await p.screenshot({path:'docs/screenshot-tema-claro.png'});
await p.locator('.theme-btn').click(); await p.waitForTimeout(400);
// 2) XML: importar e abrir no editor
await p.locator('.tab',{hasText:'XML'}).click(); await p.waitForTimeout(400);
await p.locator('input[accept*=".xml"]').setInputFiles(['/tmp/xmls/Cinematic Titles Pack Vol 3 - Typography.xml','/tmp/xmls/Anime Impact Speed Lines 04.xml']);
await p.waitForTimeout(2500);
await p.locator('.btn.primary',{hasText:'Adicionar à biblioteca'}).click(); await p.waitForTimeout(3500);
const cards = await p.locator('div[title]').count();
await p.locator('.btn.primary',{hasText:'Abrir no editor'}).first().click();
await p.waitForTimeout(1800);
R.xml = { cards, clips: await p.locator('.clip').count(), inspector: (await p.locator('.inspector').innerText().catch(()=>'')).slice(0,26).replace(/\s+/g,' ') };
await p.screenshot({path:'docs/screenshot-xml-editor.png'});
// 3) seleção na tela + alças
await p.locator('.clip').first().click(); await p.waitForTimeout(600);
R.alcas = { selLayer: await p.locator('.sel-layer').count(), handles: await p.locator('.sel-handle').count() };
// 4) barra pro
const proBtns = await p.locator('.bp-btn').allTextContents();
R.barraPro = proBtns;
await p.locator('.bp-btn',{hasText:'Transição'}).click(); await p.waitForTimeout(300);
const chips = await p.locator('.bp-chip').allTextContents();
await p.locator('.bp-chip',{hasText:'Fade'}).first().click(); await p.waitForTimeout(600);
R.transicao = { chips: chips.slice(0,6), toast: (await p.locator('.toast').last().textContent().catch(()=>'')).slice(0,40) };
// 5) cinema
await p.locator('.bp-btn',{hasText:'Cinema'}).click(); await p.waitForTimeout(300);
await p.locator('.bp-chip').first().click(); await p.waitForTimeout(500);
R.cinema = (await p.locator('.toast').last().textContent().catch(()=>'')).slice(0,40);
// 6) extrair modal
await p.locator('.topbar .btn',{hasText:'Extrair'}).first().click(); await p.waitForTimeout(600);
R.extrair = { abas: await p.locator('.extrair .tab').allTextContents() };
await p.locator('.ex-input').first().fill('https://drive.google.com/drive/folders/1w0s5U8I8wO6bprAz7DxQTqKtILShSu-g');
await p.locator('.btn.primary',{hasText:'Extrair tudo'}).click();
await p.waitForTimeout(25000);
const itens = await p.locator('.ex-item').count();
R.extrairItens = itens;
await p.screenshot({path:'docs/screenshot-extrair.png'});
R.errs = e.slice(0,4);
console.log(JSON.stringify(R,null,1));
await b.close();
