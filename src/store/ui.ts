import { create } from 'zustand';

export type ModalId = 'export' | 'packs' | 'shortcuts' | 'account' | 'import' | null;

export interface Toast {
  id: string;
  msg: string;
  tone: 'default' | 'ok' | 'warn' | 'err';
}

interface UIState {
  modal: ModalId;
  toasts: Toast[];
  sidebarTab: 'library' | 'media' | 'packs';
  inspectorOpen: boolean;
  user: { name: string; plan: 'free' | 'pro'; avatar: string } | null;
  installedPacks: string[];

  openModal: (m: ModalId) => void;
  closeModal: () => void;
  toast: (msg: string, tone?: Toast['tone']) => void;
  dismiss: (id: string) => void;
  setSidebarTab: (t: UIState['sidebarTab']) => void;
  setUser: (u: UIState['user']) => void;
  installPack: (id: string) => void;
}

export const useUI = create<UIState>((set, get) => ({
  modal: null,
  toasts: [],
  sidebarTab: 'library',
  inspectorOpen: true,
  user: { name: 'Criador', plan: 'pro', avatar: 'C' },
  installedPacks: [],

  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: null }),

  toast: (msg, tone = 'default') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, msg, tone }] }));
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setSidebarTab: (t) => set({ sidebarTab: t }),
  setUser: (u) => set({ user: u }),
  installPack: (id) => {
    set((s) => ({ installedPacks: [...new Set([...s.installedPacks, id])] }));
    get().toast(`Pack "${id}" instalado — itens liberados na biblioteca`, 'ok');
  },
}));
