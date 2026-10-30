/* ==========================================================================
 * FUNÇÃO DE SERVIDOR NA VERCEL — arquivo GERADO automaticamente
 * por scripts/gerar-api-vercel.mjs a partir de netlify/functions/drive|proxy|ferramentas|ia|minerar.ts
 * A lógica é a mesma nos dois hosts (uma lógica só).
 * Não edite à mão: edite a versão da Netlify e rode o gerador.
 * ========================================================================== */

/** a função fala Request → Response; aqui ela é adaptada ao Node da Vercel */
type VercelReq = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  [k: string]: unknown;
};
type VercelRes = {
  statusCode: number;
  status: (codigo: number) => VercelRes;
  setHeader: (nome: string, valor: string) => void;
  end: (corpo?: unknown) => void;
  json: (obj: unknown) => void;
  send: (dados: unknown) => void;
  headersSent?: boolean;
};

const corpoCru = (req: VercelReq): string | undefined => {
  const metodo = (req.method ?? 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo)) return undefined;
  const b = req.body;
  if (b === undefined || b === null) return undefined;
  if (typeof b === 'string') return b;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(b)) return b.toString('utf8');
  return JSON.stringify(b);
};

/** converte o pedido da Vercel em Request padrão e escreve a resposta */
const responder = async (
  req: VercelReq,
  res: VercelRes,
  fn: (r: Request) => Promise<Response>,
): Promise<void> => {
  const h = req.headers ?? {};
  const host = String(h['x-forwarded-host'] ?? h.host ?? 'localhost');
  const proto = String(h['x-forwarded-proto'] ?? 'https');
  const url = String(req.url ?? '/');
  const cabecalhos = new Headers();
  for (const [k, v] of Object.entries(h)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => cabecalhos.append(k, String(x)));
    else cabecalhos.set(k, String(v));
  }
  const init: RequestInit = { method: (req.method ?? 'GET').toUpperCase(), headers: cabecalhos };
  const corpo = corpoCru(req);
  if (corpo !== undefined) init.body = corpo;

  let resposta: Response;
  try {
    resposta = await fn(new Request(proto + '://' + host + url, init));
  } catch (e) {
    res.status(500).json({ ok: false, erro: 'função falhou: ' + (e as Error).message });
    return;
  }
  res.status(resposta.status);
  resposta.headers.forEach((valor, chave) => {
    if (['content-encoding', 'content-length', 'transfer-encoding'].includes(chave)) return;
    res.setHeader(chave, valor);
  });
  res.end(Buffer.from(await resposta.arrayBuffer()));
};

/**
 * GET /.netlify/functions/drive?pasta=ID_DO_DRIVE
 * ------------------------------------------------------------
 * Lê o índice de uma pasta pública do Google Drive (o mesmo HTML
 * que o "visualizar em grade" usa) e devolve JSON limpo.
 *
 * Motivo: o navegador não consegue ler o drive.google.com por CORS.
 * Esta função faz a leitura no servidor, então o editor consegue
 * varrer as pastas do acervo e baixar os arquivos de verdade.
 *
 * Só leitura pública: nenhuma credencial, nada é gravado.
 */

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=3600',
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: CORS });

const decodificar = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

interface Entrada {
  id: string;
  nome: string;
  pasta: boolean;
  tipo: 'video' | 'audio' | 'image' | 'outro';
}

const tipoDe = (nome: string): Entrada['tipo'] => {
  const ext = nome.toLowerCase().split('.').pop() ?? '';
  if (['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'].includes(ext)) return 'image';
  return 'outro';
};

const funcao = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const id = new URL(req.url).searchParams.get('pasta') ?? '';
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(id)) return json({ ok: false, erro: 'id da pasta inválido' }, 400);

  const alvo = `https://drive.google.com/embeddedfolderview?id=${id}#list`;

  try {
    const res = await fetch(alvo, {
      headers: { 'user-agent': UA, accept: 'text/html', 'accept-language': 'pt-BR,pt;q=0.9' },
    });
    if (!res.ok) return json({ ok: false, erro: `Drive respondeu ${res.status}` }, 502);

    const html = await res.text();
    const entradas: Entrada[] = [];

    // cada item vem como <div class="flip-entry" id="entry-ID"> ... <a href="..."> <div class="flip-entry-title">NOME</div>
    const blocos = html.split('class="flip-entry"').slice(1);
    for (const bloco of blocos) {
      const idArq = bloco.match(/id="entry-([a-zA-Z0-9_-]{10,})"/)?.[1];
      const nomeBruto = bloco.match(/flip-entry-title[^>]*>([^<]{1,220})</)?.[1];
      if (!idArq || !nomeBruto) continue;
      const nome = decodificar(nomeBruto).trim();
      const ehPasta = /\/folders\//.test(bloco.slice(0, 900));
      entradas.push({ id: idArq, nome, pasta: ehPasta, tipo: ehPasta ? 'outro' : tipoDe(nome) });
    }

    return json({
      ok: true,
      pasta: id,
      total: entradas.length,
      arquivos: entradas.filter((e) => !e.pasta),
      pastas: entradas.filter((e) => e.pasta).map((e) => ({ id: e.id, nome: e.nome })),
    });
  } catch (e) {
    return json({ ok: false, erro: (e as Error).message }, 500);
  }
};

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  await responder(req, res, funcao);
}
