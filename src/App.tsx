import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { Inspector } from './components/Inspector';
import { Timeline } from './components/Timeline';
import { ExportModal, PacksModal, ShortcutsModal, AccountModal } from './components/Modals';
import { PainelCliente } from './components/PainelCliente';
import { Extrair } from './components/Extrair';
import { DropGlobal } from './components/DropGlobal';
import { SoltarUniversal } from './components/SoltarUniversal';
import { StudioIA } from './components/StudioIA';
import { ImportModal } from './components/ImportModal';
import { ImportarXML } from './components/ImportarXML';
import { Entrar } from './components/Entrar';
import { Landing } from './components/Landing';
import { sessaoAtual } from './lib/contas';
import { identityTransform } from './types';
import { Admin } from './components/Admin';
import { Checkout } from './components/Checkout';
import { lerConfig } from './lib/config';
import type { ImportedMedia } from './lib/importMedia';
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
  const { modal, toasts, toast, sessao, setSessao, openModal } = useUI();
  const selecao = useEditor((s) => s.selection);
  const loaded = useRef(false);
  const [rota, setRota] = useState<string>(() => location.hash.replace('#', ''));
  const [gaveta, setGaveta] = useState<'lib' | 'insp' | null>(null);

  /* ---------- no celular, selecionar abre as propriedades ---------- */
  const bloqueioInsp = useRef(0);
  useEffect(() => {
    if (Date.now() - bloqueioInsp.current < 900) return; // acabou de vir da biblioteca
    if (selecao.length > 0 && document.querySelector('.drawer-scrim') === null && window.innerWidth <= 900) {
      setGaveta('insp');
    }
  }, [selecao]);

  /* a biblioteca avisa quando aplicou algo → fecha a gaveta no celular */
  useEffect(() => {
    const fechar = () => {
      bloqueioInsp.current = Date.now();
      setGaveta(null);
    };
    window.addEventListener('vortex:fechar-gaveta', fechar);
    return () => window.removeEventListener('vortex:fechar-gaveta', fechar);
  }, []);

  /* aviso de girar: uma vez dispensado, não volta */
  useEffect(() => {
    if (localStorage.getItem('vortex.hintGirar')) {
      (document.querySelector('.rotate-hint') as HTMLElement | null)?.classList.add('oculto');
    }
  }, []);

  /* ---------- tema (claro/escuro) já aplicado no boot ---------- */
  useEffect(() => {
    const salvo = (localStorage.getItem('vortex.tema') as 'escuro' | 'claro') ?? 'claro';
    document.documentElement.setAttribute('data-theme', salvo === 'claro' ? 'light' : 'dark');
  }, []);

  /* ---------- landing é a porta de entrada; #planos leva direto aos planos ---------- */
  const [naEntrada, setNaEntrada] = useState(!localStorage.getItem('vortex.vistoLanding'));

  /* ---------- rota simples por hash (#admin) ---------- */
  useEffect(() => {
    const onHash = () => setRota(location.hash.replace('#', ''));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* ---------- sessão: garante o estado do usuário no boot ---------- */
  useEffect(() => {
    if (!sessao) {
      const s = sessaoAtual();
      if (s) setSessao(s);
    }
  }, [sessao, setSessao]);


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
        const asset = addAsset({
          name: f.name,
          kind,
          url,
          durationMs: meta.durationMs,
          width: meta.width,
          height: meta.height,
          origin: 'user',
          sizeBytes: f.size,
        });
        /* vai direto para a timeline: o usuário não fica com tela preta depois de dar play */
        const ed = useEditor.getState();
        const trilha = ed.trilhaPara(kind === 'audio' ? 'audio' : kind === 'image' ? 'image' : 'video');
        if (trilha) {
          ed.addElement({
            type: kind === 'audio' ? 'audio' : kind === 'image' ? 'image' : 'video',
            name: f.name,
            trackId: trilha.id,
            start: ed.playhead,
            duration: meta.durationMs > 0 ? meta.durationMs : 5000,
            sourceIn: 0,
            assetId: asset.id,
            transform: identityTransform(),
            blend: 'normal',
            effects: [],
            volume: 1,
            locked: false,
            hidden: false,
            color: kind === 'audio' ? '#818cf8' : kind === 'image' ? '#fbbf24' : '#22d3ee',
          });
        }
        n += 1;
      }
      if (n) {
        const st = useEditor.getState();
        const fim = st.doc.elements.reduce((m, e) => Math.max(m, e.start + e.duration), 0);
        toast(`${n} arquivo(s) na timeline — dê play ou arraste para ajustar`, 'ok');
        if (fim > st.playhead && st.playhead >= fim - 1) st.setPlayhead(0);
      }
    },
    [addAsset, toast],
  );

  /* XML solto em qualquer lugar: lê na hora e guarda na biblioteca (sem depender da aba XML estar aberta) */
  useEffect(() => {
    const receber = (ev: Event) => {
      const xmls = (ev as CustomEvent<File[]>).detail;
      if (!xmls?.length) return;
      void (async () => {
        const { importarLote, salvarLote } = await import('./lib/bibliotecaXML');
        const r = await importarLote(xmls, () => undefined);
        if (r.importados.length) await salvarLote(r.importados, () => undefined);
        useUI.getState().setSidebarTab('xml');
        toast(
          `${r.importados.length} template(s) de XML na biblioteca${r.erros.length ? ` · ${r.erros.length} inválido(s)` : ''}`,
          r.importados.length ? 'ok' : 'warn',
        );
      })();
    };
    window.addEventListener('vortex:xml-soltos', receber as EventListener);
    return () => window.removeEventListener('vortex:xml-soltos', receber as EventListener);
  }, [toast]);

  /* trilha de teste (usada pelos testes automatizados do export) */
  useEffect(() => {
    const w = window as unknown as { __vortexTeste: unknown; __vortexDoc: unknown };
    w.__vortexDoc = () => {
      const d = useEditor.getState().doc;
      return {
        settings: d.settings,
        tracks: d.tracks.map((t) => ({ id: t.id, kind: t.kind, name: t.name, hidden: t.hidden })),
        elements: d.elements.map((e) => ({
          id: e.id, type: e.type, name: e.name, trackId: e.trackId,
          start: e.start, duration: e.duration, x: e.transform.x.base, y: e.transform.y.base,
          scale: e.transform.scale.base,
        })),
      };
    };
    w.__vortexTeste = async (opts?: { video?: boolean; texto?: boolean; audio?: boolean }) => {
      const lig = { video: true, texto: true, audio: true, ...(opts ?? {}) };
      const ed = useEditor.getState();
      const lerDuracao = (url: string, kind: 'video' | 'audio') =>
        new Promise<number>((resolve) => {
          const m = document.createElement(kind);
          m.src = url;
          m.addEventListener('loadedmetadata', () => resolve(Math.round((m.duration || 0) * 1000)));
          m.addEventListener('error', () => resolve(0));
        });
      const vUrl = '/midia/clipe.webm';
      const aUrl = '/midia/musica.mp3';
      const vDur = await lerDuracao(vUrl, 'video');
      const aDur = await lerDuracao(aUrl, 'audio');
      const v = ed.addAsset({ name: 'clipe.webm', kind: 'video', url: vUrl, durationMs: vDur || 6000, origin: 'user' });
      const a = ed.addAsset({ name: 'musica.mp3', kind: 'audio', url: aUrl, durationMs: aDur || 8000, origin: 'user' });
      const tv = useEditor.getState().trilhaPara('video')!;
      const ta = useEditor.getState().trilhaPara('audio')!;
      if (lig.video) useEditor.getState().addElement({
        type: 'video',
        name: 'clipe.webm',
        trackId: tv.id,
        start: 0,
        duration: 3000,
        sourceIn: 0,
        assetId: v.id,
        transform: identityTransform(),
        blend: 'normal',
        effects: [],
        volume: 1,
        locked: false,
        hidden: false,
        color: '#22d3ee',
      });
      if (lig.texto) useEditor.getState().addElement({
        type: 'text',
        name: 'Título de teste',
        trackId: tv.id,
        start: 0,
        duration: 2000,
        sourceIn: 0,
        transform: identityTransform(),
        blend: 'normal',
        effects: [],
        text: {
          content: 'VORTEX',
          fontFamily: 'Inter, sans-serif',
          fontSize: 120,
          fontWeight: 900,
          color: '#ffffff',
          align: 'center',
          strokeColor: '#000000',
          strokeWidth: 0,
          shadow: true,
          letterSpacing: 2,
          uppercase: true,
        },
        volume: 1,
        locked: false,
        hidden: false,
        color: '#f472b6',
      });
      if (lig.audio) useEditor.getState().addElement({
        type: 'audio',
        name: 'musica.mp3',
        trackId: ta.id,
        start: 0,
        duration: 3000,
        sourceIn: 0,
        assetId: a.id,
        transform: identityTransform(),
        blend: 'normal',
        effects: [],
        volume: 0.8,
        locked: false,
        hidden: false,
        color: '#34d399',
      });
      useEditor.getState().setPlayhead(0);
      return { vDur, aDur, assets: useEditor.getState().doc.assets.length, elements: useEditor.getState().doc.elements.length };
    };
  }, []);

  /* assets disponíveis para a transcrição */
  const todosAssets = useEditor((s) => s.doc.assets);
  useEffect(() => {
    (window as unknown as { __vortexAssets?: unknown }).__vortexAssets = todosAssets;
  }, [todosAssets]);

  /* ---------- ações em massa na mídia ---------- */
  const adicionarTodaMidia = useCallback(() => {
    const ed = useEditor.getState();
    const trilha = ed.trilhaPara('video');
    const trilhaAudio = ed.trilhaPara('audio');
    let t = ed.playhead;
    let n = 0;
    for (const a of ed.doc.assets) {
      const ehAudio = a.kind === 'audio';
      const destino = ehAudio ? trilhaAudio : trilha;
      if (!destino) continue;
      const dur = a.durationMs > 0 ? a.durationMs : 5000;
      ed.addElement({
        type: ehAudio ? 'audio' : a.kind === 'image' ? 'image' : 'video',
        name: a.name,
        trackId: destino.id,
        start: t,
        duration: dur,
        sourceIn: 0,
        assetId: a.id,
        transform: {
          ...identityTransform(),
          x: { base: ed.doc.settings.width / 2, keyframes: [] },
          y: { base: ed.doc.settings.height / 2, keyframes: [] },
        },
        blend: 'normal',
        effects: [],
        volume: 1,
        locked: false,
        hidden: false,
        color: ehAudio ? '#818cf8' : '#22d3ee',
      });
      if (!ehAudio) t += dur;
      n += 1;
    }
    toast(n ? `${n} mídia(s) colocadas na timeline em sequência` : 'Nenhuma mídia para adicionar', n ? 'ok' : 'warn');
  }, [toast]);

  const limparMidia = useCallback(() => {
    const ed = useEditor.getState();
    const ids = ed.doc.assets.map((a) => a.id);
    ids.forEach((id) => useEditor.getState().removeAsset(id));
    toast(`${ids.length} mídia(s) removidas do projeto`, 'default');
  }, [toast]);

  /* ---------- importação remota (extensão / link) ---------- */
  const importRemote = useCallback(
    (medias: ImportedMedia[]) => {
      for (const m of medias) {
        addAsset({
          name: m.name,
          kind: m.kind,
          url: m.url,
          durationMs: m.durationMs,
          width: m.width,
          height: m.height,
          origin: 'user',
          sizeBytes: m.sizeBytes,
        });
      }
    },
    [addAsset],
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

  /* ---------- painel administrativo ---------- */
  if (rota === 'admin') {
    return <Admin onSair={() => { location.hash = ''; setRota(''); }} />;
  }

  /* ---------- não logado: página de vendas → entrada ---------- */
  if (!sessao) {
    const marcarEntrada = () => localStorage.setItem('vortex.vistoLanding', '1');
    if (naEntrada) {
      return (
        <Landing
          onCriar={() => {
            marcarEntrada();
            setNaEntrada(false);
          }}
          onEntrar={() => {
            marcarEntrada();
            setNaEntrada(false);
          }}
        />
      );
    }
    return (
      <Entrar
        onEntrar={(s) => {
          setSessao(s);
          toast(`Bem-vindo, ${s.nome.split(' ')[0]}!`, 'ok');
        }}
        onVoltar={() => setNaEntrada(true)}
      />
    );
  }

  return (
    <div className="app">
      <TopBar onImport={importFiles} />
      {/* alternador de gavetas: garante biblioteca/inspetor acessíveis em qualquer largura.
          Fica visível só em telas estreitas (CSS). */}
      <div className="gaveta-switch">
        <button
          className={gaveta === 'lib' ? 'active' : ''}
          onClick={() => setGaveta(gaveta === 'lib' ? null : 'lib')}
          title="Biblioteca e mídia"
        >
          ☰ Biblioteca
        </button>
        <button
          className={gaveta === 'insp' ? 'active' : ''}
          onClick={() => setGaveta(gaveta === 'insp' ? null : 'insp')}
          title="Propriedades do clipe"
        >
          ⚙ Propriedades
        </button>
        <button onClick={() => openModal('export')} title="Exportar">
          ⤒ Exportar
        </button>
      </div>

      <SoltarUniversal
        onArquivos={(arqs) => {
          const xmls = arqs.filter((f) => /\.xml$/i.test(f.name));
          const midias = arqs.filter((f) => !/\.xml$/i.test(f.name));
          if (midias.length) void importFiles(midias);
          if (xmls.length) {
            window.dispatchEvent(new CustomEvent('vortex:xml-soltos', { detail: xmls }));
            toast(`${xmls.length} XML(s) — abra a aba XML da biblioteca`, 'default');
          }
        }}
      />

      <DropGlobal
        onArquivos={(arqs) => {
          const xmls = arqs.filter((f) => /\.xml$/i.test(f.name));
          const midias = arqs.filter((f) => !/\.xml$/i.test(f.name));
          if (midias.length) void importFiles(midias);
          if (xmls.length) {
            /* XML solto: manda para a biblioteca de templates */
            window.dispatchEvent(new CustomEvent('vortex:xml-soltos', { detail: xmls }));
            toast(`${xmls.length} XML(s) recebidos — abra a aba XML para adicionar`, 'default');
          }
        }}
      />

      <div className="workspace">
        <Sidebar onImport={importFiles} onAdicionarTudo={adicionarTodaMidia} onLimparMidia={limparMidia} mobileOpen={gaveta === 'lib'} />
        <main className="center">
          <Preview />
          <Timeline />
        </main>
        <Inspector mobileOpen={gaveta === 'insp'} />
      </div>

      {gaveta && <div className="drawer-scrim" onClick={() => setGaveta(null)} />}

      {/* barra inferior do celular */}
      <nav className="mobile-dock">
        <button className={`dock-btn${gaveta === 'lib' ? ' active' : ''}`} onClick={() => setGaveta(gaveta === 'lib' ? null : 'lib')}>
          <span className="ico">▤</span>
          Mídia
        </button>
        <button className="dock-btn" onClick={() => useEditor.getState().setPlaying(!useEditor.getState().playing)}>
          <span className="ico">{playing ? '❚❚' : '▶'}</span>
          Play
        </button>
        <button className="dock-btn" onClick={() => openModal('import')}>
          <span className="ico">↓</span>
          Baixar
        </button>
        <button className={`dock-btn${gaveta === 'insp' ? ' active' : ''}`} onClick={() => setGaveta(gaveta === 'insp' ? null : 'insp')}>
          <span className="ico">⚙</span>
          Ajustes
        </button>
        <button className="dock-btn" onClick={() => openModal('export')}>
          <span className="ico">⤒</span>
          Exportar
        </button>
      </nav>

      {/* aviso de girar o celular */}
      <div className="rotate-hint">
        <div className="ph" />
        <h3>Gire o celular</h3>
        <p>O editor funciona melhor na horizontal, com mais espaço para a timeline.</p>
        <button
          onClick={() => {
            localStorage.setItem('vortex.hintGirar', 'ok');
            (document.querySelector('.rotate-hint') as HTMLElement | null)?.classList.add('oculto');
          }}
        >
          Continuar assim
        </button>
      </div>

      {modal === 'export' && <ExportModal />}
      {modal === 'import' && <ImportModal onImported={importRemote} />}
      {modal === 'packs' && <PacksModal />}
      {modal === 'shortcuts' && <ShortcutsModal />}
      {modal === 'account' && <PainelCliente onSair={() => { setSessao(null); setGaveta(null); }} />}
      {modal === 'checkout' && <Checkout />}
      {modal === 'xml' && <ImportarXML />}
      {modal === 'studio' && (
        <div className="overlay" onClick={() => useUI.getState().closeModal()}>
          <div className="modal" style={{ width: 'min(680px,100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">✦ Estúdio de IA</div>
              <div className="spacer" />
              <button className="btn ghost icon" onClick={() => useUI.getState().closeModal()}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <StudioIA aoFechar={() => useUI.getState().closeModal()} />
            </div>
          </div>
        </div>
      )}
      {modal === 'extrair' && (
        <div className="overlay" onClick={() => useUI.getState().closeModal()}>
          <div className="modal" style={{ width: 'min(860px,100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">Extrair conteúdo</div>
              <div className="spacer" />
              <button className="btn ghost icon" onClick={() => useUI.getState().closeModal()}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <Extrair />
            </div>
          </div>
        </div>
      )}

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
