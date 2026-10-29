// netlify/functions/drive.ts
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=3600"
};
var json = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: CORS });
var decodificar = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
var tipoDe = (nome) => {
  const ext = nome.toLowerCase().split(".").pop() ?? "";
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) return "audio";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "svg"].includes(ext)) return "image";
  return "outro";
};
var drive_default = async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const id = new URL(req.url).searchParams.get("pasta") ?? "";
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(id)) return json({ ok: false, erro: "id da pasta inv\xE1lido" }, 400);
  const alvo = `https://drive.google.com/embeddedfolderview?id=${id}#list`;
  try {
    const res = await fetch(alvo, {
      headers: { "user-agent": UA, accept: "text/html", "accept-language": "pt-BR,pt;q=0.9" }
    });
    if (!res.ok) return json({ ok: false, erro: `Drive respondeu ${res.status}` }, 502);
    const html = await res.text();
    const entradas = [];
    const blocos = html.split('class="flip-entry"').slice(1);
    for (const bloco of blocos) {
      const idArq = bloco.match(/id="entry-([a-zA-Z0-9_-]{10,})"/)?.[1];
      const nomeBruto = bloco.match(/flip-entry-title[^>]*>([^<]{1,220})</)?.[1];
      if (!idArq || !nomeBruto) continue;
      const nome = decodificar(nomeBruto).trim();
      const ehPasta = /\/folders\//.test(bloco.slice(0, 900));
      entradas.push({ id: idArq, nome, pasta: ehPasta, tipo: ehPasta ? "outro" : tipoDe(nome) });
    }
    return json({
      ok: true,
      pasta: id,
      total: entradas.length,
      arquivos: entradas.filter((e) => !e.pasta),
      pastas: entradas.filter((e) => e.pasta).map((e) => ({ id: e.id, nome: e.nome }))
    });
  } catch (e) {
    return json({ ok: false, erro: e.message }, 500);
  }
};
export {
  drive_default as default
};
