import { useEffect, useMemo, useState } from 'react';
import { CATALOGO_DRIVE, CATEGORIAS_PACK, VAULT_DRIVE, resumoCatalogo, type PackDrive } from '../data/catalogo';
import { useUI } from '../store/ui';
import {
  baixarParaEditor,
  baixarVarios,
  cacheVencido,
  lerCache,
  lerPasta,
  varrerAcervo,
  type IndiceDrive,
  type ItemDrive,
} from '../lib/driveIndex';

const corPorCategoria: Record<string, [string, string]> = {
  audio: ['#818cf8', '#3730a3'],
  video: ['#22d3ee', '#0e7490'],
  imagem: ['#fbbf24', '#b45309'],
  template: ['#f472b6', '#9d174d'],
  overlay: ['#34d399', '#065f46'],
  lut: ['#a78bfa', '#5b21b6'],
  fonte: ['#f87171', '#991b1b'],
  projeto: ['#94a3b8', '#334155'],
};

const icone = (t: string) => (t === 'video' ? '▶' : t === 'audio' ? '♪' : t === 'image' ? '▣' : '◫');

/* ============================================================
   NAVEGADOR DO ACERVO DO DRIVE — baixa de verdade para o editor
   ============================================================ */
function NavegadorDrive() {
  const { toast } = useUI();
  const [indice, setIndice] = useState<IndiceDrive | null>(() => lerCache());
  const [varrendo, setVarrendo] = useState(false);
  const [prog, setProg] = useState<{ pasta: string; lidas: number; total: number; itens: number } | null>(null);
  const [pasta, setPasta] = useState<string>('todas');
  const [tipo, setTipo] = useState<'todos' | 'video' | 'audio' | 'image'>('todos');
  const [busca, setBusca] = useState('');
  const [baixando, setBaixando] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);

  const varrer = async (silencioso = false) => {
    setVarrendo(true);
    try {
      const idx = await varrerAcervo(
        VAULT_DRIVE.map((p) => ({ id: p.pastaId, nome: p.nome })),
        (p) =>
          setProg({
            pasta: p.pastaAtual,
            lidas: p.pastasLidas,
            total: p.totalPastas,
            itens: p.itens,
          }),
        (parcial) => setIndice({ atualizadoEm: Date.now(), itens: parcial, pastasLidas: 0, falhas: [] }),
      );
      setIndice(idx);
      if (idx.itens.length) {
        toast(`${idx.itens.length.toLocaleString('pt-BR')} arquivos indexados de ${idx.pastasLidas} pasta(s)`, 'ok');
      } else {
        toast('O Drive não devolveu arquivos. Verifique se as pastas estão públicas.', 'warn');
      }
    } catch (e) {
      toast(`Falha ao ler o Drive: ${(e as Error).message}`, 'err');
    } finally {
      setVarrendo(false);
      setProg(null);
      if (silencioso) toast('Índice atualizado', 'ok');
    }
  };

  /* primeira visita: se não há índice, varre sozinho */
  useEffect(() => {
    if (cacheVencido(indice) && !varrendo) void varrer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const arquivos = indice?.itens ?? [];
  const pastas = useMemo(() => Array.from(new Set(arquivos.map((a) => a.pasta))).sort(), [arquivos]);
  const contagem = useMemo(() => {
    const m: Record<string, number> = { todos: arquivos.length, video: 0, audio: 0, image: 0 };
    arquivos.forEach((a) => {
      if (a.tipo === 'video') m.video += 1;
      else if (a.tipo === 'audio') m.audio += 1;
      else if (a.tipo === 'image') m.image += 1;
    });
    return m;
  }, [arquivos]);

  const filtrados = arquivos.filter((a) => {
    const okPasta = pasta === 'todas' || a.pasta === pasta;
    const okTipo = tipo === 'todos' || a.tipo === tipo;
    const okBusca = !busca || a.nome.toLowerCase().includes(busca.toLowerCase());
    return okPasta && okTipo && okBusca;
  });
  const porPagina = 60;
  const visiveis = filtrados.slice(0, pagina * porPagina);
  const uteis = filtrados.filter((a) => a.tipo !== 'outro');

  const baixar = async (item: ItemDrive) => {
    setBaixando(item.id);
    const ok = await baixarParaEditor(item);
    setBaixando(null);
    if (ok) window.dispatchEvent(new Event('vortex:fechar-gaveta'));
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0 }}>Acervo do seu Drive</h4>
            <p style={{ margin: '3px 0 0' }}>
              {arquivos.length > 0
                ? `${arquivos.length.toLocaleString('pt-BR')} arquivos · ${indice?.pastasLidas} pasta(s) varridas`
                : 'Ainda sem índice — a varredura começa automaticamente.'}
            </p>
          </div>
          <button className="btn ghost sm" disabled={varrendo} onClick={() => void varrer(true)}>
            {varrendo ? '…' : '↻ Atualizar'}
          </button>
        </div>

        {varrendo && (
          <div style={{ marginTop: 9 }}>
            <div style={{ height: 6, borderRadius: 4, background: 'var(--bg-4)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.round(((prog?.lidas ?? 0) / Math.max(1, prog?.total ?? 1)) * 100))}%`,
                  background: 'linear-gradient(90deg,#22d3ee,#6366f1)',
                  transition: 'width .3s',
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--txt-2)', marginTop: 4 }}>
              Lendo “{prog?.pasta ?? '…'}” · {prog?.lidas ?? 0}/{prog?.total ?? '?'} pastas ·{' '}
              {(prog?.itens ?? 0).toLocaleString('pt-BR')} arquivos
            </div>
          </div>
        )}

        {!varrendo && arquivos.length === 0 && (
          <div className="hint" style={{ marginTop: 8 }}>
            Se nada aparecer, as pastas estão com download bloqueado. Abra o Drive, clique com o botão direito na
            pasta → <b>Compartilhar</b> → <b>Qualquer pessoa com o link</b>. Depois toque em Atualizar.
          </div>
        )}
      </div>

      {arquivos.length > 0 && (
        <>
          <div className="search-wrap" style={{ marginBottom: 8 }}>
            <input
              className="search"
              placeholder="Buscar arquivo do Drive…"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
            />
          </div>
          <div className="cat-chips" style={{ marginBottom: 8 }}>
            {(['todos', 'video', 'audio', 'image'] as const).map((t) => (
              <button
                key={t}
                className={`chip${tipo === t ? ' active' : ''}`}
                onClick={() => {
                  setTipo(t);
                  setPagina(1);
                }}
              >
                {t === 'todos' ? 'Tudo' : t === 'video' ? 'Vídeos' : t === 'audio' ? 'Áudios' : 'Imagens'} (
                {contagem[t]})
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
            <select
              className="sel-input"
              style={{ flex: 1, fontSize: 11 }}
              value={pasta}
              onChange={(e) => {
                setPasta(e.target.value);
                setPagina(1);
              }}
            >
              <option value="todas">Todas as pastas ({contagem.todos})</option>
              {pastas.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              className="btn primary sm"
              disabled={uteis.length === 0}
              onClick={async () => {
                toast(`Baixando ${Math.min(12, uteis.length)} arquivo(s)…`, 'default');
                const n = await baixarVarios(uteis, 12);
                toast(`${n} arquivo(s) adicionado(s) à aba Mídia`, n ? 'ok' : 'warn');
                if (n) window.dispatchEvent(new Event('vortex:fechar-gaveta'));
              }}
            >
              ↓ 12 primeiros
            </button>
          </div>

          <div className="media-item" style={{ cursor: 'default', opacity: 0.75 }}>
            <div className="media-ico" style={{ background: 'linear-gradient(135deg,#22d3ee,#0e7490)' }}>◫</div>
            <div className="media-info">
              <div className="media-name">{filtrados.length.toLocaleString('pt-BR')} arquivo(s) encontrados</div>
              <div className="media-sub">toque em ↓ para mandar para a aba Mídia</div>
            </div>
          </div>

          {visiveis.map((a) => (
            <div key={a.id} className="media-item" style={{ cursor: 'default' }}>
              <div
                className="media-ico"
                style={{
                  background:
                    a.tipo === 'video'
                      ? 'linear-gradient(135deg,#22d3ee,#0e7490)'
                      : a.tipo === 'audio'
                        ? 'linear-gradient(135deg,#818cf8,#3730a3)'
                        : a.tipo === 'image'
                          ? 'linear-gradient(135deg,#fbbf24,#b45309)'
                          : 'linear-gradient(135deg,#64748b,#1e293b)',
                }}
              >
                {icone(a.tipo)}
              </div>
              <div className="media-info">
                <div className="media-name">{a.nome}</div>
                <div className="media-sub">{a.pasta}</div>
              </div>
              <button
                className="btn ghost sm"
                disabled={a.tipo === 'outro' || baixando === a.id}
                title={a.tipo === 'outro' ? 'Formato não suportado no editor' : 'Baixar para a biblioteca'}
                onClick={() => void baixar(a)}
              >
                {baixando === a.id ? '…' : '↓'}
              </button>
            </div>
          ))}

          {visiveis.length < filtrados.length && (
            <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => setPagina((p) => p + 1)}>
              Mostrar mais ({filtrados.length - visiveis.length} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   ABA "CONTEÚDO" — catálogo + acervo real do Drive
   ============================================================ */
export function CatalogoDrive() {
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState<string>('todas');
  const [detalhe, setDetalhe] = useState<PackDrive | null>(null);
  const [abertos, setAbertos] = useState<{ nome: string; itens: ItemDrive[]; subpastas?: { id: string; nome: string }[] } | null>(null);
  const [carregandoPasta, setCarregandoPasta] = useState(false);
  const { toast } = useUI();
  const resumo = useMemo(resumoCatalogo, []);

  const lista = CATALOGO_DRIVE.filter((p) => {
    const okCat = cat === 'todas' || p.categoria === cat;
    const okBusca =
      !busca ||
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.descricao.toLowerCase().includes(busca.toLowerCase());
    return okCat && okBusca;
  });

  /* abre uma das 17 pastas reais do Drive */
  const abrirPasta = async (id: string, nome: string) => {
    setCarregandoPasta(true);
    setAbertos(null);
    try {
      const { arquivos, pastas } = await lerPasta(id, nome);
      setAbertos({ nome, itens: arquivos, subpastas: pastas });
    } catch (e) {
      toast(`Não consegui abrir “${nome}”: ${(e as Error).message}`, 'err');
    } finally {
      setCarregandoPasta(false);
    }
  };

  if (abertos) {
    const uteis = abertos.itens.filter((i) => i.tipo !== 'outro');
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <button className="btn ghost sm" onClick={() => setAbertos(null)}>
            ← Voltar
          </button>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>{abertos.nome}</div>
        </div>
        <div className="hint" style={{ marginBottom: 10 }}>
          {abertos.itens.length} arquivo(s) nesta pasta. Toque em ↓ para baixar e usar no editor.
        </div>
        {uteis.length > 0 && (
          <button
            className="btn primary"
            style={{ width: '100%', marginBottom: 10 }}
            onClick={async () => {
              toast('Baixando 10 arquivo(s)…', 'default');
              const n = await baixarVarios(uteis, 10);
              toast(`${n} arquivo(s) na aba Mídia`, n ? 'ok' : 'warn');
              if (n) window.dispatchEvent(new Event('vortex:fechar-gaveta'));
            }}
          >
            ↓ Baixar 10 primeiros para a biblioteca
          </button>
        )}
        {(abertos.subpastas ?? []).length > 0 && (
          <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
            {(abertos.subpastas ?? []).map((sp) => (
              <button
                key={sp.id}
                className="btn ghost"
                style={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: 11.5, padding: '6px 9px' }}
                onClick={() => void abrirPasta(sp.id, sp.nome)}
              >
                <span style={{ opacity: 0.7, marginRight: 7 }}>▸</span> {sp.nome}
              </button>
            ))}
          </div>
        )}
        {abertos.itens.length === 0 && (
          <div className="empty-state" style={{ padding: 16, fontSize: 12 }}>
            Esta pasta não tem arquivos soltos — abra uma subpasta acima.
          </div>
        )}
        {abertos.itens.map((a) => (
          <div key={a.id} className="media-item" style={{ cursor: 'default' }}>
            <div className="media-ico" style={{ background: 'linear-gradient(135deg,#22d3ee,#0e7490)' }}>
              {icone(a.tipo)}
            </div>
            <div className="media-info">
              <div className="media-name">{a.nome}</div>
              <div className="media-sub">{a.tipo}</div>
            </div>
            <button
              className="btn ghost sm"
              disabled={a.tipo === 'outro'}
              onClick={() => void baixarParaEditor(a)}
              title="Baixar para a biblioteca"
            >
              ↓
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (detalhe) {
    const g = corPorCategoria[detalhe.categoria] ?? ['#334155', '#0f172a'];
    const pasta = VAULT_DRIVE.find((v) => detalhe.nome.toLowerCase().includes(v.nome.toLowerCase().split(' ')[0]));
    return (
      <div className="modal-body" style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button className="btn ghost sm" onClick={() => setDetalhe(null)}>
            ← Voltar
          </button>
        </div>

        <div
          style={{
            height: 96,
            borderRadius: 11,
            background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
            display: 'grid',
            placeItems: 'center',
            fontSize: 32,
            marginBottom: 12,
          }}
        >
          {icone(detalhe.categoria === 'video' ? 'video' : detalhe.categoria === 'audio' ? 'audio' : 'image')}
        </div>

        <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>{detalhe.nome}</div>
        <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginBottom: 10 }}>
          {detalhe.itens.toLocaleString('pt-BR')} itens · {detalhe.tamanho} · {detalhe.categoria}
        </div>
        <p style={{ fontSize: 12, color: 'var(--txt-1)', lineHeight: 1.55 }}>{detalhe.descricao}</p>

        <button
          className="btn primary"
          style={{ width: '100%', marginTop: 10 }}
          disabled={carregandoPasta || !pasta}
          onClick={() => {
            if (pasta) void abrirPasta(pasta.pastaId, pasta.nome);
            else toast('Esta coleção não está ligada a uma pasta pública do Drive', 'warn');
          }}
        >
          {carregandoPasta ? 'Abrindo pasta…' : 'Abrir pasta e baixar arquivos'}
        </button>
        {!pasta && (
          <div className="hint" style={{ marginTop: 8 }}>
            Coleção apenas catalogada. Use <b>Acervo do seu Drive</b> abaixo para varrer todas as pastas públicas.
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <NavegadorDrive />

      <div style={{ height: 1, background: 'var(--line)', margin: '16px 0 12px' }} />
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 2 }}>Coleções catalogadas</div>
      <div style={{ fontSize: 11, color: 'var(--txt-2)', marginBottom: 8 }}>
        {resumo.packs} coleções · {resumo.itens.toLocaleString('pt-BR')} itens · {VAULT_DRIVE.length} pastas
        do Drive
      </div>

      <div className="search-wrap" style={{ marginBottom: 10 }}>
        <input
          className="search"
          placeholder="Buscar no catálogo do Drive…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="cat-chips" style={{ marginBottom: 10 }}>
        <button className={`chip${cat === 'todas' ? ' active' : ''}`} onClick={() => setCat('todas')}>
          Todas
        </button>
        {CATEGORIAS_PACK.map((c) => (
          <button key={c.id} className={`chip${cat === c.id ? ' active' : ''}`} onClick={() => setCat(c.id)}>
            {c.nome}
          </button>
        ))}
      </div>

      {/* as 17 pastas reais */}
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.4px', color: 'var(--txt-2)', margin: '4px 0 6px' }}>
        PASTAS DO MEU DRIVE
      </div>
      <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
        {VAULT_DRIVE.map((v) => (
          <button
            key={v.id}
            className="btn ghost"
            style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '7px 9px', fontSize: 11.5 }}
            disabled={carregandoPasta}
            onClick={() => void abrirPasta(v.pastaId, v.nome)}
          >
            <span style={{ opacity: 0.7, marginRight: 7 }}>▸</span>
            {v.nome}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 7 }}>
        {lista.map((p) => {
          const selo = corPorCategoria[p.categoria] ?? ['#64748b', '#1e293b'];
          return (
            <button
              key={p.id}
              className="btn ghost"
              style={{ justifyContent: 'flex-start', padding: 8, textAlign: 'left' }}
              onClick={() => setDetalhe(p)}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 7,
                  background: `linear-gradient(135deg, ${selo[0]}, ${selo[1]})`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                  marginRight: 9,
                }}
              >
                ◫
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.nome}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--txt-2)' }}>
                  {p.itens.toLocaleString('pt-BR')} itens · {p.tamanho}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {lista.length === 0 && (
        <div className="empty-state" style={{ padding: 20, fontSize: 12 }}>
          Nada encontrado no catálogo.
        </div>
      )}
    </>
  );
}
