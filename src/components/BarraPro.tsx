import { useState } from 'react';
import { useUI } from '../store/ui';
import { useEditor } from '../store/editor';
import {
  LOOKS_CINEMA,
  aplicarLookCinema,
  aplicarTransicao,
  congelarFrame,
  focoSuave,
  marcarKeyframe,
  rajadaZoom,
  separarAudio,
  type AssistenteTransicao,
} from '../lib/pro';

/**
 * BARRA PROFISSIONAL — fica embaixo do preview
 * Transições com duração, keyframes, câmera, cinema, congelar frame.
 */
export function BarraPro() {
  const { toast } = useUI();
  const selection = useEditor((s) => s.selection);
  const [painel, setPainel] = useState<'transicao' | 'cinema' | 'camera' | null>(null);
  const [dur, setDur] = useState(600);

  const botoes: [string, () => void, string][] = [
    ['Transição', () => setPainel(painel === 'transicao' ? null : 'transicao'), 'Entrada/saída com duração'],
    ['Cinema', () => setPainel(painel === 'cinema' ? null : 'cinema'), 'Looks de Hollywood em 1 clique'],
    ['Câmera', () => setPainel(painel === 'camera' ? null : 'camera'), 'Zoom in/out e punch'],
    ['Keyframe', () => marcarKeyframe('scale'), 'Marcar keyframe de escala'],
    ['Congelar', () => congelarFrame(), 'Congela o frame atual'],
    ['Separar áudio', () => separarAudio(), 'Áudio do vídeo em trilha própria'],
    ['Foco suave', () => focoSuave(), 'Profundidade de campo simulada'],
  ];

  return (
    <div className="barra-pro">
      <div className="bp-linha">
        {botoes.map(([nome, acao, dica]) => (
          <button key={nome} className="bp-btn" title={dica} onClick={acao}>
            {nome}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {selection.length === 0 && <span className="bp-dica">selecione um clipe</span>}
      </div>

      {painel === 'transicao' && (
        <div className="bp-painel">
          <label className="bp-dur">
            Duração
            <input
              type="range"
              min={200}
              max={3000}
              step={100}
              value={dur}
              onChange={(e) => setDur(Number(e.target.value))}
            />
            <b>{dur} ms</b>
          </label>
          {(
            [
              ['fade', 'Fade'],
              ['slide', 'Slide'],
              ['zoom', 'Zoom'],
              ['blur', 'Blur'],
              ['wipe', 'Wipe'],
            ] as [AssistenteTransicao['tipo'], string][]
          ).map(([tipo, nome]) => (
            <button
              key={tipo}
              className="bp-chip"
              onClick={() => {
                aplicarTransicao({ tipo, duracaoMs: dur });
              }}
            >
              {nome}
            </button>
          ))}
        </div>
      )}

      {painel === 'cinema' && (
        <div className="bp-painel">
          {LOOKS_CINEMA.map((l) => (
            <button key={l.id} className="bp-chip" onClick={() => aplicarLookCinema(l.id)} title={l.nome}>
              {l.nome}
            </button>
          ))}
        </div>
      )}

      {painel === 'camera' && (
        <div className="bp-painel">
          <button className="bp-chip" onClick={() => rajadaZoom('in')}>
            Zoom lento (in)
          </button>
          <button className="bp-chip" onClick={() => rajadaZoom('out')}>
            Zoom out
          </button>
          <button className="bp-chip" onClick={() => rajadaZoom('punch')}>
            Punch
          </button>
          <button
            className="bp-chip"
            onClick={() => {
              marcarKeyframe('rotation');
              toast('Keyframe de rotação marcado', 'ok');
            }}
          >
            Girar (keyframe)
          </button>
          <button
            className="bp-chip"
            onClick={() => {
              marcarKeyframe('opacity');
              toast('Keyframe de opacidade marcado', 'ok');
            }}
          >
            Opacidade (keyframe)
          </button>
        </div>
      )}
    </div>
  );
}
