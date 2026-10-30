# Entrega — correções da crítica (itens 1 a 7)

Data: 30/10/2026 · commit base `a8b7438`

## 1. Administrador fora do painel do cliente
- `TopBar` só mostra o botão **Admin** quando `user.papel === 'admin'`.
- Login local do admin desativado no código (`entrarAdmin` responde "Entre com sua conta de administrador"); a senha padrão `01082020` **não existe mais no código**.
- Nenhuma tela exibe e-mail ou senha de administrador. Sessão de admin forjada no navegador é recusada pelo banco (prova em `provarPlano.mjs`).

## 2. Vídeo de demonstração refeito
Método novo, que impede voz sobreposta **por construção**:
- `gravar-demo.mjs` grava **um capítulo por vez** (5 navegadores separados, 5 gravações).
- `scripts/gerar-vozes-demo.mjs` gera **uma narração por capítulo** pela mesma rota que o cliente usa (`/api/ferramentas`, ação `voz`).
- `montar-demo.mjs` corta cada capítulo no próprio tempo e põe a narração dele por cima.
- Medições no arquivo final: 70,7 s; picos de silêncio de ~1,9 s **entre** capítulos (nunca dois áudios juntos); volume −16,7 dB médio, −1,3 dB de pico.

## 3. Biblioteca profissional
- `src/data/bibliotecaMidia.ts` (gerado por `scripts/validar-biblioteca.mjs`): 26 arquivos reais — 9 músicas, 8 efeitos sonoros, 8 fotos e 1 vídeo CC0/Pexels, cada um **baixado e conferido** (status, tipo real do arquivo, tamanho).
- Nova aba **♪ Músicas e arquivos** na Biblioteca: ouvir (▶), “+ Mídia”, “↓ no computador”, crédito e licença em cada card.
- Prova: `t_biblioteca.mjs` → 26 cards, 8 miniaturas, música e foto entraram no projeto (2 mídias, 2 clipes).

## 4. Download do Drive
- Antes: o proxy recusava com 413 porque o Drive manda `Content-Length` vazio e o proxy lia “arquivo maior que 200 MB”.
- Agora existe a ação `arquivo` em `/api/ferramentas`: pergunta o tamanho real (Range de 1 byte) e
  - cabe (até 80 MB) → baixa e entra na aba Mídia, com duração real;
  - não cabe (os flyers têm **625 MB**) → dispara o download no computador e explica o motivo.
- `scripts/mapear-packs-prontos.mjs` varreu os 163 packs: **35 packs têm arquivo que o editor abre** (36 mídias) → nova aba **▶ Pronto para usar** no Pack do Editor, com botão “+ timeline” que baixa na hora e já cria o clipe.
- Prova: `t_drive3.mjs` → pack Action Fx, `PREVIEW.mp4` (9,7 MB) baixado do Drive, 1 clipe criado.

## 5. Narração por IA
- Catálogo honesto (Ana, Bruno, Clara, Inês, Emma/Liam en-GB, Sofía es-ES) com `tom` e `ritmo`; `transformarAudio()` reamostra o áudio do TTS no navegador.
- Prova: mesmo texto → 6,9 s (Ana) / 11,9 s (Bruno) / 5,6 s (Clara).

## 6. Imagem do pedido
- O pedido agora vai **inteiro e primeiro** no prompt, traduzido do português (`dragão cuspindo fogo` → `dragon breathing fire`).
- Geração pelo servidor (sem CORS/limite de origem).
- Se o motor público estiver no limite diário, a resposta é o motivo real — nunca uma imagem genérica.
- Prova: `t_imagem.mjs` → pedido “dragão cuspindo fogo” devolveu um dragão cuspindo fogo (captura em `prova-imagem.png`).
- A ressalva honesta: o motor gratuito tem cota por IP. Para produção pesada, ligar uma API de imagem em Painel → IA.

## 7. Landing page
- Texto e sumário do vídeo atualizados para a versão nova (70 s / 5 capítulos).
- Pôster do vídeo = a imagem do dragão gerada pelo sistema.

## Comandos de verificação
```bash
npm run build
node vercel-dev.mjs
TOK=$(node /tmp/token.mjs | tail -1) node t_biblioteca.mjs
TOK=$(node /tmp/token.mjs | tail -1) node t_drive3.mjs
node scripts/validar-biblioteca.mjs       # revalida a biblioteca
node scripts/mapear-packs-prontos.mjs     # relê os packs do Drive
node gravar-demo.mjs && node montar-demo.mjs   # refaz o vídeo
```
