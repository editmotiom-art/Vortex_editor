// ============================================================
//  VORTEX MÍDIA — service worker
//  · menu de contexto (link / vídeo / imagem / página)
//  · captura direta da aba (sem servidor)
//  · ponte com o Vortex Editor (externally_connectable)
// ============================================================
importScripts('common.js');

/* ------------- menús de contexto ------------- */
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.removeAll(function () {
    chrome.contextMenus.create({ id: 'vx-link', title: 'Enviar mídia para o Vortex', contexts: ['link', 'video', 'audio', 'image'] });
    chrome.contextMenus.create({ id: 'vx-pagina', title: 'Capturar todas as mídias desta página', contexts: ['page'] });
    chrome.contextMenus.create({ id: 'vx-baixar', title: 'Baixar este arquivo', contexts: ['video', 'audio', 'image'] });
  });
});

function avisar(tabId, ok, texto) {
  chrome.action.setBadgeBackgroundColor({ color: ok ? '#19c37d' : '#ff7b7b' });
  chrome.action.setBadgeText({ text: ok ? '✓' : '!', tabId: tabId });
  chrome.action.setTitle({ title: 'Vortex: ' + texto, tabId: tabId });
  setTimeout(function () { chrome.action.setBadgeText({ text: '', tabId: tabId }); }, 6000);
}

async function baixarDireto(link, titulo, tabId) {
  var d = await BT.pedir(link, {});
  if (d.status === 'tunnel' || d.status === 'redirect') {
    await BT.baixar(d.url, BT.nomeDe(d, titulo));
  } else if (d.status === 'picker') {
    var lista = d.picker || [];
    for (var i = 0; i < lista.length; i++) await BT.baixar(lista[i].url, BT.nomeDe(null, titulo, i, lista[i].type));
  } else if (d.status === 'local-processing') {
    throw new Error('Esse link veio em partes. Abra o ícone do Vortex para escolher os itens.');
  } else throw new Error('Resposta desconhecida: ' + d.status);
}

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  var tabId = tab && tab.id;

  // baixar direto um arquivo de mídia apontado pelo clique
  if (info.menuItemId === 'vx-baixar') {
    var urlArquivo = info.srcUrl || info.linkUrl;
    if (urlArquivo) {
      BT.baixar(urlArquivo, BT.limparNome((tab && tab.title) || 'midia') + '.' + BT.extDe('', urlArquivo))
        .then(function () { avisar(tabId, true, 'download iniciado'); })
        .catch(function (e) { avisar(tabId, false, e.message); });
    }
    return;
  }

  // capturar todas as mídias da página
  if (info.menuItemId === 'vx-pagina') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html?capturar=1&tab=' + tabId) });
    return;
  }

  // enviar para o editor / baixar via motor
  var link = info.menuItemId === 'vx-link' ? (info.linkUrl || info.srcUrl) : (info.pageUrl || (tab && tab.url));
  var titulo = info.menuItemId === 'vx-pagina' && tab ? tab.title : null;
  baixarDireto(link, titulo, tabId)
    .then(function () { avisar(tabId, true, 'enviado para o Vortex'); })
    .catch(function (e) { avisar(tabId, false, e.message); });
});

/* ------------- mensagens de dentro da extensão ------------- */
chrome.runtime.onMessage.addListener(function (msg, sender, responder) {
  if (msg && msg.tipo === 'baixar') {
    baixarDireto(msg.url, msg.titulo, sender.tab && sender.tab.id)
      .then(function () { responder({ ok: true }); })
      .catch(function (e) { responder({ ok: false, erro: e.message }); });
    return true;
  }
  if (msg && msg.tipo === 'capturar') {
    BT.coletarDaAba(msg.tabId).then(function (itens) { responder({ ok: true, itens: itens }); });
    return true;
  }
  if (msg && msg.tipo === 'enviar-editor') {
    (async function () {
      var cfg = await BT.config();
      var base = (cfg.editorUrl || '').replace(/\/+$/, '');
      if (!base) { responder({ ok: false, erro: 'Configure o endereço do editor nas Opções.' }); return; }
      try {
        await fetch(base + '/api/media/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: msg.items, source: msg.source || 'extension' })
        });
        responder({ ok: true });
      } catch (e) {
        // fallback: abre o editor com a mídia na query
        chrome.tabs.create({ url: base + '/?import=' + encodeURIComponent(msg.items[0] && msg.items[0].url || '') });
        responder({ ok: true, fallback: true });
      }
    })();
    return true;
  }
});

/* ------------- ponte com o site do editor (externally_connectable) ------------- */
chrome.runtime.onMessageExternal.addListener(function (msg, sender, responder) {
  if (!msg || !msg.tipo) return;
  if (msg.tipo === 'ping') { responder({ ok: true, versao: chrome.runtime.getManifest().version }); return; }
  if (msg.tipo === 'capturar-aba') {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tabId = tabs[0] && tabs[0].id;
      if (!tabId) { responder({ ok: false, erro: 'sem aba ativa' }); return; }
      BT.coletarDaAba(tabId).then(function (itens) { responder({ ok: true, itens: itens }); });
    });
    return true;
  }
  if (msg.tipo === 'baixar') {
    baixarDireto(msg.url, msg.titulo, null)
      .then(function () { responder({ ok: true }); })
      .catch(function (e) { responder({ ok: false, erro: e.message }); });
    return true;
  }
});
