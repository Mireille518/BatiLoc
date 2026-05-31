@echo off
chcp 65001 >nul
title Serveur Backend - Port 3000
color 0A

echo ╔════════════════════════════════════════════════════╗
echo ║   DÉMARRAGE DU SERVEUR BACKEND                     ║
echo ╚════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [1/3] Vérification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ ERREUR: Node.js n'est pas installé!
    echo    Installez Node.js depuis https://nodejs.org
    pause
    exit /b 1
)
node --version
echo    ✅ Node.js trouvé
echo.

echo [2/3] Vérification du fichier .env...
if not exist .env (
    echo    ⚠️  ATTENTION: Fichier .env manquant!
    echo    Créez un fichier .env dans le dossier back/
    echo.
) else (
    echo    ✅ Fichier .env trouvé
)
echo.

echo [3/3] Démarrage du serveur...
echo.
echo ════════════════════════════════════════════════════
echo    Le serveur va démarrer sur http://localhost:3000
echo    Laissez cette fenêtre ouverte!
echo ════════════════════════════════════════════════════
echo.
echo    Appuyez sur Ctrl+C pour arrêter le serveur
echo.

timeout /t 2 /nobreak >nul

node index.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Erreur lors du démarrage du serveur!
    echo Vérifiez les messages ci-dessus.
    echo.
    pause
)

