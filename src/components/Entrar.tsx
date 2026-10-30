import { useEffect, useState } from 'react';
import { criarConta, entrar, lerConfigNuvem, type Sessao } from '../lib/contas';

interface Props {
  onEntrar: (s: Sessao) => void;
  onVoltar?: () => void;
}

const LOGO = (
  <svg width="46" height="46" viewBox="0 0 32 32" aria-hidden>
    <rect width="32" height="32" rx="9" fill="#0b0f14" />
    <path d="M8 9l8 14 8-14" stroke="#22d3ee" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Entrar({ onEntrar, onVoltar }: Props) {
  const [modo, setModo] = useState<'entrar' | 'criar'>('criar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  /* horas de teste que o admin definiu para contas novas (vem do servidor) */
  const [horasTeste, setHorasTeste] = useState<number | null>(null);

  useEffect(() => {
    lerConfigNuvem()
      .then((c) => setHorasTeste(Number(c?.horas_teste_novo_usuario ?? 0)))
      .catch(() => setHorasTeste(null));
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    const r = modo === 'criar' ? await criarConta(nome, email, senha) : await entrar(email, senha);
    setCarregando(false);
    if (!r.ok || !r.sessao) {
      setErro(r.erro ?? 'Não foi possível continuar');
      return;
    }
    onEntrar(r.sessao);
  };

  const campo: React.CSSProperties = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: 10,
    border: '1px solid var(--line)',
    background: 'var(--bg-2)',
    color: 'var(--txt)',
    fontSize: 13.5,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div className="entrar-wrap">
      {/* ---------- lado esquerdo: apresentação ---------- */}
      <div
        className="entrar-lado"
        style={{
          padding: '56px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background:
            'radial-gradient(900px 520px at 12% 18%, rgba(34,211,238,.16), transparent 62%), radial-gradient(760px 480px at 88% 92%, rgba(99,102,241,.18), transparent 60%), var(--bg)',
          borderRight: '1px solid var(--line)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 34 }}>
          {LOGO}
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.4px' }}>Vortex</div>
            <div style={{ fontSize: 11.5, color: 'var(--txt-2)', letterSpacing: '.8px' }}>EDITOR PROFISSIONAL</div>
          </div>
        </div>

        <h1 className="entrar-titulo" style={{ fontSize: 40, lineHeight: 1.08, letterSpacing: '-1.4px', margin: '0 0 14px', fontWeight: 900 }}>
          Edite vídeo, áudio e
          <br />
          <span style={{ color: 'var(--acc)' }}>motion graphics</span> no navegador.
        </h1>

        <p style={{ color: 'var(--txt-2)', fontSize: 14.5, lineHeight: 1.65, maxWidth: 460, margin: '0 0 30px' }}>
          Timeline multi-trilha, keyframes, efeitos, biblioteca com templates e packs prontos.
          Sem instalar nada, sem renderizar na sua máquina.
        </p>

        {[
          ['▣', 'Baixe imagem, vídeo e áudio de qualquer site', 'Cole o endereço e o Vortex encontra as mídias.'],
          ['▶', 'Timeline com trilhas ilimitadas', 'Corte, arraste, sobreponha e anime com keyframes.'],
          ['✦', 'Biblioteca de conteúdo incluída', 'Templates, transições, looks, SFX e overlays.'],
          ['↑', 'Exporte em MP4, WebM ou WAV', 'Presets prontos para Reels, Shorts e YouTube.'],
        ].map(([ico, titulo, sub]) => (
          <div key={titulo} className="entrar-item" style={{ display: 'flex', gap: 13, marginBottom: 18 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'rgba(34,211,238,.12)',
                border: '1px solid rgba(34,211,238,.28)',
                color: 'var(--acc)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                flex: 'none',
              }}
            >
              {ico}
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{titulo}</div>
              <div style={{ fontSize: 12, color: 'var(--txt-2)', marginTop: 2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- lado direito: formulário ---------- */}
      <div className="entrar-form-wrap">
        <form onSubmit={enviar} style={{ width: '100%', maxWidth: 372 }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.6px', marginBottom: 6 }}>
            {modo === 'criar' ? 'Criar sua conta' : 'Entrar no Vortex'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--txt-2)', marginBottom: 22 }}>
            {modo === 'criar' ? (
              horasTeste && horasTeste > 0 ? (
                <>
                  Leva 20 segundos. Sua conta nova ganha{' '}
                  <b style={{ color: 'var(--acc)' }}>
                    {horasTeste >= 24 ? `${Math.round(horasTeste / 24)} dia(s)` : `${horasTeste}h`} de acesso
                  </b>{' '}
                  para testar tudo.
                </>
              ) : (
                'Leva 20 segundos. A conta já nasce pronta para receber horas de plano.'
              )
            ) : (
              'Bom te ver de novo — seu plano aparece em qualquer aparelho.'
            )}
          </div>

          {modo === 'criar' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11.5, color: 'var(--txt-2)', display: 'block', marginBottom: 5 }}>Seu nome</label>
              <input
                style={campo}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como quer ser chamado"
                autoComplete="name"
              />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11.5, color: 'var(--txt-2)', display: 'block', marginBottom: 5 }}>E-mail</label>
            <input
              style={campo}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              type="email"
              autoComplete="email"
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11.5, color: 'var(--txt-2)', display: 'block', marginBottom: 5 }}>Senha</label>
            <input
              style={campo}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={modo === 'criar' ? 'mínimo 6 caracteres' : 'sua senha'}
              type="password"
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
            />
          </div>

          {erro && (
            <div
              style={{
                margin: '10px 0',
                padding: '9px 12px',
                borderRadius: 9,
                background: 'rgba(248,113,113,.1)',
                border: '1px solid rgba(248,113,113,.3)',
                color: '#fca5a5',
                fontSize: 12.5,
              }}
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="btn primary"
            style={{ width: '100%', marginTop: 14, padding: '12px', fontSize: 14, fontWeight: 800 }}
          >
            {carregando ? 'Aguarde…' : modo === 'criar' ? 'Criar conta e abrir o editor' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5, color: 'var(--txt-2)' }}>
            {modo === 'criar' ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setModo(modo === 'criar' ? 'entrar' : 'criar');
                setErro('');
              }}
              style={{ background: 'none', border: 0, color: 'var(--acc)', cursor: 'pointer', fontSize: 12.5, fontWeight: 700 }}
            >
              {modo === 'criar' ? 'Entrar' : 'Criar agora'}
            </button>
          </div>

          <div
            style={{
              marginTop: 26,
              paddingTop: 16,
              borderTop: '1px solid var(--line)',
              fontSize: 11,
              color: 'var(--txt-2)',
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            Conta no servidor: sua senha é guardada só como hash (bcrypt) — nem nós conseguimos ler.
            <br />
            O plano é por horas e fica na sua conta, em qualquer aparelho.
          </div>
        </form>
      </div>
    </div>
  );
}
