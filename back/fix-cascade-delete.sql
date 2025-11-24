-- ============================================
-- Script pour corriger la suppression en cascade
-- entre facture et convention
-- ============================================
-- À exécuter dans phpMyAdmin (onglet SQL)
-- Base de données: batiment
-- ============================================

-- ÉTAPE 1: Trouver le nom exact de la contrainte
-- Exécutez cette requête pour voir toutes les contraintes de clé étrangère
SELECT 
    CONSTRAINT_NAME, 
    TABLE_NAME, 
    COLUMN_NAME, 
    REFERENCED_TABLE_NAME, 
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'batiment' 
  AND TABLE_NAME = 'facture' 
  AND REFERENCED_TABLE_NAME = 'convention'
  AND COLUMN_NAME = 'numConv';

-- ÉTAPE 2: Supprimer l'ancienne contrainte
-- Remplacez 'facture_ibfk_80' par le nom trouvé à l'étape 1 si différent
ALTER TABLE `facture` 
DROP FOREIGN KEY `facture_ibfk_80`;

-- ÉTAPE 3: Recréer la contrainte avec ON DELETE CASCADE
ALTER TABLE `facture` 
ADD CONSTRAINT `facture_ibfk_80` 
FOREIGN KEY (`numConv`) 
REFERENCES `convention` (`numConv`) 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- ÉTAPE 4: Vérification
-- Vérifiez que la contrainte a été créée correctement avec CASCADE
SELECT 
    CONSTRAINT_NAME, 
    TABLE_NAME, 
    COLUMN_NAME, 
    REFERENCED_TABLE_NAME, 
    DELETE_RULE, 
    UPDATE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS rc
JOIN information_schema.KEY_COLUMN_USAGE kcu 
    ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
WHERE rc.CONSTRAINT_SCHEMA = 'batiment' 
  AND kcu.TABLE_NAME = 'facture' 
  AND kcu.COLUMN_NAME = 'numConv'
  AND rc.CONSTRAINT_NAME = 'facture_ibfk_80';

-- Résultat attendu: DELETE_RULE et UPDATE_RULE doivent être 'CASCADE'

