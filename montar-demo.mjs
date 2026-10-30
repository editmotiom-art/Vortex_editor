/**
 * MONTAGEM DO VÍDEO DE APRESENTAÇÃO
 * ------------------------------------------------------------
 * Junta: tela gravada (video-demo/bruto/*.webm) + narração de cada capítulo no
 * segundo exato + trilha de fundo baixa + som de clique em cada ação.
 * Não há "gravação de áudio junto com a tela" (era o motivo do atraso antigo):
 * tudo é encaixado por ffmpeg depois, com o tempo medido na hora da gravação
 * (video-demo/marca.json: { marca:[{t,capitulo}], cliques:[t,...] }).
 *
 *   node montar-demo.mjs [pasta]
 *
 * Saída: public/demo-vortex.mp4 (1080p, H.264 + AAC, faststart) e .webm
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(process.argv[2] ?? 'video-demo');
const BRUTO = path.join(RAIZ, 'bruto');
const NARRA = path.join(RAIZ, 'narra');
const SAIDA = path.resolve('public');
mkdirSync(SAIDA, { recursive: true });

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
const duracao = (arquivo) =>
  Number(
    execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', arquivo,
    ]).toString().trim(),
  );

/* ---------------- 1. acha a tela gravada ---------------- */
const webms = readdirSync(BRUTO).filter((f) => f.endsWith('.webm'));
if (!webms.length) throw new Error('nenhum vídeo em video-demo/bruto');
const tela = path.join(BRUTO, webms.sort((a, b) => statSync(path.join(BRUTO, b)).size - statSync(path.join(BRUTO, a)).size)[0]);
const { marca, cliques } = JSON.parse(readFileSync(path.join(RAIZ, 'marca.json'), 'utf8'));
const TOTAL = duracao(tela);
console.log(`tela: ${path.basename(tela)} · ${TOTAL.toFixed(1)}s · ${marca.length} capítulos · ${cliques.length} cliques`);

/* ---------------- 2. trilha de fundo (gerada) ---------------- */
const trilha = path.join(RAIZ, 'trilha.wav');
if (!statSync(trilha, { throwIfNoEntry: false })) {
  // acorde suave em loop, filtrado — música de fundo discreta, volume baixo
  ff([
    '-f', 'lavfi', '-i', `sine=frequency=110:duration=${TOTAL}:sample_rate=44100`,
    '-f', 'lavfi', '-i', `sine=frequency=165:duration=${TOTAL}:sample_rate=44100`,
    '-f', 'lavfi', '-i', `sine=frequency=220:duration=${TOTAL}:sample_rate=44100`,
    '-filter_complex', '[0][1][2]amix=inputs=3:duration=longest,tremolo=f=3:d=0.15,lowpass=f=900,volume=0.5[a]',
    '-map', '[a]', '-c:a', 'pcm_s16le', trilha,
  ]);
}
/* cliques: um bipe curtinho por ação */
const cliquesWav = path.join(RAIZ, 'cliques.wav');
if (!statSync(cliquesWav, { throwIfNoEntry: false })) {
  const unico = path.join(RAIZ, 'click-unico.wav');
  ff(['-f', 'lavfi', '-i', 'sine=frequency=1400:duration=0.045:sample_rate=44100',
      '-af', 'afade=t=out:st=0.02:d=0.025,volume=0.35', unico]);
  const entradas = [];
  const filtros = [];
  cliques.slice(0, 60).forEach((t, i) => {
    if (t > TOTAL - 0.2) return;
    entradas.push('-i', unico);
    filtros.push(`[${i}:a]adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)}[c${i}]`);
  });
  const mix = filtros.length ? filtros.join(';') + ';' + filtros.map((_, i) => `[c${i}]`).join('') + `amix=inputs=${filtros.length}:normalize=0[out]` : '';
  if (filtros.length) {
    ff([...entradas, '-filter_complex', mix, '-map', '[out]', '-c:a', 'pcm_s16le', '-t', String(TOTAL), cliquesWav]);
  } else {
    ff(['-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono:d=${TOTAL}`, cliquesWav]);
  }
}

/* ---------------- 3. narração no tempo certo ---------------- */
const narracoes = [];
for (const item of marca) {
  const arquivo = path.join(NARRA, `${String(item.capitulo).padStart(2, '0')}-${item.capitulo}.mp3`);
  const alternativo = readdirSync(NARRA).find((f) => f.includes(item.capitulo));
  const escolhido = statSync(arquivo, { throwIfNoEntry: false }) ? arquivo : alternativo && path.join(NARRA, alternativo);
  if (!escolhido) {
    console.warn(`  ! sem narração para ${item.capitulo}`);
    continue;
  }
  narracoes.push({ t: item.t + 0.35, arquivo: escolhido, dur: duracao(escolhido), capitulo: item.capitulo });
}

/* ---------------- 4. mix final ---------------- */
const entradas = ['-i', tela, '-i', trilha, '-i', cliquesWav];
const filtrosNarra = [];
const rotulos = [];
narracoes.forEach((n, i) => {
  entradas.push('-i', n.arquivo);
  const atraso = Math.round(n.t * 1000);
  filtrosNarra.push(
    `[${i + 3}:a]adelay=${atraso}|${atraso},volume=1.0,` +
      // corta a narração se ela passar do próximo capítulo
      `apad=whole_dur=${TOTAL}[n${i}]`,
  );
  rotulos.push(`[n${i}]`);
});
const filtroCompleto =
  `[1:a]volume=0.16,afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(0, TOTAL - 2)}:d=2[mus];` +
  `[2:a]volume=0.9[clk];` +
  filtrosNarra.join(';') +
  `;[mus][clk]${rotulos.join('')}amix=inputs=${2 + narracoes.length}:duration=first:dropout_transition=0,` +
  // normaliza a faixa inteira para -16 LUFS (padrão de web) — antes o áudio
  // ficava baixo demais (-35 dB médio) e parecia "arrastado"
  `alimiter=limit=0.95,aresample=48000,` +
  `loudnorm=I=-16:TP=-1.5:LRA=11,` +
  `aformat=channel_layouts=stereo[final]`;

const mp4 = path.join(SAIDA, 'demo-vortex.mp4');
console.log('montando MP4 1080p…');
ff([
  ...entradas,
  '-filter_complex', filtroCompleto,
  '-map', '0:v', '-map', '[final]',
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
  '-r', '30', '-s', '1920x1080',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000',
  '-shortest', '-movflags', '+faststart',
  mp4,
]);

const webm = path.join(SAIDA, 'demo-vortex.webm');
console.log('gerando WebM (compatibilidade)…');
ff([
  ...entradas,
  '-filter_complex', filtroCompleto,
  '-map', '0:v', '-map', '[final]',
  '-c:v', 'libvpx-vp9', '-b:v', '2200k', '-crf', '34', '-deadline', 'good', '-cpu-used', '4',
  '-c:a', 'libopus', '-b:a', '128k',
  '-shortest',
  webm,
]);

/* ---------------- 5. relatório de sincronia ---------------- */
const durMp4 = duracao(mp4);
const relatorio = {
  tela: path.basename(tela),
  duracaoTela: Number(TOTAL.toFixed(2)),
  duracaoFinal: Number(durMp4.toFixed(2)),
  diferenca: Number(Math.abs(durMp4 - TOTAL).toFixed(2)),
  capitulos: narracoes.map((n) => ({
    capitulo: n.capitulo,
    entra_em: Number(n.t.toFixed(2)),
    dura: Number(n.dur.toFixed(2)),
    termina_em: Number((n.t + n.dur).toFixed(2)),
  })),
  cliques: cliques.length,
  arquivos: {
    mp4: `${(statSync(mp4).size / 1024 / 1024).toFixed(1)} MB`,
    webm: `${(statSync(webm).size / 1024 / 1024).toFixed(1)} MB`,
  },
};
writeFileSync(path.join(RAIZ, 'relatorio.json'), JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 1));
