@echo off
chcp 65001 >nul
title Libération du port 3000
color 0E

echo ╔════════════════════════════════════════════════════╗
echo ║   LIBÉRATION DU PORT 3000                         ║
echo ╚════════════════════════════════════════════════════╝
echo.

echo Recherche des processus utilisant le port 3000...
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Trouvé processus PID: %%a
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo    ✅ Processus %%a arrêté
    ) else (
        echo    ⚠️  Impossible d'arrêter le processus %%a (besoin de droits admin?)
    )
)

echo.
echo Vérification du port 3000...
timeout /t 2 /nobreak >nul

netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo ⚠️  Le port 3000 est toujours utilisé
    echo.
    echo Solutions:
    echo 1. Exécutez ce script en tant qu'Administrateur
    echo 2. Ou changez le port dans back/.env: PORT=3001
) else (
    echo ✅ Le port 3000 est maintenant libre!
)

echo.
pause

