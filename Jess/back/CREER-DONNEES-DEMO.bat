@echo off
echo ========================================
echo   CREATION DE DONNEES DE DEMONSTRATION
echo   A partir des conventions existantes
echo ========================================
echo.

cd /d "%~dp0"

echo Modification des conventions existantes...
echo.

node create-demo-data-from-existing.js

echo.
echo ========================================
echo   Appuyez sur une touche pour fermer...
echo ========================================
pause >nul

