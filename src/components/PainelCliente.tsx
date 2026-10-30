import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { fmtBytes, fmtTime } from '../lib/anim';
import { botoesPlano, PLANOS } from '../lib/config';
import {
  meusDownloads,
  meusPagamentos,
  sairConta,
  tempoHumano,
  trocarSenhaCliente,
  type DownloadRegistro,
  type Pagamento,
} from '../lib/contas';
import { BarraPlano } from './BarraPlano';

/* ============================================================
   PAINEL DO CLIENTE — conta, horas e downloads
   ------------------------------------------------------------
   A aba "Meus downloads" mostra o histórico REAL do banco: tudo o que
   entrou pelo Baixa Tudo, pela extensão do Drive e pelos packs.
   ============================================================ */

interface Props {
  onSair: () => void;
}

type Aba = 'resumo' | 'projetos' | 'midia' | 'downloads' | 'plano' | 'dados';

const dataBR = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
};

export function PainelCliente({ onSair }: Props) {
  const { user, sessao, setSessao, toast, openModal, closeModal } = useUI();
  const { doc } = useEditor();
  const [templatesXML, setTemplatesXML] = useState(0);
  const [aba, setAba] = useState<Aba>('resumo');
  const [novaSenha, setNovaSenha] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [downloads, setDownloads] = useState<DownloadRegistro[]>([]);
  const [pedidos, setPedidos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const projetos = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('vortex.projetos.v1') ?? '[]') as Array<{
        id: string;
        nome: string;
        atualizadoEm: number;
        elementos: number;
      }>;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    import('../lib/bibliotecaXML').then((m) => m.contarTemplates().then(setTemplatesXML)).catch(() => {});
  }, []);

  const recarregar = async () => {
    setCarregando(true);
    const [d, p] = await Promise.all([meusDownloads(), meusPagamentos()]);
    setDownloads(d);
    setPedidos(p);
    setCarregando(false);
  };

  useEffect(() => {
    void recarregar();
  }, []);

  /* quantas horas ainda restam (do servidor) */
  const horas = sessao?.horasRestantes ?? 0;
  const admin = sessao?.papel === 'admin';
  const tipoPlano = sessao?.plano ?? 'nenhum';
  const planoCatalogo = PLANOS.find((p) => p.id === tipoPlano) ?? PLANOS[0];

  const sair = () => {
    sairConta();
    setSessao(null);
    closeModal();
    onSair();
    toast('Você saiu da conta', 'default');
  };

  const importarEmMassa = (arquivos: File[]) => {
    const entrada = document.getElementById('entrada-midia-global') as HTMLInputElement | null;
    if (!entrada) return;
    const dt = new DataTransfer();
    arquivos.forEach((f) => dt.items.add(f));
    entrada.files = dt.files;
    entrada.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const totalBytes = downloads.reduce((s, d) => s + (d.bytes ?? 0), 0);

  return (
    <div className="overlay" onClick={closeModal}>
      <div className="modal pc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Minha conta</div>
          <div className="spacer" />
          <button className="btn ghost icon" onClick={closeModal} title="Fechar">
            ✕
          </button>
        </div>
        <div className="modal-body pc-scroll">
          <div className="painel-cliente">
            <header className="pc-head">
              <div className="pc-user">
                <div className="pc-avatar">{(user?.name ?? 'C')[0].toUpperCase()}</div>
                <div>
                  <div className="pc-nome">{user?.name ?? 'Cliente'}</div>
                  <div className="pc-email">{user?.email ?? '—'}</div>
                </div>
              </div>
              <div className="pc-acoes">
                <span className={`pill ${admin || horas > 0 ? 'paid' : 'free'}`}>
                  {admin ? 'ADMIN' : tipoPlano === 'nenhum' ? 'SEM PLANO' : tipoPlano.toUpperCase()}
                </span>
                <button className="btn ghost" onClick={() => openModal('export')}>
                  Exportar
                </button>
                <button className="btn ghost danger" onClick={sair} title="Sair da conta">
                  Sair
                </button>
              </div>
            </header>

            <BarraPlano />

            <nav className="pc-tabs">
              {(
                [
                  ['resumo', 'Resumo'],
                  ['projetos', 'Meus projetos'],
                  ['midia', 'Minha mídia'],
                  ['downloads', `Downloads${downloads.length ? ` (${downloads.length})` : ''}`],
                  ['plano', 'Plano e horas'],
                  ['dados', 'Meus dados'],
                ] as [Aba, string][]
              ).map(([id, label]) => (
                <button key={id} className={`pc-tab${aba === id ? ' active' : ''}`} onClick={() => setAba(id)}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="pc-body">
              {aba === 'resumo' && (
                <>
                  <div className="pc-cards">
                    <div className="pc-card">
                      <span className="pc-card-lbl">Horas restantes</span>
                      <b style={{ fontSize: 18 }}>{admin ? '∞' : tempoHumano(sessao?.segundosRestantes ?? 0)}</b>
                    </div>
                    <div className="pc-card">
                      <span className="pc-card-lbl">Downloads feitos</span>
                      <b>{downloads.length}</b>
                    </div>
                    <div className="pc-card">
                      <span className="pc-card-lbl">Arquivos no projeto</span>
                      <b>{doc.assets.length}</b>
                    </div>
                    <div className="pc-card">
                      <span className="pc-card-lbl">Biblioteca</span>
                      <b>{templatesXML}</b>
                    </div>
                  </div>

                  <div className="pc-bloco">
                    <h4>Atalhos rápidos</h4>
                    <div className="pc-atalhos">
                      <button className="btn" onClick={closeModal}>
                        Abrir o editor
                      </button>
                      <button className="btn ghost" onClick={() => openModal('baixatudo')}>
                        Baixa Tudo (link + Drive)
                      </button>
                      <button className="btn ghost" onClick={() => setAba('downloads')}>
                        Ver meus downloads
                      </button>
                      <button className="btn ghost" onClick={() => openModal('xml')}>
                        Importar XML
                      </button>
                    </div>
                  </div>

                  <div className="pc-bloco">
                    <h4>Sobre seus arquivos</h4>
                    <p>
                      Seus vídeos ficam <b>no seu aparelho</b>; a timeline, os cortes e os efeitos ficam salvos.
                      O histórico do que você baixou fica guardado na conta (aba <b>Downloads</b>), com o link de
                      origem para baixar de novo quando quiser.
                    </p>
                  </div>
                </>
              )}

              {aba === 'projetos' && (
                <div className="pc-bloco">
                  <h4>Meus projetos</h4>
                  {projetos.length === 0 && (
                    <p>
                      Nenhum projeto salvo ainda. Tudo o que você monta no editor é salvo automaticamente neste
                      navegador — use <b>Salvar</b> para gravar uma versão nomeada.
                    </p>
                  )}
                  <div className="pc-lista">
                    {projetos.map((p) => (
                      <div key={p.id} className="pc-linha">
                        <div>
                          <b>{p.nome}</b>
                          <div className="pc-sub">
                            {p.elementos} elemento(s) · {new Date(p.atualizadoEm).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <button
                          className="btn ghost sm danger"
                          onClick={() => {
                            const resto = projetos.filter((x) => x.id !== p.id);
                            localStorage.setItem('vortex.projetos.v1', JSON.stringify(resto));
                            toast('Projeto removido', 'default');
                            setAba('resumo');
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aba === 'midia' && (
                <div className="pc-bloco">
                  <h4>Minha mídia</h4>
                  <p>Suba vídeos, áudios e imagens em massa — eles entram na aba Mídia do editor.</p>
                  <div className="pc-atalhos">
                    <button className="btn primary" onClick={() => importRef.current?.click()}>
                      ↑ Subir arquivos em massa
                    </button>
                    <button className="btn ghost" onClick={() => openModal('baixatudo')}>
                      Baixar do Drive / de site
                    </button>
                  </div>
                  <input
                    ref={importRef}
                    type="file"
                    multiple
                    accept="video/*,audio/*,image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files?.length) importarEmMassa(Array.from(e.target.files));
                      e.target.value = '';
                    }}
                  />
                  <div className="pc-lista" style={{ marginTop: 12 }}>
                    {doc.assets.length === 0 && <p>Nenhum arquivo no projeto atual.</p>}
                    {doc.assets.map((a) => (
                      <div key={a.id} className="pc-linha">
                        <div>
                          <b>{a.name}</b>
                          <div className="pc-sub">
                            {a.kind} · {a.durationMs ? fmtTime(a.durationMs) : '—'}
                            {a.sizeBytes ? ` · ${fmtBytes(a.sizeBytes)}` : ''}
                          </div>
                        </div>
                        <button className="btn ghost sm danger" onClick={() => useEditor.getState().removeAsset(a.id)}>
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= MEUS DOWNLOADS ================= */}
              {aba === 'downloads' && (
                <div className="pc-bloco">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ margin: 0 }}>Meus downloads</h4>
                    <div style={{ flex: 1 }} />
                    <button className="btn ghost sm" onClick={recarregar} disabled={carregando}>
                      {carregando ? 'Atualizando…' : 'Atualizar'}
                    </button>
                  </div>
                  <p style={{ marginTop: 6 }}>
                    Histórico guardado na sua conta: {downloads.length} arquivo(s) · {fmtBytes(totalBytes)} no total.
                  </p>

                  {downloads.length === 0 && (
                    <p style={{ color: 'var(--txt-2)' }}>
                      Nada baixado ainda. Use <b>Baixa Tudo</b> para trazer um vídeo de qualquer site ou puxar
                      arquivos do seu Drive — cada download aparece aqui, com o link de origem.
                    </p>
                  )}

                  <div className="pc-lista">
                    {downloads.map((d) => (
                      <div key={d.id} className="pc-linha">
                        <div style={{ minWidth: 0 }}>
                          <b style={{ wordBreak: 'break-word' }}>{d.nome ?? d.link ?? 'arquivo'}</b>
                          <div className="pc-sub">
                            {d.ferramenta} · {d.origem ?? 'site'} · {fmtBytes(d.bytes ?? 0)} · {dataBR(d.criado_em)}
                            {d.status !== 'ok' ? ` · ${d.status}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {d.link && /^https?:/.test(d.link) && (
                            <>
                              <a className="btn ghost sm" href={d.link} target="_blank" rel="noreferrer">
                                Abrir origem
                              </a>
                              <button
                                className="btn ghost sm"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(d.link ?? '');
                                    toast('Link copiado', 'ok');
                                  } catch {
                                    toast('Não consegui copiar', 'warn');
                                  }
                                }}
                              >
                                Copiar
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aba === 'plano' && (
                <div className="pc-bloco">
                  <h4>Plano e horas</h4>
                  <BarraPlano />
                  <p style={{ marginTop: 10 }}>
                    {admin ? (
                      <>Sua conta é <b>administrativa</b>: não consome horas e não expira.</>
                    ) : horas > 0 ? (
                      <>
                        Você tem <b>{tempoHumano(sessao?.segundosRestantes ?? 0)}</b> ({horas.toFixed(1)}h) de plano{' '}
                        <b>{tipoPlano.toUpperCase()}</b>. Quando zerar, exportar e baixar pedem renovação.
                      </>
                    ) : (
                      <>
                        Seu tempo de plano <b>acabou</b>. O editor continua abrindo para você ver o projeto, mas
                        exportar e baixar precisam de novas horas.
                      </>
                    )}
                  </p>

                  {!admin && (
                    <div className="pc-planos">
                      {PLANOS.filter((p) => p.preco > 0 || p.id !== 'free').map((p) => (
                        <div key={p.id} className={`pc-plano${p.id === tipoPlano ? ' atual' : ''}`}>
                          <div className="pc-plano-nome">{p.nome}</div>
                          <div className="pc-plano-preco">{botoesPlano(p)}</div>
                          <div className="pc-plano-desc">{p.descricao}</div>
                          <button className="btn primary sm" onClick={() => openModal('checkout')}>
                            {p.id === tipoPlano ? 'Adicionar mais horas' : 'Pedir este plano'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <h4 style={{ marginTop: 16 }}>Meus pedidos</h4>
                  {pedidos.length === 0 ? (
                    <p style={{ color: 'var(--txt-2)' }}>Nenhum pedido de pagamento registrado.</p>
                  ) : (
                    <div className="pc-lista">
                      {pedidos.map((p) => (
                        <div key={p.id} className="pc-linha">
                          <div>
                            <b style={{ fontFamily: 'var(--mono)' }}>{p.referencia ?? p.id.slice(0, 8)}</b>
                            <div className="pc-sub">
                              {p.plano.toUpperCase()} · {p.horas}h ·{' '}
                              {(p.valor_centavos / 100).toFixed(2).replace('.', ',')} · {dataBR(p.criado_em)}
                            </div>
                          </div>
                          <b
                            style={{
                              fontSize: 11,
                              color:
                                p.status === 'pago'
                                  ? 'var(--ok, #34d399)'
                                  : p.status === 'recusado'
                                    ? 'var(--err, #f87171)'
                                    : '#f59e0b',
                            }}
                          >
                            {p.status.toUpperCase()}
                          </b>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="pc-sub" style={{ marginTop: 8 }}>
                    Sem cobrança automática: o plano entra quando a equipe confirma o pagamento. Plano atual:{' '}
                    {planoCatalogo.nome}.
                  </p>
                </div>
              )}

              {aba === 'dados' && (
                <div className="pc-bloco">
                  <h4>Meus dados</h4>
                  <div className="pc-form">
                    <label>
                      Nome
                      <input value={nome} onChange={(e) => setNome(e.target.value)} disabled />
                    </label>
                    <label>
                      E-mail
                      <input value={email} onChange={(e) => setEmail(e.target.value)} disabled />
                    </label>
                    <p className="pc-sub">Nome e e-mail são os da conta no servidor. Fale com o suporte para alterar.</p>
                  </div>

                  <h4 style={{ marginTop: 18 }}>Trocar senha</h4>
                  <div className="pc-form">
                    <label>
                      Senha atual
                      <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
                    </label>
                    <label>
                      Nova senha
                      <input
                        type="password"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="mínimo 6 caracteres"
                      />
                    </label>
                    <label>
                      Repita a nova senha
                      <input type="password" value={confirmaSenha} onChange={(e) => setConfirmaSenha(e.target.value)} />
                    </label>
                    <button
                      className="btn primary"
                      onClick={async () => {
                        if (novaSenha.length < 6) return toast('A senha precisa de 6 caracteres', 'warn');
                        if (novaSenha !== confirmaSenha) return toast('As senhas não conferem', 'warn');
                        const r = await trocarSenhaCliente(sessao?.contaId ?? '', novaSenha, senhaAtual);
                        toast(r.ok ? 'Senha alterada' : (r.erro ?? 'Não foi possível'), r.ok ? 'ok' : 'err');
                        if (r.ok) {
                          setNovaSenha('');
                          setConfirmaSenha('');
                          setSenhaAtual('');
                        }
                      }}
                    >
                      Alterar senha
                    </button>
                  </div>

                  <h4 style={{ marginTop: 22 }}>Sessão</h4>
                  <p className="pc-sub">
                    Sua conta fica no servidor: pode entrar em qualquer aparelho com o mesmo e-mail e senha — o
                    plano aparece em todos eles.
                  </p>
                  <button className="btn ghost danger" onClick={sair}>
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
