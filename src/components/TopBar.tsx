import { useEffect, useRef } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';

interface Props {
  onImport: (files: FileList | File[]) => void;
}

export function TopBar({ onImport }: Props) {
  const { doc, renameProject, save, undo, redo, past, future, reset } = useEditor();
  const { openModal, user } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);

  // atalhos globais de topo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
      if (meta && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        openModal('export');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, openModal]);

  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">V</div>
        <div>
          <div className="brand-name">Vortex</div>
        </div>
        <span className="brand-tag">Beta</span>
      </div>

      <input
        className="proj-title"
        value={doc.name}
        onChange={(e) => renameProject(e.target.value)}
        spellCheck={false}
        title="Nome do projeto"
      />

      <button className="btn ghost icon" title="Desfazer (Ctrl+Z)" onClick={undo} disabled={!past.length}>
        ↶
      </button>
      <button className="btn ghost icon" title="Refazer (Ctrl+Shift+Z)" onClick={redo} disabled={!future.length}>
        ↷
      </button>

      <div style={{ width: 1, height: 22, background: 'var(--line)', margin: '0 2px' }} />

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.length) onImport(e.target.files);
          e.target.value = '';
        }}
      />
      <button className="btn" onClick={() => fileRef.current?.click()}>
        Importar
      </button>
      <button
        className="btn ghost"
        onClick={() => openModal('import')}
        title="Trazer imagem, vídeo ou áudio de qualquer site"
      >
        Baixar de site
      </button>
      <button className="btn ghost" onClick={() => openModal('xml')} title="Importar projeto .xml do Alight Motion">
        XML
      </button>
      <button className="btn ghost" onClick={() => openModal('packs')} title="Conteúdo e packs">
        Conteúdo
      </button>
      <button className="btn ghost" onClick={() => openModal('shortcuts')} title="Atalhos (?)">
        Atalhos
      </button>

      <button
        className="fs-btn"
        onClick={() => {
          const el = document.documentElement;
          if (document.fullscreenElement) void document.exitFullscreen();
          else void (el.requestFullscreen?.() ?? Promise.resolve());
        }}
        title="Tela cheia"
      >
        ⛶ <span className="lbl">Tela cheia</span>
      </button>

      <div className="spacer" />

      <button
        className="btn ghost"
        title="Salvar no navegador (Ctrl+S)"
        onClick={() => {
          save();
          useUI.getState().toast('Projeto salvo neste navegador', 'ok');
        }}
      >
        Salvar
      </button>
      <button
        className="btn ghost icon"
        title="Novo projeto"
        onClick={() => {
          if (confirm('Criar um novo projeto? O atual será perdido se não estiver salvo.')) {
            reset();
            useUI.getState().toast('Novo projeto criado');
          }
        }}
      >
        Novo
      </button>

      <button className="btn ghost" onClick={() => { location.hash = 'admin'; }} title="Painel administrativo">
        Admin
      </button>
      <button className="btn" onClick={() => openModal('account')} title="Conta e assinatura">
        {user && user.plan !== 'free' ? (
          <span className="pill paid">{user.plan.toUpperCase()}</span>
        ) : (
          <span className="pill free">FREE</span>
        )}
      </button>

      <button className="btn primary" onClick={() => openModal('export')}>
        Exportar
      </button>
    </div>
  );
}
