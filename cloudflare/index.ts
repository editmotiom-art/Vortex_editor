/**
 * VORTEX · API em Cloudflare Worker (plano gratuito)
 * ------------------------------------------------------------
 * Por que existe: a Netlify bloqueou novos deploys ("credit usage exceeded").
 * Este Worker faz exatamente o que as funções da Netlify faziam — mesmos
 * caminhos, mesmas respostas — então o editor não muda uma linha.
 *
 *   GET  /api/drive?pasta=ID        → { ok, arquivos[], pastas[] }
 *   GET  /api/proxy?url=...         → bytes com CORS liberado
 *   POST /api/ferramentas           → { acao: 'voz' | 'texto' | 'skill' }
 *   POST /api/ia                    → imagem/texto com a chave do painel
 *   GET  /api/minerar?url=...       → imagens/vídeos de uma página
 *   GET  /api/ping                  → { ok, versao } (diagnóstico)
 *
 * PUBLICAR (uma vez, no seu computador):
 *   cd vortex/cloudflare
 *   npm i -g wrangler        (ou use npx wrangler)
 *   npx wrangler login
 *   npx wrangler deploy
 * No fim o Wrangler imprime a URL, ex.: https://vortex-api.SEUNOME.workers.dev
 * Cole essa URL em Admin → Sistema → URL da API. Pronto: voz, texto, skills,
 * Drive e proxy voltam a funcionar sem depender da Netlify.
 */

import { handleDrive } from './drive.js';
import { handleProxy } from './proxy.js';
import { handleFerramentas } from './ferramentas.js';
import { handleIa } from './ia.js';
import { handleMinerar } from './minerar.js';

const VERSAO = '2026-10-29';

const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-max-age': '86400',
};

const comCors = (resp: Response): Response => {
  const headers = new Headers(resp.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(resp.body, { status: resp.status, headers });
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
  });

export default {
  async fetch(req: Request, env: Record<string, string>): Promise<Response> {
    const url = new URL(req.url);
    // aceita /api/xxx e /xxx (quem chamar de qualquer jeito acerta)
    const rota = url.pathname.replace(/^\/api\/?/, '/').replace(/\/+$/, '') || '/';

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    try {
      if (rota === '/' || rota === '/ping') {
        return json({
          ok: true,
          servico: 'vortex-api',
          versao: VERSAO,
          rotas: ['/api/drive', '/api/proxy', '/api/ferramentas', '/api/ia', '/api/minerar'],
        });
      }
      if (rota === '/drive') return comCors(await handleDrive(req));
      if (rota === '/proxy') return comCors(await handleProxy(req));
      if (rota === '/ferramentas') return comCors(await handleFerramentas(req));
      if (rota === '/ia') return comCors(await handleIa(req, env));
      if (rota === '/minerar') return comCors(await handleMinerar(req));
      return json({ ok: false, erro: `rota desconhecida: ${rota}` }, 404);
    } catch (e) {
      return json({ ok: false, erro: (e as Error).message }, 500);
    }
  },
};
