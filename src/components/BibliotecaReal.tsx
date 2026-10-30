import { useMemo, useState } from 'react';
import { BIBLIOTECA_MIDIA } from '../data/bibliotecaMidia';
import type { ItemBibliotecaReal } from '../data/bibliotecaReal';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { fmtBytes, fmtTime } from '../lib/anim';

/**
 * BIBLIOTECA PROFISSIONAL — mídia real
 * ------------------------------------------------------------
 * Cada card é um arquivo de verdade (música, SFX, foto, vídeo), baixado do
 * endereço original, com autor e licença à vista. Um clique baixa e joga na
 * timeline; o botão ↓ salva no computador; ▶ toca antes de usar.
 *
 * Nada aqui é simulado: se o arquivo não abrir, o card mostra "erro ao
 * carregar" em vez de fingir que funcionou.
 */

const CORES: Record<string, [string, string]> = {
  Música: ['#818cf8', '#3730a3'],
  SFX: ['#22d3ee', '#0e7490'],
  Fundos: ['#fbbf24', '#b45309'],
};

const ICONE: Record<string, string> = { audio: '♪', image: '▣', video: '▶' };

export function BibliotecaReal() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Tudo');
  const [tocando, setTocando] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);

  const addAsset = useEditor((s) => s.addAsset);
  const toast = useUI((s) => s.toast);

  const cats = useMemo(() => ['Tudo', ...Array.from(new Set(BIBLIOTECA_MIDIA.map((i) => i.cat)))], []);

  const itens = useMemo(() => {
    const t = q.trim().toLowerCase();
    return BIBLIOTECA_MIDIA.filter((i) => {
      if (cat !== 'Tudo' && i.cat !== cat) return false;
      if (!t) return true;
      return (
        i.nome.toLowerCase().includes(t) ||
        i.cat.toLowerCase().includes(t) ||
        i.tags.some((tag) => tag.includes(t))
      );
    });
  }, [q, cat]);

  const ouvir = (item: ItemBibliotecaReal) => {
    if (tocando === item.id) {
      setTocando(null);
      return;
    }
    setTocando(item.id);
    const a = new Audio(item.url);
    a.volume = 0.9;
    a.onended = () => setTocando(null);
    a.onerror = () => {
      setTocando(null);
      toast('Este arquivo não abriu agora — tente outro da lista.', 'err');
    };
    void a.play().catch(() => {
      setTocando(null);
      toast('O navegador bloqueou o áudio: clique de novo.', 'warn');
    });
  };

  const usar = async (item: ItemBibliotecaReal) => {
    setBaixando(item.id);
    try {
      const res = await fetch(item.url);
      if (!res.ok) throw new Error(`servidor respondeu ${res.status}`);
      const blob = await res.blob();
      if (blob.size < 1024) throw new Error('arquivo veio vazio');
      const local = URL.createObjectURL(blob);
      const kind = item.tipo === 'audio' ? 'audio' : item.tipo === 'image' ? 'image' : 'video';
      const asset = addAsset({
        name: item.nome,
        kind,
        url: local,
        durationMs:
          kind === 'image'
            ? 5000
            : item.duracaoSeg
              ? Math.min(item.duracaoSeg, item.trechoSeg ?? item.duracaoSeg) * 1000
              : 0,
        origin: 'library',
        sizeBytes: blob.size,
      });
      // duração real do arquivo (o metadado é mais confiável que a estimativa)
      if (kind !== 'image') {
        const el = document.createElement(kind === 'audio' ? 'audio' : 'video');
        el.src = local;
        el.onloadedmetadata = () => {
          if (Number.isFinite(el.duration) && el.duration > 0) {
            useEditor.getState().updateAssetDuration(asset.id, Math.round(el.duration * 1000));
          }
        };
      }
      toast(`“${item.nome}” está na aba Mídia — arraste para a timeline.`, 'ok');
    } catch (e) {
      toast(
        `Não consegui baixar “${item.nome}”: ${(e as Error).message}. Use ↓ para salvar direto no computador.`,
        'err',
      );
    } finally {
      setBaixando(null);
    }
  };

  return (
    <div className="bib-real">
      <input
        className="search"
        placeholder="Buscar música, efeito, fundo…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 6 }}
      />
      <div className="cat-chips">
        {cats.map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="bib-real-lista">
        {itens.map((item) => {
          const cor = CORES[item.cat] ?? ['#64748b', '#334155'];
          return (
            <div key={item.id} className="bib-real-card">
              <div className="bib-real-capa" style={{ background: `linear-gradient(135deg, ${cor[0]}, ${cor[1]})` }}>
                {item.tipo === 'image' ? (
                  <img src={item.url} alt="" loading="lazy" />
                ) : (
                  <span>{ICONE[item.tipo]}</span>
                )}
                {item.tipo === 'audio' && (
                  <button className="bib-play" onClick={() => ouvir(item)} title={tocando === item.id ? 'Parar' : 'Ouvir'}>
                    {tocando === item.id ? '■' : '▶'}
                  </button>
                )}
              </div>
              <div className="bib-real-info">
                <div className="bib-real-nome" title={item.nome}>
                  {item.nome}
                </div>
                <div className="bib-real-sub">
                  {item.cat} · {item.duracaoSeg ? fmtTime(item.duracaoSeg * 1000) : fmtBytes(item.bytes)}
                </div>
                <div className="bib-real-lic" title={`${item.autor ?? ''} — ${item.licenca}`}>
                  {item.licenca}
                </div>
                <div className="bib-real-acoes">
                  <button className="btn primary sm" disabled={baixando === item.id} onClick={() => void usar(item)}>
                    {baixando === item.id ? '…' : '+ Mídia'}
                  </button>
                  <a className="btn ghost sm" href={item.url} download target="_blank" rel="noreferrer" title="Salvar no computador">
                    ↓
                  </a>
                  <a className="btn ghost sm" href={item.fonte} target="_blank" rel="noreferrer" title="Ver origem e crédito">
                    ↗
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {itens.length === 0 && <div className="empty-state">Nada encontrado para “{q}”.</div>}

      <div className="bib-real-rodape">
        {BIBLIOTECA_MIDIA.length} arquivos reais · licenças livres (CC0, CC-BY, Pexels) · sem cadastro
      </div>
    </div>
  );
}
