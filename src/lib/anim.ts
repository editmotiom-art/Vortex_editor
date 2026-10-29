import type { AnimProp, EasingName } from '../types';

/** Curvas de easing — puras e determinísticas (nada de Date.now) */
export function ease(name: EasingName, t: number): number {
  const x = Math.min(1, Math.max(0, t));
  switch (name) {
    case 'linear':
      return x;
    case 'easeIn':
      return x * x * x;
    case 'easeOut':
      return 1 - Math.pow(1 - x, 3);
    case 'easeInOut':
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    case 'bounce': {
      const n1 = 7.5625;
      const d1 = 2.75;
      let v = x;
      if (v < 1 / d1) return n1 * v * v;
      if (v < 2 / d1) return n1 * (v -= 1.5 / d1) * v + 0.75;
      if (v < 2.5 / d1) return n1 * (v -= 2.25 / d1) * v + 0.9375;
      return n1 * (v -= 2.625 / d1) * v + 0.984375;
    }
    case 'elastic': {
      if (x === 0 || x === 1) return x;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
    case 'overshoot': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
    default:
      return x;
  }
}

/** Avalia uma propriedade animável em um instante (ms). Busca binária nos keyframes. */
export function valueAt(prop: AnimProp, timeMs: number): number {
  const kf = prop.keyframes;
  if (!kf || kf.length === 0) return prop.base;
  if (kf.length === 1) return kf[0].v;

  // ordenado por t garantido no store
  let lo = 0;
  let hi = kf.length - 1;
  if (timeMs <= kf[0].t) return kf[0].v;
  if (timeMs >= kf[hi].t) return kf[hi].v;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (kf[mid].t <= timeMs) {
      if (kf[mid + 1] && kf[mid + 1].t > timeMs) {
        const a = kf[mid];
        const b = kf[mid + 1];
        const span = b.t - a.t || 1;
        const local = (timeMs - a.t) / span;
        const e = ease(b.easing, local);
        return a.v + (b.v - a.v) * e;
      }
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return kf[hi]?.v ?? prop.base;
}

export const fmtTime = (ms: number, withFrames = false, fps = 30): string => {
  const total = Math.max(0, Math.round(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const f = Math.floor(((total % 1000) / 1000) * fps);
  const base = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const head = h > 0 ? `${String(h).padStart(2, '0')}:` : '';
  return withFrames ? `${head}${base}:${String(Math.min(f, fps - 1)).padStart(2, '0')}` : `${head}${base}`;
};

export const fmtBytes = (b: number): string => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
};
