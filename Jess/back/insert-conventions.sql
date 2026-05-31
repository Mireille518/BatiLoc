-- ============================================================================
-- Script SQL pour insérer des conventions de test dans WAMP/phpMyAdmin
-- ============================================================================
-- Instructions:
-- 1. Ouvrez phpMyAdmin dans WAMP
-- 2. Sélectionnez votre base de données
-- 3. Allez dans l'onglet "SQL"
-- 4. Copiez et exécutez ce script
-- ============================================================================

-- Étape 1: Vérifier les bâtiments disponibles
SELECT numBat, adresse, montant FROM mbatiment LIMIT 10;

-- Étape 2: Vérifier les locataires disponibles
SELECT codeCli, nomcli, cin FROM locataire LIMIT 10;

-- Étape 3: Insérer des conventions de test
-- IMPORTANT: Remplacez les valeurs numBat et codeCli par des valeurs existantes dans votre base de données
-- Le champ lieu est limité à 10 caractères maximum

-- Exemple 1: Convention pour le premier bâtiment et le premier locataire
INSERT INTO convention (lieu, dateConv, statutConv, numFact, numBat, codeCli) 
SELECT 'FIANARANTS', CURDATE(), 0, NULL, b.numBat, l.codeCli
FROM mbatiment b, locataire l
LIMIT 1;

-- Exemple 2: Créer plusieurs conventions (ajustez selon vos données)
-- Remplacez les numBat et codeCli par des valeurs réelles de votre base
INSERT INTO convention (lieu, dateConv, statutConv, numFact, numBat, codeCli) VALUES
('FIANARANTS', CURDATE(), 0, NULL, 
    (SELECT numBat FROM mbatiment ORDER BY numBat LIMIT 1 OFFSET 0),
    (SELECT codeCli FROM locataire ORDER BY codeCli LIMIT 1 OFFSET 0)),
('FIANARANTS', CURDATE(), 0, NULL,
    (SELECT numBat FROM mbatiment ORDER BY numBat LIMIT 1 OFFSET 1),
    (SELECT codeCli FROM locataire ORDER BY codeCli LIMIT 1 OFFSET 0)),
('FIANARANTS', CURDATE(), 0, NULL,
    (SELECT numBat FROM mbatiment ORDER BY numBat LIMIT 1 OFFSET 2),
    (SELECT codeCli FROM locataire ORDER BY codeCli LIMIT 1 OFFSET 0));

-- Étape 4: Vérifier les conventions créées
SELECT 
    c.numConv,
    c.lieu,
    c.dateConv,
    CASE WHEN c.statutConv = 1 THEN 'Confirmé' ELSE 'En attente' END AS statut,
    b.adresse AS adresse_batiment,
    b.montant AS loyer,
    l.nomcli AS nom_locataire,
    l.cin
FROM convention c
LEFT JOIN mbatiment b ON c.numBat = b.numBat
LEFT JOIN locataire l ON c.codeCli = l.codeCli
ORDER BY c.numConv DESC
LIMIT 20;

-- ============================================================================
-- Note: Si vous avez plusieurs locataires, vous pouvez créer plus de conventions
-- en répétant les INSERT avec différentes combinaisons de numBat et codeCli
-- ============================================================================

