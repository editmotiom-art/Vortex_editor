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
 * POST /.netlify/functions/ia
 * { tipo: 'imagem' | 'texto', prompt, tamanho? }
 *
 * Gera imagem/texto por IA sem expor a chave no navegador.
 * A chave vem das variáveis de ambiente da Netlify:
 *   IA_API_KEY, IA_PROVEDOR, IA_MODELO_IMAGEM, IA_MODELO_TEXTO
 * (o painel administrativo mostra como configurar)
 */

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });

const funcao = async (req: Request): Promise<Response> => {
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

  const chave = process.env.IA_API_KEY ?? '';
  const provedor = (process.env.IA_PROVEDOR ?? 'openai').toLowerCase();

  if (!chave) {
    return json(200, {
      ok: false,
      erro:
        'IA não configurada. Na Netlify: Site settings → Environment variables → IA_API_KEY. Depois o painel administrativo libera a geração.',
      modo: 'desligado',
    });
  }

  let body: { tipo?: string; prompt?: string; tamanho?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, erro: 'JSON inválido' });
  }

  const prompt = (body.prompt ?? '').trim();
  if (prompt.length < 3) return json(400, { ok: false, erro: 'Prompt muito curto' });

  const tipo = body.tipo === 'texto' ? 'texto' : 'imagem';
  const modeloImagem = process.env.IA_MODELO_IMAGEM ?? 'gpt-image-1';
  const modeloTexto = process.env.IA_MODELO_TEXTO ?? 'gpt-4o-mini';
  const tamanho = body.tamanho === '1024x1792' || body.tamanho === '1792x1024' ? body.tamanho : '1024x1024';

  try {
    if (provedor === 'gemini') {
      const modelo = tipo === 'texto' ? modeloTexto : (process.env.IA_MODELO_IMAGEM ?? 'imagen-3.0-generate-002');
      const url =
        tipo === 'texto'
          ? `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}`
          : `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:predict?key=${chave}`;

      const corpo =
        tipo === 'texto'
          ? { contents: [{ parts: [{ text: prompt }] }] }
          : { instances: [{ prompt }], parameters: { sampleCount: 1 } };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const dados = (await res.json()) as any;
      if (!res.ok) return json(200, { ok: false, erro: dados?.error?.message ?? `Gemini ${res.status}` });

      if (tipo === 'texto') {
        const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return json(200, { ok: true, tipo: 'texto', texto });
      }
      const b64 = dados?.predictions?.[0]?.bytesBase64Encoded ?? '';
      return json(200, { ok: true, tipo: 'imagem', imagem: b64 ? `data:image/png;base64,${b64}` : '' });
    }

    /* ---------- OpenAI (padrão) ---------- */
    if (tipo === 'texto') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: modeloTexto,
          messages: [
            { role: 'system', content: 'Você ajuda a criar roteiros e descrições curtas para vídeos.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 600,
        }),
      });
      const d = (await res.json()) as any;
      if (!res.ok) return json(200, { ok: false, erro: d?.error?.message ?? `OpenAI ${res.status}` });
      return json(200, { ok: true, tipo: 'texto', texto: d?.choices?.[0]?.message?.content ?? '' });
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: modeloImagem, prompt, size: tamanho, n: 1 }),
    });
    const d = (await res.json()) as any;
    if (!res.ok) return json(200, { ok: false, erro: d?.error?.message ?? `OpenAI ${res.status}` });

    const item = d?.data?.[0];
    const imagem = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : (item?.url ?? '');
    return json(200, { ok: true, tipo: 'imagem', imagem });
  } catch (e) {
    return json(200, { ok: false, erro: `Falha na chamada: ${(e as Error).message}` });
  }
};

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  await responder(req, res, funcao);
}
