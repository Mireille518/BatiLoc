-- Script SQL pour ajouter la colonne motifInactivite à la table mbatiment
-- Exécutez ce script dans votre base de données MySQL

-- Vérifier si la colonne existe déjà
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'mbatiment' 
    AND COLUMN_NAME = 'motifInactivite'
);

-- Ajouter la colonne uniquement si elle n'existe pas
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE mbatiment ADD COLUMN motifInactivite TEXT NULL COMMENT ''Motif de l''inactivité du bâtiment (réparation, démolition, etc.)''',
    'SELECT ''La colonne motifInactivite existe déjà'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Vérification
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'mbatiment' 
AND COLUMN_NAME = 'motifInactivite';

