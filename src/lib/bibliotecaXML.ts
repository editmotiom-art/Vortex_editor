/**
 * BIBLIOTECA DE TEMPLATES XML
 * ------------------------------------------------------------
 * Importa vários XMLs de uma vez, converte cada um em um template
 * reutilizável e guarda os metadados (nunca a mídia).
 *
 * Fluxo:
 *   arquivos .xml → importarAlight() → TemplateXML (metadados + cena)
 *   → salvo em IndexedDB (cabem milhares, o localStorage não caberia)
 *   → aparece como card na aba Biblioteca e aplica com 1 clique
 */

import { importarAlight, type ResultadoImport } from './alightMotion';

const DB_NOME = 'vortex.templates';
const DB_VERSAO = 1;
const STORE = 'xml';

export interface TemplateXML {
  id: string;
  nome: string;
  /** categoria deduzida do nome/caminho */
  categoria: string;
  tags: string[];
  largura: number;
  altura: number;
  fps: number;
  duracaoMs: number;
  elementos: number;
  efeitos: number;
  midias: number;
  /** cena convertida, pronta para abrir no editor */
  doc: ResultadoImport['doc'];
  criadoEm: number;
  /** cor do card */
  cor: [string, string];
  favorito?: boolean;
}

/* ============================================================
   IndexedDB (simples, sem dependências)
   ============================================================ */

const abrirDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, DB_VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('nome', 'nome');
        store.createIndex('categoria', 'categoria');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const transacao = async <T>(modo: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> => {
  const db = await abrirDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, modo);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
};

export const listarTemplates = async (): Promise<TemplateXML[]> => {
  try {
    const lista = await transacao<TemplateXML[]>('readonly', (s) => s.getAll());
    return (lista ?? []).sort((a, b) => b.criadoEm - a.criadoEm);
  } catch {
    return [];
  }
};

export const contarTemplates = async (): Promise<number> => {
  try {
    return await transacao<number>('readonly', (s) => s.count());
  } catch {
    return 0;
  }
};

export const salvarTemplate = async (t: TemplateXML): Promise<void> => {
  await transacao('readwrite', (s) => s.put(t));
};

export const removerTemplate = async (id: string): Promise<void> => {
  await transacao('readwrite', (s) => s.delete(id));
};

export const limparTemplates = async (): Promise<void> => {
  await transacao('readwrite', (s) => s.clear());
};

/* ============================================================
   CATEGORIZAÇÃO AUTOMÁTICA
   ============================================================ */

const REGRAS: { cat: string; cor: [string, string]; palavras: RegExp }[] = [
  { cat: 'Texto', cor: ['#f472b6', '#9d174d'], palavras: /(text|typography|titulo|title|legenda|caption|font|kinetic|word)/i },
  { cat: 'Transição', cor: ['#22d3ee', '#0e7490'], palavras: /(transition|transi|whip|glitch|zoom|slide|punch|smooth)/i },
  { cat: 'Overlay', cor: ['#34d399', '#065f46'], palavras: /(overlay|light|leak|burn|dust|grain|texture|halation|flare)/i },
  { cat: 'Cor', cor: ['#a78bfa', '#5b21b6'], palavras: /(color|colour|grading|cc|lut|grade|tone|cinematic|preset)/i },
  { cat: 'Anime', cor: ['#fb923c', '#9a3412'], palavras: /(anime|manga|troll|effect|sakura|speed|impact)/i },
  { cat: 'Documentário', cor: ['#94a3b8', '#334155'], palavras: /(document|doc|bxc|highlight|news|histor|explainer)/i },
  { cat: 'UI / Motion', cor: ['#60a5fa', '#1d4ed8'], palavras: /(ui|motion|icon|hud|infographic|chart|callout|shape)/i },
  { cat: 'Social', cor: ['#facc15', '#a16207'], palavras: /(story|stories|reels|short|tiktok|hook|post|social)/i },
];

const categoriaDe = (nome: string) => {
  for (const r of REGRAS) if (r.palavras.test(nome)) return r;
  return { cat: 'Outros', cor: ['#64748b', '#1e293b'] as [string, string] };
};

const tagsDe = (nome: string, doc: ResultadoImport['doc']): string[] => {
  const tags = new Set<string>();
  const partes = nome.toLowerCase().replace(/[_.\-–—]+/g, ' ').split(/\s+/);
  for (const p of partes) if (p.length > 2) tags.add(p.slice(0, 14));
  if (doc.settings.width > doc.settings.height) tags.add('horizontal');
  if (doc.settings.width < doc.settings.height) tags.add('vertical');
  if (doc.settings.fps >= 50) tags.add('60fps');
  const tipos = new Set(doc.elements.map((e) => e.type));
  if (tipos.has('text')) tags.add('texto');
  if (tipos.has('shape')) tags.add('forma');
  return Array.from(tags).slice(0, 8);
};

/* ============================================================
   IMPORTAÇÃO EM LOTE
   ============================================================ */

export interface ProgressoLote {
  feito: number;
  total: number;
  atual: string;
  erros: number;
}

export interface ResultadoLote {
  importados: TemplateXML[];
  erros: { arquivo: string; motivo: string }[];
  totalLidos: number;
  duracaoTotalMs: number;
}

/** lê vários arquivos XML e gera os templates (sem salvar ainda) */
export async function importarLote(
  arquivos: File[],
  aoProgredir?: (p: ProgressoLote) => void,
): Promise<ResultadoLote> {
  const inicio = Date.now();
  const importados: TemplateXML[] = [];
  const erros: { arquivo: string; motivo: string }[] = [];

  for (let i = 0; i < arquivos.length; i += 1) {
    const arq = arquivos[i];
    aoProgredir?.({ feito: i, total: arquivos.length, atual: arq.name, erros: erros.length });
    try {
      if (arq.size > 20 * 1024 * 1024) throw new Error('maior que 20 MB');
      const texto = await arq.text();
      const nome = arq.name.replace(/\.xml$/i, '').trim() || `Template ${i + 1}`;
      const r = importarAlight(texto, nome);
      if (r.relatorio.elementos === 0) throw new Error('nenhum elemento visível');

      const { cat, cor } = categoriaDe(nome);
      importados.push({
        id: `xml_${nome.replace(/\W+/g, '_').slice(0, 40)}_${Date.now().toString(36)}_${i}`,
        nome,
        categoria: cat,
        tags: tagsDe(nome, r.doc),
        largura: r.relatorio.largura,
        altura: r.relatorio.altura,
        fps: r.relatorio.fps,
        duracaoMs: r.relatorio.duracaoMs,
        elementos: r.relatorio.elementos,
        efeitos: r.relatorio.efeitosAplicados,
        midias: r.doc.assets.length,
        doc: r.doc,
        criadoEm: Date.now(),
        cor,
      });
    } catch (e) {
      erros.push({ arquivo: arq.name, motivo: (e as Error).message });
    }
    // deixa a interface respirar em lotes grandes
    if (i % 25 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  aoProgredir?.({ feito: arquivos.length, total: arquivos.length, atual: '', erros: erros.length });
  return { importados, erros, totalLidos: arquivos.length, duracaoTotalMs: Date.now() - inicio };
}

/** salva em blocos, informando progresso */
export async function salvarLote(
  templates: TemplateXML[],
  aoProgredir?: (feito: number, total: number) => void,
): Promise<number> {
  let n = 0;
  for (const t of templates) {
    try {
      await salvarTemplate(t);
      n += 1;
    } catch {
      /* segue com os próximos */
    }
    if (n % 20 === 0) aoProgredir?.(n, templates.length);
  }
  aoProgredir?.(n, templates.length);
  return n;
}
