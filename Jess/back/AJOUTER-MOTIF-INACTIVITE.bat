@echo off
echo ================================================
echo   AJOUT DE LA COLONNE motifInactivite
echo ================================================
echo.
echo Ce script va ajouter la colonne motifInactivite
echo a la table mbatiment dans votre base de donnees.
echo.
echo IMPORTANT: Vous devez modifier ce fichier .bat pour
echo            specifier votre nom d'utilisateur MySQL
echo            et votre base de donnees.
echo.
pause

REM ================================================
REM CONFIGURATION - MODIFIEZ CES LIGNES
REM ================================================
set DB_USER=votre_utilisateur
set DB_PASSWORD=votre_mot_de_passe
set DB_NAME=votre_base_de_donnees

echo Connexion a la base de donnees...
mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < add-motif-inactivite.sql

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo   SUCCES!
    echo ================================================
    echo La colonne motifInactivite a ete ajoutee.
) else (
    echo.
    echo ================================================
    echo   ERREUR!
    echo ================================================
    echo Une erreur s'est produite. Verifiez vos
    echo identifiants MySQL dans ce fichier .bat
)

pause

