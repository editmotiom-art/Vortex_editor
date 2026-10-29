import { useMemo, useState } from 'react';
import { useUI } from '../store/ui';
import { SKILLS, type Skill } from '../lib/skills';
import { SKILLS_EXTERNAS, type SkillExterna } from '../data/skillsExternas';
import { SKILLS_PLATAFORMA } from '../data/skillsPlataforma';
import { lerFontesSkills } from '../lib/fontesSkills';
import { adicionarSkillDoLink, lerSkillsImportadas, removerSkillImportada } from '../lib/skillsImportadas';

/**
 * BOTÃO DE SKILLS DO CHAT
 * ------------------------------------------------------------
 * Abre uma gaveta com todas as skills disponíveis:
 *   · as 12 nativas (diretores de arte do Vortex);
 *   · as do Skywork e do Google Skills (presets internos);
 *   · as do findskill.ai, embutidas com o texto original;
 *   · as importadas por link, guardadas no navegador.
 * Ao escolher, a skill vira o "cérebro" da próxima criação.
 */

export interface SkillEscolhida {
  id: string;
  nome: string;
  emoji: string;
  resumo: string;
  formato: 'vertical' | 'quadrado' | 'horizontal';
  /** instruções que vão para a IA */
  texto: string;
  exemplos: string[];
  origem: 'vortex' | 'externa' | 'importada';
  /** de onde veio: Vortex, Skywork, Google Skills, FindSkill… (selo do card) */
  fonte?: string;
}

const daNativa = (s: Skill): SkillEscolhida => ({
  id: s.id,
  nome: s.nome,
  emoji: s.emoji,
  resumo: s.resumo,
  formato: s.formato,
  texto: `${s.resumo}\nEstilo visual: ${s.estilo}\nEvitar: ${s.evitar}`,
  exemplos: s.exemplos,
  origem: 'vortex',
  fonte: 'VORTEX',
});

export const fonteDoLink = (url: string): string => {
  const u = (url || '').toLowerCase();
  if (u.includes('skywork')) return 'SKYWORK';
  if (u.includes('cloudskillsboost') || u.includes('skills.google')) return 'GOOGLE';
  if (u.includes('findskill')) return 'FINDSKILL';
  if (u.includes('github')) return 'GITHUB';
  return u ? 'WEB' : 'IMPORTADA';
};

const daExterna = (s: SkillExterna): SkillEscolhida => ({
  id: `ext-${s.id}`,
  nome: s.nome,
  emoji: s.emoji,
  resumo: s.resumo,
  formato: s.formato,
  texto: s.texto,
  exemplos: [],
  origem: s.id.startsWith('imp-') ? 'importada' : 'externa',
  fonte: s.id.startsWith('imp-') ? 'IMPORTADA' : fonteDoLink(s.url),
});

/** respeita as fontes ligadas no painel (vortex / skywork / google / findskill) */
const ligada = (fonte: string): boolean => {
  const mapa: Record<string, string> = { SKYWORK: 'skywork', GOOGLE: 'google', FINDSKILL: 'findskill', VORTEX: 'vortex' };
  const id = mapa[fonte];
  if (!id) return true; // importadas à mão ficam sempre visíveis
  return lerFontesSkills().find((f) => f.id === id)?.ativo ?? true;
};

export const TODAS_SKILLS = (): SkillEscolhida[] => [
  ...SKILLS.map(daNativa).filter((s) => ligada('VORTEX')),
  ...SKILLS_PLATAFORMA.map(daExterna).filter((s) => ligada(s.fonte ?? '')),
  ...SKILLS_EXTERNAS.map(daExterna).filter((s) => ligada(s.fonte ?? '')),
  ...lerSkillsImportadas().map(daExterna),
];

export function SkillsChat({
  atual,
  aoEscolher,
  aoFechar,
}: {
  atual: string;
  aoEscolher: (s: SkillEscolhida) => void;
  aoFechar: () => void;
}) {
  const { toast } = useUI();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todas' | 'vortex' | 'web'>('todas');
  const [link, setLink] = useState('');
  const [baixando, setBaixando] = useState(false);
  const [versao, setVersao] = useState(0);

  const lista = useMemo(() => {
    void versao;
    return TODAS_SKILLS().filter((s) => {
      if (filtro === 'vortex' && s.origem !== 'vortex') return false;
      if (filtro === 'web' && s.origem === 'vortex') return false;
      const q = busca.trim().toLowerCase();
      if (!q) return true;
      return (s.nome + ' ' + s.resumo + ' ' + (s.fonte ?? '')).toLowerCase().includes(q);
    });
  }, [busca, filtro, versao]);

  const importar = async () => {
    if (!/^https?:\/\/.+/i.test(link.trim())) {
      toast('Cole o link do pacote (.zip) ou do arquivo .md da skill', 'warn');
      return;
    }
    setBaixando(true);
    const r = await adicionarSkillDoLink(link.trim());
    setBaixando(false);
    if (!r.ok) {
      toast(`Não consegui trazer: ${r.erro}`, 'err');
      return;
    }
    setLink('');
    setVersao((v) => v + 1);
    toast(`Skill “${r.nome}” adicionada ao chat`, 'ok');
  };

  return (
    <div className="sk-gaveta" role="dialog" aria-label="Escolher skill">
      <div className="sk-topo">
        <b>Skills do chat</b>
        <span>{lista.length} disponíveis</span>
        <div className="spacer" />
        <button className="btn ghost icon" onClick={aoFechar} title="Fechar">
          ✕
        </button>
      </div>

      <input
        className="sk-busca"
        placeholder="Buscar skill (produto, reels, retrato, pitch…)"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        autoFocus
      />

      <div className="sk-filtros">
        {(
          [
            ['todas', 'Todas'],
            ['vortex', 'Do Vortex'],
            ['web', 'Da web'],
          ] as ['todas' | 'vortex' | 'web', string][]
        ).map(([id, nome]) => (
          <button key={id} className={`chip${filtro === id ? ' active' : ''}`} onClick={() => setFiltro(id)}>
            {nome}
          </button>
        ))}
      </div>

      <div className="sk-lista">
        {lista.map((s) => (
          <button
            key={s.id}
            className={`sk-item${s.id === atual ? ' atual' : ''}`}
            onClick={() => {
              aoEscolher(s);
              aoFechar();
            }}
          >
            <span className="sk-emoji">{s.emoji}</span>
            <span className="sk-txt">
              <b>{s.nome}</b>
              <small>{s.resumo}</small>
            </span>
            <span className={`sk-origem ${s.origem}`}>{s.fonte ?? (s.origem === 'vortex' ? 'VORTEX' : 'WEB')}</span>
            {s.origem === 'importada' && (
              <span
                className="sk-remover"
                role="button"
                tabIndex={0}
                title="Remover esta skill"
                onClick={(e) => {
                  e.stopPropagation();
                  removerSkillImportada(s.id);
                  setVersao((v) => v + 1);
                  toast('Skill removida', 'ok');
                }}
              >
                ✕
              </span>
            )}
          </button>
        ))}
        {lista.length === 0 && <p className="sk-vazio">Nenhuma skill com esse nome.</p>}
      </div>

      <div className="sk-importar">
        <label>
          Trazer skill da web (findskill.ai, GitHub…)
          <input
            placeholder="https://findskill.ai/skills/…/nome.zip"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void importar()}
          />
        </label>
        <button className="btn primary" disabled={baixando} onClick={() => void importar()}>
          {baixando ? 'Trazendo…' : 'Adicionar'}
        </button>
      </div>
      <p className="sk-dica">
        O texto da skill é usado como instrução do chat — nada é enviado para fora além do seu pedido.
      </p>
    </div>
  );
}
