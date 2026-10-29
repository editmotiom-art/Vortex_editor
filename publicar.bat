@echo off
setlocal
title Vortex - publicar no GitHub
set REPO=https://github.com/editmotiom-art/Vortex_editor.git

echo ============================================
echo   VORTEX - publicar no GitHub
echo ============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [X] Git nao encontrado.
  echo     Instale em https://git-scm.com/downloads e rode de novo.
  pause
  exit /b 1
)

for /f "delims=" %%i in ('git config --global user.email') do set EMAIL=%%i
if "%EMAIL%"=="" (
  set /p NOME=Seu nome no GitHub: 
  set /p EMAIL=Seu email do GitHub: 
  git config --global user.name "%NOME%"
  git config --global user.email "%EMAIL%"
)

if not exist .git (
  git init
  echo [OK] repositorio local criado
)

git add -A
git commit -m "feat: Vortex editor + extensao de captura"
git branch -M main

git remote remove origin >nul 2>nul
git remote add origin %REPO%

echo.
echo Enviando... se pedir senha, use um Personal Access Token
echo (GitHub > Settings > Developer settings > Tokens > Contents: Read and write)
echo.
git push -u origin main --force

echo.
echo ============================================
echo   Publicado!
echo   https://github.com/editmotiom-art/Vortex_editor
echo.
echo   Agora conecte na Netlify: https://app.netlify.com/start
echo ============================================
pause
