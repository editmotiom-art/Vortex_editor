/**
 * LOGIN DO ADMIN — validado no BANCO
 * ------------------------------------------------------------
 * Antes o painel abria com uma senha guardada no próprio navegador (dava para
 * burlar pelo DevTools). Agora o admin entra como qualquer conta: o Postgres
 * confere o bcrypt, devolve um token de sessão e esse token é o mesmo que as
 * funções administrativas exigem (`vortex_admin_*` confere `papel = 'admin'`).
 *
 * Sem token de admin no servidor, o painel não abre — mesmo que alguém mexa
 * no armazenamento do navegador, as listas e ações voltam "sem_permissao".
 */

import { entrar, sair, sessaoAtual, atualizarSessao, type Sessao } from './contas';

const K_ADMIN = 'vortex.admin.sessao.v2';

export async function entrarAdmin(email: string, senha: string): Promise<{ ok: boolean; erro?: string; sessao?: Sessao }> {
  const r = await entrar(email, senha);
  if (!r.ok || !r.sessao) return { ok: false, erro: r.erro ?? 'Não foi possível entrar' };
  if (r.sessao.papel !== 'admin') {
    // não é admin: derruba a sessão para não ficar meio logado
    sair();
    return { ok: false, erro: 'Essa conta não é de administrador' };
  }
  sessionStorage.setItem(K_ADMIN, JSON.stringify({ em: Date.now(), exp: Date.now() + 12 * 3600_000 }));
  return { ok: true, sessao: r.sessao };
}

/** painel liberado só com sessão de admin viva no banco */
export function adminLogado(): boolean {
  const s = sessaoAtual();
  if (!s || s.papel !== 'admin') return false;
  try {
    const marca = JSON.parse(sessionStorage.getItem(K_ADMIN) ?? 'null') as { exp?: number } | null;
    return !!marca && (marca.exp ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/** confirma no servidor (usado ao abrir o painel) */
export async function conferirAdmin(): Promise<boolean> {
  const s = await atualizarSessao();
  return !!s && s.papel === 'admin';
}

export function sairAdmin(): void {
  sessionStorage.removeItem(K_ADMIN);
  sair();
}
