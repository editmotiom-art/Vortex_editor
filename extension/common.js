// ============================================================
//  VORTEX MÍDIA — núcleo compartilhado
//  Resolve mídia por 3 caminhos, nesta ordem:
//    1. DIRETO   → <img>/<video>/<source> da própria página (sem servidor)
//    2. EMBUTIDO → og:video / og:image / JSON-LD (sem servidor)
//    3. MOTOR    → API configurável (para YouTube/TikTok/IG — precisa de backend)
//  Sempre que possível evitamos o item 3: é o que o torna independente.
// ============================================================
var BT = (function () {
  var PADRAO = {
    servidor: '',            // vazio = motor desligado (usa só captura direta)
    qualidade: '1080',
    botaoYoutube: true,
    semMarca: true,
    editorUrl: 'http://localhost:5173'
  };

  function config() { return chrome.storage.sync.get(PADRAO); }

  /* ---------------- detecção de site ---------------- */
  var SITES = [
    [/(^|\.)youtube\.com$/, function (u) { return /^\/(watch|shorts\/|live\/)/.test(u.pathname) && (u.searchParams.get('v') || /^\/(shorts|live)\/[\w-]+/.test(u.pathname)); }, 'YouTube'],
    [/^youtu\.be$/, function (u) { return u.pathname.length > 1; }, 'YouTube'],
    [/(^|\.)(x|twitter)\.com$/, function (u) { return /\/status\/\d+/.test(u.pathname); }, 'X'],
    [/(^|\.)instagram\.com$/, function (u) { return /^\/(reels?|p|tv|stories)\//.test(u.pathname); }, 'Instagram'],
    [/(^|\.)tiktok\.com$/, function (u) { return /\/video\/\d+|\/photo\/\d+/.test(u.pathname) || /^v[mt]\./.test(u.hostname); }, 'TikTok'],
    [/(^|\.)(facebook\.com|fb\.watch)$/, function (u) { return /\/(videos?|reel|watch|share)/.test(u.pathname) || u.hostname === 'fb.watch'; }, 'Facebook'],
    [/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/, function (u) { return /\/pin\//.test(u.pathname) || u.hostname === 'pin.it'; }, 'Pinterest'],
    [/(^|\.)(reddit\.com|redd\.it)$/, function (u) { return /\/comments\/|\/s\//.test(u.pathname) || u.hostname.endsWith('redd.it'); }, 'Reddit'],
    [/(^|\.)vimeo\.com$/, function (u) { return /\/\d+/.test(u.pathname); }, 'Vimeo'],
    [/(^|\.)(twitch\.tv)$/, function (u) { return /\/clip\/|clips\./.test(u.href); }, 'Twitch'],
    [/(^|\.)soundcloud\.com$/, function (u) { return u.pathname.split('/').length >= 3; }, 'SoundCloud'],
    [/(^|\.)(bsky\.app)$/, function (u) { return /\/post\//.test(u.pathname); }, 'Bluesky'],
    [/(^|\.)(dailymotion\.com|dai\.ly)$/, function (u) { return /\/video\//.test(u.pathname) || u.hostname === 'dai.ly'; }, 'Dailymotion'],
    [/(^|\.)(streamable\.com|tumblr\.com|vk\.com|ok\.ru|rutube\.ru|loom\.com|bilibili\.com|snapchat\.com)$/, function () { return true; }, 'Vídeo']
  ];

  function detectar(href) {
    try { var u = new URL(href); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    var h = u.hostname.replace(/^(www|m|mobile)\./, '');
    for (var i = 0; i < SITES.length; i++) {
      if (SITES[i][0].test(h) && SITES[i][1](u)) return { url: href, site: SITES[i][2] };
    }
    return null;
  }

  /* sites que só funcionam com motor (DRM / segmentação) */
  var PRECISA_MOTOR = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'X'];

  /* ---------------- nomes e downloads ---------------- */
  function limparNome(n) {
    return (n || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
  }

  function extDe(mime, url) {
    mime = (mime || '').toLowerCase();
    if (mime.indexOf('video/mp4') === 0) return 'mp4';
    if (mime.indexOf('video/webm') === 0) return 'webm';
    if (mime.indexOf('audio/mpeg') === 0) return 'mp3';
    if (mime.indexOf('audio/wav') === 0) return 'wav';
    if (mime.indexOf('image/png') === 0) return 'png';
    if (mime.indexOf('image/webp') === 0) return 'webp';
    if (mime.indexOf('image/gif') === 0) return 'gif';
    if (mime.indexOf('image/jpeg') === 0) return 'jpg';
    var m = /\.(mp4|webm|mp3|wav|png|jpe?g|webp|gif)(\?|$)/i.exec(url || '');
    return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'mp4';
  }

  function nomeDe(d, base, i, tipo) {
    if (d && d.filename && i == null) return limparNome(d.filename);
    var ext = tipo === 'photo' ? 'jpg' : tipo === 'gif' ? 'gif' : tipo === 'audio' ? 'mp3' : 'mp4';
    return limparNome((base || 'vortex-midia') + (i != null ? ' (' + (i + 1) + ')' : '')) + '.' + ext;
  }

  function baixar(url, nome) {
    return chrome.downloads.download({
      url: url,
      filename: nome ? 'Vortex Midia/' + nome : undefined,
      conflictAction: 'uniquify',
      saveAs: false
    });
  }

  /* ---------------- captura DIRETA (sem servidor) ---------------- */
  // injeta um coletor na aba e devolve a lista de mídias encontradas no DOM
  function coletarDaAba(tabId) {
    return chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: coletarNaPagina
    }).then(function (results) {
      var out = [];
      var vistos = {};
      (results || []).forEach(function (r) {
        (r.result || []).forEach(function (it) {
          var k = it.url.split('#')[0];
          if (!vistos[k]) { vistos[k] = 1; out.push(it); }
        });
      });
      // prioriza vídeos grandes, depois áudio, depois imagens
      var peso = { video: 0, audio: 1, image: 2 };
      out.sort(function (a, b) {
        return (peso[a.type] - peso[b.type]) || ((b.area || 0) - (a.area || 0));
      });
      return out;
    }).catch(function () { return []; });
  }

  // função serializada — roda DENTRO da página
  function coletarNaPagina() {
    var found = [];
    var push = function (url, type, w, h, label) {
      if (!url || !/^https?:|^blob:|^data:/.test(url)) return;
      found.push({ url: url, type: type, w: w || 0, h: h || 0, area: (w || 0) * (h || 0), label: label || '' });
    };
    // <video>
    document.querySelectorAll('video').forEach(function (v) {
      var src = v.currentSrc || v.src;
      if (src) push(src, 'video', v.videoWidth, v.videoHeight, v.title || '');
      v.querySelectorAll('source').forEach(function (s) { push(s.src, 'video', v.videoWidth, v.videoHeight); });
    });
    // <audio>
    document.querySelectorAll('audio').forEach(function (a) {
      var src = a.currentSrc || a.src;
      if (src) push(src, 'audio', 0, 0, a.title || '');
      a.querySelectorAll('source').forEach(function (s) { push(s.src, 'audio', 0, 0); });
    });
    // <img> (só as grandes: evita ícones e pixels de tracking)
    document.querySelectorAll('img').forEach(function (i) {
      var src = i.currentSrc || i.src;
      var w = i.naturalWidth || i.width, h = i.naturalHeight || i.height;
      if (src && w >= 200 && h >= 200) push(src, 'image', w, h, i.alt || '');
    });
    // metatags OpenGraph / Twitter
    var meta = function (prop) {
      var el = document.querySelector('meta[property="' + prop + '"],meta[name="' + prop + '"]');
      return el ? el.content : null;
    };
    var ogv = meta('og:video') || meta('og:video:url') || meta('og:video:secure_url') || meta('twitter:player:stream');
    if (ogv) push(ogv, 'video', 0, 0, 'og:video');
    var oga = meta('og:audio') || meta('og:audio:url') || meta('twitter:player:stream:content_type');
    if (oga && /^https?:/.test(oga)) push(oga, 'audio', 0, 0, 'og:audio');
    var ogi = meta('og:image') || meta('og:image:secure_url') || meta('twitter:image');
    if (ogi) push(ogi, 'image', 0, 0, 'og:image');
    // JSON-LD
    try {
      document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
        var data;
        try { data = JSON.parse(s.textContent); } catch (e) { return; }
        var walk = function (o) {
          if (!o || typeof o !== 'object') return;
          if (o.contentUrl) {
            var tp = String(o['@type'] || '').toLowerCase();
            var t = /video/.test(tp) ? 'video' : /audio/.test(tp) ? 'audio' : 'image';
            push(o.contentUrl, t, o.width, o.height, o.name || '');
          }
          Object.keys(o).forEach(function (k) { if (typeof o[k] === 'object') walk(o[k]); });
        };
        walk(data);
      });
    } catch (e) {}
    // background-image de hero/banners grandes
    try {
      document.querySelectorAll('header *,section *,main *,div[class*=hero]').forEach(function (el) {
        var bg = getComputedStyle(el).backgroundImage;
        if (!bg || bg === 'none') return;
        var m = /url\(["']?(.*?)["']?\)/.exec(bg);
        if (m && el.clientWidth >= 400) push(m[1], 'image', el.clientWidth, el.clientHeight, 'background');
      });
    } catch (e) {}
    return found;
  }

  /* ---------------- MOTOR (opcional) ---------------- */
  var ERROS = {
    'error.api.link.invalid': 'Esse link não parece válido.',
    'error.api.link.unsupported': 'Esse site não é aceito pelo motor.',
    'error.api.service.unsupported': 'Esse site não é aceito pelo motor.',
    'error.api.service.disabled': 'Esse site está desligado no motor.',
    'error.api.fetch.empty': 'Não achei nada para baixar nesse link. Ele é público?',
    'error.api.fetch.fail': 'O site não deixou o motor pegar esse arquivo.',
    'error.api.content.video.private': 'Esse vídeo é privado.',
    'error.api.content.video.age': 'Esse vídeo tem trava de idade.',
    'error.api.content.video.live': 'Não dá para baixar transmissão ao vivo.',
    'error.api.rate_exceeded': 'Muitos pedidos seguidos. Espere um minuto.'
  };

  function erroAmigavel(c) {
    c = c || '';
    if (ERROS[c]) return ERROS[c];
    if (c.indexOf('youtube') >= 0) return 'O YouTube bloqueou este vídeo. Tente de novo mais tarde.';
    if (c.indexOf('auth') >= 0) return 'O motor recusou o acesso. Confira a chave em Opções.';
    return 'Algo deu errado (' + (c || 'sem código') + ').';
  }

  async function pedir(link, opc) {
    var cfg = await config();
    if (!cfg.servidor) {
      throw new Error('Motor não configurado. Abra as Opções da extensão e informe o servidor, ou use "Capturar da página" para sites sem DRM.');
    }
    var corpo = { url: link, downloadMode: opc.audio ? 'audio' : 'auto', filenameStyle: 'pretty' };
    if (opc.audio) corpo.audioFormat = 'mp3';
    else corpo.videoQuality = opc.qualidade || cfg.qualidade;

    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 60000);
    var r, d;
    try {
      r = await fetch(cfg.servidor.replace(/\/+$/, '') + '/api/', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo)
      });
      d = await r.json();
    } catch (e) {
      throw new Error('O servidor do motor não respondeu. Ele pode estar fora do ar — use "Capturar da página" enquanto isso.');
    } finally { clearTimeout(t); }

    if (!d || !d.status) throw new Error('Resposta estranha do motor.');
    if (d.status === 'error') throw new Error(erroAmigavel(d.error && d.error.code));
    return d;
  }

  return {
    PADRAO: PADRAO,
    PRECISA_MOTOR: PRECISA_MOTOR,
    config: config,
    detectar: detectar,
    pedir: pedir,
    coletarDaAba: coletarDaAba,
    coletarNaPagina: coletarNaPagina,
    nomeDe: nomeDe,
    limparNome: limparNome,
    extDe: extDe,
    baixar: baixar,
    erroAmigavel: erroAmigavel
  };
})();
