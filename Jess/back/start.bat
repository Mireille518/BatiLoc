@echo off
echo ========================================
echo   DEMARRAGE DU SERVEUR BACKEND
echo ========================================
echo.
echo Verification de Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe!
    pause
    exit /b 1
)

echo.
echo Demarrage du serveur sur le port 3000...
echo Appuyez sur Ctrl+C pour arreter
echo.

node index.js

pause

