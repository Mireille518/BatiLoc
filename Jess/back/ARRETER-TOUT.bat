@echo off
chcp 65001 >nul
title Arrêt des processus Node.js
color 0C

echo ╔════════════════════════════════════════════════════╗
echo ║   ARRÊT DE TOUS LES PROCESSUS NODE.JS             ║
echo ╚════════════════════════════════════════════════════╝
echo.

echo Arrêt de tous les processus Node.js...
taskkill /F /IM node.exe >nul 2>&1

if %errorlevel% equ 0 (
    echo ✅ Tous les processus Node.js ont été arrêtés
) else (
    echo ℹ️  Aucun processus Node.js trouvé (ou déjà arrêté)
)

echo.
echo Appuyez sur une touche pour continuer...
pause >nul

