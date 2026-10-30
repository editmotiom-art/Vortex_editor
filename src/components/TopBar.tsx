import { useEffect, useRef } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { BarraPlano, podeUsar } from './BarraPlano';

interface Props {
  onImport: (files: FileList | File[]) => void;
}

/**
 * PORTÃO DE PLANO
 * Não existe mais "plano grátis": todo mundo tem uma quantidade de HORAS
 * (definida pelo admin no cadastro). Enquanto houver horas, o editor inteiro
 * funciona; quando acaba, exportar, acervo e Baixa Tudo pedem renovação.
 * (O aviso em si vive em components/AvisoPlano.tsx, acionado pelo App.)
 */
const podeUsarPago = () => podeUsar();

/** abre o modal pedido ou avisa que é recurso do plano pago */
export const abrirComPlano = (modal: 'export' | 'packs' | 'baixatudo', recurso: string) => {
  const ui = useUI.getState();
  if (podeUsarPago()) {
    ui.openModal(modal);
    return;
  }
  ui.setPortao?.({ recurso, modal });
};

export function TopBar({ onImport }: Props) {
  const { doc, renameProject, save, undo, redo, past, future, reset } = useEditor();
  const { openModal, user, tema, setTema } = useUI();
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
        abrirComPlano('export', 'Exportar');
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
      <button className="btn ghost" onClick={() => openModal('xml')} title="Importar projeto .xml do Alight Motion">
        XML
      </button>
      <button
        className="btn primary"
        onClick={() => abrirComPlano('baixatudo', 'Baixar conteúdo')}
        title="Baixar conteúdo: link de vídeo (YouTube, Instagram, TikTok…), pasta do Drive ou página da web"
      >
        ⬇ Baixar conteúdo
      </button>
      <button
        className="btn ghost"
        onClick={() => openModal('extrair')}
        title="Contas e acervos do Drive: gerenciar pastas, varreduras e transcrição"
      >
        ⤓ Acervo
      </button>
      <button
        className="btn ghost"
        onClick={() => openModal('chatcriacao')}
        title="Criar por prompt: escolha a skill, anexe a referência do cliente e converse"
      >
        ✦ IA
      </button>
      <button
        className="btn ghost"
        onClick={() => openModal('transcricao')}
        title="Transcrever o áudio do vídeo, criar legendas e narrar com voz"
      >
        🎙 Legenda
      </button>
      <button className="btn ghost" onClick={() => abrirComPlano('packs', 'Acervo e packs')} title="Conteúdo e packs">
        Conteúdo
      </button>
      <button className="btn ghost" onClick={() => openModal('shortcuts')} title="Atalhos (?)">
        Atalhos
      </button>

      <button
        className="theme-btn"
        onClick={() => setTema(tema === 'claro' ? 'escuro' : 'claro')}
        title="Trocar entre tema claro e escuro"
      >
        {tema === 'claro' ? '☾ Escuro' : '☀ Claro'}
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
        {user && (user.papel === 'admin' || user.horasRestantes > 0) ? (
          <span className="pill paid">{user.plan === 'nenhum' ? 'SEM PLANO' : user.plan.toUpperCase()}</span>
        ) : (
          <span className="pill free">SEM HORAS</span>
        )}
      </button>
      <BarraPlano compacta />

      <button className="btn primary" onClick={() => abrirComPlano('export', 'Exportar')}>
        Exportar
      </button>
    </div>
  );
}
