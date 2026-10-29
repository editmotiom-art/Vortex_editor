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

/**
 * Espelho estático (GitHub Pages) não roda funções: quando o site é aberto por
 * `*.github.io`, o editor usa automaticamente a API da Netlify como servidor.
 * As funções já liberam CORS `*`, então funciona de qualquer origem.
 */
export const API_ESPELHO = 'https://vortex-editor.netlify.app';

/** true quando a página está no espelho estático (sem /.netlify/functions) */
export const noEspelho = (): boolean =>
  typeof location !== 'undefined' && /(^|\.)github\.io$/.test(location.hostname);

/**
 * Tipos de servidor:
 *  · ''                → Netlify, mesma origem (/.netlify/functions/…)
 *  · '.'               → Vercel/estático, mesma origem (/api/…)
 *  · URL qualquer      → Worker/servidor próprio (/api/…)
 */
export const API_MESMA_ORIGEM_VERCEL = '.';

/** base é um Worker/servidor (rotas /api/…) em vez da Netlify (/.netlify/functions/…) */
const baseEhWorker = (b: string): boolean => {
  if (b === API_MESMA_ORIGEM_VERCEL) return true;
  if (/netlify\.(app|com)$/.test(b)) return false;
  return /workers\.dev|\/api$/.test(b) || !/netlify\.app$/.test(b);
};

/** caminho completo de uma função dentro de uma base */
export const caminhoEm = (base: string, nome: string): string => {
  if (!base) return `${PREFIXO_NETLIFY}/${nome}`;
  if (base === API_MESMA_ORIGEM_VERCEL) return `/api/${nome}`;
  return baseEhWorker(base) ? `${base}/api/${nome}` : `${base}${PREFIXO_NETLIFY}/${nome}`;
};

/**
 * Host com API própria na mesma origem: Vercel (functions /api/*) e servidor
 * local de desenvolvimento. No espelho estático (github.io) e em qualquer outro
 * host, o editor aponta para a API remota.
 */
export const apiNaMesmaOrigem = (): boolean =>
  typeof location !== 'undefined' &&
  (/\.vercel\.app$/.test(location.hostname) ||
    /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/.test(location.hostname));

/** base configurada (ex.: https://vortex-api.seunome.workers.dev) ou '' */
export const baseApi = (): string => {
  const doPainel = (lerConfig().api?.url ?? '').trim();
  // Vercel (ou dev local): as funções estão na mesma origem, em /api/…
  if (doPainel) return doPainel.replace(/\/+$/, '');
  if (apiNaMesmaOrigem()) return API_MESMA_ORIGEM_VERCEL;
  // espelho estático (GitHub Pages) não roda função → usa a API remota
  if (noEspelho()) return API_ESPELHO;
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const doBuild = (env.VITE_API_REMOTA ?? env.VITE_API_URL ?? '').trim();
  return doBuild.replace(/\/+$/, '');
};

/** URL final de uma função (drive, proxy, ferramentas, ia, minerar) */
export const urlFuncao = (nome: string, params?: Record<string, string>): string => {
  const raiz = caminhoEm(baseApi(), nome);
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
  if (url === API_MESMA_ORIGEM_VERCEL) {
    try {
      const res = await fetch('/api/ping', { signal: AbortSignal.timeout(15000) });
      const dados = (await res.json().catch(() => ({}))) as { ok?: boolean; versao?: string; host?: string };
      const r: SaudeApi = {
        em: Date.now(),
        ok: Boolean(res.ok && dados.ok),
        versao: `${dados.host ?? 'mesma origem'} ${dados.versao ?? ''}`.trim(),
      };
      localStorage.setItem(K_SAUDE, JSON.stringify(r));
      return r;
    } catch (e) {
      const r: SaudeApi = { em: Date.now(), ok: false, erro: (e as Error).message };
      localStorage.setItem(K_SAUDE, JSON.stringify(r));
      return r;
    }
  }
  if (!url) {
    const r: SaudeApi = { em: Date.now(), ok: true, versao: 'netlify (mesma origem)' };
    localStorage.setItem(K_SAUDE, JSON.stringify(r));
    return r;
  }
  try {
    const b = url.replace(/\/+$/, '');
    const alvo = b === API_MESMA_ORIGEM_VERCEL ? '/api/ping' : baseEhWorker(b)
      ? `${b}/api/ping`
      : `${b}${PREFIXO_NETLIFY}/drive?pasta=17NI-W43qk9jb5rzARXLnAAMahqrYZVWu`;
    const res = await fetch(alvo, { signal: AbortSignal.timeout(20000) });
    const dados = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      versao?: string;
      erro?: string;
      arquivos?: unknown[];
      pastas?: unknown[];
    };
    const okNetlify = res.ok && ('arquivos' in dados || 'pastas' in dados);
    const r: SaudeApi = {
      em: Date.now(),
      ok: Boolean(res.ok && (dados.ok || okNetlify)),
      versao: dados.versao ?? (okNetlify ? 'netlify (funções)' : undefined),
      erro: dados.erro,
    };
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
  const reserva = `${API_ESPELHO}${PREFIXO_NETLIFY}/${caminho}`;
  if (base === API_ESPELHO) return fetch(reserva, init);
  if (!base) return fetch(`${PREFIXO_NETLIFY}/${caminho}`, init);
  if (base === API_MESMA_ORIGEM_VERCEL) {
    try {
      const res = await fetch(`/api/${caminho}`, init);
      if (res.status < 500) return res;
    } catch {
      /* API local fora → reserva remota */
    }
    return fetch(reserva, init);
  }
  try {
    const res = await fetch(caminhoEm(base, caminho), init);
    if (res.status < 500) return res;
  } catch {
    /* host fora → usa a reserva */
  }
  return fetch(reserva, init);
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
