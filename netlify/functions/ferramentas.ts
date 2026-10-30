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
 *  · arquivo → baixa um arquivo do Drive com o tamanho conferido de verdade
 *  · imagem  → gera a imagem do pedido (motor público, do servidor, sem CORS)
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
      /* ttsspeed só aceita 0.24 e 1 — para ir mais devagar usamos o parâmetro
         'speed' (aceito pelo endpoint tw-ob) e, quando não houver, o cliente
         ajusta o playbackRate do áudio. Assim cada voz do catálogo sai de fato
         com um ritmo diferente, e não todas iguais. */
      `&tl=${encodeURIComponent(idioma)}&ttsspeed=${velocidade < 0.95 ? '0.24' : '1'}` +
      (velocidade > 1 ? `&speed=${velocidade.toFixed(2)}` : '') +
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

/* ============================================================
   CATÁLOGO DE VOZES — o que o motor realmente entrega
   ------------------------------------------------------------
   O motor gratuito (Google TTS) tem UMA voz por idioma/região. Então o
   catálogo é honesto: cada "voz" é idioma + região + velocidade, e nenhuma
   opção devolve o mesmo áudio da outra.

     Ana     pt-BR  1.00   (feminina, neutra)
     Bruno   pt-BR  0.90   (mais grave/lenta — soa masculinizada)
     Clara   pt-BR  1.12   (rápida, para texto longo)
     Inês    pt-PT  1.00   (sotaque de Portugal)
     Emma    en-US  1.00 · Liam en-GB 1.00 · Sofía es-ES 1.00

   Quem quiser timbres de estúdio liga ElevenLabs/OpenAI no painel
   (#admin → Voz e narração) e aí o catálogo daquele provedor aparece.
   ============================================================ */
const VOZES_MOTOR: Record<string, { idioma: string; velocidade: number }> = {
  'pt-BR-f': { idioma: 'pt-BR', velocidade: 1 },
  'pt-BR-m': { idioma: 'pt-BR', velocidade: 0.88 },
  'pt-BR-n': { idioma: 'pt-BR', velocidade: 1.12 },
  'pt-PT-f': { idioma: 'pt-PT', velocidade: 1 },
  'en-US-f': { idioma: 'en-US', velocidade: 1 },
  'en-GB-m': { idioma: 'en-GB', velocidade: 0.95 },
  'es-ES-f': { idioma: 'es-ES', velocidade: 1 },
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
  const catalogo = VOZES_MOTOR[String(corpo.voz ?? '')];
  const idioma = catalogo?.idioma ?? String(corpo.idioma ?? 'pt-BR');
  const voz = String(corpo.voz ?? '');
  const velocidade = Number(corpo.velocidade ?? 1) || 1;
  const provedor = String(corpo.provedor ?? 'google');
  const chave = String(corpo.chave ?? '');
  const urlTemplate = String(corpo.urlTemplate ?? '');

  try {
    let audio: Uint8Array;
    if (provedor === 'elevenlabs' && chave) audio = await elevenTts(texto, voz, chave);
    else if (provedor === 'proprio' && urlTemplate) audio = await proprioTts(texto, voz, idioma, chave, urlTemplate);
    else audio = await googleTts(texto, idioma, (catalogo?.velocidade ?? 1) * velocidade);

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
   4. ARQUIVO DO DRIVE (download que funciona)
   ============================================================ */

/** limite de segurança por arquivo (o proxy da Vercel/Netlify não aguenta GB) */
const LIMITE_ARQUIVO = 80 * 1024 * 1024;

/**
 * O link "drive.usercontent.google.com/download" devolve o arquivo, mas o
 * cabeçalho Content-Length do Drive costuma mentir (tem vindo 0 ou vazio) e
 * o proxy recusava tudo com "arquivo maior que 200 MB". Aqui a gente
 * PERGUNTA o tamanho de verdade com um pedido de 1 byte (Range) na origem:
 *   · se cabe → repassa o arquivo;
 *   · se não cabe → responde 413 com o tamanho real e o link direto, para a
 *     tela oferecer "baixar no computador" em vez de fingir que baixou.
 * `meta=1` só devolve o tamanho (a tela consulta antes, sem baixar nada).
 */
async function acaoArquivo(corpo: Record<string, unknown>): Promise<Response> {
  const link = String(corpo.url ?? '').trim();
  if (!/^https:\/\/(drive\.google\.com|drive\.usercontent\.google\.com|docs\.google\.com)\//i.test(link)) {
    return json({ ok: false, erro: 'link do Drive inválido' }, 400);
  }

  const cab = { 'user-agent': UA, accept: '*/*' };
  let tamanho = 0;
  let nome = '';
  let aceitaRange = false;
  try {
    const sonda = await fetch(link, { headers: { ...cab, range: 'bytes=0-0' }, redirect: 'follow' });
    if (!sonda.ok && sonda.status !== 206) {
      return json({ ok: false, erro: `o Drive respondeu ${sonda.status}` }, 502);
    }
    aceitaRange = sonda.status === 206;
    const faixa = sonda.headers.get('content-range') ?? '';
    tamanho = Number(faixa.split('/')[1] ?? 0) || Number(sonda.headers.get('content-length') ?? 0) || 0;
    const disp = sonda.headers.get('content-disposition') ?? '';
    const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disp);
    nome = m ? decodeURIComponent(m[1]) : '';
    await sonda.body?.cancel();
  } catch (e) {
    return json({ ok: false, erro: `não consegui falar com o Drive: ${(e as Error).message}` }, 502);
  }

  if (corpo.meta === 1 || corpo.meta === true) {
    return json({ ok: true, tamanho, nome, cabe: tamanho > 0 && tamanho <= LIMITE_ARQUIVO, limite: LIMITE_ARQUIVO });
  }

  if (tamanho > LIMITE_ARQUIVO) {
    return json(
      {
        ok: false,
        grande: true,
        tamanho,
        limite: LIMITE_ARQUIVO,
        nome,
        link,
        erro: `o arquivo tem ${(tamanho / 1048576).toFixed(0)} MB — acima do limite de ${LIMITE_ARQUIVO / 1048576} MB do servidor`,
      },
      413,
    );
  }

  try {
    const r = await fetch(link, { headers: cab, redirect: 'follow' });
    if (!r.ok || !r.body) return json({ ok: false, erro: `o Drive respondeu ${r.status}` }, 502);
    const tipo = r.headers.get('content-type') ?? 'application/octet-stream';
    if (/text\/html/i.test(tipo) && !nome) {
      return json({ ok: false, erro: 'o link abriu uma página do Drive, não o arquivo' }, 415);
    }
    return new Response(r.body, {
      status: 200,
      headers: {
        ...CORS,
        'content-type': tipo,
        'x-vortex-tamanho': String(tamanho || ''),
        'x-vortex-nome': encodeURIComponent(nome),
      },
    });
  } catch (e) {
    return json({ ok: false, erro: `download interrompido: ${(e as Error).message}` }, 502);
  }
}


/* ============================================================
   5. IMAGEM (pedido → imagem, do servidor)
   ============================================================ */

/**
 * O motor público de imagem bloqueia chamadas do navegador com mais
 * frequência (limite por IP e CORS). Pedindo pelo servidor, o pedido sai do
 * IP do host e não esbarra em CORS. Devolve o JPEG/PNG binário.
 *
 * Regra: a imagem devolvida é SEMPRE do prompt pedido. Se o motor recusar,
 * a resposta é 429/502 com o motivo — nunca uma imagem genérica.
 */
async function acaoImagem(corpo: Record<string, unknown>): Promise<Response> {
  const prompt = String(corpo.prompt ?? '').trim().slice(0, 900);
  if (prompt.length < 3) return json({ ok: false, erro: 'descreva a imagem' }, 400);
  const w = Math.min(1536, Math.max(256, Number(corpo.w ?? 1024) || 1024));
  const h = Math.min(1536, Math.max(256, Number(corpo.h ?? 1024) || 1024));
  const semente = Number(corpo.seed ?? 0) || 0;

  const base = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true`;
  const tentativas = semente
    ? [`${base}&seed=${semente}`, base, `${base}&nonce=${Date.now() % 100000}`]
    : [base, `${base}&nonce=${Date.now() % 100000}`];

  let motivo = '';
  for (const url of tentativas) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'image/*' }, signal: AbortSignal.timeout(70_000) });
      const tipo = r.headers.get('content-type') ?? '';
      if (!r.ok || !/image\//i.test(tipo)) {
        if (r.status === 402 || r.status === 429) {
          motivo = 'o motor gratuito está no limite de hoje';
          await r.body?.cancel();
          continue;
        }
        motivo = `motor respondeu ${r.status}`;
        await r.body?.cancel();
        continue;
      }
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.byteLength < 3000) {
        motivo = 'o motor devolveu imagem vazia';
        continue;
      }
      return new Response(bytes, {
        status: 200,
        headers: { ...CORS, 'content-type': tipo, 'cache-control': 'no-store', 'x-vortex-motor': 'pollinations' },
      });
    } catch (e) {
      motivo = (e as Error).name === 'TimeoutError' ? 'o motor demorou demais' : (e as Error).message;
    }
  }

  /* Sem reserva de banco de imagens de propósito: a busca livre devolvia
     coisa fora do pedido (pedi "dragão cuspindo fogo" e veio brasão de
     navio). Entregar isso seria repetir o erro que o cliente reclamou.
     Aqui a resposta é o motivo real da falha. */

  return json(
    {
      ok: false,
      erro: `Não consegui gerar esta imagem agora (${motivo}). O motor público é gratuito e tem cota diária — tente em alguns minutos ou ligue uma API de imagem no painel.`,
      limite: true,
    },
    429,
  );
}

/* ============================================================
   roteador
   ============================================================ */

export default async (req: Request): Promise<Response> => {
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
  if (acao === 'arquivo') return acaoArquivo(corpo);
  if (acao === 'imagem') return acaoImagem(corpo);
  return json({ ok: false, erro: 'ação desconhecida (use voz, texto, skill, arquivo ou imagem)' }, 400);
};
