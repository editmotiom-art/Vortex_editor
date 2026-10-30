/**
 * MAPEIA O QUE DÁ PARA USAR DIRETO NO EDITOR
 * ------------------------------------------
 * Percorre os 163 packs do Pack do Editor, lê a pasta no Drive (pelo
 * servidor do próprio site, /api/drive) e separa os arquivos que o editor
 * REALMENTE abre: vídeo, áudio e imagem. ZIP/RAR/AEP/PSD ficam de fora.
 *
 *   node scripts/mapear-packs-prontos.mjs [http://localhost:3001]
 *
 * Gera src/data/packsProntos.ts — a lista usada pela aba "Pronto para usar".
 */
import { readFile, writeFile } from 'node:fs/promises';

const base = process.argv[2] ?? 'http://localhost:3001';
const fonte = await readFile('src/data/packsMonkey.ts', 'utf8');
const packs = [...fonte.matchAll(/\{ id: "([^"]+)", nome: "([^"]+)", secao: "([^"]+)", drive: "([^"]+)"/g)].map(
  (m) => ({ id: m[1], nome: m[2], secao: m[3], pasta: (m[4].match(/folders\/([^?/]+)/) ?? [])[1] }),
);

const tipo = (nome) => {
  const ext = (nome.toLowerCase().split('.').pop() ?? '').trim();
  if (['mp4', 'mov', 'webm', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
  return null;
};

const ler = async (pasta) => {
  for (let i = 0; i < 3; i += 1) {
    try {
      const r = await fetch(`${base}/api/drive?pasta=${pasta}`);
      if (r.ok) return await r.json();
    } catch {
      /* tenta de novo */
    }
    await new Promise((ok) => setTimeout(ok, 800));
  }
  return {};
};

const saida = [];
let n = 0;
const fila = [...packs];

const trabalhar = async () => {
  for (;;) {
    const p = fila.shift();
    if (!p) return;
    if (!p.pasta) continue;
    const d = await ler(p.pasta);
    const arquivos = (d.arquivos ?? [])
      .map((a) => ({ id: a.id, nome: a.nome, tipo: tipo(a.nome) }))
      .filter((a) => a.tipo);
    if (!arquivos.length) continue;
    saida.push({ id: p.id, nome: p.nome, secao: p.secao, pasta: p.pasta, arquivos: arquivos.slice(0, 40) });
    n += arquivos.length;
    console.log(`✓ ${p.nome.padEnd(34)} ${arquivos.length} mídia(s)`);
  }
};

await Promise.all(Array.from({ length: 5 }, trabalhar));

const cabecalho = `/**
 * PACKS COM MÍDIA QUE ABRE NO EDITOR — GERADO AUTOMATICAMENTE
 * ------------------------------------------------------------
 * Rode \`node scripts/mapear-packs-prontos.mjs <url do site>\` para atualizar.
 * Só entram arquivos de vídeo, áudio e imagem (o resto do Pack do Editor é
 * para instalar no After Effects/Premiere e não abre no navegador).
 * Gerado em ${new Date().toISOString()}.
 */
export interface MidiaPronta {
  id: string;
  nome: string;
  tipo: 'video' | 'audio' | 'image';
}
export interface PackPronto {
  id: string;
  nome: string;
  secao: string;
  pasta: string;
  arquivos: MidiaPronta[];
}

export const PACKS_PRONTOS: PackPronto[] = `;

await writeFile('src/data/packsProntos.ts', cabecalho + JSON.stringify(saida, null, 2) + ';\n');
console.log(`\npacks com mídia: ${saida.length} · arquivos: ${n}`);
