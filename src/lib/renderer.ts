import type { Element, ProjectDoc } from '../types';
import { valueAt } from './anim';
import { filterCss, canvasPasses } from './fx';

/**
 * COMPOSITOR
 * ------------------------------------------------------------
 * Uma função pura-ish: dado (doc, tempo, ctx, fontes) desenha o frame.
 * Preview e export chamam ESTA função → paridade garantida.
 */

export interface MediaPool {
  get(assetId: string): HTMLVideoElement | HTMLImageElement | null;
}

/** cache de mídia: um <video> por asset (reutilizado, sem recriar a cada frame) */
export class MediaCache implements MediaPool {
  private videos = new Map<string, HTMLVideoElement>();
  private images = new Map<string, HTMLImageElement>();

  syncFor(doc: ProjectDoc, timeMs: number, playing: boolean): void {
    const active = new Set<string>();
    for (const el of doc.elements) {
      if (!el.assetId || el.hidden) continue;
      if (timeMs < el.start || timeMs > el.start + el.duration) continue;
      active.add(el.assetId);
    }
    for (const asset of doc.assets) {
      if (!active.has(asset.id)) continue;
      if (asset.kind === 'video') {
        let v = this.videos.get(asset.id);
        if (!v) {
          v = document.createElement('video');
          v.src = asset.url;
          v.muted = true; // áudio é tratado pelo mixer do Web Audio
          v.playsInline = true;
          v.preload = 'auto';
          v.crossOrigin = 'anonymous';
          this.videos.set(asset.id, v);
        }
        const el = doc.elements.find((e) => e.assetId === asset.id && timeMs >= e.start && timeMs <= e.start + e.duration);
        if (el) {
          const target = (el.sourceIn + (timeMs - el.start)) / 1000;
          if (playing) {
            if (v.paused) void v.play().catch(() => undefined);
            if (Math.abs(v.currentTime - target) > 0.34) v.currentTime = Math.max(0, target);
          } else {
            if (!v.paused) v.pause();
            if (Math.abs(v.currentTime - target) > 0.02) v.currentTime = Math.max(0, target);
          }
        }
      } else if (asset.kind === 'image') {
        if (!this.images.has(asset.id)) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = asset.url;
          this.images.set(asset.id, img);
        }
      }
    }
  }

  get(assetId: string): HTMLVideoElement | HTMLImageElement | null {
    return this.videos.get(assetId) ?? this.images.get(assetId) ?? null;
  }

  pauseAll(): void {
    for (const v of this.videos.values()) if (!v.paused) v.pause();
  }

  dispose(): void {
    for (const v of this.videos.values()) {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
    this.videos.clear();
    this.images.clear();
  }
}

export interface TextStyleResolver {
  fontSize(el: Element, doc: ProjectDoc): number;
}

/** Ordem de desenho: elementos da última trilha de vídeo para a primeira (trilhas de cima por cima) */
function orderedElements(doc: ProjectDoc): Element[] {
  const order = new Map<string, number>();
  // tracks[0] é a mais alta na UI → deve ser desenhada por último (por cima)
  const videoTracks = doc.tracks.filter((t) => t.kind === 'video');
  videoTracks.forEach((t, i) => order.set(t.id, videoTracks.length - i));
  return [...doc.elements]
    .filter((e) => order.has(e.trackId))
    .sort((a, b) => (order.get(a.trackId) ?? 0) - (order.get(b.trackId) ?? 0));
}

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};

export interface DrawOptions {
  /** largura do canvas de destino em px (resolução de render) */
  width: number;
  height: number;
  pool: MediaPool;
  /** transcodifica o áudio? (no export de frames isolados, não) */
  timeMs: number;
  showSafeArea?: boolean;
}

/** Desenha um frame completo do documento no contexto 2D */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  doc: ProjectDoc,
  timeMs: number,
  opt: DrawOptions,
): void {
  const { width: W, height: H } = opt;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.filter = 'none';
  ctx.fillStyle = doc.settings.background;
  ctx.fillRect(0, 0, W, H);

  // escala do canvas lógico (doc.settings) para o render (W×H)
  const sx = W / doc.settings.width;
  const sy = H / doc.settings.height;

  const hiddenTracks = new Set(doc.tracks.filter((t) => t.hidden).map((t) => t.id));

  for (const el of orderedElements(doc)) {
    if (el.hidden || hiddenTracks.has(el.trackId)) continue;
    if (timeMs < el.start || timeMs >= el.start + el.duration) continue;

    const rel = timeMs - el.start;
    const t = el.transform;
    const x = valueAt(t.x, rel) * sx;
    const y = valueAt(t.y, rel) * sy;
    const scale = valueAt(t.scale, rel);
    const rot = (valueAt(t.rotation, rel) * Math.PI) / 180;
    const opacity = Math.max(0, Math.min(1, valueAt(t.opacity, rel)));

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);

    const filter = filterCss(el.effects);
    if (filter !== 'none') ctx.filter = filter;

    switch (el.type) {
      case 'video':
      case 'image': {
        const src = el.assetId ? opt.pool.get(el.assetId) : null;
        if (src) {
          const sw = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth;
          const sh = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight;
          if (sw && sh) {
            // cover: cobre o canvas lógico mantendo proporção
            const targetW = doc.settings.width * sx;
            const targetH = doc.settings.height * sy;
            const k = Math.max(targetW / sw, targetH / sh);
            const dw = sw * k;
            const dh = sh * k;
            try {
              ctx.drawImage(src, -dw / 2, -dh / 2, dw, dh);
            } catch {
              /* frame ainda não decodificado */
            }
          }
        }
        break;
      }
      case 'shape': {
        const s = el.shape ?? { kind: 'rect', fill: '#8b5cf6', radius: 10 };
        const preenchimento = s.fill ?? '#8b5cf6';
        const ehTela = preenchimento.startsWith('linear-gradient') || preenchimento.startsWith('radial-gradient') ||
          preenchimento.startsWith('repeating-linear-gradient') || preenchimento.startsWith('repeating-radial-gradient');
        /* elementos de tela cheia (fundos e overlays) usam o canvas inteiro */
        const telaCheia = ehTela;
        const w = telaCheia ? W * 2 : doc.settings.width * 0.5 * sx;
        const h = telaCheia ? H * 2 : doc.settings.height * 0.16 * sy;
        ctx.fillStyle = criarFill(ctx, preenchimento, w, h);
        if (s.kind === 'ellipse' && !telaCheia) {
          ctx.beginPath();
          ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const r = telaCheia ? 0 : Math.min(s.radius, h / 2);
          ctx.beginPath();
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
          ctx.fill();
        }
        break;
      }
      case 'text': {
        const tx = el.text;
        if (!tx) break;
        const content = tx.uppercase ? tx.content.toUpperCase() : tx.content;
        const size = tx.fontSize * sy;
        ctx.font = `${tx.fontWeight} ${size}px ${tx.fontFamily}`;
        ctx.textAlign = tx.align === 'center' ? 'center' : tx.align;
        ctx.textBaseline = 'middle';
        if (tx.letterSpacing) {
          // aplica espaçamento manualmente (canvas não suporta letterSpacing em todo browser)
          const chars = content.split('');
          const widths = chars.map((c) => ctx.measureText(c).width + tx.letterSpacing * sy);
          const total = widths.reduce((a, b) => a + b, 0);
          let cx = tx.align === 'center' ? -total / 2 : tx.align === 'right' ? -total : 0;
          ctx.textAlign = 'left';
          chars.forEach((c, i) => {
            drawTextChar(ctx, c, cx, 0, tx, sy);
            cx += widths[i];
          });
        } else {
          drawTextChar(ctx, content, 0, 0, tx, sy);
        }
        break;
      }
      case 'adjustment': {
        // camada de ajuste: aplica um wash de cor sobre tudo abaixo
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(-W, -H, W * 2, H * 2);
        break;
      }
      default:
        break;
    }

    ctx.restore();
  }

  // passes de canvas (pixelate, rgbsplit, vignette, grain) — global ao frame
  const allFx = doc.elements
    .filter((e) => timeMs >= e.start && timeMs < e.start + e.duration)
    .flatMap((e) => e.effects);
  if (allFx.length) canvasPasses(ctx, W, H, allFx);

  if (opt.showSafeArea) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.setLineDash([4, 6]);
    ctx.strokeRect(W * 0.06, H * 0.06, W * 0.88, H * 0.88);
    ctx.restore();
  }
}

function drawTextChar(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  tx: NonNullable<Element['text']>,
  sy: number,
): void {
  if (tx.shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 12 * sy;
    ctx.shadowOffsetY = 3 * sy;
    ctx.fillStyle = tx.color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
  if (tx.strokeWidth > 0) {
    ctx.lineWidth = tx.strokeWidth * sy;
    ctx.strokeStyle = tx.strokeColor;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = tx.color;
  ctx.fillText(text, x, y);
}

/** Mede a duração total do documento */
export const docDuration = (doc: ProjectDoc): number =>
  doc.elements.reduce((m, e) => Math.max(m, e.start + e.duration), 0);

/**
 * Converte um CSS de fundo em preenchimento real do canvas.
 * Suporta cor sólida, linear-gradient, repeating-linear-gradient e radial-gradient.
 * As paradas (#22d3ee33) viram rgba com alfa.
 */
function criarFill(ctx: CanvasRenderingContext2D, css: string, w: number, h: number): string | CanvasGradient {
  const cor = (c: string): string => {
    const t = c.trim();
    if (t.startsWith('#')) {
      const hex = t.slice(1);
      if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const a = parseInt(hex.slice(6, 8), 16) / 255;
        return `rgba(${r},${g},${b},${a.toFixed(3)})`;
      }
      if (hex.length === 4) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        const a = parseInt(hex[3] + hex[3], 16) / 255;
        return `rgba(${r},${g},${b},${a.toFixed(3)})`;
      }
    }
    return t;
  };

  const paradas = (txt: string) => {
    const out: [number, string][] = [];
    txt.split(',').forEach((parte, i, arr) => {
      const p = parte.trim();
      if (!p) return;
      const m = p.match(/^(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|[a-z]+)\s*([\d.]+%|0)?$/i);
      if (m) {
        out.push([m[2] ? parseFloat(m[2]) / 100 : i / Math.max(1, arr.length - 1), cor(m[1])]);
      }
    });
    return out;
  };

  try {
    if (css.startsWith('linear-gradient')) {
      const dentro = css.slice(css.indexOf('(') + 1, css.lastIndexOf(')'));
      const partes = dentro.split(/,(?![^(]*\))/);
      let ang = 180;
      if (/deg|to /.test(partes[0])) {
        const a = partes.shift()!;
        const g = a.match(/(-?[\d.]+)deg/);
        if (g) ang = parseFloat(g[1]);
      }
      const rad = ((ang - 90) * Math.PI) / 180;
      const x = Math.cos(rad);
      const y = Math.sin(rad);
      const grad = ctx.createLinearGradient(-x * w / 2, -y * h / 2, x * w / 2, y * h / 2);
      paradas(partes.join(',')).forEach(([off, c]) => grad.addColorStop(Math.min(1, Math.max(0, off)), c));
      return grad;
    }

    if (css.startsWith('repeating-linear-gradient')) {
      const dentro = css.slice(css.indexOf('(') + 1, css.lastIndexOf(')'));
      const partes = dentro.split(/,(?![^(]*\))/);
      const g = (partes.shift() ?? '').match(/(-?[\d.]+)deg/);
      const ang = g ? parseFloat(g[1]) : 0;
      const rad = ((ang - 90) * Math.PI) / 180;
      const x = Math.cos(rad);
      const y = Math.sin(rad);
      const grad = ctx.createLinearGradient(-x * 40, -y * 40, x * 40, y * 40);
      const lista: [number, string][] = [];
      partes.forEach((p) => {
        const m = p.trim().match(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))\s+([\d.]+)(px)?/);
        if (m) lista.push([parseFloat(m[2]), cor(m[1])]);
      });
      const total = lista.length ? Math.max(...lista.map((l) => l[0])) : 4;
      lista.forEach(([px, c]) => grad.addColorStop(Math.min(1, px / Math.max(1, total)), c));
      return grad;
    }

    if (css.startsWith('radial-gradient')) {
      const dentro = css.slice(css.indexOf('(') + 1, css.lastIndexOf(')'));
      const partes = dentro.split(/,(?![^(]*\))/);
      partes.shift(); // posição
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) / 2);
      paradas(partes.join(',')).forEach(([off, c]) => grad.addColorStop(Math.min(1, Math.max(0, off)), c));
      return grad;
    }
  } catch {
    /* cai para cor sólida */
  }
  return cor(css.split(',')[0]);
}
