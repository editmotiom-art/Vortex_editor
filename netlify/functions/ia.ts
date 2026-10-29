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
