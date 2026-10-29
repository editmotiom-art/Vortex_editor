/**
 * IMPORTAÇÃO DE MÍDIA REMOTA
 * ------------------------------------------------------------
 * Duas portas de entrada:
 *  1. "De um site"  → função Netlify lê a página e devolve as mídias
 *  2. "Link direto" → baixa via fetch (direto ou pelo proxy)
 *
 * O arquivo vira um blob na memória do navegador: nada passa pelo nosso banco.
 */

import { chamarFuncao, urlFuncao } from './api';
export interface RemoteItem {
  url: string;
  type?: 'video' | 'audio' | 'image' | string;
  name?: string;
  width?: number;
  height?: number;
}

export interface ImportedMedia {
  name: string;
  kind: 'video' | 'audio' | 'image';
  url: string;
  durationMs: number;
  width: number;
  height: number;
  sizeBytes: number;
}

const kindFromUrl = (url: string, hint?: string): 'video' | 'audio' | 'image' => {
  if (hint === 'video' || hint === 'audio' || hint === 'image') return hint;
  if (/\.(mp4|webm|mov|mkv|m4v)(\?|#|$)/i.test(url)) return 'video';
  if (/\.(mp3|wav|m4a|aac|ogg|opus|flac)(\?|#|$)/i.test(url)) return 'audio';
  return 'image';
};

const nameFromUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop() || 'midia';
    return decodeURIComponent(last).slice(0, 120);
  } catch {
    return 'midia';
  }
};

async function probe(url: string, kind: 'video' | 'audio' | 'image'): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const done = (v: { durationMs: number; width: number; height: number }) => resolve(v);
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => done({ durationMs: 5000, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done({ durationMs: 5000, width: 0, height: 0 });
      img.src = url;
      setTimeout(() => done({ durationMs: 5000, width: 0, height: 0 }), 6000);
      return;
    }
    const el = document.createElement(kind === 'audio' ? 'audio' : 'video');
    el.src = url;
    el.onloadedmetadata = () =>
      done({
        durationMs: (el.duration || 0) * 1000,
        width: kind === 'video' ? (el as HTMLVideoElement).videoWidth : 0,
        height: kind === 'video' ? (el as HTMLVideoElement).videoHeight : 0,
      });
    el.onerror = () => done({ durationMs: 0, width: 0, height: 0 });
    setTimeout(() => done({ durationMs: 0, width: 0, height: 0 }), 6000);
  });
}

/** Baixa uma URL remota e devolve um blob URL utilizável na timeline */
export async function fetchRemote(item: RemoteItem): Promise<ImportedMedia> {
  const kind = kindFromUrl(item.url, item.type);
  let url = item.url;
  let sizeBytes = 0;
  let blobOk = false;

  // 1ª tentativa: host permite CORS
  try {
    const res = await fetch(item.url, { mode: 'cors', credentials: 'omit' });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        sizeBytes = blob.size;
        url = URL.createObjectURL(blob);
        blobOk = true;
      }
    }
  } catch {
    /* CORS bloqueado */
  }

  // 2ª tentativa: passa pelo proxy do próprio site
  if (!blobOk) {
    try {
      const res = await fetch(proxyUrl(item.url));
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          sizeBytes = blob.size;
          url = URL.createObjectURL(blob);
          blobOk = true;
        }
      }
    } catch {
      /* sem proxy disponível: usa a URL direta */
    }
  }

  const meta = await probe(url, kind);
  const name = item.name && item.name.length > 1 ? item.name : nameFromUrl(item.url);
  if (!blobOk) sizeBytes = 0;

  return {
    name: name.slice(0, 120),
    kind,
    url,
    durationMs: meta.durationMs,
    width: item.width || meta.width,
    height: item.height || meta.height,
    sizeBytes,
  };
}

/** Lê o payload que a extensão manda por ?import=... */
export function readImportParam(): RemoteItem[] {
  const p = new URLSearchParams(location.search).get('import');
  if (!p) return [];
  try {
    const parsed = JSON.parse(p);
    if (Array.isArray(parsed)) return parsed as RemoteItem[];
    if (typeof parsed === 'string') return [{ url: parsed }];
    if (parsed && typeof parsed === 'object' && 'url' in parsed) return [parsed as RemoteItem];
  } catch {
    // payload veio só como URL crua
    if (/^https?:\/\//.test(p)) return [{ url: p }];
  }
  return [];
}

/* ------------------------------------------------------------
 * MINERAÇÃO NO SERVIDOR (Netlify Functions)
 * ------------------------------------------------------------ */
export interface MineracaoResult {
  ok: boolean;
  erro?: string;
  pagina?: string;
  site?: string;
  titulo?: string;
  total?: number;
  itens: RemoteItem[];
}

/** URL do proxy de arquivos */
export const proxyUrl = (url: string): string =>
  `${urlFuncao('proxy')}?url=${encodeURIComponent(url)}`;

/** pede ao servidor para ler uma página e devolver as mídias dela */
export async function minerarSite(url: string): Promise<MineracaoResult> {
  try {
    const res = await chamarFuncao('minerar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return {
        ok: false,
        itens: [],
        erro:
          res.status === 404
            ? 'A captura de sites roda no servidor (Netlify). No modo local ela não existe — use “Link direto”.'
            : `Servidor respondeu ${res.status}${txt ? `: ${txt.slice(0, 80)}` : ''}`,
      };
    }
    const data = (await res.json()) as MineracaoResult;
    return { ...data, itens: data.itens ?? [] };
  } catch {
    return {
      ok: false,
      itens: [],
      erro: 'Não consegui falar com o servidor de captura. No modo local use “Link direto”.',
    };
  }
}
