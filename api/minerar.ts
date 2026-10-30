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
 * POST /.netlify/functions/minerar   { url }
 * → { ok, pagina, itens: [...] }
 *
 * Lê uma página pública e devolve as mídias encontradas.
 * Nada é armazenado — o download acontece no navegador do usuário.
 */
/**
 * VORTEX · mineração de mídia no servidor
 * ------------------------------------------------------------
 * Busca uma página pública e extrai as URLs de imagem/vídeo/áudio.
 * Roda no Netlify (Node 20). Não guarda nada: só devolve metadados.
 */

interface Item {
  url: string;
  type: 'image' | 'video' | 'audio';
  w: number;
  h: number;
  label: string;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const VIDEO_EXT = /\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|ogg|oga|opus|flac|aac)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;

function abs(src: string, base: string): string {
  try {
    return new URL(src, base).href;
  } catch {
    return '';
  }
}

function tipoDe(src: string, hint = ''): 'image' | 'video' | 'audio' {
  const u = src.toLowerCase().split('?')[0];
  if (VIDEO_EXT.test(u) || hint === 'video') return 'video';
  if (AUDIO_EXT.test(u) || hint === 'audio') return 'audio';
  return 'image';
}

/** remove pixels de rastreio, sprites, logos e placeholder */
function lixo(url: string): boolean {
  return (
    /(^|[/_.-])(spacer|pixel|tracking|beacon|1x1|blank|transparent)([/_.-]|$)/i.test(url) ||
    /(sprite|favicon|logo|avatar|emoji|icon-?\d|placeholder|loading|spinner|badge)/i.test(url) ||
    /\.svg(\?|#|$)/i.test(url) ||
    /doubleclick|googletagmanager|facebook\.com\/tr|analytics/i.test(url)
  );
}

const attr = (tag: string, name: string): string => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return m ? m[1] : '';
};

const metaTag = (html: string, prop: string): string => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]*>`,
    'i',
  );
  const m = html.match(re);
  if (!m) return '';
  return attr(m[0], 'content');
};

function minerar(html: string, base: string): Item[] {
  const out: Item[] = [];
  const vistos = new Set<string>();

  const push = (raw: string, type: 'image' | 'video' | 'audio', w = 0, h = 0, label = '') => {
    if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return;
    const url = abs(raw, base);
    if (!url || !/^https?:/i.test(url) || lixo(url)) return;
    // a própria página não é mídia
    if (url.replace(/\/$/, '') === base.replace(/\/$/, '')) return;
    // imagem sem extensão conhecida e sem dimensão: provavelmente link de página
    if (type === 'image' && !IMAGE_EXT.test(url.split('?')[0]) && !w && !h && !label) return;
    if (vistos.has(url)) return;
    vistos.add(url);
    out.push({ url, type, w, h, label });
  };

  /* ---------- 1. OpenGraph / Twitter ---------- */
  for (const [prop, type] of [
    ['og:video:secure_url', 'video'],
    ['og:video', 'video'],
    ['og:audio', 'audio'],
    ['og:image', 'image'],
    ['twitter:player:stream', 'video'],
    ['twitter:image', 'image'],
  ] as const) {
    const v = metaTag(html, prop);
    if (v) push(v, type, 0, 0, prop);
  }

  /* ---------- 2. JSON-LD ---------- */
  const ld = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ld) {
    try {
      const visit = (o: any) => {
        if (!o || typeof o !== 'object') return;
        const tp = String(o['@type'] || '').toLowerCase();
        const midia = o.contentUrl || o.thumbnailUrl || (typeof o.image === 'string' ? '' : o.embedUrl);
        if (midia) {
          const raw = midia;
          const type = /video/.test(tp) ? 'video' : /audio/.test(tp) ? 'audio' : 'image';
          push(raw, type, Number(o.width) || 0, Number(o.height) || 0, o.name || '');
        }
        if (Array.isArray(o.image)) o.image.forEach((i: any) => push(typeof i === 'string' ? i : i?.url, 'image'));
        else if (typeof o.image === 'string') push(o.image, 'image');
        Object.values(o).forEach((v) => Array.isArray(v) ? v.forEach(visit) : visit(v));
      };
      visit(JSON.parse(m[1]));
    } catch {
      /* JSON-LD inválido, segue */
    }
  }

  /* ---------- 3. <video> e <source> ---------- */
  for (const tag of html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gi)) {
    const bloco = tag[0];
    const poster = attr(bloco, 'poster');
    if (poster) push(poster, 'image', 0, 0, 'capa do vídeo');
    for (const s of bloco.matchAll(/<(?:source|video)\b[^>]*>/gi)) {
      const src = attr(s[0], 'src') || attr(s[0], 'data-src');
      if (src && !/\.m3u8(\?|#|$)/i.test(src)) push(src, 'video');
    }
  }

  /* ---------- 4. <audio> ---------- */
  for (const tag of html.matchAll(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi)) {
    for (const s of tag[0].matchAll(/<(?:source|audio)\b[^>]*>/gi)) {
      const src = attr(s[0], 'src') || attr(s[0], 'data-src');
      if (src) push(src, 'audio');
    }
  }

  /* ---------- 5. <img> ---------- */
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const t = tag[0];
    const src =
      attr(t, 'src') ||
      attr(t, 'data-src') ||
      attr(t, 'data-original') ||
      attr(t, 'data-lazy-src') ||
      '';
    const srcset = attr(t, 'srcset') || attr(t, 'data-srcset');
    const w = parseInt(attr(t, 'width'), 10) || 0;
    const h = parseInt(attr(t, 'height'), 10) || 0;
    const alt = attr(t, 'alt');
    if (src) push(src, 'image', w, h, alt);
    if (srcset) {
      // pega a maior variante do srcset
      const candidatos = srcset
        .split(',')
        .map((c) => c.trim().split(/\s+/))
        .map(([u, d]) => ({ u, n: parseInt(d || '0', 10) || 0 }))
        .sort((a, b) => b.n - a.n);
      if (candidatos[0]?.u) push(candidatos[0].u, 'image', 0, 0, alt);
    }
  }

  /* ---------- 6. background-image ---------- */
  for (const m of html.matchAll(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/gi)) {
    push(m[1], 'image', 0, 0, 'fundo');
  }

  /* ---------- 7. links diretos soltos ---------- */
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|mp3|wav|m4a|jpe?g|png|webp)(?:\?[^\s"'<>]*)?/gi)) {
    push(m[0], tipoDe(m[0]));
  }

  /* ---------- ordenação: vídeo, áudio, imagem grande, resto ---------- */
  const peso = (i: Item) => {
    const area = i.w && i.h ? i.w * i.h : 0;
    const tipo = i.type === 'video' ? 3 : i.type === 'audio' ? 2.5 : 1;
    return tipo * 1e7 + area;
  };
  return out.sort((a, b) => peso(b) - peso(a)).slice(0, 80);
}


const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

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

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  await responder(req, res, funcao);
}
