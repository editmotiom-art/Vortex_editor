/**
 * CONTAS E SESSÃO
 * ------------------------------------------------------------
 * Camada de autenticação do Vortex.
 *
 * Hoje roda 100% no navegador (localStorage + WebCrypto):
 *  - senha nunca é guardada, só o hash SHA-256 com sal aleatório
 *  - sessão expira em 30 dias
 *  - quando o Supabase for ligado, esta camada vira a ponte para ele
 *    (as funções abaixo têm a mesma assinatura de um cliente de auth)
 */

const CHAVE_CONTAS = 'vortex.contas.v1';
const CHAVE_SESSAO = 'vortex.sessao.v1';
const DIAS_SESSAO = 30;

export type Plano = 'free' | 'pro' | 'studio';

export interface Conta {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  sal: string;
  plano: Plano;
  criadoEm: number;
  planoDesde?: number;
}

export interface Sessao {
  contaId: string;
  nome: string;
  email: string;
  plano: Plano;
  expiraEm: number;
}

/* ---------------- criptografia ---------------- */

const aleatorio = (n = 16): string => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};

const hash = async (senha: string, sal: string): Promise<string> => {
  const dados = new TextEncoder().encode(`${sal}::${senha}::vortex`);
  const buf = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');
};

/* ---------------- armazenamento ---------------- */

const lerContas = (): Conta[] => {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_CONTAS) ?? '[]');
    return Array.isArray(v) ? (v as Conta[]) : [];
  } catch {
    return [];
  }
};

const gravarContas = (c: Conta[]): void => localStorage.setItem(CHAVE_CONTAS, JSON.stringify(c));

const abrirSessao = (c: Conta): Sessao => {
  const s: Sessao = {
    contaId: c.id,
    nome: c.nome,
    email: c.email,
    plano: c.plano,
    expiraEm: Date.now() + DIAS_SESSAO * 864e5,
  };
  localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s));
  return s;
};

/* ---------------- API ---------------- */

export const sessaoAtual = (): Sessao | null => {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) ?? 'null') as Sessao | null;
    if (!s || !s.contaId) return null;
    if (s.expiraEm < Date.now()) {
      localStorage.removeItem(CHAVE_SESSAO);
      return null;
    }
    // mantém o plano sincronizado com a conta
    const conta = lerContas().find((c) => c.id === s.contaId);
    return conta ? { ...s, plano: conta.plano, nome: conta.nome } : null;
  } catch {
    return null;
  }
};

export const criarConta = async (
  nome: string,
  email: string,
  senha: string,
): Promise<{ ok: boolean; erro?: string; sessao?: Sessao }> => {
  const nomeLimpo = nome.trim();
  const emailLimpo = email.trim().toLowerCase();

  if (nomeLimpo.length < 2) return { ok: false, erro: 'Digite seu nome' };
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(emailLimpo)) return { ok: false, erro: 'E-mail inválido' };
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa de pelo menos 6 caracteres' };

  const contas = lerContas();
  if (contas.some((c) => c.email === emailLimpo)) {
    return { ok: false, erro: 'Já existe uma conta com esse e-mail. Faça login.' };
  }

  const sal = aleatorio();
  const conta: Conta = {
    id: aleatorio(8),
    nome: nomeLimpo,
    email: emailLimpo,
    senhaHash: await hash(senha, sal),
    sal,
    plano: 'free',
    criadoEm: Date.now(),
  };
  gravarContas([...contas, conta]);
  return { ok: true, sessao: abrirSessao(conta) };
};

export const entrar = async (
  email: string,
  senha: string,
): Promise<{ ok: boolean; erro?: string; sessao?: Sessao }> => {
  const emailLimpo = email.trim().toLowerCase();
  const conta = lerContas().find((c) => c.email === emailLimpo);
  if (!conta) return { ok: false, erro: 'Não encontrei uma conta com esse e-mail' };

  const h = await hash(senha, conta.sal);
  if (h !== conta.senhaHash) return { ok: false, erro: 'Senha incorreta' };

  return { ok: true, sessao: abrirSessao(conta) };
};

export const sair = (): void => localStorage.removeItem(CHAVE_SESSAO);

export const mudarPlano = (contaId: string, plano: Plano): void => {
  const contas = lerContas().map((c) =>
    c.id === contaId ? { ...c, plano, planoDesde: plano === 'pro' ? Date.now() : undefined } : c,
  );
  gravarContas(contas);
  const s = sessaoAtual();
  if (s && s.contaId === contaId) {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ ...s, plano }));
  }
};

export const apagarConta = (contaId: string): void => {
  gravarContas(lerContas().filter((c) => c.id !== contaId));
  sair();
};

export const totalContas = (): number => lerContas().length;

/** lista completa para o painel administrativo */
export const listarContas = (): Conta[] => lerContas();

/** admin troca o plano de um cliente */
export const setPlanoConta = (id: string, plano: Plano): void => mudarPlano(id, plano);

/** admin remove um cliente */
export const excluirConta = (id: string): void => {
  gravarContas(lerContas().filter((c) => c.id !== id));
};
