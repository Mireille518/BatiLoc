require('dotenv').config();
const { execSync } = require('child_process');

console.log('Exécution de la migration pour ajouter les colonnes dateDebut, dateFin et datePaiement...');

try {
  // Exécuter la migration
  execSync('npx sequelize-cli db:migrate', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  console.log('✅ Migration exécutée avec succès!');
} catch (error) {
  console.error('❌ Erreur lors de l\'exécution de la migration:', error.message);
  console.log('\n💡 Alternative: Exécutez manuellement la migration SQL:');
  console.log(`
ALTER TABLE facture 
ADD COLUMN IF NOT EXISTS dateDebut DATE NULL COMMENT 'Date de début de la période couverte par le paiement',
ADD COLUMN IF NOT EXISTS dateFin DATE NULL COMMENT 'Date de fin de la période couverte par le paiement',
ADD COLUMN IF NOT EXISTS datePaiement DATE NULL COMMENT 'Date effective du paiement';
  `);
  process.exit(1);
}

