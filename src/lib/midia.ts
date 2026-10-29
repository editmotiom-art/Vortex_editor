/** utilidades de tipo de mídia compartilhadas entre os módulos de download */

export const ehAudio = (mime: string, nome: string): boolean =>
  mime.startsWith('audio') || /\.(mp3|wav|m4a|aac|ogg|opus|flac)(\?|#|$)/i.test(nome);

/** lê duração e dimensões de um blob URL (sem baixar tudo de novo) */
export async function probeMidia(
  url: string,
  kind: 'video' | 'audio' | 'image',
): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const fim = (v: { durationMs: number; width: number; height: number }) => resolve(v);
    if (kind === 'image') {
      const img = new Image();
      img.onload = () => fim({ durationMs: 5000, width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => fim({ durationMs: 5000, width: 0, height: 0 });
      img.src = url;
      setTimeout(() => fim({ durationMs: 5000, width: 0, height: 0 }), 6000);
      return;
    }
    const el = document.createElement(kind === 'audio' ? 'audio' : 'video');
    el.src = url;
    el.onloadedmetadata = () =>
      fim({
        durationMs: (el.duration || 0) * 1000,
        width: kind === 'video' ? (el as HTMLVideoElement).videoWidth : 0,
        height: kind === 'video' ? (el as HTMLVideoElement).videoHeight : 0,
      });
    el.onerror = () => fim({ durationMs: 0, width: 0, height: 0 });
    setTimeout(() => fim({ durationMs: 0, width: 0, height: 0 }), 6000);
  });
}
