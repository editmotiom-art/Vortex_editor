/**
 * MOTOR GRATUITO DE IMAGEM E ROTEIRO (sem chave)
 * ------------------------------------------------------------
 * Quando o painel não tem API paga configurada, o chat de criação ainda
 * precisa entregar alguma coisa. Aqui ficam as três reservas, em ordem:
 *
 *   imagem:  Pollinations (Flux) → Picsum (foto neutra) → canvas com o texto
 *   roteiro: roteiroLocal (template treinado, instantâneo, sempre funciona)
 *
 * Nada disso usa chave, nada é gravado no servidor.
 */

export type FonteImagem = 'pollinations' | 'picsum' | 'canvas';

export interface ResultadoImagem {
  ok: boolean;
  url?: string;
  fonte?: FonteImagem;
  erro?: string;
}

const PROPORCOES: Record<string, [number, number]> = {
  vertical: [1024, 1792],
  quadrado: [1024, 1024],
  horizontal: [1792, 1024],
};

/** canvas com o texto do pedido — nunca falha, serve de último recurso */
const desenharNoCanvas = (texto: string, formato: string): string => {
  const [w, h] = PROPORCOES[formato] ?? PROPORCOES.vertical;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0b1220');
  g.addColorStop(0.55, '#132a4a');
  g.addColorStop(1, '#052e3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // brilho suave no topo
  const halo = ctx.createRadialGradient(w * 0.7, h * 0.2, 0, w * 0.7, h * 0.2, w * 0.9);
  halo.addColorStop(0, 'rgba(34,211,238,.35)');
  halo.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#e8f7ff';
  ctx.textAlign = 'center';
  ctx.font = `700 ${Math.round(w / 14)}px system-ui, sans-serif`;
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const teste = `${atual} ${p}`.trim();
    if (ctx.measureText(teste).width > w * 0.82 && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  const alturaLinha = Math.round(w / 11);
  linhas.slice(0, 6).forEach((linha, i) => {
    ctx.fillText(linha, w / 2, h / 2 + (i - (Math.min(linhas.length, 6) - 1) / 2) * alturaLinha);
  });
  return c.toDataURL('image/png');
};

/** tenta o Pollinations com o prompt já montado pela skill */
export async function gerarImagemGratis(
  prompt: string,
  formato: 'vertical' | 'quadrado' | 'horizontal' = 'vertical',
): Promise<ResultadoImagem> {
  const [w, h] = PROPORCOES[formato] ?? PROPORCOES.vertical;

  try {
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 900))}` +
      `?width=${w}&height=${h}&model=flux&nologo=true&seed=${Date.now() % 99999}`;
    const r = await fetch(url);
    if (r.ok) {
      const blob = await r.blob();
      if (blob.size > 3000 && blob.type.startsWith('image')) {
        return { ok: true, url: URL.createObjectURL(blob), fonte: 'pollinations' };
      }
    }
  } catch {
    /* tenta a próxima */
  }

  try {
    const r = await fetch(`https://picsum.photos/${w}/${h}?random=${Date.now() % 9999}`);
    if (r.ok) {
      const blob = await r.blob();
      if (blob.size > 3000) return { ok: true, url: URL.createObjectURL(blob), fonte: 'picsum' };
    }
  } catch {
    /* cai no canvas */
  }

  return { ok: true, url: desenharNoCanvas(prompt, formato), fonte: 'canvas' };
}

/**
 * Roteiro de reserva — template treinado em Reels/TikTok. Não é “texto de
 * erro”: segue a mesma estrutura que o modelo devolveria, com gancho, cenas
 * cronometradas e chamada final. Instantâneo.
 */
export function roteiroLocal(pedido: string, skill = 'Vortex'): string {
  const tema = (pedido || 'seu produto').replace(/\s+/g, ' ').trim().slice(0, 120);
  const curto = tema.length > 42 ? `${tema.slice(0, 42)}…` : tema;
  return `**Roteiro · ${curto}**
_skill: ${skill} · 15 s · 9:16_

| tempo | imagem / ação | fala | texto na tela |
|---|---|---|---|
| 0–2 s | Close rápido com movimento; produto entra no quadro | “Ninguém te contou isso sobre ${curto}.” | PARA DE ROLAR |
| 2–5 s | Corte seco: detalhe do produto, luz lateral | “O erro é começar pelo preço antes do problema.” | O ERRO |
| 5–9 s | B-roll de uso real + zoom lento | “Mostra o antes, mostra o depois — em 4 segundos.” | ANTES / DEPOIS |
| 9–12 s | Tela dividida com 3 provas (números, print, reação) | “Prova vence promessa. Sempre.” | PROVA |
| 12–15 s | Produto centralizado, assinatura e marca | “Toca no link e testa hoje. Leva 2 minutos.” | TESTA HOJE |

**Trilha:** eletrônico leve, 100–110 BPM · **cortes:** seco a cada fala · **legenda:** branca com contorno escuro, 2 linhas no máximo.

Quer que eu ajuste? Posso trocar o gancho, deixar mais vendedor ou mais institucional — e já posso gerar a capa dessa primeira cena.`;
}
