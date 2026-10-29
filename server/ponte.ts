/**
 * PONTE NETLIFY → VERCEL
 * ------------------------------------------------------------
 * As 5 funções do editor foram escritas no padrão Web (Request → Response)
 * e rodam na Netlify. A Vercel usa Node (IncomingMessage → ServerResponse).
 * Em vez de duplicar a lógica (e correr o risco de as duas versões divergirem),
 * esta ponte converte o pedido da Vercel em `Request`, chama a MESMA função da
 * Netlify e devolve a resposta. Uma lógica, dois hosts.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

type FuncaoWeb = (req: Request) => Promise<Response>;

const metodosComCorpo = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** corpo cru do pedido (a Vercel pode entregar já convertido em objeto) */
const corpoCru = (req: VercelRequest): string | undefined => {
  if (!metodosComCorpo.has((req.method ?? 'GET').toUpperCase())) return undefined;
  const b = (req as unknown as { body?: unknown }).body;
  if (b === undefined || b === null) return undefined;
  if (typeof b === 'string') return b;
  if (Buffer.isBuffer(b)) return b.toString('utf8');
  return JSON.stringify(b);
};

export async function responder(
  req: VercelRequest,
  res: VercelResponse,
  funcao: FuncaoWeb,
): Promise<void> {
  const host = (req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost') as string;
  const proto = (req.headers['x-forwarded-proto'] ?? 'https') as string;
  const url = `${proto}://${host}${req.url ?? '/'}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else headers.set(k, String(v));
  }

  const init: RequestInit & { duplex?: 'half' } = {
    method: (req.method ?? 'GET').toUpperCase(),
    headers,
    body: corpoCru(req),
  };
  if (init.body) init.duplex = 'half';

  let resposta: Response;
  try {
    resposta = await funcao(new Request(url, init));
  } catch (e) {
    res.status(500).json({ ok: false, erro: `função falhou: ${(e as Error).message}` });
    return;
  }

  res.status(resposta.status);
  resposta.headers.forEach((valor, chave) => {
    // a Vercel já calcula compressão/transferência
    if (['content-encoding', 'content-length', 'transfer-encoding'].includes(chave)) return;
    res.setHeader(chave, valor);
  });
  const bytes = Buffer.from(await resposta.arrayBuffer());
  res.end(bytes);
}
