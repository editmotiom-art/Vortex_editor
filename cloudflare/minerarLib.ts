/** VORTEX · mineração de mídia (versão Cloudflare Worker — mesma lógica do Netlify) */

/**
 * VORTEX · mineração de mídia no servidor
 * ------------------------------------------------------------
 * Busca uma página pública e extrai as URLs de imagem/vídeo/áudio.
 * Roda no Netlify (Node 20). Não guarda nada: só devolve metadados.
 */

export interface Item {
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

export function abs(src: string, base: string): string {
  try {
    return new URL(src, base).href;
  } catch {
    return '';
  }
}

export function tipoDe(src: string, hint = ''): 'image' | 'video' | 'audio' {
  const u = src.toLowerCase().split('?')[0];
  if (VIDEO_EXT.test(u) || hint === 'video') return 'video';
  if (AUDIO_EXT.test(u) || hint === 'audio') return 'audio';
  return 'image';
}

/** remove pixels de rastreio, sprites, logos e placeholder */
export function lixo(url: string): boolean {
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

export function minerar(html: string, base: string): Item[] {
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
