import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { identityTransform } from '../types';
import { urlFuncao } from './api';

/**
 * ÍNDICE DO DRIVE
 * ------------------------------------------------------------
 * Lê as pastas públicas do acervo pela função `drive` do próprio site
 * (o navegador não pode ler o Google por CORS; o servidor pode).
 *
 * Não guarda cópia de nada: guarda nome, id, tipo e tamanho. A mídia
 * é servida como stream pelo Google quando o usuário toca em baixar.
 */

export type TipoMidia = 'video' | 'audio' | 'image' | 'outro';

export interface ItemDrive {
  id: string;
  nome: string;
  tipo: TipoMidia;
  pasta: string;
  pastaId: string;
  stream: string;
}

const CACHE_KEY = 'vortex.drive.indice.v1';
const CACHE_TTL = 1000 * 60 * 60 * 24 * 3; // 3 dias
const FN = '/.netlify/functions/drive';

export const tipoDe = (nome: string): TipoMidia => {
  const ext = nome.toLowerCase().split('.').pop() ?? '';
  if (['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'].includes(ext)) return 'image';
  return 'outro';
};

/**
 * URL de download passando pelo proxy do próprio site.
 * O Google bloqueia leitura direta por CORS no navegador; o proxy
 * busca o arquivo no servidor e devolve com CORS liberado.
 */
export const streamDrive = (id: string) =>
  `${urlFuncao('proxy')}?url=${encodeURIComponent(
    `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`,
  )}`;

interface RespostaDrive {
  ok: boolean;
  arquivos?: { id: string; nome: string; tipo: TipoMidia }[];
  pastas?: { id: string; nome: string }[];
  erro?: string;
}

/** lê UMA pasta pública */
export async function lerPasta(
  pastaId: string,
  pastaNome: string,
): Promise<{ arquivos: ItemDrive[]; pastas: { id: string; nome: string }[] }> {
  const r = await fetch(`${urlFuncao('drive')}?pasta=${encodeURIComponent(pastaId)}`);
  const dados = (await r.json()) as RespostaDrive;
  if (!dados.ok) throw new Error(dados.erro ?? 'falha ao ler a pasta');
  const arquivos = (dados.arquivos ?? []).map<ItemDrive>((a) => ({
    id: a.id,
    nome: a.nome,
    tipo: a.tipo,
    pasta: pastaNome,
    pastaId,
    stream: streamDrive(a.id),
  }));
  return { arquivos, pastas: dados.pastas ?? [] };
}

export interface IndiceDrive {
  atualizadoEm: number;
  itens: ItemDrive[];
  pastasLidas: number;
  falhas: string[];
}

export const lerCache = (): IndiceDrive | null => {
  try {
    const bruto = localStorage.getItem(CACHE_KEY);
    if (!bruto) return null;
    const idx = JSON.parse(bruto) as IndiceDrive;
    return idx.itens?.length ? idx : null;
  } catch {
    return null;
  }
};

export const cacheVencido = (idx: IndiceDrive | null) => !idx || Date.now() - idx.atualizadoEm > CACHE_TTL;

/**
 * Varre a árvore do acervo (até 2 níveis de subpasta).
 */
export async function varrerAcervo(
  raiz: { id: string; nome: string }[],
  aoProgredir?: (p: { pastaAtual: string; pastasLidas: number; totalPastas: number; itens: number }) => void,
  aoParcial?: (itens: ItemDrive[]) => void,
): Promise<IndiceDrive> {
  const itens: ItemDrive[] = [];
  const falhas: string[] = [];
  const fila = [...raiz.map((p) => ({ ...p, nivel: 0 }))];
  let lidas = 0;
  const ORCAMENTO = 45; // pastas no máximo, para não demorar minutos

  while (fila.length && lidas < ORCAMENTO) {
    const pasta = fila.shift()!;
    aoProgredir?.({ pastaAtual: pasta.nome, pastasLidas: lidas, totalPastas: Math.min(ORCAMENTO, lidas + fila.length + 1), itens: itens.length });
    try {
      const { arquivos, pastas } = await lerPasta(pasta.id, pasta.nome);
      itens.push(...arquivos);
      lidas += 1;
      /* a lista cresce na tela enquanto a varredura continua */
      if (arquivos.length) aoParcial?.([...itens]);
      if (pasta.nivel < 1) for (const s of pastas.slice(0, 6)) fila.push({ ...s, nivel: pasta.nivel + 1 });
    } catch {
      falhas.push(pasta.nome);
    }
  }

  const indice: IndiceDrive = { atualizadoEm: Date.now(), itens, pastasLidas: lidas, falhas };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(indice));
  } catch {
    /* índice grande demais para o localStorage — segue em memória */
  }
  return indice;
}

/**
 * baixa o item e entrega ao editor.
 * @param naTimeline quando true, já cria o clipe na timeline (o usuário vê o resultado)
 */
export async function baixarParaEditor(item: ItemDrive, naTimeline = false): Promise<boolean> {
  const toast = useUI.getState().toast;
  try {
    /* primeiro tenta por streaming (rápido, não carrega o arquivo na memória);
       se o proxy do site não conseguir (arquivo grande), baixa em bloco */
    const direto = `https://drive.usercontent.google.com/download?id=${item.id}&export=download`;
    let resp = await fetch(item.stream).catch(() => null as unknown as Response);
    if (!resp || !resp.ok) {
      resp = await fetch(direto).catch(() => null as unknown as Response);
    }
    if (!resp || !resp.ok) throw new Error(`HTTP ${resp?.status ?? 'sem resposta'}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    if (blob.size < 512) throw new Error('arquivo vazio ou bloqueado pelo Drive');
    const url = URL.createObjectURL(blob);
    const tipo = item.tipo === 'outro' ? 'image' : item.tipo;
    const asset = useEditor.getState().addAsset({
      name: item.nome,
      kind: tipo,
      url,
      durationMs: 0,
      origin: 'library',
      sizeBytes: blob.size,
    });
    if (tipo !== 'image') {
      const el = document.createElement(tipo === 'audio' ? 'audio' : 'video');
      el.src = url;
      await new Promise<void>((ok) => {
        el.onloadedmetadata = () => ok();
        el.onerror = () => ok();
        setTimeout(ok, 4000);
      });
      if (Number.isFinite(el.duration) && el.duration > 0) {
        useEditor.getState().updateAssetDuration(asset.id, Math.round(el.duration * 1000));
      }
    }
    if (naTimeline) {
      const ed = useEditor.getState();
      const trilha = ed.trilhaPara(tipo === 'audio' ? 'audio' : tipo === 'image' ? 'image' : 'video');
      const atual = ed.doc.assets.find((a) => a.id === asset.id);
      if (trilha) {
        ed.addElement({
          type: tipo === 'audio' ? 'audio' : tipo === 'image' ? 'image' : 'video',
          name: item.nome,
          trackId: trilha.id,
          start: ed.playhead,
          duration: Math.max(1000, atual?.durationMs || 5000),
          sourceIn: 0,
          assetId: asset.id,
          transform: identityTransform(),
          blend: 'normal',
          effects: [],
          volume: 1,
          locked: false,
          hidden: false,
          color: tipo === 'audio' ? '#818cf8' : tipo === 'image' ? '#fbbf24' : '#22d3ee',
        });
      }
      toast(`“${item.nome}” na timeline`, 'ok');
    } else {
      toast(`“${item.nome}” está na aba Mídia`, 'ok');
    }
    return true;
  } catch (e) {
    toast(`Não deu para baixar “${item.nome}”: ${(e as Error).message}`, 'err');
    return false;
  }
}

/** baixa vários, com limite para não travar o navegador */
export async function baixarVarios(itens: ItemDrive[], limite = 12): Promise<number> {
  let ok = 0;
  for (const it of itens.slice(0, limite)) if (await baixarParaEditor(it)) ok += 1;
  return ok;
}

/* ============================================================
   EXTRAIR POR URL — o usuário cola um link do Drive e o sistema
   varre a pasta inteira (com subpastas) e lista tudo.
   ============================================================ */

/** aceita /folders/ID, ?id=ID, /d/ID ou o ID puro */
export function idDeLinkDrive(link: string): string | null {
  const t = link.trim();
  if (/^[a-zA-Z0-9_-]{20,}$/.test(t)) return t;
  const m =
    t.match(/\/folders\/([a-zA-Z0-9_-]{10,})/) ||
    t.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) ||
    t.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : null;
}

export interface ExtracaoUrl {
  arquivos: ItemDrive[];
  pastas: number;
  falhas: string[];
  idRaiz: string;
}

/**
 * Lê uma pasta (e até 2 níveis de subpastas) a partir de um link colado.
 * Devolve todos os arquivos encontrados, prontos para baixar em massa.
 */
export async function extrairDeUrl(
  link: string,
  aoProgredir?: (p: { pasta: string; lidas: number; arquivos: number }) => void,
): Promise<ExtracaoUrl> {
  const id = idDeLinkDrive(link);
  if (!id) throw new Error('link do Drive inválido — cole o endereço da pasta');

  const arquivos: ItemDrive[] = [];
  const falhas: string[] = [];
  const fila: { id: string; nome: string; nivel: number }[] = [{ id, nome: 'Pasta colada', nivel: 0 }];
  let lidas = 0;

  while (fila.length && lidas < 60) {
    const pasta = fila.shift()!;
    aoProgredir?.({ pasta: pasta.nome, lidas, arquivos: arquivos.length });
    try {
      const { arquivos: arqs, pastas } = await lerPasta(pasta.id, pasta.nome);
      arquivos.push(...arqs);
      lidas += 1;
      if (pasta.nivel < 2) for (const s of pastas.slice(0, 12)) fila.push({ ...s, nivel: pasta.nivel + 1 });
    } catch {
      falhas.push(pasta.nome);
    }
  }

  return { arquivos, pastas: lidas, falhas, idRaiz: id };
}
