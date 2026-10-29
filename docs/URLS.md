# URLs do Vortex

| O que | Endereço |
|---|---|
| **Sistema (completo, com servidor)** | https://vortex-editor.netlify.app/ |
| Espelho estático (GitHub Pages) | https://editmotiom-art.github.io/Vortex_editor/ |
| Painel administrativo | https://vortex-editor.netlify.app/#admin |
| Código-fonte | https://github.com/editmotiom-art/Vortex_editor |

## Credenciais
- **Admin:** `admin` / `vortex2026` → troque em `#admin` → *Acesso do admin*.
- **Cliente:** crie a conta na própria tela de entrada (e-mail + senha, 6+ caracteres).

## Funções de servidor ativas (só no Netlify)
- `/.netlify/functions/drive?pasta=ID` — índice público das pastas do Drive
- `/.netlify/functions/proxy?url=...` — baixa mídia bloqueada por CORS (até 200 MB)
- `/.netlify/functions/minerar` — mídias de uma página da web ("Baixar de site")
- `/.netlify/functions/ia` — geração de imagem/texto (precisa de `IA_API_KEY` no admin)

No espelho do GitHub Pages o editor e os painéis funcionam; as funções de
servidor (Drive, proxy, IA) só existem no endereço Netlify.

## Deploy
```bash
cd vortex && npm run build
NETLIFY_AUTH_TOKEN=<token> npx netlify deploy --prod --dir=dist \
  --functions=netlify/functions --site=db536c7f-e5f3-4a7c-aa67-526fef9dac9d
```
