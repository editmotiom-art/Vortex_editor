/**
 * IMPORTADOR DE XML — ALIGHT MOTION
 * ------------------------------------------------------------
 * Converte um projeto .xml do Alight Motion em um ProjectDoc do Vortex.
 *
 * Mapa de conversão:
 *   <scene width height fps totalTime bgcolor>  → settings + duração
 *   <media uri filename type duration width height> → MediaAsset (relink)
 *   <shape|embedScene|group|text>               → Element
 *   <transform><location x,y,z>                 → transform.x / y
 *   <transform><scale x,y>                      → transform.scale
 *   <transform><opacity>                        → transform.opacity
 *   <fillColor "#aarrggbb">                     → cor (alfa descartado)
 *   <effect id="com.alightcreative.effects.*">  → efeito equivalente
 *   <property name="size" vec2>                 → shape.w / shape.h
 *
 * Unidade de tempo do Alight Motion: milissegundos (igual ao Vortex).
 */

import {
  anim,
  identityTransform,
  uid,
  type BlendMode,
  type Effect,
  type EffectType,
  type Element as VxElement,
  type MediaAsset,
  type ProjectDoc,
  type Track,
} from '../types';

/* ============================================================
   UTILITÁRIOS
   ============================================================ */

const texto = (el: globalThis.Element | null, attr: string): string => el?.getAttribute(attr) ?? '';
const numero = (el: globalThis.Element | null, attr: string, padrao = 0): number => {
  const v = parseFloat(el?.getAttribute(attr) ?? '');
  return Number.isFinite(v) ? v : padrao;
};

/** "#aarrggbb" ou "#rrggbb" → "#rrggbb" */
const cor = (valor: string, padrao = '#ffffff'): string => {
  if (!valor) return padrao;
  const v = valor.trim();
  if (/^#[0-9a-f]{8}$/i.test(v)) return `#${v.slice(3)}`;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  return padrao;
};

/** ponto do Alight Motion (x,y,z) */
const ponto = (valor: string): [number, number] => {
  const p = valor.split(',').map((n) => parseFloat(n));
  return [p[0] || 0, p[1] || 0];
};

/** blending do Alight Motion → BlendMode do Vortex */
const blending = (v: string): BlendMode => {
  const t = v.toLowerCase();
  if (t.includes('multiply')) return 'multiply';
  if (t.includes('screen')) return 'screen';
  if (t.includes('overlay') || t.includes('soft-light') || t.includes('soft-overlay')) return 'overlay';
  if (t.includes('add') || t.includes('linear-dodge')) return 'add';
  if (t.includes('difference') || t.includes('exclusion')) return 'difference';
  if (t.includes('lighten')) return 'lighten';
  if (t.includes('darken')) return 'darken';
  return 'normal';
};

/** efeito do Alight Motion → efeito do Vortex (com intensidade) */
const mapearEfeito = (id: string, props: Map<string, string>): Effect | null => {
  const nome = id.toLowerCase();
  const valor = (chave: string) => {
    const v = parseFloat(props.get(chave) ?? '');
    return Number.isFinite(v) ? v : null;
  };
  /** normaliza para 0..1 */
  const norm = (chave: string, padrao = 0.5) => {
    const v = valor(chave);
    if (v === null) return padrao;
    return Math.max(0, Math.min(1, v));
  };

  const criar = (type: EffectType, amount: number): Effect => ({
    id: uid('fx'),
    type,
    enabled: true,
    amount: Math.max(0, Math.min(1, amount)),
  });

  if (nome.includes('gaussianblur') || nome.includes('blur')) return criar('blur', norm('strength', 0.4));
  if (nome.includes('exposure')) return criar('brightness', 1 - norm('exposure', 0.5)); // invertido: mais exposição = mais claro
  if (nome.includes('satvib') || nome.includes('saturate')) return criar('saturation', norm('saturate', norm('vibrance', 0.5)));
  if (nome.includes('rgbsep') || nome.includes('chromatic')) return criar('rgbsplit', norm('offset', 0.5));
  if (nome.includes('lift') || nome.includes('shadows')) return criar('contrast', norm('fill', 0.4));
  if (nome.includes('vignette')) return criar('vignette', norm('amount', 0.6));
  if (nome.includes('grain') || nome.includes('noise')) return criar('grain', norm('amount', 0.3));
  if (nome.includes('replacecolor') || nome.includes('hue')) return criar('hue', norm('hue', 0.5));
  if (nome.includes('sharpen')) return criar('sharpen', norm('amount', 0.4));
  if (nome.includes('grayscale') || nome.includes('monochrome')) return criar('grayscale', 1);
  if (nome.includes('pixelate') || nome.includes('tile')) return criar('pixelate', norm('size', 0.3));
  if (nome.includes('glow')) return criar('glow', norm('amount', 0.4));
  return null; // gradiente, tile decorativo, etc. → ignorado
};

/* ============================================================
   LEITURA
   ============================================================ */

export interface MidiaAlight {
  uri: string;
  filename: string;
  tipo: 'video' | 'audio' | 'image';
  duracaoMs: number;
  largura: number;
  altura: number;
  /** vinculado a um arquivo real depois */
  assetId?: string;
}

export interface ResultadoImport {
  doc: ProjectDoc;
  midias: MidiaAlight[];
  relatorio: {
    elementos: number;
    porTipo: Record<string, number>;
    efeitosAplicados: number;
    efeitosIgnorados: number;
    duracaoMs: number;
    largura: number;
    altura: number;
    fps: number;
    avisos: string[];
  };
}

/** lê o XML e devolve o projecto convertido (mídias ainda sem arquivo) */
export function importarAlight(xmlTexto: string, nomeProjeto = 'Projeto importado'): ResultadoImport {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlTexto, 'text/xml');

  const erro = xml.querySelector('parsererror');
  if (erro) throw new Error('XML inválido ou corrompido — confirme que é um projeto do Alight Motion.');

  const raiz =
    xml.querySelector('scene') ??
    (xml.documentElement.tagName === 'scene' ? xml.documentElement : null);
  if (!raiz) throw new Error('Este arquivo não parece um projeto do Alight Motion (tag <scene> não encontrada).');

  const largura = numero(raiz, 'width', 1080);
  const altura = numero(raiz, 'height', 1920);
  const fps = numero(raiz, 'fps', 30) || 30;
  const duracao = numero(raiz, 'totalTime', 5000) || 5000;
  const fundo = cor(texto(raiz, 'bgcolor'), '#000000');

  const avisos: string[] = [];

  /* ---------------- mídias ---------------- */
  const midias: MidiaAlight[] = [];
  for (const m of Array.from(xml.querySelectorAll('media'))) {
    const tipoBruto = texto(m, 'type').toLowerCase();
    const tipo: MidiaAlight['tipo'] = tipoBruto.startsWith('video')
      ? 'video'
      : tipoBruto.startsWith('audio')
        ? 'audio'
        : 'image';
    midias.push({
      uri: texto(m, 'uri'),
      filename: texto(m, 'filename') || texto(m, 'title') || 'mídia',
      tipo,
      duracaoMs: numero(m, 'duration', 0),
      largura: numero(m, 'width', 0),
      altura: numero(m, 'height', 0),
    });
  }
  if (midias.length) {
    avisos.push(
      `${midias.length} mídia(s) do projeto original não vêm dentro do XML — reconecte cada uma na aba Mídia.`,
    );
  }

  /* ---------------- trilhas ---------------- */
  const tracks: Track[] = [
    { id: uid('trk'), name: 'Texto 1', kind: 'video', height: 44, muted: false, locked: false, hidden: false },
    { id: uid('trk'), name: 'Vídeo 1', kind: 'video', height: 52, muted: false, locked: false, hidden: false },
    { id: uid('trk'), name: 'Vídeo 2', kind: 'video', height: 52, muted: false, locked: false, hidden: false },
    { id: uid('trk'), name: 'Áudio 1', kind: 'audio', height: 44, muted: false, locked: false, hidden: false },
  ];
  const trilhaTexto = tracks[0].id;
  const trilhaVideo = tracks[1].id;
  const trilhaVideo2 = tracks[2].id;
  const trilhaAudio = tracks[3].id;

  const elements: VxElement[] = [];
  const assets: MediaAsset[] = [];
  const porTipo: Record<string, number> = {};
  let efeitosAplicados = 0;
  let efeitosIgnorados = 0;
  let indiceVideo = 0;

  const contar = (t: string) => {
    porTipo[t] = (porTipo[t] ?? 0) + 1;
  };

  /** converte <transform> em Transform do Vortex */
  const lerTransform = (el: globalThis.Element, cx: number, cy: number) => {
    const t = identityTransform();
    const tr = el.querySelector(':scope > transform');

    const loc = tr?.querySelector('location');
    if (loc) {
      const [x, y] = ponto(texto(loc, 'value') || '0,0');
      // Alight Motion usa o centro do canvas como origem
      t.x = anim(Math.round(x - cx));
      t.y = anim(Math.round(y - cy));
    }

    const esc = tr?.querySelector('scale');
    if (esc) {
      const [sx] = ponto(texto(esc, 'value') || '1,1');
      t.scale = anim(Number.isFinite(sx) && sx !== 0 ? sx : 1);
    }

    const op = tr?.querySelector('opacity');
    if (op) t.opacity = anim(parseFloat(texto(op, 'value')) || 1);

    return t;
  };

  /** efeitos filhos diretos */
  const lerEfeitos = (el: globalThis.Element): Effect[] => {
    const lista: Effect[] = [];
    for (const fx of Array.from(el.querySelectorAll(':scope > effect'))) {
      const props = new Map<string, string>();
      for (const p of Array.from(fx.querySelectorAll('property'))) {
        props.set(texto(p, 'name'), texto(p, 'value'));
      }
      const convertido = mapearEfeito(texto(fx, 'id'), props);
      if (convertido) {
        lista.push(convertido);
        efeitosAplicados += 1;
      } else {
        efeitosIgnorados += 1;
      }
    }
    return lista;
  };

  /* ---------------- conversão dos elementos ---------------- */
  const candidatos = Array.from(raiz.querySelectorAll(':scope > *')).filter((el) =>
    ['shape', 'embedScene', 'group', 'text', 'image', 'video', 'layer'].includes(el.tagName.toLowerCase()),
  );

  for (const el of candidatos) {
    const tag = el.tagName.toLowerCase();
    const inicio = numero(el, 'startTime', 0);
    const fim = numero(el, 'endTime', duracao);
    const dur = Math.max(100, fim - inicio);
    const rotulo = texto(el, 'label') || tag;
    const transform = lerTransform(el, largura / 2, altura / 2);
    const efeitos = lerEfeitos(el);
    const blend = blending(texto(el, 'blending'));

    const fillType = texto(el, 'fillType');
    const fillVideo = texto(el, 'fillVideo');

    let elemento: VxElement | null = null;

    if (tag === 'shape' && fillType === 'media' && fillVideo) {
      /* ---------- clipe de mídia ---------- */
      const midia = midias.find((m) => m.uri === fillVideo);
      let asset = assets.find((a) => a.name === (midia?.filename ?? fillVideo));

      if (!asset) {
        asset = {
          id: uid('ast'),
          name: midia?.filename ?? fillVideo.split('/').pop() ?? 'mídia',
          kind: midia?.tipo ?? 'video',
          url: '', // será preenchido no relink
          durationMs: midia?.duracaoMs ?? dur,
          width: midia?.largura,
          height: midia?.altura,
          origin: 'user',
        };
        assets.push(asset);
      }

      const ehAudio = (midia?.tipo ?? 'video') === 'audio';
      elemento = {
        id: uid('el'),
        type: ehAudio ? 'audio' : 'video',
        name: rotulo,
        trackId: ehAudio ? trilhaAudio : indiceVideo++ % 2 === 0 ? trilhaVideo : trilhaVideo2,
        start: inicio,
        duration: dur,
        sourceIn: 0,
        assetId: asset.id,
        transform,
        blend,
        effects: efeitos,
        volume: 1,
        locked: false,
        hidden: false,
        color: ehAudio ? '#818cf8' : '#22d3ee',
      };
      contar(ehAudio ? 'audio' : 'video');
    } else if (tag === 'shape' || tag === 'embedScene' || tag === 'group') {
      /* ---------- forma / grupo ---------- */
      const props = new Map<string, string>();
      for (const p of Array.from(el.querySelectorAll(':scope > property'))) {
        props.set(texto(p, 'name'), texto(p, 'value'));
      }
      const tamanho = (props.get('size') ?? '200,200').split(',').map(Number);
      const preenchimento = cor(texto(el, 'fillColor') || propCor(el), '#8b5cf6');

      // fundo preenchido de tela inteira + blending ≈ camada de cor (grading)
      const w = Number.isFinite(tamanho[0]) && tamanho[0] > 0 ? tamanho[0] : 200;
      const h = Number.isFinite(tamanho[1]) && tamanho[1] > 0 ? tamanho[1] : 200;
      const ehCorGrade = w >= largura * 0.9 && h >= altura * 0.9 && efeitos.length > 0;

      elemento = {
        id: uid('el'),
        type: 'shape',
        name: ehCorGrade ? `Cor: ${rotulo}` : rotulo,
        trackId: trilhaVideo2,
        start: inicio,
        duration: dur,
        sourceIn: 0,
        assetId: null,
        transform,
        blend,
        effects: efeitos,
        shape: { kind: 'rect', fill: preenchimento, radius: 0 },
        volume: 1,
        locked: false,
        hidden: false,
        color: ehCorGrade ? '#a78bfa' : '#fbbf24',
      };
      contar('shape');
    } else if (tag === 'text') {
      elemento = {
        id: uid('el'),
        type: 'text',
        name: rotulo,
        trackId: trilhaTexto,
        start: inicio,
        duration: dur,
        sourceIn: 0,
        assetId: null,
        transform,
        blend,
        effects: efeitos,
        text: {
          content: texto(el, 'text') || rotulo,
          fontFamily: 'Inter',
          fontSize: numero(el, 'size', 120) || 120,
          fontWeight: 800,
          color: cor(texto(el, 'fillColor'), '#ffffff'),
          align: 'center',
          strokeColor: '#000000',
          strokeWidth: 0,
          shadow: false,
          letterSpacing: 0,
          uppercase: false,
        },
        volume: 1,
        locked: false,
        hidden: false,
        color: '#f472b6',
      };
      contar('text');
    }

    if (elemento) elements.push(elemento);
  }

  if (elements.length === 0) {
    avisos.push('Nenhum elemento visível foi encontrado — o projeto pode usar apenas recursos externos.');
  }

  const doc: ProjectDoc = {
    version: 1,
    id: uid('prj'),
    name: nomeProjeto,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {
      width: Math.round(largura),
      height: Math.round(altura),
      fps: Math.round(fps),
      sampleRate: 48000,
      background: fundo,
    },
    tracks,
    elements,
    assets,
    markers: [],
  };

  return {
    doc,
    midias,
    relatorio: {
      elementos: elements.length,
      porTipo,
      efeitosAplicados,
      efeitosIgnorados,
      duracaoMs: duracao,
      largura: Math.round(largura),
      altura: Math.round(altura),
      fps: Math.round(fps),
      avisos,
    },
  };
}

/** lê <property name="color1"> quando não há fillColor direto */
function propCor(el: globalThis.Element): string {
  for (const p of Array.from(el.querySelectorAll(':scope > property'))) {
    if (['color', 'color1', 'fill'].includes(texto(p, 'name'))) return texto(p, 'value');
  }
  return '';
}

/** resumo curto para exibir antes de importar */
export function analisarAlight(xmlTexto: string): {
  ok: boolean;
  erro?: string;
  titulo?: string;
  largura?: number;
  altura?: number;
  fps?: number;
  duracaoMs?: number;
  midias?: number;
  elementos?: number;
} {
  try {
    const r = importarAlight(xmlTexto);
    return {
      ok: true,
      titulo: r.doc.name,
      largura: r.relatorio.largura,
      altura: r.relatorio.altura,
      fps: r.relatorio.fps,
      duracaoMs: r.relatorio.duracaoMs,
      midias: r.midias.length,
      elementos: r.relatorio.elementos,
    };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
