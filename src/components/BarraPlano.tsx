import { useEffect, useState } from 'react';
import { tempoHumano } from '../lib/contas';
import { useUI } from '../store/ui';

/**
 * BARRA DO PLANO
 * ------------------------------------------------------------
 * Mostra, em tempo real, quanto tempo de plano ainda resta. O número vem do
 * SERVIDOR (o mesmo que libera ou bloqueia); aqui só contamos o relógio para
 * a barra andar sem precisar consultar o banco a cada segundo.
 *
 * Quando as horas acabam, a barra fica vermelha e o botão de renovar aparece.
 */
export function BarraPlano({ compacta = false }: { compacta?: boolean }) {
  const sessao = useUI((s) => s.sessao);
  const openModal = useUI((s) => s.openModal);
  const [, forcar] = useState(0);

  useEffect(() => {
    const t = setInterval(() => forcar((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!sessao) return null;

  const admin = sessao.papel === 'admin';
  const totalSeg = Math.max(1, (sessao.horasRestantes ?? 0) * 3600);
  const restanteSeg = Math.max(0, sessao.segundosRestantes ?? 0);
  const pct = admin ? 100 : Math.min(100, Math.max(0, (restanteSeg / totalSeg) * 100));
  const critico = !admin && restanteSeg <= 0;
  const poucas = !admin && pct <= 20 && !critico;
  const cor = critico ? 'var(--err, #f87171)' : poucas ? '#f59e0b' : 'var(--acc, #22d3ee)';

  const rotulo = admin
    ? 'acesso administrativo'
    : critico
      ? 'tempo esgotado'
      : `${tempoHumano(restanteSeg)} restantes`;

  return (
    <div className={`barra-plano${compacta ? ' compacta' : ''}`} title={`Plano ${sessao.plano.toUpperCase()} — ${rotulo}`}>
      <div className="barra-plano-topo">
        <span className="barra-plano-plano">
          <b>{sessao.plano === 'nenhum' ? 'SEM PLANO' : sessao.plano.toUpperCase()}</b>
          {!admin && sessao.horasRestantes > 0 && <span className="barra-plano-total"> · {Math.round(sessao.horasRestantes * 10) / 10}h de plano</span>}
        </span>
        <span className={`barra-plano-tempo${critico ? ' critico' : ''}`}>{rotulo}</span>
      </div>
      <div className="barra-plano-trilha">
        <div className="barra-plano-preenchida" style={{ width: `${pct}%`, background: cor }} />
      </div>
      {(critico || poucas) && !admin && (
        <button className="btn primary sm barra-plano-btn" onClick={() => openModal('checkout')}>
          {critico ? 'Renovar plano' : 'Adicionar horas'}
        </button>
      )}
    </div>
  );
}

/** true quando o plano tem horas (admin sempre pode) */
export const podeUsar = (): boolean => {
  const s = useUI.getState().sessao;
  return !!s && (s.papel === 'admin' || (s.horasRestantes ?? 0) > 0);
};
