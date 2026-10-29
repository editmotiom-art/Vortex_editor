import { useCallback, useEffect, useRef } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportModal, PacksModal, ShortcutsModal, AccountModal } from './components/Modals';
import { useEditor } from './store/editor';
import { useUI } from './store/ui';
import type { MediaAsset } from './types';

/** lê a duração de um arquivo de vídeo/áudio sem decodificar tudo */
function probeDuration(url: string, kind: 'video' | 'audio'): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve) => {
    if (kind === 'audio') {
      const a = document.createElement('audio');
      a.src = url;
      a.onloadedmetadata = () => resolve({ durationMs: (a.duration || 0) * 1000, width: 0, height: 0 });
      a.onerror = () => resolve({ durationMs: 0, width: 0, height: 0 });
      setTimeout(() => resolve({ durationMs: 0, width: 0, height: 0 }), 5000);
    } else {
      const v = document.createElement('video');
      v.src = url;
      v.onloadedmetadata = () => resolve({ durationMs: (v.duration || 0) * 1000, width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => resolve({ durationMs: 0, width: 0, height: 0 });
      setTimeout(() => resolve({ durationMs: 0, width: 0, height: 0 }), 5000);
    }
  });
}

export default function App() {
  const { addAsset, doc, setPlaying, playing, setPlayhead, selection, splitSelected, deleteSelected, duplicateSelected, undo, redo, addMarker, setTool, zoom, setZoom, save, setIn, setOut } =
    useEditor();
  const { modal, toasts, toast } = useUI();
  const loaded = useRef(false);

  /* ---------- importar arquivos ---------- */
  const importFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files);
      let n = 0;
      for (const f of arr) {
        const kind: MediaAsset['kind'] = f.type.startsWith('video')
          ? 'video'
          : f.type.startsWith('audio')
            ? 'audio'
            : f.type.startsWith('image')
              ? 'image'
              : 'image';
        if (!f.type.startsWith('video') && !f.type.startsWith('audio') && !f.type.startsWith('image')) {
          toast(`Formato não suportado: ${f.name}`, 'warn');
          continue;
        }
        const url = URL.createObjectURL(f);
        const meta = kind === 'image' ? { durationMs: 5000, width: 0, height: 0 } : await probeDuration(url, kind);
        addAsset({
          name: f.name,
          kind,
          url,
          durationMs: meta.durationMs,
          width: meta.width,
          height: meta.height,
          origin: 'user',
          sizeBytes: f.size,
        });
        n += 1;
      }
      if (n) toast(`${n} arquivo(s) importado(s) — estão na aba "Mídia"`, 'ok');
    },
    [addAsset, toast],
  );

  /* ---------- carrega projeto salvo no primeiro render ---------- */
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const saved = useEditor.getState().load();
    if (saved) {
      useEditor.setState({ doc: saved });
      toast('Projeto anterior restaurado', 'ok');
    }
  }, [toast]);

  /* ---------- autosave ---------- */
  useEffect(() => {
    const t = setInterval(() => useEditor.getState().save(), 20000);
    return () => clearInterval(t);
  }, []);

  /* ---------- atalhos ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      const meta = e.ctrlKey || e.metaKey;
      const st = useEditor.getState();

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        st.duplicateSelected();
        return;
      }
      if (meta && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        st.setZoom(st.zoom + 20);
        return;
      }
      if (meta && e.key === '-') {
        e.preventDefault();
        st.setZoom(st.zoom - 20);
        return;
      }
      if (typing) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          st.setPlaying(!st.playing);
          break;
        case 'delete':
        case 'backspace':
          e.preventDefault();
          st.deleteSelected(e.shiftKey);
          break;
        case 's':
          if (!meta) {
            e.preventDefault();
            st.splitSelected();
          }
          break;
        case 'v':
          st.setTool('select');
          break;
        case 'c':
          st.setTool('razor');
          break;
        case 'h':
          st.setTool('hand');
          break;
        case 'm':
          st.addMarker();
          break;
        case 'i':
          st.setIn(st.playhead);
          break;
        case 'o':
          st.setOut(st.playhead);
          break;
        case 'arrowleft':
          e.preventDefault();
          st.setPlayhead(Math.max(0, st.playhead - (e.shiftKey ? 1000 : 1000 / st.doc.settings.fps)));
          break;
        case 'arrowright':
          e.preventDefault();
          st.setPlayhead(st.playhead + (e.shiftKey ? 1000 : 1000 / st.doc.settings.fps));
          break;
        case 'home':
          st.setPlayhead(0);
          break;
        case 'end':
          st.setPlayhead(st.duration());
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- aviso ao fechar ---------- */
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      useEditor.getState().save();
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, []);

  // variáveis usadas apenas para o destructuring acima não quebrar o lint
  void playing;
  void selection;
  void splitSelected;
  void deleteSelected;
  void duplicateSelected;
  void undo;
  void redo;
  void addMarker;
  void setTool;
  void zoom;
  void setZoom;
  void save;
  void setIn;
  void setOut;
  void setPlayhead;
  void setPlaying;
  void doc;
  void setOut;

  return (
    <div className="app">
      <TopBar onImport={importFiles} />
      <div className="workspace">
        <Sidebar onImport={importFiles} />
        <main className="center">
          <Preview />
          <Timeline />
        </main>
        <Inspector />
      </div>

      {modal === 'export' && <ExportModal />}
      {modal === 'packs' && <PacksModal />}
      {modal === 'shortcuts' && <ShortcutsModal />}
      {modal === 'account' && <AccountModal />}

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'default' ? '' : t.tone}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
