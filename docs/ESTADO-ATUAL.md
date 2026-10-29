# Vortex — estado da entrega

Publicado em: https://vortex-editor.netlify.app/ (deploy `6ae35e0228f58d09862636cb`)
Repositório: commit `c3d737f` em `main`

## O que foi corrigido nesta rodada

### 1. Tema claro por padrão
- `vortex.tema` inicia em `claro`; o `<html data-theme="light">` é aplicado **antes** do React carregar
  (script inline no `index.html`), então não existe mais o flash escuro.
- Botão de tema na barra superior continua alternando e persistindo.

### 2. Arquivo importado vai para a biblioteca **e** para o editor
- Card de XML inteiro clicável + botão `▸ Abrir no editor`.
- Bug real corrigido: mídia e texto caíam na **mesma trilha** (a "Texto 1"), um cobrindo o outro.
  Agora existe `trilhaPara()` no store: texto → trilha de texto; mídia/forma → trilha de vídeo
  (nunca a de texto); áudio → trilha de áudio. `addElement()` também recusa trilha de texto para mídia.

### 3. Ajuste automático de mídia (fim da tarja e do canto)
- `identityTransform()` nasce no centro do projeto (540×960) e o compositor ajusta a mídia ao quadro:
  cobre o quadro quando a diferença é pequena, contém quando a mídia é muito alongada.

### 4. Exportação de vídeo, imagem e som — validada de ponta a ponta
Teste real (`tall7.mjs`) com um clipe WebM de 6 s, uma música e um texto:

| Saída | Resultado |
|---|---|
| Frame PNG 540×960 | 158 kB, clipe + texto corretamente enquadrados |
| Áudio WAV | 576 kB (música mixada) |
| Vídeo WebM 540×960 | 468 kB, 2,96 s, toca e redimensiona certo |

- **Prévia antes de baixar**: todo export abre uma prévia (vídeo com player, imagem, player de áudio)
  e só baixa quando o usuário clica em "Baixar este arquivo".
- **MP4**: se o navegador não codifica H.264 (Chromium/Firefox em Linux, por exemplo), o seletor avisa
  e o arquivo sai em WebM — nada de MP4 falso.

### 5. Estúdio de IA dentro do editor
- Botão `✦ IA` na barra superior: prompt, 7 estilos (Hollywood, Anime, Analógico, 3D…), 3 formatos,
  prévia da imagem e "Usar no editor" (entra como clipe na timeline).
- Quando o servidor de funções não está disponível ou a chave não foi configurada, a mensagem explica
  exatamente onde resolver (`#admin → Inteligência artificial`).

### 6. Celular
- Aviso "Gire o celular" agora respeita o tema claro e fica escondido de vez depois de "Continuar assim"
  (persistido em `vortex.hintGirar`).
- Testado em iPhone 13 (Playwright): tema claro, biblioteca abrindo na gaveta, card cria clipe, zero erros.

## Pendências conhecidas
- Extensão do navegador: não existe código dela no repositório; para embarcar é preciso o arquivo/zip.
- IA em produção precisa de `IA_API_KEY` nas variáveis de ambiente da Netlify.
- GitHub Pages: espelho em `pages/` (não copiar o build para a raiz).
