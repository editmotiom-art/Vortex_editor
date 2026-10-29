#!/usr/bin/env bash
# ============================================================
#  Vortex — publicar no GitHub
#  Uso: bash publicar.sh [url-do-repositorio]
#  Padrão: https://github.com/editmotiom-art/Vortex_editor.git
# ============================================================
set -e

REPO="${1:-https://github.com/editmotiom-art/Vortex_editor.git}"
MSG="${2:-feat: Vortex editor + extensao de captura}"

echo "════════════════════════════════════════════"
echo "  VORTEX — publicar no GitHub"
echo "════════════════════════════════════════════"
echo "  Repositório: $REPO"
echo ""

# 1) git instalado?
if ! command -v git >/dev/null 2>&1; then
  echo "✗ Git não encontrado. Instale em https://git-scm.com/downloads"
  exit 1
fi

# 2) identidade
if [ -z "$(git config --global user.email || true)" ]; then
  echo "→ Configure seu nome e e-mail do GitHub:"
  read -rp "  Nome:  " NOME
  read -rp "  Email: " EMAIL
  git config --global user.name "$NOME"
  git config --global user.email "$EMAIL"
fi

# 3) init
if [ ! -d .git ]; then
  git init
  echo "✓ repositório local criado"
fi

git add -A
git commit -m "$MSG" || echo "→ nada novo para commitar"
git branch -M main

# 4) remote
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO"
else
  git remote add origin "$REPO"
fi

# 5) push
echo ""
echo "→ Enviando para o GitHub…"
echo "  (se pedir senha, use um Personal Access Token com permissão 'Contents: Read and write')"
echo ""
git push -u origin main --force

echo ""
echo "════════════════════════════════════════════"
echo "  ✓ Publicado!"
echo "  https://github.com/editmotiom-art/Vortex_editor"
echo ""
echo "  Próximo passo: conectar o repositório na Netlify"
echo "  https://app.netlify.com/start"
echo "════════════════════════════════════════════"
