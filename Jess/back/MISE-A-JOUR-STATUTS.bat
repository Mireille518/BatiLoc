@echo off
echo ========================================
echo   MISE A JOUR DES STATUTS DES CONVENTIONS
echo   (Date Madagascar UTC+3)
echo ========================================
echo.

cd /d "%~dp0"

echo Execution du script de mise a jour...
echo.

node update-statuses-with-madagascar-date.js

echo.
echo ========================================
echo   Appuyez sur une touche pour fermer...
echo ========================================
pause >nul

