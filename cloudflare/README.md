# vortex-api — funções do editor no Cloudflare Worker (grátis)

Mesmas 5 funções da Netlify, com as mesmas respostas. O editor só troca o
endereço em **Admin → API e hospedagem** (ou usa `VITE_API_URL` no build).
Se o Worker cair, o editor volta sozinho para a Netlify.

## Rotas

| Rota | Uso |
|---|---|
| `GET /api/ping` | teste de vida (`{"ok":true,...}`) |
| `GET /api/drive?pasta=ID` | lista pastas/arquivos de uma pasta pública do Drive |
| `GET /api/proxy?url=…` | baixa imagem/vídeo/zip de outro site (CORS liberado) |
| `POST /api/ferramentas` | `{acao:'voz'\|'texto'\|'skill'}` → MP3, texto, skill |
| `POST /api/ia` | imagem/texto com a chave `IA_API_KEY` (opcional) |
| `GET /api/minerar?url=…` | acha imagens/vídeos numa página |

## Publicar (no seu computador)

```bash
cd cloudflare
npm install
npx wrangler login      # abre o navegador, conta grátis
npm run deploy          # empacota (esbuild) e publica
```

No fim aparece algo como:

```
https://vortex-api.SEUNOME.workers.dev
```

Cole essa URL no editor: **Admin → API e hospedagem → URL da API → Salvar** e
clique em **Testar /api/ping**.

## Chaves (opcional)

```bash
npx wrangler secret put IA_API_KEY       # imagem/texto com sua chave
npx wrangler secret put ELEVENLABS_KEY   # voz ElevenLabs
npx wrangler secret put GOOGLE_TTS_KEY   # voz Google
```

Sem chave, a voz usa o motor gratuito e o texto usa o Pollinations — igual à
Netlify.

## Testar sem publicar

```bash
npm run dev      # http://localhost:8787/api/ping
```

## Estrutura

```
index.ts        roteador + CORS
drive.ts        Drive (embeddedfolderview)
proxy.ts        download com CORS
ferramentas.ts  voz / texto / skill
ia.ts           IA com chave
minerar.ts      mineração de página
minerarLib.ts   helpers da mineração
build.mjs       empacota tudo em dist/index.js (esbuild)
wrangler.toml   main = dist/index.js
```

O `netlify/functions` continua intacto: os dois hosts podem rodar ao mesmo tempo.
