/**
 * PACK DO EDITOR 4.0 — PLANO DE ENTREGA SOB DEMANDA
 * ------------------------------------------------------------
 * O catálogo tem 163 packs / milhares de arquivos (centenas de GB). Guardar
 * isso no banco ou no navegador é impossível — e nem é preciso:
 *
 *   · o SISTEMA guarda só NOME + LINK (src/data/packsMonkey.ts, 39 KB);
 *   · a pasta é lida na hora pela função `drive` (nada é gravado);
 *   · o arquivo desce pelo `proxy` só quando o usuário clica em ↓;
 *   · o que já foi baixado fica em cache local e conta cota do plano.
 *
 * COTAS DE DOWNLOAD (por conta, guardadas em localStorage `vortex.packs.uso.v1`):
 *   free   → 5 arquivos por dia e 1 pasta por vez
 *   pro    → 60 arquivos por dia
 *   studio → 300 arquivos por dia
 * Isso protege o banco (nada de blob), a banda do Netlify e mantém o plano
 * gratuito utilizável. O admin vê o consumo e pode zerar.
 */

import type { Plano } from './contas';
import { PACKS_MONKEY, type PackMonkey } from '../data/packsMonkey';

const K_USO = 'vortex.packs.uso.v1';
const K_CACHE = 'vortex.packs.cache.v1';

export interface UsoPacks {
  /** dia de referência (YYYY-MM-DD) */
  dia: string;
  /** arquivos baixados hoje */
  baixados: number;
  /** total histórico */
  total: number;
}

export const COTAS: Record<Plano, number> = { free: 5, pro: 60, studio: 300 };

const hoje = () => new Date().toISOString().slice(0, 10);

export const lerUso = (): UsoPacks => {
  try {
    const u = JSON.parse(localStorage.getItem(K_USO) ?? 'null') as UsoPacks | null;
    if (!u || u.dia !== hoje()) return { dia: hoje(), baixados: 0, total: u?.total ?? 0 };
    return u;
  } catch {
    return { dia: hoje(), baixados: 0, total: 0 };
  }
};

export const podeBaixar = (plano: Plano): { ok: boolean; restam: number; cota: number } => {
  const u = lerUso();
  const cota = COTAS[plano] ?? COTAS.free;
  return { ok: u.baixados < cota, restam: Math.max(0, cota - u.baixados), cota };
};

export const registrarDownload = (n = 1): UsoPacks => {
  const u = lerUso();
  const novo = { dia: u.dia, baixados: u.baixados + n, total: u.total + n };
  localStorage.setItem(K_USO, JSON.stringify(novo));
  return novo;
};

export const zerarUso = () => localStorage.setItem(K_USO, JSON.stringify({ dia: hoje(), baixados: 0, total: 0 }));

/* ---------------- pasta aberta (uma por vez no plano free) ---------------- */

const K_PASTA = 'vortex.packs.pasta.v1';

export const lerPastaAberta = (): string | null => localStorage.getItem(K_PASTA);
export const abrirPastaPack = (id: string) => localStorage.setItem(K_PASTA, id);
export const fecharPastaPack = () => localStorage.removeItem(K_PASTA);

/* ---------------- cache dos nomes de arquivo já listados ---------------- */

export interface CachePasta {
  /** id da pasta no Drive */
  id: string;
  /** quando foi listada */
  em: number;
  arquivos: { id: string; nome: string; tipo: string }[];
  pastas: { id: string; nome: string }[];
}

const TTL = 1000 * 60 * 60 * 24 * 7; // 7 dias

export const lerCachePastas = (): Record<string, CachePasta> => {
  try {
    return JSON.parse(localStorage.getItem(K_CACHE) ?? '{}') as Record<string, CachePasta>;
  } catch {
    return {};
  }
};

export const lerCachePasta = (id: string): CachePasta | null => {
  const c = lerCachePastas()[id];
  if (!c || Date.now() - c.em > TTL) return null;
  return c;
};

export const gravarCachePasta = (c: CachePasta) => {
  const todos = lerCachePastas();
  todos[c.id] = c;
  // mantém no máximo 40 pastas em cache (≈ poucos KB cada)
  const chaves = Object.keys(todos);
  if (chaves.length > 40) {
    chaves.sort((a, b) => todos[a].em - todos[b].em);
    for (const k of chaves.slice(0, chaves.length - 40)) delete todos[k];
  }
  try {
    localStorage.setItem(K_CACHE, JSON.stringify(todos));
  } catch {
    // storage cheio: limpa o cache e tenta de novo
    localStorage.removeItem(K_CACHE);
  }
};

/* ---------------- busca e agrupamento ---------------- */

export const porSecao = (secao: string) => PACKS_MONKEY.filter((p) => p.secao === secao);

export const buscarPacks = (termo: string): PackMonkey[] => {
  const q = termo.trim().toLowerCase();
  if (!q) return PACKS_MONKEY;
  return PACKS_MONKEY.filter(
    (p) => p.nome.toLowerCase().includes(q) || p.secao.toLowerCase().includes(q) || p.id.includes(q),
  );
};

/** extrai o id da pasta de qualquer formato de link do Drive */
export const idDaPasta = (p: PackMonkey): string | null => {
  const m = p.drive?.match(/folders\/([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : null;
};

/** abre o link do Sync/OneDrive/Dropbox quando não há pasta do Drive */
export const linkAlternativo = (p: PackMonkey): string | null => p.sync ?? p.extra ?? null;

export const totalPacks = PACKS_MONKEY.length;

export const PASTAS_ESTIMADAS = 163;
