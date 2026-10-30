import { useEffect, useMemo, useState } from 'react';
import { useUI } from '../store/ui';
import {
  enviarComprovante,
  meusPagamentos,
  pedirPagamento,
  lerConfigNuvem,
  type ConfigNuvem,
  type Pagamento,
  type PedidoPagamento,
} from '../lib/contas';

/* ============================================================
   CHECKOUT — PEDIDO DE PLANO POR HORAS
   ------------------------------------------------------------
   REGRA DE SEGURANÇA (a que faltava): este modal NÃO ativa plano.
   Ele apenas registra um pedido no banco (`vortex_pagamentos`, status
   "pendente"). Quem dá horas é:
     · o admin, em #admin → Pagamentos → Confirmar; ou
     · o webhook do provedor, quando houver um.
   Sem confirmação, o token do cliente continua sem horas e o editor
   segue bloqueado. Não existe caminho no navegador para se dar plano.
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

const brl = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;

const horasTexto = (h: number) => (h >= 24 ? `${Math.round(h / 24)} dia${h >= 48 ? 's' : ''} (${h}h)` : `${h}h`);

export function Checkout() {
  const { closeModal, sessao, toast } = useUI();
  const [cfg, setCfg] = useState<ConfigNuvem | null>(null);
  const [etapa, setEtapa] = useState<Etapa>('plano');
  const [escolhido, setEscolhido] = useState<'pro' | 'studio'>('pro');
  const [nome, setNome] = useState(sessao?.nome ?? '');
  const [email, setEmail] = useState(sessao?.email ?? '');
  const [pedido, setPedido] = useState<PedidoPagamento | null>(null);
  const [comprovante, setComprovante] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [historico, setHistorico] = useState<Pagamento[]>([]);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    lerConfigNuvem().then(setCfg);
    meusPagamentos().then(setHistorico);
  }, []);

  const planos = useMemo(() => {
    const horas = cfg?.planos_horas ?? { pro: 24, studio: 168 };
    const precos = cfg?.precos_centavos ?? { pro: 2990, studio: 8990 };
    return [
      {
        id: 'pro' as const,
        nome: 'Pro',
        horas: Number(horas.pro ?? 24),
        preco: Number(precos.pro ?? 2990),
        itens: [
          'Editor completo liberado',
          'Acervo inteiro: templates, fundos, músicas e SFX',
          'Baixa Tudo + extensão do Drive',
          'Legenda automática e IA',
          'Exportação até 1080p sem marca',
        ],
        destaque: true,
      },
      {
        id: 'studio' as const,
        nome: 'Studio',
        horas: Number(horas.studio ?? 168),
        preco: Number(precos.studio ?? 8990),
        itens: [
          'Tudo do Pro',
          'Exportação 4K',
          'Fila de IA e legendas com prioridade',
          'Packs do Editor incluídos',
          'Suporte direto no WhatsApp',
        ],
        destaque: false,
      },
    ];
  }, [cfg]);

  const plano = planos.find((p) => p.id === escolhido) ?? planos[0];

  /* ---------------- criar pedido (nada é liberado) ---------------- */

  const criarPedido = async () => {
    setErro('');
    if (nome.trim().length < 2) return setErro('Digite seu nome');
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return setErro('E-mail inválido');
    if (!sessao) return setErro('Entre na sua conta para registrar o pedido');
    setProcessando(true);
    const r = await pedirPagamento(escolhido);
    setProcessando(false);
    if (!r.ok || !r.pedido) return setErro(r.erro ?? 'Não foi possível registrar o pedido');
    setPedido(r.pedido);
    setEtapa('pronto');
    toast('Pedido registrado — o plano entra assim que o pagamento for confirmado', 'ok');
    meusPagamentos().then(setHistorico);
  };

  const mandarComprovante = async () => {
    if (!pedido) return;
    if (comprovante.trim().length < 4) return setErro('Cole o código/identificador do comprovante');
    setProcessando(true);
    const r = await enviarComprovante(pedido.id, comprovante.trim());
    setProcessando(false);
    if (!r.ok) return setErro(r.erro ?? 'Não foi possível enviar');
    setEnviado(true);
    toast('Comprovante enviado — aguarde a confirmação da equipe', 'ok');
  };

  const passos = ['Plano', 'Dados', 'Pagamento'];
  const indice = etapa === 'plano' ? 0 : etapa === 'dados' ? 1 : 2;

  return (
    <div className="overlay" onClick={closeModal}>
      <div
        className="modal"
        style={{ width: 'min(700px,100%)', maxHeight: '92vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-title">Adicionar horas de plano</div>
          <div className="spacer" />
          <button className="btn ghost icon" onClick={closeModal}>
            ✕
          </button>
        </div>

        <div className="modal-body">
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {planos.map((p) => {
                  const ativo = escolhido === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setEscolhido(p.id)}
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
                      <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.8px' }}>{brl(p.preco)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginBottom: 8 }}>{horasTexto(p.horas)} de acesso</div>
                      <div style={{ marginTop: 4 }}>
                        {p.itens.map((it) => (
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

              <p style={{ fontSize: 11, color: 'var(--txt-2)', margin: '12px 0 0', lineHeight: 1.6 }}>
                O plano é por <b>horas de uso</b>, somadas ao que você já tem. Não existe renovação automática:
                quando as horas acabam, o editor continua abrindo — exportar e baixar é que pedem novo pagamento.
              </p>

              <button
                className="btn primary"
                style={{ width: '100%', marginTop: 16, padding: 12, fontWeight: 800 }}
                onClick={() => setEtapa('dados')}
              >
                Continuar com {plano.nome} — {brl(plano.preco)} · {horasTexto(plano.horas)}
              </button>
            </>
          )}

          {/* ================= 2. DADOS ================= */}
          {etapa === 'dados' && (
            <>
              <label style={rotulo}>Nome completo</label>
              <input style={{ ...campo, marginBottom: 12 }} value={nome} onChange={(e) => setNome(e.target.value)} />

              <label style={rotulo}>E-mail da conta</label>
              <input style={{ ...campo, marginBottom: 12 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

              {sessao ? (
                <p style={{ fontSize: 11.5, color: 'var(--txt-2)', margin: '0 0 4px' }}>
                  Conta: <b>{sessao.email}</b> · plano atual {sessao.plano.toUpperCase()} ·{' '}
                  {sessao.papel === 'admin' ? 'acesso administrativo' : `${sessao.horasRestantes.toFixed(1)}h restantes`}
                </p>
              ) : (
                <p style={{ fontSize: 11.5, color: 'var(--err, #f87171)', margin: '0 0 4px' }}>
                  Você precisa entrar na sua conta antes de pedir horas.
                </p>
              )}

              {erro && <p style={{ fontSize: 11.5, color: 'var(--err, #f87171)' }}>{erro}</p>}

              <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                <button className="btn ghost" onClick={() => setEtapa('plano')} style={{ flex: 1 }}>
                  Voltar
                </button>
                <button className="btn primary" onClick={criarPedido} disabled={processando} style={{ flex: 2, fontWeight: 800 }}>
                  {processando ? 'Registrando…' : 'Gerar pedido de pagamento'}
                </button>
              </div>
            </>
          )}

          {/* ================= 3. PAGAMENTO ================= */}
          {etapa === 'pagamento' && pedido && (
            <>
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--txt-2)' }}>Pedido</div>
                <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '.5px' }}>{pedido.referencia}</div>
                <div style={{ fontSize: 12.5, color: 'var(--txt-1)', marginTop: 4 }}>
                  {pedido.plano.toUpperCase()} · {horasTexto(pedido.horas)} · <b>{brl(pedido.valor_centavos)}</b>
                </div>
              </div>
              <button className="btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setEtapa('dados')}>
                Voltar
              </button>
            </>
          )}

          {/* ================= 4. PRONTO ================= */}
          {etapa === 'pronto' && pedido && (
            <div>
              <div style={{ textAlign: 'center', padding: '6px 0 14px' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(245,158,11,.14)',
                    border: '1px solid #f59e0b',
                    color: '#f59e0b',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 24,
                    margin: '0 auto 12px',
                  }}
                >
                  ⏳
                </div>
                <div style={{ fontSize: 17, fontWeight: 900 }}>Pedido registrado — aguardando pagamento</div>
                <p style={{ fontSize: 12.5, color: 'var(--txt-1)', maxWidth: 460, margin: '8px auto 0', lineHeight: 1.65 }}>
                  As horas <b>não</b> são liberadas automaticamente: elas entram assim que a equipe confirmar o
                  pagamento (ou o provedor avisar o sistema). Você acompanha o status aqui mesmo.
                </p>
              </div>

              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ color: 'var(--txt-2)' }}>Referência</span>
                  <b style={{ fontFamily: 'var(--mono)' }}>{pedido.referencia}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 6 }}>
                  <span style={{ color: 'var(--txt-2)' }}>Valor</span>
                  <b>{brl(pedido.valor_centavos)}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 6 }}>
                  <span style={{ color: 'var(--txt-2)' }}>Horas</span>
                  <b>{horasTexto(pedido.horas)}</b>
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--txt-1)', lineHeight: 1.6 }}>
                  {pedido.chave_pix ? (
                    <>
                      <b>Chave PIX:</b> <span style={{ fontFamily: 'var(--mono)' }}>{pedido.chave_pix}</span>
                    </>
                  ) : (
                    <>
                      O pagamento é combinado com a equipe (PIX). Use a referência <b>{pedido.referencia}</b> para
                      identificar seu pedido e envie o comprovante abaixo.
                    </>
                  )}
                  <div style={{ color: 'var(--txt-2)', marginTop: 4 }}>{pedido.instrucoes}</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={rotulo}>Comprovante (código, ID da transação ou link)</label>
                <input
                  style={{ ...campo, marginBottom: 8 }}
                  value={comprovante}
                  onChange={(e) => setComprovante(e.target.value)}
                  placeholder="ex.: E1234567890 ou link do comprovante"
                  disabled={enviado}
                />
                <button className="btn primary" style={{ width: '100%' }} onClick={mandarComprovante} disabled={enviado || processando}>
                  {enviado ? '✓ Comprovante enviado' : processando ? 'Enviando…' : 'Enviar comprovante'}
                </button>
              </div>

              {historico.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <label style={rotulo}>Meus pedidos</label>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {historico.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          padding: '7px 10px',
                          borderRadius: 8,
                          background: 'var(--bg-2)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--mono)' }}>{p.referencia}</span>
                        <span style={{ color: 'var(--txt-2)' }}>{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                        <b
                          style={{
                            color:
                              p.status === 'pago' ? 'var(--ok, #34d399)' : p.status === 'recusado' ? 'var(--err, #f87171)' : '#f59e0b',
                          }}
                        >
                          {p.status.toUpperCase()}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn ghost" style={{ width: '100%', marginTop: 14 }} onClick={closeModal}>
                Fechar
              </button>
            </div>
          )}

          {erro && etapa !== 'dados' && <p style={{ fontSize: 11.5, color: 'var(--err, #f87171)' }}>{erro}</p>}
        </div>
      </div>
    </div>
  );
}
