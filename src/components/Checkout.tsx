import { useMemo, useState } from 'react';
import { useUI } from '../store/ui';
import { lerConfig, type Plano } from '../lib/config';
import { mudarPlano } from '../lib/contas';

/* ============================================================
   CHECKOUT — assinatura completa
   Etapas: plano → dados → pagamento → pronto
   ============================================================ */

type Etapa = 'plano' | 'dados' | 'pagamento' | 'pronto';

const campo: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--line-2)',
  background: 'var(--bg-2)',
  color: 'var(--txt-0)',
  fontSize: 13,
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

const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

export function Checkout() {
  const { closeModal, sessao, setSessao, toast } = useUI();
  const config = useMemo(() => lerConfig(), []);
  const planos = config.planos.filter((p) => p.ativo && p.id !== 'free');

  const [etapa, setEtapa] = useState<Etapa>('plano');
  const [escolhido, setEscolhido] = useState<Plano>(planos.find((p) => p.destaque) ?? planos[0]);
  const [metodo, setMetodo] = useState<'pix' | 'cartao'>(config.pagamento.pixAtivo ? 'pix' : 'cartao');
  const [nome, setNome] = useState(sessao?.nome ?? '');
  const [email, setEmail] = useState(sessao?.email ?? '');
  const [cpf, setCpf] = useState('');
  const [cartao, setCartao] = useState({ numero: '', nome: '', validade: '', cvv: '' });
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');
  const [codigoPix] = useState(() => {
    const b = new Uint8Array(14);
    crypto.getRandomValues(b);
    return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  });

  /* ---------------- finalização ---------------- */

  /** limpa o erro assim que o cliente corrige algo */
  const editar = () => {
    if (erro) setErro('');
  };

  const finalizar = () => {
    setErro('');
    if (metodo === 'cartao') {
      const num = cartao.numero.replace(/\s/g, '');
      if (num.length < 13) return setErro('Número do cartão incompleto');
      if (!/^\d{2}\/\d{2}$/.test(cartao.validade)) return setErro('Validade no formato MM/AA');
      if (cartao.cvv.length < 3) return setErro('CVV inválido');
      if (cartao.nome.trim().length < 3) return setErro('Nome impresso no cartão');
    }
    if (nome.trim().length < 2) return setErro('Digite seu nome');
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return setErro('E-mail inválido');

    setProcessando(true);

    // provedor externo configurado com link pronto → manda para lá
    if (config.pagamento.provedor !== 'nenhum' && config.pagamento.provedor !== 'manual' && config.pagamento.urlCheckout) {
      const url = config.pagamento.urlCheckout;
      window.open(url, '_blank', 'noopener');
      setProcessando(false);
      setEtapa('pronto');
      toast('Abrimos o checkout do provedor em outra aba', 'ok');
      return;
    }

    // fluxo interno (manual / demonstração)
    setTimeout(() => {
      if (sessao) {
        mudarPlano(sessao.contaId, escolhido.id);
        setSessao({ ...sessao, plano: escolhido.id });
      }
      setProcessando(false);
      setEtapa('pronto');
      toast(`Plano ${escolhido.nome} ativado`, 'ok');
    }, 1400);
  };

  const concluir = () => {
    closeModal();
  };

  /* ---------------- telas ---------------- */

  const passos = ['Plano', 'Dados', 'Pagamento'];
  const indice = etapa === 'plano' ? 0 : etapa === 'dados' ? 1 : 2;

  return (
    <div className="overlay" onClick={closeModal}>
      <div
        className="modal"
        style={{ width: 'min(720px,100%)', maxHeight: '92vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title">
            {etapa === 'pronto' ? 'Assinatura ativa' : 'Assinar ' + (config.nomeApp || 'Vortex')}
          </div>
          <div className="spacer" />
          <button className="btn ghost icon" onClick={closeModal}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* ---------- trilha de etapas ---------- */}
          {etapa !== 'pronto' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
              {passos.map((p, i) => (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: i < 2 ? 1 : 'none' }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      background: i <= indice ? 'var(--acc)' : 'var(--bg-3)',
                      color: i <= indice ? '#04121a' : 'var(--txt-2)',
                    }}
                  >
                    {i < indice ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: i <= indice ? 'var(--txt-0)' : 'var(--txt-2)' }}>{p}</span>
                  {i < 2 && <div style={{ flex: 1, height: 1, background: i < indice ? 'var(--acc)' : 'var(--line)' }} />}
                </div>
              ))}
            </div>
          )}

          {/* ================= 1. PLANO ================= */}
          {etapa === 'plano' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(planos.length, 1)},1fr)`, gap: 10 }}>
                {planos.map((p) => {
                  const ativo = escolhido.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setEscolhido(p)}
                      style={{
                        textAlign: 'left',
                        padding: 16,
                        borderRadius: 11,
                        border: `1.5px solid ${ativo ? 'var(--acc)' : 'var(--line)'}`,
                        background: ativo ? 'rgba(34,211,238,.07)' : 'var(--bg-2)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                        <b style={{ fontSize: 14 }}>{p.nome}</b>
                        {p.destaque && <span className="pill paid">POPULAR</span>}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.8px' }}>
                        {brl(p.preco)}
                        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--txt-2)' }}>/{p.periodo}</span>
                      </div>
                      <div style={{ marginTop: 10 }}>
                        {p.itens.slice(0, 4).map((it) => (
                          <div key={it} style={{ display: 'flex', gap: 6, fontSize: 11.5, color: 'var(--txt-1)', marginBottom: 4 }}>
                            <span style={{ color: 'var(--acc)' }}>✓</span>
                            {it}
                          </div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button className="btn primary" style={{ width: '100%', marginTop: 18, padding: 12, fontWeight: 800 }} onClick={() => setEtapa('dados')}>
                Continuar com {escolhido.nome} — {brl(escolhido.preco)}/mês
              </button>
              <p style={{ fontSize: 10.5, color: 'var(--txt-2)', textAlign: 'center', marginTop: 9 }}>
                Cancele quando quiser · sem fidelidade
              </p>
            </>
          )}

          {/* ================= 2. DADOS ================= */}
          {etapa === 'dados' && (
            <>
              <label style={rotulo}>Nome completo</label>
              <input style={{ ...campo, marginBottom: 12 }} value={nome} onChange={(e) => { editar(); setNome(e.target.value); }} />

              <label style={rotulo}>E-mail</label>
              <input style={{ ...campo, marginBottom: 12 }} type="email" value={email} onChange={(e) => { editar(); setEmail(e.target.value); }} />

              <label style={rotulo}>CPF / CNPJ</label>
              <input
                style={{ ...campo, marginBottom: 12 }}
                value={cpf}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 14);
                  const fmt =
                    v.length <= 11
                      ? v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                      : v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
                  setCpf(fmt);
                }}
                placeholder="000.000.000-00"
              />

              <div style={{ display: 'flex', gap: 9, marginTop: 6 }}>
                <button className="btn ghost" onClick={() => setEtapa('plano')} style={{ flex: 1 }}>
                  Voltar
                </button>
                <button className="btn primary" onClick={() => setEtapa('pagamento')} style={{ flex: 2, fontWeight: 800 }}>
                  Ir para pagamento
                </button>
              </div>
            </>
          )}

          {/* ================= 3. PAGAMENTO ================= */}
          {etapa === 'pagamento' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {config.pagamento.pixAtivo && (
                  <button className={`btn ${metodo === 'pix' ? 'primary' : 'ghost'}`} style={{ flex: 1 }} onClick={() => setMetodo('pix')}>
                    PIX
                  </button>
                )}
                {config.pagamento.cartaoAtivo && (
                  <button className={`btn ${metodo === 'cartao' ? 'primary' : 'ghost'}`} style={{ flex: 1 }} onClick={() => setMetodo('cartao')}>
                    Cartão de crédito
                  </button>
                )}
              </div>

              {metodo === 'pix' && (
                <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
                  {/* QR code decorativo gerado por padrão determinístico */}
                  <div
                    style={{
                      width: 168,
                      height: 168,
                      margin: '0 auto 14px',
                      borderRadius: 10,
                      background: '#fff',
                      padding: 9,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(21,1fr)',
                      gap: 0,
                    }}
                  >
                    {Array.from({ length: 441 }).map((_, i) => {
                      const x = i % 21;
                      const y = Math.floor(i / 21);
                      const marcador = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
                      const borda = marcador && (x < 7 && y < 7 ? x === 0 || y === 0 || x === 6 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5) : true);
                      const aleatorio = (codigoPix.charCodeAt((i * 7) % codigoPix.length) + x * 3 + y * 5) % 3 === 0;
                      const on = marcador ? borda : aleatorio;
                      return <div key={i} style={{ background: on ? '#0b0f16' : 'transparent' }} />;
                    })}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--txt-1)', marginBottom: 6 }}>
                    Escaneie para pagar <b>{brl(escolhido.preco)}</b>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      color: 'var(--txt-2)',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--line)',
                      borderRadius: 7,
                      padding: 9,
                      wordBreak: 'break-all',
                      marginBottom: 10,
                    }}
                  >
                    00020126BR.GOV.BCB.PIX{codigoPix.slice(0, 8)}5204000053039865802BR5920VORTEX EDITOR LTDA6009SAO PAULO62070503{codigoPix.slice(0, 6)}6304{codigoPix.slice(6, 10)}
                  </div>
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(codigoPix);
                      toast('Código PIX copiado', 'ok');
                    }}
                  >
                    Copiar código PIX
                  </button>
                </div>
              )}

              {metodo === 'cartao' && (
                <>
                  <label style={rotulo}>Número do cartão</label>
                  <input
                    style={{ ...campo, marginBottom: 12 }}
                    value={cartao.numero}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                      editar(); setCartao({ ...cartao, numero: v.replace(/(\d{4})(?=\d)/g, '$1 ') });
                    }}
                    placeholder="0000 0000 0000 0000"
                    inputMode="numeric"
                  />

                  <label style={rotulo}>Nome impresso no cartão</label>
                  <input style={{ ...campo, marginBottom: 12 }} value={cartao.nome} onChange={(e) => { editar(); setCartao({ ...cartao, nome: e.target.value.toUpperCase() }); }} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={rotulo}>Validade</label>
                      <input
                        style={campo}
                        value={cartao.validade}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                          editar(); setCartao({ ...cartao, validade: v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v });
                        }}
                        placeholder="MM/AA"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label style={rotulo}>CVV</label>
                      <input
                        style={campo}
                        value={cartao.cvv}
                        onChange={(e) => { editar(); setCartao({ ...cartao, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }); }}
                        placeholder="123"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginTop: 16, padding: 12, borderRadius: 9, background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', fontSize: 12.5 }}>
                  <span>Plano {escolhido.nome}</span>
                  <div style={{ flex: 1 }} />
                  <b>{brl(escolhido.preco)}</b>
                </div>
                <div style={{ display: 'flex', fontSize: 11, color: 'var(--txt-2)', marginTop: 4 }}>
                  <span>Cobrança mensal · cancele quando quiser</span>
                  <div style={{ flex: 1 }} />
                  <span>total hoje</span>
                </div>
              </div>

              {erro && (
                <div style={{ marginTop: 12, fontSize: 12, color: '#fca5a5', background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', padding: '8px 11px', borderRadius: 8 }}>
                  {erro}
                </div>
              )}

              <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                <button className="btn ghost" onClick={() => setEtapa('dados')} style={{ flex: 1 }}>
                  Voltar
                </button>
                <button className="btn primary" onClick={finalizar} disabled={processando} style={{ flex: 2, fontWeight: 800 }}>
                  {processando ? 'Processando…' : `Pagar ${brl(escolhido.preco)}`}
                </button>
              </div>

              <p style={{ fontSize: 10, color: 'var(--txt-2)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
                {config.pagamento.provedor === 'nenhum' || config.pagamento.provedor === 'manual'
                  ? 'Modo demonstração: nenhum valor é cobrado. Configure um provedor no painel administrativo para cobrar de verdade.'
                  : `Pagamento processado por ${config.pagamento.provedor}.`}
              </p>
            </>
          )}

          {/* ================= 4. PRONTO ================= */}
          {etapa === 'pronto' && (
            <div style={{ textAlign: 'center', padding: '18px 0' }}>
              <div
                style={{
                  width: 62,
                  height: 62,
                  borderRadius: '50%',
                  background: 'rgba(52,211,153,.14)',
                  border: '1px solid var(--ok)',
                  color: 'var(--ok)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 28,
                  margin: '0 auto 16px',
                }}
              >
                ✓
              </div>
              <div style={{ fontSize: 19, fontWeight: 900, marginBottom: 6 }}>Plano {escolhido.nome} ativado</div>
              <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 18, lineHeight: 1.6 }}>
                Todos os packs, export em alta resolução e a IA estão liberados.
                <br />
                {config.pagamento.provedor === 'manual' && 'Envie o comprovante para ' + config.emailSuporte + '.'}
              </p>
              <button className="btn primary" onClick={concluir} style={{ padding: '11px 26px', fontWeight: 800 }}>
                Voltar ao editor
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
