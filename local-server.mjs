/**
 * Servidor de preview local (equivalente ao dev-server da Netlify, mas em um
 * arquivo só e sem dependência de esbuild). Serve o build + os assets gerados.
 *
 *   node local-server.mjs [porta]      # padrão 8890
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(raiz, 'dist');
const midia = path.join(raiz, '.cache/midia-preview');
const porta = Number(process.argv[2] ?? 8890);

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

http
  .createServer((req, res) => {
    const u = new URL(req.url ?? '/', `http://localhost:${porta}`);
    let arq = u.pathname === '/' ? '/index.html' : u.pathname;

    // mídia de teste (gerada por gerar-midia.mjs)
    if (arq.startsWith('/midia/')) {
      const alvo = path.join(midia, arq.replace('/midia/', ''));
      if (!alvo.startsWith(midia)) return res.writeHead(403).end();
      return enviar(alvo, res, req);
    }

    const alvo = path.join(dist, arq);
    if (!alvo.startsWith(dist)) return res.writeHead(403).end();
    if (!fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) return enviar(path.join(dist, 'index.html'), res, req);
    enviar(alvo, res, req);
  })
  .listen(porta, '0.0.0.0', () => console.log(`preview local em http://0.0.0.0:${porta}`));

function enviar(alvo, res, req) {
  if (!fs.existsSync(alvo)) return res.writeHead(404).end('não encontrado');
  const ext = path.extname(alvo).toLowerCase();
  const tipo = tipos[ext] ?? 'application/octet-stream';
  const total = fs.statSync(alvo).size;
  // Range — necessário para <video>/<audio> conseguir tocar e buscar
  const range = req.headers.range;
  if (range && (ext === '.mp4' || ext === '.webm' || ext === '.wav' || ext === '.mp3')) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const ini = m && m[1] ? Number(m[1]) : 0;
    const fim = m && m[2] ? Number(m[2]) : total - 1;
    res.writeHead(206, {
      'content-type': tipo,
      'content-range': `bytes ${ini}-${fim}/${total}`,
      'accept-ranges': 'bytes',
      'content-length': fim - ini + 1,
    });
    return fs.createReadStream(alvo, { start: ini, end: fim }).pipe(res);
  }
  res.writeHead(200, { 'content-type': tipo, 'content-length': total, 'accept-ranges': 'bytes' });
  fs.createReadStream(alvo).pipe(res);
}
