import { useEffect, useRef, useState } from 'react';
import { useUI } from '../store/ui';
import { useEditor } from '../store/editor';
import { lerConfig } from '../lib/config';
import { gerarImagemGratis, roteiroLocal, type FonteImagem } from '../lib/imagemGratis';
import { SkillsChat, TODAS_SKILLS, type SkillEscolhida } from './SkillsChat';

/**
 * CHAT DE CRIAÇÃO — prompt → imagem, roteiro e voz
 * ------------------------------------------------------------
 * Um botão "◈ Skills" (igual ao botão de agentes) escolhe o cérebro da
 * criação; "⤒ Referência" anexa a imagem/vídeo do cliente; o seletor define
 * o formato (9:16, 1:1, 16:9).
 *
 * De onde vem o resultado:
 *   · imagem: API do painel (quando há chave) → motor gratuito (Pollinations)
 *   · roteiro: função de servidor (API ou Pollinations) → roteiroLocal
 * O que o modelo devolve pode ir direto para a timeline ou ser baixado.
 */

interface Referencia {
  nome: string;
  url: string;
  tipo: 'imagem' | 'video';
}

interface Mensagem {
  autor: 'voce' | 'vortex';
  texto: string;
  imagem?: string;
  fonte?: FonteImagem | 'api' | 'pollinations-texto' | 'local';
  erro?: boolean;
}

const FORMATOS = {
  vertical: { nome: '9:16 · Reels/Shorts', w: 1080, h: 1920 },
  quadrado: { nome: '1:1 · Feed', w: 1080, h: 1080 },
  horizontal: { nome: '16:9 · YouTube', w: 1920, h: 1080 },
} as const;

export function ChatCriacao({ aoFechar }: { aoFechar?: () => void }) {
  const { toast } = useUI();
  const cfg = lerConfig();

  const [skills] = useState<SkillEscolhida[]>(() => TODAS_SKILLS());
  const [skill, setSkill] = useState<SkillEscolhida>(() => {
    const salvo = localStorage.getItem('vortex.skill');
    return skills.find((s) => s.id === salvo) ?? skills[0];
  });
  const [gaveta, setGaveta] = useState(false);
  const [referencias, setReferencias] = useState<Referencia[]>([]);
  const [pedido, setPedido] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      autor: 'vortex',
      texto:
        'Escolha uma skill no botão “◈ Skills”, anexe a referência do cliente se tiver e me diga o que criar. Ex.: “capa do Reels sobre edição no celular”.',
    },
  ]);
  const [ocupado, setOcupado] = useState(false);
  const [formato, setFormato] = useState<SkillEscolhida['formato']>(skills[0]?.formato ?? 'vertical');
  const fim = useRef<HTMLDivElement>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (skill) localStorage.setItem('vortex.skill', skill.id);
    if (skill) setFormato(skill.formato);
  }, [skill]);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens, ocupado]);

  const falar = (m: Mensagem) => setMensagens((atual) => [...atual, m]);

  const anexar = (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    const novas: Referencia[] = Array.from(arquivos)
      .slice(0, 3)
      .map((f) => ({
        nome: f.name,
        url: URL.createObjectURL(f),
        tipo: f.type.startsWith('video') ? 'video' : 'imagem',
      }));
    setReferencias((r) => [...r, ...novas].slice(0, 3));
    toast(`${novas.length} referência(s) anexada(s)`, 'ok');
  };

  /** prompt final = pedido + instruções da skill + formato + referência */
  const montarPrompt = (base: string) => {
    const ref = referencias.length
      ? ` O cliente mandou uma referência (${referencias.map((r) => r.nome).join(', ')}): siga o mesmo enquadramento, luz e paleta dela.`
      : '';
    const formatoTxt =
      formato === 'vertical' ? 'vertical 9:16' : formato === 'quadrado' ? 'quadrado 1:1' : 'horizontal 16:9';
    return `${base}. Formato ${formatoTxt}. Estilo: ${skill.texto.slice(0, 900)}${ref}`;
  };

  const criarImagem = async () => {
    const base = pedido.trim() || referencias[0]?.nome || skill.resumo;
    falar({ autor: 'voce', texto: `Criar imagem: ${base}` });
    setPedido('');
    setOcupado(true);
    try {
      /* 1. API do painel (se configurada) */
      if (cfg.ia.ativo && cfg.ia.chave && cfg.ia.endpoint) {
        const r = await fetch(cfg.ia.endpoint, {
          method: 'POST',
          headers: { authorization: `Bearer ${cfg.ia.chave}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            model: cfg.ia.modeloImagem,
            prompt: montarPrompt(base),
            size: `${FORMATOS[formato].w}x${FORMATOS[formato].h}`,
          }),
        });
        if (r.ok) {
          const blob = await r.blob();
          if (blob.size > 2000) {
            falar({ autor: 'vortex', texto: `Pronto — skill “${skill.nome}”.`, imagem: URL.createObjectURL(blob), fonte: 'api' });
            setOcupado(false);
            return;
          }
        }
      }

      /* 2. motor gratuito */
      const r = await gerarImagemGratis(montarPrompt(base), formato);
      if (r.ok && r.url) {
        falar({
          autor: 'vortex',
          texto: `Imagem criada com a skill “${skill.nome}” (motor gratuito). Peça um ajuste ou toque em “usar na timeline”.`,
          imagem: r.url,
          fonte: r.fonte,
        });
      } else {
        falar({ autor: 'vortex', texto: `Não consegui gerar: ${r.erro ?? 'tente de novo'}`, erro: true });
      }
    } catch (e) {
      falar({ autor: 'vortex', texto: `Falha: ${(e as Error).message}`, erro: true });
    } finally {
      setOcupado(false);
    }
  };

  const criarRoteiro = async () => {
    const base = pedido.trim() || referencias[0]?.nome || skill.resumo;
    falar({ autor: 'voce', texto: `Roteiro de vídeo: ${base}` });
    setPedido('');
    setOcupado(true);
    try {
      const res = await fetch('/.netlify/functions/ferramentas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          acao: 'texto',
          prompt: `Crie um roteiro de vídeo curto (15 a 30 segundos) para: ${base}. Divida em cenas com tempo, imagem e fala. Português do Brasil, direto ao ponto. Formato: tabela markdown com as colunas tempo | imagem | fala | texto na tela.`,
          sistema: `Você é um diretor de criação seguindo a skill "${skill.nome}". Instruções da skill: ${skill.texto.slice(0, 3500)}`,
          chave: cfg.ia.chave,
          baseUrl: cfg.ia.baseUrl,
          modelo: cfg.ia.modeloTexto,
        }),
      });
      const dados = (await res.json().catch(() => ({}))) as { ok?: boolean; texto?: string; fonte?: string };
      if (dados.ok && dados.texto) {
        falar({ autor: 'vortex', texto: dados.texto, fonte: dados.fonte === 'api' ? 'api' : 'pollinations-texto' });
      } else {
        falar({ autor: 'vortex', texto: roteiroLocal(base, skill.nome), fonte: 'local' });
      }
    } catch {
      falar({ autor: 'vortex', texto: roteiroLocal(base, skill.nome), fonte: 'local' });
    } finally {
      setOcupado(false);
    }
  };

  const usarNaTimeline = async (url: string) => {
    const ed = useEditor.getState();
    const asset = ed.addAsset({
      name: `IA · ${skill.nome}`,
      kind: 'image',
      url,
      durationMs: 5000,
      origin: 'user',
    });
    const trilha = ed.trilhaPara('image');
    if (!trilha) {
      toast('Não encontrei trilha de imagem', 'err');
      return;
    }
    ed.addElement({
      type: 'image',
      name: `IA · ${skill.nome}`,
      trackId: trilha.id,
      start: ed.playhead,
      duration: 5000,
      sourceIn: 0,
      assetId: asset.id,
      transform: {
        x: { base: FORMATOS[formato].w / 2, keyframes: [] },
        y: { base: FORMATOS[formato].h / 2, keyframes: [] },
        scale: { base: 1, keyframes: [] },
        rotation: { base: 0, keyframes: [] },
        opacity: { base: 1, keyframes: [] },
      },
      blend: 'normal',
      effects: [],
      volume: 1,
      locked: false,
      hidden: false,
      color: '#f472b6',
    });
    toast('Imagem colocada na timeline', 'ok');
  };

  const motor = cfg.ia.ativo && cfg.ia.chave ? 'API do painel' : 'motor gratuito';

  return (
    <div className="cc">
      {/* ---------------- barra de controles ---------------- */}
      <div className="cc-barra">
        <button className="btn ghost cc-btn-skill" onClick={() => setGaveta((g) => !g)} title="Escolher a skill do chat">
          ◈ Skills
        </button>
        {skill && (
          <span className="cc-skill-atual">
            {skill.emoji} {skill.nome}
          </span>
        )}

        <label className="cc-anexo btn ghost" title="Anexar imagem ou vídeo de referência">
          ⤒ Referência
          <input
            ref={inputArquivo}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => anexar(e.target.files)}
          />
        </label>

        <select className="cc-select" value={formato} onChange={(e) => setFormato(e.target.value as SkillEscolhida['formato'])}>
          {Object.entries(FORMATOS).map(([id, f]) => (
            <option key={id} value={id}>
              {f.nome}
            </option>
          ))}
        </select>
        <span className={`cc-motor ${cfg.ia.ativo && cfg.ia.chave ? 'pago' : 'gratis'}`}>{motor}</span>
      </div>

      {gaveta && <SkillsChat atual={skill?.id ?? ''} aoEscolher={setSkill} aoFechar={() => setGaveta(false)} />}

      {referencias.length > 0 && (
        <div className="cc-referencias">
          {referencias.map((r, i) => (
            <div key={i} className="cc-ref">
              {r.tipo === 'video' ? (
                <video src={r.url} muted playsInline />
              ) : (
                <img src={r.url} alt={r.nome} />
              )}
              <span>{r.nome}</span>
              <button className="btn ghost icon" onClick={() => setReferencias((x) => x.filter((_, k) => k !== i))}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- conversa ---------------- */}
      <div className="cc-conversa">
        {mensagens.map((m, i) => (
          <div key={i} className={`cc-msg ${m.autor}${m.erro ? ' erro' : ''}`}>
            <div className="cc-balao">
              <p>{m.texto}</p>
              {!m.imagem && m.texto.length > 80 && (
                <div className="cc-img-acoes">
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      void navigator.clipboard?.writeText(m.texto);
                      toast('Texto copiado', 'ok');
                    }}
                  >
                    ⧉ Copiar
                  </button>
                  <a
                    className="btn ghost sm"
                    href={`data:text/plain;charset=utf-8,${encodeURIComponent(m.texto)}`}
                    download={`vortex-roteiro-${Date.now().toString(36)}.md`}
                  >
                    Baixar .md
                  </a>
                </div>
              )}
              {!m.imagem && m.fonte && (
                <span className="cc-fonte">
                  fonte:{' '}
                  {m.fonte === 'api'
                    ? 'API do painel'
                    : m.fonte === 'pollinations-texto'
                      ? 'API grátis'
                      : m.fonte === 'local'
                        ? 'roteiro local'
                        : m.fonte}
                </span>
              )}
              {m.imagem && (
                <>
                  <img src={m.imagem} alt="resultado" className="cc-img" />
                  <div className="cc-img-acoes">
                    <button className="btn primary sm" onClick={() => void usarNaTimeline(m.imagem!)}>
                      Usar na timeline
                    </button>
                    <a className="btn ghost sm" href={m.imagem} download={`vortex-${skill?.id ?? 'ia'}.png`}>
                      Baixar
                    </a>
                    {m.fonte && <span className="cc-fonte">fonte: {m.fonte}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
        {ocupado && (
          <div className="cc-msg vortex">
            <div className="cc-balao cc-digitando">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={fim} />
      </div>

      {/* ---------------- entrada ---------------- */}
      <div className="cc-entrada">
        <textarea
          className="cc-texto"
          placeholder="O que vamos criar? Ex.: capa do Reels sobre café especial"
          value={pedido}
          onChange={(e) => setPedido(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void criarImagem();
            }
          }}
        />
        <div className="cc-botoes">
          <button className="btn primary" onClick={() => void criarImagem()} disabled={ocupado}>
            ✦ Criar imagem
          </button>
          <button className="btn ghost" onClick={() => void criarRoteiro()} disabled={ocupado}>
            ▤ Roteiro
          </button>
          {aoFechar && (
            <button className="btn ghost" onClick={aoFechar}>
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
