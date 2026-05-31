@echo off
chcp 65001 >nul
title Serveur Backend - Port 3000
color 0A

echo ╔════════════════════════════════════════════════════╗
echo ║   DÉMARRAGE DU SERVEUR BACKEND                     ║
echo ╚════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM Arrêter les anciens processus
echo [1/4] Arrêt des anciens processus Node.js...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 1 /nobreak >nul
echo    ✅ Processus arrêtés
echo.

REM Vérifier Node.js
echo [2/4] Vérification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ ERREUR: Node.js n'est pas installé!
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo    ✅ Node.js %NODE_VERSION%
echo.

REM Vérifier .env
echo [3/4] Vérification de la configuration...
if not exist .env (
    echo    ⚠️  ATTENTION: Fichier .env manquant!
    echo    Le serveur peut démarrer quand même...
) else (
    echo    ✅ Fichier .env trouvé
)
echo.

REM Démarrer le serveur
echo [4/4] Démarrage du serveur...
echo.
echo ════════════════════════════════════════════════════
echo    🌐 Serveur: http://localhost:3000
echo    💚 Santé: http://localhost:3000/health
echo    🔐 API Login: http://localhost:3000/api/user/login
echo.
echo    ⚠️  NE FERMEZ PAS CETTE FENÊTRE!
echo    ⚠️  Appuyez sur Ctrl+C pour arrêter
echo ════════════════════════════════════════════════════
echo.

timeout /t 2 /nobreak >nul

node index.js

echo.
echo Le serveur s'est arrêté.
pause

