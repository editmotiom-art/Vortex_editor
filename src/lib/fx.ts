import type { Effect, EffectType } from '../types';

/** Catálogo de efeitos disponíveis (metadados de UI) */
export const EFFECT_CATALOG: Record<
  EffectType,
  { label: string; group: string; min: number; max: number; def: number; unit?: string }
> = {
  blur: { label: 'Blur', group: 'Desfoque', min: 0, max: 40, def: 6, unit: 'px' },
  glow: { label: 'Glow', group: 'Luz', min: 0, max: 60, def: 14 },
  brightness: { label: 'Brilho', group: 'Cor', min: 0, max: 2, def: 1.1 },
  contrast: { label: 'Contraste', group: 'Cor', min: 0, max: 2, def: 1.1 },
  saturation: { label: 'Saturação', group: 'Cor', min: 0, max: 3, def: 1.2 },
  hue: { label: 'Matiz', group: 'Cor', min: -180, max: 180, def: 0, unit: '°' },
  grayscale: { label: 'Preto e branco', group: 'Cor', min: 0, max: 1, def: 1 },
  sepia: { label: 'Sépia', group: 'Cor', min: 0, max: 1, def: 1 },
  invert: { label: 'Inverter', group: 'Cor', min: 0, max: 1, def: 1 },
  pixelate: { label: 'Pixelizar', group: 'Estilizar', min: 1, max: 40, def: 8 },
  rgbsplit: { label: 'RGB Split', group: 'Glitch', min: 0, max: 20, def: 4 },
  vignette: { label: 'Vinheta', group: 'Estilizar', min: 0, max: 1, def: 0.5 },
  grain: { label: 'Granulado', group: 'Textura', min: 0, max: 1, def: 0.25 },
  sharpen: { label: 'Nitidez', group: 'Estilizar', min: 0, max: 2, def: 0.6 },
};

export const EFFECT_GROUPS = [...new Set(Object.values(EFFECT_CATALOG).map((e) => e.group))];

/**
 * Constrói a string de filtros CSS equivalente à pilha de efeitos.
 * Preview usa CSS filter; o export usa a MESMA receita para manter paridade
 * (no export definitivo isso vira shader WebGPU com a mesma matemática).
 */
export function filterCss(effects: Effect[]): string {
  const parts: string[] = [];
  for (const e of effects) {
    if (!e.enabled) continue;
    const a = e.amount;
    switch (e.type) {
      case 'blur':
        if (a > 0) parts.push(`blur(${a}px)`);
        break;
      case 'brightness':
        parts.push(`brightness(${a})`);
        break;
      case 'contrast':
        parts.push(`contrast(${a})`);
        break;
      case 'saturation':
        parts.push(`saturate(${a})`);
        break;
      case 'hue':
        parts.push(`hue-rotate(${a}deg)`);
        break;
      case 'grayscale':
        if (a > 0) parts.push(`grayscale(${a})`);
        break;
      case 'sepia':
        if (a > 0) parts.push(`sepia(${a})`);
        break;
      case 'invert':
        if (a > 0) parts.push(`invert(${a})`);
        break;
      case 'glow':
        // glow no preview: blur + brilho (aproximação fiel o suficiente)
        if (a > 0) parts.push(`drop-shadow(0 0 ${a}px rgba(255,255,255,.55))`, 'brightness(1.08)');
        break;
      case 'sharpen':
        // sem filtro CSS nativo; aproxima com contraste leve
        if (a > 0) parts.push(`contrast(${1 + a * 0.12})`);
        break;
      default:
        break;
    }
  }
  return parts.length ? parts.join(' ') : 'none';
}

/** Efeitos que precisam de tratamento especial no canvas (não são CSS filter) */
export const needsCanvasPass = (effects: Effect[]): boolean =>
  effects.some((e) => e.enabled && ['pixelate', 'rgbsplit', 'vignette', 'grain'].includes(e.type));

/** Aplica passes de canvas que o CSS filter não cobre, sobre um canvas já desenhado */
export function canvasPasses(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  effects: Effect[],
): void {
  for (const e of effects) {
    if (!e.enabled) continue;
    if (e.type === 'pixelate' && e.amount > 1) {
      const s = Math.max(1, Math.round(e.amount));
      const tmp = document.createElement('canvas');
      tmp.width = Math.max(1, Math.floor(w / s));
      tmp.height = Math.max(1, Math.floor(h / s));
      const tctx = tmp.getContext('2d');
      if (!tctx) continue;
      tctx.drawImage(ctx.canvas, 0, 0, tmp.width, tmp.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
    }
    if (e.type === 'rgbsplit' && e.amount > 0) {
      const d = e.amount;
      const snap = document.createElement('canvas');
      snap.width = w;
      snap.height = h;
      const sctx = snap.getContext('2d');
      if (!sctx) continue;
      sctx.drawImage(ctx.canvas, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(snap, -d, 0);
      ctx.drawImage(snap, d, 0);
      ctx.restore();
    }
    if (e.type === 'vignette' && e.amount > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, e.amount)})`);
      ctx.save();
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    if (e.type === 'grain' && e.amount > 0) {
      const count = Math.floor(w * h * 0.02 * e.amount);
      ctx.save();
      ctx.globalAlpha = e.amount * 0.35;
      for (let i = 0; i < count; i += 1) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const v = Math.random() > 0.5 ? 255 : 0;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.restore();
    }
  }
}
