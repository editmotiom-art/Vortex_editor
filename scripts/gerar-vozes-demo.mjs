/**
 * NARRAÇÃO DO VÍDEO DE APRESENTAÇÃO — pelo servidor do próprio editor
 * ------------------------------------------------------------
 * Usa a MESMA rota que o cliente usa (/api/ferramentas, ação "voz"), com as
 * vozes do catálogo. Cada bloco é uma frase curta, e o texto de cada bloco é
 * o mesmo que aparece na legenda do vídeo — nada é inventado.
 *
 *   node scripts/gerar-vozes-demo.mjs [http://localhost:3001]
 *
 * Saída: video-demo/vozes/vozN.mp3 + video-demo/vozes/textos.json
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] ?? 'http://localhost:3001';
const RAIZ = path.resolve('video-demo/vozes');
await mkdir(RAIZ, { recursive: true });

/* [arquivo, texto, voz] — frases curtas, uma ideia por bloco */
const BLOCOS = [
  ['voz1.mp3', 'Este é o Vortex: o editor de vídeo que roda no navegador, sem instalar nada. Aqui a tela é o sistema de verdade.', 'Ana'],
  ['voz2.mp3', 'A biblioteca abre com músicas, efeitos sonoros, fotos e vídeos livres. Um clique manda o arquivo para a timeline.', 'Ana'],
  ['voz3.mp3', 'O Pack do Editor lê o Drive de verdade. Se o arquivo abre no editor, ele vem na hora; se é para instalar, o download vai para o seu computador.', 'Ana'],
  ['voz4.mp3', 'A legenda narra com a voz escolhida. Ana, Bruno e Clara soam diferentes de propósito: tom e ritmo mudam em cada uma.', 'Ana'],
  ['voz5.mp3', 'Cada conta recebe horas de uso. Nada é liberado sem pagamento confirmado, e o painel do administrador fica fora do painel do cliente.', 'Ana'],
];

const rel = [];
for (const [arquivo, texto, voz] of BLOCOS) {
  const t0 = Date.now();
  const r = await fetch(`${base}/api/ferramentas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ acao: 'voz', texto, voz }),
  });
  if (!r.ok) {
    console.log(`✗ ${arquivo}: servidor respondeu ${r.status}`);
    continue;
  }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 2000) {
    console.log(`✗ ${arquivo}: áudio vazio (${buf.length} bytes)`);
    continue;
  }
  await writeFile(path.join(RAIZ, arquivo), buf);
  rel.push({ arquivo, texto, voz, bytes: buf.length, ms: Date.now() - t0 });
  console.log(`✓ ${arquivo} ${(buf.length / 1024).toFixed(0)} KB em ${((Date.now() - t0) / 1000).toFixed(1)}s — ${texto.slice(0, 46)}…`);
}
await writeFile(path.join(RAIZ, 'textos.json'), JSON.stringify(rel, null, 2));
console.log(`\n${rel.length} blocos prontos em video-demo/vozes`);
