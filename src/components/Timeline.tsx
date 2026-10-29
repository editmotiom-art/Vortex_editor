import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, snapPoints, snapValue } from '../store/editor';
import { fmtTime } from '../lib/anim';
import { useUI } from '../store/ui';
import type { Element } from '../types';

const RULER_H = 26;

function Clip({
  el,
  pxPerMs,
  selected,
  onPointerDown,
}: {
  el: Element;
  pxPerMs: number;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent, el: Element, mode: 'move' | 'trim-l' | 'trim-r') => void;
}) {
  const left = el.start * pxPerMs;
  const width = Math.max(4, el.duration * pxPerMs);
  const isAudio = el.type === 'audio';

  return (
    <div
      className={`clip ${selected ? 'selected' : ''}`}
      style={{
        left,
        width,
        background: isAudio
          ? `linear-gradient(180deg, ${el.color}, ${el.color}cc)`
          : `linear-gradient(180deg, ${el.color}, ${el.color}bb)`,
        opacity: el.hidden ? 0.35 : 1,
      }}
      onPointerDown={(e) => onPointerDown(e, el, 'move')}
      title={`${el.name} · ${fmtTime(el.duration)}`}
    >
      <div className="clip-label">{el.name}</div>
      <svg className="clip-wave" preserveAspectRatio="none" viewBox="0 0 100 20">
        {Array.from({ length: Math.min(80, Math.max(8, width / 4)) }).map((_, i, arr) => {
          const h = 3 + Math.abs(Math.sin((i + el.name.length) * 12.9898) * 14);
          const x = (i / arr.length) * 100;
          return <rect key={i} x={x} y={20 - h} width={100 / arr.length - 0.6} height={h} fill="rgba(0,0,0,.28)" />;
        })}
      </svg>
      <div className="clip-handle l" onPointerDown={(e) => onPointerDown(e, el, 'trim-l')} />
      <div className="clip-handle r" onPointerDown={(e) => onPointerDown(e, el, 'trim-r')} />
    </div>
  );
}

export function Timeline() {
  const {
    doc,
    playhead,
    zoom,
    setZoom,
    setPlayhead,
    selection,
    select,
    moveElement,
    trimElement,
    tool,
    setTool,
    snapping,
    setSnapping,
    addTrack,
    patchTrack,
    removeTrack,
    splitSelected,
    deleteSelected,
    duplicateSelected,
    addMarker,
    removeMarker,
    inPoint,
    outPoint,
    commit,
  } = useEditor();
  const toast = useUI((s) => s.toast);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    mode: 'move' | 'trim-l' | 'trim-r';
    startX: number;
    origStart: number;
    origDuration: number;
    origSourceIn: number;
    trackId: string;
  } | null>(null);

  const pxPerMs = zoom / 1000;
  const contentWidth = Math.max(900, (useEditor.getState().duration() + 20000) * pxPerMs);

  /* ---------- drag de clipes ---------- */
  const onClipPointerDown = useCallback(
    (e: React.PointerEvent, el: Element, mode: 'move' | 'trim-l' | 'trim-r') => {
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      select([el.id], e.shiftKey);
      if (tool === 'razor') {
        setPlayhead(el.start + (e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left) / pxPerMs);
        setTimeout(() => splitSelected(), 0);
        return;
      }
      commit();
      setDragState({
        id: el.id,
        mode,
        startX: e.clientX,
        origStart: el.start,
        origDuration: el.duration,
        origSourceIn: el.sourceIn,
        trackId: el.trackId,
      });
    },
    [pxPerMs, select, tool, commit, setPlayhead, splitSelected],
  );

  useEffect(() => {
    if (!dragState) return;
    const onMove = (ev: PointerEvent) => {
      const dxMs = (ev.clientX - dragState.startX) / pxPerMs;
      const points = snapPoints(doc, dragState.id);
      const threshold = 8 / pxPerMs;

      if (dragState.mode === 'move') {
        let next = dragState.origStart + dxMs;
        if (snapping) {
          const snappedStart = snapValue(next, points, threshold);
          const snappedEnd = snapValue(next + dragState.origDuration, points, threshold) - dragState.origDuration;
          next = Math.abs(snappedStart - next) < Math.abs(snappedEnd - next) ? snappedStart : snappedEnd;
        }
        moveElement(dragState.id, Math.max(0, Math.round(next)));
      } else if (dragState.mode === 'trim-l') {
        let next = dragState.origStart + dxMs;
        if (snapping) next = snapValue(next, points, threshold);
        next = Math.max(0, Math.min(dragState.origStart + dragState.origDuration - 100, next));
        trimElement(dragState.id, 'start', Math.round(next));
      } else {
        let next = dragState.origStart + dxMs;
        if (snapping) next = snapValue(next, points, threshold);
        trimElement(dragState.id, 'end', Math.round(Math.max(dragState.origStart + 100, next)));
      }
    };
    const onUp = () => setDragState(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragState, pxPerMs, doc, snapping, moveElement, trimElement]);

  /* ---------- drop da mídia na timeline ---------- */
  const onTrackDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/vortex-asset');
    if (!assetId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const start = Math.max(0, (e.clientX - rect.left) / pxPerMs);
    const fn = (window as unknown as Record<string, (a: string, t: string, s: number) => void>).__vortexAddMedia;
    fn?.(assetId, trackId, start);
  };

  const rulerTicks = (() => {
    const totalMs = contentWidth / pxPerMs;
    const targetPx = 90;
    const rawStep = targetPx / pxPerMs;
    const steps = [100, 250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000];
    const step = steps.find((s) => s >= rawStep) ?? 600000;
    const out: number[] = [];
    for (let t = 0; t <= totalMs; t += step) out.push(t);
    return { ticks: out, step };
  })();

  return (
    <div className="timeline-shell">
      <div className="tl-toolbar">
        <button className={`tl-tool ${tool === 'select' ? 'active' : ''}`} title="Seleção (V)" onClick={() => setTool('select')}>
          V
        </button>
        <button className={`tl-tool ${tool === 'razor' ? 'active' : ''}`} title="Faca / Cortar (C)" onClick={() => setTool('razor')}>
          C
        </button>
        <button className={`tl-tool ${tool === 'hand' ? 'active' : ''}`} title="Mover timeline (H)" onClick={() => setTool('hand')}>
          H
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--line)' }} />

        <button className="tl-tool" title="Dividir no playhead (S)" onClick={splitSelected}>
          S
        </button>
        <button className="tl-tool" title="Excluir (Del)" onClick={() => deleteSelected()}>
          ×
        </button>
        <button className="tl-tool" title="Duplicar (Ctrl+D)" onClick={duplicateSelected}>
          D
        </button>
        <button className="tl-tool" title="Marcador (M)" onClick={() => addMarker()}>
          M
        </button>

        <div style={{ width: 1, height: 18, background: 'var(--line)' }} />

        <button
          className={`chip ${snapping ? 'active' : ''}`}
          style={{ padding: '3px 8px' }}
          onClick={() => setSnapping(!snapping)}
          title="Ímã (snapping)"
        >
          Ímã
        </button>

        <div className="spacer" />

        <button className="btn ghost sm" onClick={() => addTrack('video')} title="Adicionar trilha de vídeo">
          + Vídeo
        </button>
        <button className="btn ghost sm" onClick={() => addTrack('audio')} title="Adicionar trilha de áudio">
          + Áudio
        </button>

        <span style={{ fontSize: 10, color: 'var(--txt-2)' }}>Zoom</span>
        <input
          className="tl-zoom"
          type="range"
          min={10}
          max={400}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--txt-2)', width: 34 }}>
          {zoom}px/s
        </span>
      </div>

      <div className="tl-body">
        {/* cabeçalhos das trilhas */}
        <div className="tl-heads">
          <div className="tl-ruler-pad">TRILHAS</div>
          {doc.tracks.map((t) => (
            <div key={t.id} className="tl-head" style={{ height: t.height }}>
              <span style={{ fontSize: 9, color: t.kind === 'audio' ? '#818cf8' : '#22d3ee' }}>
                {t.kind === 'audio' ? '♪' : '▣'}
              </span>
              <span className="tl-head-name">{t.name}</span>
              <button
                className={`head-btn ${t.muted ? 'on' : ''}`}
                title={t.muted ? 'Reativar áudio' : 'Silenciar trilha'}
                onClick={() => patchTrack(t.id, { muted: !t.muted })}
              >
                {t.muted ? 'M' : 'A'}
              </button>
              <button
                className={`head-btn ${t.hidden ? 'on' : ''}`}
                title={t.hidden ? 'Mostrar trilha' : 'Ocultar trilha'}
                onClick={() => patchTrack(t.id, { hidden: !t.hidden })}
              >
                {t.hidden ? '–' : 'O'}
              </button>
              <button className="head-btn" title="Remover trilha" onClick={() => removeTrack(t.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* área rolável */}
        <div className="tl-scroll" ref={scrollRef}>
          <div className="tl-content" style={{ width: contentWidth }}>
            {/* régua */}
            <div
              className="ruler"
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                const r = e.currentTarget.getBoundingClientRect();
                setPlayhead(Math.max(0, (e.clientX - r.left) / pxPerMs));
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) {
                  const r = e.currentTarget.getBoundingClientRect();
                  setPlayhead(Math.max(0, (e.clientX - r.left) / pxPerMs));
                }
              }}
              onDoubleClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                addMarker(`M${doc.markers.length + 1} @${fmtTime((e.clientX - r.left) / pxPerMs)}`);
              }}
            >
              {rulerTicks.ticks.map((t) => (
                <div key={t} className="ruler-tick" style={{ left: t * pxPerMs }}>
                  {fmtTime(t)}
                </div>
              ))}
              {inPoint !== null && outPoint !== null && (
                <div
                  className="inout-band"
                  style={{ left: Math.min(inPoint, outPoint) * pxPerMs, width: Math.abs(outPoint - inPoint) * pxPerMs }}
                />
              )}
              {doc.markers.map((m) => (
                <div
                  key={m.id}
                  className="marker-flag"
                  style={{ left: m.t * pxPerMs, background: m.color }}
                  title={`${m.label} — duplo clique para remover`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    removeMarker(m.id);
                  }}
                >
                  {m.label}
                </div>
              ))}
            </div>

            {/* trilhas */}
            {doc.tracks.map((t) => (
              <div
                key={t.id}
                className={`track-row ${t.kind}`}
                style={{ height: t.height }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onTrackDrop(e, t.id)}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) select([]);
                }}
              >
                {doc.elements
                  .filter((el) => el.trackId === t.id)
                  .map((el) => (
                    <Clip
                      key={el.id}
                      el={el}
                      pxPerMs={pxPerMs}
                      selected={selection.includes(el.id)}
                      onPointerDown={onClipPointerDown}
                    />
                  ))}
              </div>
            ))}

            {/* playhead */}
            <div className="playhead" style={{ left: playhead * pxPerMs }} />
          </div>
        </div>
      </div>
    </div>
  );
}
