/**
 * RUNTIME VERCEL SIMULADO (desenvolvimento local, sem login)
 * Empacota api/*.ts com esbuild e serve /api/<nome> no mesmo formato da
 * Vercel (req/res Node), e o site estático de dist/. Serve para testar as
 * funções antes de publicar:
 *   node vercel-dev.mjs 3001
 */
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PORTA = Number(process.argv[2] ?? 3001);
const RAIZ = process.cwd();
const handlers = new Map();

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
};

async function carregar(nome) {
  if (handlers.has(nome)) return handlers.get(nome);
  const saida = `.vercel-dev/${nome}.mjs`;
  await build({
    entryPoints: [`api/${nome}.ts`],
    outfile: saida,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'silent',
  });
  const mod = await import(pathToFileURL(join(RAIZ, saida)).href);
  handlers.set(nome, mod.default);
  return mod.default;
}

const lerCorpo = (req) =>
  new Promise((ok) => {
    const partes = [];
    req.on('data', (p) => partes.push(p));
    req.on('end', () => ok(Buffer.concat(partes)));
  });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  const m = url.pathname.match(/^\/api\/([a-z]+)\/?$/);
  if (m) {
    let nome = m[1];
    try {
      await stat(join(RAIZ, `api/${nome}.ts`));
    } catch {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: false, erro: `rota /api/${nome} não existe` }));
      return;
    }
    const corpo = await lerCorpo(req);
    // objetos no formato da Vercel
    const vreq = Object.assign(req, {
      query: Object.fromEntries(url.searchParams),
      cookies: {},
      body: corpo.length ? corpo.toString('utf8') : undefined,
    });
    const vres = Object.assign(res, {
      status(codigo) { res.statusCode = codigo; return vres; },
      json(obj) { res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); return vres; },
      send(dados) { res.end(dados); return vres; },
      redirect(destino) { res.statusCode = 302; res.setHeader('location', destino); res.end(); return vres; },
    });
    try {
      const handler = await carregar(nome);
      await handler(vreq, vres);
    } catch (e) {
      if (!res.headersSent) res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, erro: String(e?.message ?? e) }));
    }
    return;
  }

  // estático (dist/) com queda para index.html (SPA)
  let caminho = join(RAIZ, 'dist', url.pathname === '/' ? 'index.html' : url.pathname);
  try {
    const s = await stat(caminho);
    if (!s.isFile()) throw new Error('não é arquivo');
  } catch {
    caminho = join(RAIZ, 'dist', 'index.html');
  }
  try {
    const dados = await readFile(caminho);
    res.setHeader('content-type', TIPOS[extname(caminho)] ?? 'application/octet-stream');
    res.end(dados);
  } catch {
    res.statusCode = 404;
    res.end('não encontrado');
  }
}).listen(PORTA, '0.0.0.0', () => console.log(`vercel-dev em http://0.0.0.0:${PORTA}`));
