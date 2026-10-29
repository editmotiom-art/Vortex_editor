# Onde está o sistema

## 🟢 Público, no ar agora
**https://editmotiom-art.github.io/Vortex_editor/**

Hospedado no GitHub Pages, ligado ao repositório. Toda vez que o código for
atualizado, o site acompanha.

| Funciona | Não funciona (precisa de servidor) |
|---|---|
| Login, contas, sessão | "Baixar de site" (lê páginas remotas) |
| Editor completo | |
| Biblioteca e packs | |
| Exportar MP4/WebM/WAV/PNG | |
| Importar arquivos do PC | |
| Baixar por link direto | |

## 🔵 Netlify (pronto, faltando 1 clique)
**https://vortex-editor.netlify.app** — deploy publicado, mas a Netlify desde
julho/2026 cria projetos como **privados** por padrão.

Para abrir ao público:
1. Painel da Netlify → projeto **vortex-editor**
2. **Project configuration** → **General** → **Visitor access**
3. **Project visibility** → **Edit visibility** → **Public**
4. (A opção "Private/Password" é do plano Pro — Public é do Free)

Depois disso o Netlify passa a ter também as funções de servidor
(`/.netlify/functions/minerar` e `proxy`), que habilitam o "Baixar de site".

## 🟡 Repositório
**https://github.com/editmotiom-art/Vortex_editor** — branch `main`
