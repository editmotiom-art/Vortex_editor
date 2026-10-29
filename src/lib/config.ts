/**
 * CONFIGURAÇÃO DO SISTEMA
 * ------------------------------------------------------------
 * Tudo que o painel administrativo controla fica aqui:
 *  - chave de acesso do admin (editável)
 *  - integração de IA (chave, modelos, provedor)
 *  - pagamento (Mercado Pago / Stripe / manual)
 *  - planos e preços
 *
 * Persistido em localStorage. Quando o Supabase entrar, estas
 * mesmas chaves passam a vir da tabela `settings`.
 */

const K = 'vortex.config.v1';

export interface ConfigIA {
  ativo: boolean;
  provedor: 'openai' | 'gemini' | 'stability' | 'custom';
  chave: string;
  modeloImagem: string;
  modeloVideo: string;
  modeloTexto: string;
  endpoint: string;
  limiteDiario: number;
}

export interface ConfigPagamento {
  provedor: 'nenhum' | 'mercadopago' | 'stripe' | 'manual';
  chavePublica: string;
  chaveSecreta: string;
  urlCheckout: string;
  dias_teste: number;
  pixAtivo: boolean;
  cartaoAtivo: boolean;
}

export interface Plano {
  id: 'free' | 'pro' | 'studio';
  nome: string;
  preco: number;
  periodo: string;
  destaque: boolean;
  ativo: boolean;
  itens: string[];
  exportMax: number;
}

export interface Config {
  versao: number;
  nomeApp: string;
  emailSuporte: string;
  admin: { usuario: string; senhaHash: string; sal: string };
  ia: ConfigIA;
  pagamento: ConfigPagamento;
  planos: Plano[];
  manutencao: boolean;
}

/* ---------------- criptografia ---------------- */

export const gerarSal = (n = 12): string => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};

export const hashSenha = async (senha: string, sal: string): Promise<string> => {
  const dados = new TextEncoder().encode(`${sal}::${senha}::vortex-admin`);
  const buf = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');
};

/* ---------------- padrão ---------------- */

/** credencial inicial do administrador: admin / vortex2026 */
const SENHA_PADRAO = 'vortex2026';
export const ADMIN_USUARIO_INICIAL = 'admin';
const SAL_PADRAO = 'a1b2c3d4e5f60718';

const PADRAO: Config = {
  versao: 1,
  nomeApp: 'Vortex',
  emailSuporte: 'editmotiom@gmail.com',
  admin: { usuario: ADMIN_USUARIO_INICIAL, senhaHash: '', sal: SAL_PADRAO },
  ia: {
    ativo: false,
    provedor: 'openai',
    chave: '',
    modeloImagem: 'gpt-image-1',
    modeloVideo: '',
    modeloTexto: 'gpt-4o-mini',
    endpoint: '',
    limiteDiario: 20,
  },
  pagamento: {
    provedor: 'nenhum',
    chavePublica: '',
    chaveSecreta: '',
    urlCheckout: '',
    dias_teste: 7,
    pixAtivo: true,
    cartaoAtivo: true,
  },
  planos: [
    {
      id: 'free',
      nome: 'Free',
      preco: 0,
      periodo: 'para sempre',
      destaque: false,
      ativo: true,
      exportMax: 720,
      itens: [
        'Editor completo',
        'Biblioteca básica (templates e formas)',
        'Export até 720p',
        '1 projeto por vez',
      ],
    },
    {
      id: 'pro',
      nome: 'Pro',
      preco: 29.9,
      periodo: 'por mês',
      destaque: true,
      ativo: true,
      exportMax: 2160,
      itens: [
        'Tudo do Free',
        'Todos os packs (SFX, música, overlays, templates)',
        'Export 1080p/4K sem marca',
        'Projetos ilimitados',
        'IA de imagem e vídeo',
        'Templates novos todo mês',
      ],
    },
    {
      id: 'studio',
      nome: 'Studio',
      preco: 79.9,
      periodo: 'por mês',
      destaque: false,
      ativo: true,
      exportMax: 4320,
      itens: [
        'Tudo do Pro',
        '5 membros na equipe',
        '200 gerações de IA por mês',
        'Suporte prioritário',
        'Marca própria nos exports',
      ],
    },
  ],
  manutencao: false,
};

/* ---------------- leitura / escrita ---------------- */

let cache: Config | null = null;

export const lerConfig = (): Config => {
  if (cache) return cache;
  try {
    const cru = localStorage.getItem(K);
    if (!cru) {
      cache = { ...PADRAO };
      return cache;
    }
    const salvo = JSON.parse(cru) as Partial<Config>;
    // merge defensivo (versões antigas ganham campos novos)
    cache = {
      ...PADRAO,
      ...salvo,
      admin: { ...PADRAO.admin, ...(salvo.admin ?? {}) },
      ia: { ...PADRAO.ia, ...(salvo.ia ?? {}) },
      pagamento: { ...PADRAO.pagamento, ...(salvo.pagamento ?? {}) },
      planos: salvo.planos?.length ? salvo.planos : PADRAO.planos,
    };
    return cache;
  } catch {
    cache = { ...PADRAO };
    return cache;
  }
};

export const gravarConfig = (c: Config): void => {
  cache = c;
  localStorage.setItem(K, JSON.stringify(c));
};

export const configPadrao = (): Config => ({ ...PADRAO });

/** garante que a senha padrão do admin exista na primeira execução */
export const garantirAdmin = async (): Promise<void> => {
  const c = lerConfig();
  if (!c.admin.senhaHash) {
    c.admin.senhaHash = await hashSenha(SENHA_PADRAO, c.admin.sal);
    gravarConfig(c);
  }
};

export const SENHA_ADMIN_INICIAL = SENHA_PADRAO;

/* ---------------- sessão do admin ---------------- */

const K_ADMIN = 'vortex.admin.sessao.v1';

export const entrarAdmin = async (usuario: string, senha: string): Promise<{ ok: boolean; erro?: string }> => {
  await garantirAdmin();
  const c = lerConfig();
  if (usuario.trim().toLowerCase() !== c.admin.usuario.toLowerCase()) {
    return { ok: false, erro: 'Usuário não encontrado' };
  }
  const h = await hashSenha(senha, c.admin.sal);
  if (h !== c.admin.senhaHash) return { ok: false, erro: 'Senha incorreta' };
  sessionStorage.setItem(K_ADMIN, JSON.stringify({ em: Date.now(), exp: Date.now() + 12 * 3600_000 }));
  return { ok: true };
};

export const adminLogado = (): boolean => {
  try {
    const s = JSON.parse(sessionStorage.getItem(K_ADMIN) ?? 'null');
    return !!s && s.exp > Date.now();
  } catch {
    return false;
  }
};

export const sairAdmin = (): void => sessionStorage.removeItem(K_ADMIN);

export const trocarCredenciais = async (
  usuario: string,
  senhaNova: string,
): Promise<{ ok: boolean; erro?: string }> => {
  if (usuario.trim().length < 3) return { ok: false, erro: 'Usuário precisa ter 3 caracteres ou mais' };
  if (senhaNova.length < 6) return { ok: false, erro: 'A senha precisa de 6 caracteres ou mais' };
  const c = lerConfig();
  const sal = gerarSal();
  c.admin = { usuario: usuario.trim(), sal, senhaHash: await hashSenha(senhaNova, sal) };
  gravarConfig(c);
  return { ok: true };
};

/* ---------------- teste de conectividade da IA ---------------- */

export const testarIA = async (): Promise<{ ok: boolean; msg: string }> => {
  const { ia } = lerConfig();
  if (!ia.ativo) return { ok: false, msg: 'Integração desativada' };
  if (!ia.chave) return { ok: false, msg: 'Nenhuma chave configurada' };
  if (ia.provedor === 'custom') {
    return { ok: !!ia.endpoint, msg: ia.endpoint ? 'Endpoint configurado (teste real ao gerar)' : 'Informe o endpoint' };
  }
  try {
    const url =
      ia.provedor === 'openai'
        ? 'https://api.openai.com/v1/models'
        : ia.provedor === 'gemini'
          ? `https://generativelanguage.googleapis.com/v1beta/models?key=${ia.chave}`
          : 'https://api.stability.ai/v1/user/account';
    const res = await fetch(url, {
      headers:
        ia.provedor === 'gemini'
          ? {}
          : { Authorization: `Bearer ${ia.chave}` },
    });
    return res.ok
      ? { ok: true, msg: `Conectado (${ia.provedor})` }
      : { ok: false, msg: `A API respondeu ${res.status} — confira a chave` };
  } catch {
    return { ok: false, msg: 'Não foi possível falar com a API (rede/CORS)' };
  }
};

export const testarPagamento = (): { ok: boolean; msg: string } => {
  const { pagamento } = lerConfig();
  if (pagamento.provedor === 'nenhum') return { ok: false, msg: 'Nenhum provedor escolhido' };
  if (pagamento.provedor === 'manual') return { ok: true, msg: 'Modo manual (PIX/transferência) ativo' };
  if (!pagamento.chavePublica) return { ok: false, msg: 'Falta a chave pública' };
  return { ok: true, msg: `Configurado para ${pagamento.provedor}` };
};

/* ---------------- planos prontos para a interface ---------------- */

export interface PlanoView {
  id: 'free' | 'pro' | 'studio';
  nome: string;
  preco: number;
  periodo: string;
  destaque: boolean;
  exportMax: number;
  itens: string[];
  descricao: string;
}

export const PLANOS: PlanoView[] = lerConfig().planos.map((p) => ({
  id: p.id as PlanoView['id'],
  nome: p.nome,
  preco: p.preco,
  periodo: p.periodo,
  destaque: p.destaque,
  exportMax: p.exportMax,
  itens: p.itens,
  descricao: p.itens.slice(0, 2).join(' · '),
}));

export const botoesPlano = (p: { preco: number; periodo: string }): string =>
  p.preco === 0 ? 'Grátis' : `R$ ${p.preco.toFixed(2).replace('.', ',')} ${p.periodo}`;
