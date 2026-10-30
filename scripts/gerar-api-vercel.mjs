/**
 * GERA AS FUNÇÕES DA VERCEL (api/*.ts) A PARTIR DA LÓGICA DA NETLIFY
 * ------------------------------------------------------------
 * Cada arquivo em api/ fica AUTÔNOMO: sem nenhum import. Isso evita os
 * problemas de empacotamento da Vercel (import de arquivo fora de api/,
 * server/ ponte, resolução de extensão) e mantém a regra de "uma lógica só":
 * o corpo é copiado mecanicamente de netlify/functions/<nome>.ts.
 *
 *   node scripts/gerar-api-vercel.mjs          # gera
 *   node scripts/gerar-api-vercel.mjs --check  # só confere se está em dia
 *
 * Se um dia a lógica mudar na Netlify, rode de novo (o build da Vercel
 * também roda sozinho — veja "buildCommand" no package.json).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const FUNCOES = ['drive', 'proxy', 'ferramentas', 'ia', 'minerar'];

const CABECALHO = async () =>
  (await readFile('scripts/vercel-cabecalho.txt', 'utf8')).replaceAll('<nome>', 'drive|proxy|ferramentas|ia|minerar');
const RODAPE = () => readFile('scripts/vercel-rodape.txt', 'utf8');

await mkdir('api', { recursive: true });

const gerados = [];
for (const nome of FUNCOES) {
  let fonte = await readFile(`netlify/functions/${nome}.ts`, 'utf8');

  // ajustes mecânicos (lógica intacta)
  fonte = fonte.replace(/export default (async \(req: Request\): Promise<Response> =>)/, 'const funcao = $1');
  if (!fonte.includes('const funcao =')) {
    fonte = fonte.replace(/export default (async \([^)]*\)(: Promise<Response>)? =>)/, 'const funcao = $1');
  }

  // minerar depende de netlify/lib/minerar.ts → embute o helper aqui (autônomo)
  if (nome === 'minerar') {
    const lib = await readFile('netlify/lib/minerar.ts', 'utf8');
    const libSemExport = lib
      .replace(/^export (interface|type|function|const)/gm, '$1');
    fonte = fonte.replace("import { minerar, abs } from '../lib/minerar.js';", libSemExport);
  }

  const conteudo = (await CABECALHO()) + fonte.trim() + '\n' + (await RODAPE());
  const destino = `api/${nome}.ts`;
  const antigo = await readFile(destino, 'utf8').catch(() => '');
  if (process.argv.includes('--check')) {
    if (antigo !== conteudo) {
      console.error(`✗ ${destino} está desatualizado — rode: node scripts/gerar-api-vercel.mjs`);
      process.exitCode = 1;
    }
  } else if (antigo !== conteudo) {
    await writeFile(destino, conteudo);
    gerados.push(destino);
  }
}
console.log(
  process.argv.includes('--check')
    ? process.exitCode
      ? 'api/ desatualizado'
      : '✓ api/ em dia'
    : gerados.length
      ? `✓ gerados: ${gerados.join(', ')}`
      : '✓ nada mudou',
);
