@echo off
echo ========================================
echo   REINITIALISATION DES STATUTS
echo   Pour refaire la demonstration
echo ========================================
echo.

cd /d "%~dp0"

echo Reinitialisation des statuts pour la demonstration...
echo.

node reset-demo-statuses.js

echo.
echo ========================================
echo   Appuyez sur une touche pour fermer...
echo ========================================
pause >nul

