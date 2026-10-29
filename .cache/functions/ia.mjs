// netlify/functions/ia.ts
var json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
});
var ia_default = async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST, OPTIONS"
      }
    });
  }
  if (req.method !== "POST") return json(405, { ok: false, erro: "use POST" });
  const chave = process.env.IA_API_KEY ?? "";
  const provedor = (process.env.IA_PROVEDOR ?? "openai").toLowerCase();
  if (!chave) {
    return json(200, {
      ok: false,
      erro: "IA n\xE3o configurada. Na Netlify: Site settings \u2192 Environment variables \u2192 IA_API_KEY. Depois o painel administrativo libera a gera\xE7\xE3o.",
      modo: "desligado"
    });
  }
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, erro: "JSON inv\xE1lido" });
  }
  const prompt = (body.prompt ?? "").trim();
  if (prompt.length < 3) return json(400, { ok: false, erro: "Prompt muito curto" });
  const tipo = body.tipo === "texto" ? "texto" : "imagem";
  const modeloImagem = process.env.IA_MODELO_IMAGEM ?? "gpt-image-1";
  const modeloTexto = process.env.IA_MODELO_TEXTO ?? "gpt-4o-mini";
  const tamanho = body.tamanho === "1024x1792" || body.tamanho === "1792x1024" ? body.tamanho : "1024x1024";
  try {
    if (provedor === "gemini") {
      const modelo = tipo === "texto" ? modeloTexto : process.env.IA_MODELO_IMAGEM ?? "imagen-3.0-generate-002";
      const url = tipo === "texto" ? `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${chave}` : `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:predict?key=${chave}`;
      const corpo = tipo === "texto" ? { contents: [{ parts: [{ text: prompt }] }] } : { instances: [{ prompt }], parameters: { sampleCount: 1 } };
      const res2 = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo)
      });
      const dados = await res2.json();
      if (!res2.ok) return json(200, { ok: false, erro: dados?.error?.message ?? `Gemini ${res2.status}` });
      if (tipo === "texto") {
        const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        return json(200, { ok: true, tipo: "texto", texto });
      }
      const b64 = dados?.predictions?.[0]?.bytesBase64Encoded ?? "";
      return json(200, { ok: true, tipo: "imagem", imagem: b64 ? `data:image/png;base64,${b64}` : "" });
    }
    if (tipo === "texto") {
      const res2 = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: modeloTexto,
          messages: [
            { role: "system", content: "Voc\xEA ajuda a criar roteiros e descri\xE7\xF5es curtas para v\xEDdeos." },
            { role: "user", content: prompt }
          ],
          max_tokens: 600
        })
      });
      const d2 = await res2.json();
      if (!res2.ok) return json(200, { ok: false, erro: d2?.error?.message ?? `OpenAI ${res2.status}` });
      return json(200, { ok: true, tipo: "texto", texto: d2?.choices?.[0]?.message?.content ?? "" });
    }
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
      body: JSON.stringify({ model: modeloImagem, prompt, size: tamanho, n: 1 })
    });
    const d = await res.json();
    if (!res.ok) return json(200, { ok: false, erro: d?.error?.message ?? `OpenAI ${res.status}` });
    const item = d?.data?.[0];
    const imagem = item?.b64_json ? `data:image/png;base64,${item.b64_json}` : item?.url ?? "";
    return json(200, { ok: true, tipo: "imagem", imagem });
  } catch (e) {
    return json(200, { ok: false, erro: `Falha na chamada: ${e.message}` });
  }
};
export {
  ia_default as default
};
