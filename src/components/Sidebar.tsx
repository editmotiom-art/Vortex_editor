import { useMemo, useRef, useState } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { LIBRARY, LIB_CATEGORIES, PACKS, type LibItem } from '../data/library';
import { fmtBytes, fmtTime } from '../lib/anim';
import { uid } from '../types';
import type { EffectType } from '../types';
import { BibliotecaXML } from './BibliotecaXML';

interface Props {
  onImport: (files: FileList | File[]) => void;
  mobileOpen?: boolean;
}

/** aplica um item da biblioteca no projeto */
function applyLibItem(item: LibItem): void {
  const ed = useEditor.getState();
  const ui = useUI.getState();
  const sel = ed.selection[0];

  /* no celular, a gaveta fecha ao aplicar — o resultado aparece no preview */
  window.dispatchEvent(new Event('vortex:fechar-gaveta'));

  if (item.apply.type === 'media') {
    const pack = PACKS.find((p) => p.id === item.pack);
    const installed = pack ? useUI.getState().installedPacks.includes(pack.id) : false;
    if (!installed) {
      ui.openModal('packs');
      ui.toast(`"${item.name}" vem no pack ${item.pack} — instale para usar`, 'warn');
      return;
    }
    ui.toast(`Arraste um arquivo de ${item.cat} do pack para a timeline`, 'warn');
    return;
  }

  if (item.apply.type === 'text') {
    const { content, size, weight, uppercase } = item.apply;
    const id = ed.addText(content);
    const el = useEditor.getState().doc.elements.find((e) => e.id === id);
    if (el?.text) {
      const doc = useEditor.getState().doc;
      ed.updateElement(
        id,
        {
          text: {
            ...el.text,
            fontSize: Math.round(doc.settings.height * (size ?? 0.075)),
            fontWeight: weight ?? 800,
            uppercase: uppercase ?? item.id === 'tx-caps',
          },
        },
        false,
      );
    }
    ui.toast(`Texto "${item.name}" adicionado`);
    return;
  }

  if (item.apply.type === 'shape') {
    ed.addShape(item.apply.shape);
    ui.toast(`Forma adicionada`);
    return;
  }

  if (item.apply.type === 'fx') {
    if (!sel) {
      ui.toast('Selecione um clipe na timeline primeiro', 'warn');
      return;
    }
    const effect = item.apply.effect as EffectType;
    ed.setEffect(sel, effect, item.apply.amount);
    ui.toast(`"${item.name}" aplicado ao clipe selecionado`, 'ok');
    return;
  }

  if (item.apply.type === 'kf') {
    const preset = item.apply.preset;
    const doc = ed.doc;
    const id = ed.addText(preset === 'zoomPunch' ? 'IMPACTO' : 'TÍTULO');
    const base = doc.settings.width / 2;
    const y = doc.settings.height / 2;
    const el = useEditor.getState().doc.elements.find((e) => e.id === id);
    if (!el) return;

    const kf = (arr: Array<[number, number] | [number, number, string]>) =>
      arr.map(([t, v, e]) => ({ t, v, easing: (e ?? 'easeOut') as any }));

    const presets: Record<string, () => void> = {
      pop: () => {
        ed.updateTransform(id, 'scale', { keyframes: kf([[0, 0.2, 'overshoot'], [400, 1.12, 'easeOut'], [620, 1, 'easeInOut']]) });
        ed.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [220, 1]]) });
      },
      zoomPunch: () => {
        ed.updateTransform(id, 'scale', { keyframes: kf([[0, 2.4, 'easeIn'], [280, 1, 'overshoot']]) });
        ed.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [120, 1]]) });
      },
      slide: () => {
        ed.updateTransform(id, 'x', { keyframes: kf([[0, base - doc.settings.width * 0.7, 'easeOut'], [520, base, 'easeOut']]) });
        ed.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [200, 1]]) });
      },
      fade: () => {
        ed.updateTransform(id, 'opacity', { keyframes: kf([[0, 0, 'easeInOut'], [900, 1, 'easeInOut']]) });
      },
      bounce: () => {
        ed.updateTransform(id, 'y', { keyframes: kf([[0, y - 420, 'bounce'], [900, y, 'easeOut']]) });
        ed.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [160, 1]]) });
      },
      spin: () => {
        ed.updateTransform(id, 'rotation', { keyframes: kf([[0, -180, 'easeOut'], [700, 0, 'easeOut']]) });
        ed.updateTransform(id, 'scale', { keyframes: kf([[0, 0.1], [700, 1, 'overshoot']]) });
      },
      glitchIn: () => {
        ed.setEffect(id, 'rgbsplit', 10);
        ed.updateTransform(id, 'opacity', { keyframes: kf([[0, 0], [90, 1], [180, 0.35], [260, 1]]) });
        ed.updateTransform(id, 'x', { keyframes: kf([[0, base - 22], [120, base + 18], [240, base - 8], [320, base]]) });
      },
      kenBurns: () => {
        ed.updateTransform(id, 'scale', { keyframes: kf([[0, 1, 'linear'], [5000, 1.18, 'linear']]) });
      },
    };
    presets[preset]?.();
    ui.toast(`Template "${item.name}" aplicado com keyframes`, 'ok');
  }
}

export function Sidebar({ onImport, mobileOpen }: Props) {
  const inputMidia = useRef<HTMLInputElement>(null);
  const { doc, addAsset } = useEditor();
  const { sidebarTab, setSidebarTab, openModal, installedPacks, toast } = useUI();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('Tudo');
  const [dragOver, setDragOver] = useState(false);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return LIBRARY.filter((i) => {
      if (cat !== 'Tudo' && i.cat !== cat) return false;
      if (!term) return true;
      return (
        i.name.toLowerCase().includes(term) ||
        i.tags.some((t) => t.includes(term)) ||
        i.cat.toLowerCase().includes(term)
      );
    });
  }, [q, cat]);

  const mediaAssets = doc.assets;

  const createMediaElement = (assetId: string, trackId?: string, start?: number) => {
    const ed = useEditor.getState();
    const asset = ed.doc.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const isAudio = asset.kind === 'audio';
    const track =
      ed.doc.tracks.find((t) => t.id === trackId) ??
      ed.doc.tracks.find((t) => (isAudio ? t.kind === 'audio' : t.kind === 'video'));
    if (!track) {
      toast('Adicione uma trilha primeiro', 'warn');
      return;
    }
    const duration = asset.durationMs > 0 ? asset.durationMs : 5000;
    ed.commit();
    ed.addElement({
      type: isAudio ? 'audio' : asset.kind === 'image' ? 'image' : 'video',
      name: asset.name,
      trackId: track.id,
      start: start ?? ed.playhead,
      duration,
      sourceIn: 0,
      assetId: asset.id,
      transform: { ...identityTransformSafe() },
      blend: 'normal',
      effects: [],
      volume: 1,
      locked: false,
      hidden: false,
      color: isAudio ? '#818cf8' : '#22d3ee',
    });
    toast(`${asset.name} adicionado à timeline`, 'ok');
  };

  // expõe para a timeline (drag do media)
  (window as unknown as Record<string, unknown>).__vortexAddMedia = createMediaElement;

  return (
    <aside className={`panel sidebar${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="tabs">
        <button
          className={`tab ${sidebarTab === 'library' ? 'active' : ''}`}
          onClick={() => setSidebarTab('library')}
        >
          ✦ Biblioteca
        </button>
        <button className={`tab ${sidebarTab === 'media' ? 'active' : ''}`} onClick={() => setSidebarTab('media')}>
          ▤ Mídia
        </button>
        <button className={`tab ${sidebarTab === 'packs' ? 'active' : ''}`} onClick={() => setSidebarTab('packs')}>
          ◫ Packs
        </button>
        <button className={`tab ${sidebarTab === 'xml' ? 'active' : ''}`} onClick={() => setSidebarTab('xml')}>
          ⤓ XML
        </button>
      </div>

      {sidebarTab === 'xml' && (
        <div className="panel-body" style={{ padding: 10 }}>
          <BibliotecaXML />
        </div>
      )}

      {sidebarTab === 'library' && (
        <>
          <div className="search-wrap">
            <input
              className="search"
              placeholder="Buscar templates, SFX, looks…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="cat-chips">
            {['Tudo', ...LIB_CATEGORIES].map((c) => (
              <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
          <div className="panel-body">
            <div className="lib-grid">
              {items.map((it) => {
                const locked = it.pack && !installedPacks.includes(it.pack);
                return (
                  <div key={it.id} className="lib-card" onClick={() => applyLibItem(it)} title={`${it.name} — ${it.tags.join(', ')}`}>
                    <div className="lib-thumb" style={{ background: `linear-gradient(135deg, ${it.g[0]}, ${it.g[1]})` }}>
                      {it.icon ?? it.name.slice(0, 2)}
                      {locked ? <span className="badge-pack">PACK</span> : !it.pack ? <span className="badge-free">GRÁTIS</span> : null}
                    </div>
                    <div className="lib-meta">
                      <div className="lib-name">{it.name}</div>
                      <div className="lib-sub">
                        <span>{it.cat}</span>
                        {it.durationMs ? <span>{fmtTime(it.durationMs)}</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {items.length === 0 && <div className="empty-state">Nada encontrado para “{q}”.</div>}
          </div>
        </>
      )}

      {sidebarTab === 'media' && (
        <>
          <div style={{ padding: 8 }}>
            <input
              ref={inputMidia}
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) onImport(e.target.files);
                e.target.value = '';
              }}
            />
            <div
              className={`dropzone ${dragOver ? 'over' : ''}`}
              onClick={() => inputMidia.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) onImport(e.dataTransfer.files);
              }}
            >
              <b>Arraste vídeos, áudios ou imagens</b>
              <br />
              ou clique para escolher
              <br />
              <span style={{ fontSize: 10 }}>MP4 · MOV · WEBM · MP3 · WAV · PNG · JPG</span>
            </div>
          </div>
          <div className="panel-body" style={{ padding: '0 8px 8px' }}>
            {mediaAssets.length === 0 && (
              <div className="hint">
                Os arquivos ficam <b>no seu dispositivo</b> — nada é enviado para servidor. O projeto salva só
                metadados.
              </div>
            )}
            {mediaAssets.map((a) => (
              <div
                key={a.id}
                className="media-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/vortex-asset', a.id);
                }}
                onDoubleClick={() => createMediaElement(a.id)}
                title="Arraste para a timeline ou dê duplo clique"
              >
                <div
                  className="media-ico"
                  style={{
                    background:
                      a.kind === 'video'
                        ? 'linear-gradient(135deg,#22d3ee,#0e7490)'
                        : a.kind === 'audio'
                          ? 'linear-gradient(135deg,#818cf8,#3730a3)'
                          : 'linear-gradient(135deg,#fbbf24,#b45309)',
                  }}
                >
                  {a.kind === 'video' ? '▶' : a.kind === 'audio' ? '♪' : '▣'}
                </div>
                <div className="media-info">
                  <div className="media-name">{a.name}</div>
                  <div className="media-sub">
                    {a.durationMs > 0 ? fmtTime(a.durationMs) : a.kind}
                    {a.sizeBytes ? ` · ${fmtBytes(a.sizeBytes)}` : ''}
                    {a.origin === 'library' ? ' · biblioteca' : ''}
                  </div>
                </div>
                <button
                  className="btn ghost sm"
                  title="Remover do projeto"
                  onClick={() => useEditor.getState().removeAsset(a.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {sidebarTab === 'packs' && (
        <div className="panel-body" style={{ padding: 8 }}>
          <div className="hint" style={{ marginBottom: 8 }}>
            Packs são bibliotecas opcionais. Ao instalar, os itens ficam disponíveis na biblioteca e são baixados
            apenas quando usados — seu banco de dados guarda só metadados.
          </div>
          {PACKS.map((p) => {
            const on = installedPacks.includes(p.id);
            return (
              <div key={p.id} className="media-item" style={{ cursor: 'default' }}>
                <div className="media-ico" style={{ background: `linear-gradient(135deg, ${p.g[0]}, ${p.g[1]})` }}>
                  ◫
                </div>
                <div className="media-info">
                  <div className="media-name">{p.name}</div>
                  <div className="media-sub">
                    {p.items} itens · {(p.mb / 1024).toFixed(2)} GB
                  </div>
                </div>
                <button
                  className={`btn sm ${on ? '' : 'primary'}`}
                  onClick={() => (on ? toast('Pack já instalado') : useUI.getState().installPack(p.id))}
                >
                  {on ? '✓' : 'Instalar'}
                </button>
              </div>
            );
          })}
          <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={() => openModal('packs')}>
            Ver detalhes de armazenamento
          </button>
        </div>
      )}
    </aside>
  );
}

function identityTransformSafe() {
  return {
    x: { base: 0, keyframes: [] },
    y: { base: 0, keyframes: [] },
    scale: { base: 1, keyframes: [] },
    rotation: { base: 0, keyframes: [] },
    opacity: { base: 1, keyframes: [] },
  };
}
