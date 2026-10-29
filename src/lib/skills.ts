/**
 * SKILLS DE CRIAÇÃO (presets treinados)
 * ------------------------------------------------------------
 * Cada skill é um "diretor" pronto: define estilo, câmera, luz, paleta e o
 * que evitar. O chat do editor usa a skill escolhida + o pedido do usuário +
 * a referência do cliente para montar o prompt que vai para a API de imagem.
 * Base: os presets públicos mais usados de Midjourney/Flux/DALL·E.
 */

export interface Skill {
  id: string;
  nome: string;
  emoji: string;
  categoria: 'Social' | 'Produto' | 'Cinema' | 'Arte' | 'Foto';
  resumo: string;
  /** o que entra no prompt final */
  estilo: string;
  /** o que deve ser evitado (prompt negativo) */
  evitar: string;
  formato: 'vertical' | 'quadrado' | 'horizontal';
  /** falas sugeridas para começar rápido */
  exemplos: string[];
}

export const SKILLS: Skill[] = [
  {
    id: 'reels-gancho',
    nome: 'Reels que para o dedo',
    emoji: '🔥',
    categoria: 'Social',
    resumo: 'Capa com contraste alto, rosto grande e texto curto para o feed.',
    estilo:
      'vertical 9:16, primeiro plano com sujeito ocupando 60% do quadro, fundo desfocado com cores saturadas, luz dura lateral, alto contraste, granulação fina de filme, foto publicitária de celular premium',
    evitar: 'fundo branco liso, composição vazia, texto dentro da imagem, marca d’água',
    formato: 'vertical',
    exemplos: ['capa do Reels sobre edição de vídeo no celular', 'capa de Reels de academia', 'thumbnail de corte de podcast'],
  },
  {
    id: 'produto-estudio',
    nome: 'Produto de estúdio',
    emoji: '📦',
    categoria: 'Produto',
    resumo: 'Foto de e-commerce com fundo limpo, luz suave e sombra sutil.',
    estilo:
      'produto centralizado em fundo seamless branco ou cinza claro, luz high-key com softbox, sombra suave sob o produto, 85mm, foco nítido, fotorrealismo comercial',
    evitar: 'fundo bagunçado, reflexos sujos, texto, pessoas',
    formato: 'quadrado',
    exemplos: ['perfume preto fosco com tampa dourada', 'tênis branco em fundo cinza', 'embalagem de café especial'],
  },
  {
    id: 'produto-lifestyle',
    nome: 'Produto em uso',
    emoji: '🏠',
    categoria: 'Produto',
    resumo: 'Produto dentro de um cenário real, luz natural e profundidade.',
    estilo:
      'produto em ambiente real de uso, luz natural de janela, profundidade de campo rasa, props coerentes, paleta quente e minimalista, foto editorial',
    evitar: 'estúdio artificial, excesso de objetos, saturação extrema',
    formato: 'vertical',
    exemplos: ['skincare na bancada de mármore de manhã', 'notebook na mesa de café', 'camiseta pendurada no quarto'],
  },
  {
    id: 'retrato-editorial',
    nome: 'Retrato editorial',
    emoji: '🧑‍🎤',
    categoria: 'Foto',
    resumo: 'Retrato com luz dramaticamente controlada e pele natural.',
    estilo:
      'retrato editorial 85mm f/1.8, luz principal suave 45°, rim light marcando o contorno, pele com textura natural sem retoque plástico, fundo neutro, cores dessaturadas',
    evitar: 'pele lisa de plástico, olhos irreais, iluminação frontal chapada',
    formato: 'vertical',
    exemplos: ['retrato de empreendedora em fundo escuro', 'foto de perfil profissional', 'retrato masculino com rim light'],
  },
  {
    id: 'cinema-teal',
    nome: 'Cinema teal & orange',
    emoji: '🎬',
    categoria: 'Cinema',
    resumo: 'Look de cinema: sombras azuladas, pele quente, lente anamórfica.',
    estilo:
      'still de cinema, lente anamórfica, sombras teal e realces laranja, contraste alto com pretos densos, leve halo nos realces, 2.39:1, grão de 35mm',
    evitar: 'cores pastel, flat lighting, HDR exagerado',
    formato: 'horizontal',
    exemplos: ['cena noturna de perseguição na cidade', 'retrato dramático com fumaça', 'capa de filme de suspense'],
  },
  {
    id: 'cinema-noir',
    nome: 'Noir em preto e branco',
    emoji: '🕵️',
    categoria: 'Cinema',
    resumo: 'Preto e branco duro, sombras longas, contraste de persiana.',
    estilo:
      'preto e branco de alto contraste, luz dura com sombras longas, fumaça no ar, textura de filme 400 ISO, enquadramento inclinado, atmosfera noir clássica',
    evitar: 'cor, fundo claro, luz plana',
    formato: 'horizontal',
    exemplos: ['detetive na sala com persiana veneziana', 'silhueta na neblina', 'carro antigo na chuva'],
  },
  {
    id: '3d-brinde',
    nome: '3D fofo (brinde)',
    emoji: '🧸',
    categoria: 'Arte',
    resumo: 'Render 3D arredondado, cores pastel e material macio.',
    estilo:
      'render 3D estilo clay com formas arredondadas, materiais soft-touch, cores pastel, iluminação de estúdio suave com softbox gigante, oclusão ambiente sutil, octane render',
    evitar: 'realismo fotográfico, texturas sujas, sombras duras',
    formato: 'quadrado',
    exemplos: ['mascote 3D para marca de café', 'ícone 3D de carrinho', 'personagem fofo para app'],
  },
  {
    id: 'neon-cyber',
    nome: 'Neon cyberpunk',
    emoji: '🌆',
    categoria: 'Arte',
    resumo: 'Cidade noturna com neon rosa/azul e reflexos molhados.',
    estilo:
      'cena cyberpunk noturna, neon rosa e ciano, asfalto molhado com reflexos, atmosfera densa, luz volumétrica, detalhes em holograma, 35mm, alto contraste',
    evitar: 'luz do dia, paleta neutra, cena limpa',
    formato: 'vertical',
    exemplos: ['rua de Tóquio com letreiros neon', 'retrato com máscara futurista', 'carro esportivo em garagem neon'],
  },
  {
    id: 'flat-ilustra',
    nome: 'Ilustração flat',
    emoji: '🎨',
    categoria: 'Arte',
    resumo: 'Vetor limpo, paleta de 4 cores, formas geométricas.',
    estilo:
      'ilustração vetorial flat, paleta de 4 cores, formas geométricas simples, sem gradiente complexo, traço consistente, composição equilibrada, estilo editorial moderno',
    evitar: 'sombras realistas, textura de foto, excesso de detalhe',
    formato: 'quadrado',
    exemplos: ['ilustração de pessoa trabalhando no notebook', 'capa de artigo sobre produtividade', 'ícone de equipe'],
  },
  {
    id: 'texto-3d',
    nome: 'Título 3D',
    emoji: '🔠',
    categoria: 'Social',
    resumo: 'Palavra em 3D com material e luz de estúdio para capa.',
    estilo:
      'tipografia 3D em relevo, material plástico brilhante ou cromado, luz de estúdio com reflexos, fundo em gradiente escuro, sombra projetada, render limpo centralizado',
    evitar: 'fonte ilegível, fundo poluído, brilho estourado',
    formato: 'quadrado',
    exemplos: ['palavra “BLACK FRIDAY” em 3D cromado', 'título 3D para curso', 'número 2026 em 3D'],
  },
  {
    id: 'food-delivery',
    nome: 'Comida que vende',
    emoji: '🍔',
    categoria: 'Produto',
    resumo: 'Comida apetitosa, vapor, textura e luz de restaurante.',
    estilo:
      'fotografia gastronômica, close em 45°, vapor sutil, textura crocante visível, luz de janela lateral quente, fundo de madeira escura desfocado, cores apetitosas sem exagero',
    evitar: 'comida seca, plástico, saturação artificial',
    formato: 'quadrado',
    exemplos: ['hambúrguer artesanal com queijo derretendo', 'café coado com vapor', 'pizza saindo do forno'],
  },
  {
    id: 'antes-depois',
    nome: 'Antes e depois',
    emoji: '🔀',
    categoria: 'Social',
    resumo: 'Dois quadros comparáveis para mostrar transformação.',
    estilo:
      'composição comparativa em dois quadros com o mesmo enquadramento e luz, lado esquerdo “antes” dessaturado, lado direito “depois” vibrante e limpo, mesma pessoa/produto nas duas metades',
    evitar: 'enquadramentos diferentes, luz inconsistente, texto na imagem',
    formato: 'vertical',
    exemplos: ['antes e depois de design de sobrancelha', 'renovação de sala', 'organização de armário'],
  },
];
