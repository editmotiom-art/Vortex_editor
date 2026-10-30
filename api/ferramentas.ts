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
 * FERRAMENTAS DE SERVIDOR
 * POST /.netlify/functions/ferramentas   { acao: 'voz' | 'texto' | 'skill' }
 * ------------------------------------------------------------
 * Existe porque o navegador não pode falar direto com o Google tradutor
 * (CORS), nem baixar zip de outro domínio, nem guardar chave de API. Aqui
 * roda no servidor da Netlify, sem guardar nada.
 *
 *  · voz   → texto vira MP3 (Google TTS grátis, ElevenLabs ou endpoint próprio)
 *  · texto → gerador de roteiro/prompt (API do painel compatível com OpenAI,
 *            ou Pollinations aberto, sem chave)
 *  · skill → baixa um pacote .zip/.md de skill e devolve o texto do SKILL.md
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST,OPTIONS',
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
  });

/* ============================================================
   1. VOZ
   ============================================================ */

/** o Google TTS aceita ~200 caracteres por chamada — fatia por frase */
const fatiar = (texto: string, limite = 190): string[] => {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= limite) return [limpo];
  const partes: string[] = [];
  let atual = '';
  for (const frase of limpo.split(/(?<=[.!?…;:])\s+/)) {
    if ((atual + ' ' + frase).trim().length <= limite) {
      atual = (atual + ' ' + frase).trim();
      continue;
    }
    if (atual) partes.push(atual);
    if (frase.length <= limite) {
      atual = frase;
      continue;
    }
    // frase enorme: quebra por palavra
    let pedaco = '';
    for (const palavra of frase.split(' ')) {
      if ((pedaco + ' ' + palavra).trim().length > limite) {
        partes.push(pedaco.trim());
        pedaco = palavra;
      } else {
        pedaco = (pedaco + ' ' + palavra).trim();
      }
    }
    atual = pedaco;
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes.filter(Boolean);
};

const googleTts = async (texto: string, idioma: string, velocidade: number) => {
  const pedacos = fatiar(texto);
  const audios: Uint8Array[] = [];
  for (const [i, pedaco] of pedacos.entries()) {
    const url =
      'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob' +
      `&tl=${encodeURIComponent(idioma)}&ttsspeed=${velocidade < 0.95 ? '0.9' : '1'}` +
      `&q=${encodeURIComponent(pedaco)}&total=${pedacos.length}&idx=${i}&textlen=${pedaco.length}`;
    const r = await fetch(url, {
      headers: {
        'user-agent': UA,
        referer: 'https://translate.google.com/',
        accept: 'audio/mpeg,*/*',
      },
    });
    if (!r.ok) throw new Error(`Google TTS respondeu ${r.status}`);
    const bruto = new Uint8Array(await r.arrayBuffer());
    if (bruto.byteLength < 500) throw new Error('Google TTS devolveu áudio vazio');
    audios.push(bruto);
  }
  // MP3 em sequência toca emendado em qualquer player
  const total = audios.reduce((n, a) => n + a.byteLength, 0);
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const a of audios) {
    saida.set(a, pos);
    pos += a.byteLength;
  }
  return saida;
};

const elevenTts = async (texto: string, voz: string, chave: string) => {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz || '21m00Tcm4TlvDq8ikWAM')}`, {
    method: 'POST',
    headers: { 'xi-api-key': chave, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: texto,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!r.ok) throw new Error(`ElevenLabs respondeu ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
};

const proprioTts = async (texto: string, voz: string, idioma: string, chave: string, template: string) => {
  const url = template
    .replace('{texto}', encodeURIComponent(texto))
    .replace('{voz}', encodeURIComponent(voz))
    .replace('{idioma}', encodeURIComponent(idioma))
    .replace('{chave}', encodeURIComponent(chave));
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  if (!r.ok) throw new Error(`seu endpoint respondeu ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
};

async function acaoVoz(corpo: Record<string, unknown>): Promise<Response> {
  const texto = String(corpo.texto ?? '').trim();
  if (!texto) return json({ ok: false, erro: 'texto vazio' }, 400);
  const idioma = String(corpo.idioma ?? 'pt-BR');
  const voz = String(corpo.voz ?? '');
  const velocidade = Number(corpo.velocidade ?? 1) || 1;
  const provedor = String(corpo.provedor ?? 'google');
  const chave = String(corpo.chave ?? '');
  const urlTemplate = String(corpo.urlTemplate ?? '');

  try {
    let audio: Uint8Array;
    if (provedor === 'elevenlabs' && chave) audio = await elevenTts(texto, voz, chave);
    else if (provedor === 'proprio' && urlTemplate) audio = await proprioTts(texto, voz, idioma, chave, urlTemplate);
    else audio = await googleTts(texto, idioma, velocidade);

    return new Response(audio, {
      status: 200,
      headers: {
        ...CORS,
        'content-type': 'audio/mpeg',
        'content-length': String(audio.byteLength),
        'cache-control': 'no-store',
      },
    });
  } catch (e) {
    return json({ ok: false, erro: (e as Error).message }, 502);
  }
}

/* ============================================================
   2. TEXTO (gerador de roteiro/prompt)
   ============================================================ */

const modelosGratis = ['openai-fast'];

/**
 * O Pollinations devolve 402 para chamadas sem referrer identificado (proteção
 * contra abuso). Mandar `referrer` + cabeçalho Referer libera o uso anônimo.
 */
const REFERRER = 'vortex-editor.netlify.app';

async function pollinations(prompt: string, sistema: string): Promise<string> {
  let ultimo = '';
  for (const modelo of modelosGratis) {
    const url =
      `https://text.pollinations.ai/${encodeURIComponent(prompt)}` +
      `?model=${modelo}&seed=${Date.now() % 99999}&referrer=${encodeURIComponent(REFERRER)}`;
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': UA, accept: 'text/plain', referer: `https://${REFERRER}/` },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) {
        ultimo = `Pollinations ${r.status}`;
        continue;
      }
      let texto = (await r.text()).trim();
      if (!texto || texto.startsWith('{') || texto.length < 40) {
        ultimo = 'resposta curta ou JSON (modelo ocupado)';
        continue;
      }
      if (sistema.trim()) {
        // reforça a persona da skill já na resposta livre
        const r2 = await fetch(
          `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${modelo}&referrer=${encodeURIComponent(REFERRER)}`,
          {
            headers: { 'user-agent': UA, accept: 'text/plain', referer: `https://${REFERRER}/` },
            signal: AbortSignal.timeout(12000),
          },
        );
        if (r2.ok) {
          const t2 = (await r2.text()).trim();
          if (t2.length > 40) texto = t2;
        }
      }
      return texto;
    } catch (e) {
      ultimo = (e as Error).message;
    }
  }
  throw new Error(ultimo || 'motor gratuito não respondeu');
}

/**
 * 2º caminho: mesma API do Pollinations no formato OpenAI (/openai/v1).
 * Como o app roda em navegador, a chamada vai direto do cliente (CORS livre)
 * — aqui o servidor também usa como reserva.
 */
const pollinationsOpenAI = async (prompt: string, sistema: string): Promise<string> => {
  const r = await fetch('https://text.pollinations.ai/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'openai-fast',
      messages: [
        ...(sistema ? [{ role: 'system', content: sistema }] : []),
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(14000),
  });
  if (!r.ok) throw new Error(`Pollinations OpenAI ${r.status}`);
  const d = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const texto = d.choices?.[0]?.message?.content?.trim() ?? '';
  if (!texto) throw new Error('Pollinations OpenAI devolveu vazio');
  return texto;
};

const apiCompativel = async (corpo: Record<string, unknown>, prompt: string, sistema: string) => {
  const chave = String(corpo.chave ?? '');
  const base = String(corpo.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const modelo = String(corpo.modelo ?? 'gpt-4o-mini');
  if (!chave) throw new Error('sem chave no painel');
  const r = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${chave}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.8,
      messages: [
        ...(sistema ? [{ role: 'system', content: sistema }] : []),
        { role: 'user', content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(`sua API respondeu ${r.status}`);
  const dados = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  const texto = dados.choices?.[0]?.message?.content?.trim() ?? '';
  if (!texto) throw new Error('sua API devolveu vazio');
  return texto;
};

async function acaoTexto(corpo: Record<string, unknown>): Promise<Response> {
  // prompt curto = resposta rápida: modelos abertos demoram com texto enorme
  const prompt = String(corpo.prompt ?? '').trim().slice(0, 1800);
  const sistema = String(corpo.sistema ?? '').trim().slice(0, 1500);
  if (!prompt) return json({ ok: false, erro: 'prompt vazio' }, 400);

  try {
    const texto = await apiCompativel(corpo, prompt, sistema);
    return json({ ok: true, texto, fonte: 'api' });
  } catch (eApi) {
    // formato OpenAI (devolve JSON limpo) e, se falhar, o clássico texto puro
    try {
      const texto = await pollinationsOpenAI(prompt, sistema);
      return json({ ok: true, texto, fonte: 'pollinations' });
    } catch (eOpenAI) {
      try {
        const texto = await pollinations(prompt, sistema);
        return json({ ok: true, texto, fonte: 'pollinations' });
      } catch (e) {
        const detalhe = `${(eOpenAI as Error).message} · ${(e as Error).message}`;
        const limite = /402|FREE_LIMIT|limite/i.test(detalhe);
        return json(
          {
            ok: false,
            erro: limite
              ? 'O motor grátis aceita 1 resposta a cada 30 segundos. Espere 30 s e tente de novo (ou coloque uma chave grátis do Groq no painel → IA).'
              : `API do painel: ${(eApi as Error).message} · motor gratuito: ${detalhe}`,
            limite,
          },
          502,
        );
      }
    }
  }
}

/* ============================================================
   3. SKILL (baixa zip/md e devolve o texto)
   ============================================================ */

const textoDeZip = async (buffer: Uint8Array): Promise<{ nome: string; texto: string } | null> => {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  // varre o diretório central do ZIP
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 66000); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const total = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  for (let n = 0; n < total; n += 1) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const metodo = view.getUint16(p + 10, true);
    const comprimido = view.getUint32(p + 20, true);
    const tamNome = view.getUint16(p + 28, true);
    const tamExtra = view.getUint16(p + 30, true);
    const tamComent = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(buffer.subarray(p + 46, p + 46 + tamNome));
    p += 46 + tamNome + tamExtra + tamComent;
    if (!/skill\.md$/i.test(nome) && !/\.md$/i.test(nome)) continue;
    // cabeçalho local
    const nOff = view.getUint16(local + 26, true);
    const eOff = view.getUint16(local + 28, true);
    const inicio = local + 30 + nOff + eOff;
    const dados = buffer.subarray(inicio, inicio + comprimido);
    let texto = '';
    if (metodo === 0) {
      texto = new TextDecoder().decode(dados);
    } else if (metodo === 8) {
      const ds = new DecompressionStream('deflate-raw');
      const des = new Response(dados.slice().buffer as ArrayBuffer).body!.pipeThrough(ds);
      texto = await new Response(des).text();
    } else {
      continue;
    }
    return { nome, texto };
  }
  return null;
};

async function acaoSkill(corpo: Record<string, unknown>): Promise<Response> {
  const url = String(corpo.url ?? '').trim();
  if (!/^https?:\/\/.+/i.test(url)) return json({ ok: false, erro: 'link inválido' }, 400);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(45000) });
    if (!r.ok) return json({ ok: false, erro: `o site respondeu ${r.status}` }, 502);
    const tipo = r.headers.get('content-type') ?? '';
    const nome = decodeURIComponent(url.split('/').pop() ?? 'skill');

    if (/zip|octet-stream/i.test(tipo) || /\.zip$/i.test(url)) {
      const zip = new Uint8Array(await r.arrayBuffer());
      if (zip.byteLength > 12_000_000) return json({ ok: false, erro: 'pacote grande demais (12 MB)' }, 413);
      const lido = await textoDeZip(zip);
      if (!lido) return json({ ok: false, erro: 'o zip não tem SKILL.md' }, 422);
      return json({
        ok: true,
        nome: lido.nome.split('/').pop() ?? nome,
        arquivos: [{ nome: lido.nome, texto: lido.texto.slice(0, 24000) }],
      });
    }

    const texto = (await r.text()).slice(0, 24000);
    if (texto.length < 40) return json({ ok: false, erro: 'o arquivo veio vazio' }, 422);
    return json({ ok: true, nome, arquivos: [{ nome, texto }] });
  } catch (e) {
    return json({ ok: false, erro: (e as Error).message }, 502);
  }
}

/* ============================================================
   roteador
   ============================================================ */

const funcao = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, erro: 'use POST' }, 405);

  let corpo: Record<string, unknown> = {};
  try {
    corpo = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, erro: 'corpo inválido' }, 400);
  }

  const acao = String(corpo.acao ?? '');
  if (acao === 'voz') return acaoVoz(corpo);
  if (acao === 'texto') return acaoTexto(corpo);
  if (acao === 'skill') return acaoSkill(corpo);
  return json({ ok: false, erro: 'ação desconhecida (use voz, texto ou skill)' }, 400);
};

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  await responder(req, res, funcao);
}
