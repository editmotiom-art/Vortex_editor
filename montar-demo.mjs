/**
 * MONTAGEM DO VÍDEO DE APRESENTAÇÃO
 * ------------------------------------------------------------
 * Entrada:  video-demo/demo/capN.webm  (uma gravação por capítulo)
 *           video-demo/vozes/vozN.mp3  (uma narração por capítulo)
 * Saída:    public/demo-vortex.mp4 + public/demo-vortex.webm
 *
 * Regra que elimina o problema das vozes atropeladas: o vídeo é montado
 * capítulo por capítulo. Cada trecho tem o tamanho da própria narração
 * (com folga), recebe a legenda daquele trecho e vai para a sequência.
 * Nunca existe dois áudios no mesmo pedaço da linha do tempo.
 *
 *   node montar-demo.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('video-demo/demo');
const VOZES = path.resolve('video-demo/vozes');
const TMP = path.resolve('video-demo/tmp');
const SAIDA_MP4 = path.resolve('public/demo-vortex.mp4');
const SAIDA_WEBM = path.resolve('public/demo-vortex.webm');
const FONTE = fs.existsSync('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
  ? '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
  : path.resolve('src/assets/fonte-demo.ttf');

const indice = JSON.parse(fs.readFileSync(path.join(RAIZ, 'indice.json'), 'utf8'));
const textos = indice.narracao ?? [];
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const dur = (arq) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]).toString().trim());

/* legenda curta de cada capítulo (é o mesmo assunto da narração) */
const LEGENDAS = [
  'O editor completo, no navegador',
  'Biblioteca com música, SFX, foto e vídeo',
  'Conteúdo do Drive, direto na timeline',
  'Legenda e narração com vozes diferentes',
  'Plano por horas, downloads e exportação',
];

const trechos = [];
let total = 0;

for (const cap of indice.capitulos) {
  const voz = path.join(VOZES, `voz${cap.indice}.mp3`);
  if (!fs.existsSync(voz) || !fs.existsSync(cap.arquivo)) {
    console.log(`capítulo ${cap.indice}: pulado (falta ${fs.existsSync(voz) ? 'gravação' : 'narração'})`);
    continue;
  }
  const durVoz = dur(voz);
  const durTela = dur(cap.arquivo);
  /* o trecho começa no primeiro instante em que o editor já está na tela */
  const corteInicio = Math.max(0, cap.inicio - 0.3);
  const precisa = durVoz + 1.4;
  const disponivel = Math.max(0, durTela - corteInicio);
  /* se a ação foi mais curta que a narração, o último quadro fica parado
     até a voz terminar (sem cortar a frase nem acelerar o vídeo) */
  const parar = Math.max(0, precisa - disponivel);
  const saida = path.join(TMP, `trecho${cap.indice}.mp4`);

  const legenda = LEGENDAS[cap.indice - 1] ?? cap.nome;
  /* o ffmpeg precisa dos dois-pontos escapados dentro do texto */
  const texto = `${cap.indice}/5 · ${legenda}`.replace(/'/g, '\u2019').replace(/:/g, '\\:');

  const filtros = [
    `trim=start=${corteInicio.toFixed(2)}`,
    'setpts=PTS-STARTPTS',
    `tpad=stop_mode=clone:stop_duration=${Math.min(parar, 12).toFixed(2)}`,
    `trim=duration=${precisa.toFixed(2)}`,
    'fps=30',
    'scale=1920:1080:force_original_aspect_ratio=decrease',
    'pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x0b1220',
    // cartão do capítulo: caixa do tamanho do texto (nunca corta a frase)
    `drawtext=fontfile='${FONTE}':text='${texto}':x=60:y=h-96:fontsize=32:fontcolor=0xffffff:` +
      `box=1:boxcolor=0x04131a@0.74:boxborderw=18`,
  ].join(',');

  ff([
    '-i', cap.arquivo,
    '-vf', filtros,
    '-an',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-video_track_timescale', '90000',
    saida,
  ]);

  /* áudio do trecho: a narração começa 0,6 s depois do corte e o resto é
     silêncio — nenhum trecho tem mais de uma voz */
  const audio = path.join(TMP, `audio${cap.indice}.m4a`);
  ff([
    '-f', 'lavfi', '-t', precisa.toFixed(2), '-i', 'anullsrc=r=48000:cl=stereo',
    '-i', voz,
    '-filter_complex', `[1:a]adelay=600|600,volume=1.0[v];[0:a][v]amix=inputs=2:duration=first:dropout_transition=0[a]`,
    '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    audio,
  ]);

  trechos.push({ video: saida, audio, dur: precisa, cap: cap.nome, legenda });
  total += precisa;
  console.log(`capítulo ${cap.indice}: tela ${disponivel.toFixed(1)}s · voz ${durVoz.toFixed(1)}s · trecho ${precisa.toFixed(1)}s`);
}

if (!trechos.length) throw new Error('nenhum trecho para montar');

/* ---- junta os trechos (vídeo e áudio na mesma ordem) ---- */
const lista = path.join(TMP, 'lista.txt');
fs.writeFileSync(
  lista,
  trechos.map((t) => `file '${t.video}'\nfile '${t.audio}'`).join('\n') + '\n',
);
/* o concat de arquivos separados precisa juntar vídeo e áudio de novo */
const pares = [];
trechos.forEach((t, i) => {
  pares.push(`[${i * 2}:v]`, `[${i * 2 + 1}:a]`);
});
const entradas = trechos.flatMap((t) => ['-i', t.video, '-i', t.audio]);
const filtro = `${pares.map((p, i) => (i % 2 === 0 ? p : p)).join('')}concat=n=${trechos.length}:v=1:a=1[v][a]`;
const mudo = path.join(TMP, 'unico.mp4');
ff([
  ...entradas,
  '-filter_complex', filtro,
  '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  mudo,
]);

/* ---- normaliza o volume e fecha com um cartão final ---- */
const final = path.join(TMP, 'final.mp4');
ff([
  '-i', mudo,
  '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
  '-c:v', 'copy',
  '-c:a', 'aac', '-b:a', '192k',
  final,
]);

fs.copyFileSync(final, SAIDA_MP4);
ff(['-i', final, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-cpu-used', '2', '-c:a', 'libopus', '-b:a', '128k', SAIDA_WEBM]);

console.log(`\npronto: ${(total).toFixed(1)}s · ${(fs.statSync(SAIDA_MP4).size / 1048576).toFixed(1)} MB mp4 · ${(fs.statSync(SAIDA_WEBM).size / 1048576).toFixed(1)} MB webm`);
