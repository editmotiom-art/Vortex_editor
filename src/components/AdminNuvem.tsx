import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  confirmarPagamento,
  darHoras,
  excluirConta,
  lerConfigNuvem,
  listarContas,
  listarPagamentos,
  recusarPagamento,
  revogarPlano,
  salvarConfigAdmin,
  tempoHumano,
  type ContaAdmin,
  type Pagamento,
} from '../lib/contas';
import { nuvemNoAr } from '../lib/nuvem';
import { useUI } from '../store/ui';

/* ============================================================
   ADMIN — CLIENTES, HORAS E PAGAMENTOS (dados do BANCO)
   ------------------------------------------------------------
   Tudo aqui é lido e escrito no Supabase por funções que conferem, no
   próprio banco, se o token pertence a um admin. O navegador não guarda
   lista de clientes: recarregar a página mostra sempre a verdade do banco.
   ============================================================ */

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

const brl = (centavos: number) => `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
const dataBR = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

const Card = ({ t, v, sub }: { t: string; v: string; sub?: string }) => (
  <div className="card" style={{ flex: 1, minWidth: 155 }}>
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.7px', color: 'var(--txt-2)', textTransform: 'uppercase' }}>{t}</div>
    <div style={{ fontSize: 25, fontWeight: 900, marginTop: 6, letterSpacing: '-.8px' }}>{v}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--txt-2)', marginTop: 2 }}>{sub}</div>}
  </div>
);

const Bloco = ({ titulo, desc, children }: { titulo: string; desc?: string; children: React.ReactNode }) => (
  <div className="card" style={{ marginBottom: 14 }}>
    <h4 style={{ marginBottom: 4 }}>{titulo}</h4>
    {desc && <p style={{ marginBottom: 12 }}>{desc}</p>}
    {children}
  </div>
);

const EstadoNuvem = ({ erro }: { erro: string }) =>
  erro ? (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 9,
        background: 'rgba(248,113,113,.1)',
        border: '1px solid rgba(248,113,113,.3)',
        color: '#fca5a5',
        fontSize: 12,
        marginBottom: 12,
      }}
    >
      Banco: {erro}. Os números abaixo podem estar vazios.
    </div>
  ) : null;

/* ---------------- VISÃO GERAL ---------------- */

export function Visao() {
  const [contas, setContas] = useState<ContaAdmin[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [banco, setBanco] = useState<{ ok: boolean; detalhe: string }>({ ok: true, detalhe: '' });

  useEffect(() => {
    void (async () => {
      setBanco(await nuvemNoAr());
      const [c, p] = await Promise.all([listarContas(), listarPagamentos()]);
      setContas(c);
      setPagamentos(p);
    })();
  }, []);

  const comHoras = contas.filter((c) => c.papel === 'admin' || (c.plano?.horas_restantes ?? 0) > 0);
  const receita = pagamentos.filter((p) => p.status === 'pago').reduce((s, p) => s + p.valor_centavos, 0);
  const pendentes = pagamentos.filter((p) => p.status === 'pendente');
  const downloads = contas.reduce((s, c) => s + (c.downloads ?? 0), 0);

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Visão geral</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 18 }}>
        Números do banco (Supabase) — as mesmas contas que o cliente vê em qualquer aparelho.
      </p>

      <EstadoNuvem erro={banco.ok ? '' : banco.detalhe} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Card t="Clientes" v={String(contas.length)} sub="contas no banco" />
        <Card t="Com horas" v={String(comHoras.length)} sub="plano ativo agora" />
        <Card t="Receita confirmada" v={brl(receita)} sub={`${pagamentos.filter((p) => p.status === 'pago').length} pagamento(s)`} />
        <Card t="Aguardando você" v={String(pendentes.length)} sub="pedidos pendentes" />
        <Card t="Downloads" v={String(downloads)} sub="feitos pelos clientes" />
      </div>

      <Bloco titulo="Integrações" desc="Estado real de cada peça do sistema.">
        {[
          ['Contas e planos (Supabase)', banco.ok, banco.ok ? 'conectado' : banco.detalhe],
          ['Pagamento', pendentes.length >= 0, 'confirmação manual pela equipe'],
          ['Baixa Tudo (motor)', true, 'youtube, instagram, tiktok, drive…'],
          ['Extensão do Drive', true, 'ferramenta interna'],
          ['IA', true, 'configurável na aba Inteligência artificial'],
        ].map(([nome, ok, detalhe]) => (
          <div key={String(nome)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? 'var(--ok)' : 'var(--warn)' }} />
            <span style={{ fontSize: 12.5 }}>{nome}</span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--txt-2)' }}>{String(detalhe)}</span>
          </div>
        ))}
      </Bloco>

      <Bloco titulo="Últimos clientes">
        {contas.length === 0 && <p style={{ fontSize: 12 }}>Nenhuma conta no banco ainda.</p>}
        {contas.slice(0, 6).map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="media-ico" style={{ width: 26, height: 26, fontSize: 11 }}>
              {c.nome[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.nome}</div>
              <div style={{ fontSize: 10.5, color: 'var(--txt-2)' }}>{c.email}</div>
            </div>
            <div style={{ flex: 1 }} />
            <span className={`pill ${c.papel === 'admin' || c.plano.horas_restantes > 0 ? 'paid' : 'free'}`}>
              {c.papel === 'admin' ? 'ADMIN' : `${c.plano.horas_restantes.toFixed(1)}h`}
            </span>
          </div>
        ))}
      </Bloco>
    </>
  );
}

/* ---------------- CLIENTES (banco) ---------------- */

export function Clientes() {
  const toast = useUI((s) => s.toast);
  const [contas, setContas] = useState<ContaAdmin[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [horasCustom, setHorasCustom] = useState<Record<string, string>>({});
  const [aberto, setAberto] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setContas(await listarContas());
    setCarregando(false);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const filtradas = useMemo(
    () =>
      contas.filter(
        (c) => c.nome.toLowerCase().includes(busca.toLowerCase()) || c.email.toLowerCase().includes(busca.toLowerCase()),
      ),
    [contas, busca],
  );

  const aplicarHoras = async (id: string, horas: number, tipo: 'teste' | 'pro' | 'studio') => {
    const r = await darHoras(id, horas, tipo, 'admin');
    toast(r.ok ? `+${horas}h aplicadas` : (r.erro ?? 'Falhou'), r.ok ? 'ok' : 'err');
    if (r.ok) void recarregar();
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Clientes</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
        Contas reais do banco. Dê horas por usuário: 1h para teste, 7h para um dia de trabalho, 24h para um dia
        inteiro — ou quantas você quiser no campo livre. As horas <b>somam</b> ao que a pessoa já tem.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          style={{ ...campo, maxWidth: 320 }}
          placeholder="Buscar por nome ou e-mail…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <button className="btn ghost" onClick={recarregar} disabled={carregando}>
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--txt-2)', alignSelf: 'center' }}>{filtradas.length} conta(s)</span>
      </div>

      <div style={{ border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 1.5fr .9fr 1.1fr auto',
            gap: 8,
            padding: '9px 13px',
            background: 'var(--bg-2)',
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '.5px',
            color: 'var(--txt-2)',
            textTransform: 'uppercase',
          }}
        >
          <div>Nome</div>
          <div>E-mail</div>
          <div>Plano</div>
          <div>Restam</div>
          <div>Horas</div>
        </div>
        {filtradas.length === 0 && <div style={{ padding: 18, fontSize: 12, color: 'var(--txt-2)' }}>Nenhum cliente encontrado.</div>}
        {filtradas.map((c) => {
          const admin = c.papel === 'admin';
          const restam = c.plano?.segundos_restantes ?? 0;
          return (
            <div key={c.id} style={{ borderTop: '1px solid var(--line)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr .9fr 1.1fr auto', gap: 8, padding: '10px 13px', fontSize: 12, alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{c.nome}</div>
                <div style={{ color: 'var(--txt-2)', wordBreak: 'break-all' }}>{c.email}</div>
                <div>
                  <span className={`pill ${admin || restam > 0 ? 'paid' : 'free'}`}>
                    {admin ? 'ADMIN' : (c.plano?.tipo ?? 'nenhum').toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: restam > 0 ? 'var(--txt-0)' : 'var(--warn)' }}>
                  {admin ? 'sem limite' : tempoHumano(restam)}
                </div>
                <button className="btn ghost sm" onClick={() => setAberto(aberto === c.id ? null : c.id)}>
                  {aberto === c.id ? 'Fechar' : 'Gerenciar'}
                </button>
              </div>

              {aberto === c.id && (
                <div style={{ padding: '4px 13px 14px', background: 'var(--bg-2)' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--txt-2)' }}>Dar horas:</span>
                    {[
                      [1, 'teste'],
                      [7, 'teste'],
                      [24, 'pro'],
                      [168, 'studio'],
                    ].map(([h, t]) => (
                      <button
                        key={String(h)}
                        className="btn ghost sm"
                        onClick={() => aplicarHoras(c.id, Number(h), t as 'teste' | 'pro' | 'studio')}
                      >
                        +{h === 168 ? '7 dias' : `${h}h`}
                      </button>
                    ))}
                    <input
                      style={{ ...campo, width: 80, padding: '5px 8px', fontSize: 11.5 }}
                      placeholder="horas"
                      value={horasCustom[c.id] ?? ''}
                      onChange={(e) => setHorasCustom({ ...horasCustom, [c.id]: e.target.value })}
                    />
                    <button
                      className="btn primary sm"
                      onClick={() => {
                        const h = Number(horasCustom[c.id]?.replace(',', '.'));
                        if (!h || h <= 0) return toast('Digite um número de horas', 'warn');
                        void aplicarHoras(c.id, h, 'pro');
                        setHorasCustom({ ...horasCustom, [c.id]: '' });
                      }}
                    >
                      Aplicar
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, color: 'var(--txt-2)' }}>
                    <span>Criado: {dataBR(c.criado_em)}</span>
                    <span>· Último acesso: {dataBR(c.ultimo_acesso)}</span>
                    <span>· Downloads: {c.downloads}</span>
                    <span>· Gasto: {brl(c.gasto_centavos)}</span>
                    {c.pagamentos_pendentes > 0 && (
                      <span style={{ color: '#f59e0b' }}>· {c.pagamentos_pendentes} pagamento(s) pendente(s)</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 9 }}>
                    <button
                      className="btn ghost sm"
                      onClick={async () => {
                        const r = await revogarPlano(c.id);
                        toast(r.ok ? 'Horas revogadas' : (r.erro ?? 'Falhou'), r.ok ? 'ok' : 'err');
                        if (r.ok) void recarregar();
                      }}
                    >
                      Zerar horas
                    </button>
                    <button
                      className="btn ghost sm danger"
                      onClick={async () => {
                        if (!confirm(`Excluir a conta de ${c.nome}? Isso apaga plano e histórico.`)) return;
                        const r = await excluirConta(c.id);
                        toast(r.ok ? 'Conta excluída' : (r.erro ?? 'Falhou'), r.ok ? 'ok' : 'err');
                        if (r.ok) void recarregar();
                      }}
                    >
                      Excluir conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- PAGAMENTOS ---------------- */

export function Pagamentos() {
  const toast = useUI((s) => s.toast);
  const [lista, setLista] = useState<Pagamento[]>([]);
  const [filtro, setFiltro] = useState<'pendente' | 'pago' | 'todos'>('pendente');
  const [carregando, setCarregando] = useState(false);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    setLista(await listarPagamentos());
    setCarregando(false);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const visiveis = filtro === 'todos' ? lista : lista.filter((p) => p.status === filtro);
  const pendentes = lista.filter((p) => p.status === 'pendente');

  const confirmar = async (id: string) => {
    const r = await confirmarPagamento(id);
    toast(r.ok ? 'Pagamento confirmado — horas liberadas para o cliente' : (r.erro ?? 'Falhou'), r.ok ? 'ok' : 'err');
    if (r.ok) void recarregar();
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Pagamentos</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
        Nenhum plano é liberado sem passar por aqui. Confira o valor na sua conta (PIX/banco) e clique em{' '}
        <b>Confirmar</b>: as horas entram na conta do cliente na hora, somadas ao que ele já tinha.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(
          [
            ['pendente', `Pendentes (${pendentes.length})`],
            ['pago', 'Pagos'],
            ['todos', 'Todos'],
          ] as ['pendente' | 'pago' | 'todos', string][]
        ).map(([id, label]) => (
          <button key={id} className={`btn ${filtro === id ? 'primary' : 'ghost'} sm`} onClick={() => setFiltro(id)}>
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn ghost sm" onClick={recarregar} disabled={carregando}>
          {carregando ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>

      {visiveis.length === 0 && (
        <div className="card" style={{ fontSize: 12.5, color: 'var(--txt-2)' }}>
          Nada aqui. Quando um cliente pedir horas no checkout, o pedido aparece nesta lista.
        </div>
      )}

      <div style={{ display: 'grid', gap: 9 }}>
        {visiveis.map((p) => (
          <div key={p.id} className="card" style={{ padding: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800 }}>{p.referencia}</div>
              <span
                className="pill"
                style={{
                  background: p.status === 'pago' ? 'rgba(52,211,153,.14)' : p.status === 'pendente' ? 'rgba(245,158,11,.14)' : 'rgba(248,113,113,.14)',
                  color: p.status === 'pago' ? 'var(--ok)' : p.status === 'pendente' ? '#f59e0b' : 'var(--err)',
                }}
              >
                {p.status.toUpperCase()}
              </span>
              <div style={{ flex: 1 }} />
              <b>{brl(p.valor_centavos)}</b>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt-1)', marginTop: 6 }}>
              {p.usuario ?? '—'} · {p.email ?? ''} · {p.plano.toUpperCase()} · {p.horas}h · pedido em {dataBR(p.criado_em)}
              {p.confirmado_em ? ` · confirmado em ${dataBR(p.confirmado_em)}` : ''}
            </div>
            {p.comprovante && (
              <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginTop: 4, wordBreak: 'break-all' }}>
                Comprovante enviado: {p.comprovante}
              </div>
            )}
            {p.status === 'pendente' && (
              <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
                <button className="btn primary sm" onClick={() => confirmar(p.id)}>
                  Confirmar pagamento e liberar {p.horas}h
                </button>
                <button
                  className="btn ghost sm danger"
                  onClick={async () => {
                    const r = await recusarPagamento(p.id);
                    toast(r.ok ? 'Pedido recusado' : (r.erro ?? 'Falhou'), r.ok ? 'ok' : 'err');
                    if (r.ok) void recarregar();
                  }}
                >
                  Recusar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- REGRAS DE PLANO (horas) ---------------- */

export function RegrasPlano() {
  const toast = useUI((s) => s.toast);
  const [cfg, setCfg] = useState<{
    horasTeste: number;
    pro: number;
    studio: number;
    precoPro: number;
    precoStudio: number;
    chavePix: string;
    instrucoes: string;
  }>({ horasTeste: 1, pro: 24, studio: 168, precoPro: 29.9, precoStudio: 89.9, chavePix: '', instrucoes: '' });
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void (async () => {
      const c = await lerConfigNuvem();
      if (c) {
        setCfg({
          horasTeste: Number(c.horas_teste_novo_usuario ?? 1),
          pro: Number(c.planos_horas?.pro ?? 24),
          studio: Number(c.planos_horas?.studio ?? 168),
          precoPro: Number(c.precos_centavos?.pro ?? 2990) / 100,
          precoStudio: Number(c.precos_centavos?.studio ?? 8990) / 100,
          chavePix: c.chave_pix ?? '',
          instrucoes: c.instrucoes_pagamento ?? '',
        });
      }
      setCarregado(true);
    })();
  }, []);

  const salvar = async () => {
    setSalvando(true);
    const pares: [string, unknown][] = [
      ['horas_teste_novo_usuario', cfg.horasTeste],
      ['planos_horas', { teste: cfg.horasTeste, pro: cfg.pro, studio: cfg.studio }],
      ['precos_centavos', { pro: Math.round(cfg.precoPro * 100), studio: Math.round(cfg.precoStudio * 100) }],
      ['chave_pix', cfg.chavePix],
      ['instrucoes_pagamento', cfg.instrucoes],
      ['plano_gratis_ativo', false],
    ];
    let ok = true;
    for (const [chave, valor] of pares) {
      const r = await salvarConfigAdmin(chave, valor);
      ok = ok && r.ok;
    }
    setSalvando(false);
    toast(ok ? 'Regras salvas no banco — valem para todos os clientes' : 'Alguma regra não foi salva', ok ? 'ok' : 'err');
  };

  return (
    <>
      <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Horas de plano</h2>
      <p style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
        Não existe plano grátis: toda conta recebe uma quantidade de horas. Aqui você define o teste de quem se
        cadastra e quantas horas cada plano entrega. Salva no banco — muda para todo mundo na hora.
      </p>

      <Bloco titulo="Teste de conta nova" desc="Quanto tempo cada pessoa ganha ao criar a conta. Zero = entra sem horas (só vê o editor).">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {[0, 1, 7, 24].map((h) => (
            <button
              key={h}
              className={`btn ${cfg.horasTeste === h ? 'primary' : 'ghost'} sm`}
              onClick={() => setCfg({ ...cfg, horasTeste: h })}
            >
              {h === 0 ? 'sem horas' : h === 24 ? '24h (1 dia)' : `${h}h`}
            </button>
          ))}
          <input
            style={{ ...campo, width: 100, padding: '6px 9px' }}
            type="number"
            min={0}
            step="0.5"
            value={cfg.horasTeste}
            onChange={(e) => setCfg({ ...cfg, horasTeste: Number(e.target.value) })}
          />
          <span style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>horas por conta nova</span>
        </div>
      </Bloco>

      <Bloco titulo="O que cada plano entrega" desc="Horas somadas ao plano do cliente quando o pagamento é confirmado.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <div>
            <label style={rotulo}>Plano Pro — horas</label>
            <input
              style={campo}
              type="number"
              min={1}
              value={cfg.pro}
              onChange={(e) => setCfg({ ...cfg, pro: Number(e.target.value) })}
            />
            <label style={{ ...rotulo, marginTop: 9 }}>Preço do Pro (R$)</label>
            <input
              style={campo}
              type="number"
              step="0.01"
              value={cfg.precoPro}
              onChange={(e) => setCfg({ ...cfg, precoPro: Number(e.target.value) })}
            />
          </div>
          <div>
            <label style={rotulo}>Plano Studio — horas</label>
            <input
              style={campo}
              type="number"
              min={1}
              value={cfg.studio}
              onChange={(e) => setCfg({ ...cfg, studio: Number(e.target.value) })}
            />
            <label style={{ ...rotulo, marginTop: 9 }}>Preço do Studio (R$)</label>
            <input
              style={campo}
              type="number"
              step="0.01"
              value={cfg.precoStudio}
              onChange={(e) => setCfg({ ...cfg, precoStudio: Number(e.target.value) })}
            />
          </div>
        </div>
      </Bloco>

      <Bloco titulo="Como o cliente paga" desc="O que aparece na tela de pedido (checkout) para o cliente.">
        <label style={rotulo}>Chave PIX (celular, e-mail, aleatória ou CNPJ)</label>
        <input
          style={{ ...campo, marginBottom: 10 }}
          value={cfg.chavePix}
          onChange={(e) => setCfg({ ...cfg, chavePix: e.target.value })}
          placeholder="ex.: pix@vortexeditor.com.br"
        />
        <label style={rotulo}>Instruções para o cliente</label>
        <textarea
          style={{ ...campo, minHeight: 70, resize: 'vertical' }}
          value={cfg.instrucoes}
          onChange={(e) => setCfg({ ...cfg, instrucoes: e.target.value })}
        />
        <p style={{ fontSize: 11.5, color: 'var(--txt-2)', marginTop: 8 }}>
          Sem chave PIX o cliente ainda consegue pedir: ele manda o comprovante e você confirma em{' '}
          <b>Pagamentos</b>. Se um dia configurar um provedor automático, o webhook dele chama a mesma confirmação.
        </p>
      </Bloco>

      <button className="btn primary" onClick={salvar} disabled={salvando || !carregado}>
        {salvando ? 'Salvando…' : 'Salvar regras no banco'}
      </button>
    </>
  );
}
