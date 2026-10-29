/**
 * FONTES DE SKILLS (configuráveis no painel)
 * ------------------------------------------------------------
 * O chat de criação mostra as skills nativas do Vortex + as embutidas
 * (Skywork, Google Skills, FindSkill). As linhas abaixo permitem LIGAR e
 * DESLIGAR cada fonte pelo painel administrativo e guardar o link oficial de
 * cada plataforma para o usuário abrir e ver o catálogo completo.
 * Persistência: `vortex.fontesSkills.v1`.
 */

const K = 'vortex.fontesSkills.v1';

export interface FonteSkill {
  id: 'vortex' | 'skywork' | 'google' | 'findskill';
  nome: string;
  site: string;
  /** mostra as skills desta fonte no botão "Skills" do chat */
  ativo: boolean;
  /** quantas skills embutidas o sistema traz desta fonte (informativo) */
  embutidas: number;
}

export const FONTES_PADRAO: FonteSkill[] = [
  { id: 'vortex', nome: 'Vortex (nativas)', site: 'vortex-editor.netlify.app', ativo: true, embutidas: 12 },
  { id: 'skywork', nome: 'Skywork', site: 'https://skywork.ai/', ativo: true, embutidas: 8 },
  {
    id: 'google',
    nome: 'Google Skills (Cloud Skills Boost)',
    site: 'https://www.cloudskillsboost.google/paths/118',
    ativo: true,
    embutidas: 4,
  },
  { id: 'findskill', nome: 'FindSkill', site: 'https://findskill.ai/pt/skills/', ativo: true, embutidas: 6 },
];

export const lerFontesSkills = (): FonteSkill[] => {
  try {
    const cru = JSON.parse(localStorage.getItem(K) ?? 'null') as FonteSkill[] | null;
    if (!Array.isArray(cru) || !cru.length) return FONTES_PADRAO;
    // funde com o padrão para nunca perder uma fonte nova
    return FONTES_PADRAO.map((f) => ({ ...f, ...(cru.find((c) => c.id === f.id) ?? {}) }));
  } catch {
    return FONTES_PADRAO;
  }
};

export const salvarFontesSkills = (lista: FonteSkill[]) => {
  localStorage.setItem(K, JSON.stringify(lista));
  window.dispatchEvent(new Event('vortex:fontes'));
};
