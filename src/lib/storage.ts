/**
 * CAMADA DE STORAGE — contrato único para 3 níveis
 * ------------------------------------------------------------
 * NÍVEL A  "official"  → R2/B2 via CDN (só metadados no banco)
 * NÍVEL B  "pack"      → arquivo local do usuário (OPFS / pasta)
 * NÍVEL C  "local"     → File System Access API (pasta do usuário)
 *
 * O editor chama SEMPRE a mesma função `resolveAssetUrl()`, e o provedor
 * é plugado aqui. Sem bytes no banco em nenhum dos casos.
 */

export type AssetLevel = 'official' | 'pack' | 'local';

export interface StorageProvider {
  /** URL reproduzível pelo <video>/<audio>/<img> a partir de uma storage_key */
  url(key: string): Promise<string>;
  /** salva um arquivo local do usuário (nível B/C) */
  put(file: File, key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/* ------------------------------------------------------------
 * Provedor A: CDN (Cloudflare R2 + domínio público)
 * ------------------------------------------------------------ */
export class CdnProvider implements StorageProvider {
  constructor(private baseUrl: string) {}

  async url(key: string): Promise<string> {
    return `${this.baseUrl.replace(/\/$/, '')}/${key.replace(/^\//, '')}`;
  }
  async put(): Promise<void> {
    throw new Error('Upload para CDN é feito no build do catálogo, não no cliente.');
  }
  async exists(key: string): Promise<boolean> {
    try {
      const r = await fetch(await this.url(key), { method: 'HEAD' });
      return r.ok;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------
 * Provedor B/C: OPFS (Origin Private File System) — cache local
 * ------------------------------------------------------------ */
export class OpfsProvider implements StorageProvider {
  private root: FileSystemDirectoryHandle | null = null;

  private async dir(): Promise<FileSystemDirectoryHandle | null> {
    if (this.root) return this.root;
    if (!('storage' in navigator) || !('getDirectory' in navigator.storage)) return null;
    try {
      this.root = await navigator.storage.getDirectory();
      return this.root;
    } catch {
      return null;
    }
  }

  async url(key: string): Promise<string> {
    const d = await this.dir();
    if (!d) throw new Error('OPFS indisponível neste navegador');
    const fh = await d.getFileHandle(key);
    const file = await fh.getFile();
    return URL.createObjectURL(file);
  }

  async put(file: File, key: string): Promise<void> {
    const d = await this.dir();
    if (!d) throw new Error('OPFS indisponível');
    const fh = await d.getFileHandle(key, { create: true });
    const w = await fh.createWritable();
    await w.write(file);
    await w.close();
  }

  async exists(key: string): Promise<boolean> {
    const d = await this.dir();
    if (!d) return false;
    try {
      await d.getFileHandle(key);
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------
 * Provedor C: pasta local escolhida pelo usuário (FSA API)
 * ------------------------------------------------------------ */
export class LocalFolderProvider implements StorageProvider {
  constructor(private dir: FileSystemDirectoryHandle) {}

  async url(key: string): Promise<string> {
    const fh = await this.dir.getFileHandle(key);
    const file = await fh.getFile();
    return URL.createObjectURL(file);
  }
  async put(file: File, key: string): Promise<void> {
    const fh = await this.dir.getFileHandle(key, { create: true });
    const w = await fh.createWritable();
    await w.write(file);
    await w.close();
  }
  async exists(key: string): Promise<boolean> {
    try {
      await this.dir.getFileHandle(key);
      return true;
    } catch {
      return false;
    }
  }
}

/* ------------------------------------------------------------
 * Roteador
 * ------------------------------------------------------------ */
const CDN_BASE = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_CDN_URL ?? '';

export const storage = {
  cdn: new CdnProvider(CDN_BASE || 'https://cdn.vortex.app'),
  opfs: new OpfsProvider(),

  /** resolve a URL final de um asset segundo o nível */
  async resolve(level: AssetLevel, key: string): Promise<string> {
    if (level === 'official') return this.cdn.url(key);
    if (await this.opfs.exists(key)) return this.opfs.url(key);
    return this.cdn.url(key); // fallback
  },

  /** pede ao usuário uma pasta para a biblioteca local (nível C) */
  async pickFolder(): Promise<LocalFolderProvider | null> {
    const w = window as unknown as {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    };
    if (!w.showDirectoryPicker) return null;
    try {
      const dir = await w.showDirectoryPicker();
      return new LocalFolderProvider(dir);
    } catch {
      return null;
    }
  },

  /** quota disponível para cache local */
  async quota(): Promise<{ usage: number; quota: number } | null> {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  },
};
