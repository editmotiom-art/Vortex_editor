/* ==========================================================================
 * FUNÇÃO DE SERVIDOR NA VERCEL — arquivo GERADO automaticamente
 * por scripts/gerar-api-vercel.mjs a partir de netlify/functions/drive|proxy|ferramentas|ia|minerar.ts
 * A lógica é a mesma nos dois hosts (uma lógica só).
 * Não edite à mão: edite a versão da Netlify e rode o gerador.
 * ========================================================================== */

/** a função fala Request → Response; aqui ela é adaptada ao Node da Vercel */
type VercelReq = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  [k: string]: unknown;
};
type VercelRes = {
  statusCode: number;
  status: (codigo: number) => VercelRes;
  setHeader: (nome: string, valor: string) => void;
  end: (corpo?: unknown) => void;
  json: (obj: unknown) => void;
  send: (dados: unknown) => void;
  headersSent?: boolean;
};

const corpoCru = (req: VercelReq): string | undefined => {
  const metodo = (req.method ?? 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo)) return undefined;
  const b = req.body;
  if (b === undefined || b === null) return undefined;
  if (typeof b === 'string') return b;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(b)) return b.toString('utf8');
  return JSON.stringify(b);
};

/** converte o pedido da Vercel em Request padrão e escreve a resposta */
const responder = async (
  req: VercelReq,
  res: VercelRes,
  fn: (r: Request) => Promise<Response>,
): Promise<void> => {
  const h = req.headers ?? {};
  const host = String(h['x-forwarded-host'] ?? h.host ?? 'localhost');
  const proto = String(h['x-forwarded-proto'] ?? 'https');
  const url = String(req.url ?? '/');
  const cabecalhos = new Headers();
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => cabecalhos.append(k, String(x)));
    else cabecalhos.set(k, String(v));
  }
  const init: RequestInit = { method: (req.method ?? 'GET').toUpperCase(), headers: cabecalhos };
  const corpo = corpoCru(req);
  if (corpo !== undefined) init.body = corpo;

  let resposta: Response;
  try {
    resposta = await fn(new Request(proto + '://' + host + url, init));
  } catch (e) {
    res.status(500).json({ ok: false, erro: 'função falhou: ' + (e as Error).message });
    return;
  }
  res.status(resposta.status);
  resposta.headers.forEach((valor, chave) => {
    if (['content-encoding', 'content-length', 'transfer-encoding'].includes(chave)) return;
    res.setHeader(chave, valor);
  });
  res.end(Buffer.from(await resposta.arrayBuffer()));
};

/**
 * GET /.netlify/functions/proxy?url=...
 * ------------------------------------------------------------
 * Repassa o arquivo com CORS liberado, para o editor conseguir
 * ler os bytes de imagens/vídeos hospedados em sites que bloqueiam
 * o navegador (hotlink protection).
 *
 * Limite: 80 MB por arquivo. Somente leitura pública (GET).
 */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const LIMITE = 200 * 1024 * 1024; // 200 MB por arquivo

const funcao = async (req: Request): Promise<Response> => {
  const alvo = new URL(req.url).searchParams.get('url') ?? '';

  if (!/^https?:\/\//i.test(alvo)) {
    return new Response('parâmetro url obrigatório', { status: 400 });
  }
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(alvo)) {
    return new Response('endereço não permitido', { status: 400 });
  }

  try {
    const res = await fetch(alvo, {
      headers: { 'user-agent': UA, accept: '*/*', referer: new URL(alvo).origin },
    });

    if (!res.ok) return new Response(`origem respondeu ${res.status}`, { status: 502 });

    const tipo = res.headers.get('content-type') ?? 'application/octet-stream';
    if (/text\/html/i.test(tipo)) {
      return new Response('o endereço aponta para uma página, não para um arquivo', { status: 415 });
    }

    const tamanho = Number(res.headers.get('content-length') ?? 0);
    if (tamanho > LIMITE) {
      return new Response('arquivo maior que 200 MB', { status: 413 });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        'content-type': tipo,
        'access-control-allow-origin': '*',
        'cache-control': 'public, max-age=86400',
        'content-disposition': 'inline',
      },
    });
  } catch {
    return new Response('falha ao buscar o arquivo', { status: 502 });
  }
};

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  await responder(req, res, funcao);
}
