require('dotenv').config();
const sequelize = require('./connection/db');

const migrationsToMark = [
  '20250120000000-add-statut-paiement-facture.js',
  '20250122000000-add-periodes-facture.js',
  '20250123000000-add-cascade-delete-facture.js',
  '20251026135152-usertable.js'
];

async function mark() {
  try {
    for (const name of migrationsToMark) {
      await sequelize.query(
        'INSERT IGNORE INTO SequelizeMeta (name) VALUES (:name)',
        { replacements: { name } }
      );
      console.log(`✓ ${name}`);
    }
    await sequelize.close();
    console.log('Tous les anciens fichiers sont désormais marqués comme exécutés.');
  } catch (error) {
    console.error('Erreur lors du marquage des migrations :', error.message);
    process.exit(1);
  }
}

mark();

