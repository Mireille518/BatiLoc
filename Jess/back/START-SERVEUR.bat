@echo off
chcp 65001 >nul
title Serveur Backend - Démarrage
color 0A

echo ╔════════════════════════════════════════════════════╗
echo ║   DÉMARRAGE DU SERVEUR BACKEND                     ║
echo ╚════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1] Arrêt des anciens processus...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo    ✅ Processus arrêtés
echo.

echo [2] Vérification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ Node.js n'est pas installé!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo    ✅ Node.js %%i
echo.

echo [3] Démarrage du serveur...
echo.
echo ════════════════════════════════════════════════════
echo    Le serveur va démarrer...
echo    ⚠️  NE FERMEZ PAS CETTE FENÊTRE!
echo    ⚠️  Appuyez sur Ctrl+C pour arrêter
echo ════════════════════════════════════════════════════
echo.

timeout /t 2 /nobreak >nul

node index.js

pause

