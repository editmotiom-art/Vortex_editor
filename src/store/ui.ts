import { create } from 'zustand';
import { sessaoAtual, type Plano, type Sessao } from '../lib/contas';

export type ModalId = 'export' | 'packs' | 'shortcuts' | 'account' | 'import' | 'checkout' | 'ia' | 'xml' | 'cliente' | 'extrair' | 'studio' | 'baixatudo' | 'transcricao' | 'chatcriacao' | null;

export interface Toast {
  id: string;
  msg: string;
  tone: 'default' | 'ok' | 'warn' | 'err';
}

interface UIState {
  modal: ModalId;
  toasts: Toast[];
  sidebarTab: 'library' | 'media' | 'packs' | 'xml';
  tema: 'escuro' | 'claro';
  inspectorOpen: boolean;
  user: { name: string; plan: Plano; avatar: string; email?: string; horasRestantes: number; papel: 'cliente' | 'admin' } | null;
  sessao: Sessao | null;
  installedPacks: string[];

  openModal: (m: ModalId) => void;
  /** portão de plano: recurso pago pedido no plano Free (App mostra o aviso) */
  portao: { recurso: string; detalhe?: string; modal?: ModalId } | null;
  setPortao: (p: { recurso: string; detalhe?: string; modal?: ModalId } | null) => void;
  closeModal: () => void;
  toast: (msg: string, tone?: Toast['tone']) => void;
  dismiss: (id: string) => void;
  setSidebarTab: (t: UIState['sidebarTab']) => void;
  setTema: (t: 'escuro' | 'claro') => void;
  setUser: (u: UIState['user']) => void;
  setSessao: (s: Sessao | null) => void;
  installPack: (id: string) => void;
}

const sessaoInicial = sessaoAtual();

export const useUI = create<UIState>((set, get) => ({
  modal: null,
  toasts: [],
  sidebarTab: 'library',
  tema: (localStorage.getItem('vortex.tema') as 'escuro' | 'claro') ?? 'claro',
  inspectorOpen: true,
  user: sessaoInicial
    ? {
        name: sessaoInicial.nome,
        plan: sessaoInicial.plano,
        avatar: (sessaoInicial.nome[0] ?? 'V').toUpperCase(),
        email: sessaoInicial.email,
        horasRestantes: sessaoInicial.horasRestantes,
        papel: sessaoInicial.papel,
      }
    : null,
  sessao: sessaoInicial,
  installedPacks: [],

  portao: null,
  setPortao: (portao) => set({ portao }),
  openModal: (m) => set({ modal: m }),
  closeModal: () => set({ modal: null }),

  toast: (msg, tone = 'default') => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, msg, tone }] }));
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setSidebarTab: (t) => set({ sidebarTab: t }),

  setTema: (t) => {
    localStorage.setItem('vortex.tema', t);
    document.documentElement.setAttribute('data-theme', t === 'claro' ? 'light' : 'dark');
    set({ tema: t });
  },
  setUser: (u) => set({ user: u }),
  setSessao: (s) =>
    set({
      sessao: s,
      user: s
        ? {
            name: s.nome,
            plan: s.plano,
            avatar: (s.nome[0] ?? 'V').toUpperCase(),
            email: s.email,
            horasRestantes: s.horasRestantes,
            papel: s.papel,
          }
        : null,
    }),
  installPack: (id) => {
    set((s) => ({ installedPacks: [...new Set([...s.installedPacks, id])] }));
    get().toast(`Pack "${id}" instalado — itens liberados na biblioteca`, 'ok');
  },
}));
