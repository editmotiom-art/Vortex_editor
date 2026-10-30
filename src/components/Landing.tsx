import { useEffect, useMemo, useState } from 'react';
import { lerConfig } from '../lib/config';
import { useUI } from '../store/ui';
import { lerConfigNuvem, type ConfigNuvem } from '../lib/contas';

/**
 * PÁGINA DE VENDAS (pública, em #planos ou na primeira visita)
 * ------------------------------------------------------------
 * Apresenta o sistema, mostra os planos reais (os mesmos que o admin edita)
 * e leva para o cadastro / checkout. Nada de texto genérico: tudo aponta
 * para o que o editor realmente faz.
 */

const RECURSOS = [
  {
    icone: '▤',
    titulo: 'Timeline multi-trilha',
    texto: 'Corte, arraste, sobreponha e anime com keyframes. Trilhas de vídeo, texto e áudio separadas — do jeito profissional.',
  },
  {
    icone: '✧',
    titulo: 'Biblioteca pronta',
    texto: 'Templates de motion, transições, looks de cinema, SFX, músicas, overlays e fundos. Um clique e o item já entra na timeline.',
  },
  {
    icone: '⤓',
    titulo: 'Extrair do Drive e da web',
    texto: 'Cole o link de uma pasta do Google Drive ou o endereço de um site e o Vortex traz todas as mídias para dentro do projeto.',
  },
  {
    icone: '⤒',
    titulo: 'Exporta o que você vê',
    texto: 'Vídeo WebM/MP4, imagem PNG e áudio WAV — com prévia antes de baixar. Preview e export usam o mesmo motor de render.',
  },
  {
    icone: '✦',
    titulo: 'Estúdio de IA',
    texto: 'Descreva a cena e receba a imagem com estilos de Hollywood, anime, analógico ou 3D — e mande direto para a timeline.',
  },
  {
    icone: '⚙',
    titulo: 'Painel do cliente e admin',
    texto: 'Área do assinante com projetos, mídia, plano e dados. Admin controla preços, IA, pagamento, acervo e marca.',
  },
];

const PASSOS = [
  { n: '01', t: 'Crie a conta', d: 'Só nome, e-mail e senha. A conta nova já ganha horas de teste para experimentar tudo.' },
  { n: '02', t: 'Monte na timeline', d: 'Arraste arquivos, use a biblioteca, cole um link do Drive ou dê duplo clique num item do acervo.' },
  { n: '03', t: 'Confira e exporte', d: 'Prévia do arquivo apareceu? Então baixe — vídeo, imagem ou só o áudio.' },
];

export function Landing({ onEntrar, onCriar }: { onEntrar: () => void; onCriar: () => void }) {
  const [cfg] = useState(() => lerConfig());
  /** preços e horas vêm do BANCO (o que o admin configurou), não do navegador */
  const [nuvem, setNuvem] = useState<ConfigNuvem | null>(null);
  useEffect(() => {
    lerConfigNuvem().then(setNuvem);
  }, []);

  const planos = useMemo(() => {
    const horas = nuvem?.planos_horas ?? { teste: 1, pro: 24, studio: 168 };
    const precos = nuvem?.precos_centavos ?? { pro: 2990, studio: 8990 };
    const horasTxt = (h?: number) => {
      const v = Number(h ?? 0);
      return v >= 24 ? `${Math.round(v / 24)} dia(s) (${v}h)` : `${v}h`;
    };
    return [
      {
        id: 'pro',
        nome: 'Pro',
        preco: Number(precos.pro ?? 2990) / 100,
        periodo: horasTxt(horas.pro),
        destaque: true,
        itens: [
          'Editor completo (timeline, keyframes, efeitos)',
          'Acervo: templates, fundos, músicas, SFX',
          'Baixar conteúdo: link de vídeo e Drive',
          'Legenda automática e IA de criação',
          'Exportação até 1080p sem marca',
        ],
      },
      {
        id: 'studio',
        nome: 'Studio',
        preco: Number(precos.studio ?? 8990) / 100,
        periodo: horasTxt(horas.studio),
        destaque: false,
        itens: [
          'Tudo do Pro',
          'Exportação 4K',
          'Prioridade na fila de IA e legendas',
          'Packs do Editor incluídos',
          'Suporte direto com a equipe',
        ],
      },
    ];
  }, [nuvem]);

  const horasTeste = Number(nuvem?.horas_teste_novo_usuario ?? 1);
  const irParaPlanos = () => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
  };
  const abrirCheckout = (id: string) => {
    localStorage.setItem('vortex.planoEscolhido', id);
    onCriar();
    setTimeout(() => useUI.getState().openModal('checkout'), 400);
  };

  useEffect(() => {
    document.title = 'Vortex — editor profissional de vídeo, áudio e motion no navegador';
  }, []);

  return (
    <div className="landing">
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-mark">V</span>
          <b>Vortex</b>
          <span className="lp-beta">BETA</span>
        </div>
        <nav className="lp-links">
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
          <a href="#responsabilidade">Responsabilidade</a>
        </nav>
        <div className="lp-nav-acoes">
          <button className="btn ghost" onClick={onEntrar}>
            Entrar
          </button>
          <button className="btn primary" onClick={onCriar}>
            Abrir editor
          </button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-txt">
          <span className="lp-tag">Editor profissional no navegador</span>
          <h1>
            Vídeo, áudio e motion graphics <em>com cara de cinema</em> — sem instalar nada.
          </h1>
          <p>
            O Vortex roda no seu navegador, no computador ou no celular. Monte a timeline, aplique looks de Hollywood,
            extraia o acervo do Drive e exporte vídeo, imagem e som. Seu projeto fica com você.
          </p>
          <div className="lp-acoes">
            <button className="btn primary lg" onClick={onCriar}>
              Criar conta e testar
            </button>
            <button className="btn ghost lg" onClick={irParaPlanos}>
              Ver planos
            </button>
          </div>
          <div className="lp-provas">
            <span>✓ {horasTeste > 0 ? `${horasTeste >= 24 ? `${Math.round(horasTeste / 24)} dia(s)` : `${horasTeste}h`} de teste ao criar a conta` : 'Sem instalação'}</span>
            <span>✓ Sem instalação</span>
            <span>✓ Funciona no celular</span>
          </div>
        </div>
        <div className="lp-hero-art" aria-hidden>
          <div className="lp-frame">
            <div className="lp-frame-top">
              <span />
              <span />
              <span />
            </div>
            <div className="lp-frame-canvas">
              <div className="lp-play">▶</div>
              <div className="lp-tl">
                <i style={{ width: '38%' }} />
                <i style={{ width: '62%', marginLeft: '6%' }} />
                <i style={{ width: '22%', marginLeft: '6%' }} />
                <i style={{ width: '44%', marginLeft: '6%' }} />
              </div>
            </div>
            <div className="lp-frame-bar">
              <span className="lp-chip">1080×1920</span>
              <span className="lp-chip">30 fps</span>
              <span className="lp-chip destaque">Look Hollywood</span>
            </div>
          </div>
        </div>
      </section>

      <section id="video" className="lp-secao lp-video-secao">
        <h2>Veja o editor trabalhando</h2>
        <p className="lp-sub">
          Dois minutos de edição de verdade: importar, cortar, transição, look de cinema, título animado, música, voz
          e as três exportações. Sem corte de tela, sem simulação.
        </p>
        <div className="lp-video">
          <video
            controls
            playsInline
            preload="metadata"
            poster=""
            aria-label="Vídeo de apresentação do Vortex"
          >
            <source src="./demo-vortex.mp4" type="video/mp4" />
            <source src="./demo-vortex.webm" type="video/webm" />
            Seu navegador não toca vídeo — <a href="./demo-vortex.mp4">baixe o arquivo</a>.
          </video>
          <ul className="lp-video-legenda">
            <li><b>0:00</b> página de vendas e planos</li>
            <li><b>0:09</b> conta e editor</li>
            <li><b>0:14</b> importar dois clipes</li>
            <li><b>0:20</b> corte, encaixe e enquadramento</li>
            <li><b>0:26</b> transição e look Hollywood</li>
            <li><b>0:32</b> título animado, música e voz</li>
            <li><b>0:43</b> exportar vídeo, imagem e áudio</li>
            <li><b>0:50</b> acervo de packs do Drive</li>
          </ul>
        </div>
      </section>

      <section id="recursos" className="lp-secao">
        <h2>Tudo dentro do editor</h2>
        <p className="lp-sub">Cada botão faz o que promete — e o resultado sai no arquivo.</p>
        <div className="lp-grid">
          {RECURSOS.map((r) => (
            <article key={r.titulo} className="lp-card">
              <div className="lp-ico">{r.icone}</div>
              <h3>{r.titulo}</h3>
              <p>{r.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-secao lp-passos-secao">
        <h2>Do zero ao arquivo em três passos</h2>
        <div className="lp-passos">
          {PASSOS.map((p) => (
            <div key={p.n} className="lp-passo">
              <span className="lp-passo-n">{p.n}</span>
              <h3>{p.t}</h3>
              <p>{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="lp-secao">
        <h2>Planos</h2>
        <p className="lp-sub">
          O acesso é por <b>horas de uso</b> — quem trabalha muito compra mais horas, quem usa pouco paga menos. O
          tempo que você já tem é somado ao novo.
        </p>
        <div className="lp-planos">
          {planos.map((p) => (
            <article key={p.id} className={`lp-plano${p.destaque ? ' destaque' : ''}`}>
              {p.destaque && <span className="lp-plano-selo">MAIS ESCOLHIDO</span>}
              <h3>{p.nome}</h3>
              <div className="lp-preco">
                {`R$ ${p.preco.toFixed(2).replace('.', ',')}`}
                <small>/ {p.periodo} de acesso</small>
              </div>
              <ul>
                {p.itens.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <button className={`btn ${p.destaque ? 'primary' : ''}`} style={{ width: '100%' }} onClick={() => abrirCheckout(p.id)}>
                {`Quero ${p.nome}`}
              </button>
            </article>
          ))}
        </div>
        <p className="lp-nota">
          Pedido de pagamento com PIX: as horas entram na conta assim que o pagamento é confirmado (ninguém ganha
          plano sem pagar). Preços e horas são os definidos no painel administrativo, em <code>#admin → Horas de plano</code>.
        </p>
      </section>

      <section id="responsabilidade" className="lp-secao lp-resp">
        <h2>Responsabilidade e uso</h2>
        <div className="lp-resp-grid">
          <div>
            <h3>Seus arquivos</h3>
            <p>
              Os arquivos que você importa ficam <b>no seu dispositivo</b>. O projeto salvo guarda apenas os metadados
              (posição, duração, efeitos). Nada é enviado para servidor sem você pedir — quando a nuvem estiver ligada,
              o envio será explícito.
            </p>
          </div>
          <div>
            <h3>Conteúdo e direitos</h3>
            <p>
              Você é responsável pelas mídias que importa e publica. Use apenas material próprio, licenciado ou de
              domínio público. O Vortex fornece as ferramentas; a licença do que você produz e distribui é sua.
            </p>
          </div>
          <div>
            <h3>Acervo e biblioteca</h3>
            <p>
              Templates, looks, SFX e músicas da biblioteca são fornecidos para uso dentro dos projetos criados aqui.
              A redistribuição do acervo como produto separado não é permitida.
            </p>
          </div>
          <div>
            <h3>Privacidade</h3>
            <p>
              A conta usa nome, e-mail e senha (bcrypt, no servidor — nem nós lemos a senha). Planos e pagamentos
              ficam no banco. Links de Drive que você informa são lidos apenas para listar as mídias que você escolher
              puxar. O histórico de downloads fica na sua conta, para você achar tudo depois.
            </p>
          </div>
          <div>
            <h3>Disponibilidade</h3>
            <p>
              O editor roda no navegador: a exportação depende do seu aparelho. Manter a aba em primeiro plano durante o
              export garante a gravação completa.
            </p>
          </div>
          <div>
            <h3>Assinatura</h3>
            <p>
              O acesso é comprado por horas e não renova sozinho: acabou o tempo, o editor continua abrindo, mas
              exportar e baixar pedem novas horas. Seus projetos permanecem seus.
            </p>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div>
          <b>Vortex</b> — editor profissional de vídeo, áudio e motion graphics no navegador.
        </div>
        <div className="lp-footer-links">
          <a href="#planos">Planos</a>
          <a href="#responsabilidade">Responsabilidade</a>
          <button className="link" onClick={onEntrar}>
            Entrar
          </button>
        </div>
        <div className="lp-footer-min">© {new Date().getFullYear()} Vortex. Todos os direitos reservados.</div>
      </footer>
    </div>
  );
}
