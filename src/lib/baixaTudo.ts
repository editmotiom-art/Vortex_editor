/**
 * BAIXA TUDO — o motor da extensão, rodando dentro do editor
 * ------------------------------------------------------------
 * A extensão "Baixa Tudo" (MV3) manda o link da página que você está vendo
 * para o motor dela (POST https://baixartudo.me/api/) e recebe de volta um
 * endereço de download (`tunnel` / `redirect`) ou uma lista de arquivos.
 *
 * Isso tudo depende de permissões de navegador que uma página comum não tem
 * (nem precisa): o pedido é exatamente o mesmo que a própria extensão faz.
 * Aqui o mesmo motor é chamado direto do sistema e o arquivo entra no projeto.
 *
 *   export  →  usarBaixaTudo(link) → asset + clipe na timeline
 */

import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { identityTransform } from '../types';
import { ehAudio, probeMidia } from './midia';

const SERVIDOR = 'https://baixartudo.me';

/** sites que o motor aceita (mesma lista da extensão) */
export const SITES_BAIXA_TUDO = [
  'YouTube',
  'X / Twitter',
  'Instagram',
  'TikTok',
  'Facebook',
  'Pinterest',
  'Reddit',
  'Vimeo',
  'Twitch',
  'SoundCloud',
  'Bluesky',
  'Dailymotion',
  'Loom',
  'Direto (.mp4/.mp3)',
];

export interface RespostaMotor {
  status: 'tunnel' | 'redirect' | 'picker' | 'local-processing' | 'error';
  url?: string;
  filename?: string;
  picker?: Array<{ url: string; type?: string; thumb?: string }>;
  tunnel?: string[];
  audio?: string;
  error?: { code: string };
}

const ERROS: Record<string, string> = {
  'error.api.link.invalid': 'Esse link não parece válido.',
  'error.api.link.unsupported': 'Esse site não é aceito pelo motor.',
  'error.api.service.unsupported': 'Esse site não é aceito pelo motor.',
  'error.api.service.disabled': 'Esse site está desligado no motor.',
  'error.api.fetch.empty': 'Não achei nada para baixar nesse link. Ele é público?',
  'error.api.fetch.fail': 'O site não liberou o arquivo. Tente de novo.',
  'error.api.content.video.private': 'Esse vídeo é privado.',
  'error.api.content.video.live': 'Não dá para baixar transmissão ao vivo.',
  'error.api.content.video.age': 'Esse vídeo tem trava de idade.',
  'error.api.rate_exceeded': 'Muitos pedidos seguidos. Espere um minuto.',
  'error.api.header.accept': 'O motor recusou o pedido (cabeçalho). Tente de novo.',
};

const erroAmigavel = (codigo?: string): string => {
  if (!codigo) return 'O motor não explicou o erro. Tente de novo.';
  if (ERROS[codigo]) return ERROS[codigo];
  if (codigo.includes('youtube')) return 'O YouTube bloqueou este vídeo agora. Tente de novo em alguns minutos.';
  if (codigo.includes('auth')) return 'O motor recusou o acesso.';
  return `Algo deu errado (${codigo}).`;
};

/** pergunta ao motor o que existe por trás do link */
export async function consultarBaixaTudo(
  link: string,
  opc: { audio?: boolean; qualidade?: string } = {},
): Promise<RespostaMotor> {
  const corpo: Record<string, unknown> = {
    url: link,
    downloadMode: opc.audio ? 'audio' : 'auto',
    filenameStyle: 'pretty',
  };
  if (opc.audio) corpo.audioFormat = 'mp3';
  else corpo.videoQuality = opc.qualidade ?? '1080';

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const r = await fetch(`${SERVIDOR}/api/`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const d = (await r.json()) as RespostaMotor;
    if (!d || !d.status) throw new Error('Resposta estranha do motor');
    if (d.status === 'error') throw new Error(erroAmigavel(d.error?.code));
    return d;
  } finally {
    clearTimeout(t);
  }
}

const nomeLimpo = (n: string, fallback: string) =>
  (n || fallback)
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || fallback;

/** baixa o resultado e entrega no projeto (asset + clipe na timeline) */
export async function usarBaixaTudo(
  link: string,
  opc: { audio?: boolean; qualidade?: string; naTimeline?: boolean } = {},
): Promise<{ ok: boolean; nome?: string }> {
  const toast = useUI.getState().toast;
  try {
    const d = await consultarBaixaTudo(link, opc);

    /* alguns posts vêm em partes: usa a primeira que for vídeo */
    let alvo = d.url ?? '';
    let tipoForcado = '';
    if (!alvo && d.status === 'picker') {
      const item = d.picker?.[0];
      alvo = item?.url ?? '';
      tipoForcado = item?.type ?? '';
    }
    if (!alvo && d.status === 'local-processing') {
      alvo = d.tunnel?.[0] ?? d.audio ?? '';
    }
    if (!alvo) {
      toast('O motor não devolveu um arquivo para esse link', 'warn');
      return { ok: false };
    }

    const resp = await fetch(alvo);
    if (!resp.ok) throw new Error(`o servidor do arquivo respondeu ${resp.status}`);
    const blob = await resp.blob();
    if (blob.size < 1024) throw new Error('o arquivo veio vazio');

    const audio = opc.audio || ehAudio(blob.type, d.filename ?? '');
    const kind: 'video' | 'audio' | 'image' = audio
      ? 'audio'
      : tipoForcado === 'photo'
        ? 'image'
        : blob.type.startsWith('image')
          ? 'image'
          : 'video';

    const url = URL.createObjectURL(blob);
    const meta = await probeMidia(url, kind);
    const nome = nomeLimpo(d.filename ?? '', `${kind}-baixa-tudo.${kind === 'audio' ? 'mp3' : 'mp4'}`);

    const ed = useEditor.getState();
    const asset = ed.addAsset({
      name: nome,
      kind,
      url,
      durationMs: meta.durationMs,
      width: meta.width,
      height: meta.height,
      origin: 'library',
      sizeBytes: blob.size,
    });

    if (opc.naTimeline !== false) {
      const trilha = ed.trilhaPara(kind === 'audio' ? 'audio' : kind === 'image' ? 'image' : 'video');
      if (trilha) {
        ed.addElement({
          type: kind,
          name: nome,
          trackId: trilha.id,
          start: ed.playhead,
          duration: Math.max(1000, meta.durationMs || 4000),
          sourceIn: 0,
          assetId: asset.id,
          transform: identityTransform(),
          blend: 'normal',
          effects: [],
          volume: 1,
          locked: false,
          hidden: false,
          color: kind === 'audio' ? '#818cf8' : '#22d3ee',
        });
      }
    }
    toast(`“${nome}” baixado e colocado na timeline`, 'ok');
    return { ok: true, nome };
  } catch (e) {
    const msg = (e as Error).name === 'AbortError' ? 'O motor demorou demais para responder' : (e as Error).message;
    toast(`Baixa Tudo: ${msg}`, 'err');
    return { ok: false };
  }
}
