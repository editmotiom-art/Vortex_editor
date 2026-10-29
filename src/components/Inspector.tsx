import { useState } from 'react';
import { useEditor } from '../store/editor';
import { EFFECT_CATALOG, EFFECT_GROUPS } from '../lib/fx';
import { fmtTime } from '../lib/anim';
import type { EffectType, Element, Transform } from '../types';

function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [o, setO] = useState(open);
  return (
    <div className="sec">
      <button className="sec-head" onClick={() => setO(!o)}>
        <span style={{ width: 10, fontSize: 8 }}>{o ? '▾' : '▸'}</span>
        {title}
      </button>
      {o && <div className="sec-body">{children}</div>}
    </div>
  );
}

function AnimRow({
  label,
  el,
  propKey,
  step = 1,
  min,
  max,
  suffix,
}: {
  label: string;
  el: Element;
  propKey: keyof Transform;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const { playhead, updateTransform, toggleKeyframe } = useEditor();
  const prop = el.transform[propKey];
  const rel = Math.max(0, playhead - el.start);
  const hasKfHere = prop.keyframes.some((k) => Math.abs(k.t - rel) < 16);
  const isAnimated = prop.keyframes.length > 0;

  const currentValue = (() => {
    if (!isAnimated) return prop.base;
    const sorted = prop.keyframes;
    if (rel <= sorted[0].t) return sorted[0].v;
    if (rel >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].v;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (rel >= sorted[i].t && rel <= sorted[i + 1].t) {
        const span = sorted[i + 1].t - sorted[i].t || 1;
        const k = (rel - sorted[i].t) / span;
        return sorted[i].v + (sorted[i + 1].v - sorted[i].v) * k;
      }
    }
    return prop.base;
  })();

  const set = (v: number) => {
    if (isAnimated) {
      const existing = prop.keyframes.find((k) => Math.abs(k.t - rel) < 16);
      const keyframes = existing
        ? prop.keyframes.map((k) => (k === existing ? { ...k, v } : k))
        : [...prop.keyframes, { t: rel, v, easing: 'easeInOut' as const }].sort((a, b) => a.t - b.t);
      updateTransform(el.id, propKey, { keyframes });
    } else {
      updateTransform(el.id, propKey, { base: v });
    }
  };

  return (
    <div className="row">
      <label>{label}</label>
      <input
        className="num"
        type="number"
        step={step}
        min={min}
        max={max}
        value={Number(currentValue.toFixed(3))}
        onChange={(e) => set(parseFloat(e.target.value) || 0)}
      />
      {suffix && <span style={{ fontSize: 10, color: 'var(--txt-2)', width: 14 }}>{suffix}</span>}
      <button
        className={`kf-btn ${hasKfHere ? 'on' : ''}`}
        title={hasKfHere ? 'Remover keyframe neste instante' : 'Adicionar keyframe neste instante'}
        onClick={() => toggleKeyframe(el.id, propKey)}
      >
        ◆
      </button>
    </div>
  );
}

export function Inspector({ mobileOpen }: { mobileOpen?: boolean }) {
  const {
    doc,
    selection,
    updateElement,
    setEffect,
    removeEffect,
    patchEffect,
    applyPreset,
    deleteSelected,
    duplicateSelected,
    splitSelected,
  } = useEditor();
  const el = doc.elements.find((e) => e.id === selection[0]);

  if (!el) {
    return (
      <aside className={`panel inspector${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="panel-head">Propriedades</div>
        <div className="panel-body">
          <div className="sec">
            <div className="sec-body">
              <div className="row">
                <label>Formato</label>
                <select
                  className="sel-input"
                  value={`${doc.settings.width}x${doc.settings.height}`}
                  onChange={(e) => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    const key = Object.keys({ reels: 0, youtube: 0, square: 0, portrait45: 0 }).find((k) => {
                      const map: Record<string, [number, number]> = {
                        reels: [1080, 1920],
                        youtube: [1920, 1080],
                        square: [1080, 1080],
                        portrait45: [1080, 1350],
                      };
                      return map[k][0] === w && map[k][1] === h;
                    });
                    if (key) applyPreset(key);
                  }}
                >
                  <option value="1080x1920">Reels / Shorts 9:16</option>
                  <option value="1920x1080">YouTube 16:9</option>
                  <option value="1080x1080">Quadrado 1:1</option>
                  <option value="1080x1350">Feed 4:5</option>
                </select>
              </div>
              <div className="row">
                <label>FPS</label>
                <select
                  className="sel-input"
                  value={doc.settings.fps}
                  onChange={(e) =>
                    useEditor.setState({
                      doc: { ...doc, settings: { ...doc.settings, fps: Number(e.target.value) } },
                    })
                  }
                >
                  <option value={24}>24</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={60}>60</option>
                </select>
              </div>
              <div className="row">
                <label>Fundo</label>
                <input
                  type="color"
                  value={doc.settings.background}
                  onChange={(e) =>
                    useEditor.setState({
                      doc: { ...doc, settings: { ...doc.settings, background: e.target.value } },
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="empty-state">
            <b>Nada selecionado</b>
            Clique em um clipe na timeline para editar posição, escala, opacidade, keyframes e efeitos.
            <br />
            <br />
            Dica: adicione um template da biblioteca para começar rápido.
          </div>
        </div>
      </aside>
    );
  }

  /* ---------- seleção múltipla: painel de edição em massa ---------- */
  if (selection.length > 1) {
    const sel = useEditor.getState().doc.elements.filter((e) => selection.includes(e.id));
    return (
      <aside className={`panel inspector${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="panel-head">
          <span style={{ color: 'var(--acc)' }}>▣</span>
          {sel.length} clipes selecionados
          <div className="spacer" />
          <button className="head-btn" title="Excluir todos (Del)" onClick={() => deleteSelected()}>
            ×
          </button>
        </div>
        <div className="panel-body">
          <Section title="Aplicar em todos">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(['blur', 'glow', 'brightness', 'contrast', 'saturation', 'grayscale', 'vignette', 'grain'] as const).map(
                (fx) => (
                  <button
                    key={fx}
                    className="chip"
                    onClick={() => {
                      useEditor.getState().commit();
                      sel.forEach((e) => useEditor.getState().setEffect(e.id, fx, 0.6));
                    }}
                  >
                    + {fx}
                  </button>
                ),
              )}
            </div>
          </Section>

          <Section title="Tempo">
            <div className="row">
              <label>Ajustar início</label>
              <input
                className="num"
                type="number"
                placeholder="ex.: 0"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v)) return;
                  sel.forEach((x) => useEditor.getState().updateElement(x.id, { start: Math.max(0, v) }));
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--txt-2)' }}>ms</span>
            </div>
            <div className="row">
              <label>Duração</label>
              <input
                className="num"
                type="number"
                placeholder="ex.: 3000"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v) || v < 100) return;
                  sel.forEach((x) => useEditor.getState().updateElement(x.id, { duration: v }));
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--txt-2)' }}>ms</span>
            </div>
          </Section>

          <Section title="Transformar">
            {(
              [
                ['x', 'X'],
                ['y', 'Y'],
                ['scale', 'Escala'],
                ['rotation', 'Rotação'],
                ['opacity', 'Opacidade'],
              ] as const
            ).map(([prop, label]) => (
              <div className="row" key={prop}>
                <label>{label}</label>
                <input
                  className="num"
                  type="number"
                  step={prop === 'scale' || prop === 'opacity' ? 0.05 : 1}
                  placeholder="—"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    sel.forEach((x) => useEditor.getState().updateTransform(x.id, prop, { base: v, keyframes: [] }));
                  }}
                />
              </div>
            ))}
          </Section>

          <div className="hint" style={{ marginTop: 10 }}>
            Os valores de Transformar só mudam quando você digita um número no campo — assim nenhum clipe é
            alterado sem querer. Segure o dedo/arraste na timeline para selecionar vários.
          </div>
        </div>
      </aside>
    );
  }

  const isText = el.type === 'text';
  const isMedia = el.type === 'video' || el.type === 'image' || el.type === 'audio';

  return (
    <aside className={`panel inspector${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="panel-head">
        <span style={{ color: el.color }}>●</span>
        {el.name}
        <div className="spacer" />
        <button className="head-btn" title="Dividir no playhead (S)" onClick={splitSelected}>
          S
        </button>
        <button className="head-btn" title="Duplicar (Ctrl+D)" onClick={duplicateSelected}>
          D
        </button>
        <button className="head-btn" title="Excluir (Del)" onClick={() => deleteSelected()}>
          ×
        </button>
      </div>

      <div className="panel-body">
        <Section title="Tempo">
          <div className="row">
            <label>Início</label>
            <input
              className="num"
              type="number"
              value={Math.round(el.start)}
              onChange={(e) => updateElement(el.id, { start: Math.max(0, Number(e.target.value)) })}
            />
            <span style={{ fontSize: 10, color: 'var(--txt-2)' }}>ms</span>
          </div>
          <div className="row">
            <label>Duração</label>
            <input
              className="num"
              type="number"
              value={Math.round(el.duration)}
              onChange={(e) => updateElement(el.id, { duration: Math.max(100, Number(e.target.value)) })}
            />
            <span style={{ fontSize: 10, color: 'var(--txt-2)' }}>ms</span>
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--txt-2)', fontFamily: 'var(--mono)' }}>
            {fmtTime(el.start, true, doc.settings.fps)} → {fmtTime(el.start + el.duration, true, doc.settings.fps)}
          </div>
        </Section>

        {!isMedia || el.type === 'image' || el.type === 'video' ? (
          <Section title="Transformar">
            <AnimRow label="X" el={el} propKey="x" />
            <AnimRow label="Y" el={el} propKey="y" />
            <AnimRow label="Escala" el={el} propKey="scale" step={0.01} />
            <AnimRow label="Rotação" el={el} propKey="rotation" suffix="°" />
            <AnimRow label="Opacidade" el={el} propKey="opacity" step={0.01} min={0} max={1} />
            <div className="row">
              <label>Blend</label>
              <select
                className="sel-input"
                value={el.blend}
                onChange={(e) => updateElement(el.id, { blend: e.target.value as never })}
              >
                {['normal', 'multiply', 'screen', 'overlay', 'add', 'difference', 'lighten', 'darken'].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </Section>
        ) : null}

        {isText && el.text && (
          <Section title="Texto">
            <textarea
              className="sel-input"
              style={{ height: 56, padding: 6, resize: 'vertical', lineHeight: 1.4 }}
              value={el.text.content}
              onChange={(e) => updateElement(el.id, { text: { ...el.text!, content: e.target.value } })}
            />
            <div className="row">
              <label>Fonte</label>
              <select
                className="sel-input"
                value={el.text.fontFamily}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, fontFamily: e.target.value } })}
              >
                <option value="Inter, system-ui, sans-serif">Inter / Sans</option>
                <option value="Georgia, serif">Georgia / Serif</option>
                <option value="'Courier New', monospace">Courier / Mono</option>
                <option value="Impact, sans-serif">Impact</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet</option>
              </select>
            </div>
            <div className="row">
              <label>Tamanho</label>
              <input
                className="num"
                type="number"
                value={el.text.fontSize}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, fontSize: Number(e.target.value) } })}
              />
            </div>
            <div className="row">
              <label>Peso</label>
              <input
                type="range"
                min={300}
                max={900}
                step={100}
                value={el.text.fontWeight}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, fontWeight: Number(e.target.value) } })}
              />
              <span style={{ fontSize: 10, width: 26, color: 'var(--txt-2)' }}>{el.text.fontWeight}</span>
            </div>
            <div className="row">
              <label>Cor</label>
              <input
                type="color"
                value={el.text.color}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, color: e.target.value } })}
              />
              <label style={{ width: 44 }}>Contorno</label>
              <input
                type="color"
                value={el.text.strokeColor}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, strokeColor: e.target.value } })}
              />
            </div>
            <div className="row">
              <label>Contorno</label>
              <input
                type="range"
                min={0}
                max={12}
                value={el.text.strokeWidth}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, strokeWidth: Number(e.target.value) } })}
              />
              <span style={{ fontSize: 10, width: 20, color: 'var(--txt-2)' }}>{el.text.strokeWidth}</span>
            </div>
            <div className="row">
              <label>Alinhar</label>
              <select
                className="sel-input"
                value={el.text.align}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, align: e.target.value as never } })}
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </div>
            <div className="row">
              <label>Caps</label>
              <input
                type="checkbox"
                checked={el.text.uppercase}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, uppercase: e.target.checked } })}
              />
              <label style={{ width: 60 }}>Sombra</label>
              <input
                type="checkbox"
                checked={el.text.shadow}
                onChange={(e) => updateElement(el.id, { text: { ...el.text!, shadow: e.target.checked } })}
              />
            </div>
          </Section>
        )}

        {el.type === 'shape' && el.shape && (
          <Section title="Forma">
            <div className="row">
              <label>Cor</label>
              <input
                type="color"
                value={el.shape.fill}
                onChange={(e) => updateElement(el.id, { shape: { ...el.shape!, fill: e.target.value } })}
              />
            </div>
            <div className="row">
              <label>Raio</label>
              <input
                type="range"
                min={0}
                max={60}
                value={el.shape.radius}
                onChange={(e) => updateElement(el.id, { shape: { ...el.shape!, radius: Number(e.target.value) } })}
              />
            </div>
          </Section>
        )}

        {isMedia && (
          <Section title="Áudio">
            <div className="row">
              <label>Volume</label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={el.volume}
                onChange={(e) => updateElement(el.id, { volume: Number(e.target.value) }, false)}
              />
              <span style={{ fontSize: 10, width: 28, color: 'var(--txt-2)' }}>
                {Math.round(el.volume * 100)}
              </span>
            </div>
          </Section>
        )}

        <Section title={`Efeitos (${el.effects.length})`}>
          <div className="row">
            <select
              className="sel-input"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setEffect(el.id, e.target.value as EffectType, EFFECT_CATALOG[e.target.value as EffectType].def);
                  e.target.value = '';
                }
              }}
            >
              <option value="">+ Adicionar efeito…</option>
              {EFFECT_GROUPS.map((g) => (
                <optgroup key={g} label={g}>
                  {(Object.keys(EFFECT_CATALOG) as EffectType[])
                    .filter((k) => EFFECT_CATALOG[k].group === g)
                    .map((k) => (
                      <option key={k} value={k}>
                        {EFFECT_CATALOG[k].label}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          {el.effects.map((fx) => {
            const meta = EFFECT_CATALOG[fx.type];
            return (
              <div key={fx.id} className="fx-row">
                <input
                  type="checkbox"
                  checked={fx.enabled}
                  title="Ativar/desativar"
                  onChange={(e) => patchEffect(el.id, fx.id, { enabled: e.target.checked })}
                />
                <span className="fx-name" title={meta.label}>
                  {meta.label}
                </span>
                <input
                  className="fx-slider"
                  type="range"
                  min={meta.min}
                  max={meta.max}
                  step={(meta.max - meta.min) / 100}
                  value={fx.amount}
                  onChange={(e) => patchEffect(el.id, fx.id, { amount: Number(e.target.value) })}
                />
                <span style={{ fontSize: 9.5, width: 30, textAlign: 'right', color: 'var(--txt-2)' }}>
                  {Number(fx.amount.toFixed(2))}
                </span>
                <button className="head-btn" title="Remover" onClick={() => removeEffect(el.id, fx.id)}>
                  ✕
                </button>
              </div>
            );
          })}
          {el.effects.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--txt-2)', lineHeight: 1.5 }}>
              Nenhum efeito. Adicione acima ou aplique um “Look” da biblioteca.
            </div>
          )}
        </Section>
      </div>
    </aside>
  );
}
