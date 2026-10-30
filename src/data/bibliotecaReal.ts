/**
 * BIBLIOTECA PROFISSIONAL — mídia REAL, validada por script
 * ------------------------------------------------------------
 * Diferente da biblioteca de efeitos (que cria elementos no editor), aqui
 * cada item é um ARQUIVO de verdade, com licença livre (Wikimedia Commons /
 * Pexels / PD), e todos foram baixados e conferidos por
 * `scripts/validar-biblioteca.mjs` antes de entrar no catálogo:
 *   · código 200 e tamanho > 8 KB;
 *   · tipo real do arquivo (audio/mpeg, audio/ogg, image/jpeg, video/mp4…);
 *   · nome, autor e licença exibidos no card.
 *
 * O catálogo é GERADO por esse script para `src/data/bibliotecaMidia.ts`.
 * Nada de URL inventada: se um dia um arquivo sair do ar, o card mostra
 * "indisponível" e o botão de baixar não aparece.
 */

export type TipoMidiaReal = 'audio' | 'image' | 'video';

export interface ItemBibliotecaReal {
  id: string;
  nome: string;
  tipo: TipoMidiaReal;
  /** endereço direto do arquivo (validado) */
  url: string;
  /** página de origem, para crédito */
  fonte: string;
  autor?: string;
  licenca: string;
  bytes: number;
  duracaoSeg?: number;
  /** categoria da biblioteca (Música, SFX, Fundos, Imagens…) */
  cat: string;
  /** para áudio: quantos segundos usar por padrão (loop/corte) */
  trechoSeg?: number;
  tags: string[];
}
