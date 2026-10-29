import { useUI } from '../store/ui';
import { criarLegendas } from './pro';

/**
 * TRANSCRIÇÃO DE ÁUDIO → LEGENDAS
 * ------------------------------------------------------------
 * Usa o reconhecimento de fala do próprio navegador (Web Speech API),
 * que existe no Chrome/Edge/Safari recentes e não custa nada.
 *
 * Fluxo: toca o áudio do clipe selecionado em tempo real, captura o texto
 * reconhecido com o instante de cada trecho e cria um texto na timeline
 * para cada frase.
 */

interface FalaRec {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
}

interface ResultadoFala {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

const obterReconhecedor = (): (new () => FalaRec) | null => {
  const w = window as unknown as {
    SpeechRecognition?: new () => FalaRec;
    webkitSpeechRecognition?: new () => FalaRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const transcricaoDisponivel = (): boolean => obterReconhecedor() !== null;

export interface LinhaTranscricao {
  texto: string;
  inicioMs: number;
  fimMs: number;
}

/** transcreve uma URL de áudio/vídeo em tempo real */
export async function transcreverUrl(
  url: string,
  idioma = 'pt-BR',
  aoProgresso?: (parcial: string) => void,
): Promise<{ ok: boolean; linhas: LinhaTranscricao[]; erro?: string }> {
  const Ctor = obterReconhecedor();
  if (!Ctor) {
    return {
      ok: false,
      linhas: [],
      erro: 'Este navegador não tem reconhecimento de fala. Use Chrome, Edge ou Safari atualizado.',
    };
  }

  const audio = document.createElement('audio');
  audio.src = url;
  audio.crossOrigin = 'anonymous';
  await new Promise<void>((ok) => {
    audio.onloadedmetadata = () => ok();
    audio.onerror = () => ok();
    setTimeout(ok, 4000);
  });

  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = idioma;

  const linhas: LinhaTranscricao[] = [];
  let inicioBloco = 0;
  let ultimoTexto = '';

  const t0 = performance.now();
  const agora = () => performance.now() - t0;

  return new Promise((resolve) => {
    let encerrado = false;
    const finalizar = (erro?: string) => {
      if (encerrado) return;
      encerrado = true;
      try {
        rec.stop();
      } catch {
        /* já parado */
      }
      audio.pause();
      if (ultimoTexto.trim()) {
        linhas.push({ texto: ultimoTexto.trim(), inicioMs: inicioBloco, fimMs: agora() });
      }
      resolve({ ok: linhas.length > 0, linhas, erro });
    };

    rec.onresult = (ev) => {
      const r = ev as ResultadoFala;
      for (let i = r.resultIndex; i < r.results.length; i += 1) {
        const item = r.results[i];
        const texto = item[0].transcript;
        if (item.isFinal) {
          const inicio = linhas.length ? linhas[linhas.length - 1].fimMs : 0;
          linhas.push({ texto: texto.trim(), inicioMs: inicio, fimMs: agora() });
          ultimoTexto = '';
          inicioBloco = agora();
          aoProgresso?.(linhas.map((l) => l.texto).join(' '));
        } else {
          ultimoTexto = texto;
          aoProgresso?.(`${linhas.map((l) => l.texto).join(' ')} ${texto}`);
        }
      }
    };

    rec.onerror = (ev) => {
      const e = ev as { error?: string };
      finalizar(e.error === 'not-allowed' ? 'Permissão do microfone negada' : e.error);
    };

    rec.onend = () => finalizar();

    audio.onended = () => finalizar();

    try {
      rec.start();
      void audio.play();
    } catch (e) {
      finalizar((e as Error).message);
      return;
    }

    /* limite de segurança: 5 minutos */
    setTimeout(() => finalizar(), 300_000);
  });
}

/** transcreve e joga as legendas na timeline */
export async function transcreverParaTimeline(url: string, idioma = 'pt-BR'): Promise<void> {
  const ui = useUI.getState();
  ui.toast('Ouvindo o áudio para transcrever… mantenha o som ligado', 'default');
  const r = await transcreverUrl(url, idioma, (p) => ui.toast(p.slice(-60) || '…', 'default'));
  if (!r.ok) {
    ui.toast(`Transcrição: ${r.erro ?? 'nada reconhecido'}`, 'warn');
    return;
  }
  const n = criarLegendas(r.linhas);
  ui.toast(`${n} legenda(s) criadas na timeline`, 'ok');
}
