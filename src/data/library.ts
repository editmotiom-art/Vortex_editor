/**
 * BIBLIOTECA DE CONTEÚDO (catálogo do app)
 * ------------------------------------------------------------
 * Aqui só existem METADADOS. O arquivo real (mp3/wav/mp4/png) fica:
 *   · nos "packs" que o usuário instala (R2 / disco local), ou
 *   · no servidor, servido por CDN, ou
 *   · numa pasta local escolhida pelo usuário.
 * Nenhum byte de mídia entra no banco de dados.
 */

export type LibKind = 'template' | 'transition' | 'lut' | 'overlay' | 'sfx' | 'music' | 'element' | 'text' | 'shape';

export interface LibItem {
  id: string;
  name: string;
  cat: string;
  kind: LibKind;
  /** gradiente CSS para o card (não usa imagem externa) */
  g: [string, string];
  /** ícone opcional (emoji/caractere) */
  icon?: string;
  tags: string[];
  /** para itens que dependem de pack instalado */
  pack?: string;
  mb?: number;
  durationMs?: number;
  /**
   * efeito de aplicação:
   *  text   → cria texto
   *  shape  → cria forma
   *  fx     → aplica efeito no elemento selecionado
   *  kf     → cria elemento com keyframes (template)
   *  media  → depende do pack
   */
  apply:
    | { type: 'text'; content: string; size?: number; weight?: number; uppercase?: boolean; color?: string }
    | { type: 'shape'; shape: 'rect' | 'ellipse'; fill: string }
    | { type: 'fx'; effect: string; amount: number }
    | { type: 'kf'; preset: string }
    | { type: 'media' };
}

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

  /* ================= TRANSIÇÕES ================= */
  { id: 'tr-crossfade', name: 'Crossfade', cat: 'Transições', kind: 'transition', g: ['#475569', '#94a3b8'], tags: ['fade'], apply: { type: 'fx', effect: 'fade', amount: 0.5 } },
  { id: 'tr-glitch', name: 'Glitch', cat: 'Transições', kind: 'transition', g: ['#f43f5e', '#0ea5e9'], tags: ['glitch'], apply: { type: 'fx', effect: 'rgbsplit', amount: 8 } },
  { id: 'tr-blur', name: 'Blur Dissolve', cat: 'Transições', kind: 'transition', g: ['#334155', '#a78bfa'], tags: ['blur'], apply: { type: 'fx', effect: 'blur', amount: 12 } },
  { id: 'tr-zoom', name: 'Zoom Blur', cat: 'Transições', kind: 'transition', g: ['#f59e0b', '#dc2626'], tags: ['zoom'], apply: { type: 'fx', effect: 'blur', amount: 6 } },
  { id: 'tr-light', name: 'Light Leak', cat: 'Transições', kind: 'transition', g: ['#fde68a', '#fb923c'], tags: ['luz', 'leak'], pack: 'Transitions', mb: 1120, apply: { type: 'media' } },
  { id: 'tr-paper', name: 'Paper Flip', cat: 'Transições', kind: 'transition', g: ['#e7e5e4', '#a8a29e'], tags: ['papel'], pack: 'Paper Assets', mb: 75, apply: { type: 'media' } },
  { id: 'tr-whip', name: 'Whip Pan', cat: 'Transições', kind: 'transition', g: ['#38bdf8', '#0f172a'], tags: ['rápido'], pack: 'Transitions', mb: 1120, apply: { type: 'media' } },
  { id: 'tr-burn', name: 'Film Burn', cat: 'Transições', kind: 'transition', g: ['#f97316', '#7f1d1d'], tags: ['filme'], pack: 'Burn', mb: 2670, apply: { type: 'media' } },

  /* ================= LUTs / LOOKS ================= */
  { id: 'lut-cinema', name: 'Cinema Teal', cat: 'Looks', kind: 'lut', g: ['#0e7490', '#f59e0b'], tags: ['cinema', 'teal'], apply: { type: 'fx', effect: 'contrast', amount: 1.15 } },
  { id: 'lut-anime', name: 'Anime Vivid', cat: 'Looks', kind: 'lut', g: ['#f472b6', '#38bdf8'], tags: ['anime', 'vivid'], apply: { type: 'fx', effect: 'saturation', amount: 1.5 } },
  { id: 'lut-doc', name: 'Documentary', cat: 'Looks', kind: 'lut', g: ['#78716c', '#292524'], tags: ['doc', 'dessaturado'], apply: { type: 'fx', effect: 'saturation', amount: 0.7 } },
  { id: 'lut-vintage', name: 'Vintage 90s', cat: 'Looks', kind: 'lut', g: ['#d6b98c', '#7c5c3a'], tags: ['vintage'], apply: { type: 'fx', effect: 'sepia', amount: 0.6 } },
  { id: 'lut-bw', name: 'Preto e Branco', cat: 'Looks', kind: 'lut', g: ['#e5e5e5', '#262626'], tags: ['pb'], apply: { type: 'fx', effect: 'grayscale', amount: 1 } },
  { id: 'lut-glow', name: 'Dream Glow', cat: 'Looks', kind: 'lut', g: ['#c4b5fd', '#f9a8d4'], tags: ['glow', 'sonho'], apply: { type: 'fx', effect: 'glow', amount: 22 } },
  { id: 'lut-horror', name: 'Horror', cat: 'Looks', kind: 'lut', g: ['#1f2937', '#7f1d1d'], tags: ['terror'], apply: { type: 'fx', effect: 'contrast', amount: 1.5 } },
  { id: 'lut-warm', name: 'Golden Hour', cat: 'Looks', kind: 'lut', g: ['#fbbf24', '#f97316'], tags: ['quente'], apply: { type: 'fx', effect: 'sepia', amount: 0.25 } },

  /* ================= TEXTO ================= */
  { id: 'tx-headline', name: 'Headline Gigante', cat: 'Texto', kind: 'text', g: ['#ffffff', '#0ea5e9'], icon: 'H1', tags: ['título'], apply: { type: 'text', content: 'TÍTULO FORTE', size: 0.11, weight: 900 } },
  { id: 'tx-sub', name: 'Subtítulo', cat: 'Texto', kind: 'text', g: ['#e2e8f0', '#475569'], icon: 'h2', tags: ['sub'], apply: { type: 'text', content: 'Subtítulo de apoio', size: 0.05, weight: 600 } },
  { id: 'tx-doc', name: 'Estilo Documentário', cat: 'Texto', kind: 'text', g: ['#fde047', '#111827'], icon: '“', tags: ['doc', 'highlight'], apply: { type: 'text', content: 'DESTAQUE DOC', size: 0.07, weight: 800 } },
  { id: 'tx-lower', name: 'Lower Third', cat: 'Texto', kind: 'text', g: ['#0ea5e9', '#1e3a8a'], icon: '▭', tags: ['nome'], apply: { type: 'text', content: 'NOME • CARGO', size: 0.045, weight: 700 } },
  { id: 'tx-typed', name: 'Typewriter', cat: 'Texto', kind: 'text', g: ['#22c55e', '#064e3b'], icon: '▮', tags: ['máquina'], apply: { type: 'text', content: 'digitando...', size: 0.06, weight: 500 } },
  { id: 'tx-caps', name: 'Caixa Alta', cat: 'Texto', kind: 'text', g: ['#f43f5e', '#881337'], icon: 'AA', tags: ['caps'], apply: { type: 'text', content: 'IMPACTO', size: 0.09, weight: 900, uppercase: true } },

  /* ================= FORMAS / ELEMENTOS VETORIAIS ================= */
  { id: 'sh-rect', name: 'Retângulo', cat: 'Formas', kind: 'shape', g: ['#8b5cf6', '#4c1d95'], icon: '▭', tags: ['geometria'], apply: { type: 'shape', shape: 'rect', fill: '#8b5cf6' } },
  { id: 'sh-ellipse', name: 'Elipse', cat: 'Formas', kind: 'shape', g: ['#06b6d4', '#164e63'], icon: '◯', tags: ['geometria'], apply: { type: 'shape', shape: 'ellipse', fill: '#06b6d4' } },
  { id: 'el-arrow', name: 'Seta', cat: 'Elementos', kind: 'element', g: ['#fbbf24', '#b45309'], icon: '➜', tags: ['seta'], pack: 'Arrow', mb: 24, apply: { type: 'media' } },
  { id: 'el-burst', name: 'Explosão de luz', cat: 'Elementos', kind: 'element', g: ['#fde68a', '#f59e0b'], icon: '✺', tags: ['burst'], pack: 'Overlays', mb: 2160, apply: { type: 'media' } },
  { id: 'el-particles', name: 'Partículas', cat: 'Elementos', kind: 'element', g: ['#a5b4fc', '#312e81'], icon: '✦', tags: ['partículas'], pack: 'Particles', mb: 380, apply: { type: 'media' } },
  { id: 'el-smoke', name: 'Fumaça', cat: 'Elementos', kind: 'element', g: ['#cbd5e1', '#475569'], icon: '☁', tags: ['smoke'], pack: 'Smoke', mb: 620, apply: { type: 'media' } },
  { id: 'el-fire', name: 'Fogo', cat: 'Elementos', kind: 'element', g: ['#fb923c', '#7f1d1d'], icon: '🔥', tags: ['fogo'], pack: 'Fire', mb: 480, apply: { type: 'media' } },
  { id: 'el-lightning', name: 'Raio', cat: 'Elementos', kind: 'element', g: ['#fef08a', '#1e40af'], icon: '⚡', tags: ['raio'], pack: 'Lightning', mb: 240, apply: { type: 'media' } },
  { id: 'el-money', name: 'Dinheiro', cat: 'Elementos', kind: 'element', g: ['#34d399', '#065f46'], icon: '💵', tags: ['money'], pack: 'Money PNG', mb: 90, apply: { type: 'media' } },
  { id: 'el-memojis', name: 'Memojis', cat: 'Elementos', kind: 'element', g: ['#fcd34d', '#ea580c'], icon: '🙂', tags: ['personagem'], pack: 'Characters', mb: 123, apply: { type: 'media' } },
  { id: 'el-hand3d', name: 'Mão 3D', cat: 'Elementos', kind: 'element', g: ['#fda4af', '#9f1239'], icon: '✋', tags: ['3d', 'hand'], pack: '3D Hands', mb: 60, apply: { type: 'media' } },
  { id: 'el-grid', name: 'Grid Tech', cat: 'Elementos', kind: 'element', g: ['#22d3ee', '#0f172a'], icon: '▦', tags: ['grid', 'tech'], pack: 'Grid Backgrounds', mb: 45, apply: { type: 'media' } },
  { id: 'el-graph', name: 'Gráficos', cat: 'Elementos', kind: 'element', g: ['#4ade80', '#14532d'], icon: '📈', tags: ['dados'], pack: 'Graphs', mb: 70, apply: { type: 'media' } },

  /* ================= SFX (dependem de pack) ================= */
  { id: 'sfx-whoosh', name: 'Whoosh', cat: 'SFX', kind: 'sfx', g: ['#38bdf8', '#1e3a8a'], icon: '〰', tags: ['transição', 'curto'], pack: 'SFX', mb: 2010, durationMs: 900, apply: { type: 'media' } },
  { id: 'sfx-riser', name: 'Riser', cat: 'SFX', kind: 'sfx', g: ['#a78bfa', '#4c1d95'], icon: '↗', tags: ['tensão'], pack: 'SFX', mb: 2010, durationMs: 2500, apply: { type: 'media' } },
  { id: 'sfx-glitch', name: 'Glitch', cat: 'SFX', kind: 'sfx', g: ['#f43f5e', '#111827'], icon: '⧉', tags: ['tech'], pack: 'SFX', mb: 2010, durationMs: 700, apply: { type: 'media' } },
  { id: 'sfx-coin', name: 'Coin', cat: 'SFX', kind: 'sfx', g: ['#fbbf24', '#92400e'], icon: '◎', tags: ['game'], pack: 'SFX', mb: 2010, durationMs: 500, apply: { type: 'media' } },
  { id: 'sfx-shutter', name: 'Camera Shutter', cat: 'SFX', kind: 'sfx', g: ['#94a3b8', '#0f172a'], icon: '📷', tags: ['foto'], pack: 'SFX', mb: 2010, durationMs: 300, apply: { type: 'media' } },
  { id: 'sfx-typing', name: 'Digitação', cat: 'SFX', kind: 'sfx', g: ['#34d399', '#064e3b'], icon: '⌨', tags: ['texto'], pack: 'SFX', mb: 2010, durationMs: 3000, apply: { type: 'media' } },
  { id: 'sfx-paper', name: 'Papel', cat: 'SFX', kind: 'sfx', g: ['#e7e5e4', '#78716c'], icon: '📄', tags: ['papel'], pack: 'Paper Assets', mb: 75, durationMs: 900, apply: { type: 'media' } },
  { id: 'sfx-boom', name: 'Cinematic Boom', cat: 'SFX', kind: 'sfx', g: ['#f97316', '#450a0a'], icon: '💥', tags: ['impacto'], pack: 'SFX', mb: 2010, durationMs: 1800, apply: { type: 'media' } },
  { id: 'sfx-ui', name: 'UI Click', cat: 'SFX', kind: 'sfx', g: ['#22d3ee', '#155e75'], icon: '◈', tags: ['interface'], pack: 'SFX', mb: 2010, durationMs: 250, apply: { type: 'media' } },

  /* ================= MÚSICA (pack) ================= */
  { id: 'mu-lofi', name: 'Lo-Fi Chill', cat: 'Música', kind: 'music', g: ['#a78bfa', '#1e1b4b'], icon: '♪', tags: ['calmo'], pack: 'Music', mb: 2048, durationMs: 120000, apply: { type: 'media' } },
  { id: 'mu-epic', name: 'Epic Trailer', cat: 'Música', kind: 'music', g: ['#ef4444', '#1c1917'], icon: '♫', tags: ['épico'], pack: 'Music', mb: 2048, durationMs: 120000, apply: { type: 'media' } },
  { id: 'mu-funk', name: 'Funk / Slowed', cat: 'Música', kind: 'music', g: ['#22d3ee', '#111827'], icon: '♬', tags: ['viral'], pack: 'Music', mb: 2048, durationMs: 90000, apply: { type: 'media' } },
  { id: 'mu-corporate', name: 'Corporate', cat: 'Música', kind: 'music', g: ['#60a5fa', '#1e3a8a'], icon: '♩', tags: ['empresa'], pack: 'Music', mb: 2048, durationMs: 120000, apply: { type: 'media' } },
  { id: 'mu-suspense', name: 'Suspense', cat: 'Música', kind: 'music', g: ['#64748b', '#020617'], icon: '♭', tags: ['tensão'], pack: 'Music', mb: 2048, durationMs: 120000, apply: { type: 'media' } },

  /* ================= OVERLAYS / FUNDOS (pack) ================= */
  { id: 'ov-bokeh', name: 'Bokeh', cat: 'Overlays', kind: 'overlay', g: ['#fbcfe8', '#831843'], icon: '◌', tags: ['luz'], pack: 'Overlays', mb: 2160, apply: { type: 'media' } },
  { id: 'ov-dust', name: 'Poeira', cat: 'Overlays', kind: 'overlay', g: ['#fde68a', '#78350f'], icon: '·', tags: ['textura'], pack: 'Overlays', mb: 2160, apply: { type: 'media' } },
  { id: 'ov-grain', name: 'Granulado', cat: 'Overlays', kind: 'overlay', g: ['#a8a29e', '#1c1917'], icon: '░', tags: ['filme'], pack: 'Overlays', mb: 2160, apply: { type: 'media' } },
  { id: 'ov-vhs', name: 'VHS', cat: 'Overlays', kind: 'overlay', g: ['#67e8f9', '#7e22ce'], icon: '▤', tags: ['retrô'], pack: 'Overlays', mb: 2160, apply: { type: 'media' } },
  { id: 'bg-gradient', name: 'Gradiente', cat: 'Fundos', kind: 'overlay', g: ['#8b5cf6', '#06b6d4'], icon: '▩', tags: ['fundo'], pack: 'Motion Backgrounds', mb: 10240, apply: { type: 'media' } },
  { id: 'bg-grid', name: 'Grid Motion', cat: 'Fundos', kind: 'overlay', g: ['#0f172a', '#22d3ee'], icon: '▦', tags: ['fundo', 'tech'], pack: 'Motion Backgrounds', mb: 10240, apply: { type: 'media' } },
  { id: 'bg-paper', name: 'Papel animado', cat: 'Fundos', kind: 'overlay', g: ['#f5f5f4', '#a8a29e'], icon: '▥', tags: ['fundo', 'paper'], pack: 'Paper Assets', mb: 75, apply: { type: 'media' } },
  { id: 'bg-ai', name: 'Fundo IA', cat: 'Fundos', kind: 'overlay', g: ['#a78bfa', '#f472b6'], icon: '✧', tags: ['fundo', 'ia'], pack: 'AI Backgrounds', mb: 420, apply: { type: 'media' } },
];

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

/** Packs que o usuário pode "instalar" (arquitetura de distribuição em níveis) */
export interface PackInfo {
  id: string;
  name: string;
  mb: number;
  items: number;
  desc: string;
  g: [string, string];
}

export const PACKS: PackInfo[] = [
  { id: 'SFX', name: 'SFX Essentials', mb: 2010, items: 1240, desc: 'Whoosh, riser, glitch, impactos, UI e cliques', g: ['#38bdf8', '#1e3a8a'] },
  { id: 'Music', name: 'Trilhas', mb: 2048, items: 180, desc: 'Lo-fi, épico, corporate, suspense, funk', g: ['#a78bfa', '#1e1b4b'] },
  { id: 'Transitions', name: 'Transições', mb: 1120, items: 120, desc: 'Light leak, whip pan, zoom, film burn', g: ['#f59e0b', '#7c2d12'] },
  { id: 'Overlays', name: 'Overlays', mb: 2160, items: 260, desc: 'Bokeh, poeira, grão, VHS, luz', g: ['#f472b6', '#831843'] },
  { id: 'Paper Assets', name: 'Paper', mb: 75, items: 90, desc: 'Papel rasgado, dobras, texturas', g: ['#e7e5e4', '#78716c'] },
  { id: 'Characters', name: 'Personagens', mb: 123, items: 240, desc: 'Memojis e personagens', g: ['#fcd34d', '#ea580c'] },
  { id: 'Motion Backgrounds', name: 'Fundos', mb: 10240, items: 900, desc: '1000+ fundos em movimento', g: ['#0f172a', '#22d3ee'] },
  { id: '3D Hands', name: 'Mãos 3D', mb: 60, items: 40, desc: 'Mãos e gestos 3D', g: ['#fda4af', '#9f1239'] },
];
