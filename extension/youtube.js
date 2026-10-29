// Botão flutuante nas páginas de vídeo do YouTube (pode desligar nas opções)
(function () {
  var btn = null;

  function ehVideo() {
    return /^\/(watch|shorts\/)/.test(location.pathname);
  }

  function criar() {
    btn = document.createElement('button');
    btn.textContent = '⬇ Vortex';
    btn.title = 'Enviar esta página para o Vortex';
    btn.style.cssText =
      'position:fixed;right:20px;bottom:24px;z-index:2147483647;border:0;border-radius:999px;' +
      'padding:12px 18px;font:600 14px system-ui,sans-serif;color:#fff;cursor:pointer;' +
      'background:linear-gradient(135deg,#22d3ee,#6366f1,#8b5cf6);box-shadow:0 6px 20px rgba(99,102,241,.5)';
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = '⏳ Procurando...';
      chrome.runtime.sendMessage(
        { tipo: 'baixar', url: location.href, titulo: document.title.replace(/ - YouTube$/, '') },
        function (r) {
          btn.disabled = false;
          btn.textContent = r && r.ok ? '✓ Enviando!' : '⚠ ' + ((r && r.erro) || 'Configure o motor');
          setTimeout(function () { btn.textContent = '⬇ Vortex'; }, 5000);
        }
      );
    });
    document.documentElement.appendChild(btn);
  }

  function atualizar() {
    chrome.storage.sync.get({ botaoYoutube: true }, function (c) {
      var mostrar = c.botaoYoutube && ehVideo();
      if (mostrar && !btn) criar();
      if (btn) btn.style.display = mostrar ? '' : 'none';
    });
  }

  atualizar();
  document.addEventListener('yt-navigate-finish', atualizar);
  chrome.storage.onChanged.addListener(atualizar);
})();
