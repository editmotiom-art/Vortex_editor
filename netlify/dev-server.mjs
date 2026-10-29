/**
 * Servidor local que imita a Netlify:
 *  - serve o build (dist)
 *  - executa as funções de netlify/functions
 *
 *   node netlify/dev-server.mjs [porta]
 *
 * Usado só para desenvolvimento/preview. Em produção quem faz isso é a Netlify.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const porta = Number(process.argv[2] ?? 8888);
const dirFuncoes = path.join(raiz, 'netlify/functions');
const tmp = path.join(raiz, '.cache/functions');
fs.mkdirSync(tmp, { recursive: true });

/* ---------- compila as funções TS → JS ---------- */
const funcoes = new Map();
for (const arq of fs.readdirSync(dirFuncoes).filter((f) => f.endsWith('.ts'))) {
  const saida = path.join(tmp, arq.replace(/\.ts$/, '.mjs'));
  await esbuild.build({
    entryPoints: [path.join(dirFuncoes, arq)],
    outfile: saida,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    external: ['node:*'],
    logLevel: 'error',
  });
  const mod = await import(pathToFileURL(saida).href + `?t=${Date.now()}`);
  funcoes.set(arq.replace(/\.ts$/, ''), mod.default);
  console.log(`  função  ✓ ${arq.replace(/\.ts$/, '')}`);
}

/* ---------- tipos de arquivo estático ---------- */
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const dist = path.join(raiz, 'dist');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${porta}`);

  /* ---- funções ---- */
  const mFunc = url.pathname.match(/^\/\.netlify\/functions\/([a-z0-9-]+)$/i);
  if (mFunc) {
    const fn = funcoes.get(mFunc[1]);
    if (!fn) {
      res.writeHead(404, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, erro: 'função não existe' }));
    }
    try {
      const reqWeb = new Request(url.href, {
        method: req.method,
        headers: req.headers,
        body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : req,
        duplex: 'half',
      });
      const out = await fn(reqWeb);
      const headers = Object.fromEntries(out.headers.entries());
      res.writeHead(out.status, headers);
      res.end(Buffer.from(await out.arrayBuffer()));
    } catch (e) {
      console.error(e);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, erro: String(e) }));
    }
    return;
  }

  /* ---- estáticos (SPA fallback) ---- */
  let alvo = path.join(dist, decodeURIComponent(url.pathname));
  if (!alvo.startsWith(dist) || !fs.existsSync(alvo) || fs.statSync(alvo).isDirectory()) {
    alvo = path.join(dist, 'index.html');
  }
  if (!fs.existsSync(alvo)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Build não encontrado. Rode: npm run build');
  }
  res.writeHead(200, {
    'content-type': tipos[path.extname(alvo)] ?? 'application/octet-stream',
    'cache-control': alvo.endsWith('index.html') ? 'no-cache' : 'public, max-age=60',
  });
  fs.createReadStream(alvo).pipe(res);
});

server.listen(porta, '0.0.0.0', () => {
  console.log(`\n  VORTEX (local)  →  http://0.0.0.0:${porta}\n`);
});
