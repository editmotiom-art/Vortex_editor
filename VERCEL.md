# Vortex na Vercel (site + funções no mesmo lugar)

O repositório já está pronto: **nenhuma variável é obrigatória** para o sistema
rodar. O que existe no projeto:

| Caminho | O que é |
|---|---|
| `vercel.json` | framework Vite, build `npm run build`, saída `dist`, funções com 60 s |
| `api/drive.ts` | lista pasta pública do Google Drive |
| `api/proxy.ts` | baixa arquivo de outro site com CORS liberado |
| `api/ferramentas.ts` | voz (MP3), gerador de texto grátis e importação de skill |
| `api/ia.ts` | imagem/texto com chave própria (opcional) |
| `api/minerar.ts` | acha imagens/vídeos em uma página |
| `api/ping.ts` | teste de vida (`{"ok":true}`) |
| `server/ponte.ts` | adapta `Request → Response` das funções para o runtime Node da Vercel |

As funções **não são cópias**: `api/*.ts` importam `netlify/functions/*.ts`, então
existe uma lógica só. Se um dia a lógica mudar, os dois hosts mudam juntos.

## Publicar

1. Vercel → **Add New… → Project → Import** e escolha `editmotiom-art/Vortex_editor`.
2. Confirme: Framework **Vite**, Build Command `npm run build`, Output Directory `dist`.
   (Já vem do `vercel.json`; se aparecer outro valor, deixe estes.)
3. **Deploy**. Em ~1 min sai a URL `https://vortex-editor.vercel.app`.
4. Abra `https://SUA-URL/api/ping` → deve responder `{"ok":true,"host":"vercel",…}`.

Cada `git push` na branch `main` publica sozinho (Production). Branches e PRs
geram Preview Deployments.

## Variáveis de ambiente (todas opcionais)

| Nome | Para quê |
|---|---|
| `IA_API_KEY` | imagem/texto com sua chave (OpenAI/Gemini/Stability) |
| `IA_PROVEDOR`, `IA_MODELO_IMAGEM`, `IA_MODELO_TEXTO` | ajuste do provedor |
| `ELEVENLABS_KEY` | voz ElevenLabs em vez do motor grátis |
| `GOOGLE_TTS_KEY` | voz Google Cloud |

Sem nenhuma delas o editor funciona: voz pelo motor grátis, texto pelo
Pollinations, Drive e packs por leitura pública.

## Testar antes/depois de publicar

```bash
npm run vercel:dev        # build + runtime local em http://localhost:3001
node testarTudo.mjs http://localhost:3001   # 19 provas no Chromium
curl http://localhost:3001/api/ping
```

`vercel-dev.mjs` simula o runtime da Vercel (Node req/res) sem precisar de login.

## Detalhes de comportamento

- No domínio `*.vercel.app`, `src/lib/api.ts` usa `/api/…` (mesma origem) e, se
  alguma chamada falhar, cai na reserva remota — a tela nunca fica sem resposta.
- No espelho do GitHub Pages (`github.io`), o editor usa a API da Vercel/Netlify
  automaticamente; em `localhost` também testa `/api/…`.
- URLs antigas `/.netlify/functions/…` continuam funcionando quando o site está na
  Netlify — nada do que já existe quebra.
- Nada de `edge runtime`: as funções são Node (precisam de `fetch` para baixar
  arquivos grandes e de tempo até 60 s).
- Limite do plano gratuito da Vercel: 100 GB de banda/mês e 100 GB-h de execução.
  Para o uso do editor isso é folgado; arquivos de pack (zip de centenas de MB)
  trafegam pelo domínio do Google, não pela função.
