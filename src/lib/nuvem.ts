/**
 * NUVEM — falar com o banco (Supabase) pelo RPC
 * ------------------------------------------------------------
 * Todo acesso a contas, planos, pagamentos e downloads passa por aqui.
 * O navegador NUNCA lê as tabelas: RLS está ligado e não existe policy.
 * Ele só pode chamar as funções `vortex_*`, que:
 *  · conferem o token de sessão no próprio banco;
 *  · conferem se o usuário é admin quando a função é administrativa;
 *  · calculam horas/plano no servidor (o cliente não decide nada).
 *
 * O endereço e a chave pública podem ser trocados sem tocar no resto do
 * sistema (Admin → Sistema, ou VITE_SUPABASE_URL / VITE_SUPABASE_ANON).
 */

const PADRAO_URL = 'https://pufuealhmnyllrqholye.supabase.co';
const PADRAO_CHAVE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1ZnVlYWxobW55bGxycWhvbHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMDI3NTMsImV4cCI6MjEwODc3ODc1M30.-clD1uKofTBHIM_-YeF2BKTbPJL_Y-_mKLGhCOyEtcM';

const doBuild = (k: string, padrao: string): string => {
  const v = (import.meta as unknown as { env?: Record<string, string> }).env?.[k];
  return v && v.length > 8 ? v : padrao;
};

export const SUPABASE_URL = doBuild('VITE_SUPABASE_URL', PADRAO_URL);
export const SUPABASE_CHAVE = doBuild('VITE_SUPABASE_ANON', PADRAO_CHAVE);

/** endereço trocado no painel (útil para um banco próprio) */
const configurado = (): { url: string; chave: string } => {
  try {
    const cru = localStorage.getItem('vortex.nuvem.v1');
    if (cru) {
      const c = JSON.parse(cru) as { url?: string; chave?: string };
      if (c.url && c.chave) return { url: c.url.replace(/\/$/, ''), chave: c.chave };
    }
  } catch {
    /* usa o padrão */
  }
  return { url: SUPABASE_URL, chave: SUPABASE_CHAVE };
};

export class ErroNuvem extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
    this.name = 'ErroNuvem';
  }
}

/** chama uma função do banco (POST /rest/v1/rpc/<nome>) */
export async function rpc<T = Record<string, unknown>>(
  nome: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const { url, chave } = configurado();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  let r: Response;
  try {
    r = await fetch(`${url}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        apikey: chave,
        authorization: `Bearer ${chave}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(args),
    });
  } catch (e) {
    const abriu = (e as Error).name === 'AbortError';
    throw new ErroNuvem(
      abriu ? 'O servidor demorou para responder. Tente de novo.' : 'Sem conexão com o servidor.',
    );
  } finally {
    clearTimeout(t);
  }

  const texto = await r.text();
  let dados: unknown = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }

  if (!r.ok) {
    const msg =
      (dados as { message?: string } | null)?.message ??
      (r.status === 401 || r.status === 403
        ? 'Sem permissão para esta operação.'
        : `O servidor respondeu ${r.status}.`);
    throw new ErroNuvem(msg, r.status);
  }
  return dados as T;
}

/** o banco está de pé? (usado no painel e no diagnóstico) */
export async function nuvemNoAr(): Promise<{ ok: boolean; detalhe: string }> {
  try {
    const r = await rpc<Record<string, unknown>>('vortex_publico');
    return { ok: !!r, detalhe: 'banco respondendo' };
  } catch (e) {
    return { ok: false, detalhe: (e as Error).message };
  }
}
