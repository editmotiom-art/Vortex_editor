# Espelho do GitHub Pages

Esta pasta recebe uma cópia de `dist/` a cada publicação.
A raiz do repositório é o projeto Vite — não copie o build para a raiz.

    npm run build && rm -rf pages && mkdir pages && cp -r dist/* pages/ && touch pages/.nojekyll

Site publicado: https://vortex-editor.netlify.app/
