/**
 * Script pour ajouter la colonne superficie et mettre à jour tous les bâtiments
 * avec des valeurs de superficie réalistes
 * 
 * Usage: node update-all-batiments-superficie.js
 */

const sequelize = require('./connection/db');
const MbatimentModel = require('./models/mbatiment')(sequelize, require('sequelize').DataTypes);

async function updateAllBatimentsSuperficie() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie\n');
    console.log('='.repeat(80));
    console.log('🔧 AJOUT DE LA SUPERFICIE POUR TOUS LES BÂTIMENTS\n');
    console.log('='.repeat(80));

    // Étape 1 : Vérifier et ajouter la colonne si nécessaire
    console.log('\n📋 Étape 1 : Vérification de la colonne superficie...');
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'mbatiment'
        AND COLUMN_NAME = 'superficie'
    `);

    if (columns.length === 0) {
      console.log('⚠️  La colonne superficie n\'existe pas, ajout en cours...');
      await sequelize.query(`
        ALTER TABLE \`mbatiment\` 
        ADD COLUMN \`superficie\` DOUBLE NULL 
        COMMENT 'Superficie du terrain en mètres carrés'
        AFTER \`longitude\`
      `);
      console.log('✅ Colonne superficie ajoutée avec succès!\n');
    } else {
      console.log('✅ La colonne superficie existe déjà\n');
    }

    // Étape 2 : Récupérer tous les bâtiments
    console.log('📋 Étape 2 : Récupération de tous les bâtiments...');
    const batiments = await MbatimentModel.findAll({
      order: [['numBat', 'ASC']]
    });

    console.log(`✅ ${batiments.length} bâtiment(s) trouvé(s)\n`);

    if (batiments.length === 0) {
      console.log('⚠️  Aucun bâtiment à mettre à jour\n');
      await sequelize.close();
      return;
    }

    // Étape 3 : Mettre à jour chaque bâtiment avec une superficie
    console.log('📋 Étape 3 : Mise à jour des superficies...\n');
    
    // Superficies par défaut basées sur le montant (plus le montant est élevé, plus la superficie est grande)
    // Formule approximative : superficie = (montant / 1000) * 1.5 (en m²)
    // Avec des valeurs minimales et maximales réalistes
    
    const transaction = await sequelize.transaction();
    let updated = 0;
    let skipped = 0;

    try {
      for (const batiment of batiments) {
        const batData = batiment.toJSON();
        
        // Si le bâtiment a déjà une superficie, on la garde
        if (batData.superficie && batData.superficie > 0) {
          console.log(`⏭️  Bâtiment #${batData.numBat} - Superficie déjà renseignée: ${batData.superficie} m²`);
          skipped++;
          continue;
        }

        // Calculer une superficie réaliste basée sur le montant
        // Plage réaliste : entre 100 m² et 600 m²
        let superficie = null;
        
        if (batData.montant) {
          // Formule : superficie = base + (montant / facteur)
          // Base minimale : 120 m²
          // Facteur : 2000 (pour un montant de 200000 Ar = 220 m²)
          const baseSuperficie = 120;
          const facteur = 2000;
          superficie = baseSuperficie + (batData.montant / facteur);
          
          // Limiter entre 100 et 600 m²
          superficie = Math.max(100, Math.min(600, superficie));
          
          // Arrondir à 2 décimales
          superficie = Math.round(superficie * 100) / 100;
        } else {
          // Si pas de montant, superficie par défaut
          superficie = 200.0;
        }

        // Mettre à jour le bâtiment
        await batiment.update({ superficie }, { transaction });
        
        updated++;
        console.log(`✅ Bâtiment #${batData.numBat} - ${batData.adresse || 'N/A'}`);
        console.log(`   💰 Montant: ${batData.montant ? batData.montant.toLocaleString('fr-FR') : 'N/A'} Ar`);
        console.log(`   📏 Superficie: ${superficie} m²\n`);
      }

      await transaction.commit();
      
      console.log('='.repeat(80));
      console.log(`\n📊 RÉSUMÉ:`);
      console.log(`   ✅ ${updated} bâtiment(s) mis à jour`);
      console.log(`   ⏭️  ${skipped} bâtiment(s) déjà renseignés (ignorés)`);
      console.log(`   📏 Tous les bâtiments ont maintenant une superficie en m²`);
      console.log('\n✅ Script terminé avec succès!\n');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    await sequelize.close();
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    if (error.message.includes('Duplicate column name')) {
      console.log('\n💡 La colonne existe déjà. Continuation de la mise à jour...\n');
    } else {
      console.error('\n💡 Vérifiez que la base de données est accessible et que vous avez les droits nécessaires.\n');
    }
    await sequelize.close();
    process.exit(1);
  }
}

// Exécuter le script
updateAllBatimentsSuperficie();

