import { useEffect, useState } from 'react';
import {
  ADMIN_USUARIO_INICIAL,
  SENHA_ADMIN_INICIAL,
  adminLogado,
  entrarAdmin,
  garantirAdmin,
  gravarConfig,
  lerConfig,
  sairAdmin,
  testarIA,
  testarPagamento,
  trocarCredenciais,
  type Config,
} from '../lib/config';
import { listarContas, setPlanoConta, excluirConta, type Conta } from '../lib/contas';

/* ============================================================
   PAINEL ADMINISTRATIVO
   ============================================================ */

type Aba = 'visao' | 'contas' | 'planos' | 'ia' | 'pagamento' | 'acesso' | 'sistema';

const campo: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  borderRadius: 8,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-2)',
  color: 'var(--txt-0)',
  fontSize: 12.5,
  fontFamily: 'inherit',
  outline: 'none',
};

const rotulo: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: '.6px',
  textTransform: 'uppercase',
  color: 'var(--txt-2)',
  marginBottom: 5,
};

function Bloco({ titulo, desc, children }: { titulo: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h4 style={{ marginBottom: 4 }}>{titulo}</h4>
      {desc && <p style={{ marginBottom: 12 }}>{desc}</p>}
      {children}
    </div>
  );
}

export function Admin({ onSair }: { onSair: () => void }) {
  const [logado, setLogado] = useState(adminLogado());
  const [aba, setAba] = useState<Aba>('visao');

  useEffect(() => {
    void garantirAdmin();
  }, []);

  if (!logado) return <LoginAdmin onEntrar={() => setLogado(true)} />;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-0)' }}>
      {/* -------- menu -------- */}
      <aside
        style={{
          width: 210,
          flex: '0 0 210px',
          borderRight: '1px solid var(--line)',
          background: 'var(--bg-1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 10px',
          gap: 3,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 6px 16px' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg,#22d3ee,#6366f1)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            V
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 900 }}>Vortex</div>
            <div style={{ fontSize: 9.5, color: 'var(--txt-2)', letterSpacing: '.8px' }}>ADMINISTRAÇÃO</div>
          </div>
        </div>

        {(
          [
            ['visao', 'Visão geral'],
            ['contas', 'Clientes'],
            ['planos', 'Planos e preços'],
            ['pagamento', 'Pagamento'],
            ['ia', 'Inteligência artificial'],
            ['acesso', 'Acesso do admin'],
            ['sistema', 'Sistema'],
          ] as [Aba, string][]
        ).map(([id, nome]) => (
          <button
            key={id}
            onClick={() => setAba(id)}
            style={{
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: aba === id ? 'var(--acc)' : 'var(--txt-1)',
              background: aba === id ? 'rgba(34,211,238,.1)' : 'transparent',
            }}
          >
            {nome}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <button
          className="btn ghost"
          onClick={onSair}
          style={{ justifyContent: 'center', fontSize: 12 }}
        >
          ← Voltar ao editor
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            sairAdmin();
            setLogado(false);
          }}
          style={{ justifyContent: 'center', fontSize: 12, color: 'var(--err)' }}
        >
          Sair do painel
        </button>
      </aside>

      {/* -------- conteúdo -------- */}
      <main style={{ flex: 1, overflow: 'auto', padding: '22px 26px' }}>
        {aba === 'visao' && <Visao />}
        {aba === 'contas' && <Contas />}
        {aba === 'planos' && <Planos />}
        {aba === 'pagamento' && <Pagamento />}
        {aba === 'ia' && <IA />}
        {aba === 'acesso' && <Acesso />}
        {aba === 'sistema' && <Sistema />}
      </main>
    </div>
  );
}

/* ---------------- login ---------------- */

function LoginAdmin({ onEntrar }: { onEntrar: () => void }) {
  const [usuario, setUsuario] = useState(ADMIN_USUARIO_INICIAL);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    const r = await entrarAdmin(usuario, senha);
    setCarregando(false);
    if (r.ok) onEntrar();
    else setErro(r.erro ?? 'Falha no acesso');
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--bg-0)' }}>
      <form onSubmit={enviar} style={{ width: 330 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: 'linear-gradient(135deg,#22d3ee,#6366f1)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: 20,
              margin: '0 auto 12px',
            }}
          >
            V
          </div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Painel administrativo</div>
          <div style={{ fontSize: 12, color: 'var(--txt-2)', marginTop: 3 }}>Acesso restrito</div>
        </div>

        <label style={rotulo}>Usuário</label>
        <input style={{ ...campo, marginBottom: 12 }} value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" />

        <label style={rotulo}>Senha</label>
        <input
          style={{ ...campo, marginBottom: 14 }}
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          placeholder="••••••••"
        />

        {erro && (
          <div style={{ marginBottom: 12, fontSize: 12, color: '#fca5a5', background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', padding: '8px 11px', borderRadius: 8 }}>
            {erro}
          </div>
        )}

        <button className="btn primary" type="submit" disabled={carregando} style={{ width: '100%', padding: '11px', fontWeight: 800 }}>
          {carregando ? 'Verificando…' : 'Entrar no painel'}
        </button>

        <div style={{ marginTop: 18, padding: 11, borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--line)', fontSize: 11, color: 'var(--txt-2)', lineHeight: 1.6 }}>
          <b style={{ color: 'var(--txt-1)' }}>Primeiro acesso</b>
          <br />
          usuário: <code style={{ color: 'var(--acc)' }}>admin</code> · senha: <code style={{ color: 'var(--acc)' }}>vortex2026</code>
          <br />
          Troque em <b>Acesso do admin</b> depois de entrar.
        </div>
      </form>
    </div>
  );
}

/* ---------------- visão geral ---------------- */

function Visao() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [config, setConfig] = useState<Config>(lerConfig());

  useEffect(() => {
    setContas(listarContas());
    setConfig(lerConfig());
  }, []);

  const pro = contas.filter((c) => c.plano !== 'free').length;
  const receita = contas
    .filter((c) => c.plano !== 'free')
    .reduce((soma, c) => {
      const p = config.planos.find((pl) => pl.id === c.plano);
      return soma + (p?.preco ?? 0);
    }, 0);

  const cartao = (t: string, v: string, sub?: string) => (
    <div className="card" style={{ flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.7px', color: 'var(--txt-2)', textTransform: 'uppercase' }}>{t}</div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6, letterSpacing: '-.8px' }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--txt-2)', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Visão geral</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 18 }}>Números deste navegador (as contas locais).</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {cartao('Clientes', String(contas.length), 'contas criadas')}
        {cartao('Assinantes', String(pro), 'plano pago')}
        {cartao('Receita mensal', `R$ ${receita.toFixed(2).replace('.', ',')}`, 'se todos forem reais')}
        {cartao('Conversão', contas.length ? `${Math.round((pro / contas.length) * 100)}%` : '—', 'free → pago')}
      </div>

      <Bloco titulo="Situação das integrações" desc="O que já está ligado e o que falta configurar.">
        {[
          ['Captura de mídia de sites', true, 'funções Netlify'],
          ['Login de clientes', true, 'localStorage'],
          ['Painel administrativo', true, 'ativo'],
          ['Pagamento', config.pagamento.provedor !== 'nenhum', config.pagamento.provedor],
          ['Inteligência artificial', config.ia.ativo && !!config.ia.chave, config.ia.provedor],
          ['Supabase (nuvem)', false, 'falta configurar'],
        ].map(([nome, ok, detalhe]) => (
          <div key={String(nome)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? 'var(--ok)' : 'var(--warn)' }} />
            <span style={{ fontSize: 12.5 }}>{nome}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--txt-2)' }}>{detalhe}</span>
          </div>
        ))}
      </Bloco>

      <Bloco titulo="Últimos clientes">
        {contas.length === 0 && <p style={{ fontSize: 12 }}>Nenhuma conta criada ainda.</p>}
        {contas
          .slice()
          .reverse()
          .slice(0, 6)
          .map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <div className="media-ico" style={{ width: 26, height: 26, fontSize: 11 }}>
                {c.nome[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.nome}</div>
                <div style={{ fontSize: 10.5, color: 'var(--txt-2)' }}>{c.email}</div>
              </div>
              <div style={{ flex: 1 }} />
              <span className={`pill ${c.plano === 'free' ? 'free' : 'paid'}`}>{c.plano.toUpperCase()}</span>
            </div>
          ))}
      </Bloco>
    </>
  );
}

/* ---------------- clientes ---------------- */

function Contas() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [busca, setBusca] = useState('');

  const recarregar = () => setContas(listarContas());
  useEffect(recarregar, []);

  const filtradas = contas.filter(
    (c) => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.email.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Clientes</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>Contas criadas neste navegador.</p>

      <input style={{ ...campo, marginBottom: 14, maxWidth: 320 }} placeholder="Buscar por nome ou e-mail…" value={busca} onChange={(e) => setBusca(e.target.value)} />

      <div style={{ border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr .8fr .8fr 1fr', gap: 8, padding: '9px 13px', background: 'var(--bg-2)', fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', color: 'var(--txt-2)', textTransform: 'uppercase' }}>
          <div>Nome</div>
          <div>E-mail</div>
          <div>Plano</div>
          <div>Criado</div>
          <div>Ações</div>
        </div>
        {filtradas.length === 0 && <div style={{ padding: 18, fontSize: 12, color: 'var(--txt-2)' }}>Nenhum cliente encontrado.</div>}
        {filtradas.map((c) => (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr .8fr .8fr 1fr', gap: 8, padding: '10px 13px', borderTop: '1px solid var(--line)', fontSize: 12, alignItems: 'center' }}>
            <div style={{ fontWeight: 600 }}>{c.nome}</div>
            <div style={{ color: 'var(--txt-2)' }}>{c.email}</div>
            <div>
              <span className={`pill ${c.plano === 'free' ? 'free' : 'paid'}`}>{c.plano.toUpperCase()}</span>
            </div>
            <div style={{ color: 'var(--txt-2)', fontSize: 11 }}>{new Date(c.criadoEm).toLocaleDateString('pt-BR')}</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <select
                value={c.plano}
                onChange={(e) => {
                  setPlanoConta(c.id, e.target.value as Conta['plano']);
                  recarregar();
                }}
                style={{ ...campo, padding: '4px 6px', fontSize: 11, width: 90 }}
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="studio">Studio</option>
              </select>
              <button
                className="btn ghost sm"
                onClick={() => {
                  excluirConta(c.id);
                  recarregar();
                }}
                style={{ fontSize: 11 }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- planos ---------------- */

function Planos() {
  const [config, setConfig] = useState<Config>(lerConfig());
  const [salvo, setSalvo] = useState(false);

  const mudar = (i: number, campoPlano: string, valor: unknown) => {
    const planos = config.planos.map((p, j) => (j === i ? { ...p, [campoPlano]: valor } : p));
    setConfig({ ...config, planos });
  };

  const salvar = () => {
    gravarConfig(config);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2200);
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Planos e preços</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
        O que aparece no checkout e no pop-up de assinatura.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 12 }}>
        {config.planos.map((p, i) => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <b style={{ fontSize: 13 }}>{p.nome}</b>
              <span className={`pill ${p.id === 'free' ? 'free' : 'paid'}`}>{p.id.toUpperCase()}</span>
              <div style={{ flex: 1 }} />
              <label style={{ fontSize: 10.5, color: 'var(--txt-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <input type="checkbox" checked={p.ativo} onChange={(e) => mudar(i, 'ativo', e.target.checked)} />
                ativo
              </label>
            </div>

            <label style={rotulo}>Nome</label>
            <input style={{ ...campo, marginBottom: 9 }} value={p.nome} onChange={(e) => mudar(i, 'nome', e.target.value)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
              <div>
                <label style={rotulo}>Preço (R$)</label>
                <input
                  style={campo}
                  type="number"
                  step="0.01"
                  value={p.preco}
                  onChange={(e) => mudar(i, 'preco', Number(e.target.value))}
                />
              </div>
              <div>
                <label style={rotulo}>Export máx.</label>
                <input
                  style={campo}
                  type="number"
                  value={p.exportMax}
                  onChange={(e) => mudar(i, 'exportMax', Number(e.target.value))}
                />
              </div>
            </div>

            <label style={rotulo}>Itens (um por linha)</label>
            <textarea
              style={{ ...campo, minHeight: 96, resize: 'vertical', lineHeight: 1.5 }}
              value={p.itens.join('\n')}
              onChange={(e) => mudar(i, 'itens', e.target.value.split('\n'))}
            />
          </div>
        ))}
      </div>

      <button className="btn primary" onClick={salvar} style={{ marginTop: 14, padding: '10px 22px', fontWeight: 800 }}>
        {salvo ? '✓ Salvo' : 'Salvar planos'}
      </button>
    </>
  );
}

/* ---------------- pagamento ---------------- */

function Pagamento() {
  const [config, setConfig] = useState<Config>(lerConfig());
  const [teste, setTeste] = useState<{ ok: boolean; msg: string } | null>(null);

  const salvar = () => {
    gravarConfig(config);
    setTeste(testarPagamento());
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Pagamento</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>Escolha como os clientes vão pagar a assinatura.</p>

      <Bloco titulo="Provedor" desc="Mercado Pago e Stripe exigem uma conta verificada. O modo manual é o mais rápido para começar.">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(
            [
              ['nenhum', 'Desligado'],
              ['manual', 'Manual (PIX)'],
              ['mercadopago', 'Mercado Pago'],
              ['stripe', 'Stripe'],
            ] as [Config['pagamento']['provedor'], string][]
          ).map(([id, nome]) => (
            <button
              key={id}
              onClick={() => setConfig({ ...config, pagamento: { ...config.pagamento, provedor: id } })}
              className={`btn ${config.pagamento.provedor === id ? 'primary' : 'ghost'}`}
              style={{ fontSize: 12 }}
            >
              {nome}
            </button>
          ))}
        </div>
      </Bloco>

      {config.pagamento.provedor !== 'nenhum' && config.pagamento.provedor !== 'manual' && (
        <Bloco titulo="Credenciais" desc="Pegue no painel do provedor: Developers → Credentials.">
          <label style={rotulo}>Chave pública (public key)</label>
          <input
            style={{ ...campo, marginBottom: 10 }}
            value={config.pagamento.chavePublica}
            onChange={(e) => setConfig({ ...config, pagamento: { ...config.pagamento, chavePublica: e.target.value } })}
            placeholder={config.pagamento.provedor === 'stripe' ? 'pk_live_…' : 'APP_USR-…'}
          />
          <label style={rotulo}>Chave secreta (access token)</label>
          <input
            style={{ ...campo, marginBottom: 10 }}
            type="password"
            value={config.pagamento.chaveSecreta}
            onChange={(e) => setConfig({ ...config, pagamento: { ...config.pagamento, chaveSecreta: e.target.value } })}
            placeholder="nunca aparece no site"
          />
          <label style={rotulo}>URL de checkout (opcional — link de pagamento pronto)</label>
          <input
            style={campo}
            value={config.pagamento.urlCheckout}
            onChange={(e) => setConfig({ ...config, pagamento: { ...config.pagamento, urlCheckout: e.target.value } })}
            placeholder="https://mpago.la/… ou https://buy.stripe.com/…"
          />
        </Bloco>
      )}

      {config.pagamento.provedor === 'manual' && (
        <Bloco titulo="Pagamento manual" desc="O cliente vê o PIX/dados e você libera o plano no painel de Clientes.">
          <label style={rotulo}>Chave PIX ou instrução</label>
          <textarea
            style={{ ...campo, minHeight: 70, resize: 'vertical' }}
            value={config.pagamento.urlCheckout}
            onChange={(e) => setConfig({ ...config, pagamento: { ...config.pagamento, urlCheckout: e.target.value } })}
            placeholder="ex.: PIX 12.345.678/0001-90 — envie o comprovante para editmotiom@gmail.com"
          />
        </Bloco>
      )}

      <Bloco titulo="Formas de pagamento aceitas">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 7 }}>
          <input
            type="checkbox"
            checked={config.pagamento.pixAtivo}
            onChange={(e) => setConfig({ ...config, pagamento: { ...config.pagamento, pixAtivo: e.target.checked } })}
          />
          PIX
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={config.pagamento.cartaoAtivo}
            onChange={(e) => setConfig({ ...config, pagamento: { ...config.pagamento, cartaoAtivo: e.target.checked } })}
          />
          Cartão de crédito
        </label>
      </Bloco>

      <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
        <button className="btn primary" onClick={salvar} style={{ padding: '10px 22px', fontWeight: 800 }}>
          Salvar pagamento
        </button>
        {teste && (
          <span style={{ fontSize: 12, color: teste.ok ? 'var(--ok)' : 'var(--warn)' }}>
            {teste.ok ? '✓' : '⚠'} {teste.msg}
          </span>
        )}
      </div>
    </>
  );
}

/* ---------------- IA ---------------- */

function IA() {
  const [config, setConfig] = useState<Config>(lerConfig());
  const [teste, setTeste] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testando, setTestando] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [resultado, setResultado] = useState('');

  const setIA = (campoIA: keyof Config['ia'], valor: unknown) =>
    setConfig({ ...config, ia: { ...config.ia, [campoIA]: valor } });

  const salvar = () => {
    gravarConfig(config);
    setTeste({ ok: true, msg: 'Configuração salva' });
  };

  const testar = async () => {
    gravarConfig(config);
    setTestando(true);
    const r = await testarIA();
    setTeste(r);
    setTestando(false);
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Inteligência artificial</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
        Geração de imagem e vídeo a partir de texto. A chave fica só aqui — nunca vai para o navegador do cliente.
      </p>

      <Bloco titulo="Integração">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
          <input type="checkbox" checked={config.ia.ativo} onChange={(e) => setIA('ativo', e.target.checked)} />
          Ativar geração por IA no editor
        </label>
      </Bloco>

      <Bloco titulo="Provedor e modelos">
        <label style={rotulo}>Provedor</label>
        <select style={{ ...campo, marginBottom: 10 }} value={config.ia.provedor} onChange={(e) => setIA('provedor', e.target.value)}>
          <option value="openai">OpenAI (GPT Image / DALL·E)</option>
          <option value="gemini">Google Gemini (Imagen / Veo)</option>
          <option value="stability">Stability AI (Stable Diffusion)</option>
          <option value="custom">Personalizado (endpoint próprio)</option>
        </select>

        <label style={rotulo}>Chave da API</label>
        <input
          style={{ ...campo, marginBottom: 10 }}
          type="password"
          value={config.ia.chave}
          onChange={(e) => setIA('chave', e.target.value)}
          placeholder="sk-… / AIza… / sk-…"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={rotulo}>Modelo de imagem</label>
            <input style={campo} value={config.ia.modeloImagem} onChange={(e) => setIA('modeloImagem', e.target.value)} placeholder="gpt-image-1" />
          </div>
          <div>
            <label style={rotulo}>Modelo de vídeo</label>
            <input style={campo} value={config.ia.modeloVideo} onChange={(e) => setIA('modeloVideo', e.target.value)} placeholder="sora-1 / veo-3" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={rotulo}>Modelo de texto</label>
            <input style={campo} value={config.ia.modeloTexto} onChange={(e) => setIA('modeloTexto', e.target.value)} placeholder="gpt-4o-mini" />
          </div>
          <div>
            <label style={rotulo}>Limite por usuário/dia</label>
            <input style={campo} type="number" value={config.ia.limiteDiario} onChange={(e) => setIA('limiteDiario', Number(e.target.value))} />
          </div>
        </div>

        {config.ia.provedor === 'custom' && (
          <>
            <label style={{ ...rotulo, marginTop: 10 }}>Endpoint personalizado</label>
            <input style={campo} value={config.ia.endpoint} onChange={(e) => setIA('endpoint', e.target.value)} placeholder="https://sua-api.com/gerar" />
          </>
        )}
      </Bloco>

      <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 16 }}>
        <button className="btn primary" onClick={salvar} style={{ padding: '10px 20px', fontWeight: 800 }}>
          Salvar
        </button>
        <button className="btn ghost" onClick={testar} disabled={testando}>
          {testando ? 'Testando…' : 'Testar conexão'}
        </button>
        {teste && (
          <span style={{ fontSize: 12, color: teste.ok ? 'var(--ok)' : 'var(--warn)' }}>
            {teste.ok ? '✓' : '⚠'} {teste.msg}
          </span>
        )}
      </div>

      <Bloco titulo="Teste de geração" desc="Só funciona com uma chave válida configurada acima.">
        <label style={rotulo}>Prompt</label>
        <textarea
          style={{ ...campo, minHeight: 60, resize: 'vertical', marginBottom: 9 }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="ex.: fundo abstrato azul e ciano, estilo cinematográfico, 4k"
        />
        <button
          className="btn"
          onClick={() => {
            if (!config.ia.chave) {
              setResultado('Configure a chave da API primeiro.');
              return;
            }
            setResultado(
              'Pronto para gerar. A chamada real usa a função de servidor (netlify/functions/ia.ts) para não expor a chave — configure a variável IA_API_KEY na Netlify.',
            );
          }}
        >
          Gerar imagem de teste
        </button>
        {resultado && <p style={{ marginTop: 9, fontSize: 11.5, color: 'var(--txt-2)', lineHeight: 1.6 }}>{resultado}</p>}
      </Bloco>
    </>
  );
}

/* ---------------- acesso do admin ---------------- */

function Acesso() {
  const [usuario, setUsuario] = useState(lerConfig().admin.usuario);
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const salvar = async () => {
    setMsg(null);
    if (senha !== confirmar) {
      setMsg({ ok: false, texto: 'As senhas não coincidem' });
      return;
    }
    const r = await trocarCredenciais(usuario, senha);
    setMsg({ ok: r.ok, texto: r.ok ? 'Credenciais atualizadas — use na próxima entrada' : (r.erro ?? 'Erro') });
    setSenha('');
    setConfirmar('');
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Acesso do administrador</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
        Troque o usuário e a senha do painel. A senha é guardada só como hash.
      </p>

      <Bloco titulo="Credenciais">
        <label style={rotulo}>Usuário</label>
        <input style={{ ...campo, marginBottom: 10, maxWidth: 300 }} value={usuario} onChange={(e) => setUsuario(e.target.value)} />

        <label style={rotulo}>Nova senha</label>
        <input
          style={{ ...campo, marginBottom: 10, maxWidth: 300 }}
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="mínimo 6 caracteres"
        />

        <label style={rotulo}>Confirmar nova senha</label>
        <input
          style={{ ...campo, marginBottom: 14, maxWidth: 300 }}
          type="password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
        />

        <button className="btn primary" onClick={salvar} style={{ padding: '10px 20px', fontWeight: 800 }}>
          Trocar credenciais
        </button>

        {msg && (
          <div style={{ marginTop: 12, fontSize: 12, color: msg.ok ? 'var(--ok)' : '#fca5a5' }}>
            {msg.ok ? '✓' : '✕'} {msg.texto}
          </div>
        )}
      </Bloco>

      <Bloco titulo="Aviso" desc="O acesso do painel fica salvo neste navegador. Em produção, ele passa a ser validado no Supabase com a tabela `admins` e verificação de dois fatores.">
        <div style={{ fontSize: 11.5, color: 'var(--txt-2)', lineHeight: 1.7 }}>
          Se esquecer a senha, limpe o armazenamento do site (<code>vortex.config.v1</code>) — o acesso volta para{' '}
          <code>admin</code> / <code>vortex2026</code>.
        </div>
      </Bloco>
    </>
  );
}

/* ---------------- sistema ---------------- */

function Sistema() {
  const [config, setConfig] = useState<Config>(lerConfig());
  const [limpo, setLimpo] = useState(false);

  const salvar = () => {
    gravarConfig(config);
    setLimpo(true);
    setTimeout(() => setLimpo(false), 2000);
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Sistema</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>Identidade e comportamento do produto.</p>

      <Bloco titulo="Identidade">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={rotulo}>Nome do produto</label>
            <input style={campo} value={config.nomeApp} onChange={(e) => setConfig({ ...config, nomeApp: e.target.value })} />
          </div>
          <div>
            <label style={rotulo}>E-mail de suporte</label>
            <input style={campo} value={config.emailSuporte} onChange={(e) => setConfig({ ...config, emailSuporte: e.target.value })} />
          </div>
        </div>
      </Bloco>

      <Bloco titulo="Modo manutenção" desc="Bloqueia o editor para todos os clientes enquanto você mexe no sistema.">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
          <input type="checkbox" checked={config.manutencao} onChange={(e) => setConfig({ ...config, manutencao: e.target.checked })} />
          Sistema em manutenção
        </label>
      </Bloco>

      <Bloco titulo="Dados" desc="Apagar tudo volta o sistema ao estado de fábrica — inclusive a senha do admin.">
        <button
          className="btn"
          style={{ color: 'var(--err)', fontSize: 12 }}
          onClick={() => {
            if (!confirm('Apagar TODOS os dados locais (contas, projetos, configurações)?')) return;
            localStorage.clear();
            sessionStorage.clear();
            location.reload();
          }}
        >
          Apagar todos os dados deste navegador
        </button>
      </Bloco>

      <button className="btn primary" onClick={salvar} style={{ padding: '10px 20px', fontWeight: 800 }}>
        {limpo ? '✓ Salvo' : 'Salvar sistema'}
      </button>
    </>
  );
}
