/**
 * PROVA DO PLANO E DA SEGURANÇA (contra o banco real)
 * ------------------------------------------------------------
 * Roda no navegador (Playwright) contra o app local ou de produção e chama
 * as mesmas funções que a interface usa. Mostra, passo a passo, que:
 *   1. conta nova nasce com as horas de teste que o admin configurou;
 *   2. ninguém se dá plano pelo navegador;
 *   3. pagamento pendente NÃO libera horas;
 *   4. admin confirma → horas aparecem para o cliente;
 *   5. admin zera → cliente fica sem horas (e a interface bloqueia);
 *   6. download sem horas é recusado pelo servidor.
 *
 *   node provarPlano.mjs http://localhost:3001
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';

const BASE = process.argv[2] ?? 'http://localhost:3001';
const SUPA = 'https://pufuealhmnyllrqholye.supabase.co';
const CHAVE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZnVlYWxobW55bGxycWhvbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3NTMsImV4cCI6MjEwODc3ODc1M30.-clD1uKofTBHIM_-YeF2BKTbPJL_Y-_mKLGhCOyEtcM';

const resultados = [];
const registrar = (nome, ok, detalhe = '') => {
  resultados.push({ nome, ok, detalhe });
  console.log(`${ok ? '✓' : '✗'} ${nome}${detalhe ? ` · ${detalhe}` : ''}`);
};

const rpc = async (nome, args = {}) => {
  const r = await fetch(`${SUPA}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: {
      apikey: CHAVE,
      authorization: `Bearer ${CHAVE}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  try {
    return JSON.parse(t);
  } catch {
    return { erro_http: r.status, corpo: t.slice(0, 200) };
  }
};

const email = `prova.${Date.now()}@vortex.dev`;

async function main() {
  await mkdir('docs/prova/plano', { recursive: true });
  const navegador = await chromium.launch({ channel: 'chromium' });

  /* ---------- 1. cadastro no navegador (fluxo real da tela) ---------- */
  const ctx = await navegador.newContext({ viewport: { width: 1360, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(String(e.message)));
  await pagina.goto(`${BASE}/#entrar`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(2500);

  const cadastro = await pagina.evaluate(
    async ([email, senha]) => {
      const m = await import('/src/lib/contas.ts').catch(() => null);
      if (!m) return { ok: false, erro: 'modulo nao carregou (use build de dev/preview)' };
      const r = await m.criarConta('Cliente Prova', email, senha);
      return r.ok && r.sessao
        ? { ok: true, papel: r.sessao.papel, horas: r.sessao.horasRestantes, plano: r.sessao.plano, token: r.sessao.token }
        : { ok: false, erro: r.erro };
    },
    [email, 'senha123'],
  );

  if (!cadastro.ok) {
    // produção compilada: faz o cadastro pelo RPC direto e injeta o token
    const c = await rpc('vortex_criar_conta', { p_nome: 'Cliente Prova', p_email: email, p_senha: 'senha123' });
    if (!c?.token) throw new Error(`cadastro falhou: ${JSON.stringify(c)}`);
    await pagina.evaluate((t) => localStorage.setItem('vortex.token.v1', t), c.token);
    const s = await rpc('vortex_sessao', { p_token: c.token });
    registrar('conta nova criada no banco', !!s?.ok, `${email}`);
    registrar(
      'conta nova recebe horas de teste definidas no admin',
      (s?.plano?.horas_restantes ?? 0) > 0,
      `${s?.plano?.horas_restantes}h (${s?.plano?.tipo})`,
    );
    await provarResto(pagina, c.token);
  } else {
    registrar('conta nova criada no banco', true, `${email}`);
    registrar('conta nova recebe horas de teste definidas no admin', cadastro.horas > 0, `${cadastro.horas}h (${cadastro.plano})`);
    await provarResto(pagina, cadastro.token);
  }

  registrar('nenhum erro de JavaScript', erros.length === 0, erros.slice(0, 2).join(' | '));

  await pagina.screenshot({ path: 'docs/prova/plano/painel-horas.png', fullPage: false });
  await navegador.close();

  const falhas = resultados.filter((r) => !r.ok).length;
  await writeFile('docs/prova/plano/resultado.json', JSON.stringify({ base: BASE, email, resultados }, null, 2));
  console.log(`\n${resultados.length - falhas}/${resultados.length} provas · ${falhas} falha(s)`);
  process.exitCode = falhas ? 1 : 0;
}

async function provarResto(pagina, tokenCliente) {
  /* ---------- 2. tenta se dar plano pelo navegador ---------- */
  const tenta = await rpc('vortex_dar_horas', {
    p_usuario: '00000000-0000-0000-0000-000000000000',
    p_tipo: 'studio',
    p_horas: 9999,
    p_valor: 0,
    p_origem: 'hack',
    p_pagamento: null,
  });
  registrar(
    'navegador NÃO consegue dar horas a si mesmo',
    !!tenta?.code || !!tenta?.erro_http,
    tenta?.message ?? `HTTP ${tenta?.erro_http}`,
  );

  /* ---------- 3. pedido de pagamento não libera ---------- */
  const antes = await rpc('vortex_sessao', { p_token: tokenCliente });
  const pedido = await rpc('vortex_pedir_pagamento', { p_token: tokenCliente, p_plano: 'pro' });
  const depoisDoPedido = await rpc('vortex_sessao', { p_token: tokenCliente });
  registrar(
    'pedido de pagamento criado (status pendente)',
    pedido?.ok === true && pedido?.pagamento?.status === 'pendente',
    pedido?.pagamento?.referencia,
  );
  registrar(
    'pedido pendente NÃO aumenta as horas',
    Number(depoisDoPedido?.plano?.horas_restantes ?? 0) === Number(antes?.plano?.horas_restantes ?? 0),
    `${antes?.plano?.horas_restantes}h → ${depoisDoPedido?.plano?.horas_restantes}h`,
  );

  /* ---------- 4. admin confirma → horas entram ---------- */
  const adm = await rpc('vortex_entrar', { p_email: 'aliceoliveirade22@gmail.com', p_senha: '01082020' });
  registrar('admin entra pelo banco', adm?.ok === true, adm?.erro ?? 'ok');
  const lista = await rpc('vortex_admin_listar', { p_token: adm.token });
  const eu = await rpc('vortex_sessao', { p_token: tokenCliente });
  const cliente = (lista?.usuarios ?? []).find((u) => u.email === eu?.usuario?.email);
  registrar('admin vê o cliente na lista do banco', !!cliente, cliente?.id ?? 'não achou');

  const confirmado = await rpc('vortex_admin_confirmar_pagamento', { p_token: adm.token, p_pagamento: pedido.pagamento.id });
  const apos = await rpc('vortex_sessao', { p_token: tokenCliente });
  registrar(
    'admin confirmou pagamento → horas liberadas para o cliente',
    confirmado?.ok === true && Number(apos?.plano?.horas_restantes ?? 0) > Number(depoisDoPedido?.plano?.horas_restantes ?? 0),
    `${depoisDoPedido?.plano?.horas_restantes}h → ${apos?.plano?.horas_restantes}h`,
  );

  /* ---------- 5. cliente não pode confirmar sozinho ---------- */
  const pedido2 = await rpc('vortex_pedir_pagamento', { p_token: tokenCliente, p_plano: 'studio' });
  const auto = await rpc('vortex_admin_confirmar_pagamento', { p_token: tokenCliente, p_pagamento: pedido2?.pagamento?.id });
  const aposAuto = await rpc('vortex_sessao', { p_token: tokenCliente });
  registrar(
    'cliente NÃO consegue confirmar o próprio pagamento',
    auto?.ok === false && Number(aposAuto?.plano?.horas_restantes ?? 0) === Number(apos?.plano?.horas_restantes ?? 1),
    auto?.erro ?? '',
  );

  /* ---------- 6. download registrado e recusado sem horas ---------- */
  const d1 = await rpc('vortex_registrar_download', {
    p_token: tokenCliente,
    p_ferramenta: 'Baixa Tudo',
    p_origem: 'YouTube',
    p_link: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    p_nome: 'prova.mp4',
    p_bytes: 123456,
    p_status: 'ok',
    p_detalhe: 'prova automatizada',
  });
  const hist = await rpc('vortex_meus_downloads', { p_token: tokenCliente });
  registrar(
    'download fica registrado na conta do cliente',
    d1?.ok === true && Array.isArray(hist) && hist.some((h) => h.nome === 'prova.mp4'),
    `${Array.isArray(hist) ? hist.length : 0} registro(s)`,
  );

  /* ---------- 7. admin zera → bloqueio ---------- */
  const zerado = await rpc('vortex_admin_revogar', { p_token: adm.token, p_usuario: cliente?.id });
  const semHoras = await rpc('vortex_sessao', { p_token: tokenCliente });
  const d2 = await rpc('vortex_registrar_download', {
    p_token: tokenCliente,
    p_ferramenta: 'Baixa Tudo',
    p_origem: 'YouTube',
    p_link: 'x',
    p_nome: 'sem-horas.mp4',
    p_bytes: 1,
    p_status: 'ok',
    p_detalhe: '',
  });
  registrar(
    'admin zera as horas → cliente fica sem plano',
    zerado?.ok === true && Number(semHoras?.plano?.horas_restantes ?? 1) === 0,
    `${semHoras?.plano?.horas_restantes}h`,
  );
  registrar('sem horas, o servidor recusa novos downloads', d2?.erro === 'plano_esgotado', d2?.erro ?? 'liberou (!)');

  /* ---------- 8. devolve horas para deixar a conta utilizável ---------- */
  await rpc('vortex_admin_set_horas', {
    p_token: adm.token,
    p_usuario: cliente?.id,
    p_horas: 1,
    p_tipo: 'teste',
    p_motivo: 'prova automatizada',
  });

  /* ---------- 9. tela do painel com a barra ---------- */
  await pagina.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await pagina.waitForTimeout(2000);
  await pagina.evaluate(async () => {
    const m = await import('/src/lib/contas.ts');
    const s = await m.atualizarSessao();
    const ui = await import('/src/store/ui.ts');
    if (s) ui.useUI.getState().setSessao(s);
    ui.useUI.getState().openModal('account');
  });
  await pagina.waitForTimeout(1200);
  const barra = await pagina.locator('.barra-plano').first().isVisible().catch(() => false);
  const texto = await pagina.locator('.barra-plano').first().innerText().catch(() => '');
  registrar('painel do cliente mostra a barra de horas', barra, texto.replace(/\n/g, ' · ').slice(0, 80));
}

main().catch(async (e) => {
  console.error('erro na prova:', e.message);
  process.exitCode = 1;
});
