/**
 * CONTAS, SESSÃO E PLANO POR HORAS
 * ------------------------------------------------------------
 * REGRA DE OURO: o navegador não decide plano.
 *
 *  · cadastro/login → o banco (Postgres) confere a senha com bcrypt e
 *    devolve um token de sessão (30 dias);
 *  · o plano é uma SOMA DE HORAS com data de início e fim gravada no banco
 *    (`vortex_planos`). O cliente só LÊ;
 *  · horas só entram por: cadastro (horas de teste configuradas no admin),
 *    pagamento confirmado pela equipe, ou o admin dando horas na mão;
 *  · `localStorage` guarda apenas o token — apagar o token desloga, não
 *    muda nada do plano.
 *
 * Toda a comunicação passa por `lib/nuvem.ts` (RPC com RLS fechado).
 */

import { rpc } from './nuvem';

export type Plano = 'nenhum' | 'teste' | 'pro' | 'studio';
export type Papel = 'cliente' | 'admin';

export interface PlanoAtual {
  tipo: Plano;
  horas: number;
  inicio?: string;
  fim?: string;
  horas_restantes: number;
  segundos_restantes: number;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  criado_em?: string;
  ultimo_acesso?: string | null;
}

export interface Sessao {
  token: string;
  /** compatibilidade: id da conta = id do usuário no banco */
  contaId: string;
  nome: string;
  email: string;
  /** tipo do plano vigente (nenhum | teste | pro | studio) */
  plano: Plano;
  papel: Papel;
  horasRestantes: number;
  segundosRestantes: number;
  fimPlano?: string;
  expiraEm: number;
  usuario: Usuario;
}

export interface ContaAdmin {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  criado_em: string;
  ultimo_acesso: string | null;
  plano: PlanoAtual;
  pagamentos_pendentes: number;
  gasto_centavos: number;
  downloads: number;
}

export interface Pagamento {
  id: string;
  usuario?: string;
  email?: string;
  plano: string;
  horas: number;
  valor_centavos: number;
  status: 'pendente' | 'pago' | 'recusado' | 'expirado' | 'reembolsado';
  referencia: string | null;
  comprovante?: string | null;
  criado_em: string;
  confirmado_em?: string | null;
}

export interface DownloadRegistro {
  id: string;
  ferramenta: string;
  origem: string | null;
  link: string | null;
  nome: string | null;
  bytes: number;
  status: string;
  criado_em: string;
}

/* ---------------- chaves locais (só token) ---------------- */

const CHAVE_TOKEN = 'vortex.token.v1';
const CHAVE_SESSAO = 'vortex.sessao.v1';

let cache: Sessao | null = null;

const gravarSessao = (s: Sessao | null): void => {
  cache = s;
  try {
    if (!s) {
      localStorage.removeItem(CHAVE_TOKEN);
      localStorage.removeItem(CHAVE_SESSAO);
      return;
    }
    localStorage.setItem(CHAVE_TOKEN, s.token);
    // cache para abrir rápido; o servidor sempre tem a palavra final
    localStorage.setItem(
      CHAVE_SESSAO,
      JSON.stringify({ ...s, salvoEm: Date.now() }),
    );
  } catch {
    /* modo privado do navegador: segue só em memória */
  }
};

export const tokenSalvo = (): string | null => {
  try {
    return localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
};

const sesaoDeResposta = (d: {
  usuario: Usuario;
  plano: PlanoAtual;
}, token: string): Sessao => ({
  token,
  contaId: d.usuario.id,
  nome: d.usuario.nome,
  email: d.usuario.email,
  papel: d.usuario.papel,
  plano: (d.plano?.tipo ?? 'nenhum') as Plano,
  horasRestantes: Number(d.plano?.horas_restantes ?? 0),
  segundosRestantes: Number(d.plano?.segundos_restantes ?? 0),
  fimPlano: d.plano?.fim,
  expiraEm: Date.now() + 30 * 864e5,
  usuario: d.usuario,
});

/* ---------------- sessão ---------------- */

/** sessão guardada no aparelho (abre sem esperar o servidor) */
export const sessaoAtual = (): Sessao | null => {
  if (cache) return cache;
  const token = tokenSalvo();
  if (!token) return null;
  try {
    const cru = localStorage.getItem(CHAVE_SESSAO);
    if (!cru) return null;
    const s = JSON.parse(cru) as Sessao & { salvoEm?: number };
    if (!s?.token || s.token !== token) return null;
    cache = s;
    return s;
  } catch {
    return null;
  }
};

/**
 * Confere a sessão no servidor e atualiza horas/plano.
 * É chamado ao abrir o editor e a cada 60 s: se o plano venceu, o
 * navegador descobre na hora (não dá para "congelar" o plano no aparelho).
 */
export async function atualizarSessao(): Promise<Sessao | null> {
  const token = tokenSalvo();
  if (!token) {
    gravarSessao(null);
    return null;
  }
  try {
    const d = await rpc<{ ok: boolean; usuario: Usuario; plano: PlanoAtual }>('vortex_sessao', {
      p_token: token,
    });
    if (!d?.ok || !d.usuario) {
      gravarSessao(null);
      return null;
    }
    const s = sesaoDeResposta(d, token);
    gravarSessao(s);
    return s;
  } catch {
    // servidor fora do ar: mantém a última sessão conhecida (não expulsa o cliente)
    return sessaoAtual();
  }
}

/* ---------------- cadastro e login ---------------- */

export async function criarConta(
  nome: string,
  email: string,
  senha: string,
): Promise<{ ok: boolean; erro?: string; sessao?: Sessao }> {
  const nomeLimpo = nome.trim();
  const emailLimpo = email.trim().toLowerCase();
  if (nomeLimpo.length < 2) return { ok: false, erro: 'Digite seu nome' };
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(emailLimpo)) return { ok: false, erro: 'E-mail inválido' };
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa de pelo menos 6 caracteres' };

  try {
    const r = await rpc<{ ok: boolean; erro?: string; token?: string }>('vortex_criar_conta', {
      p_nome: nomeLimpo,
      p_email: emailLimpo,
      p_senha: senha,
    });
    if (!r?.ok || !r.token) return { ok: false, erro: r?.erro ?? 'Não foi possível criar a conta' };
    gravarSessao(null);
    localStorage.setItem(CHAVE_TOKEN, r.token);
    const s = await atualizarSessao();
    return s ? { ok: true, sessao: s } : { ok: false, erro: 'Conta criada, mas não consegui abrir a sessão' };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function entrar(
  email: string,
  senha: string,
): Promise<{ ok: boolean; erro?: string; sessao?: Sessao }> {
  const emailLimpo = email.trim().toLowerCase();
  try {
    const r = await rpc<{ ok: boolean; erro?: string; token?: string }>('vortex_entrar', {
      p_email: emailLimpo,
      p_senha: senha,
    });
    if (!r?.ok || !r.token) return { ok: false, erro: r?.erro ?? 'Não foi possível entrar' };
    try {
      localStorage.setItem(CHAVE_TOKEN, r.token);
    } catch {
      /* ignora */
    }
    const s = await atualizarSessao();
    return s ? { ok: true, sessao: s } : { ok: false, erro: 'Entrou, mas não consegui ler o perfil' };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export const sair = (): void => {
  const t = tokenSalvo();
  if (t) void rpc('vortex_sair', { p_token: t }).catch(() => undefined);
  gravarSessao(null);
};
export const sairConta = sair;

export async function trocarSenhaCliente(
  _contaId: string,
  novaSenha: string,
  atual = '',
): Promise<{ ok: boolean; erro?: string }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Sessão expirada — entre de novo' };
  if (novaSenha.length < 6) return { ok: false, erro: 'A senha precisa de 6 caracteres' };
  if (!atual) return { ok: false, erro: 'Digite a senha atual' };
  try {
    const r = await rpc<{ ok: boolean; erro?: string }>('vortex_trocar_senha', {
      p_token: token,
      p_atual: atual,
      p_nova: novaSenha,
    });
    return r?.ok ? { ok: true } : { ok: false, erro: r?.erro ?? 'Não foi possível trocar a senha' };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/* ---------------- plano (só leitura no cliente) ---------------- */

export const temHoras = (s: Sessao | null | undefined): boolean =>
  !!s && (s.papel === 'admin' || (s.horasRestantes ?? 0) > 0);

/** "2h 14min" a partir de segundos */
export function tempoHumano(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos));
  if (s <= 0) return '0 min';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

/* ---------------- pagamento (nunca libera sozinho) ---------------- */

export interface PedidoPagamento {
  id: string;
  plano: string;
  horas: number;
  valor_centavos: number;
  referencia: string;
  chave_pix: string;
  instrucoes: string;
  status: string;
}

export async function pedirPagamento(plano: string): Promise<{ ok: boolean; erro?: string; pedido?: PedidoPagamento }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Entre na sua conta para assinar' };
  try {
    const r = await rpc<{ ok: boolean; erro?: string; pagamento: PedidoPagamento }>('vortex_pedir_pagamento', {
      p_token: token,
      p_plano: plano,
    });
    if (!r?.ok) return { ok: false, erro: r?.erro ?? 'Não foi possível abrir o pedido' };
    return { ok: true, pedido: r.pagamento };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function meusPagamentos(): Promise<Pagamento[]> {
  const token = tokenSalvo();
  if (!token) return [];
  try {
    return (await rpc<Pagamento[]>('vortex_meus_pagamentos', { p_token: token })) ?? [];
  } catch {
    return [];
  }
}

export async function enviarComprovante(pagamentoId: string, texto: string): Promise<{ ok: boolean; erro?: string }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Entre na sua conta' };
  try {
    await rpc('vortex_enviar_comprovante', { p_token: token, p_pagamento: pagamentoId, p_texto: texto });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/* ---------------- downloads do sistema ---------------- */

export async function registrarDownload(reg: {
  ferramenta: string;
  origem?: string;
  link?: string;
  nome?: string;
  bytes?: number;
  status?: string;
  detalhe?: string;
}): Promise<{ ok: boolean; erro?: string; horas_restantes?: number }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Entre na sua conta' };
  try {
    const r = await rpc<{ ok: boolean; erro?: string; horas_restantes?: number }>('vortex_registrar_download', {
      p_token: token,
      p_ferramenta: reg.ferramenta,
      p_origem: reg.origem ?? null,
      p_link: reg.link ?? null,
      p_nome: reg.nome ?? null,
      p_bytes: reg.bytes ?? 0,
      p_status: reg.status ?? 'ok',
      p_detalhe: reg.detalhe ?? null,
    });
    return r ?? { ok: false };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function meusDownloads(): Promise<DownloadRegistro[]> {
  const token = tokenSalvo();
  if (!token) return [];
  try {
    return (await rpc<DownloadRegistro[]>('vortex_meus_downloads', { p_token: token })) ?? [];
  } catch {
    return [];
  }
}

/* ---------------- administração ---------------- */

export async function listarContas(): Promise<ContaAdmin[]> {
  const token = tokenSalvo();
  if (!token) return [];
  try {
    const r = await rpc<{ ok: boolean; usuarios: ContaAdmin[] }>('vortex_admin_listar', { p_token: token });
    return r?.usuarios ?? [];
  } catch {
    return [];
  }
}

export async function darHoras(
  usuarioId: string,
  horas: number,
  tipo: 'teste' | 'pro' | 'studio' = 'teste',
  motivo = '',
): Promise<{ ok: boolean; erro?: string }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Sessão expirada' };
  try {
    const r = await rpc<{ ok: boolean; erro?: string }>('vortex_admin_set_horas', {
      p_token: token,
      p_usuario: usuarioId,
      p_horas: horas,
      p_tipo: tipo,
      p_motivo: motivo,
    });
    return r?.ok ? { ok: true } : { ok: false, erro: r?.erro ?? 'Não foi possível dar horas' };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function revogarPlano(usuarioId: string): Promise<{ ok: boolean; erro?: string }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Sessão expirada' };
  try {
    const r = await rpc<{ ok: boolean; erro?: string }>('vortex_admin_revogar', { p_token: token, p_usuario: usuarioId });
    return r?.ok ? { ok: true } : { ok: false, erro: r?.erro };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function excluirConta(usuarioId: string): Promise<{ ok: boolean; erro?: string }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Sessão expirada' };
  try {
    const r = await rpc<{ ok: boolean; erro?: string }>('vortex_admin_excluir', { p_token: token, p_usuario: usuarioId });
    return r?.ok ? { ok: true } : { ok: false, erro: r?.erro };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/** admin dá o plano na mão (atalho usado no painel) */
export const setPlanoConta = (id: string, plano: Plano): Promise<{ ok: boolean; erro?: string }> =>
  plano === 'nenhum' ? revogarPlano(id) : darHoras(id, plano === 'studio' ? 168 : plano === 'pro' ? 24 : 1, plano as 'teste' | 'pro' | 'studio', 'admin');

export async function listarPagamentos(): Promise<Pagamento[]> {
  const token = tokenSalvo();
  if (!token) return [];
  try {
    const r = await rpc<{ ok: boolean; pagamentos: Pagamento[] }>('vortex_admin_pagamentos', { p_token: token });
    return r?.pagamentos ?? [];
  } catch {
    return [];
  }
}

export async function confirmarPagamento(id: string): Promise<{ ok: boolean; erro?: string }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Sessão expirada' };
  try {
    const r = await rpc<{ ok: boolean; erro?: string }>('vortex_admin_confirmar_pagamento', { p_token: token, p_pagamento: id });
    return r?.ok ? { ok: true } : { ok: false, erro: r?.erro };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function recusarPagamento(id: string): Promise<{ ok: boolean; erro?: string }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Sessão expirada' };
  try {
    await rpc('vortex_admin_recusar_pagamento', { p_token: token, p_pagamento: id });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export interface ConfigNuvem {
  planos_horas: { teste?: number; pro?: number; studio?: number };
  precos_centavos: { pro?: number; studio?: number };
  horas_teste_novo_usuario: number;
  plano_gratis_ativo: boolean;
  chave_pix: string;
  instrucoes_pagamento: string;
}

export async function lerConfigNuvem(): Promise<ConfigNuvem | null> {
  try {
    const r = await rpc<ConfigNuvem>('vortex_publico');
    return r ?? null;
  } catch {
    return null;
  }
}

export async function configAdmin(): Promise<Record<string, unknown> | null> {
  const token = tokenSalvo();
  if (!token) return null;
  try {
    const r = await rpc<{ ok: boolean; config: Record<string, unknown> }>('vortex_admin_config', { p_token: token });
    return r?.config ?? null;
  } catch {
    return null;
  }
}

export async function salvarConfigAdmin(chave: string, valor: unknown): Promise<{ ok: boolean; erro?: string }> {
  const token = tokenSalvo();
  if (!token) return { ok: false, erro: 'Sessão expirada' };
  try {
    const r = await rpc<{ ok: boolean; erro?: string }>('vortex_admin_set_config', {
      p_token: token,
      p_chave: chave,
      p_valor: valor,
    });
    return r?.ok ? { ok: true } : { ok: false, erro: r?.erro };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export const totalContas = (l: ContaAdmin[]): number => l.length;
