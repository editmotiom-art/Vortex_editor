import { useState } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { PACKS } from '../data/library';
import { EXPORT_PRESETS, exportVideo, exportAudio, exportFrame, download, exportProjectJson } from '../lib/exporter';
import { fmtBytes, fmtTime } from '../lib/anim';
import { docDuration } from '../lib/renderer';

function Modal({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  const close = useUI((s) => s.closeModal);
  return (
    <div className="overlay" onClick={close}>
      <div className="modal" style={wide ? { width: 'min(940px,100%)' } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <div className="spacer" />
          <button className="btn ghost icon" onClick={close}>
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ============================= EXPORTAR ============================= */
export function ExportModal() {
  const { doc } = useEditor();
  const toast = useUI((s) => s.toast);
  const [presetId, setPresetId] = useState('reels1080');
  const [fps, setFps] = useState(doc.settings.fps);
  const [format, setFormat] = useState<'webm' | 'mp4'>('mp4');
  const [includeAudio, setIncludeAudio] = useState(true);
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const preset = EXPORT_PRESETS.find((p) => p.id === presetId)!;
  const total = docDuration(doc);

  const runVideo = async () => {
    if (busy) return;
    setBusy(true);
    setProgress(0);
    try {
      const blob = await exportVideo(doc, {
        width: preset.w,
        height: preset.h,
        fps,
        bitrate: preset.bitrate,
        includeAudio,
        format,
        onProgress: (p, l) => {
          setProgress(p);
          setLabel(l);
        },
      });
      download(blob, `${doc.name.replace(/\s+/g, '_')}_${preset.w}x${preset.h}.${format}`);
      toast(`Exportado: ${fmtBytes(blob.size)}`, 'ok');
    } catch (e) {
      toast(`Falha no export: ${(e as Error).message}`, 'err');
    } finally {
      setBusy(false);
    }
  };

  const runAudio = async () => {
    setBusy(true);
    try {
      const blob = await exportAudio(doc, (p, l) => {
        setProgress(p);
        setLabel(l);
      });
      download(blob, `${doc.name.replace(/\s+/g, '_')}_audio.wav`);
      toast('Áudio exportado em WAV', 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const runFrame = async () => {
    try {
      const blob = await exportFrame(doc, useEditor.getState().playhead, preset.w, preset.h);
      download(blob, `${doc.name.replace(/\s+/g, '_')}_frame.png`);
      toast('Frame exportado em PNG', 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    }
  };

  return (
    <Modal title="Exportar" wide>
      <div className="grid-2">
        <div>
          <div className="export-row">
            <span>Preset</span>
            <select className="sel-input" style={{ width: 230 }} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
              {EXPORT_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="export-row">
            <span>FPS</span>
            <select className="sel-input" style={{ width: 110 }} value={fps} onChange={(e) => setFps(Number(e.target.value))}>
              {[24, 25, 30, 50, 60].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="export-row">
            <span>Formato</span>
            <select className="sel-input" style={{ width: 110 }} value={format} onChange={(e) => setFormat(e.target.value as 'webm' | 'mp4')}>
              <option value="mp4">MP4 (H.264)</option>
              <option value="webm">WebM (VP9)</option>
            </select>
          </div>
          <div className="export-row">
            <span>Incluir áudio</span>
            <input type="checkbox" checked={includeAudio} onChange={(e) => setIncludeAudio(e.target.checked)} />
          </div>
          <div className="export-row">
            <span>Duração</span>
            <b style={{ fontFamily: 'var(--mono)' }}>{fmtTime(total, true, fps)}</b>
          </div>
          <div className="export-row">
            <span>Bitrate</span>
            <b style={{ fontFamily: 'var(--mono)' }}>~{preset.bitrate} Mbps</b>
          </div>

          <button className="btn primary" style={{ width: '100%', marginTop: 12 }} disabled={busy} onClick={runVideo}>
            {busy ? 'Exportando…' : '⬇ Exportar vídeo'}
          </button>
          {busy && (
            <>
              <div className="progress">
                <div style={{ width: `${progress}%` }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--txt-2)', marginTop: 6 }}>
                {label} · {Math.round(progress)}%
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn" style={{ flex: 1 }} onClick={runFrame} disabled={busy}>
              🖼 Frame PNG
            </button>
            <button className="btn" style={{ flex: 1 }} onClick={runAudio} disabled={busy}>
              🎵 Só áudio (WAV)
            </button>
          </div>
          <button
            className="btn"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => {
              download(exportProjectJson(doc), `${doc.name.replace(/\s+/g, '_')}.vortex.json`);
              toast('Projeto exportado em JSON', 'ok');
            }}
          >
            ⧉ Exportar projeto (.json)
          </button>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 10 }}>
            <h4>Como o export funciona</h4>
            <p>
              O vídeo é renderizado <b>no seu navegador</b> com Canvas + MediaRecorder. Nada é enviado a servidor.
              Para H.264 com maior fidelidade e velocidade, a próxima versão usa <b>WebCodecs</b> — o mesmo motor de
              render, só troca a saída.
            </p>
          </div>
          <div className="card" style={{ marginBottom: 10 }}>
            <h4>Paridade preview ↔ export</h4>
            <p>
              Preview e export chamam a <b>mesma função</b> <code>renderFrame()</code>. O que você vê é o que sai.
            </p>
          </div>
          <div className="card">
            <h4>Dicas</h4>
            <p>
              · Exporte em 720p para testar rápido e 1080p para publicar.
              <br />· MP4 é mais aceito em redes sociais; WebM é menor.
              <br />· Mantenha a aba em primeiro plano durante o export (o navegador limita timers em segundo plano).
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================= PACKS / ARMAZENAMENTO ============================= */
export function PacksModal() {
  const { installedPacks, installPack } = useUI();
  return (
    <Modal title="Conteúdo e armazenamento" wide>
      <div className="card" style={{ marginBottom: 12 }}>
        <h4>A regra que mantém seu banco pequeno</h4>
        <p>
          O banco de dados guarda apenas <b>metadados</b> (~2 KB por item). Os arquivos ficam em object storage
          (R2/B2) ou no disco do usuário. Packs são baixados sob demanda — você não paga storage nem tráfego para
          distribuir 46 GB.
        </p>
      </div>
      <div className="grid-3">
        <div className="card">
          <h4>Nível A · Oficial</h4>
          <p>
            300–500 itens curados e licenciados (~600 MB) hospedados por você, com CDN. Custo ≈ US$ 9/mês.
          </p>
        </div>
        <div className="card">
          <h4>Nível B · Packs</h4>
          <p>
            Os 46 GB distribuídos como packs assinados. O usuário instala o que quiser. Custo de infra: <b>zero</b>.
          </p>
        </div>
        <div className="card">
          <h4>Nível C · Meus arquivos</h4>
          <p>O usuário aponta a pasta dele. Nada sobe. Indexação local com os mesmos metadados.</p>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', color: 'var(--txt-2)', marginBottom: 8 }}>
          PACKS DISPONÍVEIS
        </div>
        {PACKS.map((p) => {
          const on = installedPacks.includes(p.id);
          return (
            <div key={p.id} className="media-item" style={{ cursor: 'default' }}>
              <div className="media-ico" style={{ background: `linear-gradient(135deg,${p.g[0]},${p.g[1]})` }}>
                ◫
              </div>
              <div className="media-info">
                <div className="media-name">
                  {p.name} {on && <span className="pill free">INSTALADO</span>}
                </div>
                <div className="media-sub">
                  {p.desc} · {p.items} itens · {(p.mb / 1024).toFixed(2)} GB
                </div>
              </div>
              <button className={`btn sm ${on ? '' : 'primary'}`} onClick={() => installPack(p.id)} disabled={on}>
                {on ? '✓' : 'Instalar'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="hint" style={{ marginTop: 12 }}>
        Nesta versão, instalar um pack libera os itens do catálogo. Conectar o storage real (R2/Supabase) é feito pelo
        módulo <code>src/lib/storage.ts</code> — o contrato já está definido lá.
      </div>
    </Modal>
  );
}

/* ============================= ATALHOS ============================= */
export function ShortcutsModal() {
  const rows: Array<[string, string]> = [
    ['Espaço', 'Play / Pause'],
    ['K', 'Play / Pause'],
    ['Home / End', 'Início / Fim'],
    ['← →', '1 frame'],
    ['Shift + ← →', '1 segundo'],
    ['S', 'Dividir no playhead'],
    ['Ctrl/⌘ + D', 'Duplicar'],
    ['Del / Backspace', 'Excluir'],
    ['Shift + Del', 'Excluir com ripple'],
    ['Ctrl/⌘ + Z', 'Desfazer'],
    ['Ctrl/⌘ + Shift + Z', 'Refazer'],
    ['Ctrl/⌘ + S', 'Salvar projeto'],
    ['Ctrl/⌘ + E', 'Exportar'],
    ['V', 'Ferramenta seleção'],
    ['C', 'Ferramenta faca'],
    ['H', 'Ferramenta mão'],
    ['I / O', 'Marcar entrada / saída'],
    ['M', 'Marcador'],
    ['Ctrl/⌘ + + / −', 'Zoom da timeline'],
    ['+ / −  (Shift)', 'Zoom da timeline'],
  ];
  return (
    <Modal title="Atalhos de teclado">
      <div className="grid-2">
        {rows.map(([k, d]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 12 }}>
            <span style={{ color: 'var(--txt-2)' }}>{d}</span>
            <span className="kbd">{k}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ============================= CONTA / ASSINATURA ============================= */
export function AccountModal() {
  const { user } = useUI();
  return (
    <Modal title="Conta e assinatura">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <div
          className="media-ico"
          style={{ width: 46, height: 46, fontSize: 18, background: 'linear-gradient(135deg,#22d3ee,#6366f1)' }}
        >
          {user?.name?.[0] ?? 'C'}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14 }}>{user?.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
            Plano atual:{' '}
            {user?.plan === 'pro' ? <span className="pill paid">PRO</span> : <span className="pill free">FREE</span>}
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h4>Free</h4>
          <div className="price">
            R$ 0<small>/mês</small>
          </div>
          <div className="plan-list">
            <div className="plan-item">
              <span>✓</span> Editor completo
            </div>
            <div className="plan-item">
              <span>✓</span> Biblioteca básica (templates e formas)
            </div>
            <div className="plan-item">
              <span>✓</span> Export até 720p
            </div>
            <div className="plan-item">
              <span style={{ color: 'var(--txt-2)' }}>×</span> Packs de conteúdo
            </div>
            <div className="plan-item">
              <span style={{ color: 'var(--txt-2)' }}>×</span> Export 1080p/4K e sem marca
            </div>
          </div>
        </div>
        <div className="card" style={{ borderColor: 'var(--acc)', boxShadow: '0 0 0 1px rgba(34,211,238,.35)' }}>
          <h4>
            Pro <span className="pill paid">RECOMENDADO</span>
          </h4>
          <div className="price">
            R$ 29,90<small>/mês</small>
          </div>
          <div className="plan-list">
            <div className="plan-item">
              <span>✓</span> Tudo do Free
            </div>
            <div className="plan-item">
              <span>✓</span> Todos os packs (SFX, música, overlays, templates)
            </div>
            <div className="plan-item">
              <span>✓</span> Export 1080p/4K sem marca d'água
            </div>
            <div className="plan-item">
              <span>✓</span> 50 GB na nuvem para seus projetos
            </div>
            <div className="plan-item">
              <span>✓</span> Templates e LUTs novos todo mês
            </div>
          </div>
          <button className="btn primary" style={{ width: '100%', marginTop: 10 }} onClick={() => alert('Checkout será conectado ao Stripe/Mercado Pago na próxima etapa.')}>
            Assinar Pro
          </button>
        </div>
      </div>

      <div className="hint" style={{ marginTop: 12 }}>
        O controle de acesso por assinatura fica no banco (tabela <code>subscriptions</code>) e é verificado por uma
        Edge Function antes de liberar packs e export em alta resolução.
      </div>
    </Modal>
  );
}
