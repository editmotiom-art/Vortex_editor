/** ============================================================
 *  MODELO DE DADOS CANÔNICO (ProjectDoc)
 *  Preview e export consomem ESTE documento. Nada de estado duplicado.
 *  Versionado por migração desde o dia 1.
 * ============================================================ */

export type DocVersion = 1;

export type ElementType =
  | 'video'
  | 'audio'
  | 'image'
  | 'text'
  | 'shape'
  | 'group'
  | 'adjustment';

export type TrackKind = 'video' | 'audio';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'add'
  | 'difference'
  | 'lighten'
  | 'darken';

export type EasingName =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic'
  | 'overshoot';

/** Propriedade animável */
export interface Keyframe {
  /** tempo relativo ao início do elemento, em ms */
  t: number;
  v: number;
  easing: EasingName;
}

export interface AnimProp {
  /** valor quando não há keyframes */
  base: number;
  keyframes: Keyframe[];
}

export interface Transform {
  x: AnimProp; // px no canvas
  y: AnimProp;
  scale: AnimProp; // 1 = 100%
  rotation: AnimProp; // graus
  opacity: AnimProp; // 0..1
}

/** Efeitos: pilha ordenada, aplicada por shader no compositor */
export type EffectType =
  | 'blur'
  | 'glow'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'pixelate'
  | 'rgbsplit'
  | 'vignette'
  | 'grain'
  | 'sharpen';

export interface Effect {
  id: string;
  type: EffectType;
  enabled: boolean;
  /** parâmetro principal do efeito (intensidade / raio / quantidade) */
  amount: number;
}

/** Sobreposição de texto (estilo CapCut/Premiere básico) */
export interface TextStyle {
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
  letterSpacing: number;
  uppercase: boolean;
}

/** Asset referenciado por um elemento (URL de objeto local, storage ou da biblioteca) */
export interface MediaAsset {
  id: string;
  name: string;
  kind: 'video' | 'audio' | 'image';
  /** URL utilizável pelo elemento <video>/<audio>/<img> */
  url: string;
  /** duração em ms (0 para imagem) */
  durationMs: number;
  width?: number;
  height?: number;
  /** de onde veio: import do usuário, biblioteca oficial, pack */
  origin: 'user' | 'library' | 'pack';
  sizeBytes?: number;
}

export interface Element {
  id: string;
  type: ElementType;
  name: string;
  trackId: string;
  /** posição na timeline, em ms */
  start: number;
  duration: number;
  /** trim dentro da mídia, em ms */
  sourceIn: number;
  assetId?: string | null;
  transform: Transform;
  blend: BlendMode;
  effects: Effect[];
  text?: TextStyle;
  shape?: { kind: 'rect' | 'ellipse'; fill: string; radius: number };
  volume: number; // 0..1 (áudio e vídeo com áudio)
  locked: boolean;
  hidden: boolean;
  color: string; // cor do bloco na timeline
}

export interface Track {
  id: string;
  name: string;
  kind: TrackKind;
  height: number;
  muted: boolean;
  locked: boolean;
  hidden: boolean;
}

export interface Marker {
  id: string;
  t: number;
  label: string;
  color: string;
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  sampleRate: number;
  background: string;
}

export interface ProjectDoc {
  version: DocVersion;
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  settings: ProjectSettings;
  tracks: Track[];
  elements: Element[];
  assets: MediaAsset[];
  markers: Marker[];
}

/* ---------- helpers de criação ---------- */

export const anim = (base: number): AnimProp => ({ base, keyframes: [] });

export const identityTransform = (): Transform => ({
  x: anim(540),
  y: anim(960),
  scale: anim(1),
  rotation: anim(0),
  opacity: anim(1),
});

export const uid = (prefix = 'id'): string =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;

export const PRESETS: Record<string, { label: string; w: number; h: number; fps: number }> = {
  reels: { label: 'Reels / Shorts / TikTok — 1080×1920', w: 1080, h: 1920, fps: 30 },
  youtube: { label: 'YouTube — 1920×1080', w: 1920, h: 1080, fps: 30 },
  square: { label: 'Feed quadrado — 1080×1080', w: 1080, h: 1080, fps: 30 },
  portrait45: { label: 'Feed 4:5 — 1080×1350', w: 1080, h: 1350, fps: 30 },
};
