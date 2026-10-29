import type { ProjectDoc } from '../types';

/**
 * MIXER DE ÁUDIO (Web Audio API)
 * ------------------------------------------------------------
 * · gráfico de nós: source → gain → (master) → destination
 * · cada clipe de áudio/vídeo ganha seu nó, agendado pelo relógio do AudioContext
 * · usado no preview E no export (OfflineAudioContext renderiza o arquivo final)
 */

interface Voice {
  elId: string;
  src: AudioBufferSourceNode;
  gain: GainNode;
  startedAt: number;
  offset: number;
}

export class AudioMixer {
  ctx: AudioContext;
  master: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private voices: Voice[] = [];
  private decoding = new Set<string>();

  constructor() {
    type AudioCtor = typeof AudioContext;
    const Ctor: AudioCtor =
      (window as unknown as { AudioContext: AudioCtor; webkitAudioContext?: AudioCtor }).AudioContext ??
      (window as unknown as { webkitAudioContext: AudioCtor }).webkitAudioContext;
    this.ctx = new Ctor({ sampleRate: 48000 });
    this.master = this.ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.ctx.destination);
  }

  async unlock(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  setMasterGain(v: number): void {
    this.master.gain.value = v;
  }

  /** Decodifica e guarda o buffer de um asset (uma vez por asset) */
  async load(assetId: string, url: string): Promise<AudioBuffer | null> {
    if (this.buffers.has(assetId)) return this.buffers.get(assetId)!;
    if (this.decoding.has(assetId)) return null;
    this.decoding.add(assetId);
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(arr.slice(0));
      this.buffers.set(assetId, buf);
      return buf;
    } catch {
      return null;
    } finally {
      this.decoding.delete(assetId);
    }
  }

  has(assetId: string): boolean {
    return this.buffers.has(assetId);
  }

  /** Pré-carrega todos os assets de áudio/vídeo com áudio do documento */
  async preload(doc: ProjectDoc): Promise<void> {
    const ids = new Set<string>();
    for (const el of doc.elements) {
      if (!el.assetId) continue;
      if (el.type === 'audio' || el.type === 'video') ids.add(el.assetId);
    }
    await Promise.all(
      doc.assets
        .filter((a) => ids.has(a.id) && (a.kind === 'audio' || a.kind === 'video'))
        .map((a) => this.load(a.id, a.url)),
    );
  }

  /** Agenda todas as vozes a partir de um tempo do documento */
  start(doc: ProjectDoc, fromMs: number): void {
    this.stop();
    void this.unlock();
    const now = this.ctx.currentTime + 0.04;
    const mutedTracks = new Set(doc.tracks.filter((t) => t.muted).map((t) => t.id));

    for (const el of doc.elements) {
      if (!el.assetId) continue;
      if (el.type !== 'audio' && el.type !== 'video') continue;
      if (mutedTracks.has(el.trackId)) continue;
      if (el.hidden) continue;
      const buf = this.buffers.get(el.assetId);
      if (!buf) continue;

      const elEnd = el.start + el.duration;
      if (elEnd <= fromMs) continue;

      const when = now + Math.max(0, (el.start - fromMs) / 1000);
      const offset = (el.sourceIn + Math.max(0, fromMs - el.start)) / 1000;
      const dur = Math.min(buf.duration - offset, (elEnd - Math.max(fromMs, el.start)) / 1000);
      if (dur <= 0) continue;

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.value = el.volume;
      src.connect(gain).connect(this.master);
      try {
        src.start(when, offset, dur);
      } catch {
        continue;
      }
      this.voices.push({ elId: el.id, src, gain, startedAt: when, offset });
    }
  }

  stop(): void {
    for (const v of this.voices) {
      try {
        v.src.stop();
      } catch {
        /* já parado */
      }
      v.src.disconnect();
      v.gain.disconnect();
    }
    this.voices = [];
  }

  dispose(): void {
    this.stop();
    void this.ctx.close();
  }

  /** Renderiza a mixagem completa offline (usado no export) — retorna WAV */
  static async renderOfflineWav(doc: ProjectDoc, buffers: Map<string, AudioBuffer>, durationMs: number): Promise<Blob> {
    const sr = doc.settings.sampleRate || 48000;
    const durSec = Math.max(0.1, durationMs / 1000);
    const OfflineCtor =
      (window as unknown as { OfflineAudioContext: typeof OfflineAudioContext }).OfflineAudioContext;
    const off = new OfflineCtor(2, Math.ceil(sr * durSec), sr);
    const master = off.createGain();
    master.gain.value = 1;
    master.connect(off.destination);
    const mutedTracks = new Set(doc.tracks.filter((t) => t.muted).map((t) => t.id));

    for (const el of doc.elements) {
      if (!el.assetId) continue;
      if (el.type !== 'audio' && el.type !== 'video') continue;
      if (mutedTracks.has(el.trackId) || el.hidden) continue;
      const buf = buffers.get(el.assetId);
      if (!buf) continue;
      const src = off.createBufferSource();
      src.buffer = buf;
      const g = off.createGain();
      g.gain.value = el.volume;
      src.connect(g).connect(master);
      const offset = el.sourceIn / 1000;
      const dur = Math.min(buf.duration - offset, el.duration / 1000);
      if (dur <= 0) continue;
      try {
        src.start(el.start / 1000, offset, dur);
      } catch {
        /* ignore */
      }
    }

    const rendered = await off.startRendering();
    return encodeWav(rendered);
  }
}

/** Codifica AudioBuffer em WAV PCM 16-bit */
export function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const len = buffer.length;
  const sr = buffer.sampleRate;
  const bytes = 44 + len * numCh * 2;
  const ab = new ArrayBuffer(bytes);
  const view = new DataView(ab);
  const wStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(o + i, s.charCodeAt(i));
  };
  wStr(0, 'RIFF');
  view.setUint32(4, bytes - 8, true);
  wStr(8, 'WAVE');
  wStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  wStr(36, 'data');
  view.setUint32(40, len * numCh * 2, true);

  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c += 1) chans.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i += 1) {
    for (let c = 0; c < numCh; c += 1) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}
