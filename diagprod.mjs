import { chromium } from 'playwright';
const U='https://vortex-editor.netlify.app/';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1500,height:950}});
const e=[]; p.on('pageerror',x=>e.push(x.message)); p.on('console',m=>{if(m.type()==='error')e.push('c:'+m.text().slice(0,110));});
await p.goto(U,{waitUntil:'networkidle'});
await p.evaluate(()=>{localStorage.clear();indexedDB.deleteDatabase('vortex.templates');});
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(700);
await p.locator('input[autocomplete=name]').fill('Diag XML');
await p.locator('input[type=email]').fill('dx'+Date.now()+'@t.com');
await p.locator('input[type=password]').fill('senha123');
await p.locator('button[type=submit]').click(); await p.waitForTimeout(2500);
// aba XML
await p.locator('.tab',{hasText:'XML'}).click(); await p.waitForTimeout(500);
await p.locator('input[accept*=".xml"]').setInputFiles(['/tmp/xmls/Cinematic Titles Pack Vol 3 - Typography.xml','/tmp/xmls/Anime Impact Speed Lines 04.xml']);
await p.waitForTimeout(3000);
const pend = await p.locator('.card h4').first().textContent().catch(()=>'nada');
await p.locator('.btn.primary',{hasText:'Adicionar à biblioteca'}).click(); await p.waitForTimeout(4000);
const cardsXML = await p.locator('div[title]').count();
// clicar no card XML para abrir no editor
const antes = await p.locator('.clip').count();
await p.locator('div[title]').first().locator('xpath=following-sibling::div').first().click({force:true}).catch(async()=>{
  await p.locator('div[title]').first().click({force:true}).catch(()=>{});
});
await p.waitForTimeout(1500);
const depois = await p.locator('.clip').count();
const toast = await p.locator('.toast').allTextContents().catch(()=>[]);
console.log(JSON.stringify({ pend, cardsXML, clipsAntes:antes, clipsDepois:depois, toasts:toast.slice(-2), errs:e.slice(0,3) },null,1));
await p.screenshot({path:'docs/diag-xml-prod.png'});
await b.close();
