// netlify/functions/proxy.ts
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var LIMITE = 80 * 1024 * 1024;
var proxy_default = async (req) => {
  const alvo = new URL(req.url).searchParams.get("url") ?? "";
  if (!/^https?:\/\//i.test(alvo)) {
    return new Response("par\xE2metro url obrigat\xF3rio", { status: 400 });
  }
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(alvo)) {
    return new Response("endere\xE7o n\xE3o permitido", { status: 400 });
  }
  try {
    const res = await fetch(alvo, {
      headers: { "user-agent": UA, accept: "*/*", referer: new URL(alvo).origin }
    });
    if (!res.ok) return new Response(`origem respondeu ${res.status}`, { status: 502 });
    const tipo = res.headers.get("content-type") ?? "application/octet-stream";
    if (/text\/html/i.test(tipo)) {
      return new Response("o endere\xE7o aponta para uma p\xE1gina, n\xE3o para um arquivo", { status: 415 });
    }
    const tamanho = Number(res.headers.get("content-length") ?? 0);
    if (tamanho > LIMITE) {
      return new Response("arquivo maior que 80 MB", { status: 413 });
    }
    return new Response(res.body, {
      status: 200,
      headers: {
        "content-type": tipo,
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=86400",
        "content-disposition": "inline"
      }
    });
  } catch {
    return new Response("falha ao buscar o arquivo", { status: 502 });
  }
};
export {
  proxy_default as default
};
