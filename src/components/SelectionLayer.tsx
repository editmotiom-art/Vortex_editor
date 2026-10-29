import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from '../store/editor';
import { valueAt } from '../lib/anim';

/**
 * MANIPULAÇÃO DIRETA NA TELA
 * ------------------------------------------------------------
 * Permite arrastar, girar e redimensionar o elemento selecionado
 * direto sobre o preview — com mouse ou dedo.
 *
 *  · arrastar o corpo  → move X/Y
 *  · alça de canto     → escala proporcional
 *  · alça de topo      → gira
 *
 * As coordenadas são convertidas para o espaço do documento
 * (doc.settings), então funciona igual em qualquer zoom de tela.
 */
export function SelectionLayer() {
  const { doc, selection, playhead, updateTransform, select } = useEditor();
  const [caixa, setCaixa] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const arrasto = useRef<{
    modo: 'mover' | 'escalar' | 'girar';
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    baseScale: number;
    baseRot: number;
    centroX: number;
    centroY: number;
    anguloInicial: number;
  } | null>(null);

  const el = doc.elements.find((e) => e.id === selection[0]);
  const visivel =
    !!el && playhead >= el.start && playhead < el.start + el.duration && !el.hidden && el.type !== 'audio';

  /* ---------- calcula a caixa do elemento na tela ---------- */
  const medir = useCallback(() => {
    if (!el || !visivel) {
      setCaixa(null);
      return;
    }
    const shell = document.querySelector('.canvas-shell') as HTMLElement | null;
    if (!shell) return;
    const shellBox = shell.getBoundingClientRect();
    const escalaTela = shellBox.width / doc.settings.width;
    const rel = playhead - el.start;

    /* tamanho lógico do elemento */
    let larg = doc.settings.width * 0.5;
    let alt = doc.settings.height * 0.16;
    if (el.type === 'text' && el.text) {
      larg = Math.min(doc.settings.width * 0.9, el.text.content.length * el.text.fontSize * 0.6 + 40);
      alt = el.text.fontSize * 1.5;
    }
    if (el.type === 'video' || el.type === 'image') {
      const asset = doc.assets.find((a) => a.id === el.assetId);
      const pw = asset?.width || doc.settings.width;
      const ph = asset?.height || doc.settings.height;
      const k = Math.max(doc.settings.width / pw, doc.settings.height / ph);
      larg = pw * k;
      alt = ph * k;
    }

    const escala = valueAt(el.transform.scale, rel);
    const rot = (valueAt(el.transform.rotation, rel) * Math.PI) / 180;
    const cx = valueAt(el.transform.x, rel) * escalaTela;
    const cy = valueAt(el.transform.y, rel) * escalaTela;
    const w = larg * escala * escalaTela;
    const h = alt * escala * escalaTela;

    /* caixa envolvente do retângulo rotacionado */
    const cos = Math.abs(Math.cos(rot));
    const sin = Math.abs(Math.sin(rot));
    const bw = w * cos + h * sin;
    const bh = w * sin + h * cos;

    setCaixa({ x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh });
  }, [el, visivel, doc, playhead]);

  useEffect(() => {
    medir();
    const onWin = () => medir();
    window.addEventListener('resize', onWin);
    const id = window.setTimeout(medir, 60);
    return () => {
      window.removeEventListener('resize', onWin);
      window.clearTimeout(id);
    };
  }, [medir]);

  if (!caixa || !el) return null;

  const escalaTela = (document.querySelector('.canvas-shell') as HTMLElement | null)?.getBoundingClientRect().width
    ? (document.querySelector('.canvas-shell') as HTMLElement).getBoundingClientRect().width / doc.settings.width
    : 1;
  const rel = playhead - el.start;

  const iniciar = (modo: 'mover' | 'escalar' | 'girar') => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const cx = caixa.x + caixa.w / 2;
    const cy = caixa.y + caixa.h / 2;
    arrasto.current = {
      modo,
      startX: e.clientX,
      startY: e.clientY,
      baseX: valueAt(el.transform.x, rel),
      baseY: valueAt(el.transform.y, rel),
      baseScale: valueAt(el.transform.scale, rel),
      baseRot: valueAt(el.transform.rotation, rel),
      centroX: cx,
      centroY: cy,
      anguloInicial: (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI,
    };
  };

  const mover = (e: React.PointerEvent) => {
    const a = arrasto.current;
    if (!a) return;
    e.stopPropagation();
    const dx = e.clientX - a.startX;
    const dy = e.clientY - a.startY;

    if (a.modo === 'mover') {
      updateTransform(el.id, 'x', { base: Math.round(a.baseX + dx / escalaTela), keyframes: [] });
      updateTransform(el.id, 'y', { base: Math.round(a.baseY + dy / escalaTela), keyframes: [] });
      return;
    }

    if (a.modo === 'escalar') {
      const distIni = Math.hypot(a.startX - a.centroX, a.startY - a.centroY) || 1;
      const distAgora = Math.hypot(e.clientX - a.centroX, e.clientY - a.centroY);
      const fator = distAgora / distIni;
      const nova = Math.min(8, Math.max(0.02, a.baseScale * fator));
      updateTransform(el.id, 'scale', { base: Number(nova.toFixed(3)), keyframes: [] });
      return;
    }

    /* girar */
    const angAgora = (Math.atan2(e.clientY - a.centroY, e.clientX - a.centroX) * 180) / Math.PI;
    let delta = angAgora - a.anguloInicial;
    if (e.shiftKey) delta = Math.round(delta / 15) * 15;
    updateTransform(el.id, 'rotation', { base: Math.round(a.baseRot + delta), keyframes: [] });
  };

  const soltar = (e: React.PointerEvent) => {
    if (arrasto.current) {
      useEditor.getState().commit();
      arrasto.current = null;
    }
    e.stopPropagation();
  };

  return (
    <div
      className="sel-layer"
      style={{ left: caixa.x, top: caixa.y, width: caixa.w, height: caixa.h }}
      onPointerDown={iniciar('mover')}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      title="Arraste para mover · use as alças para girar e escalar"
    >
      <span className="sel-tag">{el.name}</span>

      {/* girar */}
      <div
        className="sel-handle sel-rot"
        onPointerDown={iniciar('girar')}
        onPointerMove={mover}
        onPointerUp={soltar}
        title="Arraste para girar"
      >
        ⟳
      </div>

      {/* escalar pelos cantos */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <div
          key={c}
          className={`sel-handle sel-scale sel-${c}`}
          onPointerDown={iniciar('escalar')}
          onPointerMove={mover}
          onPointerUp={soltar}
          title="Arraste para redimensionar"
        />
      ))}

      <div className="sel-actions">
        <button
          title="Centralizar na tela"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            updateTransform(el.id, 'x', { base: doc.settings.width / 2, keyframes: [] });
            updateTransform(el.id, 'y', { base: doc.settings.height / 2, keyframes: [] });
          }}
        >
          ⊕
        </button>
        <button
          title="Tamanho original"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            updateTransform(el.id, 'scale', { base: 1, keyframes: [] });
            updateTransform(el.id, 'rotation', { base: 0, keyframes: [] });
          }}
        >
          1:1
        </button>
        <button
          title="Encaixar na tela inteira"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            updateTransform(el.id, 'scale', { base: 2, keyframes: [] });
          }}
        >
          ⤢
        </button>
        <button
          title="Desmarcar"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            select([]);
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
