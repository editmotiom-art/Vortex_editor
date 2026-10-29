/**
 * ENDEREÇO DAS FUNÇÕES DE SERVIDOR
 * ------------------------------------------------------------
 * O editor não fala mais direto com `/.netlify/functions/…`: ele pergunta
 * aqui onde a API está. Assim dá para trocar de host (Netlify, Cloudflare
 * Worker, Vercel, servidor próprio) sem tocar em nenhuma tela.
 *
 * Ordem usada por `urlFuncao()`:
 *   1. URL configurada no painel (Admin → Sistema → URL da API)
 *   2. variável de build VITE_API_URL (arquivo .env)
 *   3. mesma origem, `/.netlify/functions/<nome>` (mantém o que já funciona)
 *
 * `chamarFuncao()` tenta a API configurada e, se ela não responder, cai
 * automaticamente na Netlify — nada deixa de funcionar por causa da migração.
 */

import { lerConfig } from './config';

const PREFIXO_NETLIFY = '/.netlify/functions';

/** base configurada (ex.: https://vortex-api.seunome.workers.dev) ou '' */
export const baseApi = (): string => {
  const doPainel = (lerConfig().api?.url ?? '').trim();
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const doBuild = (env.VITE_API_URL ?? '').trim();
  return (doPainel || doBuild).replace(/\/+$/, '');
};

/** URL final de uma função (drive, proxy, ferramentas, ia, minerar) */
export const urlFuncao = (nome: string, params?: Record<string, string>): string => {
  const base = baseApi();
  const raiz = base ? `${base}/api/${nome}` : `${PREFIXO_NETLIFY}/${nome}`;
  if (!params) return raiz;
  const q = new URLSearchParams(params).toString();
  return `${raiz}?${q}`;
};

export const apiConfigurada = (): boolean => baseApi().length > 0;

/** marca no localStorage para o painel saber quando a API externa já respondeu */
const K_SAUDE = 'vortex.api.saude';

export interface SaudeApi {
  em: number;
  ok: boolean;
  versao?: string;
  erro?: string;
}

export const lerSaudeApi = (): SaudeApi | null => {
  try {
    return JSON.parse(localStorage.getItem(K_SAUDE) ?? 'null') as SaudeApi | null;
  } catch {
    return null;
  }
};

/** testa /api/ping da API configurada (usado no painel) */
export const testarApi = async (url = baseApi()): Promise<SaudeApi> => {
  if (!url) {
    const r: SaudeApi = { em: Date.now(), ok: true, versao: 'netlify (mesma origem)' };
    localStorage.setItem(K_SAUDE, JSON.stringify(r));
    return r;
  }
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/api/ping`, { signal: AbortSignal.timeout(12000) });
    const dados = (await res.json().catch(() => ({}))) as { ok?: boolean; versao?: string; erro?: string };
    const r: SaudeApi = { em: Date.now(), ok: Boolean(res.ok && dados.ok), versao: dados.versao, erro: dados.erro };
    localStorage.setItem(K_SAUDE, JSON.stringify(r));
    return r;
  } catch (e) {
    const r: SaudeApi = { em: Date.now(), ok: false, erro: (e as Error).message };
    localStorage.setItem(K_SAUDE, JSON.stringify(r));
    return r;
  }
};

/** fetch com reserva: tenta a API configurada e, se falhar, a Netlify */
export async function chamarFuncao(caminho: string, init?: RequestInit): Promise<Response> {
  const base = baseApi();
  const netlify = `${PREFIXO_NETLIFY}/${caminho}`;
  if (!base) return fetch(netlify, init);
  try {
    const res = await fetch(`${base}/api/${caminho}`, init);
    if (res.status < 500) return res;
  } catch {
    /* rede/host fora → usa a Netlify */
  }
  return fetch(netlify, init);
}

/**
 * Deixa a sessão de testes/produção coerente com a URL configurada.
 * (O painel já faz isso ao salvar; aqui é o mesmo efeito, para scripts e testes.)
 */
export const aplicarApiSalva = (): void => {
  const url = baseApi();
  const saude = lerSaudeApi();
  // nada a fazer além de garantir que a saúde antiga não engane o painel
  if (!url && saude && !/netlify/.test(saude.versao ?? '') && saude.ok) {
    localStorage.removeItem(K_SAUDE);
  }
};
