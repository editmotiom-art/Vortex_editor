import { useEffect, useState } from 'react';
import { useUI } from '../store/ui';
import {
  fetchRemote,
  minerarSite,
  proxyUrl,
  readImportParam,
  type ImportedMedia,
  type RemoteItem,
} from '../lib/importMedia';

interface Props {
  onImported: (medias: ImportedMedia[]) => void;
}

const icone = (t?: string) => (t === 'video' ? '▶' : t === 'audio' ? '♪' : '▣');

const cor = (t?: string) =>
  t === 'video'
    ? 'linear-gradient(135deg,#22d3ee,#0e7490)'
    : t === 'audio'
      ? 'linear-gradient(135deg,#818cf8,#3730a3)'
      : 'linear-gradient(135deg,#fbbf24,#b45309)';

export function ImportModal({ onImported }: Props) {
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);

  const [aba, setAba] = useState<'site' | 'link'>('site');
  const [site, setSite] = useState('');
  const [link, setLink] = useState('');
  const [itens, setItens] = useState<RemoteItem[]>([]);
  const [pagina, setPagina] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [baixando, setBaixando] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());

  useEffect(() => {
    const daUrl = readImportParam();
    if (daUrl.length) {
      setItens(daUrl);
      setSel(new Set(daUrl.map((i) => i.url)));
      history.replaceState({}, '', location.pathname);
    }
  }, []);

  /* ---------------- buscar mídias de um site ---------------- */
  const buscar = async () => {
    const alvo = site.trim();
    if (!/^https?:\/\//i.test(alvo)) {
      toast('Cole o endereço completo, começando com https://', 'warn');
      return;
    }
    setBuscando(true);
    setItens([]);
    setSel(new Set());
    try {
      const r = await minerarSite(alvo);
      if (!r.ok) {
        toast(r.erro || 'Não consegui ler essa página', 'err');
        setPagina('');
      } else {
        setItens(r.itens);
        setPagina(r.pagina || alvo);
        setSel(new Set(r.itens.slice(0, 40).map((i) => i.url)));
        toast(
          r.itens.length ? `${r.itens.length} mídia(s) encontrada(s)` : 'Nenhuma mídia encontrada nessa página',
          r.itens.length ? 'ok' : 'warn',
        );
      }
    } catch {
      toast('Falha de conexão com o servidor de captura', 'err');
    } finally {
      setBuscando(false);
    }
  };

  /* ---------------- adicionar link direto ---------------- */
  const adicionarLink = () => {
    const alvo = link.trim();
    if (!/^https?:\/\//i.test(alvo)) {
      toast('O link precisa começar com http:// ou https://', 'warn');
      return;
    }
    setItens((p) => [{ url: alvo }, ...p]);
    setSel((p) => new Set(p).add(alvo));
    setLink('');
    setAba('site');
  };

  /* ---------------- importar selecionados ---------------- */
  const importar = async () => {
    const fila = itens.filter((i) => sel.has(i.url));
    if (!fila.length) return;
    setBaixando(`0 / ${fila.length}`);
    const medias: ImportedMedia[] = [];
    const falhas: string[] = [];

    for (let i = 0; i < fila.length; i += 1) {
      setBaixando(`${i + 1} / ${fila.length}`);
      try {
        const m = await fetchRemote(fila[i]);
        medias.push(m);
      } catch {
        falhas.push(fila[i].name || fila[i].url);
      }
    }

    if (medias.length) {
      onImported(medias);
      toast(`${medias.length} mídia(s) adicionada(s) à biblioteca`, 'ok');
    }
    if (falhas.length) toast(`${falhas.length} arquivo(s) não puderam ser lidos`, 'warn');
    setBaixando('');
    if (medias.length && !falhas.length) close();
  };

  const alternar = (url: string) =>
    setSel((p) => {
      const n = new Set(p);
      n.has(url) ? n.delete(url) : n.add(url);
      return n;
    });

  const todos = () =>
    setSel((p) => (p.size === itens.length ? new Set() : new Set(itens.map((i) => i.url))));

  const contagem = { video: 0, audio: 0, image: 0 } as Record<string, number>;
  itens.forEach((i) => {
    contagem[i.type ?? 'image'] = (contagem[i.type ?? 'image'] ?? 0) + 1;
  });

  return (
    <div className="overlay" onClick={close}>
      <div className="modal" style={{ width: 'min(880px,100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Baixar mídia de um site</div>
          <div className="spacer" />
          <button className="btn ghost icon" onClick={close}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* abas */}
          <div className="tabs" style={{ marginBottom: 12 }}>
            <button className={aba === 'site' ? 'tab active' : 'tab'} onClick={() => setAba('site')}>
              De um site
            </button>
            <button className={aba === 'link' ? 'tab active' : 'tab'} onClick={() => setAba('link')}>
              Link direto
            </button>
          </div>

          {aba === 'site' && (
            <>
              <div className="row">
                <input
                  className="sel-input"
                  style={{ flex: 1 }}
                  placeholder="https://site.com/pagina-com-video"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscar()}
                />
                <button className="btn primary" onClick={buscar} disabled={buscando}>
                  {buscando ? 'Lendo página…' : 'Buscar mídias'}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--txt-2)', marginTop: 7, lineHeight: 1.6 }}>
                Funciona em sites públicos (notícias, blogs, bancos de imagem, HTML5 sem DRM).
                YouTube, Instagram, TikTok e Facebook <b>não</b> liberam o arquivo — o vídeo é entregue
                criptografado em pedaços e nenhuma ferramenta lê isso sem servidor próprio.
              </p>
            </>
          )}

          {aba === 'link' && (
            <>
              <div className="row">
                <input
                  className="sel-input"
                  style={{ flex: 1 }}
                  placeholder="https://exemplo.com/video.mp4"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && adicionarLink()}
                />
                <button className="btn primary" onClick={adicionarLink}>
                  Adicionar
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--txt-2)', marginTop: 7, lineHeight: 1.6 }}>
                Endereço direto de um arquivo: JPG, PNG, WEBP, MP4, WEBM, MP3, WAV.
              </p>
            </>
          )}

          {/* ---------- resultados ---------- */}
          {itens.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <button className="btn ghost sm" onClick={todos}>
                  {sel.size === itens.length ? 'Desmarcar tudo' : 'Marcar tudo'}
                </button>
                <span style={{ fontSize: 11, color: 'var(--txt-2)' }}>
                  {contagem.video || 0} vídeo(s) · {contagem.audio || 0} áudio(s) · {contagem.image || 0} imagem(ns)
                </span>
                <div className="spacer" />
                {pagina && (
                  <a href={pagina} target="_blank" rel="noreferrer" className="btn ghost sm">
                    Abrir site
                  </a>
                )}
              </div>

              <div style={{ maxHeight: 300, overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {itens.map((it) => {
                  const marcado = sel.has(it.url);
                  return (
                    <div
                      key={it.url}
                      className="media-item"
                      onClick={() => alternar(it.url)}
                      style={{
                        cursor: 'pointer',
                        borderColor: marcado ? 'var(--accent)' : 'transparent',
                        background: marcado ? 'rgba(34,211,238,.08)' : undefined,
                      }}
                      title={it.url}
                    >
                      <div className="media-ico" style={{ background: cor(it.type) }}>
                        {icone(it.type)}
                      </div>
                      <div className="media-info">
                        <div className="media-name">{it.name || it.url.split('/').pop()?.slice(0, 44) || 'mídia'}</div>
                        <div className="media-sub">
                          {it.type ?? 'auto'}
                          {it.width ? ` · ${it.width}×${it.height}` : ''}
                          {marcado ? ' · ✓' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn primary"
                style={{ width: '100%', marginTop: 10 }}
                onClick={importar}
                disabled={baixando !== '' || sel.size === 0}
              >
                {baixando
                  ? `Baixando ${baixando}…`
                  : `Importar ${sel.size} mídia(s) para a biblioteca`}
              </button>
            </div>
          )}

          {/* dica quando a página bloqueia */}
          {!buscando && itens.length === 0 && aba === 'site' && (
            <div className="hint" style={{ marginTop: 14 }}>
              <b>Se um site bloquear a leitura:</b> abra a página, clique com o botão direito no vídeo
              ou imagem → <b>Copiar endereço da imagem/vídeo</b> → cole na aba <b>Link direto</b>.
              Esse caminho sempre funciona.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** abrir no navegador com proxy (usado por outros componentes) */
export const proxied = proxyUrl;
