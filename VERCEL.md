# Vortex na Vercel — site + funções no ar

**URL pública:** https://vortex-editor-gwyd.vercel.app
(espelhos: `vortex-editor-of5u.vercel.app`; o domínio `vortex-editor.vercel.app`
pertence a outro projeto/está sem deployment — use o endereço do seu projeto.)

Provas rodadas no domínio público: **19/19 no Chromium, 0 erro de JS**
(`docs/prova/20-vercel-landing.png`, `21-vercel-editor.png`,
`22-vercel-admin-api.png`, `23-vercel-celular.png`).

## O que existe no repositório

| Caminho | O que é |
|---|---|
| `api/drive.ts` | lista pasta pública do Google Drive |
| `api/proxy.ts` | baixa arquivo de outro site com CORS liberado |
| `api/ferramentas.ts` | voz (MP3), gerador de texto grátis, importação de skill |
| `api/ia.ts` | imagem/texto com chave própria (opcional) |
| `api/minerar.ts` | acha imagens/vídeos em uma página |
| `api/ping.ts` | teste de vida: `{"ok":true,"host":"vercel"}` |
| `scripts/gerar-api-vercel.mjs` | gera `api/*.ts` a partir de `netlify/functions/*.ts` |
| `vercel-dev.mjs` | runtime local no formato da Vercel (`npm run vercel:dev`) |

### Por que `api/*.ts` são arquivos "autônomos"

Cada função em `api/` **não tem nenhum import**: a lógica é copiada
mecanicamente de `netlify/functions/<nome>.ts` por
`node scripts/gerar-api-vercel.mjs`, junto com o adaptador
`Request → Response` do runtime Node da Vercel.

Motivo: a primeira tentativa usava `import` de `server/ponte.ts` +
`netlify/functions/*` e o deploy **passava**, mas as funções respondiam
`500 FUNCTION_INVOCATION_FAILED` (empacotamento da Vercel fora de `api/`).
Com arquivos autônomos, o pacote tem só o que precisa e funciona.

Regra para o futuro: **mexeu na lógica? edite `netlify/functions/*.ts` e rode
`npm run api:gerar`** (o `--check` avisa quando estão diferentes).

## Publicar

O projeto já está conectado: cada `git push` na `main` publica sozinho.

Configuração (detectada automaticamente, sem `vercel.json`):
- Framework: **Vite**
- Build: `npm run build`
- Output: `dist`
- Funções: `api/*.ts` (Node, 60 s)

> O `vercel.json` e o `.nvmrc` foram removidos de propósito: com eles o build
> falhava na Vercel. Sem eles, a detecção automática acerta.

## Variáveis de ambiente (todas opcionais)

| Nome | Para quê |
|---|---|
| `IA_API_KEY` | imagem/texto com sua chave |
| `IA_PROVEDOR`, `IA_MODELO_IMAGEM`, `IA_MODELO_TEXTO` | ajuste do provedor |
| `ELEVENLABS_KEY` | voz ElevenLabs |
| `GOOGLE_TTS_KEY` | voz Google Cloud |

Sem nenhuma delas: voz pelo motor grátis, texto pelo Pollinations, Drive e packs
por leitura pública. Tudo testado.

## Testar

```bash
npm install
npm i -D playwright && npx playwright install chromium   # só para os testes
npm run vercel:dev                       # runtime Vercel local em :3001
node testarTudo.mjs http://localhost:3001
node testarTudo.mjs https://SEU-PROJETO.vercel.app
```

## Diagnóstico rápido (o que já aconteceu)

| Sintoma | Causa | Solução aplicada |
|---|---|---|
| `npm error code 1` / `postinstall exited` | `netlify-cli` como devDependency rodando em Node novo | saiu do `package.json` (ver `INSTALAR.md`) |
| Deploy falhava sem log claro | `vercel.json` + `.nvmrc` + `engines` | removidos; detecção automática |
| Site 200, funções `500 FUNCTION_INVOCATION_FAILED` | funções importando arquivos fora de `api/` | `api/*.ts` autônomos (gerados) |
