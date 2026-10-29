# URLs do sistema

## 🟢 PRINCIPAL — Netlify (completo, com servidor)
# https://vortex-editor.netlify.app

Tudo funcionando, incluindo as funções de servidor:
- Baixar mídia de qualquer site ✅
- Gerador de IA (quando a chave for configurada) ✅

### Painel administrativo
https://vortex-editor.netlify.app/#admin
`admin` / `vortex2026`

## 🔵 Espelho — GitHub Pages
https://editmotiom-art.github.io/Vortex_editor/

Site estático (sem funções de servidor). Login, editor, biblioteca, XML e export funcionam;
"Baixar de site" não funciona aqui.

## 📦 Repositório
https://github.com/editmotiom-art/Vortex_editor

## ⚙️ Painel Netlify
https://app.netlify.com/projects/vortex-editor

---

## Como atualizar o site depois de uma mudança

```bash
npm run build
NETLIFY_AUTH_TOKEN=SEU_TOKEN npx netlify deploy --prod \
  --dir=dist --functions=netlify/functions \
  --site=db536c7f-e5f3-4a7c-aa67-526fef9dac9d
```
