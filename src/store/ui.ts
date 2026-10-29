import { create } from 'zustand';
import { sessaoAtual, type Sessao } from '../lib/contas';

export type ModalId = 'export' | 'packs' | 'shortcuts' | 'account' | 'import' | 'checkout' | 'ia' | 'xml' | null;

export interface Toast {
  id: string;
  msg: string;
  tone: 'default' | 'ok' | 'warn' | 'err';
}

interface UIState {
  modal: ModalId;
  toasts: Toast[];
  sidebarTab: 'library' | 'media' | 'packs' | 'xml';
  inspectorOpen: boolean;
  user: { name: string; plan: 'free' | 'pro' | 'studio'; avatar: string } | null;
  sessao: Sessao | null;
  installedPacks: string[];

  openModal: (m: ModalId) => void;
  closeModal: () => void;
  toast: (msg: string, tone?: Toast['tone']) => void;
  dismiss: (id: string) => void;
  setSidebarTab: (t: UIState['sidebarTab']) => void;
  setUser: (u: UIState['user']) => void;
  setSessao: (s: Sessao | null) => void;
  installPack: (id: string) => void;
}

const sessaoInicial = sessaoAtual();

export const useUI = create<UIState>((set, get) => ({
  modal: null,
  toasts: [],
  sidebarTab: 'library',
  inspectorOpen: true,
  user: sessaoInicial
    ? { name: sessaoInicial.nome, plan: sessaoInicial.plano, avatar: (sessaoInicial.nome[0] ?? 'V').toUpperCase() }
    : null,
  sessao: sessaoInicial,
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
  setSessao: (s) =>
    set({
      sessao: s,
      user: s ? { name: s.nome, plan: s.plano, avatar: (s.nome[0] ?? 'V').toUpperCase() } : null,
    }),
  installPack: (id) => {
    set((s) => ({ installedPacks: [...new Set([...s.installedPacks, id])] }));
    get().toast(`Pack "${id}" instalado — itens liberados na biblioteca`, 'ok');
  },
}));
