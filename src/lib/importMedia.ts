/**
 * IMPORTAÇÃO DE MÍDIA REMOTA
 * ------------------------------------------------------------
 * Duas portas de entrada:
 *  1. Extensão "Vortex Mídia"  → mensagem / ?import= na URL
 *  2. Colar link / URL direta   → baixa via fetch e cria blob local
 *
 * O arquivo vira um blob na memória do navegador: nada passa pelo nosso banco.
 */

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

  // tenta baixar os bytes (funciona quando o host permite CORS)
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
    /* CORS bloqueado: cai no uso direto da URL */
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
 * PONTE COM A EXTENSÃO (externally_connectable)
 * ------------------------------------------------------------ */
interface ChromeBridge {
  runtime?: {
    sendMessage: (
      extId: string,
      msg: unknown,
      cb: (r?: { ok?: boolean; itens?: RemoteItem[]; erro?: string; versao?: string }) => void,
    ) => void;
  };
}

const EXT_ID_KEY = 'vortex.extId';

export function saveExtensionId(id: string): void {
  localStorage.setItem(EXT_ID_KEY, id.trim());
}

export function getExtensionId(): string {
  return localStorage.getItem(EXT_ID_KEY) ?? '';
}

/** verifica se a extensão está instalada e responde */
export function pingExtension(id = getExtensionId()): Promise<{ ok: boolean; versao?: string; erro?: string }> {
  return new Promise((resolve) => {
    const c = (window as unknown as { chrome?: ChromeBridge }).chrome;
    if (!id) return resolve({ ok: false, erro: 'ID da extensão não configurado' });
    if (!c?.runtime?.sendMessage) return resolve({ ok: false, erro: 'Este navegador não expõe a ponte de extensões' });
    try {
      c.runtime.sendMessage(id, { tipo: 'ping' }, (r) => {
        const lastError = (window as unknown as { chrome?: { runtime?: { lastError?: unknown } } }).chrome?.runtime
          ?.lastError;
        if (lastError) return resolve({ ok: false, erro: 'Extensão não encontrada' });
        resolve({ ok: !!r?.ok, versao: r?.versao });
      });
    } catch (e) {
      resolve({ ok: false, erro: (e as Error).message });
    }
  });
}

/** pede à extensão as mídias da aba ativa */
export function captureFromTab(id = getExtensionId()): Promise<RemoteItem[]> {
  return new Promise((resolve) => {
    const c = (window as unknown as { chrome?: ChromeBridge }).chrome;
    if (!id || !c?.runtime?.sendMessage) return resolve([]);
    try {
      c.runtime.sendMessage(id, { tipo: 'capturar-aba' }, (r) => resolve(r?.itens ?? []));
    } catch {
      resolve([]);
    }
  });
}
