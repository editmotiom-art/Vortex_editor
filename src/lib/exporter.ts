import type { ProjectDoc } from '../types';
import { renderFrame, MediaCache, docDuration } from './renderer';
import { AudioMixer, encodeWav } from './audio';

/**
 * EXPORTADOR
 * ------------------------------------------------------------
 * Usa Canvas + MediaRecorder (funciona em todos os browsers modernos).
 * Para o export definitivo (H.264 via WebCodecs, mais rápido e determinístico)
 * o mesmo `renderFrame` é usado — só troca o "sink".
 */

export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  /** Mbps */
  bitrate: number;
  includeAudio: boolean;
  format: 'webm' | 'mp4';
  onProgress?: (p: number, label: string) => void;
  signal?: AbortSignal;
}

export const EXPORT_PRESETS = [
  { id: 'reels1080', label: 'Reels 1080×1920', w: 1080, h: 1920, bitrate: 12 },
  { id: 'reels720', label: 'Reels 720×1280 (leve)', w: 720, h: 1280, bitrate: 6 },
  { id: 'yt1080', label: 'YouTube 1920×1080', w: 1920, h: 1080, bitrate: 16 },
  { id: 'yt720', label: 'YouTube 1280×720', w: 1280, h: 720, bitrate: 8 },
  { id: 'square', label: 'Quadrado 1080×1080', w: 1080, h: 1080, bitrate: 10 },
  { id: 'preview', label: 'Preview rápido 540×960', w: 540, h: 960, bitrate: 3 },
];

function pickMime(format: 'webm' | 'mp4'): string {
  const candidates =
    format === 'mp4'
      ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=h264', 'video/mp4']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

/** Exporta o projeto como vídeo (WebM/MP4) + áudio mixado */
export async function exportVideo(doc: ProjectDoc, opts: ExportOptions): Promise<Blob> {
  const total = Math.max(1000, docDuration(doc));
  const { width, height, fps } = opts;

  // 1) canvas de render
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D indisponível');

  // 2) áudio: pré-carrega e renderiza offline
  let audioUrl: string | null = null;
  if (opts.includeAudio) {
    opts.onProgress?.(2, 'Preparando áudio…');
    const mixer = new AudioMixer();
    await mixer.preload(doc);
    const buffers = new Map<string, AudioBuffer>();
    for (const a of doc.assets) {
      if (doc.elements.some((e) => e.assetId === a.id) && (a.kind === 'audio' || a.kind === 'video')) {
        const b = await mixer.load(a.id, a.url);
        if (b) buffers.set(a.id, b);
      }
    }
    mixer.dispose();
    if (buffers.size) {
      const wav = await AudioMixer.renderOfflineWav(doc, buffers, total);
      audioUrl = URL.createObjectURL(wav);
    }
  }

  // 3) stream do canvas + áudio
  const stream = canvas.captureStream(fps);
  if (audioUrl) {
    try {
      const actx = new AudioContext({ sampleRate: doc.settings.sampleRate });
      const res = await fetch(audioUrl);
      const buf = await actx.decodeAudioData(await res.arrayBuffer());
      const dest = actx.createMediaStreamDestination();
      const src = actx.createBufferSource();
      src.buffer = buf;
      src.connect(dest);
      src.start();
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      void actx.resume();
    } catch (e) {
      console.warn('Áudio não pôde ser anexado ao export', e);
    }
  }

  const mime = pickMime(opts.format);
  const rec = new MediaRecorder(stream, {
    mimeType: mime || undefined,
    videoBitsPerSecond: opts.bitrate * 1_000_000,
    audioBitsPerSecond: 192_000,
  });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const pool = new MediaCache();
  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime || 'video/webm' }));
    rec.onerror = (e) => reject(e);
  });

  // posiciona mídias no início
  pool.syncFor(doc, 0, false);
  await Promise.all(
    doc.assets.map(
      (a) =>
        new Promise<void>((res) => {
          if (a.kind === 'video') {
            const v = document.createElement('video');
            v.src = a.url;
            v.muted = true;
            v.oncanplay = () => res();
            v.onerror = () => res();
            setTimeout(res, 4000);
          } else if (a.kind === 'image') {
            const i = new Image();
            i.src = a.url;
            i.onload = () => res();
            i.onerror = () => res();
            setTimeout(res, 4000);
          } else res();
        }),
    ),
  );

  rec.start(200);
  const t0 = performance.now();
  const frameMs = 1000 / fps;

  const loop = async () => {
    for (let t = 0; t <= total; t += frameMs) {
      if (opts.signal?.aborted) {
        rec.stop();
        break;
      }
      pool.syncFor(doc, t, true);
      renderFrame(ctx, doc, t, { width, height, pool, timeMs: t });
      opts.onProgress?.(Math.min(98, 5 + (t / total) * 92), `Renderizando ${(t / 1000).toFixed(1)}s`);
      // pacing: mantém o relógio real para o MediaRecorder capturar os frames
      const target = t0 + t;
      const wait = target - performance.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, Math.min(wait, frameMs)));
      else await new Promise((r) => setTimeout(r, 0));
    }
    // último frame
    renderFrame(ctx, doc, total, { width, height, pool, timeMs: total });
    await new Promise((r) => setTimeout(r, 220));
    if (rec.state !== 'inactive') rec.stop();
  };

  void loop();
  const blob = await done;
  pool.dispose();
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  stream.getTracks().forEach((t) => t.stop());
  opts.onProgress?.(100, 'Concluído');
  return blob;
}

/** Exporta só o áudio mixado (WAV) */
export async function exportAudio(doc: ProjectDoc, onProgress?: (p: number, l: string) => void): Promise<Blob> {
  const total = Math.max(1000, docDuration(doc));
  onProgress?.(10, 'Carregando áudio…');
  const mixer = new AudioMixer();
  await mixer.preload(doc);
  const buffers = new Map<string, AudioBuffer>();
  for (const a of doc.assets) {
    const b = await mixer.load(a.id, a.url);
    if (b) buffers.set(a.id, b);
  }
  mixer.dispose();
  if (!buffers.size) throw new Error('Nenhum áudio no projeto. Importe um arquivo de áudio ou vídeo.');
  onProgress?.(45, 'Mixando…');
  const blob = await AudioMixer.renderOfflineWav(doc, buffers, total);
  onProgress?.(100, 'Concluído');
  return blob;
}

/** Exporta um frame do playhead em PNG */
export async function exportFrame(doc: ProjectDoc, timeMs: number, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  const pool = new MediaCache();
  pool.syncFor(doc, timeMs, false);
  await new Promise((r) => setTimeout(r, 120));
  renderFrame(ctx, doc, timeMs, { width, height, pool, timeMs });
  pool.dispose();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG'))), 'image/png'),
  );
}

/** Exporta o projeto em JSON (abre em qualquer máquina; mídia precisa relink) */
export function exportProjectJson(doc: ProjectDoc): Blob {
  const safe: ProjectDoc = {
    ...doc,
    assets: doc.assets.map((a) => ({ ...a, url: a.origin === 'user' ? '' : a.url })),
  };
  return new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' });
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// reexport para conveniência
export { encodeWav };
