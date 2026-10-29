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
