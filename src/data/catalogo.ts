/**
 * CATÁLOGO DO DRIVE — PLANO DE CONTEÚDO
 * ------------------------------------------------------------
 * Mapeamento do acervo do usuário para dentro do editor.
 * Cada "pack" aponta para uma pasta do Google Drive; o conteúdo
 * NÃO é copiado para o banco — só os metadados e o link.
 *
 * Estratégia por tamanho:
 *  · < 2 GB  → sincronizar como pack instalável (download sob demanda)
 *  · 2–20 GB → catálogo com links (usuário acessa o Drive)
 *  · > 20 GB → apenas índice/taxonomia; mídia fica no Drive
 */

export type StatusPack = 'pronto' | 'catalogo' | 'indice' | 'pendente';

export interface PackDrive {
  id: string;
  nome: string;
  categoria: 'audio' | 'video' | 'imagem' | 'template' | 'fonte' | 'lut' | 'overlay' | 'projeto';
  status: StatusPack;
  /** id da pasta no Google Drive */
  pastaId?: string;
  itens: number;
  tamanho: string;
  descricao: string;
  /** como o editor usa esse conteúdo */
  uso: string;
}

export const CATALOGO_DRIVE: PackDrive[] = [
  /* ---------------- ÁUDIO ---------------- */
  {
    id: 'sfx-gigante',
    nome: 'SFX 10.000+',
    categoria: 'audio',
    status: 'catalogo',
    itens: 10000,
    tamanho: '~12 GB',
    descricao: 'Efeitos sonoros organizados por família (whoosh, riser, impact, glitch, click, ambiente).',
    uso: 'Trilha de áudio com waveform e busca por tag.',
  },
  {
    id: 'sfx-50',
    nome: '50 Sound Effects Pack',
    categoria: 'audio',
    status: 'pronto',
    itens: 50,
    tamanho: '~180 MB',
    descricao: 'Pacote essencial de SFX para cortes rápidos e transições.',
    uso: 'Pronto para instalar; entra na aba Mídia em segundos.',
  },
  {
    id: 'sam-kolder',
    nome: 'Sam Kolder Pulse SFX',
    categoria: 'audio',
    status: 'pronto',
    itens: 24,
    tamanho: '~90 MB',
    descricao: 'Whooshes e pulsos do estilo travel film.',
    uso: 'Marcadores de transição no timeline.',
  },
  {
    id: 'sfx-trending',
    nome: 'Trending Sound Effects',
    categoria: 'audio',
    status: 'pronto',
    itens: 120,
    tamanho: '~300 MB',
    descricao: 'Sons em alta usados em Reels/Shorts.',
    uso: 'Favoritos na biblioteca.',
  },
  {
    id: 'bg-music',
    nome: 'BG Music',
    categoria: 'audio',
    status: 'catalogo',
    itens: 340,
    tamanho: '~4 GB',
    descricao: 'Trilhas instrumentais por clima (épico, calmo, corporativo, tenso).',
    uso: 'Trilha de música com fade automático.',
  },
  {
    id: 'music-playlist',
    nome: 'Music Playlist — wedding edits',
    categoria: 'audio',
    status: 'catalogo',
    itens: 60,
    tamanho: '~900 MB',
    descricao: 'Playlist para edições de casamento.',
    uso: 'Sugestão automática por duração do projeto.',
  },

  /* ---------------- VÍDEO / MOTION ---------------- */
  {
    id: 'motion-bg',
    nome: '1.000+ Motion Backgrounds',
    categoria: 'video',
    status: 'catalogo',
    itens: 1000,
    tamanho: '~18 GB',
    descricao: 'Fundos animados em loop (4K e 1080p).',
    uso: 'Camada de fundo — entra como clipe de vídeo em loop.',
  },
  {
    id: 'overlays-100',
    nome: '100+ Overlays',
    categoria: 'overlay',
    status: 'pronto',
    itens: 108,
    tamanho: '~1,4 GB',
    descricao: 'Light leaks, film burns, dust, grunge.',
    uso: 'Trilha superior com blend de tela.',
  },
  {
    id: 'overlays-30',
    nome: '30 Overlays Pack',
    categoria: 'overlay',
    status: 'pronto',
    itens: 30,
    tamanho: '~600 MB',
    descricao: 'Overlays leves para transição.',
    uso: 'Camada de sobreposição.',
  },
  {
    id: 'transitions',
    nome: 'Transitions (pack completo)',
    categoria: 'video',
    status: 'catalogo',
    itens: 420,
    tamanho: '~6 GB',
    descricao: 'Transições de zoom, glitch, warp, light.',
    uso: 'Aplicadas entre dois clipes na timeline.',
  },
  {
    id: 'stickman',
    nome: 'Stickman Animations',
    categoria: 'video',
    status: 'catalogo',
    itens: 140,
    tamanho: '~3 GB',
    descricao: 'Animações de personagem para explainer.',
    uso: 'Elemento com chroma key.',
  },
  {
    id: 'hand-anim',
    nome: 'Hand Animations',
    categoria: 'video',
    status: 'catalogo',
    itens: 60,
    tamanho: '~1,2 GB',
    descricao: 'Mãos desenhando/apontando.',
    uso: 'Sobreposição sobre screen recording.',
  },
  {
    id: 'loading-bars',
    nome: 'Loading Bars & HUD',
    categoria: 'video',
    status: 'pronto',
    itens: 45,
    tamanho: '~800 MB',
    descricao: 'Barras de carregamento, HUD, interface futurista.',
    uso: 'Elemento com blend screen.',
  },
  {
    id: 'hud-carousel',
    nome: 'HUD Carousel',
    categoria: 'video',
    status: 'pronto',
    itens: 18,
    tamanho: '~500 MB',
    descricao: 'Carrossel com estética HUD.',
    uso: 'Apresentação de imagens.',
  },
  {
    id: 'virais-1500',
    nome: '+1.500 Vídeos Virais',
    categoria: 'video',
    status: 'indice',
    itens: 1500,
    tamanho: 'estimado 40 GB+',
    descricao: 'Acervo de cortes virais para referência.',
    uso: 'Apenas consulta — não redistribuir.',
  },

  /* ---------------- IMAGEM ---------------- */
  {
    id: 'studio-bg',
    nome: 'Studio Backgrounds',
    categoria: 'imagem',
    status: 'catalogo',
    itens: 260,
    tamanho: '~2 GB',
    descricao: 'Fundos de estúdio fotográfico.',
    uso: 'Imagem de fundo com ajuste de zoom.',
  },
  {
    id: 'char-png',
    nome: 'Character PNG',
    categoria: 'imagem',
    status: 'pronto',
    itens: 320,
    tamanho: '~1,6 GB',
    descricao: 'Personagens recortados em PNG transparente.',
    uso: 'Elemento de imagem com keyframe.',
  },
  {
    id: 'business-char',
    nome: 'Business Character Pack (Luca)',
    categoria: 'imagem',
    status: 'pronto',
    itens: 90,
    tamanho: '~400 MB',
    descricao: 'Personagens corporativos recortados.',
    uso: 'Elemento de imagem.',
  },
  {
    id: '3d-icons',
    nome: '3D Icons',
    categoria: 'imagem',
    status: 'pronto',
    itens: 180,
    tamanho: '~350 MB',
    descricao: 'Ícones 3D renderizados.',
    uso: 'Elemento com animação de escala.',
  },
  {
    id: 'thumbs-pack',
    nome: 'YouTube Thumbnail Assets (10 GB)',
    categoria: 'imagem',
    status: 'indice',
    itens: 4000,
    tamanho: '~10 GB',
    descricao: 'Elementos para thumbnails: setas, círculos, molduras, olhares.',
    uso: 'Composição de thumbnail dentro do editor.',
  },
  {
    id: 'geo-layers',
    nome: 'Geo Layers',
    categoria: 'imagem',
    status: 'catalogo',
    itens: 140,
    tamanho: '~2 GB',
    descricao: 'Formas geométricas em camadas.',
    uso: 'Formas vetoriais animáveis.',
  },
  {
    id: 'mockups',
    nome: 'Mockups',
    categoria: 'imagem',
    status: 'catalogo',
    itens: 210,
    tamanho: '~3 GB',
    descricao: 'Mockups de dispositivos e impressos.',
    uso: 'Compor screen recording dentro do mockup.',
  },

  /* ---------------- TEMPLATES / PROJETO ---------------- */
  {
    id: 'xml-2000',
    nome: '2.000+ XML Alight Motion',
    categoria: 'template',
    status: 'pronto',
    itens: 2000,
    tamanho: '~2 GB',
    descricao: 'Projetos de animação de UI, texto, tipografia e estilo documentário.',
    uso: 'Importados pelo leitor de XML — viram projeto editável no Vortex.',
  },
  {
    id: 'paper-anim',
    nome: 'Paper Animation Preset',
    categoria: 'template',
    status: 'catalogo',
    itens: 30,
    tamanho: '~700 MB',
    descricao: 'Efeito de dobra/recorte de papel.',
    uso: 'Preset aplicável em imagem.',
  },
  {
    id: 'paper-fold',
    nome: 'Paper Folding Effect',
    categoria: 'template',
    status: 'catalogo',
    itens: 1,
    tamanho: '~300 MB',
    descricao: 'Template de dobra de papel.',
    uso: 'Projeto base editável.',
  },
  {
    id: 'halation',
    nome: 'Halation Effect Preset',
    categoria: 'lut',
    status: 'pronto',
    itens: 6,
    tamanho: '~40 MB',
    descricao: 'Presets de halation analógico.',
    uso: 'Efeito de cor no inspetor.',
  },
  {
    id: 'dehancer',
    nome: 'Dehancer Pro (LUTs)',
    categoria: 'lut',
    status: 'catalogo',
    itens: 90,
    tamanho: '~500 MB',
    descricao: 'LUTs de color grading cinematográfico.',
    uso: 'Camada de correção de cor.',
  },
  {
    id: 'sam-assets',
    nome: 'Ali Abdaal Assets',
    categoria: 'template',
    status: 'pronto',
    itens: 110,
    tamanho: '~600 MB',
    descricao: 'Elementos de edição estilo documentário/educacional.',
    uso: 'Templates de texto e destaque.',
  },
  {
    id: 'dhruv',
    nome: 'Dhruv Rathee BXC Highlight',
    categoria: 'template',
    status: 'pronto',
    itens: 40,
    tamanho: '~250 MB',
    descricao: 'Destaque de texto estilo documentário.',
    uso: 'Template de texto com keyframes.',
  },
  {
    id: 'hook-30',
    nome: '30 Viral Hooks',
    categoria: 'template',
    status: 'pronto',
    itens: 30,
    tamanho: '~150 MB',
    descricao: 'Aberturas de vídeo (hooks) prontas para Reels.',
    uso: 'Template de abertura com 3 s.',
  },
  {
    id: 'warrior',
    nome: 'Warrior Assets',
    categoria: 'video',
    status: 'catalogo',
    itens: 75,
    tamanho: '~1,8 GB',
    descricao: 'Elementos de impacto para edições de esporte.',
    uso: 'Sobreposição com blend.',
  },
  {
    id: 'designsburner',
    nome: 'Designsburner Massive Pack',
    categoria: 'video',
    status: 'indice',
    itens: 2500,
    tamanho: 'estimado 30 GB+',
    descricao: 'Acervo misto de elementos e overlays.',
    uso: 'Índice — consulta no Drive.',
  },
  {
    id: 'envato-30',
    nome: 'Envato 30 GB Pack',
    categoria: 'video',
    status: 'indice',
    itens: 6000,
    tamanho: '~30 GB',
    descricao: 'Acervo Envato (licença necessária para uso comercial).',
    uso: 'Índice — atenção à licença.',
  },
  {
    id: 'fontes',
    nome: 'Fontes (famílias completas)',
    categoria: 'fonte',
    status: 'catalogo',
    itens: 480,
    tamanho: '~2 GB',
    descricao: 'Famílias tipográficas para o editor de texto.',
    uso: 'Seletor de fonte do inspetor.',
  },
  {
    id: 'transcricoes',
    nome: 'Transcrições e roteiros',
    categoria: 'projeto',
    status: 'pendente',
    itens: 0,
    tamanho: '—',
    descricao: 'Documentos de texto do Drive a serem indexados (prompts, roteiros, aulas).',
    uso: 'Base para legendas automáticas e busca por conteúdo.',
  },
];


/* ============================================================
   VAULT DO DRIVE — pastas reais (IDs verificados)
   Estas são as 17 pastas do acervo principal do usuário.
   O conteúdo é indexado por metadados; a mídia fica no Drive.
   ============================================================ */

export interface PastaVault {
  id: string;
  nome: string;
  pastaId: string;
  categoria: PackDrive['categoria'];
  uso: string;
}

export const VAULT_DRIVE: PastaVault[] = [
  { id: 'v-typography', nome: 'Typography', pastaId: '1w0s5U8I8wO6bprAz7DxQTqKtILShSu-g', categoria: 'template', uso: 'Tipografia animada — templates de texto com keyframes.' },
  { id: 'v-fonts', nome: 'Fonts', pastaId: '1zf65NQ0onqVoshu9HfJT8Z-Td17S8QVA', categoria: 'fonte', uso: 'Famílias para o seletor de fonte do inspetor.' },
  { id: 'v-emojis', nome: 'Emojis', pastaId: '1LkSHzxLrAdaVtiuUgwd7kV3zSAw1CPab', categoria: 'imagem', uso: 'Emojis em PNG/GIF para sobrepor na timeline.' },
  { id: 'v-greenscreen', nome: 'Green Screen Animations', pastaId: '1nGu5OiUcYPMxQOZRquvUid75fH-M6Oe5', categoria: 'video', uso: 'Animações em chroma key — efeito de remoção de verde.' },
  { id: 'v-textures', nome: 'Still Textures', pastaId: '1bBjUwqm7fxEqrkIEd1nrHRD3JLuHKQlT', categoria: 'imagem', uso: 'Texturas de sobreposição com blend.' },
  { id: 'v-transitions', nome: 'Transitions & Overlays', pastaId: '1aCBjhsigy8tX_KDPWDVDhY4J0WO_fNzK', categoria: 'overlay', uso: 'Transições e overlays entre clipes.' },
  { id: 'v-luts', nome: 'Luts', pastaId: '10wM-Fn612WsVxwi26d5uffiIUeKmM4rP', categoria: 'lut', uso: 'Color grading — camada de correção de cor.' },
  { id: 'v-callout', nome: 'Callout Mogrt File', pastaId: '1KNYhC2nKvM-iPAIOhtSLHj5yFWRNR4dW', categoria: 'template', uso: 'Chamadas/anotações animadas (Mogrt).' },
  { id: 'v-letters', nome: 'Animated Letters', pastaId: '1VDHFfoPiwkNKZ9KuPW2HsCoN5mf72hMf', categoria: 'video', uso: 'Letras animadas para aberturas.' },
  { id: 'v-shadowemoji', nome: 'Shadow emojis', pastaId: '1vsegFUCb25TPhIQq2UVUDOI6cmmRGZep', categoria: 'imagem', uso: 'Emojis com sombra, prontos para destaque.' },
  { id: 'v-icons', nome: 'Icons', pastaId: '1pgkEkpmfd9p7hoAmhWgiu2772WBu3px-', categoria: 'imagem', uso: 'Ícones para UI e destaques.' },
  { id: 'v-motionbg', nome: 'Motion Backgrounds', pastaId: '1BZAJdvPuJZH3ViNGg89zWlYUtU7irYPf', categoria: 'video', uso: 'Fundos animados em loop.' },
  { id: 'v-social', nome: 'Social Animations', pastaId: '1GIvvCzhne_AzfKoA8jPAwu0hF2KRo2LQ', categoria: 'template', uso: 'Animações para posts e stories.' },
  { id: 'v-peter', nome: 'Peter McKinnon Presets', pastaId: '17roUop-99wl_Vv3E9V-aUD1AjkCd_FeV', categoria: 'lut', uso: 'Presets de cor e revelação.' },
  { id: 'v-vfx', nome: 'Vfx', pastaId: '1WytHyGJ5z7qxMLzNKn0EakhyARnlII6R', categoria: 'video', uso: 'Efeitos visuais com blend screen/lighten.' },
  { id: 'v-hands', nome: '3d Hands', pastaId: '1konxHmSWLddINlwMkAuEiOBGQ-KSPbA1', categoria: 'video', uso: 'Mãos 3D para explicações.' },
  { id: 'v-sfx', nome: 'Sfx', pastaId: '16q1FuUNB67jvA1l0t-P74ZUxwv4Pq8hk', categoria: 'audio', uso: 'Efeitos sonoros — trilha de áudio.' },
];

export const CATEGORIAS_PACK: { id: PackDrive['categoria']; nome: string; icone: string }[] = [
  { id: 'audio', nome: 'Áudio e SFX', icone: '♪' },
  { id: 'video', nome: 'Vídeo e motion', icone: '▶' },
  { id: 'imagem', nome: 'Imagens e elementos', icone: '▣' },
  { id: 'template', nome: 'Templates e projetos', icone: '✦' },
  { id: 'overlay', nome: 'Overlays', icone: '◎' },
  { id: 'lut', nome: 'Color e LUTs', icone: '◐' },
  { id: 'fonte', nome: 'Fontes', icone: 'Aa' },
  { id: 'projeto', nome: 'Documentos', icone: '▤' },
];

export const resumoCatalogo = () => {
  const total = CATALOGO_DRIVE.reduce((s, p) => s + p.itens, 0);
  const prontos = CATALOGO_DRIVE.filter((p) => p.status === 'pronto').length;
  const catalogados = CATALOGO_DRIVE.filter((p) => p.status === 'catalogo').length;
  return { packs: CATALOGO_DRIVE.length, itens: total, prontos, catalogados };
};

/** plano de importação — o que fazer com cada pasta do Drive */
export const PLANO_IMPORTACAO = [
  {
    etapa: 1,
    titulo: 'Metadados primeiro',
    acao: 'Ler nome, tamanho e tipo de cada arquivo das pastas e gravar só isso no banco.',
    resultado: 'Catálogo pesquisável em segundos, sem mover 1 byte de mídia.',
  },
  {
    etapa: 2,
    titulo: 'Packs pequenos instaláveis',
    acao: 'Tudo abaixo de 2 GB vira pack com download sob demanda (drive.google.com → blob → biblioteca).',
    resultado: 'SFX, overlays, LUTs e templates prontos para arrastar na timeline.',
  },
  {
    etapa: 3,
    titulo: 'Áudio com transcrição',
    acao: 'Extrair waveform e transcrever os packs de voz/aula; indexar por frase.',
    resultado: 'Busca por fala dentro do áudio e legendas automáticas.',
  },
  {
    etapa: 4,
    titulo: 'XMLs do Alight Motion',
    acao: 'Rodar o leitor de XML e converter cada projeto em cena editável do Vortex.',
    resultado: 'Os 2.000+ templates viram itens da biblioteca, aplicáveis com 1 clique.',
  },
  {
    etapa: 5,
    titulo: 'Acervos grandes',
    acao: 'Pastas acima de 20 GB ficam só indexadas, com link direto para o Drive.',
    resultado: 'Zero custo de armazenamento; o editor aponta para a origem.',
  },
];
