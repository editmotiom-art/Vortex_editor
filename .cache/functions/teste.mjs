// netlify/functions/teste.ts
var teste_default = async (req) => {
  const h = {};
  req.headers.forEach((v, k) => {
    if (/origin|referer|host|x-forwarded|user-agent|accept/i.test(k)) h[k] = v;
  });
  return new Response(JSON.stringify({ ok: true, url: req.url, headers: h }, null, 1), {
    headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
  });
};
export {
  teste_default as default
};
