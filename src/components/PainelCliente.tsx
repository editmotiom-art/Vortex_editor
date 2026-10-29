import { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { fmtBytes, fmtTime } from '../lib/anim';
import { botoesPlano, PLANOS } from '../lib/config';
import { sairConta, mudarPlano, trocarSenhaCliente } from '../lib/contas';

/* ============================================================
   PAINEL DO CLIENTE — visão completa da conta
   ============================================================ */

interface Props {
  onSair: () => void;
}

type Aba = 'resumo' | 'projetos' | 'midia' | 'plano' | 'dados';

export function PainelCliente({ onSair }: Props) {
  const { user, sessao, setSessao, toast, openModal, closeModal } = useUI();
  const { doc } = useEditor();
  const [templatesXML, setTemplatesXML] = useState(0);
  const [aba, setAba] = useState<Aba>('resumo');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [nome, setNome] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
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

  const plano = PLANOS.find((p) => p.id === (user?.plan ?? 'free')) ?? PLANOS[0];

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
          <span className={`pill ${user?.plan && user.plan !== 'free' ? 'paid' : 'free'}`}>
            {(user?.plan ?? 'free').toUpperCase()}
          </span>
          <button className="btn ghost" onClick={() => openModal('export')}>
            Exportar
          </button>
          <button className="btn ghost danger" onClick={sair} title="Sair da conta">
            Sair
          </button>
        </div>
      </header>

      <nav className="pc-tabs">
        {(
          [
            ['resumo', 'Resumo'],
            ['projetos', 'Meus projetos'],
            ['midia', 'Minha mídia'],
            ['plano', 'Plano e cobrança'],
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
                <span className="pc-card-lbl">Projetos salvos</span>
                <b>{projetos.length}</b>
              </div>
              <div className="pc-card">
                <span className="pc-card-lbl">Mídias no projeto atual</span>
                <b>{doc.assets.length}</b>
              </div>
              <div className="pc-card">
                <span className="pc-card-lbl">Biblioteca</span>
                <b>{templatesXML}</b>
              </div>
              <div className="pc-card">
                <span className="pc-card-lbl">Plano</span>
                <b style={{ fontSize: 15 }}>{plano.nome}</b>
              </div>
            </div>

            <div className="pc-bloco">
              <h4>Atalhos rápidos</h4>
              <div className="pc-atalhos">
                <button className="btn" onClick={closeModal}>
                  Abrir o editor
                </button>
                <button className="btn ghost" onClick={() => openModal('packs')}>
                  Acervo do Drive
                </button>
                <button className="btn ghost" onClick={() => openModal('xml')}>
                  Importar XML
                </button>
                <button className="btn ghost" onClick={() => openModal('import')}>
                  Baixar de site
                </button>
              </div>
            </div>

            <div className="pc-bloco">
              <h4>Aviso importante sobre seus arquivos</h4>
              <p>
                Os vídeos que você importa ficam <b>no seu aparelho</b>. Por isso, se você fechar o navegador e
                reabrir depois, os arquivos pesados precisam ser reimportados: o projeto guarda a timeline, os
                cortes, os efeitos e os textos. Para não perder nada, baixe o arquivo final em{' '}
                <b>Exportar</b> antes de sair.
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
            <p>
              Suba vídeos, áudios e imagens em massa — eles entram na aba <b>Mídia</b> do editor e podem ser
              arrastados para a timeline.
            </p>
            <div className="pc-atalhos">
              <button className="btn primary" onClick={() => importRef.current?.click()}>
                ↑ Subir arquivos em massa
              </button>
              <button className="btn ghost" onClick={() => openModal('packs')}>
                Baixar do Drive em massa
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
                  <button
                    className="btn ghost sm danger"
                    onClick={() => useEditor.getState().removeAsset(a.id)}
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {aba === 'plano' && (
          <div className="pc-bloco">
            <h4>Plano e cobrança</h4>
            <p>
              Você está no plano <b>{plano.nome}</b>
              {plano.preco > 0 ? ` — ${botoesPlano(plano)}` : ' — sem custo'}.
            </p>
            <div className="pc-planos">
              {PLANOS.map((p) => (
                <div key={p.id} className={`pc-plano${p.id === plano.id ? ' atual' : ''}`}>
                  <div className="pc-plano-nome">{p.nome}</div>
                  <div className="pc-plano-preco">{botoesPlano(p)}</div>
                  <div className="pc-plano-desc">{p.descricao}</div>
                  {p.id === plano.id ? (
                    <span className="pc-plano-atual">Plano atual</span>
                  ) : p.preco === 0 ? (
                    <button
                      className="btn ghost sm"
                      onClick={() => {
                        if (!sessao) return;
                        mudarPlano(sessao.contaId, 'free');
                        setSessao({ ...sessao, plano: 'free' });
                        toast('Você voltou para o plano Free', 'default');
                      }}
                    >
                      Voltar ao Free
                    </button>
                  ) : (
                    <button className="btn primary sm" onClick={() => openModal('checkout')}>
                      Assinar
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="pc-sub">
              A cobrança é feita pelo checkout do próprio sistema. Para cancelar, volte ao plano Free ou fale com
              o suporte.
            </p>
          </div>
        )}

        {aba === 'dados' && (
          <div className="pc-bloco">
            <h4>Meus dados</h4>
            <div className="pc-form">
              <label>
                Nome
                <input value={nome} onChange={(e) => setNome(e.target.value)} />
              </label>
              <label>
                E-mail
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <button
                className="btn"
                onClick={() => {
                  if (sessao) setSessao({ ...sessao, nome, email });
                  toast('Dados atualizados', 'ok');
                }}
              >
                Salvar dados
              </button>
            </div>

            <h4 style={{ marginTop: 18 }}>Trocar senha</h4>
            <div className="pc-form">
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
                <input
                  type="password"
                  value={confirmaSenha}
                  onChange={(e) => setConfirmaSenha(e.target.value)}
                />
              </label>
              <button
                className="btn primary"
                onClick={async () => {
                  if (!sessao) return;
                  if (novaSenha.length < 6) return toast('A senha precisa de 6 caracteres', 'warn');
                  if (novaSenha !== confirmaSenha) return toast('As senhas não conferem', 'warn');
                  const r = await trocarSenhaCliente(sessao.contaId, novaSenha);
                  toast(r.ok ? 'Senha alterada' : r.erro ?? 'Não foi possível', r.ok ? 'ok' : 'err');
                  if (r.ok) {
                    setNovaSenha('');
                    setConfirmaSenha('');
                  }
                }}
              >
                Alterar senha
              </button>
            </div>

            <h4 style={{ marginTop: 22 }}>Sessão</h4>
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
