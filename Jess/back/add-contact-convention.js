// Script Node.js pour ajouter la colonne contact à la table convention
require('dotenv').config();
const sequelize = require('./connection/db');

async function addContactColumn() {
  try {
    console.log('🔄 Ajout de la colonne contact à la table convention...');
    
    // Vérifier si la colonne existe déjà
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'convention' 
      AND COLUMN_NAME = 'contact'
    `);
    
    if (results.length > 0) {
      console.log('✅ La colonne contact existe déjà dans la table convention');
      await sequelize.close();
      return;
    }
    
    // Ajouter la colonne
    await sequelize.query(`
      ALTER TABLE convention 
      ADD COLUMN contact VARCHAR(20) NULL COMMENT 'Contact du locataire pour cette convention'
    `);
    
    console.log('✅ Colonne contact ajoutée avec succès à la table convention');
    
    // Vérifier
    const [verify] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'convention' 
      AND COLUMN_NAME = 'contact'
    `);
    
    if (verify.length > 0) {
      console.log('✅ Vérification réussie:', verify[0]);
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la colonne contact:', error.message);
    
    // Si l'erreur est "Duplicate column name", c'est OK
    if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
      console.log('ℹ️ La colonne contact existe déjà, aucune action nécessaire');
      await sequelize.close();
      process.exit(0);
    }
    
    await sequelize.close();
    process.exit(1);
  }
}

addContactColumn();

