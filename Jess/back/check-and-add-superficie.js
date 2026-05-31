/**
 * Script pour vérifier et ajouter la colonne superficie si elle n'existe pas
 * 
 * Usage: node check-and-add-superficie.js
 */

const sequelize = require('./connection/db');

async function checkAndAddSuperficie() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie\n');

    // Vérifier si la colonne existe
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mbatiment'
        AND COLUMN_NAME = 'superficie'
    `);

    if (columns.length > 0) {
      console.log('✅ La colonne superficie existe déjà dans la table mbatiment');
      console.log(`   Type: ${columns[0].DATA_TYPE}`);
      console.log(`   Nullable: ${columns[0].IS_NULLABLE}`);
      console.log(`   Comment: ${columns[0].COLUMN_COMMENT || 'Aucun'}\n`);
      
      // Vérifier combien de bâtiments ont une superficie renseignée
      const [stats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(superficie) as avec_superficie,
          COUNT(*) - COUNT(superficie) as sans_superficie
        FROM mbatiment
      `);
      
      console.log('📊 Statistiques:');
      console.log(`   Total bâtiments: ${stats[0].total}`);
      console.log(`   Avec superficie: ${stats[0].avec_superficie}`);
      console.log(`   Sans superficie: ${stats[0].sans_superficie}\n`);
    } else {
      console.log('⚠️  La colonne superficie n\'existe pas encore');
      console.log('🔧 Ajout de la colonne superficie...\n');
      
      // Ajouter la colonne
      await sequelize.query(`
        ALTER TABLE \`mbatiment\` 
        ADD COLUMN \`superficie\` DOUBLE NULL 
        COMMENT 'Superficie du terrain en mètres carrés'
        AFTER \`longitude\`
      `);
      
      console.log('✅ Colonne superficie ajoutée avec succès!\n');
    }

    await sequelize.close();
    console.log('✅ Script terminé avec succès!\n');
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.message.includes('Duplicate column name')) {
      console.log('\n💡 La colonne existe déjà mais n\'a pas été détectée. C\'est normal.\n');
    } else {
      console.error('\n💡 Alternative: Exécutez le script SQL manuellement dans phpMyAdmin:');
      console.log(`
ALTER TABLE \`mbatiment\` 
ADD COLUMN \`superficie\` DOUBLE NULL 
COMMENT 'Superficie du terrain en mètres carrés'
AFTER \`longitude\`;
      `);
    }
    await sequelize.close();
    process.exit(1);
  }
}

// Exécuter le script
checkAndAddSuperficie();

