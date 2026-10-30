/**
 * MONTAGEM DO VÍDEO DE APRESENTAÇÃO
 * ------------------------------------------------------------
 * Entrada:  video-demo/showcase/tela.webm  (gravação crua da tela)
 *           video-demo/showcase/narra.mp3  (UMA narração só — nunca duas)
 * Saída:    public/demo-vortex.mp4 + .webm
 *
 * Cuidados que resolvem os problemas apontados:
 *  · um único arquivo de narração (nada de capítulos emendados se atropelando);
 *  · legendas curtas que aparecem no tempo exato de cada passo;
 *  · áudio normalizado em −16 LUFS com pico em −1,5 dB (volume constante);
 *  · só o áudio da narração + um pad bem discreto (sem cliques gritando).
 *
 *   node montar-showcase.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve('video-demo/showcase');
const VOZES = path.resolve('video-demo/vozes');
const CRU = path.join(RAIZ, 'tela.webm');
/* A narração é dividida em BLOCOS. Cada bloco começa quando o anterior
   terminou + uma respiração: nunca existe dois áudios falando junto. */
const BLOCOS = [
  { arquivo: 'voz1.mp3', texto: 'Abertura' },
  { arquivo: 'voz2.mp3', texto: 'Baixar conteúdo' },
  { arquivo: 'voz3.mp3', texto: 'Biblioteca, legenda e IA' },
  { arquivo: 'voz4.mp3', texto: 'Plano por horas e downloads' },
  { arquivo: 'voz5.mp3', texto: 'Admin e pagamento' },
]
  .filter((b) => fs.existsSync(path.join(VOZES, b.arquivo)))
  .map((b) => ({ ...b, caminho: path.join(VOZES, b.arquivo) }));
if (!BLOCOS.length) throw new Error('nenhum bloco de voz encontrado em video-demo/vozes');
const NARRA = BLOCOS[0].caminho;
const SAIDA_MP4 = path.resolve('public/demo-vortex.mp4');
const SAIDA_WEBM = path.resolve('public/demo-vortex.webm');

if (!fs.existsSync(CRU)) throw new Error('falta a gravação da tela (video-demo/showcase/tela.webm)');
void NARRA;

const passos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'passos.json'), 'utf8'));
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });

/* corte inicial (o tempo de carregar a página não entra no vídeo) */
const CORTE = 3.6;
const duracaoTela = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', CRU]).toString().trim(),
);
const dur = Math.min(duracaoTela - CORTE, 62);

const durSec = (arq) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq]).toString().trim());

/* agenda: cada bloco começa no marco da cena (ou logo após o anterior) */
const INICIOS = [0.8, 14.0, 26.0, 33.5, 45.0];
const agenda = BLOCOS.map((b, i) => {
  const d = durSec(b.caminho);
  return { ...b, duracao: d, inicio: INICIOS[i] };
});
/* confere que nenhum bloco invade o próximo (garante zero sobreposição) */
for (let i = 1; i < agenda.length; i += 1) {
  const anteriorFim = agenda[i - 1].inicio + agenda[i - 1].duracao;
  if (agenda[i].inicio < anteriorFim + 0.2) {
    console.log(`ajustando bloco ${i + 1} para ${(anteriorFim + 0.4).toFixed(1)}s (evita sobreposição)`);
    agenda[i].inicio = anteriorFim + 0.4;
  }
}
const duracaoNarra = agenda.reduce((m, b) => Math.max(m, b.inicio + b.duracao), 0);
console.log('blocos de voz:', agenda.map((b) => `${b.inicio.toFixed(1)}s +${b.duracao.toFixed(1)}s`).join(' · '));
console.log(`tela ${duracaoTela.toFixed(1)}s (−${CORTE}s) · narração ${duracaoNarra.toFixed(1)}s · alvo ${dur.toFixed(1)}s`);

/* ---------------- legendas (curtas, no tempo de cada passo) ---------------- */

const LEGENDAS = [
  ['0.6', 'Editor de vídeo completo, no navegador'],
  ['5.4', 'Prévia, biblioteca, inspetor e régua multi-trilha'],
  ['10.5', 'Uma ferramenta: link de vídeo, Drive ou página'],
  ['17.6', 'O arquivo cai direto na timeline'],
  ['21.0', 'Acervo com packs, templates, fundos e músicas'],
  ['26.5', 'Legenda automática, voz e IA de criação'],
  ['32.0', 'Cada conta com plano por horas e barra de progresso'],
  ['37.6', 'Histórico de tudo o que foi baixado'],
  ['41.0', 'Painel administrativo: clientes e horas'],
  ['47.5', 'Pagamento confirmado libera as horas na hora'],
  ['54.0', 'Vortex — produza, baixe e exporte'],
];

const fonte = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const escapar = (t) =>
  t
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, '\u2019')
    .replace(/,/g, '\\,');

const filtrosLegenda = LEGENDAS.map(([t, texto], i) => {
  const inicio = Number(t) + 0.3;
  const fim = inicio + 3.4;
  return (
    `drawtext=fontfile=${fonte}:text='${escapar(texto)}'` +
    `:fontsize=34:fontcolor=white:box=1:boxcolor=0x0a1520@0.72:boxborderw=18` +
    `:x=(w-text_w)/2:y=h-118` +
    `:alpha='if(lt(t,${inicio}),0,if(lt(t,${inicio + 0.35}),(t-${inicio})/0.35,if(lt(t,${fim - 0.35}),1,if(lt(t,${fim}),(${fim}-t)/0.35,0))))'`
  );
}).join(',');

/* ---------------- áudio: blocos de voz + pad discreto ---------------- */
fs.mkdirSync('public', { recursive: true });

/* entradas de áudio: [1..N] vozes, depois o pad gerado */
const entradasVoz = agenda.flatMap((b) => ['-i', b.caminho]);
const cadeiaVoz = agenda
  .map((b, i) => {
    const ms = Math.round(b.inicio * 1000);
    return (
      `[${i + 1}:a]highpass=f=90,lowpass=f=13000,` +
      `loudnorm=I=-15:TP=-1.5:LRA=9,` +
      `adelay=${ms}|${ms},volume=1.0[v${i + 1}]`
    );
  })
  .join(';');
const mixVoz = agenda.map((_, i) => `[v${i + 1}]`).join('') + `amix=inputs=${agenda.length}:duration=longest:normalize=0[vozmix];`;

/* pad: uma nota grave bem baixa, entrando e saindo devagar */
const indicePad = agenda.length + 1;
const cadeiaPad =
  `[${indicePad}:a]volume=0.05,afade=t=in:st=0:d=2.5,afade=t=out:st=${(dur - 3).toFixed(2)}:d=3[pad];`;
const misturaFinal = `[vozmix][pad]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95,apad=whole_dur=${dur.toFixed(2)},afade=t=out:st=${(dur - 1.2).toFixed(2)}:d=1.2[aout]`;

console.log('montando mp4…');
ff([
  '-y',
  '-ss', String(CORTE),
  '-t', String(dur),
  '-i', CRU,
  ...entradasVoz,
  '-f', 'lavfi', '-t', String(dur), '-i', 'sine=frequency=196:sample_rate=48000',
  '-filter_complex',
  `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,` +
    `fade=t=in:st=0:d=0.6,fade=t=out:st=${(dur - 0.8).toFixed(2)}:d=0.8,${filtrosLegenda}[v];` +
    `${cadeiaVoz};${mixVoz}${cadeiaPad}${misturaFinal}`,
  '-map', '[v]',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', 'slow',
  '-crf', '21',
  '-profile:v', 'high',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '160k',
  '-ar', '48000',
  '-movflags', '+faststart',
  SAIDA_MP4,
]);

console.log('montando webm…');
ff([
  '-y',
  '-ss', String(CORTE),
  '-t', String(dur),
  '-i', CRU,
  ...entradasVoz,
  '-f', 'lavfi', '-t', String(dur), '-i', 'sine=frequency=196:sample_rate=48000',
  '-filter_complex',
  `[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,` +
    `fade=t=in:st=0:d=0.6,fade=t=out:st=${(dur - 0.8).toFixed(2)}:d=0.8,${filtrosLegenda}[v];` +
    `${cadeiaVoz};${mixVoz}${cadeiaPad}${misturaFinal}`,
  '-map', '[v]',
  '-map', '[aout]',
  '-c:v', 'libvpx-vp9',
  '-b:v', '0',
  '-crf', '33',
  '-row-mt', '1',
  '-c:a', 'libopus',
  '-b:a', '96k',
  SAIDA_WEBM,
]);

/* ---------------- conferência do resultado ---------------- */
const info = execFileSync('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size',
  '-show_entries', 'stream=codec_name,width,height,duration',
  '-of', 'json',
  SAIDA_MP4,
]).toString();
const j = JSON.parse(info);
const v = j.streams.find((s) => s.width);
const a = j.streams.find((s) => s.codec_name === 'aac');
const volume = execFileSync('ffmpeg', ['-hide_banner', '-i', SAIDA_MP4, '-af', 'volumedetect', '-f', 'null', '-'], {
  stdio: ['ignore', 'pipe', 'pipe'],
}).toString();

const relatorio = {
  mp4: { duracao: Number(j.format.duration), mb: Number((Number(j.format.size) / 1048576).toFixed(1)), video: `${v.width}x${v.height} ${v.codec_name}`, audio: a?.codec_name },
  webm: { mb: Number((fs.statSync(SAIDA_WEBM).size / 1048576).toFixed(1)) },
  narracao: duracaoNarra,
  legendas: LEGENDAS.length,
  passos: passos.passos.length,
};
fs.writeFileSync(path.join(RAIZ, 'relatorio.json'), JSON.stringify(relatorio, null, 2));
console.log(JSON.stringify(relatorio, null, 2));
void volume;
fs.writeFileSync(path.join(RAIZ, 'agenda.json'), JSON.stringify(agenda.map(({ arquivo, inicio, duracao }) => ({ arquivo, inicio, duracao })), null, 2));
