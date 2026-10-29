import { useRef, useState } from 'react';
import { useUI } from '../store/ui';
import { useEditor } from '../store/editor';
import { importarAlight, type ResultadoImport } from '../lib/alightMotion';
import { fmtTime } from '../lib/anim';

interface Props {
  onImportado?: () => void;
}

export function ImportarXML({ onImportado }: Props) {
  const close = useUI((s) => s.closeModal);
  const toast = useUI((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);

  const [rascunho, setRascunho] = useState<{ nome: string; xml: string } | null>(null);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [erro, setErro] = useState('');
  const [colar, setColar] = useState(false);
  const [textoColado, setTextoColado] = useState('');
  const reconectar = useRef<HTMLInputElement>(null);

  /** liga os arquivos escolhidos às mídias que vieram do XML (por nome) */
  const religarMidias = async (arquivos: File[]) => {
    if (!resultado) return;
    const doc = structuredClone(resultado.doc);
    let ligados = 0;
    for (const f of arquivos) {
      const url = URL.createObjectURL(f);
      const base = f.name.toLowerCase();
      const alvo = doc.assets.find(
        (a) =>
          !a.url &&
          (a.name.toLowerCase() === base ||
            base.includes(a.name.toLowerCase().replace(/\.[^.]+$/, '')) ||
            a.name.toLowerCase().includes(base.replace(/\.[^.]+$/, ''))),
      );
      if (alvo) {
        alvo.url = url;
        alvo.sizeBytes = f.size;
        ligados += 1;
      } else if (doc.assets.some((a) => !a.url)) {
        // sem correspondência exata: usa no primeiro slot vazio
        const vazio = doc.assets.find((a) => !a.url);
        if (vazio) {
          vazio.url = url;
          vazio.sizeBytes = f.size;
          ligados += 1;
        }
      }
    }
    setResultado({ ...resultado, doc });
    toast(`${ligados} mídia(s) reconectada(s)`, ligados ? 'ok' : 'warn');
  };

  /* ---------------- ler arquivo ---------------- */
  const lerArquivo = async (file: File) => {
    setErro('');
    try {
      if (file.size > 25 * 1024 * 1024) {
        setErro('Arquivo muito grande (limite 25 MB).');
        return;
      }
      const texto = await file.text();
      processar(texto, file.name.replace(/\.xml$/i, ''));
    } catch {
      setErro('Não consegui ler o arquivo.');
    }
  };

  const processar = (xml: string, nome: string) => {
    setErro('');
    setResultado(null);
    try {
      const r = importarAlight(xml, nome || 'Projeto importado');
      setRascunho({ nome, xml });
      setResultado(r);
    } catch (e) {
      setRascunho(null);
      setErro((e as Error).message);
    }
  };

  /* ---------------- aplicar no editor ---------------- */
  const aplicar = () => {
    if (!resultado) return;
    useEditor.getState().importarProjeto(resultado.doc);
    toast(`Projeto "${resultado.doc.name}" importado com ${resultado.relatorio.elementos} elemento(s)`, 'ok');
    onImportado?.();
    close();
  };

  return (
    <div className="overlay" onClick={close}>
      <div className="modal" style={{ width: 'min(720px,100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Importar projeto do Alight Motion</div>
          <div className="spacer" />
          <button className="btn ghost icon" onClick={close}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* ---------- entrada ---------- */}
          {!resultado && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void lerArquivo(f);
                }}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--line-2)',
                  borderRadius: 12,
                  padding: '34px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--bg-2)',
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 10, opacity: 0.85 }}>⤓</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 5 }}>Arraste o arquivo .xml aqui</div>
                <div style={{ fontSize: 12, color: 'var(--txt-2)' }}>ou clique para escolher no computador</div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xml,text/xml,application/xml"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void lerArquivo(f);
                    e.target.value = '';
                  }}
                />
              </div>

              <button
                className="btn ghost"
                style={{ width: '100%', marginTop: 10 }}
                onClick={() => setColar((v) => !v)}
              >
                {colar ? 'Cancelar' : 'Ou colar o XML aqui'}
              </button>

              {colar && (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    className="sel-input"
                    style={{ width: '100%', minHeight: 130, resize: 'vertical', fontFamily: 'var(--mono)', fontSize: 10.5, lineHeight: 1.5 }}
                    placeholder='<?xml version="1.0"?><scene …>'
                    value={textoColado}
                    onChange={(e) => setTextoColado(e.target.value)}
                  />
                  <button
                    className="btn primary"
                    style={{ width: '100%', marginTop: 8 }}
                    onClick={() => processar(textoColado, 'Projeto colado')}
                    disabled={textoColado.length < 40}
                  >
                    Analisar XML
                  </button>
                </div>
              )}

              {erro && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '9px 12px',
                    borderRadius: 9,
                    background: 'rgba(244,63,94,.1)',
                    border: '1px solid rgba(244,63,94,.3)',
                    color: '#fca5a5',
                    fontSize: 12.5,
                  }}
                >
                  {erro}
                </div>
              )}

              <div className="hint" style={{ marginTop: 14 }}>
                <b>Como exportar do Alight Motion:</b> abra o projeto → menu <b>⋯</b> → <b>Exportar</b> →{' '}
                <b>Projeto (.xml)</b>. O arquivo não traz as mídias (vídeos, imagens) — só a estrutura, os
                keyframes e os efeitos. Depois de importar, reconecte cada mídia na aba <b>Mídia</b>.
              </div>
            </>
          )}

          {/* ---------- resultado ---------- */}
          {resultado && (
            <>
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                  <div className="media-ico" style={{ background: 'linear-gradient(135deg,#f472b6,#9d174d)' }}>
                    ✦
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{resultado.doc.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt-2)' }}>
                      {resultado.relatorio.largura}×{resultado.relatorio.altura} · {resultado.relatorio.fps} fps ·{' '}
                      {fmtTime(resultado.relatorio.duracaoMs)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[
                    ['Elementos', resultado.relatorio.elementos],
                    ['Efeitos aplicados', resultado.relatorio.efeitosAplicados],
                    ['Mídias a reconectar', resultado.doc.assets.length],
                  ].map(([rot, val]) => (
                    <div key={String(rot)} style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '9px 11px' }}>
                      <div style={{ fontSize: 9.5, letterSpacing: '.5px', color: 'var(--txt-2)', textTransform: 'uppercase' }}>
                        {rot}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900 }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {Object.keys(resultado.relatorio.porTipo).length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <h4>O que foi convertido</h4>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
                    {Object.entries(resultado.relatorio.porTipo).map(([tipo, qtd]) => (
                      <span key={tipo} className="pill free" style={{ fontSize: 10.5 }}>
                        {qtd}× {tipo}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {resultado.doc.assets.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <h4>Mídias para reconectar</h4>
                  <p style={{ marginTop: 3 }}>
                    O XML aponta para arquivos do celular. Importe os mesmos arquivos na aba Mídia — o Vortex liga
                    automaticamente pelo nome.
                  </p>
                  <button
                    className="btn"
                    style={{ width: '100%', marginTop: 9 }}
                    onClick={() => reconectar.current?.click()}
                  >
                    Reconectar arquivos agora
                  </button>
                  <input
                    ref={reconectar}
                    type="file"
                    multiple
                    accept="video/*,audio/*,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const arquivos = Array.from(e.target.files ?? []);
                      if (arquivos.length) void religarMidias(arquivos);
                      e.target.value = '';
                    }}
                  />
                  <div style={{ marginTop: 8 }}>
                    {resultado.doc.assets.map((a) => (
                      <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                        <span style={{ fontSize: 12 }}>{a.kind === 'video' ? '▶' : a.kind === 'audio' ? '♪' : '▣'}</span>
                        <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.name}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--txt-2)' }}>{a.kind}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resultado.relatorio.avisos.length > 0 && (
                <div className="hint" style={{ marginBottom: 12 }}>
                  {resultado.relatorio.avisos.map((a) => (
                    <div key={a} style={{ marginBottom: 4 }}>
                      • {a}
                    </div>
                  ))}
                </div>
              )}

              {resultado.relatorio.efeitosIgnorados > 0 && (
                <div className="hint" style={{ marginBottom: 12 }}>
                  {resultado.relatorio.efeitosIgnorados} efeito(s) específicos do Alight Motion (gradientes, tile,
                  máscaras) não têm equivalente e foram ignorados.
                </div>
              )}

              <div style={{ display: 'flex', gap: 9 }}>
                <button
                  className="btn ghost"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setResultado(null);
                    setRascunho(null);
                  }}
                >
                  Escolher outro
                </button>
                <button className="btn primary" style={{ flex: 2, fontWeight: 800 }} onClick={aplicar}>
                  Abrir no editor
                </button>
              </div>
              {rascunho && (
                <div style={{ fontSize: 10, color: 'var(--txt-2)', textAlign: 'center', marginTop: 8 }}>
                  {rascunho.xml.length.toLocaleString('pt-BR')} caracteres lidos
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
