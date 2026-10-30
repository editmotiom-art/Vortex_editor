import { useUI } from '../store/ui';
import { lerConfig } from '../lib/config';

/**
 * PORTÃO DE PLANO DO EDITOR
 * ------------------------------------------------------------
 * Regra do produto: o editor abre no plano Free (para conhecer), mas as
 * funções pagas — exportar, voz, acervo de packs e Baixa Tudo — pedem plano.
 * Quem ainda não assinou vê este aviso com o preço que o administrador definiu
 * em #admin → Planos e preços, e vai direto para o checkout.
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
  const planos = lerConfig().planos.filter((p) => p.ativo && p.id !== 'free');
  const destaque = planos.find((p) => p.destaque) ?? planos[0];
  const preco = destaque ? `R$ ${destaque.preco.toFixed(2).replace('.', ',')} / ${destaque.periodo}` : '';
  const nome = destaque?.nome ?? 'Pro';

  return (
    <div className="overlay" onClick={onFechar}>
      <div className="modal plano-portao" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-head">
          <b>🔒 {recurso} é do plano {nome}</b>
          <button onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div style={{ padding: '4px 2px 0' }}>
          <p style={{ fontSize: 13, color: 'var(--txt-1)', margin: '0 0 10px' }}>
            Você está no plano <b>Free</b>. {detalhe ?? 'Assine para liberar esta função e exportar seus vídeos sem marca.'}
          </p>
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
            Continuar testando o plano Free
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

/** true quando a conta ainda está no plano grátis */
export const noPlanoGratis = (plano?: string): boolean => !plano || plano === 'free';
