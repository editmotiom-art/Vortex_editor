(async function () {
  var $ = function (i) { return document.getElementById(i); };
  var c = await BT.config();

  $('servidor').value = c.servidor || '';
  $('editorUrl').value = c.editorUrl || '';
  $('qualidade').value = c.qualidade;
  $('botaoYoutube').checked = c.botaoYoutube;

  $('salvar').onclick = async function () {
    var aviso = $('aviso');
    var servidor = ($('servidor').value.trim() || '').replace(/\/+$/, '');
    var editor = ($('editorUrl').value.trim() || '').replace(/\/+$/, '');

    if (servidor) {
      try {
        var origin = new URL(servidor).origin;
        var ok = await chrome.permissions.request({ origins: [origin + '/*'] });
        if (!ok) { aviso.textContent = 'Sem permissão para acessar esse servidor.'; return; }
      } catch (e) {
        aviso.textContent = 'Endereço do servidor inválido.';
        return;
      }
    }

    if (editor) {
      try {
        var o2 = new URL(editor).origin;
        await chrome.permissions.request({ origins: [o2 + '/*'] });
      } catch (e) {
        aviso.textContent = 'Endereço do editor inválido.';
        return;
      }
    }

    await chrome.storage.sync.set({
      servidor: servidor,
      editorUrl: editor,
      qualidade: $('qualidade').value,
      botaoYoutube: $('botaoYoutube').checked
    });
    aviso.textContent = '✅ Salvo!';
    setTimeout(function () { aviso.textContent = ''; }, 2500);
  };
})();
