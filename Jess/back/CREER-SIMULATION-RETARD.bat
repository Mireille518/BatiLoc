@echo off
echo ========================================
echo   CREATION DE SIMULATION
echo   Clients en retard de paiement
echo ========================================
echo.

cd /d "%~dp0"

echo Creation de donnees de simulation...
echo.

node create-simulation-retard.js

echo.
echo ========================================
echo   Appuyez sur une touche pour fermer...
echo ========================================
pause >nul

