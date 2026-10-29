import { useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/editor';
import { renderFrame, MediaCache, docDuration } from '../lib/renderer';
import { AudioMixer } from '../lib/audio';
import { SelectionLayer } from './SelectionLayer';
import { BarraPro } from './BarraPro';
import { fmtTime } from '../lib/anim';

export function Preview() {
  const { doc, playhead, playing, loop, setPlayhead, setPlaying, setLoop } = useEditor();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const poolRef = useRef<MediaCache | null>(null);
  const mixerRef = useRef<AudioMixer | null>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<{ wall: number; base: number }>({ wall: 0, base: 0 });
  const [scale, setScale] = useState(1);

  const total = docDuration(doc);

  /* pool + mixer */
  useEffect(() => {
    poolRef.current = new MediaCache();
    try {
      mixerRef.current = new AudioMixer();
    } catch {
      mixerRef.current = null;
    }
    return () => {
      poolRef.current?.dispose();
      mixerRef.current?.dispose();
    };
  }, []);

  /* pré-carrega áudio quando os assets mudam */
  useEffect(() => {
    if (!mixerRef.current) return;
    void mixerRef.current.preload(doc);
  }, [doc.assets, doc.elements.length]);

  /* redimensiona o canvas para caber no palco mantendo a proporção do projeto */
  useEffect(() => {
    const fit = () => {
      const shell = shellRef.current;
      if (!shell?.parentElement) return;
      const pw = shell.parentElement.clientWidth - 8;
      const ph = shell.parentElement.clientHeight - 8;
      const ar = doc.settings.width / doc.settings.height;
      let w = pw;
      let h = w / ar;
      if (h > ph) {
        h = ph;
        w = h * ar;
      }
      setScale(Math.max(0.1, w / doc.settings.width));
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (shellRef.current?.parentElement) ro.observe(shellRef.current.parentElement);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [doc.settings.width, doc.settings.height]);

  /* desenha o frame atual sempre que o playhead/doc muda */
  useEffect(() => {
    const c = canvasRef.current;
    const pool = poolRef.current;
    if (!c || !pool) return;
    const ctx = c.getContext('2d', { alpha: false });
    if (!ctx) return;
    // resolução de render do preview: limita a 1280 de largura por performance
    const W = Math.min(1280, doc.settings.width * 1);
    const H = Math.round((W / doc.settings.width) * doc.settings.height);
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    pool.syncFor(doc, playhead, playing);
    renderFrame(ctx, doc, playhead, { width: W, height: H, pool, timeMs: playhead });
  }, [doc, playhead, playing]);

  /* loop de playback */
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      poolRef.current?.pauseAll();
      mixerRef.current?.stop();
      return;
    }
    const mixer = mixerRef.current;
    void mixer?.unlock();
    startRef.current = { wall: performance.now(), base: playhead };
    mixer?.start(doc, playhead);

    const tick = () => {
      const { wall, base } = startRef.current;
      const t = base + (performance.now() - wall);
      if (t >= total) {
        if (loop && total > 0) {
          setPlayhead(0);
          startRef.current = { wall: performance.now(), base: 0 };
          mixer?.start(useEditor.getState().doc, 0);
        } else {
          setPlayhead(total);
          setPlaying(false);
          return;
        }
      } else {
        setPlayhead(t);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      mixer?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const scrubTo = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setPlayhead(p * (total || 1000));
  };

  return (
    <div className="preview-wrap">
      <div className="stage">
        <div
          ref={shellRef}
          className="canvas-shell"
          style={{ width: doc.settings.width * scale, height: doc.settings.height * scale }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%' }}
            onPointerDown={(ev) => {
              const shell = ev.currentTarget.getBoundingClientRect();
              const escala = shell.width / doc.settings.width;
              const px = (ev.clientX - shell.left) / escala;
              const py = (ev.clientY - shell.top) / escala;
              /* procura o elemento mais acima que contenha o ponto */
              const alvo = [...doc.elements]
                .reverse()
                .find((e) => {
                  if (e.type === 'audio' || e.hidden) return false;
                  if (playhead < e.start || playhead >= e.start + e.duration) return false;
                  const t = e.transform;
                  const rel = playhead - e.start;
                  const valueAt = (p: { base: number; keyframes: Array<{ t: number; v: number; easing: string }> }) => {
                    if (!p.keyframes.length) return p.base;
                    const ordenados = [...p.keyframes].sort((a, b) => a.t - b.t);
                    let v = ordenados[0].v;
                    for (const k of ordenados) if (k.t <= rel) v = k.v;
                    return v;
                  };
                  const cx = valueAt(t.x);
                  const cy = valueAt(t.y);
                  const larg = e.type === 'text' ? doc.settings.width * 0.6 : doc.settings.width * 0.5 * valueAt(t.scale);
                  const alt = e.type === 'text' ? doc.settings.height * 0.12 : doc.settings.height * 0.16 * valueAt(t.scale);
                  return Math.abs(px - cx) <= larg / 2 && Math.abs(py - cy) <= alt / 2;
                });
              useEditor.getState().select(alvo ? [alvo.id] : []);
            }}
          />
          <SelectionLayer />
          <div className="safe-area" />
          <div className="stage-badge">
            {doc.settings.width}×{doc.settings.height} · {doc.settings.fps}fps
          </div>
        </div>
      </div>

      <div className="transport">
        <button className="btn ghost icon" title="Início (Home)" onClick={() => setPlayhead(0)}>
          «
        </button>
        <button
          className="btn primary icon"
          title="Play/Pause (Espaço)"
          onClick={() => setPlaying(!playing)}
          style={{ width: 34, height: 30 }}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button className="btn ghost icon" title="Fim (End)" onClick={() => setPlayhead(total)}>
          »
        </button>
        <button
          className={`btn ghost icon ${loop ? 'primary' : ''}`}
          title="Repetir"
          onClick={() => setLoop(!loop)}
          style={loop ? { color: '#04121a' } : undefined}
        >
          ⟳
        </button>

        <span className="tc">{fmtTime(playhead, true, doc.settings.fps)}</span>
        <span className="tc-sep">/</span>
        <span className="tc-sep" style={{ fontSize: 11 }}>
          {fmtTime(total, true, doc.settings.fps)}
        </span>

        <div
          className="scrub"
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            scrubTo(e.clientX, e.currentTarget);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1) scrubTo(e.clientX, e.currentTarget);
          }}
        >
          <div className="scrub-fill" style={{ width: `${total ? (playhead / total) * 100 : 0}%` }} />
        </div>

        <button
          className="btn ghost sm"
          title="Marcar entrada (I)"
          onClick={() => useEditor.getState().setIn(playhead)}
        >
          I
        </button>
        <button
          className="btn ghost sm"
          title="Marcar saída (O)"
          onClick={() => useEditor.getState().setOut(playhead)}
        >
          O
        </button>
      </div>
      <BarraPro />
    </div>
  );
}
