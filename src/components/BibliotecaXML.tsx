import { useEffect, useMemo, useRef, useState } from 'react';
import { useUI } from '../store/ui';
import { useEditor } from '../store/editor';
import {
  importarLote,
  limparTemplates,
  listarTemplates,
  removerTemplate,
  salvarLote,
  type ProgressoLote,
  type TemplateXML,
} from '../lib/bibliotecaXML';
import { fmtTime } from '../lib/anim';

/* ============================================================
   BIBLIOTECA DE TEMPLATES XML (importação em lote)
   ============================================================ */

export function BibliotecaXML({ onAplicar }: { onAplicar?: () => void }) {
  const { toast, closeModal } = useUI();
  const [templates, setTemplates] = useState<TemplateXML[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('Todas');
  const [lendo, setLendo] = useState<ProgressoLote | null>(null);
  const [salvando, setSalvando] = useState<{ feito: number; total: number } | null>(null);
  const [pendencias, setPendencias] = useState<TemplateXML[]>([]);
  const [erros, setErros] = useState<{ arquivo: string; motivo: string }[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const recarregar = async () => {
    setTemplates(await listarTemplates());
    setCarregando(false);
  };

  useEffect(() => {
    void recarregar();
  }, []);

  /* ---------------- leitura em lote ---------------- */
  const lerArquivos = async (arquivos: File[]) => {
    const xmls = arquivos.filter((f) => /\.xml$/i.test(f.name));
    if (!xmls.length) {
      toast('Selecione arquivos .xml do Alight Motion', 'warn');
      return;
    }
    setErros([]);
    setPendencias([]);
    const r = await importarLote(xmls, (p) => setLendo(p));
    setLendo(null);
    setPendencias(r.importados);
    setErros(r.erros);
    toast(
      `${r.importados.length} template(s) lido(s)${r.erros.length ? ` · ${r.erros.length} com erro` : ''}`,
      r.importados.length ? 'ok' : 'warn',
    );
  };

  const confirmarImportacao = async () => {
    if (!pendencias.length) return;
    let feito = 0;
    setSalvando({ feito: 0, total: pendencias.length });
    const n = await salvarLote(pendencias, (f, t) => setSalvando({ feito: f, total: t }));
    feito = n;
    setSalvando(null);
    setPendencias([]);
    await recarregar();
    toast(`${feito} template(s) adicionado(s) à biblioteca`, 'ok');
  };

  /* ---------------- aplicar no editor ---------------- */
  const aplicar = (t: TemplateXML) => {
    const doc = structuredClone(t.doc);
    doc.id = `prj_${Math.random().toString(36).slice(2, 10)}`;
    doc.name = t.nome;
    doc.createdAt = Date.now();
    doc.updatedAt = Date.now();
    useEditor.getState().importarProjeto(doc);
    toast(`Template "${t.nome}" aberto no editor`, 'ok');
    window.dispatchEvent(new Event('vortex:fechar-gaveta'));
    onAplicar?.();
    closeModal();
  };

  const categorias = useMemo(() => {
    const set = new Set(templates.map((t) => t.categoria));
    return ['Todas', ...Array.from(set).sort()];
  }, [templates]);

  const filtrados = templates.filter((t) => {
    const okCat = cat === 'Todas' || t.categoria === cat;
    const q = busca.toLowerCase().trim();
    const okBusca =
      !q ||
      t.nome.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q));
    return okCat && okBusca;
  });

  const ocupado = lendo !== null || salvando !== null;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        if (e.dataTransfer.files.length) void lerArquivos(Array.from(e.dataTransfer.files));
      }}
      style={{
        outline: arrastando ? '2px dashed var(--acc)' : 'none',
        outlineOffset: -6,
        borderRadius: 10,
      }}
    >
      {/* ---------------- zona de importação ---------------- */}
      {!ocupado && (
        <div
          onClick={() => entrada.current?.click()}
          style={{
            border: '2px dashed var(--line-2)',
            borderRadius: 11,
            padding: '18px 16px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--bg-2)',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 20, marginBottom: 6 }}>⤓</div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>Arraste centenas de XMLs de uma vez</div>
          <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginTop: 3 }}>
            ou clique para escolher · os templates ficam salvos neste navegador
          </div>
          <input
            ref={entrada}
            type="file"
            multiple
            accept=".xml,text/xml,application/xml"
            style={{ display: 'none' }}
            onChange={(e) => {
              const arquivos = Array.from(e.target.files ?? []);
              if (arquivos.length) void lerArquivos(arquivos);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {/* ---------------- progresso ---------------- */}
      {lendo && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h4>Lendo arquivos…</h4>
          <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-4)', overflow: 'hidden', margin: '9px 0 7px' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round((lendo.feito / Math.max(1, lendo.total)) * 100)}%`,
                background: 'linear-gradient(90deg,#22d3ee,#6366f1)',
                transition: 'width .2s',
              }}
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
            {lendo.feito} de {lendo.total} · {lendo.atual.slice(0, 40)}
            {lendo.erros > 0 && ` · ${lendo.erros} com erro`}
          </div>
        </div>
      )}

      {salvando && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h4>Salvando na biblioteca…</h4>
          <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-4)', overflow: 'hidden', margin: '9px 0 7px' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round((salvando.feito / Math.max(1, salvando.total)) * 100)}%`,
                background: 'linear-gradient(90deg,#34d399,#22d3ee)',
                transition: 'width .2s',
              }}
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
            {salvando.feito} de {salvando.total}
          </div>
        </div>
      )}

      {/* ---------------- confirmação ---------------- */}
      {pendencias.length > 0 && !ocupado && (
        <div className="card" style={{ marginBottom: 12, borderColor: 'var(--acc)' }}>
          <h4>{pendencias.length} template(s) prontos para adicionar</h4>
          <p style={{ marginTop: 4 }}>
            Total de {pendencias.reduce((s, t) => s + t.elementos, 0)} elementos e{' '}
            {pendencias.reduce((s, t) => s + t.efeitos, 0)} efeitos convertidos.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => setPendencias([])}>
              Descartar
            </button>
            <button className="btn primary" style={{ flex: 2, fontWeight: 800 }} onClick={() => void confirmarImportacao()}>
              Adicionar à biblioteca
            </button>
          </div>
        </div>
      )}

      {erros.length > 0 && !ocupado && (
        <div className="hint" style={{ marginBottom: 12, maxHeight: 120, overflow: 'auto' }}>
          <b>{erros.length} arquivo(s) não puderam ser lidos:</b>
          {erros.slice(0, 12).map((e) => (
            <div key={e.arquivo} style={{ fontSize: 11, marginTop: 3 }}>
              • {e.arquivo.slice(0, 38)} — {e.motivo}
            </div>
          ))}
          {erros.length > 12 && <div style={{ fontSize: 11, marginTop: 3 }}>…e mais {erros.length - 12}</div>}
        </div>
      )}

      {/* ---------------- lista ---------------- */}
      {!carregando && templates.length > 0 && (
        <>
          <div className="search-wrap" style={{ marginBottom: 8 }}>
            <input
              className="search"
              placeholder={`Buscar entre ${templates.length} template(s)…`}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="cat-chips" style={{ marginBottom: 10 }}>
            {categorias.map((c) => (
              <button key={c} className={`chip${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 9 }}>
            {filtrados.slice(0, 300).map((t) => (
              <div
                key={t.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 9,
                  overflow: 'hidden',
                  background: 'var(--bg-2)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <div
                  onClick={() => aplicar(t)}
                  style={{
                    height: 74,
                    background: `linear-gradient(135deg,${t.cor[0]},${t.cor[1]})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 900,
                    color: '#fff',
                    textShadow: '0 1px 6px rgba(0,0,0,.45)',
                    letterSpacing: '.3px',
                  }}
                >
                  {t.categoria.toUpperCase()}
                </div>
                <div style={{ padding: '7px 8px' }}>
                  <div
                    title={t.nome}
                    style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {t.nome}
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--txt-2)', marginTop: 2 }}>
                    {fmtTime(t.duracaoMs)} · {t.elementos} elem · {t.largura}×{t.altura}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void removerTemplate(t.id).then(recarregar);
                  }}
                  title="Remover template"
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: 'rgba(0,0,0,.55)',
                    color: '#fff',
                    fontSize: 11,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {filtrados.length > 300 && (
            <div style={{ fontSize: 11, color: 'var(--txt-2)', marginTop: 9, textAlign: 'center' }}>
              Mostrando 300 de {filtrados.length} — refine a busca para ver os demais.
            </div>
          )}
          {filtrados.length === 0 && <div className="empty-state">Nenhum template para “{busca}”.</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--txt-2)' }}>
              {templates.length} template(s) salvos neste navegador
            </span>
            <div style={{ flex: 1 }} />
            <button
              className="btn ghost sm"
              style={{ color: 'var(--err)', fontSize: 11 }}
              onClick={() => {
                if (!confirm(`Remover os ${templates.length} templates da biblioteca?`)) return;
                void limparTemplates().then(() => {
                  void recarregar();
                  toast('Biblioteca de templates limpa', 'default');
                });
              }}
            >
              Limpar tudo
            </button>
          </div>
        </>
      )}

      {!carregando && templates.length === 0 && !ocupado && pendencias.length === 0 && (
        <div className="hint">
          <b>Sua biblioteca está vazia.</b> Arraste os 2.000 XMLs do Alight Motion de uma vez — cada um vira um card
          que abre no editor com 1 clique. Os arquivos ficam salvos neste navegador (IndexedDB), sem enviar nada
          para servidor.
        </div>
      )}
    </div>
  );
}
