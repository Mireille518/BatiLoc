@echo off
echo ========================================
echo   SYNCHRONISATION AUTOMATIQUE DES STATUTS
echo   Modification des donnees et mise a jour
echo ========================================
echo.

cd /d "%~dp0"

echo Execution de la synchronisation automatique...
echo.

node sync-statuses-automatic.js

echo.
echo ========================================
echo   Appuyez sur une touche pour fermer...
echo ========================================
pause >nul

