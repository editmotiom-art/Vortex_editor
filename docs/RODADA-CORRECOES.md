# Rodada de correções — 29/10/2026

Tudo abaixo foi testado no navegador (Playwright) e publicado em
**https://vortex-editor.netlify.app/**.

## 1. Login e cadastro no celular
**Problema:** a tela de entrada tinha duas colunas fixas; no celular a
apresentação ocupava a tela e o formulário ficava em `x=384` numa tela de 390 px
— fora do campo de visão.
**Correção:** `.entrar-wrap` virou grid responsivo (`src/styles/mobile.css`), a
coluna de apresentação some abaixo de 900 px e o formulário fica com 350 px
centralizado. Testado no iPhone 13 retrato e paisagem: cadastro conclui e entra
no editor.

## 2. "O editor não funciona quando seleciono algo"
**Diagnóstico:** no desktop a seleção sempre funcionou (inspetor abre com Tempo,
Transformar, Efeitos…). No celular o painel existia, mas ficava escondido atrás
da gaveta.
**Correção:** tocar num clipe no celular abre automaticamente o painel de
propriedades (`App.tsx`), com trava de 900 ms para não reabrir a gaveta quando a
seleção vem da biblioteca.

## 3. Biblioteca de templates XML (importação em lote)
Novo: `src/lib/bibliotecaXML.ts` + `src/components/BibliotecaXML.tsx`, na nova
aba **XML** do painel esquerdo.
- arraste centenas/milhares de `.xml` de uma vez;
- barra de progresso de leitura e de gravação;
- cada XML vira um **card** com categoria automática (Texto, Transição, Overlay,
  Cor, Anime, Documentário, UI/Motion, Social), duração, resolução e nº de
  efeitos;
- **1 clique abre o template no editor** (`importarProjeto`);
- busca e filtro por categoria, remover individual ou limpar tudo;
- arquivos inválidos são listados com o motivo (testado com XML corrompido);
- armazenamento em **IndexedDB** (localStorage não comporta milhares).

## 4. "Baixar de site"
Testado com `w3schools.com/html/html5_video.asp`: 17 mídias encontradas, 17
adicionadas à aba Mídia, modal fecha sozinho. Mídias que bloqueiam CORS passam
pelo proxy `/.netlify/functions/proxy` (limite elevado para 200 MB).

## 5. Acervo do Drive agora baixa de verdade
Antes o botão de pack só mostrava um aviso. Agora:
- nova função **`netlify/functions/drive`** lê o índice público das pastas no
  servidor (o navegador não pode, por CORS);
- `src/lib/driveIndex.ts` varre as 17 pastas (até 45 por sessão, 1 nível de
  subpasta), atualiza a lista **enquanto** varre e guarda o índice por 3 dias;
- botões: baixar arquivo único, "12 primeiros", abrir pasta do catálogo e
  navegar em subpastas;
- download passa pelo proxy e entra na aba Mídia com duração medida pelo próprio
  navegador. Teste real: `VID_20231229_135410_023.mp4` (Green Screen
  Animations) baixado e disponível na timeline.

## 6. Painel administrativo
Credencial `admin` / `vortex2026`, trocável em **Acesso do admin**. Abas:
Visão geral, Clientes, Planos e preços, Pagamento, Inteligência artificial,
Acesso do admin, Sistema.

## Verificação final em produção
| Fluxo | Resultado |
|---|---|
| Editor desktop, 65 templates, clique aplica | OK |
| Seleção → inspetor | OK |
| XML em lote (2 arquivos) | 2 templates, 3 cards |
| Drive | 301 arquivos indexados na 1ª varredura |
| Celular retrato: cadastro | OK (`formX = 20`) |
| Celular paisagem: aplicar + selecionar | gaveta fecha, inspetor abre |
| Admin | entra |

Erros de JavaScript em todos os fluxos: **0**.
