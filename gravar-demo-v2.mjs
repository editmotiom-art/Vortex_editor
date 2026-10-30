/**
 * GRAVADOR DO VÍDEO DE APRESENTAÇÃO — v2 (edição real, áudio no tempo)
 * ------------------------------------------------------------
 * Regras desta versão (para não repetir os problemas da anterior):
 *  1. O vídeo mostra uma EDIÇÃO DE VERDADE: importar clipes, cortar, mover,
 *     escala, transição, look cinematográfico, texto animado, música, voz e
 *     as três exportações (vídeo, imagem, áudio) — nada de tela parada.
 *  2. O áudio NÃO é gravado junto: cada trecho de narração é gerado antes e
 *     é encaixado por ffmpeg no segundo exato da ação (sem atraso).
 *  3. Os sons de clique são sintetizados por ffmpeg nos mesmos instantes.
 *  4. No fim, um script confere a sincronia (ver docs/VIDEO-DEMO.md).
 *
 *   node gravar-demo-v2.mjs [base]        # padrão: http://127.0.0.1:3001
 *
 * Saída: video-demo/bruto/*.webm (tela) · video-demo/narra/*.mp3 · video-demo/marca.json
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3001';
const RAIZ = path.resolve('video-demo');
const BRUTO = path.join(RAIZ, 'bruto');
const NARRA = path.join(RAIZ, 'narra');
fs.rmSync(BRUTO, { recursive: true, force: true });
fs.mkdirSync(BRUTO, { recursive: true });
fs.mkdirSync(NARRA, { recursive: true });

const MIDIA = path.resolve('.cache/midia-preview');
const API = `${BASE}/api/ferramentas`;

/* ---------------- narração: gerada ANTES da gravação ---------------- */

const NARRACAO = [
  ['01-abertura', 'Este é o Vortex. Um editor de vídeo profissional que roda inteiro no navegador — no computador e no celular.'],
  ['02-conta', 'Em segundos a conta fica pronta e o editor abre com o projeto novo.'],
  ['03-importar', 'Trago dois clipes do computador: eles entram na biblioteca e já caem na timeline.'],
  ['04-cortar', 'Corto o começo do clipe, apago o pedaço que não serve e encaixo os dois na sequência.'],
  ['05-encher', 'Ajusto o enquadramento para o clipe preencher o quadro inteiro.'],
  ['06-transicao', 'Uma transição de verdade entre os clipes, com duração que eu escolho.'],
  ['07-look', 'E o visual cinematográfico da Hollywood com um clique.'],
  ['08-texto', 'Adiciono um título animado por cima do vídeo.'],
  ['09-musica', 'Coloco música de fundo na trilha de áudio.'],
  ['10-voz', 'E gero a narração em voz alta direto do editor.'],
  ['11-exportar', 'Agora as três exportações: vídeo, imagem e só o áudio.'],

  ['12-acervo', 'E o acervo de packs do Drive entra direto no editor, com download de verdade.'],
  ['13-fim', 'Vortex: edição profissional no navegador, com acervo, voz e exportação de verdade.'],
];

const gerarNarracoes = async () => {
  const faltando = NARRACAO.filter(([n]) => !fs.existsSync(path.join(NARRA, `${n}.mp3`)));
  if (!faltando.length) {
    console.log('narrações já existem — reaproveitando');
    return;
  }
  console.log(`gerando ${faltando.length} narração(ões) pela API do próprio sistema…`);
  for (const [nome, texto] of faltando) {
    for (let tentativa = 1; tentativa <= 4; tentativa += 1) {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acao: 'voz', texto, idioma: 'pt-BR' }),
      });
      if (r.ok && (r.headers.get('content-type') ?? '').includes('audio')) {
        fs.writeFileSync(path.join(NARRA, `${nome}.mp3`), Buffer.from(await r.arrayBuffer()));
        console.log(`  ✓ ${nome}`);
        break;
      }
      console.log(`  … ${nome} tentativa ${tentativa} falhou (${r.status})`);
      await new Promise((ok) => setTimeout(ok, 4000));
    }
  }
};

/* ---------------- utilidades de palco ---------------- */

const lerTexto = (el) => el?.innerText?.() ?? '';

const main = async () => {
  await gerarNarracoes();

  const browser = await chromium.launch({
    channel: 'chromium',
    args: ['--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=1'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    recordVideo: { dir: BRUTO, size: { width: 1440, height: 810 } },
    acceptDownloads: true,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message.slice(0, 160)));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text().slice(0, 160)));

  const marca = [];            // { t, capitulo }
  const cliques = [];           // instantes dos cliques (para o som)
  let som = 0;                  // liga/desliga registro de clique
  const inicio = Date.now();
  const agora = () => (Date.now() - inicio) / 1000;
  const espera = (ms) => page.waitForTimeout(ms);

  /** registra o instante em que a ação começou (para casar narração e clique) */
  const capitulo = (nome) => {
    marca.push({ t: Number(agora().toFixed(2)), capitulo: nome });
    console.log(`[${agora().toFixed(1)}s] ${nome}`);
  };

  /** movimento de mouse visível (mostra a intenção na tela) */
  const ir = async (seletor, extra = {}) => {
    const el = page.locator(seletor).first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const box = await el.boundingBox().catch(() => null);
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await espera(extra.pausa ?? 220);
    return el;
  };
  const clicar = async (seletor, extra = {}) => {
    const el = await ir(seletor, extra);
    cliques.push(Number(agora().toFixed(2)));
    await el.click({ timeout: 6000 }).catch(async () => el.click({ force: true, timeout: 4000 }));
    if (som) cliques.push(Number(agora().toFixed(2)));
    await espera(extra.depois ?? 420);
  };
  const tecla = async (k) => {
    cliques.push(Number(agora().toFixed(2)));
    await page.keyboard.press(k).catch(() => {});
  };

  /* ================= 1. ABERTURA NA PÁGINA DE VENDAS ================= */
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await espera(1200);
  capitulo('abertura');
  for (let i = 0; i < 3; i += 1) {
    await page.mouse.move(1000, 320, { steps: 14 });
    await page.mouse.wheel(0, 560);
    await espera(1500);
  }
  await page.mouse.wheel(0, -1900);
  await espera(900);
  await page.mouse.move(700, 420, { steps: 16 });
  await espera(700);

  /* ================= 2. CONTA ================= */
  capitulo('conta');
  await clicar('.lp-nav-acoes button:has-text("Abrir editor")', { depois: 700 });
  await page.fill('input[placeholder="Como quer ser chamado"]', 'Alice');
  await espera(260);
  await page.fill('input[type=email]', `demo${Date.now()}@vortex.dev`);
  await espera(260);
  await page.fill('input[type=password]', 'vortex2026');
  await espera(320);
  await clicar('button:has-text("Criar conta e abrir o editor")', { depois: 2400 });

  /* formato 16:9 (YouTube) — palco grande, como o cliente vai usar */
  const formato = page.locator('.inspector select').first();
  if (await formato.count()) {
    const opcoes = await formato.locator('option').allInnerTexts().catch(() => []);
    const alvo = opcoes.find((o) => /16:9|1920|YouTube/i.test(o));
    if (alvo) { await formato.selectOption({ label: alvo }).catch(() => {}); await espera(1000); }
  }

  /* ================= 3. IMPORTAR DOIS CLIPES ================= */
  capitulo('importar');
  await espera(600);
  const bandeja = page.locator('.bandeja input[type=file]').first();
  await bandeja.setInputFiles(path.join(MIDIA, 'clipe.webm'));
  await espera(2600);
  await page.mouse.move(500, 700, { steps: 10 });
  await bandeja.setInputFiles(path.join(MIDIA, 'clipe2.webm'));
  await espera(2800);
  // play para o palco mostrar a imagem (no quadro 0 o vídeo ainda não decodificou)
  await tecla(' ');
  await espera(2600);
  await tecla(' ');
  await espera(600);

  /* ================= 4. CORTAR DE VERDADE ================= */
  capitulo('cortar');
  const clipe1 = page.locator('.clip').first();
  const box1 = await clipe1.boundingBox().catch(() => null);
  if (box1) {
    // ferramenta de corte (C) e dois cortes reais no clipe
    await clicar('.tl-toolbar button:has-text("C")', { depois: 400 });
    await page.mouse.click(box1.x + box1.width * 0.55, box1.y + box1.height / 2);
    await espera(700);
    await page.mouse.click(box1.x + box1.width * 0.8, box1.y + box1.height / 2);
    await espera(700);
    await clicar('.tl-toolbar button:has-text("V")', { depois: 300 });
    await page.mouse.click(box1.x + box1.width * 0.88, box1.y + box1.height / 2);
    await espera(500);
    await tecla('Delete');
    await espera(900);
    const restaram = await page.locator('.clip').count();
    console.log('  clipes depois do corte:', restaram);
  }

  /* ================= 5. ENCHER O QUADRO ================= */
  capitulo('encher');
  // playhead em ~2 s (clicando na régua) para o palco já ter imagem
  const regua = await page.locator('.tl-content').boundingBox().catch(() => null);
  if (regua) {
    await page.mouse.click(regua.x + 80 * 2 + 4, regua.y + 8);
    await espera(900);
  }
  await page.locator('.clip').first().click().catch(() => {});
  await espera(700);
  // escala 1 = preencher (inspetor → Escala → clicar no diamante do campo)
  const escala = page.locator('.inspector input').nth(5);
  await escala.fill('1').catch(() => {});
  await tecla('Enter');
  await espera(800);

  /* ================= 6. TRANSIÇÃO + CINEMA ================= */
  capitulo('transicao');
  await clicar('button:has-text("Transição")', { depois: 1600 });
  await clicar('button:has-text("Cinema")', { depois: 1700 });

  /* ================= 7. MANIPULAR NA TELA ================= */
  capitulo('look');
  const palco = await page.locator('.canvas-shell').boundingBox();
  await page.mouse.move(palco.x + palco.width / 2, palco.y + palco.height * 0.45, { steps: 12 });
  await page.mouse.down();
  await page.mouse.move(palco.x + palco.width / 2 + 70, palco.y + palco.height * 0.45 + 30, { steps: 22 });
  await page.mouse.up();
  await espera(900);

  /* ================= 8. TÍTULO ANIMADO ================= */
  capitulo('texto');
  const cardTitulo = page.locator('.lib-card', { hasText: 'Título Pop' }).first();
  if (await cardTitulo.count()) {
    cliques.push(Number(agora().toFixed(2)));
    await cardTitulo.click({ timeout: 5000 }).catch(() => {});
    await espera(1800);
  }
  // o template aplica no item selecionado; garante um texto novo se nada apareceu
  const temTexto = await page.evaluate(() => window.__vortexDoc?.().elements.some((e) => e.type === 'text'));
  if (!temTexto) {
    await page.locator('.tl-toolbar button:has-text("×")').click().catch(() => {});
    await espera(1500);
  }

  /* ================= 9. MÚSICA + EFEITO SONORO ================= */
  capitulo('musica');
  const itemMusica = page.locator('.lib-card', { hasText: 'Cinematic' }).first();
  if (await itemMusica.count()) {
    cliques.push(Number(agora().toFixed(2)));
    await itemMusica.click({ timeout: 5000 }).catch(() => {});
    await espera(1800);
  }
  const itemClipe = page.locator('.lib-card', { hasText: 'Ui Click' }).first();
  if (await itemClipe.count()) {
    cliques.push(Number(agora().toFixed(2)));
    await itemClipe.click({ timeout: 5000 }).catch(() => {});
    await espera(1500);
  }
  // mostra as trilhas de áudio com a música e o efeito
  await page.mouse.move(700, 700, { steps: 8 });
  await espera(800);

  /* ================= 10. VOZ (TTS do sistema) ================= */
  capitulo('voz');
  await clicar('.topbar button:has-text("Legenda")', { depois: 900 });
  await page.waitForSelector('.tr-painel', { timeout: 20000 }).catch(() => {});
  if (await page.locator('.tr-textarea').count()) {
    await page.fill('.tr-textarea', 'Esta narração foi gerada dentro do editor, em segundos.');
    await espera(800);
    await clicar('.tr-voz button:has-text("Narrar no playhead")', { depois: 900 });
    for (let i = 0; i < 40; i += 1) {
      await espera(400);
      const tem = await page.evaluate(() =>
        Boolean(window.__vortexDoc?.().elements.some((e) => e.type === 'audio' && /Voz/i.test(e.name ?? ''))),
      );
      if (tem) break;
    }
    await espera(900);
    await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
    await espera(700);
  }

  /* ================= 11. EXPORTAR (as três saídas) ================= */
  capitulo('exportar');
  await clicar('.topbar button:has-text("Exportar")', { depois: 1400 });
  const painelExport = page.locator('.overlay');
  if (await painelExport.count()) {
    await espera(1100);
    const botoes = await painelExport.locator('button').allInnerTexts().catch(() => []);
    console.log('  botões de exportação:', botoes.join(' | ').replace(/\n/g, ' ').slice(0, 160));
    // percorre as três opções (vídeo → imagem → áudio) só mostrando a interface
    const imagem = painelExport.locator('button:has-text("Imagem"), button:has-text("PNG")').first();
    if (await imagem.count()) { await imagem.click({ force: true }).catch(() => {}); await espera(1200); }
    const audio = painelExport.locator('button:has-text("Áudio"), button:has-text("MP3"), button:has-text("WAV")').first();
    if (await audio.count()) { await audio.click({ force: true }).catch(() => {}); await espera(1400); }
    await page.screenshot({ path: path.join(RAIZ, 'exportar.png') }).catch(() => {});
    await page.locator('.overlay .modal-head button').last().click({ force: true }).catch(() => {});
    await espera(700);
  }

  /* ================= 12. ACERVO (Pack do Editor) ================= */
  capitulo('acervo');
  await clicar('.topbar button:has-text("Conteúdo")', { depois: 900 });
  await page.locator('text=Pack do Editor').first().click({ force: true }).catch(() => {});
  await espera(2200);
  await page.keyboard.press('Escape').catch(() => {});
  await espera(600);

  /* ================= 13. FECHO NA PÁGINA DE VENDAS ================= */
  capitulo('fim');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await espera(1400);
  await page.mouse.move(720, 430, { steps: 22 });
  await espera(1200);
  await page.mouse.move(720, 560, { steps: 16 });
  await espera(2000);

  fs.writeFileSync(path.join(RAIZ, 'marca.json'), JSON.stringify({ BASE, marca, cliques, erros }, null, 2));
  await ctx.close();
  await browser.close();
  console.log(`\nítens marcados: ${marca.length} · erros de JS: ${erros.length}`);
  if (erros.length) console.log(erros.slice(0, 5));
};

await main();
