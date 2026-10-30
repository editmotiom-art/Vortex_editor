# Nome e endereço do sistema

## O que dá para fazer hoje (sem pagar nada)

O endereço atual é **https://vortex-editor-gwyd.vercel.app**.

O trecho `gwyd` é o sufixo automático da Vercel (ela precisa dele porque o nome
"vortex-editor" já está em uso por outra conta). Dá para trocar por qualquer
nome livre, no próprio painel:

1. Vercel → seu projeto → **Settings → General → Project Name**
2. Digite o nome (ex.: `vortex-editor-br`, `vortexapp`, `vortexvideo`)
3. **Save** → a Vercel passa a responder em `https://NOME.vercel.app`
4. Me avise a nova URL para eu rodar a bateria de testes nela

O nome do projeto **não aceita ponto** (`vortex.editor.vercel.app` não existe na
Vercel: subdomínio é só `nome.vercel.app`). Ponto só com domínio próprio.

## O endereço bonito (`vortexeditor.com`, `vortex.app`…)

Isso é **domínio próprio**: custa de R$ 40 a R$ 90 por ano (registro.br,
Namecheap, Cloudflare Registrar). Na Vercel o domínio próprio é **grátis**
(só o registro é pago):

1. Compre o domínio (ex.: `vortexeditor.com.br` no registro.br, ~R$ 40/ano)
2. Vercel → Settings → **Domains → Add** → digite o domínio
3. No painel do registrador, aponte o DNS como a Vercel mandar
   (normalmente `A 76.76.21.21` e `CNAME cname.vercel-dns.com`)
4. Em ~10 min o site fica em `https://vortexeditor.com.br`, com certificado
   automático

## Enquanto isso

- A página de vendas e o app funcionam igual no endereço `*.vercel.app`.
- O espelho `https://editmotiom-art.github.io/Vortex_editor/pages/` também está
  atualizado e passa nos mesmos testes.
- Quem já tiver o link antigo continua funcionando: nada quebra ao trocar o
  nome do projeto (o app usa `/api/…` relativo e detecta o host).
