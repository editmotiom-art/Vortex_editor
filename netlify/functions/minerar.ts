/**
 * POST /.netlify/functions/minerar   { url }
 * → { ok, pagina, itens: [...] }
 *
 * Lê uma página pública e devolve as mídias encontradas.
 * Nada é armazenado — o download acontece no navegador do usuário.
 */
import { minerar, abs } from '../lib/minerar.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      },
    });
  }
  if (req.method !== 'POST') return json(405, { ok: false, erro: 'use POST' });

  let url = '';
  try {
    const body = await req.json();
    url = String(body?.url ?? '').trim();
  } catch {
    return json(400, { ok: false, erro: 'JSON inválido' });
  }

  if (!/^https?:\/\//i.test(url)) return json(400, { ok: false, erro: 'Endereço inválido' });
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(url)) {
    return json(400, { ok: false, erro: 'Endereço não permitido' });
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(t);

    if (!res.ok) {
      return json(200, {
        ok: false,
        erro:
          res.status === 403 || res.status === 401
            ? 'O site bloqueou a leitura automática (403). Copie o link direto do arquivo, ou use o botão “Abrir site” e arraste a mídia para o editor.'
            : `O site respondeu ${res.status}.`,
        itens: [],
      });
    }

    const html = (await res.text()).slice(0, 4_000_000);
    const base = res.url || abs(url, url);
    const itens = minerar(html, base);

    const site = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)?.[1] ?? '';
    const titulo = html.match(/<title[^>]*>([^<]{1,140})</i)?.[1]?.trim() ?? '';

    return json(200, { ok: true, pagina: base, site, titulo, total: itens.length, itens });
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'O site demorou demais para responder.' : 'Não foi possível abrir essa página.';
    return json(200, { ok: false, erro: msg, itens: [] });
  }
};
