@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║   CRÉATION DE DONNÉES POUR CHANGEMENTS DE STATUT         ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Ce script crée des données de démonstration pour les changements de statut.
echo Ces données seront visibles dans le menu "Changements de statut".
echo.
pause

node create-demo-status-changes.js

echo.
echo Appuyez sur une touche pour fermer...
pause >nul

