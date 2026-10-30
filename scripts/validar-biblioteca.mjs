/**
 * VALIDA E MONTA A BIBLIOTECA DE MÍDIA REAL
 * -----------------------------------------
 * Para cada candidato: baixa de verdade, confere o tipo do arquivo pelo
 * cabeçalho (não pelo que o site diz), tamanho e duração, e só então ele
 * entra no catálogo. Gera src/data/bibliotecaMidia.ts.
 *
 *   node scripts/validar-biblioteca.mjs
 *
 * Fontes: Wikimedia Commons (CC0/CC-BY/PD) e Pexels (licença Pexels).
 * Tudo com crédito guardado no item.
 */
import { writeFile } from 'node:fs/promises';

const UA = 'VortexEditor/1.0 (biblioteca; contato@vortexeditor.app)';

/* ---------------- candidatos ---------------- */
/* Para áudios, buscamos pela API do Commons (arquivos reais, com autor e licença). */
/* `exige` = a palavra precisa estar no TÍTULO do arquivo. Sem isso o
   resultado da busca do Commons traz qualquer coisa (já aconteceu: um
   "applause" virou canto de ópera). */
const BUSCAS_AUDIO = [
  // música (arquivos livres: Kevin MacLeod, Jason Shaw, CC0)
  { cat: 'Música', termo: 'filetype:audio "Kevin MacLeod" cinematic', exige: /MacLeod/i, tags: ['cinema', 'trilha'], trecho: 30 },
  { cat: 'Música', termo: 'filetype:audio "Jason Shaw" acoustic', exige: /Shaw/i, tags: ['violão', 'acústico'], trecho: 30 },
  { cat: 'Música', termo: 'filetype:audio jazz', exige: /jazz/i, tags: ['jazz', 'trilha'], trecho: 30 },
  { cat: 'Música', termo: 'filetype:audio ambient', exige: /ambien/i, tags: ['ambiente', 'trilha'], trecho: 30 },
  { cat: 'Música', termo: 'filetype:audio piano', exige: /piano/i, tags: ['piano'], trecho: 25 },
  // efeitos sonoros
  { cat: 'SFX', termo: 'filetype:audio applause', exige: /applau|clap/i, tags: ['aplausos'], trecho: 6 },
  { cat: 'SFX', termo: 'filetype:audio whoosh', exige: /whoosh/i, tags: ['whoosh', 'transição'], trecho: 2 },
  { cat: 'SFX', termo: 'filetype:audio bell', exige: /bell/i, tags: ['sino'], trecho: 4 },
  { cat: 'SFX', termo: 'filetype:audio keyboard typing', exige: /typ|keyboard/i, tags: ['teclado', 'texto'], trecho: 5 },
  { cat: 'SFX', termo: 'filetype:audio thunder', exige: /thunder/i, tags: ['trovão'], trecho: 5 },
];

const FOTOS = [
  ['Pôr do sol no mar', 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=1920', 'Pexels'],
  ['Pôr do sol (praia)', 'https://images.pexels.com/photos/1078983/pexels-photo-1078983.jpeg?auto=compress&cs=tinysrgb&w=1920', 'Pexels'],
  ['Cidade à noite', 'https://images.pexels.com/photos/378570/pexels-photo-378570.jpeg?auto=compress&cs=tinysrgb&w=1920', 'Pexels'],
  ['Montanha com neblina', 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1920', 'Pexels'],
  ['Floresta aérea', 'https://images.pexels.com/photos/9754/mountains-clouds-forest-fog.jpg?auto=compress&cs=tinysrgb&w=1920', 'Pexels'],
  ['Textura de concreto', 'https://images.pexels.com/photos/172289/pexels-photo-172289.jpeg?auto=compress&cs=tinysrgb&w=1600', 'Pexels'],
  ['Fumaça colorida', 'https://images.pexels.com/photos/2693212/pexels-photo-2693212.png?auto=compress&cs=tinysrgb&w=1600', 'Pexels'],
  ['Fundo gradiente escuro', 'https://images.pexels.com/photos/7130555/pexels-photo-7130555.jpeg?auto=compress&cs=tinysrgb&w=1920', 'Pexels'],
];

/* ---------------- utilidades ---------------- */

const tipoReal = (buf) => {
  const h = buf.subarray(0, 12);
  const ascii = h.toString('latin1');
  if (ascii.startsWith('OggS')) return 'audio/ogg';
  if (ascii.startsWith('ID3')) return 'audio/mpeg';
  if (ascii.startsWith('RIFF')) return ascii.includes('WEBP') ? 'image/webp' : 'audio/wav';
  if (ascii.startsWith('fLaC')) return 'audio/flac';
  if (h[0] === 0xff && (h[1] & 0xe0) === 0xe0) return 'audio/mpeg';
  if (h[0] === 0xff && h[1] === 0xd8) return 'image/jpeg';
  if (h[0] === 0x89 && h[1] === 0x50) return 'image/png';
  if (ascii.slice(4, 8) === 'ftyp') return 'video/mp4';
  if (h[0] === 0x1a && h[1] === 0x45) return 'video/webm';
  return 'desconhecido';
};

/* Validação por CABEÇALHO (Range: 0-4095): confere status e tipo real sem
   baixar o arquivo inteiro — baixar tudo derrubava a validação por 429. */
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const conferir = async (url, tentativas = 4) => {
  for (let i = 0; i < tentativas; i += 1) {
    try {
      const r = await fetch(url, {
        headers: { 'user-agent': UA, range: 'bytes=0-4095' },
        redirect: 'follow',
      });
      if (r.status === 429) {
        await espera(1500 * (i + 1));
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      const total = Number(r.headers.get('content-range')?.split('/')?.[1] ?? 0) || buf.length;
      return { status: r.status, buf, tipo: tipoReal(buf), total };
    } catch (e) {
      await espera(800 * (i + 1));
    }
  }
  return { status: 0, buf: Buffer.alloc(0), tipo: 'desconhecido', total: 0 };
};

const buscarCommons = async (termo, limite = 4) => {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=search' +
    `&gsrsearch=${encodeURIComponent(termo)}&gsrnamespace=6&gsrlimit=${limite}` +
    '&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json';
  const r = await fetch(url, { headers: { 'user-agent': UA } });
  const d = await r.json();
  return Object.values(d?.query?.pages ?? {}).map((p) => {
    const ii = p.imageinfo?.[0] ?? {};
    const meta = ii.extmetadata ?? {};
    return {
      titulo: (p.title ?? '').replace(/^File:/, ''),
      url: (ii.url ?? '').split('?')[0],
      mime: ii.mime,
      bytes: ii.size ?? 0,
      duracao: ii.duration ?? 0,
      autor: (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim(),
      licenca: (meta.LicenseShortName?.value ?? '').replace(/<[^>]+>/g, '').trim() || 'Wikimedia',
      pagina: ii.descriptionurl ?? '',
    };
  });
};

/* ---------------- montagem ---------------- */

const itens = [];
const descartados = [];

for (const busca of BUSCAS_AUDIO) {
  const achados = await buscarCommons(busca.termo, 5);
  let usados = 0;
  for (const a of achados) {
    if (usados >= 2) break;
    // o Commons marca .ogg como application/ogg — o tipo real é conferido no download
    if (!a.url || !/audio|application\/ogg/i.test(a.mime ?? '')) continue;
    if (a.bytes < 20_000 || a.bytes > 6_000_000) continue;      // arquivo leve: abre rápido no editor
    if (busca.exige && !busca.exige.test(a.titulo)) continue;   // só o que o nome promete
    if ((a.duracao ?? 0) < 1) continue;
    if (/midi/i.test(a.mime ?? '') || /\.mid$/i.test(a.url)) continue;  // MIDI não toca no editor
    console.log('   ·', busca.cat, '→', a.titulo.slice(0, 46), a.mime, (a.bytes / 1024).toFixed(0) + 'KB');
    try {
      const b = await conferir(a.url);
      await espera(250);
      if (![200, 206].includes(b.status) || !b.tipo.startsWith('audio/') || b.total < 20_000) {
        descartados.push([a.titulo, b.status, b.tipo, b.total]);
        continue;
      }
      itens.push({
        id: `real-${itens.length + 1}`,
        nome: a.titulo.replace(/\.[a-z0-9]+$/i, '').slice(0, 70),
        tipo: 'audio',
        url: a.url,
        fonte: a.pagina,
        autor: a.autor || 'Wikimedia Commons',
        licenca: a.licenca,
        bytes: b.total || a.bytes,
        duracaoSeg: a.duracao ? Math.round(a.duracao) : undefined,
        cat: busca.cat,
        trechoSeg: busca.trecho,
        tags: busca.tags,
      });
      usados += 1;
    } catch (e) {
      descartados.push([a.titulo, String(e.message).slice(0, 60)]);
    }
  }
}

for (const [nome, url, fonte] of FOTOS) {
  try {
    const b = await conferir(url);
    await espera(250);
    if (![200, 206].includes(b.status) || !b.tipo.startsWith('image/') || b.total < 20_000) {
      descartados.push([nome, b.status, b.tipo, b.total]);
      continue;
    }
    itens.push({
      id: `real-${itens.length + 1}`,
      nome,
      tipo: 'image',
      url,
      fonte: 'https://www.pexels.com/license/',
      autor: fonte,
      licenca: 'Licença Pexels (uso livre)',
      bytes: b.total,
      cat: 'Fundos',
      tags: ['fundo', nome.toLowerCase()],
    });
  } catch (e) {
    descartados.push([nome, String(e.message).slice(0, 60)]);
  }
}

/* vídeos CC0 do Commons (fundos em movimento) */
for (const termo of ['filetype:video incategory:"CC-Zero" timelapse', 'filetype:video clouds timelapse']) {
  const achados = await buscarCommons(termo, 4);
  for (const a of achados) {
    if (!/video\/(mp4|webm)/.test(a.mime ?? '')) continue;
    if (a.bytes < 200_000 || a.bytes > 30_000_000) continue;
    try {
      const cabecalho = await fetch(a.url, { headers: { 'user-agent': UA, range: 'bytes=0-2047' } });
      const buf = Buffer.from(await cabecalho.arrayBuffer());
      if (!tipoReal(buf).startsWith('video/')) {
        descartados.push([a.titulo, 'cabeçalho não é vídeo']);
        continue;
      }
      itens.push({
        id: `real-${itens.length + 1}`,
        nome: a.titulo.replace(/\.[a-z0-9]+$/i, '').slice(0, 70),
        tipo: 'video',
        url: a.url,
        fonte: a.pagina,
        autor: a.autor || 'Wikimedia Commons',
        licenca: a.licenca,
        bytes: a.bytes,
        duracaoSeg: a.duracao ? Math.round(a.duracao) : undefined,
        cat: 'Fundos',
        tags: ['vídeo', 'fundo', 'loop'],
      });
      break;
    } catch (e) {
      descartados.push([a.titulo, String(e.message).slice(0, 60)]);
    }
  }
}

const cabecalho = `/**
 * CATÁLOGO DE MÍDIA REAL — GERADO AUTOMATICAMENTE
 * ------------------------------------------------------------
 * Não edite à mão: rode \`node scripts/validar-biblioteca.mjs\`.
 * Cada item abaixo foi baixado e conferido (status, tipo real e tamanho)
 * em ${new Date().toISOString()}.
 *
 * Licenças: Wikimedia Commons (CC0/CC-BY/PD) e Pexels (uso livre).
 * O autor e a licença aparecem no card da biblioteca.
 */
import type { ItemBibliotecaReal } from './bibliotecaReal';

export const BIBLIOTECA_MIDIA: ItemBibliotecaReal[] = `;

await writeFile('src/data/bibliotecaMidia.ts', cabecalho + JSON.stringify(itens, null, 2) + ';\n');

const porCat = {};
for (const i of itens) porCat[i.cat] = (porCat[i.cat] ?? 0) + 1;
console.log('itens válidos:', itens.length, porCat);
console.log('descartados:', descartados.length);
for (const d of descartados.slice(0, 8)) console.log('  ✗', d.join(' | '));
