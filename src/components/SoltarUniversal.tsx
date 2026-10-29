import { useEffect, useRef, useState } from 'react';

/**
 * SELETOR GLOBAL DE ARQUIVOS + BANDEJA DE SOLTAR
 * ------------------------------------------------------------
 * Resolve o "arrastar e soltar" em qualquer aparelho:
 *
 *  • Desktop → arrasta arquivos do sistema para qualquer lugar da janela (DropGlobal cuida disso)
 *  • Celular → não existe arrastar do sistema; então a bandeja abaixo fica visível:
 *      "Arraste para cá" (área grande) ou "Escolher arquivos" (seletor do sistema)
 *    e os arquivos soltos/escolhidos vão para a biblioteca E para a timeline.
 *
 * A bandeja pode ser recolhida; o estado fica em localStorage.
 */

export function SoltarUniversal({ onArquivos }: { onArquivos: (arqs: File[]) => void }) {
  const [recolhida, setRecolhida] = useState(() => localStorage.getItem('vortex.bandeja') === 'oculta');
  const [sobre, setSobre] = useState(false);
  const [contagem, setContagem] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('vortex.bandeja', recolhida ? 'oculta' : 'aberta');
  }, [recolhida]);

  const receber = (files: FileList | null) => {
    if (!files?.length) return;
    const arqs = Array.from(files);
    setContagem((c) => c + arqs.length);
    onArquivos(arqs);
    setTimeout(() => setContagem(0), 2600);
  };

  if (recolhida) {
    return (
      <button className="bandeja-abrir" onClick={() => setRecolhida(false)} title="Abrir a área de soltar arquivos">
        ⤓ Soltar arquivos
      </button>
    );
  }

  return (
    <div className={`bandeja${sobre ? ' sobre' : ''}`}>
      <input
        ref={input}
        type="file"
        multiple
        accept="video/*,audio/*,image/*,.xml,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          receber(e.target.files);
          e.target.value = '';
        }}
      />
      <div
        className="bandeja-alvo"
        onDragOver={(e) => {
          e.preventDefault();
          setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobre(false);
          receber(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      >
        <span className="bandeja-ico">{contagem ? '✓' : '⤓'}</span>
        <span className="bandeja-txt">
          {contagem ? `${contagem} arquivo(s) na timeline` : 'Arraste arquivos para cá'}
          <small>vídeo · áudio · imagem · XML do Alight Motion</small>
        </span>
        <span className="bandeja-botao">Escolher arquivos</span>
      </div>
      <button className="bandeja-fechar" onClick={() => setRecolhida(true)} title="Recolher">
        ✕
      </button>
    </div>
  );
}
