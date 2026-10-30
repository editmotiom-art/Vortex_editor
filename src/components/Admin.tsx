import { useEffect, useState } from 'react';
import {
  gravarConfig,
  lerConfig,
  testarIA,
  testarPagamento,
  trocarCredenciais,
  type Config,
} from '../lib/config';
import { adminLogado, conferirAdmin, entrarAdmin, sairAdmin } from '../lib/adminSessao';

import { lerCache, varrerAcervo } from '../lib/driveIndex';
import { useUI } from '../store/ui';
import { VAULT_DRIVE } from '../data/catalogo';
import { lerFontesSkills, salvarFontesSkills, type FonteSkill } from '../lib/fontesSkills';
import { adicionarSkillDoLink, lerSkillsImportadas, removerSkillImportada } from '../lib/skillsImportadas';
import { TODAS_SKILLS } from './SkillsChat';
import { COTAS, lerUso, zerarUso } from '../lib/packsMonkeyPlan';
import { baseApi, lerSaudeApi, testarApi } from '../lib/api';
import { chamarFuncao, urlFuncao } from '../lib/api';
import { Clientes, Pagamentos, RegrasPlano, Visao } from './AdminNuvem';

/* ============================================================
   PAINEL ADMINISTRATIVO
   ============================================================ */

type Aba = 'visao' | 'contas' | 'horas' | 'pagamentos' | 'planos' | 'ia' | 'voz' | 'skills' | 'packs' | 'api' | 'pagamento' | 'acesso' | 'marca' | 'midia' | 'sistema';

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

  /* revalida no banco: se o token não for de admin, o painel fecha */
  useEffect(() => {
    void conferirAdmin().then((ok) => {
      if (!ok) setLogado(false);
    });
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
            ['horas', 'Horas de plano'],
            ['pagamentos', 'Pagamentos'],
            ['planos', 'Planos e preços'],
            ['pagamento', 'Pagamento'],
            ['ia', 'Inteligência artificial'],
            ['voz', 'Voz e narração'],
            ['skills', 'Skills do chat'],
            ['packs', 'Pack do Editor'],
            ['api', 'API e hospedagem'],
            ['acesso', 'Acesso do admin'],
            ['marca', 'App e marca'],
            ['midia', 'Acervo e mídia'],
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
        {aba === 'contas' && <Clientes />}
        {aba === 'horas' && <RegrasPlano />}
        {aba === 'pagamentos' && <Pagamentos />}
        {aba === 'planos' && <Planos />}
        {aba === 'pagamento' && <Pagamento />}
        {aba === 'ia' && <IA />}
        {aba === 'voz' && <Voz />}
        {aba === 'skills' && <Skills />}
        {aba === 'packs' && <Packs />}
        {aba === 'api' && <Api />}
        {aba === 'acesso' && <Acesso />}
        {aba === 'marca' && <Marca />}
        {aba === 'midia' && <AcervoAdmin />}
        {aba === 'sistema' && <Sistema />}
      </main>
    </div>
  );
}

/* ---------------- login ---------------- */

function LoginAdmin({ onEntrar }: { onEntrar: () => void }) {
  const [usuario, setUsuario] = useState('');
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
        <input
          style={{ ...campo, marginBottom: 12 }}
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoComplete="username"
          placeholder="e-mail do administrador"
        />

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
          Acesso restrito à administração. Entre com a conta de administrador.
        </div>
      </form>
    </div>
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

      <Bloco
        titulo="Gerador de texto (Prompt) sem chave"
        desc="É o motor que responde o chat de criação quando você não coloca chave paga. Aberto, sem custo e sem cadastro."
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={config.ia.textoGratuito}
            onChange={(e) => setIA('textoGratuito', e.target.checked)}
          />
          Usar motor gratuito (Pollinations — openai-fast, mistral, llama)
        </label>

        <label style={rotulo}>API compatível com OpenAI (opcional — Groq, OpenRouter, Together, Ollama…)</label>
        <input
          style={{ ...campo, marginBottom: 10 }}
          value={config.ia.baseUrl}
          onChange={(e) => setIA('baseUrl', e.target.value)}
          placeholder="https://api.groq.com/openai/v1  ou  http://localhost:11434/v1"
        />

        <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn"
            onClick={async () => {
              gravarConfig(config);
              setResultado('Testando o gerador de texto…');
              try {
                const r = await chamarFuncao('ferramentas', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({
                    acao: 'texto',
                    prompt: 'Escreva em português uma frase curta sobre editar vídeo no celular.',
                    chave: config.ia.chave,
                    baseUrl: config.ia.baseUrl,
                    modelo: config.ia.modeloTexto,
                  }),
                });
                const d = (await r.json().catch(() => ({}))) as { ok?: boolean; texto?: string; fonte?: string; erro?: string };
                setResultado(
                  d.ok
                    ? `✓ respondeu via ${d.fonte === 'api' ? 'sua API' : 'motor gratuito'}: “${(d.texto ?? '').slice(0, 160)}…”`
                    : `⚠ ${d.erro ?? 'não respondeu'}`,
                );
              } catch (e) {
                setResultado(`⚠ ${(e as Error).message}`);
              }
            }}
          >
            Testar gerador de texto
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
            Se a chave estiver vazia, o teste já usa o motor gratuito.
          </span>
        </div>
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
              'Pronto para gerar. A chamada real usa a função de servidor (ia) para não expor a chave — configure IA_API_KEY na Netlify ou no Cloudflare Worker (Admin → Sistema).',
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


/* ============================= APP E MARCA ============================= */
function Marca() {
  const { toast } = useUI();
  const [cfg, setCfg] = useState<Config>(lerConfig());
  const [rascunho, setRascunho] = useState({
    nomeApp: (cfg as unknown as { marca?: { nome?: string } }).marca?.nome ?? 'Vortex',
    cor: (cfg as unknown as { marca?: { cor?: string } }).marca?.cor ?? '#22d3ee',
    rodape: (cfg as unknown as { marca?: { rodape?: string } }).marca?.rodape ?? '',
    suporte: (cfg as unknown as { marca?: { suporte?: string } }).marca?.suporte ?? '',
    aviso: (cfg as unknown as { marca?: { aviso?: string } }).marca?.aviso ?? '',
  });

  const salvar = () => {
    const atualizado = {
      ...cfg,
      marca: {
        nome: rascunho.nomeApp,
        cor: rascunho.cor,
        rodape: rascunho.rodape,
        suporte: rascunho.suporte,
        aviso: rascunho.aviso,
      },
    } as unknown as Config;
    gravarConfig(atualizado);
    setCfg(atualizado);
    document.documentElement.style.setProperty('--acc', rascunho.cor);
    toast('Marca e aparência atualizadas', 'ok');
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>App e marca</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
        Nome, cor principal e avisos do sistema. O que você salvar aqui aparece para todos os clientes.
      </p>

      <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
          Nome do aplicativo
          <input style={campo} value={rascunho.nomeApp} onChange={(e) => setRascunho({ ...rascunho, nomeApp: e.target.value })} />
        </label>
        <label style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
          Cor principal (aparece em botões, destaques e no editor)
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <input
              type="color"
              value={rascunho.cor}
              onChange={(e) => setRascunho({ ...rascunho, cor: e.target.value })}
              style={{ width: 46, height: 34, border: 'none', background: 'transparent', cursor: 'pointer' }}
            />
            <code style={{ fontSize: 12, color: 'var(--txt-1)' }}>{rascunho.cor}</code>
          </div>
        </label>
        <label style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
          Texto do rodapé do editor
          <input style={campo} value={rascunho.rodape} placeholder="ex.: editmotion.art · support" onChange={(e) => setRascunho({ ...rascunho, rodape: e.target.value })} />
        </label>
        <label style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
          Contato de suporte (aparece no painel do cliente)
          <input style={campo} value={rascunho.suporte} placeholder="ex.: suporte@seudominio.com" onChange={(e) => setRascunho({ ...rascunho, suporte: e.target.value })} />
        </label>
        <label style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>
          Aviso global (banner no editor — deixe vazio para não mostrar)
          <input style={campo} value={rascunho.aviso} placeholder="ex.: manutenção domingo das 2h às 4h" onChange={(e) => setRascunho({ ...rascunho, aviso: e.target.value })} />
        </label>
        <button className="btn primary" style={{ maxWidth: 220 }} onClick={salvar}>
          Salvar alterações
        </button>
      </div>
    </>
  );
}

/* ============================= ACERVO E MÍDIA ============================= */
function AcervoAdmin() {
  const { toast } = useUI();
  const [idx, setIdx] = useState(() => lerCache());
  const [varrendo, setVarrendo] = useState(false);
  const [prog, setProg] = useState('');

  const varrer = async () => {
    setVarrendo(true);
    try {
      const r = await varrerAcervo(
        VAULT_DRIVE.map((p) => ({ id: p.pastaId, nome: p.nome })),
        (p) => setProg(`Lendo “${p.pastaAtual}” · ${p.itens} arquivos`),
      );
      setIdx(r);
      toast(`${r.itens.length} arquivos indexados`, 'ok');
    } catch (e) {
      toast(`Falha: ${(e as Error).message}`, 'err');
    } finally {
      setVarrendo(false);
      setProg('');
    }
  };

  const total = idx?.itens.length ?? 0;
  const videos = idx?.itens.filter((i) => i.tipo === 'video').length ?? 0;
  const audios = idx?.itens.filter((i) => i.tipo === 'audio').length ?? 0;
  const imagens = idx?.itens.filter((i) => i.tipo === 'image').length ?? 0;

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Acervo e mídia</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
        Pastas do Drive que alimentam a biblioteca. A leitura é feita pelo servidor do site, sem chave de API.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Arquivos', total],
          ['Vídeos', videos],
          ['Áudios', audios],
          ['Imagens', imagens],
          ['Pastas', VAULT_DRIVE.length],
        ].map(([l, v]) => (
          <div key={l as string} style={{ border: '1px solid var(--line)', borderRadius: 9, padding: 12, background: 'var(--bg-2)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--txt-2)' }}>{l}</div>
            <div style={{ fontSize: 19, fontWeight: 900 }}>{v as number}</div>
          </div>
        ))}
      </div>

      <button className="btn primary" disabled={varrendo} onClick={() => void varrer()} style={{ marginBottom: 8 }}>
        {varrendo ? 'Varrendo…' : 'Varrer o Drive agora'}
      </button>
      {prog && <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginBottom: 8 }}>{prog}</div>}

      <div style={{ marginTop: 12, border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
        <div style={{ padding: '8px 12px', background: 'var(--bg-2)', fontSize: 10.5, fontWeight: 800, color: 'var(--txt-2)', letterSpacing: '.5px' }}>
          PASTAS DO ACERVO
        </div>
        {VAULT_DRIVE.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid var(--line)', fontSize: 12 }}>
            <span>{p.nome}</span>
            <span style={{ color: 'var(--txt-2)', fontSize: 10.5 }}>{p.categoria}</span>
          </div>
        ))}
      </div>
    </>
  );
}

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

/* ---------------- voz e narração ---------------- */

function Voz() {
  const { toast } = useUI();
  const [config, setConfig] = useState<Config>(lerConfig());
  const [teste, setTeste] = useState('');
  const [tocando, setTocando] = useState(false);
  const [amostra, setAmostra] = useState('Olá! Esta é a voz da sua narração no Vortex.');

  const setVoz = (campo: keyof Config['voz'], valor: unknown) =>
    setConfig({ ...config, voz: { ...config.voz, [campo]: valor } });

  const salvar = () => {
    gravarConfig(config);
    setTeste('Configuração de voz salva');
    toast('Voz salva', 'ok');
  };

  const ouvir = async () => {
    setTocando(true);
    setTeste('');
    try {
      const r = await chamarFuncao('ferramentas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          acao: 'voz',
          texto: amostra,
          idioma: config.voz.idioma,
          voz: config.voz.idioma,
          velocidade: config.voz.velocidade,
          provedor: config.voz.provedor,
          chave: config.voz.chave,
          urlTemplate: config.voz.urlTemplate,
        }),
      });
      if (!r.ok) {
        const erro = (await r.json().catch(() => ({}))) as { erro?: string };
        setTeste(`Falhou: ${erro.erro ?? r.status}`);
        return;
      }
      const blob = await r.blob();
      const el = new Audio(URL.createObjectURL(blob));
      await el.play().catch(() => undefined);
      setTeste(`Áudio real gerado: ${(blob.size / 1024).toFixed(0)} KB · ${el.duration ? el.duration.toFixed(1) + 's' : 'MP3'}`);
    } finally {
      setTocando(false);
    }
  };

  return (
    <>
      <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 4px' }}>Voz e narração</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', margin: '0 0 16px' }}>
        A voz usada em “Legenda → Voz e narração”. O Google entrega MP3 pronto sem chave; ElevenLabs e
        endpoint próprio funcionam quando você tem a chave.
      </p>

      <Bloco titulo="Provedor de voz">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginBottom: 10 }}>
          <input type="checkbox" checked={config.voz.ativo} onChange={(e) => setVoz('ativo', e.target.checked)} />
          Voz liberada no editor
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={rotulo}>Provedor</label>
            <select style={campo} value={config.voz.provedor} onChange={(e) => setVoz('provedor', e.target.value)}>
              <option value="google">Google TTS (grátis, sem chave)</option>
              <option value="elevenlabs">ElevenLabs (chave)</option>
              <option value="proprio">Meu endpoint</option>
            </select>
          </div>
          <div>
            <label style={rotulo}>Idioma</label>
            <select style={campo} value={config.voz.idioma} onChange={(e) => setVoz('idioma', e.target.value)}>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="pt-PT">Português (Portugal)</option>
              <option value="en-US">Inglês</option>
              <option value="es">Espanhol</option>
            </select>
          </div>
        </div>

        <label style={{ ...rotulo, marginTop: 10 }}>Velocidade ({config.voz.velocidade.toFixed(1)}×)</label>
        <input
          type="range"
          min={0.7}
          max={1.3}
          step={0.1}
          value={config.voz.velocidade}
          onChange={(e) => setVoz('velocidade', Number(e.target.value))}
          style={{ width: '100%' }}
        />

        {config.voz.provedor === 'elevenlabs' && (
          <>
            <label style={{ ...rotulo, marginTop: 10 }}>Chave ElevenLabs</label>
            <input
              style={campo}
              type="password"
              value={config.voz.chave}
              onChange={(e) => setVoz('chave', e.target.value)}
              placeholder="xi-api-key"
            />
          </>
        )}

        {config.voz.provedor === 'proprio' && (
          <>
            <label style={{ ...rotulo, marginTop: 10 }}>URL do seu TTS (use {'{texto}'}, {'{voz}'}, {'{idioma}'} e {'{chave}'})</label>
            <input
              style={{ ...campo, marginBottom: 10 }}
              value={config.voz.urlTemplate}
              onChange={(e) => setVoz('urlTemplate', e.target.value)}
              placeholder="https://minha-api.com/tts?texto={texto}&voz={voz}&key={chave}"
            />
            <label style={rotulo}>Chave (opcional)</label>
            <input style={campo} type="password" value={config.voz.chave} onChange={(e) => setVoz('chave', e.target.value)} />
          </>
        )}
      </Bloco>

      <Bloco titulo="Teste real" desc="Gera o MP3 de verdade com o provedor acima e toca aqui.">
        <textarea
          style={{ ...campo, minHeight: 56, resize: 'vertical', marginBottom: 9 }}
          value={amostra}
          onChange={(e) => setAmostra(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
          <button className="btn primary" onClick={salvar} style={{ padding: '10px 20px', fontWeight: 800 }}>
            Salvar
          </button>
          <button className="btn ghost" onClick={() => void ouvir()} disabled={tocando}>
            {tocando ? 'Gerando…' : '▶ Ouvir uma amostra'}
          </button>
          {teste && <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>{teste}</span>}
        </div>
      </Bloco>
    </>
  );
}

/* ---------------- skills do chat ---------------- */

function Skills() {
  const { toast } = useUI();
  const [fontes, setFontes] = useState<FonteSkill[]>(() => lerFontesSkills());
  const [link, setLink] = useState('');
  const [trazendo, setTrazendo] = useState(false);
  const [importadas, setImportadas] = useState(() => lerSkillsImportadas());

  const mexer = (id: FonteSkill['id'], ativo: boolean) =>
    setFontes((f) => f.map((x) => (x.id === id ? { ...x, ativo } : x)));

  const importar = async () => {
    if (!/^https?:\/\/.+/i.test(link.trim())) {
      toast('Cole o link do pacote .zip ou do arquivo .md', 'warn');
      return;
    }
    setTrazendo(true);
    const r = await adicionarSkillDoLink(link.trim());
    setTrazendo(false);
    if (!r.ok) {
      toast(`Não consegui trazer: ${r.erro}`, 'err');
      return;
    }
    setLink('');
    setImportadas(lerSkillsImportadas());
    toast(`Skill “${r.nome}” adicionada ao chat`, 'ok');
  };

  const total = TODAS_SKILLS().length;
  const ativos = fontes.filter((f) => f.ativo).length;

  return (
    <>
      <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 4px' }}>Skills do chat</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', margin: '0 0 16px' }}>
        As skills são o botão “◈ Skills” dentro do chat de criação (✦ IA). Ligue e desligue as fontes, abra o
        catálogo de cada plataforma e traga novas skills por link.
      </p>

      <Bloco titulo="Fontes ligadas no botão de skills">
        {fontes.map((f) => (
          <div
            key={f.id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--line)' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>{f.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--txt-2)' }}>
                {f.embutidas} skills embutidas ·{' '}
                <a href={f.site} target="_blank" rel="noreferrer" style={{ color: 'var(--acc)' }}>
                  abrir catálogo ↗
                </a>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--txt-1)' }}>
              <input type="checkbox" checked={f.ativo} onChange={(e) => mexer(f.id, e.target.checked)} />
              {f.ativo ? 'ligada' : 'desligada'}
            </label>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginTop: 14 }}>
          <button
            className="btn primary"
            style={{ padding: '10px 20px', fontWeight: 800 }}
            onClick={() => {
              salvarFontesSkills(fontes);
              toast(`${ativos} fonte(s) ligada(s) · ${total} skills no chat`, 'ok');
            }}
          >
            Salvar fontes
          </button>
          <span style={{ fontSize: 12, color: 'var(--txt-2)' }}>{total} skills disponíveis agora no chat</span>
        </div>
      </Bloco>

      <Bloco titulo="Adicionar skill por link (qualquer site)">
        <label style={rotulo}>Link do pacote .zip ou do arquivo .md</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={campo}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://findskill.ai/skills/…/nome.zip"
          />
          <button className="btn primary" onClick={() => void importar()} disabled={trazendo} style={{ whiteSpace: 'nowrap' }}>
            {trazendo ? 'Trazendo…' : 'Adicionar'}
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--txt-2)', margin: '8px 0 0' }}>
          O link é baixado pelo servidor (sem CORS), o SKILL.md é lido e a skill passa a aparecer no botão
          “Skills” do chat. Vale para findskill.ai, GitHub e qualquer URL pública.
        </p>
      </Bloco>

      <Bloco titulo={`Skills adicionadas por link (${importadas.length})`}>
        {importadas.length === 0 && <p style={{ fontSize: 12, color: 'var(--txt-2)', margin: 0 }}>Nenhuma ainda.</p>}
        {importadas.map((s) => (
          <div
            key={s.id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}
          >
            <span style={{ fontSize: 15 }}>{s.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--txt-2)' }}>{s.resumo}</div>
            </div>
            <button
              className="btn ghost"
              style={{ fontSize: 11.5, color: 'var(--err)' }}
              onClick={() => {
                removerSkillImportada(s.id);
                setImportadas(lerSkillsImportadas());
                toast('Skill removida do chat', 'ok');
              }}
            >
              Remover
            </button>
          </div>
        ))}
      </Bloco>
    </>
  );
}

/* ---------------- packs do editor (consumo) ---------------- */

function Packs() {
  const { toast } = useUI();
  const [uso, setUso] = useState(() => lerUso());

  return (
    <>
      <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 4px' }}>Pack do Editor 4.0</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', margin: '0 0 16px' }}>
        163 packs cadastrados (Drive + espelho no Sync). O sistema guarda só nome e link: a pasta é lida na hora
        e o arquivo desce sob demanda — nada entra no banco.
      </p>

      <Bloco titulo="Consumo deste navegador">
        <div style={{ display: 'flex', gap: 22, fontSize: 12.5, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{uso.baixados}</div>
            <div style={{ color: 'var(--txt-2)', fontSize: 11 }}>downloads hoje</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{uso.total}</div>
            <div style={{ color: 'var(--txt-2)', fontSize: 11 }}>total histórico</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>{COTAS.nenhum}/{COTAS.pro}/{COTAS.studio}</div>
            <div style={{ color: 'var(--txt-2)', fontSize: 11 }}>cota free/pro/studio por dia</div>
          </div>
        </div>
        <button
          className="btn ghost"
          onClick={() => {
            zerarUso();
            setUso(lerUso());
            toast('Contador de downloads zerado', 'ok');
          }}
        >
          Zerar contador
        </button>
      </Bloco>

      <Bloco titulo="Como o catálogo é entregue">
        <ul style={{ fontSize: 12, color: 'var(--txt-1)', lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
          <li>Nome + link de cada pack ficam no bundle (39 KB) — nada de copiar arquivo para o banco.</li>
          <li>A pasta do Drive é lida pelo servidor quando o usuário abre o pack; o índice fica 7 dias em cache.</li>
          <li>O arquivo só é baixado quando o usuário clica em ↓, pelo proxy, e vira asset da biblioteca.</li>
          <li>
            Cota por plano (free 5 · pro 60 · studio 300 por dia) para não estourar banda; o espelho no Sync cobre
            pasta bloqueada.
          </li>
          <li>Regenerar o catálogo: <code>python3 packpdf/extrair_catalogo.py</code>.</li>
        </ul>
      </Bloco>
    </>
  );
}


/* ---------------- API e hospedagem ---------------- */

function Api() {
  const { toast } = useUI();
  const [config, setConfig] = useState<Config>(lerConfig());
  const [url, setUrl] = useState(baseApi());
  const [teste, setTeste] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testando, setTestando] = useState(false);
  const saude = lerSaudeApi();

  const salvar = () => {
    const limpa = url.trim().replace(/\/+$/, '');
    gravarConfig({ ...config, api: { url: limpa, ativo: true } });
    setConfig({ ...config, api: { url: limpa, ativo: true } });
    setTeste({ ok: true, msg: limpa ? 'API salva — o editor passa a usá-la' : 'Voltou a usar a Netlify' });
    toast('Endereço da API salvo', 'ok');
  };

  const testar = async () => {
    setTestando(true);
    const r = await testarApi(url.trim());
    setTeste({ ok: r.ok, msg: r.ok ? `API respondeu (versão ${r.versao ?? '—'})` : `Não respondeu: ${r.erro ?? 'sem detalhe'}` });
    setTestando(false);
  };

  return (
    <>
      <h2 style={{ fontSize: 19, fontWeight: 900, margin: '0 0 4px' }}>API e hospedagem</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', margin: '0 0 16px' }}>
        O editor precisa de 5 funções de servidor: <b>drive</b>, <b>proxy</b>, <b>ferramentas</b> (voz, texto e
        skills), <b>ia</b> e <b>minerar</b>. Elas rodam na <b>Vercel</b> (<code>/api/…</code>, mesma origem), na
        Netlify (<code>/.netlify/functions/…</code>) ou no Cloudflare Worker (<code>cloudflare/</code>) — o editor
        detecta o host sozinho e, se a API cair, usa a reserva.
      </p>

      <Bloco
        titulo="Endereço da API"
        desc="Vazio = usa o servidor do próprio site (Vercel /api/…, Netlify /.netlify/functions/…). Preenchido = usa este endereço e, se ele cair, volta sozinho para a reserva."
      >
        <label style={rotulo}>URL da API (Worker, Vercel ou servidor próprio)</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <input
            style={{ ...campo, flex: 1, minWidth: 240 }}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://vortex-api.seunome.workers.dev"
          />
          <button className="btn primary" onClick={salvar} style={{ whiteSpace: 'nowrap' }}>
            Salvar
          </button>
          <button className="btn ghost" onClick={() => void testar()} disabled={testando} style={{ whiteSpace: 'nowrap' }}>
            {testando ? 'Testando…' : 'Testar /api/ping'}
          </button>
        </div>
        {teste && (
          <p style={{ fontSize: 12, color: teste.ok ? 'var(--ok)' : 'var(--warn)', margin: 0 }}>
            {teste.ok ? '✓' : '⚠'} {teste.msg}
          </p>
        )}
        {saude && (
          <p style={{ fontSize: 11, color: 'var(--txt-2)', margin: '6px 0 0' }}>
            Última verificação: {new Date(saude.em).toLocaleString('pt-BR')} ·{' '}
            {saude.ok ? `ok (${saude.versao ?? '—'})` : `falhou (${saude.erro ?? '—'})`}
          </p>
        )}
      </Bloco>

      <Bloco
        titulo="Vercel (recomendado)"
        desc="Site e funções no mesmo lugar: o repositório já está conectado, cada push publica sozinho."
      >
        <ol style={{ fontSize: 12, lineHeight: 1.9, paddingLeft: 18, margin: 0, color: 'var(--txt-1)' }}>
          <li>Importe o repositório na Vercel (framework <b>Vite</b>, build <code>npm run build</code>, saída <code>dist</code>).</li>
          <li>As funções em <code>api/</code> são detectadas automaticamente em <code>/api/drive</code>, <code>/api/proxy</code>, <code>/api/ferramentas</code>, <code>/api/ia</code> e <code>/api/minerar</code>.</li>
          <li>(Opcional) Em <i>Settings → Environment Variables</i>: <code>IA_API_KEY</code>, <code>ELEVENLABS_KEY</code>, <code>GOOGLE_TTS_KEY</code>.</li>
          <li>Deixe o campo acima <b>vazio</b> — o editor usa <code>/api/ping</code> do próprio domínio.</li>
        </ol>
      </Bloco>

      <Bloco titulo="Cloudflare Worker (plano B grátis)" desc="100 mil requisições/dia no plano gratuito — mais que suficiente para começar.">
        <ol style={{ fontSize: 12, lineHeight: 1.9, paddingLeft: 18, margin: 0, color: 'var(--txt-1)' }}>
          <li>Instale o Wrangler: <code>npm i -g wrangler</code></li>
          <li>Entre na conta (grátis): <code>wrangler login</code></li>
          <li>
            No projeto: <code>cd cloudflare &amp;&amp; npm install &amp;&amp; npm run deploy</code>
          </li>
          <li>
            Copie a URL que aparece (<code>https://vortex-api.SEUNOME.workers.dev</code>) e cole no campo acima.
          </li>
          <li>
            (Opcional) Chaves de IA no Worker: <code>wrangler secret put IA_API_KEY</code>
          </li>
        </ol>
      </Bloco>

      <Bloco titulo="O que cada função faz">
        <ul style={{ fontSize: 12, lineHeight: 1.8, paddingLeft: 18, margin: 0, color: 'var(--txt-1)' }}>
          <li><b>drive</b> — lê pastas públicas do Google Drive (acervo e Pack do Editor).</li>
          <li><b>proxy</b> — baixa arquivo de outro site com CORS liberado.</li>
          <li><b>ferramentas</b> — voz (MP3), gerador de texto grátis e importação de skills.</li>
          <li><b>ia</b> — imagem/texto com a chave do painel (opcional).</li>
          <li><b>minerar</b> — acha imagens/vídeos em uma página.</li>
        </ul>
      </Bloco>
    </>
  );
}
