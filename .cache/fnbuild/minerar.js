"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/minerar.ts
var minerar_exports = {};
__export(minerar_exports, {
  default: () => minerar_default
});
module.exports = __toCommonJS(minerar_exports);

// netlify/lib/minerar.ts
var VIDEO_EXT = /\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i;
var AUDIO_EXT = /\.(mp3|wav|m4a|ogg|oga|opus|flac|aac)(\?|#|$)/i;
var IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;
function abs(src, base) {
  try {
    return new URL(src, base).href;
  } catch {
    return "";
  }
}
function tipoDe(src, hint = "") {
  const u = src.toLowerCase().split("?")[0];
  if (VIDEO_EXT.test(u) || hint === "video") return "video";
  if (AUDIO_EXT.test(u) || hint === "audio") return "audio";
  return "image";
}
function lixo(url) {
  return /(^|[/_.-])(spacer|pixel|tracking|beacon|1x1|blank|transparent)([/_.-]|$)/i.test(url) || /(sprite|favicon|logo|avatar|emoji|icon-?\d|placeholder|loading|spinner|badge)/i.test(url) || /\.svg(\?|#|$)/i.test(url) || /doubleclick|googletagmanager|facebook\.com\/tr|analytics/i.test(url);
}
var attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"));
  return m ? m[1] : "";
};
var metaTag = (html, prop) => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]*>`,
    "i"
  );
  const m = html.match(re);
  if (!m) return "";
  return attr(m[0], "content");
};
function minerar(html, base) {
  const out = [];
  const vistos = /* @__PURE__ */ new Set();
  const push = (raw, type, w = 0, h = 0, label = "") => {
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return;
    const url = abs(raw, base);
    if (!url || !/^https?:/i.test(url) || lixo(url)) return;
    if (url.replace(/\/$/, "") === base.replace(/\/$/, "")) return;
    if (type === "image" && !IMAGE_EXT.test(url.split("?")[0]) && !w && !h && !label) return;
    if (vistos.has(url)) return;
    vistos.add(url);
    out.push({ url, type, w, h, label });
  };
  for (const [prop, type] of [
    ["og:video:secure_url", "video"],
    ["og:video", "video"],
    ["og:audio", "audio"],
    ["og:image", "image"],
    ["twitter:player:stream", "video"],
    ["twitter:image", "image"]
  ]) {
    const v = metaTag(html, prop);
    if (v) push(v, type, 0, 0, prop);
  }
  const ld = html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ld) {
    try {
      const visit = (o) => {
        if (!o || typeof o !== "object") return;
        const tp = String(o["@type"] || "").toLowerCase();
        const midia = o.contentUrl || o.thumbnailUrl || (typeof o.image === "string" ? "" : o.embedUrl);
        if (midia) {
          const raw = midia;
          const type = /video/.test(tp) ? "video" : /audio/.test(tp) ? "audio" : "image";
          push(raw, type, Number(o.width) || 0, Number(o.height) || 0, o.name || "");
        }
        if (Array.isArray(o.image)) o.image.forEach((i) => push(typeof i === "string" ? i : i?.url, "image"));
        else if (typeof o.image === "string") push(o.image, "image");
        Object.values(o).forEach((v) => Array.isArray(v) ? v.forEach(visit) : visit(v));
      };
      visit(JSON.parse(m[1]));
    } catch {
    }
  }
  for (const tag of html.matchAll(/<video\b[^>]*>[\s\S]*?<\/video>/gi)) {
    const bloco = tag[0];
    const poster = attr(bloco, "poster");
    if (poster) push(poster, "image", 0, 0, "capa do v\xEDdeo");
    for (const s of bloco.matchAll(/<(?:source|video)\b[^>]*>/gi)) {
      const src = attr(s[0], "src") || attr(s[0], "data-src");
      if (src && !/\.m3u8(\?|#|$)/i.test(src)) push(src, "video");
    }
  }
  for (const tag of html.matchAll(/<audio\b[^>]*>[\s\S]*?<\/audio>/gi)) {
    for (const s of tag[0].matchAll(/<(?:source|audio)\b[^>]*>/gi)) {
      const src = attr(s[0], "src") || attr(s[0], "data-src");
      if (src) push(src, "audio");
    }
  }
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const t = tag[0];
    const src = attr(t, "src") || attr(t, "data-src") || attr(t, "data-original") || attr(t, "data-lazy-src") || "";
    const srcset = attr(t, "srcset") || attr(t, "data-srcset");
    const w = parseInt(attr(t, "width"), 10) || 0;
    const h = parseInt(attr(t, "height"), 10) || 0;
    const alt = attr(t, "alt");
    if (src) push(src, "image", w, h, alt);
    if (srcset) {
      const candidatos = srcset.split(",").map((c) => c.trim().split(/\s+/)).map(([u, d]) => ({ u, n: parseInt(d || "0", 10) || 0 })).sort((a, b) => b.n - a.n);
      if (candidatos[0]?.u) push(candidatos[0].u, "image", 0, 0, alt);
    }
  }
  for (const m of html.matchAll(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/gi)) {
    push(m[1], "image", 0, 0, "fundo");
  }
  for (const m of html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:mp4|webm|mp3|wav|m4a|jpe?g|png|webp)(?:\?[^\s"'<>]*)?/gi)) {
    push(m[0], tipoDe(m[0]));
  }
  const peso = (i) => {
    const area = i.w && i.h ? i.w * i.h : 0;
    const tipo = i.type === "video" ? 3 : i.type === "audio" ? 2.5 : 1;
    return tipo * 1e7 + area;
  };
  return out.sort((a, b) => peso(b) - peso(a)).slice(0, 80);
}

// netlify/functions/minerar.ts
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
var json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" }
});
var minerar_default = async (req) => {
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
  let url = "";
  try {
    const body = await req.json();
    url = String(body?.url ?? "").trim();
  } catch {
    return json(400, { ok: false, erro: "JSON inv\xE1lido" });
  }
  if (!/^https?:\/\//i.test(url)) return json(400, { ok: false, erro: "Endere\xE7o inv\xE1lido" });
  if (/^https?:\/\/(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(url)) {
    return json(400, { ok: false, erro: "Endere\xE7o n\xE3o permitido" });
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12e3);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8"
      }
    });
    clearTimeout(t);
    if (!res.ok) {
      return json(200, {
        ok: false,
        erro: res.status === 403 || res.status === 401 ? "O site bloqueou a leitura autom\xE1tica (403). Copie o link direto do arquivo, ou use o bot\xE3o \u201CAbrir site\u201D e arraste a m\xEDdia para o editor." : `O site respondeu ${res.status}.`,
        itens: []
      });
    }
    const html = (await res.text()).slice(0, 4e6);
    const base = res.url || abs(url, url);
    const itens = minerar(html, base);
    const site = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)?.[1] ?? "";
    const titulo = html.match(/<title[^>]*>([^<]{1,140})</i)?.[1]?.trim() ?? "";
    return json(200, { ok: true, pagina: base, site, titulo, total: itens.length, itens });
  } catch (e) {
    const msg = e.name === "AbortError" ? "O site demorou demais para responder." : "N\xE3o foi poss\xEDvel abrir essa p\xE1gina.";
    return json(200, { ok: false, erro: msg, itens: [] });
  }
};
