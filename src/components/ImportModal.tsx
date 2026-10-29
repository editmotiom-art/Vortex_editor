import { useEffect, useState } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import {
  captureFromTab,
  fetchRemote,
  getExtensionId,
  pingExtension,
  readImportParam,
  saveExtensionId,
  type ImportedMedia,
  type RemoteItem,
} from '../lib/importMedia';
import { fmtBytes, fmtTime } from '../lib/anim';

interface Props {
  onImported: (medias: ImportedMedia[]) => void;
}

export function ImportModal({ onImported }: Props) {
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const [extId, setExtId] = useState(getExtensionId());
  const [extStatus, setExtStatus] = useState<'desconhecida' | 'ok' | 'off'>('desconhecida');
  const [extVersion, setExtVersion] = useState('');
  const [link, setLink] = useState('');
  const [items, setItems] = useState<RemoteItem[]>([]);
  const [busy, setBusy] = useState('');
  const [progresso, setProgresso] = useState('');

  useEffect(() => {
    void (async () => {
      const r = await pingExtension(extId);
      setExtStatus(r.ok ? 'ok' : 'off');
      setExtVersion(r.versao ?? '');
    })();
    // payload vindo da extensão pela URL
    const daUrl = readImportParam();
    if (daUrl.length) {
      setItems(daUrl);
      history.replaceState({}, '', location.pathname);
    }
  }, []);

  const checar = async () => {
    saveExtensionId(extId);
    const r = await pingExtension(extId);
    setExtStatus(r.ok ? 'ok' : 'off');
    setExtVersion(r.versao ?? '');
    toast(r.ok ? `Extensão conectada (v${r.versao})` : 'Extensão não respondeu — confira o ID', r.ok ? 'ok' : 'warn');
  };

  const capturar = async () => {
    setBusy('capturar');
    try {
      const itens = await captureFromTab(extId);
      setItems(itens);
      toast(itens.length ? `${itens.length} mídia(s) capturada(s)` : 'Nada capturado na aba ativa', itens.length ? 'ok' : 'warn');
    } finally {
      setBusy('');
    }
  };

  const importarLink = () => {
    const alvo = link.trim();
    if (!/^https?:\/\//i.test(alvo)) {
      toast('Cole um link começando com http:// ou https://', 'warn');
      return;
    }
    setItems((prev) => [...prev, { url: alvo }]);
    setLink('');
  };

  const importarTudo = async () => {
    if (!items.length) return;
    setBusy('importar');
    const medias: ImportedMedia[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      setProgresso(`Baixando ${i + 1} de ${items.length}…`);
      try {
        const m = await fetchRemote(it);
        medias.push(m);
      } catch {
        toast(`Falhou: ${it.name || it.url}`, 'err');
      }
    }
    if (medias.length) {
      onImported(medias);
      toast(`${medias.length} mídia(s) adicionada(s) à biblioteca`, 'ok');
      close();
    }
    setBusy('');
    setProgresso('');
    setItems([]);
  };

  return (
    <div className="overlay" onClick={close}>
      <div className="modal" style={{ width: 'min(820px,100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Importar mídia</div>
          <div className="spacer" />
          <button className="btn ghost icon" onClick={close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {/* ---------- extensão ---------- */}
          <div className="card" style={{ marginBottom: 12 }}>
            <h4>
              Extensão “Vortex Mídia”{' '}
              {extStatus === 'ok' ? (
                <span className="pill free">CONECTADA {extVersion && `v${extVersion}`}</span>
              ) : extStatus === 'off' ? (
                <span className="pill paid">NÃO ENCONTRADA</span>
              ) : null}
            </h4>
            <p>
              Instale a extensão (pasta <code>extension/</code> do projeto → carregar sem empacotamento) e cole o ID
              dela aqui. Com ela você captura imagem, vídeo e áudio de qualquer página.
            </p>
            <div className="row" style={{ marginTop: 9 }}>
              <input
                className="sel-input"
                placeholder="ID da extensão (32 letras)"
                value={extId}
                onChange={(e) => setExtId(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={checar}>
                Conectar
              </button>
              <button className="btn primary" onClick={capturar} disabled={busy !== '' || extStatus !== 'ok'}>
                {busy === 'capturar' ? 'Capturando…' : 'Capturar aba ativa'}
              </button>
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--txt-2)', marginTop: 7 }}>
              Também funciona sem ID: abra a extensão na página, clique em <b>“→ Editor”</b> e o item cai aqui
              automaticamente.
            </p>
          </div>

          {/* ---------- link ---------- */}
          <div className="card" style={{ marginBottom: 12 }}>
            <h4>Colar link direto</h4>
            <p>URL de imagem, MP4, MP3 ou WAV acessível publicamente. O arquivo é baixado para a memória e usado na timeline.</p>
            <div className="row" style={{ marginTop: 9 }}>
              <input
                className="sel-input"
                placeholder="https://exemplo.com/video.mp4"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && importarLink()}
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={importarLink}>
                Adicionar
              </button>
            </div>
          </div>

          {/* ---------- lista ---------- */}
          {items.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.6px', color: 'var(--txt-2)', marginBottom: 7 }}>
                {items.length} ITEM(NS) NA FILA
              </div>
              <div style={{ maxHeight: 240, overflow: 'auto', marginBottom: 10 }}>
                {items.map((it, i) => (
                  <div key={`${it.url}-${i}`} className="media-item">
                    <div
                      className="media-ico"
                      style={{
                        background:
                          it.type === 'video'
                            ? 'linear-gradient(135deg,#22d3ee,#0e7490)'
                            : it.type === 'audio'
                              ? 'linear-gradient(135deg,#818cf8,#3730a3)'
                              : 'linear-gradient(135deg,#fbbf24,#b45309)',
                      }}
                    >
                      {it.type === 'video' ? '▶' : it.type === 'audio' ? '♪' : '▣'}
                    </div>
                    <div className="media-info">
                      <div className="media-name">{it.name || it.url.slice(0, 60)}</div>
                      <div className="media-sub">
                        {it.type || 'auto'}
                        {it.width ? ` · ${it.width}×${it.height}` : ''}
                      </div>
                    </div>
                    <button className="btn ghost sm" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button className="btn primary" style={{ width: '100%' }} onClick={importarTudo} disabled={busy !== ''}>
                {busy === 'importar' ? progresso || 'Importando…' : `Importar ${items.length} mídia(s)`}
              </button>
            </div>
          )}

          {items.length === 0 && (
            <div className="hint">
              <b>Sobre YouTube, TikTok, Instagram e Facebook:</b> essas plataformas não expõem o arquivo na página
              (DRM + segmentação). A captura direta não as alcança — é preciso um motor de resolução do seu lado.
              O editor continua funcionando com qualquer arquivo que você já tenha no computador (Importar).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function shortTime(ms: number): string {
  return fmtTime(ms);
}

export function humanSize(b: number): string {
  return fmtBytes(b);
}
