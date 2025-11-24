/**
 * Script pour corriger la contrainte de clé étrangère
 * et ajouter ON DELETE CASCADE entre facture et convention
 * 
 * Usage: node fix-cascade-delete.js
 */

const sequelize = require('./connection/db');

async function fixCascadeDelete() {
  try {
    console.log('🔧 Correction de la contrainte de clé étrangère...\n');

    // Étape 1: Trouver le nom de la contrainte
    const [constraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'facture'
        AND REFERENCED_TABLE_NAME = 'convention'
        AND COLUMN_NAME = 'numConv'
    `);

    if (constraints.length === 0) {
      console.log('❌ Aucune contrainte trouvée. La contrainte n\'existe peut-être pas encore.');
      return;
    }

    const constraintName = constraints[0].CONSTRAINT_NAME;
    console.log(`✓ Contrainte trouvée: ${constraintName}\n`);

    // Étape 2: Supprimer l'ancienne contrainte
    console.log(`🗑️  Suppression de l'ancienne contrainte...`);
    await sequelize.query(`
      ALTER TABLE \`facture\` 
      DROP FOREIGN KEY \`${constraintName}\`
    `);
    console.log(`✓ Ancienne contrainte supprimée\n`);

    // Étape 3: Recréer la contrainte avec ON DELETE CASCADE
    console.log(`➕ Création de la nouvelle contrainte avec CASCADE...`);
    await sequelize.query(`
      ALTER TABLE \`facture\` 
      ADD CONSTRAINT \`${constraintName}\` 
      FOREIGN KEY (\`numConv\`) 
      REFERENCES \`convention\` (\`numConv\`) 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
    `);
    console.log(`✓ Nouvelle contrainte créée avec CASCADE\n`);

    // Étape 4: Vérification
    console.log(`🔍 Vérification de la contrainte...`);
    const [verification] = await sequelize.query(`
      SELECT 
        DELETE_RULE, 
        UPDATE_RULE
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE()
        AND CONSTRAINT_NAME = '${constraintName}'
    `);

    if (verification.length > 0) {
      const { DELETE_RULE, UPDATE_RULE } = verification[0];
      console.log(`✓ DELETE_RULE: ${DELETE_RULE}`);
      console.log(`✓ UPDATE_RULE: ${UPDATE_RULE}\n`);

      if (DELETE_RULE === 'CASCADE' && UPDATE_RULE === 'CASCADE') {
        console.log('✅ SUCCÈS! La contrainte a été corrigée avec succès.');
        console.log('   Vous pouvez maintenant supprimer des conventions même si elles ont des factures associées.\n');
      } else {
        console.log('⚠️  ATTENTION: La contrainte n\'a pas les règles CASCADE attendues.');
      }
    }

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error('\nDétails:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Exécuter le script
fixCascadeDelete();

