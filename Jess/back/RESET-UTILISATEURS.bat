@echo off
chcp 65001 >nul
title Réinitialisation des Utilisateurs
color 0B

echo ╔════════════════════════════════════════════════════╗
echo ║   RÉINITIALISATION DES UTILISATEURS                ║
echo ╚════════════════════════════════════════════════════╝
echo.
echo ⚠️  Cette opération va:
echo    - Supprimer TOUS les utilisateurs existants
echo    - Créer 3 nouveaux utilisateurs de test
echo.
echo Appuyez sur Ctrl+C pour annuler, ou...
pause
echo.

cd /d "%~dp0"

echo Démarrage de la réinitialisation...
echo.

node reset-users.js

echo.
echo Appuyez sur une touche pour fermer...
pause >nul

