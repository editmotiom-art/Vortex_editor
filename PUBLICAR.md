# PUBLICAR — 3 minutos, sem código

Você não precisa entender nada daqui. Só siga os passos na ordem. 🎬

---

## Passo 1 — Mandar o código para o GitHub

1. Baixe a pasta **`vortex`** do workspace (ela está na lista de arquivos, à esquerda)
2. Descompacte no seu computador
3. **Windows:** dê **duplo clique** em `publicar.bat`
   **Mac/Linux:** abra o terminal na pasta e digite `bash publicar.sh`
4. Vai pedir o **login do GitHub**:
   - usuário: seu usuário do GitHub
   - senha: **NÃO é a senha da conta** — é um *token*. Para criar:
     GitHub → foto de perfil → **Settings** → *Developer settings* (fim da barra lateral)
     → **Personal access tokens** → **Fine-grained tokens** → *Generate new token*
     → em *Repository access* marque **Only select repositories** → `Vortex_editor`
     → em *Permissions* → **Contents: Read and write**
     → clique em *Generate* e **copie** o código que aparece (começa com `github_pat_`)
   - cole esse código no lugar da senha (o terminal não mostra o que você cola — é normal)

✅ Quando aparecer **"Publicado!"**, o código já está no GitHub.

---

## Passo 2 — Colocar no ar na Netlify

1. Abra [app.netlify.com](https://app.netlify.com) e entre com o **GitHub**
2. Clique em **Add new site** → **Import an existing project**
3. Escolha **GitHub** → autorize se pedir → clique em **`Vortex_editor`**
4. A próxima tela já vem preenchida (o projeto traz a configuração pronta):
   - *Build command:* `npm run build`
   - *Publish directory:* `dist`
   - *Functions directory:* `netlify/functions`
5. Clique em **Deploy site**

⏱️ Leva cerca de **1 minuto**. No fim aparece um endereço tipo
`https://vortex-editor-abc123.netlify.app` — **esse é o seu sistema, no ar.**

Para usar um endereço bonito, na Netlify vá em **Domain settings** → *Options* →
**Edit site name** → coloque `vortex-editor` (ou o nome que quiser).

---

## Passo 3 — Usar

Abra o endereço. Você vai ver:

- **Biblioteca** (à esquerda): templates, transições e looks prontos — clique e o clipe entra na timeline
- **Preview** (centro): o vídeo com play/pause, régua e zoom
- **Inspetor** (direita): posição, escala, rotação, opacidade, cor, fonte, efeitos, keyframes
- **Timeline** (embaixo): trilhas de vídeo, áudio e texto — arraste, corte pelas bordas, arraste para outra trilha
- **Importar**: arquivos do seu computador
- **Baixar de site**: cole o endereço de uma página → ele lista as mídias → escolha → importa
- **Exportar**: gera o vídeo em MP4/WebM, ou só o áudio, ou uma imagem

**Salvar:** ele salva automaticamente a cada 20 segundos. O botão *Salvar* força na hora.

---

## Depois disso

Cada vez que você me pedir uma mudança, eu altero o código, e é só rodar o
`publicar.bat` de novo (ou me pedir) — a Netlify republica sozinha.

**O que já está pronto:** editor completo, biblioteca, exportação, captura de sites.
**O que falta:** login/assinatura (preciso do Supabase novo) e o importador de XML do Alight Motion.

---

## Se algo der errado

| Problema | O que fazer |
|---|---|
| `git: command not found` | instale em [git-scm.com/downloads](https://git-scm.com/downloads) e rode de novo |
| `Authentication failed` | o token está errado ou expirou — gere outro e marque *Contents: Read and write* |
| Netlify diz *Build failed* | me mande o texto do erro; quase sempre é uma linha para corrigir |
| A página abre em branco | espere 30 s (primeiro acesso) e recarregue com `Ctrl+Shift+R` |
