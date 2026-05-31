-- ============================================
-- Script SQL pour ajouter la colonne superficie
-- à la table mbatiment
-- ============================================
-- À exécuter dans phpMyAdmin (onglet SQL)
-- Base de données: batiment
-- ============================================

-- Ajouter la colonne superficie après longitude
ALTER TABLE `mbatiment` 
ADD COLUMN `superficie` DOUBLE NULL 
COMMENT 'Superficie du terrain en mètres carrés'
AFTER `longitude`;

-- Vérification
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'mbatiment'
  AND COLUMN_NAME = 'superficie';

-- Résultat attendu: colonne superficie ajoutée avec type DOUBLE

