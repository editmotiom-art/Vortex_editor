/**
 * PROVA DA INTERFACE (build de produção) — plano por horas + admin + download
 * ------------------------------------------------------------
 * Usa o sistema do jeito que o cliente usa: cliques, não atalhos.
 *   1. conta criada no banco → entra no editor com a barra de horas
 *   2. admin pela tela (#admin): login, vê cliente, dá 7h
 *   3. cliente vê as horas novas depois de recarregar (persistência)
 *   4. "Baixar conteúdo" com link real do YouTube → arquivo na timeline
 *   5. painel do cliente: aba Downloads mostra o registro
 *
 *   node provarUi.mjs http://localhost:3001
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://localhost:3001';
const SUPA = 'https://pufuealhmnyllrqholye.supabase.co';
const CHAVE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZnVlYWxobW55bGxycWhvbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3NTMsImV4cCI6MjEwODc3ODc1M30.-clD1uKofTBHIM_-YeF2BKTbPJL_Y-_mKLGhCOyEtcM';

const res = [];
const ok = (nome, cond, detalhe = '') => {
  res.push({ nome, ok: !!cond, detalhe });
  console.log(`${cond ? '✓' : '✗'} ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
};

const rpc = async (nome, args = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: { apikey: CHAVE, authorization: `Bearer ${CHAVE}`, 'content-type': 'application/json' },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return { erro_http: r.status };
  }
};

const email = `ui.${Date.now()}@vortex.dev`;

const entrarComo = async (contexto, token) => {
  await contexto.addInitScript((t) => {
    localStorage.setItem('vortex.token.v1', t);
  }, token);
};

async function main() {
  await mkdir('docs/prova/plano', { recursive: true });

  /* conta de prova criada direto no banco (cadastro já provado no provarPlano) */
  const conta = await rpc('vortex_criar_conta', { p_nome: 'Cliente UI', p_email: email, p_senha: 'senha123' });
  if (!conta?.token) throw new Error(`cadastro falhou: ${JSON.stringify(conta)}`);

  const navegador = await chromium.launch({ channel: 'chromium' });
  const ctxCliente = await navegador.newContext({ viewport: { width: 1360, height: 900 } });
  await entrarComo(ctxCliente, conta.token);
  const cliente = await ctxCliente.newPage();
  const erros = [];
  cliente.on('pageerror', (e) => erros.push(String(e.message)));

  /* ---------- 1. editor abre com a barra de horas ---------- */
  await cliente.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await cliente.waitForTimeout(3500);
  const naLanding = await cliente.locator('.landing').count();
  ok('sessão do banco é reconhecida ao abrir o site', naLanding === 0, naLanding ? 'caiu na landing (sessão não lida)' : 'editor direto');
  const barraTopo = cliente.locator('.barra-plano').first();
  const temBarra = await barraTopo.isVisible().catch(() => false);
  const textoBarra = temBarra ? (await barraTopo.innerText()).replace(/\n/g, ' · ') : '';
  ok('editor mostra a barra de horas do plano', temBarra, textoBarra.slice(0, 90));

  await cliente.screenshot({ path: 'docs/prova/plano/01-editor-barra.png' });

  /* ---------- 2. admin pela tela dá 7h ---------- */
  const ctxAdmin = await navegador.newContext({ viewport: { width: 1500, height: 950 } });
  const admin = await ctxAdmin.newPage();
  admin.on('pageerror', (e) => erros.push(`admin: ${e.message}`));
  await admin.goto(`${BASE}/#admin`, { waitUntil: 'domcontentloaded' });
  await admin.waitForTimeout(2500);

  await admin.fill('input[autocomplete="username"]', 'aliceoliveirade22@gmail.com');
  await admin.fill('input[autocomplete="current-password"]', '01082020');
  await admin.click('button[type="submit"]');
  await admin.waitForTimeout(4000);

  const noPainel = await admin.locator('text=Visão geral').first().isVisible().catch(() => false);
  ok('admin entra no painel com a senha do banco', noPainel);

  await admin.click('text=Clientes').catch(() => {});
  await admin.waitForTimeout(2500);
  const achouCliente = await admin.locator(`text=${email}`).first().isVisible().catch(() => false);
  ok('aba Clientes lista a conta criada (veio do banco)', achouCliente, email);
  await admin.screenshot({ path: 'docs/prova/plano/02-admin-clientes.png' });

  /* gerenciar → +7h */
  const linha = admin.locator('div', { hasText: email }).last();
  await admin.locator('button:has-text("Gerenciar")').first().click().catch(() => {});
  await admin.waitForTimeout(800);
  await admin.locator('button:has-text("+7h")').first().click().catch(() => {});
  await admin.waitForTimeout(2500);
  await admin.screenshot({ path: 'docs/prova/plano/03-admin-horas.png' });

  /* ---------- 3. cliente recarrega e vê as horas novas ---------- */
  await cliente.reload({ waitUntil: 'domcontentloaded' });
  await cliente.waitForTimeout(4000);
  const texto2 = (await cliente.locator('.barra-plano').first().innerText().catch(() => '')).replace(/\n/g, ' · ');
  ok('horas dadas pelo admin aparecem para o cliente (persistiu)', /[2-9]h|1[0-9]h|dia/.test(texto2), texto2.slice(0, 90));

  /* ---------- 4. baixar conteúdo: link real do YouTube ---------- */
  await cliente.click('button:has-text("Baixar conteúdo")').catch(() => {});
  await cliente.waitForTimeout(1200);
  const caixa = cliente.locator('.baixar-conteudo');
  const abriu = await caixa.isVisible().catch(() => false);
  ok('ferramenta única "Baixar conteúdo" abre', abriu);

  if (abriu) {
    await cliente.fill('.bt-input', 'https://www.youtube.com/watch?v=jNQXAC9IVRw');
    await cliente.locator('button:has-text("Analisar link")').click();
    await cliente.waitForTimeout(9000);
    const itens = await cliente.locator('.bc-item').count();
    const rotulo = await cliente.locator('.bc-item .bc-nome').first().innerText().catch(() => '');
    ok('reconhece e lista a mídia do link do YouTube', itens > 0, `${itens} item(s) · ${rotulo.slice(0, 50)}`);
    await cliente.screenshot({ path: 'docs/prova/plano/04-baixar-conteudo-lista.png' });

    if (itens > 0) {
      await cliente.locator('.baixar-conteudo button.btn.primary:has-text("⬇ Baixar")').click();
      await cliente.waitForTimeout(30000);
      const clipes = await cliente.locator('.clip').count();
      ok('arquivo baixado entrou na timeline', clipes > 0, `${clipes} clipe(s) na régua`);
      await cliente.screenshot({ path: 'docs/prova/plano/05-timeline-com-download.png' });
    }
  }

  /* ---------- 5. painel: aba Downloads ---------- */
  await cliente.keyboard.press('Escape').catch(() => {});
  await cliente.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await cliente.waitForTimeout(3000);
  await cliente.locator('button[title="Conta e assinatura"]').first().click().catch(() => {});
  await cliente.waitForTimeout(1500);
  await cliente.locator('.pc-tab:has-text("Downloads")').click().catch(() => {});
  await cliente.waitForTimeout(2500);
  const linhasDown = await cliente.locator('.pc-linha').count();
  ok('aba Downloads mostra o histórico guardado na conta', linhasDown > 0, `${linhasDown} linha(s)`);
  await cliente.screenshot({ path: 'docs/prova/plano/06-downloads.png' });

  ok('nenhum erro de JavaScript', erros.length === 0, erros.slice(0, 2).join(' | '));

  await navegador.close();
  const falhas = res.filter((r) => !r.ok).length;
  await writeFile('docs/prova/plano/ui.json', JSON.stringify({ base: BASE, email, res }, null, 2));
  console.log(`\n${res.length - falhas}/${res.length} provas · ${falhas} falha(s)`);
  process.exitCode = falhas ? 1 : 0;
}

main().catch((e) => {
  console.error('erro:', e.message);
  process.exitCode = 1;
});
