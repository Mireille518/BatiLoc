@echo off
echo ========================================
echo   CREATION DE DONNEES DE TEST
echo   Pour tester la mise a jour des statuts
echo ========================================
echo.

cd /d "%~dp0"

echo Execution du script de creation de donnees de test...
echo.

node create-test-data-status-update.js

echo.
echo ========================================
echo   Appuyez sur une touche pour fermer...
echo ========================================
pause >nul

