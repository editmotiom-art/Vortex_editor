import { useEffect, useState } from 'react';
import { useUI } from '../store/ui';

/**
 * ARRASTAR E SOLTAR EM QUALQUER LUGAR
 * ------------------------------------------------------------
 * Soltar arquivos sobre o editor (computador) ou tocar para escolher
 * (celular) adiciona à aba Mídia — sem precisar achar o botão certo.
 * Aceita vídeo, áudio, imagem e .xml.
 */
export function DropGlobal({ onArquivos }: { onArquivos: (arquivos: File[]) => void }) {
  const [sobre, setSobre] = useState(false);
  const [contagem, setContagem] = useState(0);
  const toast = useUI((s) => s.toast);

  useEffect(() => {
    let profundidade = 0;

    const over = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return;
      e.preventDefault();
      profundidade += 1;
      setSobre(true);
    };
    const leave = (e: DragEvent) => {
      e.preventDefault();
      profundidade = Math.max(0, profundidade - 1);
      if (profundidade === 0) setSobre(false);
    };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault();
      profundidade = 0;
      setSobre(false);
      const arquivos = Array.from(e.dataTransfer.files);
      setContagem(arquivos.length);
      onArquivos(arquivos);
      setTimeout(() => setContagem(0), 2500);
    };
    const colar = (e: ClipboardEvent) => {
      const itens = e.clipboardData?.items;
      if (!itens) return;
      const arquivos: File[] = [];
      for (const item of Array.from(itens)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) arquivos.push(f);
        }
      }
      if (arquivos.length) {
        e.preventDefault();
        onArquivos(arquivos);
        toast(`${arquivos.length} arquivo(s) colados do clipboard`, 'ok');
      }
    };

    window.addEventListener('dragenter', over);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    window.addEventListener('paste', colar);
    return () => {
      window.removeEventListener('dragenter', over);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      window.removeEventListener('paste', colar);
    };
  }, [onArquivos, toast]);

  if (!sobre && !contagem) return null;

  return (
    <div className="drop-global">
      <div className="dg-caixa">
        <div className="dg-ico">⤓</div>
        <h3>{sobre ? 'Solte os arquivos aqui' : `${contagem} arquivo(s) recebido(s)`}</h3>
        <p>
          Vídeos, áudios, imagens e XMLs entram na aba <b>Mídia</b> e podem ir direto para a timeline.
        </p>
      </div>
    </div>
  );
}
