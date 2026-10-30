import { useState } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { sair as sairConta, tempoHumano } from '../lib/contas';
import { BarraPlano } from './BarraPlano';
import { PACKS } from '../data/library';
import { CatalogoDrive } from './PacksDrive';
import { PacksMonkey } from './PacksMonkey';
import { EXPORT_PRESETS, exportVideo, exportAudio, exportFrame, download, exportProjectJson } from '../lib/exporter';
import { useMemo } from 'react';
import { cliquesLigados, ligarCliques } from '../lib/sons';
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
  /** resultado do último export, para prévia antes de baixar */
  const [pronto, setPronto] = useState<{ url: string; tipo: 'video' | 'imagem' | 'audio'; nome: string; bytes: number } | null>(null);
  const mp4Ok = useMemo(() => {
    const v = document.createElement('video');
    return Boolean(v.canPlayType('video/mp4; codecs="avc1.42E01E"'));
  }, []);

  const preset = EXPORT_PRESETS.find((p) => p.id === presetId)!;
  const total = docDuration(doc);

  const runVideo = async () => {
    if (busy) return;
    const extFinal = format === 'mp4' && mp4Ok ? 'mp4' : 'webm';
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
      setPronto({
        url: URL.createObjectURL(blob),
        tipo: 'video',
        nome: `${doc.name.replace(/\s+/g, '_')}_${preset.w}x${preset.h}.${extFinal}`,
        bytes: blob.size,
      });
      toast(`Pronto: ${fmtBytes(blob.size)} — confira a prévia e baixe`, 'ok');
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
      setPronto({
        url: URL.createObjectURL(blob),
        tipo: 'audio',
        nome: `${doc.name.replace(/\s+/g, '_')}_audio.wav`,
        bytes: blob.size,
      });
      toast('Áudio pronto — confira a prévia e baixe', 'ok');
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setBusy(false);
    }
  };

  const runFrame = async () => {
    try {
      const blob = await exportFrame(doc, useEditor.getState().playhead, preset.w, preset.h);
      setPronto({
        url: URL.createObjectURL(blob),
        tipo: 'imagem',
        nome: `${doc.name.replace(/\s+/g, '_')}_frame.png`,
        bytes: blob.size,
      });
      toast('Frame pronto — confira a prévia e baixe', 'ok');
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
              <option value="mp4" disabled={!mp4Ok}>
                MP4 (H.264){!mp4Ok ? ' — indisponível aqui' : ''}
              </option>
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
          {pronto ? (
            <div className="card exp-previa" style={{ marginBottom: 10 }}>
              <h4>Prévia do arquivo</h4>
              {pronto.tipo === 'video' && <video src={pronto.url} controls playsInline />}
              {pronto.tipo === 'imagem' && <img src={pronto.url} alt="Prévia do frame exportado" />}
              {pronto.tipo === 'audio' && <audio src={pronto.url} controls />}
              <div className="exp-previa-info">
                {pronto.nome} · {fmtBytes(pronto.bytes)}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  className="btn primary sm"
                  style={{ flex: 1 }}
                  onClick={async () => {
                    const blob = await fetch(pronto.url).then((r) => r.blob());
                    download(blob, pronto.nome);
                  }}
                >
                  ⬇ Baixar este arquivo
                </button>
                <a className="btn ghost sm" href={pronto.url} target="_blank" rel="noreferrer">
                  Abrir
                </a>
              </div>
              <div className="hint" style={{ marginTop: 8 }}>
                Nada foi baixado ainda. Se a prévia estiver do jeito que você quer, clique em baixar.
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ============================= PACKS / ARMAZENAMENTO ============================= */
export function PacksModal() {
  const [abaPacks, setAbaPacks] = useState<'editor' | 'drive' | 'monkey'>('editor');
  const { installedPacks, installPack } = useUI();

  const [comCliques, setComCliques] = useState(cliquesLigados());

  const abas = (
    <div className="tabs" style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden' }}>
      <button className={`tab${abaPacks === 'editor' ? ' active' : ''}`} onClick={() => setAbaPacks('editor')}>
        Packs do editor
      </button>
      <button className={`tab${abaPacks === 'drive' ? ' active' : ''}`} onClick={() => setAbaPacks('drive')}>
        Meu Drive
      </button>
      <button
        className={`tab${abaPacks === 'monkey' ? ' active' : ''}`}
        onClick={() => setAbaPacks('monkey')}
        title="163 packs do Pack do Editor 4.0 — Drive e espelho no Sync"
      >
        Pack do Editor
      </button>
    </div>
  );

  if (abaPacks === 'drive') {
    return (
      <Modal title="Conteúdo do Drive" wide>
        {abas}
        <CatalogoDrive />
      </Modal>
    );
  }

  if (abaPacks === 'monkey') {
    return (
      <Modal title="Pack do Editor 4.0 — 163 packs" wide>
        {abas}
        <PacksMonkey />
      </Modal>
    );
  }

  return (
    <Modal title="Conteúdo e armazenamento" wide>
      {abas}
      <div className="card" style={{ marginBottom: 12 }}>
        <h4>Som de clique na interface</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={comCliques}
            onChange={(e) => {
              setComCliques(e.target.checked);
              ligarCliques(e.target.checked);
              useUI.getState().toast(e.target.checked ? 'Sons de clique ligados' : 'Sons de clique desligados', 'ok');
            }}
          />
          Tocar um som curtinho ao clicar nos botões (útil em apresentação e gravação de tela)
        </label>
      </div>
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
  const { user, sessao, setSessao, closeModal, toast, openModal } = useUI();

  const virarPro = () => {
    openModal('checkout');
  };

  /** não existe "cancelar plano" no navegador: as horas compradas continuam
   *  valendo até acabar (quem revoga é o admin, no painel) */
  const desligar = () => {
    toast('Seu plano por horas não tem renovação automática: ele termina sozinho quando as horas acabam.', 'default');
  };

  const sairDaConta = () => {
    sairConta();
    setSessao(null);
    closeModal();
    toast('Você saiu da conta', 'default');
  };
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
            {user && (user.papel === 'admin' || user.horasRestantes > 0) ? (
              <span className="pill paid">{user.plan === 'nenhum' ? 'ADMIN' : user.plan.toUpperCase()}</span>
            ) : (
              <span className="pill free">SEM HORAS</span>
            )}
          </div>
        </div>
      </div>

      <BarraPlano />

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
          {user && (user.papel === 'admin' || user.horasRestantes > 0) ? (
            <button className="btn" style={{ width: '100%', marginTop: 10 }} onClick={desligar}>
              Como funciona o cancelamento
            </button>
          ) : (
            <button className="btn primary" style={{ width: '100%', marginTop: 10 }} onClick={virarPro}>
              Assinar Pro — R$ 29,90/mês
            </button>
          )}
        </div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
          {sessao?.email} · sessão neste navegador
        </div>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={sairDaConta}>
          Sair da conta
        </button>
      </div>

      <div className="hint" style={{ marginTop: 12 }}>
        Pagamento ainda não está conectado — o botão ativa o Pro na hora para você testar tudo. Quando o Mercado
        Pago/Stripe for ligado, a cobrança passa a ser verificada no servidor antes de liberar o plano.
      </div>
    </Modal>
  );
}
