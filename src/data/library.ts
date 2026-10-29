/**
 * BIBLIOTECA DE CONTEÚDO (catálogo do app)
 * ------------------------------------------------------------
 * REGRA DE OURO: todo card funciona com 1 clique, sem instalar nada.
 *   · template → cria elemento com keyframes prontos
 *   · texto / forma → cria o elemento
 *   · efeito / look / transição / overlay → aplica no clipe selecionado
 *     (se não houver seleção, aplica no clipe sob o playhead; se o projeto
 *      estiver vazio, cria um placeholder para o efeito ficar visível)
 *   · som / música → gera o áudio no navegador e joga na timeline
 *   · pack de mídia real → abre o Drive para baixar o arquivo
 */

export type LibKind =
  | 'template'
  | 'transition'
  | 'lut'
  | 'overlay'
  | 'sfx'
  | 'music'
  | 'element'
  | 'text'
  | 'shape'
  | 'background';

export interface LibItem {
  id: string;
  name: string;
  cat: string;
  kind: LibKind;
  g: [string, string];
  icon?: string;
  tags: string[];
  /** só para itens que realmente precisam de arquivo externo */
  pack?: string;
  mb?: number;
  durationMs?: number;
  apply:
    | { type: 'text'; content: string; size?: number; weight?: number; uppercase?: boolean }
    | { type: 'shape'; shape: 'rect' | 'ellipse'; fill: string }
    | { type: 'fx'; effect: string; amount: number }
    | { type: 'kf'; preset: string }
    | { type: 'som'; preset: string; loop?: boolean }
    | { type: 'fundo'; preset: string }
    | { type: 'overlay'; preset: string }
    | { type: 'media' };
}

export const LIB_CATEGORIES = [
  'Templates',
  'Transições',
  'Looks',
  'Texto',
  'Formas',
  'Elementos',
  'SFX',
  'Música',
  'Overlays',
  'Fundos',
] as const;

export const LIBRARY: LibItem[] = [
  /* ================= TEMPLATES (keyframes prontos) ================= */
  { id: 'tpl-pop', name: 'Título Pop', cat: 'Templates', kind: 'template', g: ['#22d3ee', '#6366f1'], icon: 'Aa', tags: ['texto', 'entrada', 'bounce'], apply: { type: 'kf', preset: 'pop' } },
  { id: 'tpl-zoom', name: 'Zoom Punch', cat: 'Templates', kind: 'template', g: ['#f43f5e', '#7c3aed'], icon: '⌁', tags: ['zoom', 'punch', 'impacto'], apply: { type: 'kf', preset: 'zoomPunch' } },
  { id: 'tpl-slide', name: 'Slide In', cat: 'Templates', kind: 'template', g: ['#f59e0b', '#ef4444'], icon: '→', tags: ['slide', 'entrada'], apply: { type: 'kf', preset: 'slide' } },
  { id: 'tpl-fade', name: 'Fade Suave', cat: 'Templates', kind: 'template', g: ['#64748b', '#0ea5e9'], icon: '◐', tags: ['fade', 'suave'], apply: { type: 'kf', preset: 'fade' } },
  { id: 'tpl-bounce', name: 'Bounce Elastic', cat: 'Templates', kind: 'template', g: ['#a3e635', '#16a34a'], icon: '◎', tags: ['elástico', 'divertido'], apply: { type: 'kf', preset: 'bounce' } },
  { id: 'tpl-spin', name: 'Rotate In', cat: 'Templates', kind: 'template', g: ['#e879f9', '#7c3aed'], icon: '↻', tags: ['rotação'], apply: { type: 'kf', preset: 'spin' } },
  { id: 'tpl-glitch', name: 'Glitch Entrance', cat: 'Templates', kind: 'template', g: ['#ef4444', '#06b6d4'], icon: '⚡', tags: ['glitch', 'tech'], apply: { type: 'kf', preset: 'glitchIn' } },
  { id: 'tpl-kenburns', name: 'Ken Burns', cat: 'Templates', kind: 'template', g: ['#fbbf24', '#b45309'], icon: '▣', tags: ['foto', 'documentário'], apply: { type: 'kf', preset: 'kenBurns' } },
  { id: 'tpl-lower3', name: 'Lower Third', cat: 'Templates', kind: 'template', g: ['#0ea5e9', '#0f172a'], icon: '▤', tags: ['legenda', 'nome', 'jornal'], apply: { type: 'kf', preset: 'lowerThird' } },
  { id: 'tpl-typewriter', name: 'Typewriter', cat: 'Templates', kind: 'template', g: ['#e2e8f0', '#475569'], icon: '⌨', tags: ['máquina', 'texto'], apply: { type: 'kf', preset: 'typewriter' } },
  { id: 'tpl-caption', name: 'Legenda Reels', cat: 'Templates', kind: 'template', g: ['#22c55e', '#065f46'], icon: '★', tags: ['reels', 'caption', 'viral'], apply: { type: 'kf', preset: 'caption' } },
  { id: 'tpl-splitScreen', name: 'Split Screen', cat: 'Templates', kind: 'template', g: ['#8b5cf6', '#312e81'], icon: '▥', tags: ['tela dividida'], apply: { type: 'kf', preset: 'split' } },

  /* ================= TRANSIÇÕES ================= */
  { id: 'tr-crossfade', name: 'Crossfade', cat: 'Transições', kind: 'transition', g: ['#475569', '#94a3b8'], tags: ['fade'], apply: { type: 'fx', effect: 'blur', amount: 4 } },
  { id: 'tr-glitch', name: 'Glitch', cat: 'Transições', kind: 'transition', g: ['#f43f5e', '#0ea5e9'], tags: ['glitch'], apply: { type: 'fx', effect: 'rgbsplit', amount: 8 } },
  { id: 'tr-blur', name: 'Blur Dissolve', cat: 'Transições', kind: 'transition', g: ['#334155', '#a78bfa'], tags: ['blur'], apply: { type: 'fx', effect: 'blur', amount: 12 } },
  { id: 'tr-zoom', name: 'Zoom Blur', cat: 'Transições', kind: 'transition', g: ['#f59e0b', '#dc2626'], tags: ['zoom'], apply: { type: 'fx', effect: 'blur', amount: 6 } },
  { id: 'tr-whip', name: 'Whip Pan', cat: 'Transições', kind: 'transition', g: ['#38bdf8', '#0f172a'], tags: ['rápido'], apply: { type: 'fx', effect: 'blur', amount: 9 } },
  { id: 'tr-light', name: 'Light Leak', cat: 'Transições', kind: 'transition', g: ['#fde68a', '#fb923c'], tags: ['luz', 'leak'], apply: { type: 'overlay', preset: 'leak' } },
  { id: 'tr-burn', name: 'Film Burn', cat: 'Transições', kind: 'transition', g: ['#f97316', '#7f1d1d'], tags: ['filme'], apply: { type: 'overlay', preset: 'burn' } },
  { id: 'tr-paper', name: 'Paper Flip', cat: 'Transições', kind: 'transition', g: ['#e7e5e4', '#a8a29e'], tags: ['papel'], apply: { type: 'fx', effect: 'sharpen', amount: 0.4 } },

  /* ================= LOOKS / COLOR ================= */
  { id: 'lut-cinema', name: 'Cinema Teal', cat: 'Looks', kind: 'lut', g: ['#0e7490', '#f59e0b'], tags: ['cinema', 'teal'], apply: { type: 'fx', effect: 'contrast', amount: 1.15 } },
  { id: 'lut-anime', name: 'Anime Vivid', cat: 'Looks', kind: 'lut', g: ['#f472b6', '#38bdf8'], tags: ['anime', 'vivid'], apply: { type: 'fx', effect: 'saturation', amount: 1.5 } },
  { id: 'lut-doc', name: 'Documentary', cat: 'Looks', kind: 'lut', g: ['#78716c', '#292524'], tags: ['doc', 'dessaturado'], apply: { type: 'fx', effect: 'saturation', amount: 0.7 } },
  { id: 'lut-noir', name: 'Noir', cat: 'Looks', kind: 'lut', g: ['#e5e7eb', '#111827'], tags: ['preto', 'branco'], apply: { type: 'fx', effect: 'grayscale', amount: 1 } },
  { id: 'lut-vintage', name: 'Vintage', cat: 'Looks', kind: 'lut', g: ['#d6d3d1', '#78350f'], tags: ['sépia', 'antigo'], apply: { type: 'fx', effect: 'sepia', amount: 0.7 } },
  { id: 'lut-hdr', name: 'HDR Punch', cat: 'Looks', kind: 'lut', g: ['#fbbf24', '#b91c1c'], tags: ['hdr', 'contraste'], apply: { type: 'fx', effect: 'contrast', amount: 1.3 } },
  { id: 'lut-warm', name: 'Golden Hour', cat: 'Looks', kind: 'lut', g: ['#fcd34d', '#b45309'], tags: ['quente'], apply: { type: 'fx', effect: 'hue', amount: 15 } },
  { id: 'lut-cool', name: 'Blue Hour', cat: 'Looks', kind: 'lut', g: ['#60a5fa', '#1e3a8a'], tags: ['frio'], apply: { type: 'fx', effect: 'hue', amount: -18 } },

  /* ================= TEXTO ================= */
  { id: 'tx-title', name: 'Título Forte', cat: 'Texto', kind: 'text', g: ['#22d3ee', '#1d4ed8'], icon: 'T', tags: ['bold'], apply: { type: 'text', content: 'SEU TÍTULO', size: 0.11, weight: 900, uppercase: true } },
  { id: 'tx-sub', name: 'Subtítulo', cat: 'Texto', kind: 'text', g: ['#94a3b8', '#334155'], icon: 's', tags: ['menor'], apply: { type: 'text', content: 'Subtítulo', size: 0.05, weight: 600 } },
  { id: 'tx-caps', name: 'CAIXA ALTA', cat: 'Texto', kind: 'text', g: ['#f472b6', '#9d174d'], icon: 'A', tags: ['caps'], apply: { type: 'text', content: 'TEXTO', size: 0.08, weight: 800, uppercase: true } },
  { id: 'tx-light', name: 'Leve', cat: 'Texto', kind: 'text', g: ['#e2e8f0', '#64748b'], icon: 'l', tags: ['fino'], apply: { type: 'text', content: 'Texto leve', size: 0.07, weight: 300 } },

  /* ================= FORMAS ================= */
  { id: 'sh-rect', name: 'Retângulo', cat: 'Formas', kind: 'shape', g: ['#22d3ee', '#0e7490'], icon: '▭', tags: ['caixa'], apply: { type: 'shape', shape: 'rect', fill: '#22d3ee' } },
  { id: 'sh-circle', name: 'Círculo', cat: 'Formas', kind: 'shape', g: ['#f472b6', '#9d174d'], icon: '◯', tags: ['redondo'], apply: { type: 'shape', shape: 'ellipse', fill: '#f472b6' } },
  { id: 'sh-black', name: 'Faixa Preta', cat: 'Formas', kind: 'shape', g: ['#334155', '#020617'], icon: '▬', tags: ['barra', 'letterbox'], apply: { type: 'shape', shape: 'rect', fill: '#0b1120' } },
  { id: 'sh-white', name: 'Flash Branco', cat: 'Formas', kind: 'shape', g: ['#f8fafc', '#94a3b8'], icon: '▢', tags: ['flash', 'branco'], apply: { type: 'shape', shape: 'rect', fill: '#ffffff' } },

  /* ================= ELEMENTOS / OVERLAYS ================= */
  { id: 'el-bokeh', name: 'Bokeh', cat: 'Elementos', kind: 'element', g: ['#22d3ee', '#0f172a'], icon: '◌', tags: ['luz'], apply: { type: 'overlay', preset: 'bokeh' } },
  { id: 'el-dust', name: 'Poeira', cat: 'Elementos', kind: 'element', g: ['#a16207', '#1c1917'], icon: '✦', tags: ['partícula'], apply: { type: 'overlay', preset: 'dust' } },
  { id: 'el-vhs', name: 'VHS', cat: 'Elementos', kind: 'element', g: ['#f43f5e', '#1e293b'], icon: '▤', tags: ['retrô'], apply: { type: 'overlay', preset: 'vhs' } },
  { id: 'el-flare', name: 'Lens Flare', cat: 'Elementos', kind: 'element', g: ['#fde68a', '#f97316'], icon: '✧', tags: ['luz'], apply: { type: 'overlay', preset: 'flare' } },
  { id: 'el-rain', name: 'Chuva', cat: 'Elementos', kind: 'element', g: ['#38bdf8', '#0c4a6e'], icon: '⋮', tags: ['tempo'], apply: { type: 'overlay', preset: 'rain' } },
  { id: 'el-snow', name: 'Neve', cat: 'Elementos', kind: 'element', g: ['#e0f2fe', '#0369a1'], icon: '❄', tags: ['inverno'], apply: { type: 'overlay', preset: 'snow' } },
  { id: 'ov-grain', name: 'Grão de Filme', cat: 'Overlays', kind: 'overlay', g: ['#78716c', '#1c1917'], icon: '▩', tags: ['grão'], apply: { type: 'fx', effect: 'grain', amount: 0.35 } },
  { id: 'ov-vignette', name: 'Vinheta', cat: 'Overlays', kind: 'overlay', g: ['#0f172a', '#020617'], icon: '◍', tags: ['borda'], apply: { type: 'fx', effect: 'vignette', amount: 0.6 } },
  { id: 'ov-scanlines', name: 'Scanlines', cat: 'Overlays', kind: 'overlay', g: ['#334155', '#0f172a'], icon: '≡', tags: ['tv'], apply: { type: 'overlay', preset: 'scanlines' } },
  { id: 'ov-lightleak', name: 'Light Leak', cat: 'Overlays', kind: 'overlay', g: ['#fdba74', '#b91c1c'], icon: '☀', tags: ['luz'], apply: { type: 'overlay', preset: 'leak' } },

  /* ================= SFX (sintetizados no navegador) ================= */
  { id: 'sfx-whoosh', name: 'Whoosh', cat: 'SFX', kind: 'sfx', g: ['#22d3ee', '#0e7490'], icon: '➤', tags: ['transição'], durationMs: 900, apply: { type: 'som', preset: 'whoosh' } },
  { id: 'sfx-riser', name: 'Riser', cat: 'SFX', kind: 'sfx', g: ['#f59e0b', '#b45309'], icon: '⬈', tags: ['tensão'], durationMs: 2400, apply: { type: 'som', preset: 'riser' } },
  { id: 'sfx-glitch', name: 'Glitch FX', cat: 'SFX', kind: 'sfx', g: ['#ef4444', '#06b6d4'], icon: '⚡', tags: ['tech'], durationMs: 750, apply: { type: 'som', preset: 'glitch' } },
  { id: 'sfx-coin', name: 'Coin', cat: 'SFX', kind: 'sfx', g: ['#fbbf24', '#b45309'], icon: '◉', tags: ['jogo'], durationMs: 300, apply: { type: 'som', preset: 'pop' } },
  { id: 'sfx-shutter', name: 'Camera Shutter', cat: 'SFX', kind: 'sfx', g: ['#94a3b8', '#1e293b'], icon: '◪', tags: ['foto'], durationMs: 350, apply: { type: 'som', preset: 'camera' } },
  { id: 'sfx-typing', name: 'Digitação', cat: 'SFX', kind: 'sfx', g: ['#a3e635', '#3f6212'], icon: '⌨', tags: ['texto'], durationMs: 1200, apply: { type: 'som', preset: 'typing' } },
  { id: 'sfx-paper', name: 'Papel', cat: 'SFX', kind: 'sfx', g: ['#e7e5e4', '#78716c'], icon: '▤', tags: ['papel'], durationMs: 500, apply: { type: 'som', preset: 'sweep' } },
  { id: 'sfx-boom', name: 'Impacto Grave', cat: 'SFX', kind: 'sfx', g: ['#f43f5e', '#4c0519'], icon: '◼', tags: ['impacto'], durationMs: 1100, apply: { type: 'som', preset: 'impacto' } },
  { id: 'sfx-ui', name: 'UI Click', cat: 'SFX', kind: 'sfx', g: ['#cbd5e1', '#334155'], icon: '◌', tags: ['interface'], durationMs: 120, apply: { type: 'som', preset: 'click' } },
  { id: 'sfx-riser2', name: 'Riser Curto', cat: 'SFX', kind: 'sfx', g: ['#818cf8', '#312e81'], icon: '⬈', tags: ['build'], durationMs: 1400, apply: { type: 'som', preset: 'sub' } },

  /* ================= MÚSICA (loops gerados) ================= */
  { id: 'mu-lofi', name: 'Lo-Fi Chill', cat: 'Música', kind: 'music', g: ['#a78bfa', '#1e1b4b'], icon: '♪', tags: ['calmo'], durationMs: 8000, apply: { type: 'som', preset: 'lofi', loop: true } },
  { id: 'mu-epic', name: 'Epic Trailer', cat: 'Música', kind: 'music', g: ['#ef4444', '#1c1917'], icon: '♫', tags: ['épico'], durationMs: 8000, apply: { type: 'som', preset: 'epic', loop: true } },
  { id: 'mu-funk', name: 'Funk / Slowed', cat: 'Música', kind: 'music', g: ['#22d3ee', '#111827'], icon: '♬', tags: ['viral'], durationMs: 4000, apply: { type: 'som', preset: 'funk', loop: true } },
  { id: 'mu-corporate', name: 'Corporate', cat: 'Música', kind: 'music', g: ['#60a5fa', '#1e3a8a'], icon: '♩', tags: ['empresa'], durationMs: 8000, apply: { type: 'som', preset: 'corporate', loop: true } },
  { id: 'mu-suspense', name: 'Suspense', cat: 'Música', kind: 'music', g: ['#64748b', '#020617'], icon: '♭', tags: ['tensão'], durationMs: 8000, apply: { type: 'som', preset: 'suspense', loop: true } },
  { id: 'mu-cinematic', name: 'Cinematic', cat: 'Música', kind: 'music', g: ['#fbbf24', '#0f172a'], icon: '♪', tags: ['filme'], durationMs: 8000, apply: { type: 'som', preset: 'cinematic', loop: true } },
  { id: 'mu-drone', name: 'Drone', cat: 'Música', kind: 'music', g: ['#475569', '#020617'], icon: '〜', tags: ['ambiente'], durationMs: 4000, apply: { type: 'som', preset: 'drone', loop: true } },

  /* ================= FUNDOS ================= */
  { id: 'bg-black', name: 'Preto', cat: 'Fundos', kind: 'background', g: ['#111827', '#000000'], icon: '■', tags: ['preto'], apply: { type: 'fundo', preset: 'preto' } },
  { id: 'bg-white', name: 'Branco', cat: 'Fundos', kind: 'background', g: ['#f8fafc', '#94a3b8'], icon: '□', tags: ['branco'], apply: { type: 'fundo', preset: 'branco' } },
  { id: 'bg-blue', name: 'Gradiente Azul', cat: 'Fundos', kind: 'background', g: ['#1d4ed8', '#0f172a'], icon: '▦', tags: ['gradiente'], apply: { type: 'fundo', preset: 'azul' } },
  { id: 'bg-purple', name: 'Gradiente Roxo', cat: 'Fundos', kind: 'background', g: ['#7c3aed', '#111827'], icon: '▦', tags: ['gradiente'], apply: { type: 'fundo', preset: 'roxo' } },
  { id: 'bg-sunset', name: 'Sunset', cat: 'Fundos', kind: 'background', g: ['#f97316', '#7c2d12'], icon: '▦', tags: ['quente'], apply: { type: 'fundo', preset: 'sunset' } },
  { id: 'bg-grid', name: 'Grid Tech', cat: 'Fundos', kind: 'background', g: ['#0ea5e9', '#020617'], icon: '▦', tags: ['tech'], apply: { type: 'fundo', preset: 'grid' } },
];

/** Packs que só existem como mídia real (baixados do Drive) */
export interface PackInfo {
  id: string;
  name: string;
  mb: number;
  items: number;
  desc: string;
  g: [string, string];
}

export const PACKS: PackInfo[] = [
  { id: 'Transitions', name: 'Transições em vídeo', mb: 1120, items: 120, desc: 'Arquivos .mp4 de transição prontos', g: ['#f59e0b', '#7c2d12'] },
  { id: 'Overlays', name: 'Overlays em vídeo', mb: 2160, items: 260, desc: 'Bokeh, poeira, grão, VHS em vídeo', g: ['#f472b6', '#831843'] },
  { id: 'Paper Assets', name: 'Paper', mb: 75, items: 90, desc: 'Papel rasgado, dobras, texturas', g: ['#e7e5e4', '#78716c'] },
  { id: 'Characters', name: 'Personagens', mb: 123, items: 240, desc: 'Memojis e personagens', g: ['#fcd34d', '#ea580c'] },
  { id: 'Motion Backgrounds', name: 'Fundos em movimento', mb: 10240, items: 900, desc: '720+ fundos em vídeo', g: ['#0f172a', '#22d3ee'] },
  { id: '3D Hands', name: 'Mãos 3D', mb: 60, items: 40, desc: 'Mãos e gestos 3D', g: ['#fda4af', '#9f1239'] },
];
