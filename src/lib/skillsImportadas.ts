/**
 * SKILLS IMPORTADAS DA WEB
 * ------------------------------------------------------------
 * Permite colar o link de um pacote (.zip) ou de um arquivo .md de skill e
 * trazer o texto para dentro do chat. O download é feito pela função de
 * servidor `ferramentas` (ação `skill`) — assim não esbarra em CORS e o
 * navegador não precisa entender zip.
 *
 * Guardado em localStorage (`vortex.skillsWeb.v1`): só texto, ~6 KB por skill.
 */

import type { SkillExterna } from '../data/skillsExternas';
import { fonteDoLink } from '../components/SkillsChat';
import { chamarFuncao } from './api';

const K = 'vortex.skillsWeb.v1';

const emojiPorNome = (nome: string): string => {
  const n = nome.toLowerCase();
  if (/photo|foto|produto/.test(n)) return '📦';
  if (/design|visual|arte/.test(n)) return '🎨';
  if (/video|reel|short/.test(n)) return '🎬';
  if (/slide|pitch|deck|apresent/.test(n)) return '📊';
  if (/text|copy|post|linkedin/.test(n)) return '📝';
  if (/emoji|story|histó/.test(n)) return '😀';
  return '🧠';
};

export const lerSkillsImportadas = (): SkillExterna[] => {
  try {
    const lista = JSON.parse(localStorage.getItem(K) ?? '[]') as SkillExterna[];
    return Array.isArray(lista) ? lista.filter((s) => s && s.id && s.texto) : [];
  } catch {
    return [];
  }
};

const gravar = (lista: SkillExterna[]) => {
  try {
    localStorage.setItem(K, JSON.stringify(lista.slice(-24)));
  } catch {
    localStorage.setItem(K, JSON.stringify(lista.slice(-8)));
  }
};

export const removerSkillImportada = (id: string) =>
  gravar(lerSkillsImportadas().filter((s) => s.id !== id));

export interface ResultadoImportacao {
  ok: boolean;
  nome?: string;
  erro?: string;
}

/**
 * Baixa o pacote pelo servidor, lê o SKILL.md e guarda como skill do chat.
 */
export async function adicionarSkillDoLink(url: string): Promise<ResultadoImportacao> {
  try {
    const r = await chamarFuncao('ferramentas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ acao: 'skill', url }),
    });
    const dados = (await r.json().catch(() => ({}))) as {
      ok?: boolean;
      erro?: string;
      nome?: string;
      arquivos?: { nome: string; texto: string }[];
    };
    if (!dados.ok || !dados.arquivos?.length) {
      return { ok: false, erro: dados.erro ?? 'o pacote não trouxe nenhum SKILL.md' };
    }
    const arquivo = dados.arquivos[0];
    const bruto = (arquivo.nome.split('/').pop() ?? 'skill').replace(/\.md$/i, '');
    const titulo =
      bruto
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim() || 'Skill da web';

    const skill: SkillExterna = {
      id: `imp-${bruto.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36).slice(-4)}`,
      nome: `${titulo} (${fonteDoLink(url)})`,
      emoji: emojiPorNome(titulo),
      categoria: 'Importada',
      resumo: arquivo.texto.replace(/[#*`>\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110),
      formato: 'vertical',
      url,
      texto: arquivo.texto.slice(0, 12000),
    };

    gravar([...lerSkillsImportadas(), skill]);
    return { ok: true, nome: skill.nome };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
