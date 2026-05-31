-- Script SQL pour ajouter la colonne contact à la table convention
-- À exécuter dans phpMyAdmin ou via MySQL

ALTER TABLE convention 
ADD COLUMN IF NOT EXISTS contact VARCHAR(20) NULL COMMENT 'Contact du locataire pour cette convention';

-- Vérifier que la colonne a été ajoutée
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'convention' 
AND COLUMN_NAME = 'contact';

