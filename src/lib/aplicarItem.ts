import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import type { LibItem } from '../data/library';
import { identityTransform, uid } from '../types';
import type { EffectType } from '../types';
import { PRESET_POR_ITEM, adicionarNaTimeline } from './sons';
import type { Preset } from './sons';

/**
 * MOTOR DE APLICAÇÃO DA BIBLIOTECA
 * ------------------------------------------------------------
 * Nenhum card fica sem resposta: se o item depende de um clipe, o motor
 * escolhe o alvo (seleção → clipe sob o playhead → cria um clipe base).
 */

const alvoEfeito = (): string | null => {
  const ed = useEditor.getState();
  const sel = ed.selection[0];
  if (sel && ed.doc.elements.some((e) => e.id === sel)) return sel;
  const sobPlayhead = ed.doc.elements.find(
    (e) => ed.playhead >= e.start && ed.playhead < e.start + e.duration && e.type !== 'audio',
  );
  if (sobPlayhead) return sobPlayhead.id;
  const qualquer = ed.doc.elements.find((e) => e.type !== 'audio' && e.type !== 'adjustment');
  return qualquer?.id ?? null;
};

/** garante um clipe na timeline para receber efeitos quando o projeto está vazio */
const garantirClipe = (): string => {
  const ed = useEditor.getState();
  const existente = alvoEfeito();
  if (existente) return existente;
  ed.addShape('rect');
  const novo = useEditor.getState();
  const id = novo.doc.elements[novo.doc.elements.length - 1].id;
  novo.updateElement(
    id,
    {
      name: 'Clipe base',
      shape: { kind: 'rect', fill: '#1f2937', radius: 8 },
      duration: Math.max(4000, novo.duration()),
    },
    false,
  );
  return id;
};

/* ---------------- presets visuais (overlays e fundos) ---------------- */

const OVERLAYS: Record<string, { nome: string; fill: string; blend: string; efeitos?: [EffectType, number][]; opacidade?: number }> = {
  bokeh: { nome: 'Bokeh', fill: 'radial-gradient(circle at 30% 30%, #7dd3fc55, transparent 60%)', blend: 'screen', opacidade: 0.55, efeitos: [['blur', 6]] },
  dust: { nome: 'Poeira', fill: 'radial-gradient(circle at 50% 50%, #fef3c722, transparent 70%)', blend: 'screen', opacidade: 0.65, efeitos: [['grain', 0.5]] },
  vhs: { nome: 'VHS', fill: 'repeating-linear-gradient(0deg, #ffffff10 0 2px, transparent 2px 4px)', blend: 'overlay', opacidade: 0.5, efeitos: [['rgbsplit', 3]] },
  flare: { nome: 'Lens Flare', fill: 'radial-gradient(circle at 80% 20%, #fde68add, transparent 45%)', blend: 'screen', opacidade: 0.85, efeitos: [['glow', 0.6]] },
  rain: { nome: 'Chuva', fill: 'repeating-linear-gradient(105deg, #93c5fd33 0 1px, transparent 1px 9px)', blend: 'screen', opacidade: 0.6 },
  snow: { nome: 'Neve', fill: 'radial-gradient(circle at 20% 30%, #ffffffcc 1px, transparent 2px)', blend: 'screen', opacidade: 0.7 },
  scanlines: { nome: 'Scanlines', fill: 'repeating-linear-gradient(0deg, #00000055 0 1px, transparent 1px 3px)', blend: 'multiply', opacidade: 0.6 },
  leak: { nome: 'Light Leak', fill: 'linear-gradient(120deg, #fb923c55, transparent 45%, #fde68a44)', blend: 'screen', opacidade: 0.8, efeitos: [['glow', 0.4]] },
  burn: { nome: 'Film Burn', fill: 'radial-gradient(circle at 50% 100%, #f9731677, transparent 60%)', blend: 'screen', opacidade: 0.75, efeitos: [['grain', 0.4]] },
};

const FUNDOS: Record<string, { nome: string; fill: string; efeitos?: [EffectType, number][] }> = {
  preto: { nome: 'Fundo preto', fill: '#000000' },
  branco: { nome: 'Fundo branco', fill: '#ffffff' },
  azul: { nome: 'Gradiente azul', fill: 'linear-gradient(160deg,#1d4ed8,#0f172a)' },
  roxo: { nome: 'Gradiente roxo', fill: 'linear-gradient(160deg,#7c3aed,#111827)' },
  sunset: { nome: 'Sunset', fill: 'linear-gradient(160deg,#f97316,#7c2d12)' },
  grid: { nome: 'Grid tech', fill: 'linear-gradient(160deg,#0ea5e9,#020617)', efeitos: [['grain', 0.15]] },
};

/* ---------------- templates com keyframes extras ---------------- */

interface CtxTpl {
  ed: ReturnType<typeof useEditor.getState>;
  doc: ReturnType<typeof useEditor.getState>['doc'];
}

const kf = (arr: Array<[number, number, string?]>) =>
  arr.map(([t, v, e]) => ({ t, v, easing: (e ?? 'easeOut') as never }));

/* ============================================================
   APLICAR
   ============================================================ */
export function aplicarItem(item: LibItem): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const doc = ed.doc;

  window.dispatchEvent(new Event('vortex:fechar-gaveta'));

  /* ---------- texto ---------- */
  if (item.apply.type === 'text') {
    const { content, size, weight, uppercase } = item.apply;
    ed.addText(content);
    const el = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
    if (el?.text) {
      useEditor.getState().updateElement(
        el.id,
        {
          text: {
            ...el.text,
            fontSize: Math.round(doc.settings.height * (size ?? 0.075)),
            fontWeight: weight ?? 800,
            uppercase: uppercase ?? false,
          },
        },
        false,
      );
    }
    ui.toast(`Texto “${item.name}” adicionado`, 'ok');
    return;
  }

  /* ---------- forma ---------- */
  if (item.apply.type === 'shape') {
    ed.addShape(item.apply.shape);
    const el = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
    if (el) useEditor.getState().updateElement(el.id, { shape: { kind: item.apply.shape, fill: item.apply.fill, radius: 12 } }, false);
    ui.toast('Forma adicionada', 'ok');
    return;
  }

  /* ---------- efeito ---------- */
  if (item.apply.type === 'fx') {
    const VALIDOS: EffectType[] = ['blur','glow','brightness','contrast','saturation','hue','grayscale','sepia','invert','pixelate','rgbsplit','vignette','grain','sharpen'];
    const tipo = (VALIDOS.includes(item.apply.effect as EffectType) ? item.apply.effect : 'blur') as EffectType;
    const alvo = garantirClipe();
    ed.setEffect(alvo, tipo, item.apply.amount);
    ui.toast(`“${item.name}” aplicado no clipe`, 'ok');
    return;
  }

  /* ---------- som / música ---------- */
  if (item.apply.type === 'som') {
    const preset = (PRESET_POR_ITEM[item.id] ?? item.apply.preset) as Preset;
    void adicionarNaTimeline(preset, item.name, item.apply.loop)
      .then(() => ui.toast(`“${item.name}” na timeline e na aba Mídia`, 'ok'))
      .catch(() => ui.toast('Não foi possível gerar o áudio', 'err'));
    return;
  }

  /* ---------- overlay / efeito na tela ---------- */
  if (item.apply.type === 'overlay') {
    const cfg = OVERLAYS[item.apply.preset] ?? OVERLAYS.bokeh;
    ed.addShape('rect');
    const el = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
    useEditor.getState().updateElement(
      el.id,
      {
        name: cfg.nome,
        shape: { kind: 'rect', fill: cfg.fill, radius: 0 },
        blend: cfg.blend as never,
        duration: Math.max(4000, Math.min(8000, ed.duration() || 8000)),
      },
      false,
    );
    useEditor.getState().updateTransform(el.id, 'opacity', { base: Math.min(0.95, Math.max(0.05, cfg.opacidade ?? 0.8)), keyframes: [] });
    cfg.efeitos?.forEach(([tipo, qtd]) => useEditor.getState().setEffect(el.id, tipo, qtd));
    ui.toast(`“${cfg.nome}” adicionado como camada`, 'ok');
    return;
  }

  /* ---------- fundo ---------- */
  if (item.apply.type === 'fundo') {
    const cfg = FUNDOS[item.apply.preset] ?? FUNDOS.preto;
    /* escolhe a trilha de vídeo mais baixa para ficar atrás de tudo */
    const trilhasV = doc.tracks.filter((t) => t.kind === 'video');
    const trilhaFundo = trilhasV[trilhasV.length - 1]?.id;
    ed.addShape('rect');
    const el = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
    useEditor.getState().updateElement(
      el.id,
      {
        name: cfg.nome,
        shape: { kind: 'rect', fill: cfg.fill, radius: 0 },
        start: 0,
        duration: Math.max(4000, ed.duration() || 8000),
        trackId: trilhaFundo ?? el.trackId,
      },
      false,
    );
    useEditor.getState().updateTransform(el.id, 'scale', { base: 4, keyframes: [] });
    cfg.efeitos?.forEach(([tipo, qtd]) => useEditor.getState().setEffect(el.id, tipo, qtd));
    ui.toast(`“${cfg.nome}” aplicado`, 'ok');
    return;
  }

  /* ---------- template com keyframes ---------- */
  if (item.apply.type === 'kf') {
    const preset = item.apply.preset;
    const W = doc.settings.width;
    const H = doc.settings.height;
    const base = W / 2;
    const meio = H / 2;

    if (preset === 'lowerThird') {
      ed.addShape('rect');
      const barra = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
      useEditor.getState().updateElement(barra.id, {
        name: 'Barra do lower third',
        shape: { kind: 'rect', fill: '#0ea5e9', radius: 6 },
        duration: 4000,
      }, false);
      useEditor.getState().updateTransform(barra.id, 'x', { base: W * 0.3, keyframes: kf([[0, W * 0.1, 'easeOut'], [450, W * 0.3]]) });
      useEditor.getState().updateTransform(barra.id, 'y', { base: H * 0.78, keyframes: [] });
      useEditor.getState().updateTransform(barra.id, 'opacity', { base: 1, keyframes: kf([[0, 0], [200, 1]]) });

      ed.addText('NOME DO ENTREVISTADO');
      const nome = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
      useEditor.getState().updateElement(nome.id, {
        text: { ...nome.text!, fontSize: Math.round(H * 0.042), fontWeight: 800, align: 'left' },
        duration: 4000,
      }, false);
      useEditor.getState().updateTransform(nome.id, 'x', { base: W * 0.22, keyframes: [] });
      useEditor.getState().updateTransform(nome.id, 'y', { base: H * 0.76, keyframes: [] });
      useEditor.getState().updateTransform(nome.id, 'opacity', { base: 1, keyframes: kf([[0, 0], [260, 1]]) });

      ed.addText('cargo · empresa');
      const cargo = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
      useEditor.getState().updateElement(cargo.id, {
        text: { ...cargo.text!, fontSize: Math.round(H * 0.024), fontWeight: 500, align: 'left' },
        duration: 4000,
      }, false);
      useEditor.getState().updateTransform(cargo.id, 'x', { base: W * 0.19, keyframes: [] });
      useEditor.getState().updateTransform(cargo.id, 'y', { base: H * 0.82, keyframes: [] });
      useEditor.getState().updateTransform(cargo.id, 'opacity', { base: 1, keyframes: kf([[0, 0], [420, 1]]) });
      useEditor.getState().setPlayhead(700);
      ui.toast('Lower third criado (arraste na tela para ajustar)', 'ok');
      return;
    }

    if (preset === 'split') {
      ed.addShape('rect');
      const esq = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
      useEditor.getState().updateElement(esq.id, { name: 'Lado esquerdo', shape: { kind: 'rect', fill: '#1e293b', radius: 0 }, duration: 4000 }, false);
      useEditor.getState().updateTransform(esq.id, 'x', { base: W * 0.25, keyframes: [] });
      useEditor.getState().updateTransform(esq.id, 'scale', { base: 1.6, keyframes: [] });
      ed.addShape('rect');
      const dir = useEditor.getState().doc.elements[useEditor.getState().doc.elements.length - 1];
      useEditor.getState().updateElement(dir.id, { name: 'Lado direito', shape: { kind: 'rect', fill: '#0f766e', radius: 0 }, duration: 4000 }, false);
      useEditor.getState().updateTransform(dir.id, 'x', { base: W * 0.75, keyframes: [] });
      useEditor.getState().updateTransform(dir.id, 'scale', { base: 1.6, keyframes: [] });
      ui.toast('Split screen criado', 'ok');
      return;
    }

    const id = ed.addText(preset === 'caption' ? 'SEU TEXTO AQUI' : 'TÍTULO');
    const el = useEditor.getState().doc.elements.find((e) => e.id === id);
    if (!el) return;

    if (preset === 'caption') {
      useEditor.getState().updateElement(id, {
        text: { ...el.text!, fontSize: Math.round(H * 0.055), fontWeight: 900, uppercase: true },
      }, false);
      useEditor.getState().updateTransform(id, 'y', { base: H * 0.82, keyframes: [] });
      useEditor.getState().setEffect(id, 'glow', 0.5);
    }

    const { ed: e2 } = { ed: useEditor.getState() };
    const presets: Record<string, () => void> = {
      pop: () => {
        e2.updateTransform(id, 'scale', { keyframes: kf([[0, 0.2, 'overshoot'], [400, 1.12], [620, 1, 'easeInOut']]) });
        e2.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [220, 1]]) });
      },
      zoomPunch: () => {
        e2.updateTransform(id, 'scale', { keyframes: kf([[0, 2.4, 'easeIn'], [280, 1, 'overshoot']]) });
        e2.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [120, 1]]) });
      },
      slide: () => {
        e2.updateTransform(id, 'x', { keyframes: kf([[0, base - W * 0.7], [520, base]]) });
        e2.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [200, 1]]) });
      },
      fade: () => e2.updateTransform(id, 'opacity', { keyframes: kf([[0, 0, 'easeInOut'], [900, 1, 'easeInOut']]) }),
      bounce: () => {
        e2.updateTransform(id, 'y', { keyframes: kf([[0, meio - 420, 'bounce'], [900, meio]]) });
        e2.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [160, 1]]) });
      },
      spin: () => {
        e2.updateTransform(id, 'rotation', { keyframes: kf([[0, -180], [700, 0]]) });
        e2.updateTransform(id, 'scale', { keyframes: kf([[0, 0.1], [700, 1, 'overshoot']]) });
      },
      glitchIn: () => {
        e2.setEffect(id, 'rgbsplit', 10);
        e2.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [90, 1], [180, 0.35], [260, 1]]) });
        e2.updateTransform(id, 'x', { keyframes: kf([[0, base - 22], [120, base + 18], [240, base - 8], [320, base]]) });
      },
      kenBurns: () => e2.updateTransform(id, 'scale', { keyframes: kf([[0, 1, 'linear'], [5000, 1.18, 'linear']]) }),
      typewriter: () => {
        e2.updateTransform(id, 'opacity', {
          keyframes: Array.from({ length: 12 }, (_, i) => ({ t: i * 120, v: i % 2 === 0 ? 1 : 0.25, easing: 'linear' as never })),
        });
      },
      caption: () => {
        e2.updateTransform(id, 'scale', { keyframes: kf([[0, 0.7, 'overshoot'], [220, 1.05], [320, 1]]) });
        e2.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [140, 1]]) });
      },
      lowerThird: () => undefined,
      split: () => undefined,
    };
    presets[preset]?.();
    /* mostra já o resultado: playhead um pouco depois do início da animação */
    useEditor.getState().setPlayhead(Math.min(useEditor.getState().duration(), id ? 600 : 0));
    ui.toast(`Template “${item.name}” aplicado`, 'ok');
    return;
  }

  /* ---------- mídia real (precisa do Drive) ---------- */
  if (item.apply.type === 'media') {
    ui.toast('Este é um arquivo de vídeo — abrindo o acervo do Drive', 'default');
    ui.openModal('packs');
    return;
  }

  ui.toast('Item aplicado', 'ok');
}

/* expõe para a timeline (arrastar da aba Mídia) */
export const registrarAddMedia = (fn: (assetId: string, trackId?: string, start?: number) => void) => {
  (window as unknown as Record<string, unknown>).__vortexAddMedia = fn;
};

export { identityTransform, uid };
