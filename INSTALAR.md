# Como instalar as ferramentas de desenvolvimento (opcional)

O site e a API **não precisam de nada disso** — instalam-se sozinhos. Isto aqui
é só para rodar os testes e o deploy pela sua máquina.

```bash
# 1. dependências base (as mesmas que a Vercel instala)
npm install

# 2. ferramentas de teste/CLI — fora do install de produção de propósito
#    (o postinstall do netlify-cli quebra em Node muito novo)
npm i -D playwright netlify-cli

# 3. navegador dos testes
npx playwright install chromium

# 4. rodar o sistema localmente no formato da Vercel
npm run vercel:dev            # http://localhost:3001
node testarTudo.mjs http://localhost:3001

# 5. deploy manual na Netlify (opcional)
npx netlify deploy --prod --dir=dist --functions=netlify/functions
```

Motivo de `playwright` e `netlify-cli` não estarem no `package.json`: na Vercel o
`npm install` roda em Node 20 (fixado em `engines` e `.nvmrc`) e essas duas
ferramentas não são usadas no build do site. Mantê-las fora deixa o deploy ~4×
mais rápido e imune ao erro `postinstall exited with code 1`.
