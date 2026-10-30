/**
 * VOZES DO EDITOR (narração por TTS)
 * ------------------------------------------------------------
 * O navegador não pode falar direto com o Google tradutor (CORS), então o
 * áudio vem pronto da função `ferramentas` (ação `voz`) — rápido: 3 s de
 * fala costumam voltar em menos de 1 s. Se o servidor falhar, tenta o
 * `speechSynthesis` do próprio aparelho e, se nem isso existir, devolve null
 * (nunca grava clipe vazio na timeline).
 *
 * Uso típico:
 *   const audio = await gerarAudioVoz({ texto });
 *   if (audio) await inserirNarracao(audio, { nome: 'Narração 1' });
 */

import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { lerConfig } from './config';
import { chamarFuncao } from './api';
import type { MediaAsset } from '../types';

export interface Voz {
  id: string;
  nome: string;
  idioma: string;
  /** multiplicador de tom (1 = original). Aplicado no áudio depois do TTS. */
  tom?: number;
  /** multiplicador de ritmo (1 = original) */
  ritmo?: number;
  /** id para ElevenLabs (quando o admin escolhe esse provedor) */
  eleven?: string;
}

/**
 * Catálogo HONESTO: cada item é uma combinação que o motor realmente
 * entrega diferente (idioma/região/velocidade). Antes havia sete "vozes"
 * que saíam com o mesmo timbre — agora o nome diz o que muda:
 *   · Ana  = pt-BR neutra
 *   · Bruno = pt-BR mais grave e lenta
 *   · Clara = pt-BR rápida (texto longo)
 *   · Inês = pt-PT · Emma = en-US · Liam = en-GB · Sofía = es-ES
 * Com ElevenLabs/OpenAI ligado no painel, o timbre vem do provedor.
 */
export const VOZES: Voz[] = [
  { id: 'pt-BR-f', nome: 'Ana · pt-BR neutra', idioma: 'pt-BR', eleven: '21m00Tcm4TlvDq8ikWAM' },
  { id: 'pt-BR-m', nome: 'Bruno · grave (tom −25%)', idioma: 'pt-BR', tom: 0.75, ritmo: 0.94, eleven: 'pNInz6obpgDQGcFmaJgB' },
  { id: 'pt-BR-n', nome: 'Clara · aguda e rápida', idioma: 'pt-BR', tom: 1.14, ritmo: 1.08, eleven: 'EXAVITQu4vr4xnSDxMaL' },
  { id: 'pt-PT-f', nome: 'Inês · pt-PT', idioma: 'pt-PT', eleven: '21m00Tcm4TlvDq8ikWAM' },
  { id: 'en-US-f', nome: 'Emma · en-US', idioma: 'en-US', eleven: 'EXAVITQu4vr4xnSDxMaL' },
  { id: 'en-GB-m', nome: 'Liam · en-GB', idioma: 'en-GB', eleven: 'pNInz6obpgDQGcFmaJgB' },
  { id: 'es-ES-f', nome: 'Sofía · es-ES', idioma: 'es-ES', eleven: 'EXAVITQu4vr4xnSDxMaL' },
];

export const VOZES_ELEVEN = [
  { id: '21m00Tcm4TlvDq8ikWAM', nome: 'Rachel (ElevenLabs)' },
  { id: 'pNInz6obpgDQGcFmaJgB', nome: 'Adam (ElevenLabs)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', nome: 'Bella (ElevenLabs)' },
];

const K_VOZ = 'vortex.voz';

export const lerVozEscolhida = (): Voz => {
  const id = localStorage.getItem(K_VOZ);
  return VOZES.find((v) => v.id === id) ?? VOZES[0];
};

export const salvarVozEscolhida = (id: string) => localStorage.setItem(K_VOZ, id);

/** duração de um áudio já pronto (ms) — usado para dimensionar o clipe */
export const duracaoDoBlob = (url: string): Promise<number> =>
  new Promise((ok) => {
    const el = new Audio();
    const fim = (ms: number) => ok(Number.isFinite(ms) && ms > 0 ? ms : 0);
    el.onloadedmetadata = () => fim((el.duration || 0) * 1000);
    el.onerror = () => fim(0);
    el.src = url;
    setTimeout(() => fim((el.duration || 0) * 1000), 6000);
  });

/**
 * MUDA O TIMBRE DE VERDADE
 * ------------------------------------------------------------
 * O motor gratuito (Google TTS) tem uma voz por idioma. Para o catálogo ter
 * vozes realmente diferentes sem pagar API, o áudio é reprocessado aqui:
 * o mesmo motor, com tom e ritmo alterados (Bruno = mais grave e lento,
 * Clara = mais aguda e rápida). O resultado é um WAV novo, decodificável e
 * com duração correta — não é só `playbackRate` na hora de tocar.
 */
async function transformarAudio(url: string, tom: number, ritmo: number): Promise<{ url: string; duracaoMs: number } | null> {
  if (Math.abs(tom - 1) < 0.01 && Math.abs(ritmo - 1) < 0.01) return null;
  try {
    const dados = await (await fetch(url)).arrayBuffer();
    const ctx = new OfflineAudioContext(1, 1, 44100);
    const original = await ctx.decodeAudioData(dados.slice(0));
    const taxa = Math.max(0.5, Math.min(2, ritmo * tom));
    const duracao = Math.max(0.2, original.duration / taxa);
    const render = new OfflineAudioContext(1, Math.ceil(duracao * original.sampleRate) + 1024, original.sampleRate);
    const fonte = render.createBufferSource();
    fonte.buffer = original;
    fonte.playbackRate.value = taxa; // tom + ritmo juntos (voz mais grave/aguda)
    fonte.connect(render.destination);
    fonte.start(0);
    const saida = await render.startRendering();

    /* WAV 16 bits (universal: toca no editor, exporta e abre em qualquer player) */
    const canais = saida.numberOfChannels;
    const n = saida.length;
    const amostras = new Int16Array(n * canais);
    for (let c = 0; c < canais; c += 1) {
      const canal = saida.getChannelData(c);
      for (let i = 0; i < n; i += 1) {
        const v = Math.max(-1, Math.min(1, canal[i]));
        amostras[i * canais + c] = v < 0 ? v * 0x8000 : v * 0x7fff;
      }
    }
    const buf = new ArrayBuffer(44 + amostras.length * 2);
    const dv = new DataView(buf);
    const txt = (pos: number, t: string) => {
      for (let i = 0; i < t.length; i += 1) dv.setUint8(pos + i, t.charCodeAt(i));
    };
    txt(0, 'RIFF');
    dv.setUint32(4, 36 + amostras.length * 2, true);
    txt(8, 'WAVE');
    txt(12, 'fmt ');
    dv.setUint32(16, 16, true);
    dv.setUint16(20, 1, true);
    dv.setUint16(22, canais, true);
    dv.setUint32(24, saida.sampleRate, true);
    dv.setUint32(28, saida.sampleRate * canais * 2, true);
    dv.setUint16(32, canais * 2, true);
    dv.setUint16(34, 16, true);
    txt(36, 'data');
    dv.setUint32(40, amostras.length * 2, true);
    new Int16Array(buf, 44).set(amostras);
    const blob = new Blob([buf], { type: 'audio/wav' });
    return { url: URL.createObjectURL(blob), duracaoMs: duracao * 1000 };
  } catch {
    return null;
  }
}

export interface OpcoesVoz {
  texto: string;
  voz?: Voz;
  velocidade?: number;
}

/**
 * Gera o MP3 da narração. Devolve a URL do blob (pronta para <audio>)
 * ou null quando nada funcionou.
 */
export async function gerarAudioVoz(op: OpcoesVoz): Promise<{ url: string; duracaoMs: number } | null> {
  const texto = op.texto.trim();
  if (!texto) return null;
  const voz = op.voz ?? lerVozEscolhida();
  const cfg = lerConfig();
  const velocidade = op.velocidade ?? cfg.voz?.velocidade ?? 1;

  try {
    const r = await chamarFuncao('ferramentas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        acao: 'voz',
        texto,
        idioma: voz.idioma,
        /* o motor usa o ID do catálogo: idioma + velocidade certos por voz */
        voz: cfg.voz?.provedor === 'elevenlabs' ? (voz.eleven ?? '') : voz.id,
        velocidade,
        provedor: cfg.voz?.provedor ?? 'google',
        chave: cfg.voz?.chave ?? '',
        urlTemplate: cfg.voz?.urlTemplate ?? '',
      }),
    });
    if (r.ok) {
      const blob = await r.blob();
      if (blob.size > 1000) {
        const cru = URL.createObjectURL(blob);
        /* timbre próprio de cada voz do catálogo (tom + ritmo) */
        const mudado = await transformarAudio(cru, voz.tom ?? 1, voz.ritmo ?? 1);
        if (mudado) return mudado;
        return { url: cru, duracaoMs: (await duracaoDoBlob(cru)) || 1200 };
      }
    }
  } catch {
    /* segue para o fallback */
  }

  // reserva: voz do próprio aparelho (não gera arquivo, só toca na hora)
  try {
    const synth = window.speechSynthesis;
    const falas = synth?.getVoices?.() ?? [];
    if (!falas.length) return null;
    const u = new SpeechSynthesisUtterance(texto.slice(0, 400));
    const achei = falas.find((f) => f.lang?.toLowerCase().startsWith(voz.idioma.slice(0, 2).toLowerCase()));
    if (achei) u.voice = achei;
    u.rate = velocidade;
    synth.speak(u);
    useUI.getState().toast('Voz tocando no aparelho (servidor indisponível) — não é arquivo.', 'warn');
    return null;
  } catch {
    return null;
  }
}

/** testa uma voz e toca na hora (botão “Ouvir teste” do painel) */
export async function testarVoz(texto = 'Olá! Esta é a voz escolhida para a sua narração.'): Promise<boolean> {
  const audio = await gerarAudioVoz({ texto });
  if (!audio) return false;
  const el = new Audio(audio.url);
  el.volume = 1;
  if (lerConfig().voz?.provedor !== 'elevenlabs') el.playbackRate = 1;
  await el.play().catch(() => undefined);
  return true;
}

export interface OpcoesInsercao {
  /** nome do clipe na timeline */
  nome?: string;
  /** onde começar (padrão: playhead) */
  inicioMs?: number;
  /** duração forçada (quando vem de um texto com tempo definido) */
  duracaoMs?: number;
}

/**
 * Cria o asset e coloca o clipe de áudio na trilha de áudio, no playhead
 * (ou no instante informado). Devolve o id do elemento criado.
 */
export async function inserirNarracao(
  audio: { url: string; duracaoMs: number },
  opc: OpcoesInsercao = {},
): Promise<string | null> {
  const ed = useEditor.getState();
  const nome = opc.nome ?? `Voz · ${new Date().toLocaleTimeString('pt-BR').slice(0, 5)}`;
  const duracao = opc.duracaoMs ?? audio.duracaoMs ?? 1000;

  const asset: MediaAsset = ed.addAsset({
    name: nome,
    kind: 'audio',
    url: audio.url,
    durationMs: duracao,
    origin: 'user',
  });

  const trilha = ed.trilhaPara('audio');
  if (!trilha) {
    useUI.getState().toast('Não encontrei trilha de áudio no projeto', 'err');
    return null;
  }

  const id = ed.addElement({
    type: 'audio',
    name: nome,
    trackId: trilha.id,
    start: opc.inicioMs ?? ed.playhead,
    duration: duracao,
    sourceIn: 0,
    assetId: asset.id,
    transform: {
      x: { base: 0, keyframes: [] },
      y: { base: 0, keyframes: [] },
      scale: { base: 1, keyframes: [] },
      rotation: { base: 0, keyframes: [] },
      opacity: { base: 1, keyframes: [] },
    },
    blend: 'normal',
    effects: [],
    volume: 1,
    locked: false,
    hidden: false,
    color: '#22d3ee',
  });

  useEditor.getState().select([id]);
  useUI.getState().toast(`Voz pronta: ${(duracao / 1000).toFixed(1)}s na trilha de áudio`, 'ok');
  return id;
}

/** atalho: texto → voz → timeline */
export async function narrarTexto(
  texto: string,
  opc: OpcoesInsercao & { voz?: Voz } = {},
): Promise<boolean> {
  if (!texto.trim()) {
    useUI.getState().toast('Escreva o texto da narração', 'warn');
    return false;
  }
  const audio = await gerarAudioVoz({ texto, voz: opc.voz });
  if (!audio) {
    useUI.getState().toast('Não consegui gerar a voz agora. Tente de novo.', 'err');
    return false;
  }
  const id = await inserirNarracao(audio, opc);
  return Boolean(id);
}
