# Entrega da rodada — 29/10/2026

Produção: https://vortex-editor.netlify.app · GitHub: commit `2f80aec`
Prova automatizada: `node testarTudo.mjs https://vortex-editor.netlify.app` → **19/19** (0 erros de JS)

## 1. Skills dentro do chat de criação (botão “◈ Skills”)
- Gaveta de skills aberta pelo botão dentro do chat (✦ IA) — mesma ideia do botão de agentes.
- **30 skills** em 4 fontes: 12 nativas do Vortex · 8 do **Skywork** · 4 do **Google Skills (Cloud Skills Boost)** · 6 do **findskill.ai** (texto original do SKILL.md).
- Selo de origem em cada card (VORTEX / SKYWORK / GOOGLE / FINDSKILL) e filtros Todas / Do Vortex / Da web.
- Importar por link (zip ou .md) direto na gaveta: o servidor baixa, lê o SKILL.md e a skill passa a valer no chat.
- Admin → **Skills do chat**: liga/desliga cada fonte, abre o catálogo oficial de cada site, adiciona/remove skills por link.
- Arquivos: `src/components/SkillsChat.tsx`, `src/lib/skillsImportadas.ts`, `src/lib/fontesSkills.ts`,
  `src/data/skillsExternas.ts` (gerado por `scripts/baixar-skills.mjs`), `src/data/skillsPlataforma.ts` (Skywork + Google).

## 2. Gerador de conteúdo por prompt (estava “pedi para criar e não criou”)
- Função de servidor `netlify/functions/ferramentas.ts` → ação `texto` com **dois caminhos grátis**:
  Pollinations formato OpenAI (`/openai/v1/chat/completions`) e o clássico `/texto?model=openai-fast&referrer=…`.
- **Causa do bug**: o Pollinations devolve **402 FREE_LIMIT** sem `referrer` e limita a **1 resposta a cada 30 s** por IP.
  Agora o app manda o referrer e, se o motor estiver ocupado, entrega o **roteiro local treinado** na hora (sem tela vazia)
  e explica o motivo na mensagem.
- Admin → **IA → “Gerador de texto (Prompt) sem chave”**: liga/desliga o motor grátis, campo de API compatível com OpenAI
  (Groq, OpenRouter, Together, Ollama) e botão **Testar gerador de texto** que faz chamada real (mostra “respondeu via motor gratuito”).
- Prova em produção: `POST /ferramentas {acao:'texto'}` → 200 com roteiro em português.

## 3. Vozes (narração) — sem delay e sem bug
- Bloco **“3. Voz e narração”** dentro de 🎙 Legenda: seletor de voz (7 vozes pt-BR/pt-PT/en/es), ▶ Ouvir teste,
  textarea, **🎙 Narrar no playhead**, **🎙 Narrar todas as frases** e **🔊 por frase** (narra cada frase no tempo dela).
- MP3 vem pronto do servidor (Google TTS, ElevenLabs ou endpoint próprio) → clipe real na trilha de áudio.
- Medição em produção: fala de 5,3 s **gerada em 1,0 s**, arquivo `audio/mpeg` de 41 KB decodificado com duração correta.
- Admin → **Voz e narração**: provedor, idioma, velocidade, chave, URL template e **amostra real** (gera e toca o MP3).
- Arquivos: `src/lib/voz.ts`, `src/components/Transcricao.tsx`, aba `Voz` em `Admin.tsx`.

## 4. Baixa Tudo
- Cadeia de reservas: download direto → proxy `/.netlify/functions/proxy?url=` → abrir em outra aba, com erro claro.
- Prova em produção: link do YouTube baixado e colocado na timeline (“Me at the zoo…mp4”).

## 5. Pack do Editor 4.0 — o PDF do Drive entrou no editor
- Fonte: `PACK DO EDITOR 4.0 - STUDIOS MONKEY-desbloqueado.pdf` (1 página, **332 links**).
- Extração automática para `vortex/src/data/packsMonkey.ts` (39 KB): **163 packs** com nome, seção e **link do Drive + espelho no Sync**.
  Script: `packpdf/extrair_catalogo.py` (lê anotações do PDF, remonta os rótulos e casa com as colunas dos cards).
- Seções: After Effects 28 · Premiere Pro 18 · VFX Essencial 18 · Design e Photoshop 16 · Efeitos Sonoros 70 ·
  Trilhas e Bônus 7 · Bônus 6.
- Onde fica: editor → **Conteúdo → aba “Pack do Editor”**.

### Plano para caber sem estourar o banco (o pedido “implemente um plano”)
1. **Nada de arquivo no banco.** O sistema guarda só nome + link (39 KB no bundle). As pastas continuam no Drive/Sync do dono.
2. **Leitura sob demanda** pela função `drive` (embeddedfolderview): o índice da pasta fica em cache local por 7 dias; máx. 40 pastas.
3. **Download só no clique**: o arquivo desce pelo `proxy` (com `confirm=t` para arquivos grandes) e vira asset da biblioteca.
4. **Cota por plano** (`vortex.packs.uso.v1`): free 5/dia · pro 60/dia · studio 300/dia — protege banda da Netlify e o banco.
5. **Subpasta automática**: a maioria dos packs só tem pastas na raiz, então o app entra na primeira para já mostrar arquivos.
6. **Mídia ≠ instalação**: o editor abre vídeo/áudio/imagem (botão ↓). Zip/aep/psd/rar/plugin/fonte ganham link ↗ para
   baixar no computador, com aviso claro — sem prometer o que o navegador não abre.
7. **Espelho**: quando o Drive pede login, o botão ↗ Sync abre a mesma pasta no Sync.com.
- Prova: pasta “Assault Weapons” → 2 arquivos, imagem de 447 KB baixada em produção pelo proxy, virou asset na biblioteca, cota 1/5.

## 6. Publicação
- GitHub: `2f80aec` (push feito).
- Netlify: deploy `6ae3bdd` no ar com tudo isso. **O deploy seguinte foi bloqueado pela própria Netlify**
  (“Account credit usage exceeded — new deploys are blocked until credits are added”).
  As duas últimas mudanças do Pack (links ↗ Drive/Sync no topo e `confirm=t` no download) estão no GitHub e no bundle,
  mas precisam de um novo deploy assim que os créditos forem repostos (`netlify.app` → Billing).

## Como repetir as provas
```bash
cd vortex
node netlify/dev-server.mjs 8888          # local
node testarTudo.mjs http://127.0.0.1:8888
node provarPack.mjs http://127.0.0.1:8888
node testarTudo.mjs https://vortex-editor.netlify.app   # produção
```
Telas em `docs/prova/` (01 voz na timeline, 02 gaveta de skills, 03 roteiro, 04 imagem, 05 catálogo de packs,
06 pasta do pack, 07–10 admin, 11 celular, 12–13 pack baixando).

---

## Rodada: migração de host sem quebrar nada (29/10/2026)

**Motivo:** a Netlify bloqueou deploys novos na conta (`403 Account credit usage
exceeded`). O app em produção continua no ar (deploy `6ae3bdd8`), mas não aceita
atualização até repor crédito. Em vez de pagar, a API ganhou um plano B gratuito.

### O que mudou no editor

| Antes | Agora |
|---|---|
| cada tela chamava `/.netlify/functions/…` | `src/lib/api.ts` decide o endereço |
| uma API só (Netlify) | Netlify **ou** Cloudflare Worker, por URL no painel |
| se a função falhasse, a tela ficava sem resposta | volta automático para a Netlify |

- `src/lib/api.ts` — `urlFuncao()`, `chamarFuncao()` (fetch com reserva),
  `testarApi()` (`/api/ping`), saúde salva em `vortex.api.saude`.
- **Admin → API e hospedagem** (`/#admin`, aba nova): campo *URL da API*,
  botão *Testar /api/ping*, data da última verificação e o passo a passo do
  deploy grátis. Vazio = Netlify (nada muda para quem não mexer).
- Ordem de resolução: painel → `VITE_API_URL` → `/.netlify/functions/…`.
- Chamadas migradas: voz, chat/skills, importar skill por link, roteiro, texto
  do admin, imagem do Studio, Drive, proxy do pack, mineração e Baixa Tudo.

### Worker (`cloudflare/`)

- `npm install` → `npx wrangler login` → `npm run deploy` no computador do dono.
- Empacotado com esbuild (`build.mjs` → `dist/index.js`, 28,9 KB) porque o
  runtime do Cloudflare não lê TypeScript direto.
- Rotas validadas no runtime real (`wrangler dev --local`, Miniflare):
  `ping` ✓ · `drive` ✓ (pasta FLYERS) · `ferramentas.voz` ✓ 200 `audio/mpeg`
  24.960 B · `ferramentas.skill` ✓ (SKILL.md) · `ferramentas.texto` ✓
  (`fonte: pollinations`) · `proxy` ✓ 200 `image/jpeg`.

### Provas no navegador (Chromium real)

| Teste | Resultado |
|---|---|
| `testarApiExterna.mjs` — editor + API no Worker | **6/6**, 0 erro de JS, 5 chamadas ao Worker, **0** fallback |
| `testarFallback.mjs` — API configurada e morta | **2/2**: voz criada (5,7 s) e queda para a Netlify |
| `testarTudo.mjs` — regressão completa no local | **19/19**, 0 erro de JS |

Detalhes do teste externo: voz 4,6 s · 30 skills · skill importada por link ·
roteiro 167 caracteres · pasta do pack com **373 arquivos** vinda do Drive pelo
Worker. Screenshot do fallback: `docs/prova/14-fallback-netlify.png`.

### O que continua pendente

1. Você rodar `npx wrangler login && npm run deploy` em `cloudflare/` e colar a
   URL em Admin → API e hospedagem (não tenho sua conta Cloudflare).
2. Publicar o editor novo na Netlify quando houver crédito (o commit já está no
   GitHub, `88229a8`); até lá o site em produção segue no deploy `6ae3bdd8`.
3. `editmotiom-art.github.io/Vortex_editor/pages/` já recebeu o build novo —
   serve para conferir a interface, mas sem funções (13/19).

---

## Rodada: SISTEMA ONLINE (29/10/2026) — URL única

### Endereço oficial (site + todas as funções)

**https://editmotiom-art.github.io/Vortex_editor/pages/**

- Site estático no GitHub Pages (grátis, sem crédito).
- As 5 funções rodam na Netlify (`vortex-editor.netlify.app/.netlify/functions/…`),
  que **já liberam CORS `*`** — verificado com `OPTIONS` 204 e
  `access-control-allow-origin: *` nas rotas `drive`, `proxy` e `ferramentas`.
- `src/lib/api.ts` detecta `*.github.io` e usa essa API automaticamente; o
  endereço aparece em **Admin → API e hospedagem** como “netlify (funções)”.
- Se um dia a URL do Worker (Cloudflare) for colada no painel, ela tem
  prioridade. Nada quebra em nenhum dos dois casos.

### Prova no endereço público (`testarTudo.mjs`)

**19/19 · 0 erro de JS** — voz 2,1 s (MP3 41 KB, 5,30 s), 30 skills, skill
importada por link, roteiro via API grátis, pasta do pack com **373 arquivos**,
Baixa Tudo, abas do painel, landing rolando no celular.

Screenshots: `docs/prova/16-online-landing.png`, `17-online-editor.png`,
`18-online-celular.png`, `15-admin-api.png`.

### Detalhe importante

A Netlify continua bloqueando **deploy novo** (403 crédito), mas as funções já
publicadas seguem no ar — é isso que mantém o sistema 100% funcional agora.
Quando houver crédito, `npm run build && npx netlify deploy --prod …` publica a
versão nova também lá, sem mudar nada no endereço acima.
