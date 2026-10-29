(async function () {
  var $ = function (i) { return document.getElementById(i); };
  var cfg = await BT.config();
  var tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0] || {};
  var coletados = [];

  $('qualidade').value = cfg.qualidade;

  function msg(el, tipo, t) {
    var e = $(el);
    e.className = 'status ' + tipo;
    e.textContent = t;
  }

  function aviso(t) {
    var a = $('aviso');
    if (!t) { a.style.display = 'none'; return; }
    a.style.display = 'block';
    a.textContent = t;
  }

  function trocarTab(qual) {
    $('tab-pagina').classList.toggle('on', qual === 'pagina');
    $('tab-link').classList.toggle('on', qual === 'link');
    $('painel-pagina').hidden = qual !== 'pagina';
    $('painel-link').hidden = qual !== 'link';
  }
  $('tab-pagina').onclick = function () { trocarTab('pagina'); };
  $('tab-link').onclick = function () { trocarTab('link'); };

  $('opcoes').onclick = function (e) { e.preventDefault(); chrome.runtime.openOptionsPage(); };
  $('abrir-editor').onclick = function (e) {
    e.preventDefault();
    chrome.tabs.create({ url: cfg.editorUrl || 'http://localhost:5173' });
  };

  /* ---------------- render dos cards ---------------- */
  function render(itens, alvo) {
    var g = $(alvo);
    g.innerHTML = '';
    if (!itens.length) {
      g.innerHTML = '<p class="nada" style="grid-column:1/-1">Nenhuma mídia encontrada nesta página.</p>';
      return;
    }
    itens.forEach(function (it, i) {
      var d = document.createElement('div');
      d.className = 'card-m';

      if (it.type === 'image') {
        var im = document.createElement('img');
        im.src = it.url;
        im.loading = 'lazy';
        im.onerror = function () { im.style.opacity = '.2'; };
        d.appendChild(im);
      } else {
        var v = document.createElement('video');
        v.src = it.url;
        v.muted = true;
        v.preload = 'metadata';
        v.onerror = function () { v.style.opacity = '.2'; };
        d.appendChild(v);
      }

      var nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = (it.label || it.type) + ' · ' + it.type + (it.w ? ' ' + it.w + '×' + it.h : '');
      nm.title = it.url;
      d.appendChild(nm);

      var b1 = document.createElement('button');
      b1.textContent = '⬇ Baixar';
      b1.onclick = function () {
        var nome = BT.limparNome((tab.title || 'midia')) + ' ' + (i + 1) + '.' + BT.extDe('', it.url);
        BT.baixar(it.url, nome).then(function () {
          b1.textContent = '✓ Baixando';
        }).catch(function (e) {
          b1.textContent = '⚠ falhou';
          aviso('Download bloqueado pelo site (CORS/DRM). Tente abrir o arquivo em nova aba: ' + e.message);
        });
      };
      d.appendChild(b1);

      var b2 = document.createElement('button');
      b2.className = 'sec';
      b2.textContent = '→ Editor';
      b2.onclick = function () { enviarAoEditor([it], b2); };
      d.appendChild(b2);

      g.appendChild(d);
    });

    var todos = document.createElement('div');
    todos.style.gridColumn = '1/-1';
    todos.style.display = 'flex';
    todos.style.gap = '6px';
    var bt = document.createElement('button');
    bt.className = 'btn';
    bt.textContent = '⬇ Baixar todas (' + itens.length + ')';
    bt.onclick = function () {
      itens.forEach(function (it, i) {
        var nome = BT.limparNome((tab.title || 'midia')) + ' ' + (i + 1) + '.' + BT.extDe('', it.url);
        BT.baixar(it.url, nome).catch(function () {});
      });
      bt.textContent = '✓ Iniciados';
    };
    todos.appendChild(bt);
    var be = document.createElement('button');
    be.className = 'btn';
    be.style.background = 'rgba(255,255,255,.12)';
    be.textContent = '→ Todas ao editor';
    be.onclick = function () { enviarAoEditor(itens, be); };
    todos.appendChild(be);
    g.appendChild(todos);
  }

  /* ---------------- enviar ao editor ---------------- */
  function enviarAoEditor(itens, btEl) {
    var base = (cfg.editorUrl || '').replace(/\/+$/, '');
    var lista = itens.map(function (i) {
      return { url: i.url, type: i.type, name: i.label || '', width: i.w, height: i.h };
    });
    // 1) tenta o canal direto (a página do editor escuta)
    chrome.runtime.sendMessage({ tipo: 'enviar-editor', items: lista }, function (r) {
      if (r && r.ok) {
        if (btEl) btEl.textContent = '✓ Enviado';
        return;
      }
      // 2) fallback: entrega pelo clipboard + abre o editor
      var payload = JSON.stringify(lista);
      navigator.clipboard && navigator.clipboard.writeText(payload).catch(function () {});
      chrome.tabs.create({ url: base + '/?import=' + encodeURIComponent(payload).slice(0, 1800) });
      if (btEl) btEl.textContent = '✓ No editor';
    });
  }

  /* ---------------- capturar da página ---------------- */
  async function capturar() {
    msg('st1', 'carregando', '⏳ Procurando mídias…');
    aviso('');
    try {
      var itens = await BT.coletarDaAba(tab.id);
      coletados = itens.slice(0, 60);
      if (!coletados.length) {
        msg('st1', 'erro', 'Nada encontrado. Sites com DRM (YouTube/TikTok/IG) precisam do motor — veja "Colar link".');
        render([], 'grid');
        return;
      }
      msg('st1', 'ok', coletados.length + ' mídia(s) encontrada(s)');
      render(coletados, 'grid');
    } catch (e) {
      msg('st1', 'erro', '⚠ ' + e.message);
    }
  }
  $('capturar').onclick = capturar;

  /* ---------------- baixar pelo motor ---------------- */
  $('baixar').onclick = async function () {
    var link = $('url').value.trim();
    $('grid2').innerHTML = '';
    if (!/^https?:\/\//i.test(link)) { msg('st2', 'erro', 'Coloque um link começando com http:// ou https://'); return; }
    var q = $('qualidade').value;
    var audio = q === 'audio';
    chrome.storage.sync.set({ qualidade: q });
    $('baixar').disabled = true;
    msg('st2', 'carregando', '⏳ Consultando o motor…');
    try {
      var d = await BT.pedir(link, { audio: audio, qualidade: q });
      if (d.status === 'tunnel' || d.status === 'redirect') {
        await BT.baixar(d.url, BT.nomeDe(d, tab.title, null, audio ? 'audio' : 'video'));
        msg('st2', 'ok', '✅ Pronto! O download começou.');
      } else if (d.status === 'picker' || d.status === 'local-processing') {
        var itens = d.status === 'picker' ? (d.picker || []) : (d.tunnel || []).map(function (u) { return { url: u, type: 'video' }; });
        if (d.audio) itens.push({ url: d.audio, type: 'audio' });
        msg('st2', 'ok', 'Achei ' + itens.length + ' item(ns). Escolha o que baixar:');
        render(itens, 'grid2');
      } else msg('st2', 'erro', 'Resposta desconhecida: ' + d.status);
    } catch (e) {
      msg('st2', 'erro', '⚠ ' + e.message);
      aviso('Dica: para sites sem DRM (a maioria), use a aba "Nesta página" — funciona sem servidor nenhum.');
    }
    $('baixar').disabled = false;
  };

  /* ---------------- estado inicial ---------------- */
  var det = tab.url ? BT.detectar(tab.url) : null;
  if (det) {
    $('url').value = det.url;
  }

  if (!cfg.servidor) {
    aviso('Motor de download não configurado. A captura direta da página funciona em sites comuns; para YouTube/TikTok/Instagram configure um servidor em Opções.');
  }

  // se veio do menu de contexto "capturar todas"
  var qs = new URLSearchParams(location.search);
  if (qs.get('capturar')) {
    capturar();
  } else {
    // captura automática leve ao abrir
    setTimeout(capturar, 120);
  }
})();
