import { create } from 'zustand';
import type {
  Element,
  MediaAsset,
  ProjectDoc,
  Track,
  Marker,
  AnimProp,
  EffectType,
  Effect,
  Transform,
} from '../types';
import { uid, identityTransform, anim, PRESETS } from '../types';

const STORAGE_KEY = 'vortex.project.v1';
const HISTORY_LIMIT = 60;

/* ---------------- documento inicial ---------------- */
function makeTrack(name: string, kind: 'video' | 'audio'): Track {
  return { id: uid('trk'), name, kind, height: 52, muted: false, locked: false, hidden: false };
}

export function emptyProject(preset: keyof typeof PRESETS = 'reels'): ProjectDoc {
  const p = PRESETS[preset];
  const v1 = makeTrack('Vídeo 1', 'video');
  const v2 = makeTrack('Vídeo 2', 'video');
  const t1 = makeTrack('Texto 1', 'video');
  const a1 = makeTrack('Áudio 1', 'audio');
  const a2 = makeTrack('Áudio 2', 'audio');
  return {
    version: 1,
    id: uid('proj'),
    name: 'Projeto sem título',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: { width: p.w, height: p.h, fps: p.fps, sampleRate: 48000, background: '#000000' },
    tracks: [t1, v2, v1, a1, a2],
    elements: [],
    assets: [],
    markers: [],
  };
}

/* ---------------- store ---------------- */
type Tool = 'select' | 'razor' | 'hand';

interface EditorState {
  doc: ProjectDoc;
  /** assets cujo blob:URL precisa ser revogado ao remover */
  selection: string[];
  playhead: number;
  playing: boolean;
  loop: boolean;
  /** pixels por segundo */
  zoom: number;
  snapping: boolean;
  tool: Tool;
  inPoint: number | null;
  outPoint: number | null;
  past: string[];
  future: string[];

  /* ---- ações ---- */
  commit: () => void;
  undo: () => void;
  redo: () => void;

  setPlayhead: (ms: number) => void;
  setPlaying: (v: boolean) => void;
  setLoop: (v: boolean) => void;
  setZoom: (z: number) => void;
  setTool: (t: Tool) => void;
  setSnapping: (v: boolean) => void;
  setIn: (ms: number | null) => void;
  setOut: (ms: number | null) => void;

  select: (ids: string[], additive?: boolean) => void;
  renameProject: (n: string) => void;
  applyPreset: (p: keyof typeof PRESETS) => void;

  addAsset: (a: Omit<MediaAsset, 'id'>) => MediaAsset;
  updateAssetDuration: (id: string, durationMs: number) => void;
  removeAsset: (id: string) => void;

  addElement: (el: Omit<Element, 'id'>) => string;
  addText: (content?: string, at?: number) => string;
  addShape: (kind?: 'rect' | 'ellipse', at?: number) => string;
  updateElement: (id: string, patch: Partial<Element>, history?: boolean) => void;
  updateTransform: (id: string, key: keyof Transform, patch: Partial<AnimProp>) => void;
  setEffect: (id: string, type: EffectType, amount?: number) => void;
  removeEffect: (id: string, effectId: string) => void;
  patchEffect: (id: string, effectId: string, patch: Partial<Effect>) => void;
  toggleKeyframe: (id: string, key: keyof Transform) => void;
  clearKeyframes: (id: string, key: keyof Transform) => void;

  moveElement: (id: string, start: number, trackId?: string, history?: boolean) => void;
  trimElement: (id: string, edge: 'start' | 'end', ms: number, history?: boolean) => void;
  splitSelected: () => void;
  deleteSelected: (ripple?: boolean) => void;
  duplicateSelected: () => void;
  rippleDelete: () => void;

  addTrack: (kind: 'video' | 'audio') => void;
  removeTrack: (id: string) => void;
  patchTrack: (id: string, patch: Partial<Track>) => void;

  addMarker: (label?: string) => void;
  removeMarker: (id: string) => void;

  importarProjeto: (doc: ProjectDoc) => void;
  save: () => void;
  load: () => ProjectDoc | null;
  reset: () => void;
  duration: () => number;
}

const snapshot = (doc: ProjectDoc): string => JSON.stringify(doc);

export const useEditor = create<EditorState>((set, get) => ({
  doc: emptyProject(),
  selection: [],
  playhead: 0,
  playing: false,
  loop: true,
  zoom: 80,
  snapping: true,
  tool: 'select',
  inPoint: null,
  outPoint: null,
  past: [],
  future: [],

  commit: () =>
    set((s) => {
      const snap = snapshot(s.doc);
      const past = [...s.past, snap];
      if (past.length > HISTORY_LIMIT) past.shift();
      return { past, future: [] };
    }),

  undo: () =>
    set((s) => {
      if (!s.past.length) return s;
      const past = [...s.past];
      const prev = past.pop()!;
      return {
        doc: JSON.parse(prev) as ProjectDoc,
        past,
        future: [snapshot(s.doc), ...s.future].slice(0, HISTORY_LIMIT),
        selection: [],
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      return {
        doc: JSON.parse(next) as ProjectDoc,
        past: [...s.past, snapshot(s.doc)].slice(-HISTORY_LIMIT),
        future: rest,
        selection: [],
      };
    }),

  setPlayhead: (ms) => set({ playhead: Math.max(0, ms) }),
  setPlaying: (v) => set({ playing: v }),
  setLoop: (v) => set({ loop: v }),
  setZoom: (z) => set({ zoom: Math.min(400, Math.max(10, z)) }),
  setTool: (t) => set({ tool: t }),
  setSnapping: (v) => set({ snapping: v }),
  setIn: (ms) => set({ inPoint: ms }),
  setOut: (ms) => set({ outPoint: ms }),

  select: (ids, additive) =>
    set((s) => ({
      selection: additive ? [...new Set([...s.selection, ...ids])] : ids,
    })),

  renameProject: (n) => {
    get().commit();
    set((s) => ({ doc: { ...s.doc, name: n, updatedAt: Date.now() } }));
  },

  applyPreset: (p) => {
    get().commit();
    const preset = PRESETS[p];
    set((s) => ({
      doc: {
        ...s.doc,
        settings: { ...s.doc.settings, width: preset.w, height: preset.h, fps: preset.fps },
      },
    }));
  },

  addAsset: (a) => {
    const asset: MediaAsset = { ...a, id: uid('ast') };
    set((s) => ({ doc: { ...s.doc, assets: [...s.doc.assets, asset] } }));
    return asset;
  },

  updateAssetDuration: (id, durationMs) =>
    set((s) => ({
      doc: {
        ...s.doc,
        assets: s.doc.assets.map((a) => (a.id === id ? { ...a, durationMs } : a)),
      },
    })),

  removeAsset: (id) => {
    get().commit();
    set((s) => ({
      doc: {
        ...s.doc,
        assets: s.doc.assets.filter((a) => a.id !== id),
        elements: s.doc.elements.filter((e) => e.assetId !== id),
      },
    }));
  },

  addElement: (el) => {
    const st = get();
    const kind: 'video' | 'audio' = el.type === 'audio' ? 'audio' : 'video';
    const end = el.start + el.duration;
    const overlaps = (trackId: string, elements: Element[]) =>
      elements.some(
        (e) => e.trackId === trackId && e.start < end && e.start + e.duration > el.start,
      );

    // escolhe a trilha: a pedida, se livre; senão a primeira livre; senão cria
    let tracks = st.doc.tracks;
    let trackId = el.trackId;
    if (overlaps(trackId, st.doc.elements)) {
      const free = tracks.find((t) => t.kind === kind && !overlaps(t.id, st.doc.elements));
      if (free) {
        trackId = free.id;
      } else {
        const count = tracks.filter((t) => t.kind === kind).length + 1;
        const nt = makeTrack(`${kind === 'video' ? 'Vídeo' : 'Áudio'} ${count}`, kind);
        tracks = [nt, ...tracks];
        trackId = nt.id;
      }
    }

    const element: Element = { ...el, id: uid('el'), trackId };
    set((s) => ({
      doc: { ...s.doc, tracks, elements: [...s.doc.elements, element], updatedAt: Date.now() },
      selection: [element.id],
    }));
    return element.id;
  },

  addText: (content = 'Seu texto aqui', at) => {
    const playhead = at ?? get().playhead;
    const { doc } = get();
    const track = doc.tracks.find((t) => t.name.startsWith('Texto')) ?? doc.tracks.find((t) => t.kind === 'video')!;
    return get().addElement({
      type: 'text',
      name: content.slice(0, 24),
      trackId: track.id,
      start: playhead,
      duration: 3000,
      sourceIn: 0,
      assetId: null,
      transform: { ...identityTransform(), x: anim(doc.settings.width / 2), y: anim(doc.settings.height / 2) },
      blend: 'normal',
      effects: [],
      text: {
        content,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: Math.round(doc.settings.height * 0.075),
        fontWeight: 800,
        color: '#ffffff',
        align: 'center',
        strokeColor: '#000000',
        strokeWidth: 0,
        shadow: true,
        letterSpacing: 0,
        uppercase: true,
      },
      volume: 1,
      locked: false,
      hidden: false,
      color: '#22d3ee',
    });
  },

  addShape: (kind = 'rect', at) => {
    const playhead = at ?? get().playhead;
    const { doc } = get();
    const track = doc.tracks.find((t) => t.kind === 'video')!;
    return get().addElement({
      type: 'shape',
      name: kind === 'rect' ? 'Retângulo' : 'Elipse',
      trackId: track.id,
      start: playhead,
      duration: 3000,
      sourceIn: 0,
      assetId: null,
      transform: { ...identityTransform(), x: anim(doc.settings.width / 2), y: anim(doc.settings.height / 2) },
      blend: 'normal',
      effects: [],
      shape: { kind, fill: '#8b5cf6', radius: 12 },
      volume: 1,
      locked: false,
      hidden: false,
      color: '#a78bfa',
    });
  },

  updateElement: (id, patch, history = true) => {
    if (history) get().commit();
    set((s) => ({
      doc: {
        ...s.doc,
        updatedAt: Date.now(),
        elements: s.doc.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      },
    }));
  },

  updateTransform: (id, key, patch) => {
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) =>
          e.id === id ? { ...e, transform: { ...e.transform, [key]: { ...e.transform[key], ...patch } } } : e,
        ),
      },
    }));
  },

  setEffect: (id, type, amount) => {
    get().commit();
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) =>
          e.id === id
            ? { ...e, effects: [...e.effects, { id: uid('fx'), type, enabled: true, amount: amount ?? 1 }] }
            : e,
        ),
      },
    }));
  },

  removeEffect: (id, effectId) => {
    get().commit();
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) =>
          e.id === id ? { ...e, effects: e.effects.filter((f) => f.id !== effectId) } : e,
        ),
      },
    }));
  },

  patchEffect: (id, effectId, patch) =>
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) =>
          e.id === id
            ? { ...e, effects: e.effects.map((f) => (f.id === effectId ? { ...f, ...patch } : f)) }
            : e,
        ),
      },
    })),

  toggleKeyframe: (id, key) => {
    get().commit();
    const { doc, playhead } = get();
    const el = doc.elements.find((e) => e.id === id);
    if (!el) return;
    const rel = Math.max(0, playhead - el.start);
    const prop = el.transform[key];
    const existing = prop.keyframes.find((k) => Math.abs(k.t - rel) < 16);
    const current = existing ? existing.v : prop.base;

    const keyframes = existing
      ? prop.keyframes.filter((k) => k !== existing)
      : [...prop.keyframes, { t: rel, v: current, easing: 'easeInOut' as const }].sort((a, b) => a.t - b.t);

    get().updateTransform(id, key, { keyframes });
  },

  clearKeyframes: (id, key) => {
    get().commit();
    get().updateTransform(id, key, { keyframes: [] });
  },

  moveElement: (id, start, trackId, history = false) => {
    if (history) get().commit();
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) =>
          e.id === id ? { ...e, start: Math.max(0, start), trackId: trackId ?? e.trackId } : e,
        ),
      },
    }));
  },

  trimElement: (id, edge, ms, history = false) => {
    if (history) get().commit();
    set((s) => ({
      doc: {
        ...s.doc,
        elements: s.doc.elements.map((e) => {
          if (e.id !== id) return e;
          if (edge === 'start') {
            const delta = ms - e.start;
            return {
              ...e,
              start: Math.max(0, ms),
              duration: Math.max(100, e.duration - delta),
              sourceIn: Math.max(0, e.sourceIn + delta),
            };
          }
          return { ...e, duration: Math.max(100, ms - e.start) };
        }),
      },
    }));
  },

  splitSelected: () => {
    const { selection, playhead, doc } = get();
    if (!selection.length) return;
    get().commit();
    const newEls: Element[] = [];
    const kept: Element[] = [];
    for (const el of doc.elements) {
      if (!selection.includes(el.id)) {
        kept.push(el);
        continue;
      }
      const cut = playhead - el.start;
      if (cut <= 30 || cut >= el.duration - 30) {
        kept.push(el);
        continue;
      }
      const left: Element = { ...el, duration: cut };
      const right: Element = {
        ...el,
        id: uid('el'),
        start: playhead,
        duration: el.duration - cut,
        sourceIn: el.sourceIn + cut,
        name: `${el.name} (2)`,
      };
      kept.push(left, right);
      newEls.push(right);
    }
    set((s) => ({
      doc: { ...s.doc, elements: kept },
      selection: newEls.map((e) => e.id),
    }));
  },

  deleteSelected: (ripple = false) => {
    const { selection } = get();
    if (!selection.length) return;
    get().commit();
    set((s) => {
      const removed = s.doc.elements.filter((e) => selection.includes(e.id));
      let elements = s.doc.elements.filter((e) => !selection.includes(e.id));
      if (ripple) {
        for (const r of removed) {
          elements = elements.map((e) =>
            e.trackId === r.trackId && e.start > r.start ? { ...e, start: Math.max(0, e.start - r.duration) } : e,
          );
        }
      }
      return { doc: { ...s.doc, elements }, selection: [] };
    });
  },

  duplicateSelected: () => {
    const { selection, doc } = get();
    if (!selection.length) return;
    get().commit();
    const copies: Element[] = doc.elements
      .filter((e) => selection.includes(e.id))
      .map((e) => ({ ...e, id: uid('el'), start: e.start + e.duration, name: `${e.name} (cópia)` }));
    set((s) => ({
      doc: { ...s.doc, elements: [...s.doc.elements, ...copies] },
      selection: copies.map((c) => c.id),
    }));
  },

  rippleDelete: () => {
    const { selection, doc, playhead } = get();
    get().commit();
    if (selection.length) {
      get().deleteSelected(true);
      return;
    }
    // sem seleção: fecha o buraco no playhead
    set((s) => ({
      doc: {
        ...s.doc,
        elements: doc.elements.map((e) =>
          e.start === playhead ? { ...e, duration: Math.max(100, e.duration - 200) } : e,
        ),
      },
    }));
  },

  addTrack: (kind) => {
    get().commit();
    set((s) => {
      const count = s.doc.tracks.filter((t) => t.kind === kind).length + 1;
      const t = makeTrack(`${kind === 'video' ? 'Vídeo' : 'Áudio'} ${count}`, kind);
      return { doc: { ...s.doc, tracks: [t, ...s.doc.tracks] } };
    });
  },

  removeTrack: (id) => {
    get().commit();
    set((s) => ({
      doc: {
        ...s.doc,
        tracks: s.doc.tracks.filter((t) => t.id !== id),
        elements: s.doc.elements.filter((e) => e.trackId !== id),
      },
    }));
  },

  patchTrack: (id, patch) =>
    set((s) => ({
      doc: { ...s.doc, tracks: s.doc.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) },
    })),

  addMarker: (label) => {
    const { playhead } = get();
    const marker: Marker = { id: uid('mk'), t: playhead, label: label ?? `Marcador ${get().doc.markers.length + 1}`, color: '#fbbf24' };
    set((s) => ({ doc: { ...s.doc, markers: [...s.doc.markers, marker].sort((a, b) => a.t - b.t) } }));
  },

  removeMarker: (id) => set((s) => ({ doc: { ...s.doc, markers: s.doc.markers.filter((m) => m.id !== id) } })),

  importarProjeto: (doc) => {
    get().commit();
    set({ doc, selection: [], playhead: 0 });
    get().save();
  },

  save: () => {
    const doc = get().doc;
    try {
      // assets com blob: URL não sobrevivem ao reload — salva sem eles
      const safe: ProjectDoc = {
        ...doc,
        updatedAt: Date.now(),
        assets: doc.assets.filter((a) => !a.url.startsWith('blob:')),
        elements: doc.elements.filter((e) => {
          if (!e.assetId) return true;
          const a = doc.assets.find((x) => x.id === e.assetId);
          return !!a && !a.url.startsWith('blob:');
        }),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch (err) {
      console.error('Falha ao salvar', err);
    }
  },

  load: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const doc = JSON.parse(raw) as ProjectDoc;
      if (doc.version !== 1) return null;
      return doc;
    } catch {
      return null;
    }
  },

  reset: () => {
    get().commit();
    set({ doc: emptyProject(), selection: [], playhead: 0 });
  },

  duration: () => {
    const { doc } = get();
    return doc.elements.reduce((m, e) => Math.max(m, e.start + e.duration), 0);
  },
}));

/* ---------------- utilidades de snapping ---------------- */
export function snapPoints(doc: ProjectDoc, excludeId?: string): number[] {
  const pts = new Set<number>([0]);
  for (const e of doc.elements) {
    if (e.id === excludeId) continue;
    pts.add(e.start);
    pts.add(e.start + e.duration);
  }
  for (const m of doc.markers) pts.add(m.t);
  return [...pts].sort((a, b) => a - b);
}

export function snapValue(ms: number, points: number[], thresholdMs: number): number {
  let best = ms;
  let dist = thresholdMs;
  for (const p of points) {
    const d = Math.abs(p - ms);
    if (d < dist) {
      dist = d;
      best = p;
    }
  }
  return best;
}
