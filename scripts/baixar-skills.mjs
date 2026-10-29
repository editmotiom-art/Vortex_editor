/**
 * Baixa as skills públicas do findskill.ai e gera src/data/skillsExternas.ts
 * Uso: node scripts/baixar-skills.mjs
 *
 * O site entrega cada skill como .zip com um SKILL.md dentro. Aqui o zip é
 * lido com zlib (deflate-raw) e o texto entra no bundle — o app não depende
 * da internet para abrir a gaveta de skills.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const SKILLS = [
  ['product-photography-generator', 'ai-creative', 'Fotografia de produto', '📦', 'Produto', 'quadrado', 'Fotos de e-commerce com luz de estúdio e formato de prompt.'],
  ['corporate-trust-design', 'design-media', 'Design de confiança', '🏛', 'Arte', 'horizontal', 'Visual corporativo, gradientes sutis e sinais de credibilidade.'],
  ['thumbnail-text-shortener', 'ai-creative', 'Texto de thumbnail', '✂', 'Social', 'horizontal', 'Encurta o texto da capa sem perder o gancho.'],
  ['emoji-only-storyteller', 'ai-creative', 'História só com emoji', '😀', 'Social', 'vertical', 'Conta uma história inteira usando emojis.'],
  ['linkedin-posts', 'ai-creative', 'Posts de LinkedIn', '💼', 'Texto', 'quadrado', 'Post profissional com gancho, corpo e chamada.'],
  ['pitch-deck-creator', 'productivity', 'Pitch deck', '📈', 'Apresentação', 'horizontal', 'Deck de pitch com 10 slides na ordem que investidor espera.'],
];

const lerZip = (buf) => {
  const ler = (off, n) => buf.subarray(off, off + n);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const metodo = buf.readUInt16LE(p + 10);
    const comp = buf.readUInt32LE(p + 20);
    const tamNome = buf.readUInt16LE(p + 28);
    const tamExtra = buf.readUInt16LE(p + 30);
    const tamCom = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.subarray(p + 46, p + 46 + tamNome).toString('utf8');
    p += 46 + tamNome + tamExtra + tamCom;
    if (!/\.md$/i.test(nome)) continue;
    const nOff = buf.readUInt16LE(local + 26);
    const eOff = buf.readUInt16LE(local + 28);
    const ini = local + 30 + nOff + eOff;
    const dados = ler(ini, comp);
    const texto = metodo === 0 ? dados.toString('utf8') : inflateRawSync(dados).toString('utf8');
    return { nome, texto };
  }
  return null;
};

const baixadas = [];
for (const [slug, cat, nome, emoji, categoria, formato, resumo] of SKILLS) {
  const url = `https://findskill.ai/skills/${cat}/${slug}/${slug}.zip`;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!r.ok) { console.log('✗', slug, r.status); continue; }
    const zip = Buffer.from(await r.arrayBuffer());
    const lido = lerZip(zip);
    if (!lido) { console.log('✗', slug, 'sem md'); continue; }
    baixadas.push({ id: slug, nome: `${nome} (FindSkill)`, emoji, categoria, resumo, formato, url, texto: lido.texto.slice(0, 6000) });
    console.log('✓', slug, lido.texto.length, 'chars');
  } catch (e) {
    console.log('✗', slug, e.message);
  }
}

const ts = `/**
 * SKILLS EXTERNOS EMBUTIDOS — gerado por scripts/baixar-skills.mjs
 * Conteúdo público de findskill.ai (prompts), usado como cérebro das skills
 * do chat de criação. Nada é baixado em tempo de execução.
 */

export interface SkillExterna {
  id: string;
  nome: string;
  emoji: string;
  categoria: string;
  resumo: string;
  formato: 'vertical' | 'quadrado' | 'horizontal';
  url: string;
  texto: string;
}

export const SKILLS_EXTERNAS: SkillExterna[] = ${JSON.stringify(baixadas, null, 2)};
`;
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/skillsExternas.ts', ts);
console.log(`\n${baixadas.length}/${SKILLS.length} skills em src/data/skillsExternas.ts`);
