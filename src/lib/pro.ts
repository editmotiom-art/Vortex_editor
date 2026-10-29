import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { uid } from '../types';

/**
 * FERRAMENTAS PROFISSIONAIS
 * ------------------------------------------------------------
 * O que editores de verdade (Premiere, Resolve, After Effects, CapCut Pro)
 * têm e que faltava aqui:
 *   · transição com DURAÇÃO real (entra e sai dissolvendo)
 *   · keyframe manual em qualquer propriedade
 *   · congelar frame (freeze)
 *   · remover áudio do clipe (unlink)
 *   · foco suave / profundidade de campo (máscara radial)
 *   · ajustes de cinema em 1 clique (teal-orange, bleach, HDR…)
 *   · rajada de keyframes (zoom in/out automático)
 */

export interface AssistenteTransicao {
  tipo: 'fade' | 'slide' | 'zoom' | 'blur' | 'wipe';
  duracaoMs: number;
}

/* ---------- transição com duração ---------- */
export function aplicarTransicao(ass: AssistenteTransicao): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const sel = ed.selection[0];
  if (!sel) {
    ui.toast('Selecione o clipe onde a transição deve entrar', 'warn');
    return;
  }
  const el = ed.doc.elements.find((e) => e.id === sel);
  if (!el) return;
  const d = Math.min(ass.duracaoMs, Math.max(200, el.duration / 2));

  if (ass.tipo === 'fade') {
    ed.updateTransform(el.id, 'opacity', {
      keyframes: [
        { t: 0, v: 0, easing: 'easeOut' },
        { t: d, v: 1, easing: 'easeInOut' },
        { t: Math.max(d + 1, el.duration - d), v: 1, easing: 'easeInOut' },
        { t: el.duration, v: 0, easing: 'easeIn' },
      ],
    });
    ui.toast(`Fade de ${d} ms aplicado (entra e sai)`, 'ok');
    return;
  }

  if (ass.tipo === 'slide') {
    const W = ed.doc.settings.width;
    ed.updateTransform(el.id, 'x', {
      keyframes: [
        { t: 0, v: W * 1.1, easing: 'easeOut' },
        { t: d, v: W / 2, easing: 'easeOut' },
      ],
    });
    ed.updateTransform(el.id, 'opacity', {
      keyframes: [
        { t: 0, v: 0.2, easing: 'easeOut' },
        { t: Math.round(d * 0.6), v: 1, easing: 'easeOut' },
      ],
    });
    ui.toast(`Slide de ${d} ms aplicado`, 'ok');
    return;
  }

  if (ass.tipo === 'zoom') {
    ed.updateTransform(el.id, 'scale', {
      keyframes: [
        { t: 0, v: 1.6, easing: 'easeOut' },
        { t: d, v: 1, easing: 'easeOut' },
      ],
    });
    ed.setEffect(el.id, 'blur', 6);
    ui.toast(`Zoom de ${d} ms aplicado`, 'ok');
    return;
  }

  if (ass.tipo === 'blur') {
    ed.setEffect(el.id, 'blur', 14);
    ed.updateTransform(el.id, 'opacity', {
      keyframes: [
        { t: 0, v: 0, easing: 'easeInOut' },
        { t: d, v: 1, easing: 'easeInOut' },
      ],
    });
    ui.toast(`Blur dissolve de ${d} ms aplicado`, 'ok');
    return;
  }

  /* wipe: máscara por escala horizontal vinda da esquerda */
  ed.updateTransform(el.id, 'scale', {
    keyframes: [
      { t: 0, v: 0.01, easing: 'easeInOut' },
      { t: d, v: 1, easing: 'easeInOut' },
    ],
  });
  ui.toast(`Wipe de ${d} ms aplicado`, 'ok');
}

/* ---------- keyframe manual ---------- */
export function marcarKeyframe(prop: 'x' | 'y' | 'scale' | 'rotation' | 'opacity'): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const sel = ed.selection[0];
  if (!sel) {
    ui.toast('Selecione um clipe primeiro', 'warn');
    return;
  }
  const el = ed.doc.elements.find((e) => e.id === sel);
  if (!el) return;
  ed.commit();
  ed.toggleKeyframe(sel, prop);
  const kf = (useEditor.getState().doc.elements.find((e) => e.id === sel)?.transform[prop].keyframes ?? []).length;
  ui.toast(`${kf} keyframe(s) em ${prop}`, 'ok');
}

/* ---------- congelar frame ---------- */
export function congelarFrame(): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const sel = ed.selection[0] ?? ed.doc.elements.find((e) => ed.playhead >= e.start && ed.playhead < e.start + e.duration)?.id;
  const el = ed.doc.elements.find((e) => e.id === sel);
  if (!el) {
    ui.toast('Coloque o playhead sobre um clipe', 'warn');
    return;
  }
  const asset = ed.doc.assets.find((a) => a.id === el.assetId);
  const novoInicio = ed.playhead;
  ed.commit();

  /* captura o frame atual do preview e transforma em imagem parada */
  const canvas = document.querySelector('.stage canvas') as HTMLCanvasElement | null;
  if (canvas) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const img = useEditor.getState().addAsset({
        name: `Congelado ${new Date().toLocaleTimeString('pt-BR')}.png`,
        kind: 'image',
        url,
        durationMs: 3000,
        origin: 'user',
        sizeBytes: blob.size,
      });
      const atual = useEditor.getState();
      const trilha = atual.trilhaPara('video')?.id ?? el.trackId;
      atual.addElement({
        type: 'image',
        name: 'Frame congelado',
        trackId: trilha,
        start: novoInicio,
        duration: 1500,
        sourceIn: 0,
        assetId: img.id,
        transform: {
          x: { base: atual.doc.settings.width / 2, keyframes: [] },
          y: { base: atual.doc.settings.height / 2, keyframes: [] },
          scale: { base: 1, keyframes: [] },
          rotation: { base: 0, keyframes: [] },
          opacity: { base: 1, keyframes: [] },
        },
        blend: 'normal',
        effects: [],
        volume: 1,
        locked: false,
        hidden: false,
        color: '#fbbf24',
      });
      useUI.getState().toast('Frame congelado criado na timeline', 'ok');
    });
  } else if (asset) {
    ui.toast('Não consegui capturar o frame — tente com o preview visível', 'warn');
  }
}

/* ---------- separar / remover áudio ---------- */
export function separarAudio(): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const sel = ed.selection[0];
  const el = ed.doc.elements.find((e) => e.id === sel);
  if (!el || el.type !== 'video' || !el.assetId) {
    ui.toast('Selecione um clipe de vídeo', 'warn');
    return;
  }
  const trilhaAudio = ed.trilhaPara('audio');
  if (!trilhaAudio) {
    ui.toast('Crie uma trilha de áudio primeiro', 'warn');
    return;
  }
  ed.commit();
  ed.addElement({
    type: 'audio',
    name: `${el.name} (áudio)`,
    trackId: trilhaAudio.id,
    start: el.start,
    duration: el.duration,
    sourceIn: el.sourceIn,
    assetId: el.assetId,
    transform: {
      x: { base: ed.doc.settings.width / 2, keyframes: [] },
      y: { base: ed.doc.settings.height / 2, keyframes: [] },
      scale: { base: 1, keyframes: [] },
      rotation: { base: 0, keyframes: [] },
      opacity: { base: 1, keyframes: [] },
    },
    blend: 'normal',
    effects: [],
    volume: 1,
    locked: false,
    hidden: false,
    color: '#818cf8',
  });
  ed.updateElement(el.id, { volume: 0 }, false);
  ui.toast('Áudio separado em uma trilha própria', 'ok');
}

/* ---------- foco suave (profundidade de campo simulada) ---------- */
export function focoSuave(): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const sel = ed.selection[0];
  const el = ed.doc.elements.find((e) => e.id === sel);
  if (!el) {
    ui.toast('Selecione o clipe que deve ficar desfocado', 'warn');
    return;
  }
  ed.commit();
  const W = ed.doc.settings.width;
  const H = ed.doc.settings.height;
  ed.addShape('rect');
  const atual = useEditor.getState();
  const vinheta = atual.doc.elements[atual.doc.elements.length - 1];
  atual.updateElement(
    vinheta.id,
    {
      name: 'Foco suave',
      shape: {
        kind: 'rect',
        fill: 'radial-gradient(circle at 50% 50%, #00000000 32%, #000000cc 70%)',
        radius: 0,
      },
      duration: el.duration,
      start: el.start,
    },
    false,
  );
  atual.updateTransform(vinheta.id, 'x', { base: W / 2, keyframes: [] });
  atual.updateTransform(vinheta.id, 'y', { base: H / 2, keyframes: [] });
  ui.toast('Foco suave aplicado (duplo clique na camada para ajustar)', 'ok');
}

/* ---------- looks de cinema ---------- */
export const LOOKS_CINEMA: { id: string; nome: string; efeitos: [string, number][] }[] = [
  { id: 'teal-orange', nome: 'Teal & Orange (Hollywood)', efeitos: [['contrast', 1.18], ['saturation', 1.15], ['hue', 8]] },
  { id: 'bleach', nome: 'Bleach Bypass', efeitos: [['saturation', 0.55], ['contrast', 1.35], ['brightness', 1.05]] },
  { id: 'moody', nome: 'Moody Dark', efeitos: [['brightness', 0.88], ['contrast', 1.22], ['saturation', 0.85]] },
  { id: 'kodak', nome: 'Kodak Film', efeitos: [['saturation', 1.1], ['contrast', 1.08], ['grain', 0.18]] },
  { id: 'anamorphic', nome: 'Anamorphic', efeitos: [['contrast', 1.12], ['glow', 0.35], ['brightness', 1.04]] },
  { id: 'night', nome: 'Night Blue', efeitos: [['hue', -22], ['brightness', 0.9], ['contrast', 1.15]] },
  { id: 'hdr', nome: 'HDR Punch', efeitos: [['contrast', 1.32], ['saturation', 1.25], ['sharpen', 0.4]] },
  { id: 'vintage', nome: 'Vintage 70s', efeitos: [['sepia', 0.35], ['grain', 0.3], ['saturation', 0.9]] },
];

export function aplicarLookCinema(id: string): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const look = LOOKS_CINEMA.find((l) => l.id === id);
  if (!look) return;
  let alvo = ed.selection[0];
  if (!alvo) {
    alvo = ed.doc.elements.find((e) => ed.playhead >= e.start && ed.playhead < e.start + e.duration)?.id ?? '';
  }
  if (!alvo) {
    ui.toast('Selecione um clipe para aplicar o look', 'warn');
    return;
  }
  ed.commit();
  look.efeitos.forEach(([fx, qtd]) => useEditor.getState().setEffect(alvo, fx as never, qtd));
  ui.toast(`Look “${look.nome}” aplicado`, 'ok');
}

/* ---------- rajada de zoom (Ken Burns / punch) ---------- */
export function rajadaZoom(tipo: 'in' | 'out' | 'punch'): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const sel = ed.selection[0];
  const el = ed.doc.elements.find((e) => e.id === sel);
  if (!el) {
    ui.toast('Selecione um clipe', 'warn');
    return;
  }
  ed.commit();
  const dur = el.duration;
  if (tipo === 'in') {
    useEditor.getState().updateTransform(el.id, 'scale', {
      keyframes: [
        { t: 0, v: 1, easing: 'linear' },
        { t: dur, v: 1.25, easing: 'linear' },
      ],
    });
  } else if (tipo === 'out') {
    useEditor.getState().updateTransform(el.id, 'scale', {
      keyframes: [
        { t: 0, v: 1.25, easing: 'linear' },
        { t: dur, v: 1, easing: 'linear' },
      ],
    });
  } else {
    useEditor.getState().updateTransform(el.id, 'scale', {
      keyframes: [
        { t: 0, v: 1, easing: 'easeIn' },
        { t: Math.min(dur, 300), v: 1.3, easing: 'overshoot' },
        { t: Math.min(dur, 700), v: 1, easing: 'easeOut' },
      ],
    });
  }
  ui.toast('Movimento de câmera aplicado', 'ok');
}

/* ---------- gerar documento a partir de texto transcrito (legendas) ---------- */
export function criarLegendas(linhas: { texto: string; inicioMs: number; fimMs: number }[]): number {
  const ed = useEditor.getState();
  const H = ed.doc.settings.height;
  const W = ed.doc.settings.width;
  ed.commit();
  let n = 0;
  for (const l of linhas) {
    const id = ed.addText(l.texto);
    const atual = useEditor.getState();
    atual.updateElement(
      id,
      {
        start: l.inicioMs,
        duration: Math.max(600, l.fimMs - l.inicioMs),
        text: {
          content: l.texto,
          fontFamily: 'Inter',
          fontSize: Math.round(H * 0.045),
          fontWeight: 800,
          color: '#ffffff',
          align: 'center',
          uppercase: false,
          letterSpacing: 0,
          stroke: 3,
          strokeColor: '#000000',
          shadow: true,
          shadowColor: '#000000',
        } as never,
        name: l.texto.slice(0, 22),
      },
      false,
    );
    atual.updateTransform(id, 'x', { base: W / 2, keyframes: [] });
    atual.updateTransform(id, 'y', { base: H * 0.82, keyframes: [] });
    n += 1;
  }
  return n;
}

/* ---------- id utilitário exposto para os módulos novos ---------- */
export const novoId = (p: string) => uid(p);
