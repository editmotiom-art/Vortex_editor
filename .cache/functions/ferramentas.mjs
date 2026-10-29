// netlify/functions/ferramentas.ts
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
var CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "POST,OPTIONS"
};
var json = (corpo, status = 200) => new Response(JSON.stringify(corpo), {
  status,
  headers: { ...CORS, "content-type": "application/json; charset=utf-8" }
});
var fatiar = (texto, limite = 190) => {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return [limpo];
  const partes = [];
  let atual = "";
  for (const frase of limpo.split(/(?<=[.!?…;:])\s+/)) {
    if ((atual + " " + frase).trim().length <= limite) {
      atual = (atual + " " + frase).trim();
      continue;
    }
    if (atual) partes.push(atual);
    if (frase.length <= limite) {
      atual = frase;
      continue;
    }
    let pedaco = "";
    for (const palavra of frase.split(" ")) {
      if ((pedaco + " " + palavra).trim().length > limite) {
        partes.push(pedaco.trim());
        pedaco = palavra;
      } else {
        pedaco = (pedaco + " " + palavra).trim();
      }
    }
    atual = pedaco;
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes.filter(Boolean);
};
var googleTts = async (texto, idioma, velocidade) => {
  const pedacos = fatiar(texto);
  const audios = [];
  for (const [i, pedaco] of pedacos.entries()) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(idioma)}&ttsspeed=${velocidade < 0.95 ? "0.9" : "1"}&q=${encodeURIComponent(pedaco)}&total=${pedacos.length}&idx=${i}&textlen=${pedaco.length}`;
    const r = await fetch(url, {
      headers: {
        "user-agent": UA,
        referer: "https://translate.google.com/",
        accept: "audio/mpeg,*/*"
      }
    });
    if (!r.ok) throw new Error(`Google TTS respondeu ${r.status}`);
    const bruto = new Uint8Array(await r.arrayBuffer());
    if (bruto.byteLength < 500) throw new Error("Google TTS devolveu \xE1udio vazio");
    audios.push(bruto);
  }
  const total = audios.reduce((n, a) => n + a.byteLength, 0);
  const saida = new Uint8Array(total);
  let pos = 0;
  for (const a of audios) {
    saida.set(a, pos);
    pos += a.byteLength;
  }
  return saida;
};
var elevenTts = async (texto, voz, chave) => {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz || "21m00Tcm4TlvDq8ikWAM")}`, {
    method: "POST",
    headers: { "xi-api-key": chave, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({
      text: texto,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  });
  if (!r.ok) throw new Error(`ElevenLabs respondeu ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
};
var proprioTts = async (texto, voz, idioma, chave, template) => {
  const url = template.replace("{texto}", encodeURIComponent(texto)).replace("{voz}", encodeURIComponent(voz)).replace("{idioma}", encodeURIComponent(idioma)).replace("{chave}", encodeURIComponent(chave));
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error(`seu endpoint respondeu ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
};
async function acaoVoz(corpo) {
  const texto = String(corpo.texto ?? "").trim();
  if (!texto) return json({ ok: false, erro: "texto vazio" }, 400);
  const idioma = String(corpo.idioma ?? "pt-BR");
  const voz = String(corpo.voz ?? "");
  const velocidade = Number(corpo.velocidade ?? 1) || 1;
  const provedor = String(corpo.provedor ?? "google");
  const chave = String(corpo.chave ?? "");
  const urlTemplate = String(corpo.urlTemplate ?? "");
  try {
    let audio;
    if (provedor === "elevenlabs" && chave) audio = await elevenTts(texto, voz, chave);
    else if (provedor === "proprio" && urlTemplate) audio = await proprioTts(texto, voz, idioma, chave, urlTemplate);
    else audio = await googleTts(texto, idioma, velocidade);
    return new Response(audio, {
      status: 200,
      headers: {
        ...CORS,
        "content-type": "audio/mpeg",
        "content-length": String(audio.byteLength),
        "cache-control": "no-store"
      }
    });
  } catch (e) {
    return json({ ok: false, erro: e.message }, 502);
  }
}
var modelosGratis = ["openai-fast", "openai", "mistral", "llama"];
var REFERRER = "vortex-editor.netlify.app";
async function pollinations(prompt, sistema) {
  let ultimo = "";
  for (const modelo of modelosGratis) {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${modelo}&seed=${Date.now() % 99999}&referrer=${encodeURIComponent(REFERRER)}`;
    try {
      const r = await fetch(url, {
        headers: { "user-agent": UA, accept: "text/plain", referer: `https://${REFERRER}/` },
        signal: AbortSignal.timeout(45e3)
      });
      if (!r.ok) {
        ultimo = `Pollinations ${r.status}`;
        continue;
      }
      let texto = (await r.text()).trim();
      if (!texto || texto.startsWith("{") || texto.length < 40) {
        ultimo = "resposta curta ou JSON (modelo ocupado)";
        continue;
      }
      if (sistema.trim()) {
        const r2 = await fetch(
          `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${modelo}&referrer=${encodeURIComponent(REFERRER)}`,
          {
            headers: { "user-agent": UA, accept: "text/plain", referer: `https://${REFERRER}/` },
            signal: AbortSignal.timeout(45e3)
          }
        );
        if (r2.ok) {
          const t2 = (await r2.text()).trim();
          if (t2.length > 40) texto = t2;
        }
      }
      return texto;
    } catch (e) {
      ultimo = e.message;
    }
  }
  throw new Error(ultimo || "motor gratuito n\xE3o respondeu");
}
var apiCompativel = async (corpo, prompt, sistema) => {
  const chave = String(corpo.chave ?? "");
  const base = String(corpo.baseUrl ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const modelo = String(corpo.modelo ?? "gpt-4o-mini");
  if (!chave) throw new Error("sem chave no painel");
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      temperature: 0.8,
      messages: [
        ...sistema ? [{ role: "system", content: sistema }] : [],
        { role: "user", content: prompt }
      ]
    }),
    signal: AbortSignal.timeout(6e4)
  });
  if (!r.ok) throw new Error(`sua API respondeu ${r.status}`);
  const dados = await r.json();
  const texto = dados.choices?.[0]?.message?.content?.trim() ?? "";
  if (!texto) throw new Error("sua API devolveu vazio");
  return texto;
};
async function acaoTexto(corpo) {
  const prompt = String(corpo.prompt ?? "").trim();
  const sistema = String(corpo.sistema ?? "").trim();
  if (!prompt) return json({ ok: false, erro: "prompt vazio" }, 400);
  try {
    const texto = await apiCompativel(corpo, prompt, sistema);
    return json({ ok: true, texto, fonte: "api" });
  } catch (eApi) {
    try {
      const texto = await pollinations(prompt, sistema);
      return json({ ok: true, texto, fonte: "pollinations" });
    } catch (e) {
      return json(
        { ok: false, erro: `API do painel: ${eApi.message} \xB7 motor gratuito: ${e.message}` },
        502
      );
    }
  }
}
var textoDeZip = async (buffer) => {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 66e3); i -= 1) {
    if (view.getUint32(i, true) === 101010256) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const total = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  for (let n = 0; n < total; n += 1) {
    if (view.getUint32(p, true) !== 33639248) break;
    const metodo = view.getUint16(p + 10, true);
    const comprimido = view.getUint32(p + 20, true);
    const tamNome = view.getUint16(p + 28, true);
    const tamExtra = view.getUint16(p + 30, true);
    const tamComent = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(buffer.subarray(p + 46, p + 46 + tamNome));
    p += 46 + tamNome + tamExtra + tamComent;
    if (!/skill\.md$/i.test(nome) && !/\.md$/i.test(nome)) continue;
    const nOff = view.getUint16(local + 26, true);
    const eOff = view.getUint16(local + 28, true);
    const inicio = local + 30 + nOff + eOff;
    const dados = buffer.subarray(inicio, inicio + comprimido);
    let texto = "";
    if (metodo === 0) {
      texto = new TextDecoder().decode(dados);
    } else if (metodo === 8) {
      const ds = new DecompressionStream("deflate-raw");
      const des = new Response(dados.slice().buffer).body.pipeThrough(ds);
      texto = await new Response(des).text();
    } else {
      continue;
    }
    return { nome, texto };
  }
  return null;
};
async function acaoSkill(corpo) {
  const url = String(corpo.url ?? "").trim();
  if (!/^https?:\/\/.+/i.test(url)) return json({ ok: false, erro: "link inv\xE1lido" }, 400);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(45e3) });
    if (!r.ok) return json({ ok: false, erro: `o site respondeu ${r.status}` }, 502);
    const tipo = r.headers.get("content-type") ?? "";
    const nome = decodeURIComponent(url.split("/").pop() ?? "skill");
    if (/zip|octet-stream/i.test(tipo) || /\.zip$/i.test(url)) {
      const zip = new Uint8Array(await r.arrayBuffer());
      if (zip.byteLength > 12e6) return json({ ok: false, erro: "pacote grande demais (12 MB)" }, 413);
      const lido = await textoDeZip(zip);
      if (!lido) return json({ ok: false, erro: "o zip n\xE3o tem SKILL.md" }, 422);
      return json({
        ok: true,
        nome: lido.nome.split("/").pop() ?? nome,
        arquivos: [{ nome: lido.nome, texto: lido.texto.slice(0, 24e3) }]
      });
    }
    const texto = (await r.text()).slice(0, 24e3);
    if (texto.length < 40) return json({ ok: false, erro: "o arquivo veio vazio" }, 422);
    return json({ ok: true, nome, arquivos: [{ nome, texto }] });
  } catch (e) {
    return json({ ok: false, erro: e.message }, 502);
  }
}
var ferramentas_default = async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ ok: false, erro: "use POST" }, 405);
  let corpo = {};
  try {
    corpo = await req.json();
  } catch {
    return json({ ok: false, erro: "corpo inv\xE1lido" }, 400);
  }
  const acao = String(corpo.acao ?? "");
  if (acao === "voz") return acaoVoz(corpo);
  if (acao === "texto") return acaoTexto(corpo);
  if (acao === "skill") return acaoSkill(corpo);
  return json({ ok: false, erro: "a\xE7\xE3o desconhecida (use voz, texto ou skill)" }, 400);
};
export {
  ferramentas_default as default
};
