import { useUI } from '../store/ui';
import { lerConfig } from '../lib/config';
import { tempoHumano } from '../lib/contas';
import { BarraPlano } from './BarraPlano';

/**
 * PORTÃO DE HORAS DO EDITOR
 * ------------------------------------------------------------
 * Não existe plano grátis: cada conta recebe uma quantidade de HORAS (o admin
 * define no cadastro — 1h, 7h, 24h…). Enquanto houver horas o editor inteiro
 * funciona. Quando o relógio zera, exportar, acervo, Baixa Tudo e IA pedem
 * renovação — e quem decide se há horas é o servidor, não o navegador.
 */
export function AvisoPlano({
  recurso,
  detalhe,
  onFechar,
}: {
  recurso: string;
  detalhe?: string;
  onFechar: () => void;
}) {
  const { openModal, sessao } = useUI();
  const semHoras = !!sessao && sessao.papel !== 'admin' && (sessao.horasRestantes ?? 0) <= 0;
  const planos = lerConfig().planos.filter((p) => p.ativo && p.id !== 'free');
  const destaque = planos.find((p) => p.destaque) ?? planos[0];
  const preco = destaque ? `R$ ${destaque.preco.toFixed(2).replace('.', ',')} / ${destaque.periodo}` : '';
  const nome = destaque?.nome ?? 'Pro';

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="modal plano-portao" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <b>🔒 {recurso} precisa de horas de plano</b>
          <button onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div style={{ padding: '4px 2px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--txt-1)', margin: '0 0 10px' }}>
            {semHoras ? (
              <>
                Seu tempo de plano <b>acabou</b>. {detalhe ?? 'Recarregue para liberar esta função e exportar seus vídeos.'}
              </>
            ) : (
              <>
                Esta função consome plano. {detalhe ?? 'Adicione horas para liberar e exportar seus vídeos.'}
              </>
            )}
          </p>
          {sessao && sessao.papel !== 'admin' && (
            <div style={{ marginBottom: 12 }}>
              <BarraPlano />
            </div>
          )}
          {destaque && (
            <div
              style={{
                border: '1px solid var(--acc)',
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 14,
                background: 'var(--bg-2)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--txt-2)' }}>Plano {nome}</div>
              <div style={{ fontSize: 22, fontWeight: 900, margin: '2px 0 6px' }}>{preco}</div>
              {sessao && sessao.papel !== 'admin' && (
                <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginBottom: 6 }}>
                  Restam {tempoHumano(sessao.segundosRestantes)} de {Math.round(sessao.horasRestantes * 10) / 10}h
                </div>
              )}
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.7, color: 'var(--txt-1)' }}>
                {destaque.itens.slice(0, 4).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="btn primary"
            style={{ width: '100%', marginBottom: 8 }}
            onClick={() => {
              onFechar();
              openModal('checkout');
            }}
          >
            Ver planos e assinar
          </button>
          <button className="btn ghost" style={{ width: '100%' }} onClick={onFechar}>
            Continuar sem exportar
          </button>
          {sessao && (
            <p style={{ fontSize: 11, color: 'var(--txt-2)', margin: '10px 0 0', textAlign: 'center' }}>
              Conta: {sessao.email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** true quando a conta está sem horas (não há mais "plano grátis") */
export const noPlanoGratis = (plano?: string): boolean => !plano || plano === 'nenhum';
