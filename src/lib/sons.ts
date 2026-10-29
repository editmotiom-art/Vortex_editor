import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { identityTransform } from '../types';

/**
 * KIT DE SONS E MÚSICAS (síntese nativa)
 * ------------------------------------------------------------
 * Os efeitos e trilhas da biblioteca são GERADOS pelo próprio navegador
 * (Web Audio), então funcionam sempre: sem download, sem CDN, sem CORS,
 * sem pack para instalar.
 *
 * Cada som é renderizado uma vez em um AudioBuffer; ao aplicar na
 * timeline ele vira um WAV de verdade dentro do projeto.
 */

export type Preset =
  | 'whoosh'
  | 'riser'
  | 'impacto'
  | 'boom'
  | 'click'
  | 'pop'
  | 'glitch'
  | 'camera'
  | 'typing'
  | 'drone'
  | 'sub'
  | 'sweep'
  | 'lofi'
  | 'epic'
  | 'funk'
  | 'corporate'
  | 'suspense'
  | 'cinematic';

interface Receita {
  dur: number; // segundos
  loop?: boolean;
  construir: (ctx: OfflineAudioContext, out: GainNode) => void;
}

const ruido = (ctx: BaseAudioContext, dur: number) => {
  const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  return buf;
};

const RECEITAS: Record<Preset, Receita> = {
  /* ---------------- SFX ---------------- */
  whoosh: {
    dur: 0.9,
    construir(ctx, out) {
      const src = ctx.createBufferSource();
      src.buffer = ruido(ctx, 0.9);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(380, 0);
      bp.frequency.exponentialRampToValueAtTime(4200, 0.55);
      bp.frequency.exponentialRampToValueAtTime(700, 0.9);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.exponentialRampToValueAtTime(0.85, 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, 0.9);
      src.connect(bp).connect(g).connect(out);
      src.start(0);
    },
  },
  riser: {
    dur: 2.4,
    construir(ctx, out) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, 0);
      osc.frequency.exponentialRampToValueAtTime(2400, 2.3);
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.setValueAtTime(400, 0);
      flt.frequency.exponentialRampToValueAtTime(9000, 2.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.exponentialRampToValueAtTime(0.35, 2.1);
      g.gain.exponentialRampToValueAtTime(0.0001, 2.4);
      osc.connect(flt).connect(g).connect(out);
      osc.start(0);
      osc.stop(2.4);
    },
  },
  impacto: {
    dur: 1.1,
    construir(ctx, out) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, 0);
      osc.frequency.exponentialRampToValueAtTime(38, 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.95, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, 1.05);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(1.1);

      const n = ctx.createBufferSource();
      n.buffer = ruido(ctx, 0.35);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0.5, 0);
      gn.gain.exponentialRampToValueAtTime(0.0001, 0.3);
      n.connect(hp).connect(gn).connect(out);
      n.start(0);
    },
  },
  boom: {
    dur: 1.6,
    construir(ctx, out) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, 0);
      osc.frequency.exponentialRampToValueAtTime(28, 1.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.9, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, 1.5);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(1.6);
    },
  },
  click: {
    dur: 0.12,
    construir(ctx, out) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1600, 0);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, 0.08);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(0.12);
    },
  },
  pop: {
    dur: 0.22,
    construir(ctx, out) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, 0);
      osc.frequency.exponentialRampToValueAtTime(220, 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, 0.2);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(0.22);
    },
  },
  glitch: {
    dur: 0.75,
    construir(ctx, out) {
      for (let i = 0; i < 14; i += 1) {
        const t = i * 0.05;
        const osc = ctx.createOscillator();
        osc.type = i % 2 ? 'square' : 'sawtooth';
        osc.frequency.setValueAtTime(120 + Math.random() * 2200, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.16, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
        osc.connect(g).connect(out);
        osc.start(t);
        osc.stop(t + 0.05);
      }
    },
  },
  camera: {
    dur: 0.35,
    construir(ctx, out) {
      const n = ctx.createBufferSource();
      n.buffer = ruido(ctx, 0.35);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3200;
      bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.45, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, 0.13);
      g.gain.setValueAtTime(0.3, 0.16);
      g.gain.exponentialRampToValueAtTime(0.0001, 0.3);
      n.connect(bp).connect(g).connect(out);
      n.start(0);
    },
  },
  typing: {
    dur: 1.2,
    construir(ctx, out) {
      for (let i = 0; i < 22; i += 1) {
        const t = i * 0.052 + Math.random() * 0.01;
        const n = ctx.createBufferSource();
        n.buffer = ruido(ctx, 0.04);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2400;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.18, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        n.connect(hp).connect(g).connect(out);
        n.start(t);
      }
    },
  },
  drone: {
    dur: 4,
    construir(ctx, out) {
      [55, 82.5, 110].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, 0);
        g.gain.linearRampToValueAtTime(0.16 / (i + 1), 1.2);
        g.gain.linearRampToValueAtTime(0.0001, 4);
        osc.connect(g).connect(out);
        osc.start(0);
        osc.stop(4);
      });
    },
  },
  sub: {
    dur: 1.2,
    construir(ctx, out) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(70, 0);
      osc.frequency.exponentialRampToValueAtTime(22, 1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.8, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, 1.15);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(1.2);
    },
  },
  sweep: {
    dur: 1.4,
    construir(ctx, out) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, 0);
      osc.frequency.exponentialRampToValueAtTime(120, 1.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.3, 0);
      g.gain.exponentialRampToValueAtTime(0.0001, 1.35);
      osc.connect(g).connect(out);
      osc.start(0);
      osc.stop(1.4);
    },
  },

  /* ---------------- MÚSICAS (loops gerados) ---------------- */
  lofi: {
    dur: 8,
    loop: true,
    construir(ctx, out) {
      const acordes = [
        [220, 261.6, 329.6],
        [196, 246.9, 293.7],
        [174.6, 220, 261.6],
        [196, 233.1, 293.7],
      ];
      acordes.forEach((ac, i) => {
        const t = i * 2;
        ac.forEach((f) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.09, t + 0.15);
          g.gain.linearRampToValueAtTime(0.0001, t + 1.9);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.value = 1400;
          osc.connect(lp).connect(g).connect(out);
          osc.start(t);
          osc.stop(t + 2);
        });
        // bumbo suave
        const k = ctx.createOscillator();
        k.type = 'sine';
        k.frequency.setValueAtTime(80, t);
        k.frequency.exponentialRampToValueAtTime(45, t + 0.18);
        const kg = ctx.createGain();
        kg.gain.setValueAtTime(0.35, t);
        kg.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        k.connect(kg).connect(out);
        k.start(t);
        k.stop(t + 0.3);
      });
    },
  },
  epic: {
    dur: 8,
    loop: true,
    construir(ctx, out) {
      const raiz = [146.8, 174.6, 130.8, 164.8];
      raiz.forEach((f, i) => {
        const t = i * 2;
        [1, 1.5, 2, 3].forEach((mult, j) => {
          const osc = ctx.createOscillator();
          osc.type = j < 2 ? 'sawtooth' : 'sine';
          osc.frequency.value = f * mult;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.055 / (j + 1), t + 0.3);
          g.gain.linearRampToValueAtTime(0.0001, t + 2);
          const lp = ctx.createBiquadFilter();
          lp.type = 'lowpass';
          lp.frequency.setValueAtTime(600, t);
          lp.frequency.linearRampToValueAtTime(2600, t + 1.6);
          osc.connect(lp).connect(g).connect(out);
          osc.start(t);
          osc.stop(t + 2);
        });
        const n = ctx.createBufferSource();
        n.buffer = ruido(ctx, 0.5);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 5200;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.06, t + 0.5);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
        n.connect(hp).connect(ng).connect(out);
        n.start(t + 0.5);
      });
    },
  },
  funk: {
    dur: 4,
    loop: true,
    construir(ctx, out) {
      const kick = (t: number) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(120, t);
        o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.55, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.25);
      };
      const hat = (t: number) => {
        const n = ctx.createBufferSource();
        n.buffer = ruido(ctx, 0.06);
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 7000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        n.connect(hp).connect(g).connect(out);
        n.start(t);
      };
      for (let b = 0; b < 8; b += 1) kick(b * 0.5);
      for (let i = 0; i < 16; i += 1) hat(i * 0.25);
      const baixo = [110, 110, 82.4, 98];
      baixo.forEach((f, i) => {
        const t = i * 1;
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 420;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.13, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(lp).connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.7);
      });
    },
  },
  corporate: {
    dur: 8,
    loop: true,
    construir(ctx, out) {
      const prog = [
        [261.6, 329.6, 392],
        [293.7, 349.2, 440],
        [246.9, 311.1, 392],
        [220, 277.2, 349.2],
      ];
      prog.forEach((ac, i) => {
        const t = i * 2;
        ac.forEach((f, j) => {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = f * (j === 2 ? 2 : 1);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(0.07, t + 0.25);
          g.gain.linearRampToValueAtTime(0.0001, t + 1.9);
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + 2);
        });
        // pizzicato
        for (let p = 0; p < 4; p += 1) {
          const tt = t + p * 0.5;
          const o = ctx.createOscillator();
          o.type = 'triangle';
          o.frequency.value = ac[p % ac.length] * 2;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.09, tt);
          g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.22);
          o.connect(g).connect(out);
          o.start(tt);
          o.stop(tt + 0.25);
        }
      });
    },
  },
  suspense: {
    dur: 8,
    loop: true,
    construir(ctx, out) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(58, 0);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(240, 0);
      lp.frequency.linearRampToValueAtTime(900, 7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.linearRampToValueAtTime(0.16, 2);
      g.gain.linearRampToValueAtTime(0.0001, 8);
      o.connect(lp).connect(g).connect(out);
      o.start(0);
      o.stop(8);
      for (let i = 0; i < 4; i += 1) {
        const t = i * 2 + 1;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1200 + i * 180;
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(0.001, t);
        gg.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
        gg.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc.connect(gg).connect(out);
        osc.start(t);
        osc.stop(t + 1);
      }
    },
  },
  cinematic: {
    dur: 8,
    loop: true,
    construir(ctx, out) {
      const notas = [98, 146.8, 196, 293.7];
      notas.forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, 0);
        g.gain.linearRampToValueAtTime(0.11 / (i + 1), 1.5);
        g.gain.linearRampToValueAtTime(0.0001, 8);
        o.connect(g).connect(out);
        o.start(0);
        o.stop(8);
      });
      const n = ctx.createBufferSource();
      n.buffer = ruido(ctx, 8);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(300, 0);
      bp.frequency.linearRampToValueAtTime(3000, 8);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.001, 0);
      ng.gain.linearRampToValueAtTime(0.05, 4);
      ng.gain.linearRampToValueAtTime(0.001, 8);
      n.connect(bp).connect(ng).connect(out);
      n.start(0);
    },
  },
};

/* endereço do preset por id de item da biblioteca */
export const PRESET_POR_ITEM: Record<string, Preset> = {
  'sfx-whoosh': 'whoosh',
  'sfx-riser': 'riser',
  'sfx-impact': 'impacto',
  'sfx-boom': 'boom',
  'sfx-click': 'click',
  'sfx-pop': 'pop',
  'sfx-glitch': 'glitch',
  'sfx-camera': 'camera',
  'sfx-typing': 'typing',
  'sfx-drone': 'drone',
  'sfx-sub': 'sub',
  'sfx-sweep': 'sweep',
  'mus-lofi': 'lofi',
  'mus-epic': 'epic',
  'mus-funk': 'funk',
  'mus-corporate': 'corporate',
  'mus-suspense': 'suspense',
  'mus-cinematic': 'cinematic',
};

const cache = new Map<Preset, AudioBuffer>();

/** renderiza (ou reaproveita) o áudio de um preset */
export async function bufferDe(preset: Preset, sampleRate = 44100): Promise<AudioBuffer> {
  const pronto = cache.get(preset);
  if (pronto) return pronto;
  const receita = RECEITAS[preset];
  const OfflineCtor =
    (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new OfflineCtor(2, Math.ceil(sampleRate * receita.dur), sampleRate);
  const out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);
  receita.construir(ctx, out);
  const buf = await ctx.startRendering();
  cache.set(preset, buf);
  return buf;
}

/** toca o som na hora (para o botão "ouvir") */
export async function ouvir(preset: Preset): Promise<void> {
  const Ctor =
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  const buf = await bufferDe(preset, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
  src.onended = () => void ctx.close();
}

/** codifica um AudioBuffer em WAV (para virar asset do projeto) */
function wav(buf: AudioBuffer): Blob {
  const canais = buf.numberOfChannels;
  const len = buf.length;
  const sr = buf.sampleRate;
  const bytes = 44 + len * canais * 2;
  const ab = new ArrayBuffer(bytes);
  const v = new DataView(ab);
  const txt = (o: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) v.setUint8(o + i, s.charCodeAt(i));
  };
  txt(0, 'RIFF');
  v.setUint32(4, bytes - 8, true);
  txt(8, 'WAVE');
  txt(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, canais, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * canais * 2, true);
  v.setUint16(32, canais * 2, true);
  v.setUint16(34, 16, true);
  txt(36, 'data');
  v.setUint32(40, len * canais * 2, true);
  const ch: Float32Array[] = [];
  for (let c = 0; c < canais; c += 1) ch.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i += 1) {
    for (let c = 0; c < canais; c += 1) {
      const s = Math.max(-1, Math.min(1, ch[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

/** coloca o som na aba Mídia como um arquivo de verdade */
export async function adicionarNaTimeline(preset: Preset, nome: string, loop = false): Promise<string> {
  const buf = await bufferDe(preset);
  const blob = wav(buf);
  const url = URL.createObjectURL(blob);
  const ed = useEditor.getState();
  const asset = ed.addAsset({
    name: `${nome}.wav`,
    kind: 'audio',
    url,
    durationMs: Math.round(buf.duration * 1000),
    origin: 'library',
    sizeBytes: blob.size,
  });

  /* já entra numa trilha de áudio livre, no playhead */
  const trilha =
    ed.doc.tracks.find((t) => t.kind === 'audio' && !t.locked) ?? ed.doc.tracks.find((t) => t.kind === 'audio');
  if (trilha) {
    ed.addElement({
      type: 'audio',
      name: nome,
      trackId: trilha.id,
      start: ed.playhead,
      duration: Math.round(buf.duration * 1000),
      sourceIn: 0,
      assetId: asset.id,
      transform: {
        ...identityTransform(),
        x: { base: ed.doc.settings.width / 2, keyframes: [] },
        y: { base: ed.doc.settings.height / 2, keyframes: [] },
      },
      blend: 'normal',
      effects: [],
      volume: 1,
      locked: false,
      hidden: false,
      color: '#818cf8',
    });
  }
  if (loop) {
    const el = useEditor.getState().doc.elements.find((e) => e.assetId === asset.id);
    if (el) useEditor.getState().updateElement(el.id, { duration: Math.max(el.duration, ed.duration() || 8000) });
  }
  useUI.getState().toast(`“${nome}” adicionado à timeline`, 'ok');
  return asset.id;
}
