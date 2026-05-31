@echo off
echo ========================================
echo   REINITIALISATION ET CREATION
echo   DE DONNEES DE TEST
echo ========================================
echo.

cd /d "%~dp0"

echo Suppression et recreation des donnees...
echo.

node reset-and-create-status-data.js

echo.
echo ========================================
echo   Appuyez sur une touche pour fermer...
echo ========================================
pause >nul

