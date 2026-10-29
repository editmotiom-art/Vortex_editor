import { chromium } from 'playwright';
import fs from 'fs';
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1500,height:1000}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://127.0.0.1:8888/',{waitUntil:'networkidle'});
await p.evaluate(()=>localStorage.clear());
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(600);
await p.locator('input[autocomplete=name]').fill('Todos');
await p.locator('input[type=email]').fill('todos'+Date.now()+'@t.com');
await p.locator('input[type=password]').fill('senha123');
await p.locator('button[type=submit]').click(); await p.waitForTimeout(2200);
const cats = await p.locator('.cat-chips .chip').allTextContents();
const res = {};
for (const c of cats){
  await p.locator('.cat-chips .chip',{hasText:c}).first().click(); await p.waitForTimeout(200);
  const n = await p.locator('.lib-card').count();
  const sem=[];
  for (let i=0;i<n;i++){
    const card = p.locator('.lib-card').nth(i);
    const nome = await card.locator('.lib-name').textContent().catch(()=>'?');
    await card.scrollIntoViewIfNeeded().catch(()=>{});
    await card.click({force:true, timeout:4000}).catch(()=>{});
    await p.waitForTimeout(260);
    const t = (await p.locator('.toast').last().textContent({timeout:1000}).catch(()=>'')) || '';
    if (t.length < 3) sem.push(nome);
  }
  res[c] = `${n - sem.length}/${n}` + (sem.length ? ' faltou: ' + sem.join(', ') : '');
  fs.writeFileSync('/tmp/tall.json', JSON.stringify({res, errs}, null, 1));
}
console.log(JSON.stringify({ res, errs: errs.slice(0,4) },null,1));
await b.close();
