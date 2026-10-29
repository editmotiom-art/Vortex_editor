import { useMemo, useState } from 'react';
import { CATALOGO_DRIVE, CATEGORIAS_PACK, PLANO_IMPORTACAO, VAULT_DRIVE, resumoCatalogo, type PackDrive } from '../data/catalogo';
import { useUI } from '../store/ui';

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

const seloStatus = (s: PackDrive['status']) => {
  switch (s) {
    case 'pronto':
      return { txt: 'PRONTO', cor: 'var(--ok)' };
    case 'catalogo':
      return { txt: 'CATÁLOGO', cor: 'var(--acc)' };
    case 'indice':
      return { txt: 'ÍNDICE', cor: 'var(--warn)' };
    default:
      return { txt: 'PENDENTE', cor: 'var(--txt-2)' };
  }
};

/* ============================================================
   ABA "CONTEÚDO" — catálogo do Drive dentro do editor
   ============================================================ */
export function CatalogoDrive() {
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState<string>('todas');
  const [detalhe, setDetalhe] = useState<PackDrive | null>(null);
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

  if (detalhe) {
    const selo = seloStatus(detalhe.status);
    const g = corPorCategoria[detalhe.categoria] ?? ['#334155', '#0f172a'];
    return (
      <div className="modal-body" style={{ padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button className="btn ghost sm" onClick={() => setDetalhe(null)}>
            ← Voltar
          </button>
        </div>

        <div
          style={{
            height: 110,
            borderRadius: 10,
            background: `linear-gradient(135deg,${g[0]},${g[1]})`,
            display: 'flex',
            alignItems: 'flex-end',
            padding: 14,
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 19, fontWeight: 900, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.5)' }}>
              {detalhe.nome}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.85)', marginTop: 2 }}>
              {detalhe.itens.toLocaleString('pt-BR')} itens · {detalhe.tamanho}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span className="pill free" style={{ color: selo.cor, borderColor: selo.cor }}>
            {selo.txt}
          </span>
          <span className="pill free">{CATEGORIAS_PACK.find((c) => c.id === detalhe.categoria)?.nome}</span>
        </div>

        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--txt-1)', marginBottom: 16 }}>{detalhe.descricao}</p>

        <div className="card" style={{ marginBottom: 12 }}>
          <h4>Como o editor usa</h4>
          <p style={{ marginTop: 4 }}>{detalhe.uso}</p>
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <h4>Situação</h4>
          <p style={{ marginTop: 4, lineHeight: 1.7 }}>
            {detalhe.status === 'pronto' &&
              'Metadados cadastrados e caminho de instalação definido. Os arquivos baixam sob demanda do Drive na primeira vez que forem usados.'}
            {detalhe.status === 'catalogo' &&
              'Catalogado por pasta. Para usar no editor é preciso liberar o download do Drive (link público) ou copiar para o armazenamento do site.'}
            {detalhe.status === 'indice' &&
              'Acervo muito grande: fica apenas indexado, com link para o Drive. Não é copiado para o editor.'}
            {detalhe.status === 'pendente' && 'Ainda precisa ser processado (transcrição/indexação).'}
          </p>
        </div>

        <button
          className="btn primary"
          style={{ width: '100%' }}
          onClick={() => {
            toast(
              detalhe.status === 'pronto'
                ? `Pack "${detalhe.nome}" marcado para instalação`
                : 'Este pack precisa de liberação de acesso no Drive',
              detalhe.status === 'pronto' ? 'ok' : 'warn',
            );
          }}
        >
          {detalhe.status === 'pronto' ? 'Instalar pack' : 'Ver instruções de liberação'}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="search-wrap" style={{ marginBottom: 10 }}>
        <input
          className="search"
          placeholder="Buscar no catálogo do Drive…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--txt-2)', marginBottom: 10, flexWrap: 'wrap' }}>
        <span>
          <b style={{ color: 'var(--txt-1)' }}>{resumo.packs}</b> packs
        </span>
        <span>·</span>
        <span>
          <b style={{ color: 'var(--txt-1)' }}>{resumo.itens.toLocaleString('pt-BR')}</b> itens mapeados
        </span>
        <span>·</span>
        <span>
          <b style={{ color: 'var(--ok)' }}>{resumo.prontos}</b> prontos
        </span>
      </div>

      <div className="cat-chips" style={{ marginBottom: 12 }}>
        <button className={`chip${cat === 'todas' ? ' active' : ''}`} onClick={() => setCat('todas')}>
          Todas
        </button>
        {CATEGORIAS_PACK.map((c) => (
          <button key={c.id} className={`chip${cat === c.id ? ' active' : ''}`} onClick={() => setCat(c.id)}>
            {c.nome}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        {lista.map((p) => {
          const selo = seloStatus(p.status);
          const g = corPorCategoria[p.categoria] ?? ['#334155', '#0f172a'];
          return (
            <button
              key={p.id}
              onClick={() => setDetalhe(p)}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                textAlign: 'left',
                padding: 10,
                borderRadius: 9,
                border: '1px solid var(--line)',
                background: 'var(--bg-2)',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  background: `linear-gradient(135deg,${g[0]},${g[1]})`,
                  flex: 'none',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 15,
                  color: '#fff',
                }}
              >
                {CATEGORIAS_PACK.find((c) => c.id === p.categoria)?.icone ?? '▣'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.nome}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--txt-2)' }}>
                  {p.itens.toLocaleString('pt-BR')} itens · {p.tamanho}
                </div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.5px', color: selo.cor, border: `1px solid ${selo.cor}`, borderRadius: 4, padding: '2px 5px' }}>
                {selo.txt}
              </span>
            </button>
          );
        })}
      </div>

      {lista.length === 0 && (
        <div className="empty-state" style={{ padding: 20, fontSize: 12 }}>
          Nada encontrado no catálogo.
        </div>
      )}

      <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.6px', color: 'var(--txt-2)', margin: '16px 0 8px' }}>
        VAULT DO SEU DRIVE · {VAULT_DRIVE.length} PASTAS
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {VAULT_DRIVE.map((v) => {
          const g = corPorCategoria[v.categoria] ?? ['#334155', '#0f172a'];
          return (
            <div
              key={v.id}
              title={v.uso}
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                padding: '7px 9px',
                borderRadius: 8,
                border: '1px solid var(--line)',
                background: 'var(--bg-2)',
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: `linear-gradient(135deg,${g[0]},${g[1]})`,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  color: '#fff',
                  flex: 'none',
                }}
              >
                {CATEGORIAS_PACK.find((c) => c.id === v.categoria)?.icone ?? '▣'}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.nome}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--txt-2)' }}>{v.categoria}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hint" style={{ marginTop: 14 }}>
        <b>Plano de importação em 5 etapas</b>
        <div style={{ marginTop: 6, lineHeight: 1.8 }}>
          {PLANO_IMPORTACAO.map((e) => (
            <div key={e.etapa}>
              <b style={{ color: 'var(--acc)' }}>{e.etapa}.</b> {e.titulo} — <span style={{ color: 'var(--txt-2)' }}>{e.acao}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
