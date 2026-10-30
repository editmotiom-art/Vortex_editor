import { chromium } from 'playwright';
const TOK = process.env.TOK;
const b = await chromium.launch({ channel: 'chromium', args:['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport:{width:1400,height:900} });
await ctx.addInitScript(t=>localStorage.setItem('vortex.token.v1',t), TOK);
const p = await ctx.newPage();
p.on('pageerror',e=>console.log('pageerror:',e.message.slice(0,140)));
await p.goto('http://localhost:3001/',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(4000);
const r = await p.evaluate(async () => {
  const { gerarAudioVoz, VOZES } = await import('/assets/index-XX.js').catch(()=>({}));
  return { temModulo: !!VOZES };
});
console.log('modulo compilado (esperado false):', r.temModulo);
// usa a interface: abre Legenda, escolhe cada voz e narra; mede o arquivo gerado
await p.locator('.topbar button:has-text("Legenda")').first().click();
await p.waitForSelector('.tr-painel');
const resultados = [];
for (const nome of ['Ana', 'Bruno', 'Clara']) {
  const sel = p.locator('.tr-voz select').first();
  const opcoes = await sel.locator('option').allInnerTexts();
  const alvo = opcoes.find(o=>o.includes(nome));
  await sel.selectOption({ label: alvo });
  await p.fill('.tr-textarea', 'Ola, este e um teste de voz para conferir o timbre e a velocidade.');
  await p.locator('.tr-voz button:has-text("Narrar no playhead")').click();
  let info = null;
  for (let i=0;i<60;i++){
    await p.waitForTimeout(500);
    info = await p.evaluate(() => {
      const els = window.__vortexDoc?.().elements ?? [];
      const a = [...els].reverse().find(e=>e.type==='audio' && /Voz/i.test(e.name||''));
      return a ? { dur: a.duration, name: a.name } : null;
    });
    if (info) break;
  }
  resultados.push({ voz: nome, ...info });
  await p.waitForTimeout(300);
}
console.log(JSON.stringify(resultados, null, 1));
await b.close();
