# Vortex Mídia — extensão do navegador

Extensão Chrome/Edge (Manifest V3) que captura **imagem, vídeo e áudio de qualquer página**
e envia direto para a biblioteca do **Vortex Editor**.

```
extension/
├── manifest.json     MV3, permissões e ponte com o editor
├── common.js         núcleo: detecção de site, coletor, download, motor opcional
├── background.js     service worker: menus, captura, ponte com o editor
├── popup.html/js     interface: "Nesta página" e "Colar link"
├── options.html/js   configuração: editor, motor, qualidade
├── youtube.js        botão flutuante no YouTube
├── estilo.css        tema visual
└── icons/            16, 32, 48, 128
```

---

## Instalar (modo desenvolvedor)

1. Abra `chrome://extensions`
2. Ative **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `extension/` deste projeto
5. Copie o **ID** que aparece no cartão da extensão
6. No editor: **Mídia web** → cole o ID → **Conectar**

Pronto: o editor passa a pedir a captura direto para a extensão.

---

## Como ela captura (3 caminhos)

### 1. Captura direta — sem servidor, sem custo
Injeta um coletor na aba e lê:

| Fonte | O que pega |
|---|---|
| `<video>` / `<source>` | MP4, WebM, HLS abertos |
| `<audio>` / `<source>` | MP3, WAV, OGG, M4A |
| `<img>` | todas com **200×200 px ou mais** (ignora ícones e pixels de rastreamento) |
| `og:video`, `og:image`, `og:audio` | metatags OpenGraph / Twitter |
| JSON-LD | `VideoObject`, `AudioObject`, `ImageObject` |
| `background-image` | hero/banners grandes |

Funciona em: portais de notícia, blogs, sites institucionais, bancos de imagem, wikis,
lojas, landing pages e qualquer vídeo HTML5 sem DRM.

### 2. Envio ao editor
Cada item tem o botão **→ Editor**. Dois modos:
- canal direto (`externally_connectable`) — aparece na hora, na fila do modal
- fallback por URL (`?import=`) — abre o editor já com o item

### 3. Motor (opcional)
Para **YouTube, TikTok, Instagram, Facebook e X**. Nenhum deles expõe o arquivo na página
(DRM + segmentação), então é necessário um resolvedor do seu lado.

> ⚠️ A API usada pela versão original (`baixartudo.me/api/`) **estava fora do ar** durante esta
> integração — retornava `502 Sandbox is not reachable`. Por isso ela virou **opcional**:
> sem motor, a extensão continua útil nos sites do item 1. Configure um servidor em **Opções**
> quando tiver um.

---

## Alternar entre os modos

**Opções da extensão →**

| Campo | Efeito |
|---|---|
| Endereço do Vortex Editor | para onde a mídia é enviada |
| Servidor do motor | vazio = só captura direta |
| Qualidade padrão | 2160p … 360p ou só áudio |
| Botão flutuante no YouTube | liga/desliga o atalho na página |

---

## Segurança e privacidade

- Nenhum dado sai do seu navegador na captura direta.
- A extensão só pede permissão de origem quando você configura um servidor.
- O conteúdo capturado nunca entra no banco: vira blob na memória da aba do editor.

---

## Publicar na Chrome Web Store (opcional)

```bash
cd extension
zip -r ../vortex-midia.zip . -x "*.md"
```

Depois: [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) →
novo item → upload do zip → preencher ficha → enviar para revisão (taxa única de US$ 5).

Para uso próprio ou da equipe, o modo desenvolvedor já resolve — sem publicação.
