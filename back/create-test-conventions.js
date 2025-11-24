require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

// Models
const Convention = require('./models/convention')(sequelize, DataTypes);
const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);
const Locataire = require('./models/locataire')(sequelize, DataTypes);

// Fonction pour obtenir l'année courante au format DATEONLY
function getCurrentYearDateOnly() {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

async function createTestConventions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie\n');

    // Récupérer les bâtiments existants
    const batiments = await Mbatiment.findAll({
      limit: 10,
      order: [['numBat', 'ASC']]
    });

    if (batiments.length === 0) {
      console.error('❌ Aucun bâtiment trouvé. Veuillez d\'abord créer des bâtiments.');
      process.exit(1);
    }

    console.log(`📋 ${batiments.length} bâtiment(s) trouvé(s)\n`);

    // Récupérer les locataires existants
    const locataires = await Locataire.findAll({
      limit: 10,
      order: [['codeCli', 'ASC']]
    });

    if (locataires.length === 0) {
      console.error('❌ Aucun locataire trouvé. Veuillez d\'abord créer des locataires.');
      process.exit(1);
    }

    console.log(`👤 ${locataires.length} locataire(s) trouvé(s)\n`);

    // Créer des conventions de test
    const currentYear = getCurrentYearDateOnly();
    const conventionsCreated = [];
    const maxConventions = Math.min(batiments.length, locataires.length, 5);

    console.log('📝 Création des conventions de test...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (let i = 0; i < maxConventions; i++) {
      const batiment = batiments[i];
      const locataire = locataires[i];

      // Vérifier si une convention existe déjà pour ce bâtiment et ce locataire
      const existingConv = await Convention.findOne({
        where: {
          numBat: batiment.numBat,
          codeCli: locataire.codeCli
        }
      });

      if (existingConv) {
        console.log(`⚠️  Convention existe déjà: Bâtiment #${batiment.numBat} - Locataire ${locataire.nomcli}`);
        continue;
      }

      // Créer la convention
      // Le champ lieu est limité à 10 caractères
      const convention = await Convention.create({
        lieu: 'FIANARANTS', // Limité à 10 caractères
        dateConv: currentYear,
        statutConv: false, // En attente par défaut
        numFact: null, // Pas de facture associée au départ
        numBat: batiment.numBat,
        codeCli: locataire.codeCli
      });

      conventionsCreated.push(convention);
      console.log(`✅ Convention #${convention.numConv} créée`);
      console.log(`   🏢 Bâtiment: #${batiment.numBat} - ${batiment.adresse}`);
      console.log(`   👤 Locataire: ${locataire.nomcli} (CIN: ${locataire.cin})`);
      console.log(`   💰 Loyer: ${batiment.montant || 0} Ar`);
      console.log(`   📅 Date: ${currentYear}`);
      console.log(`   📊 Statut: ${convention.statutConv ? 'Confirmé' : 'En attente'}`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✅ ${conventionsCreated.length} convention(s) créée(s) avec succès !\n`);

    if (conventionsCreated.length > 0) {
      console.log('📋 Résumé des conventions créées:');
      conventionsCreated.forEach(conv => {
        console.log(`   - Convention #${conv.numConv}`);
      });
      console.log('\n💡 Vous pouvez maintenant créer des factures pour ces conventions.\n');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la création des conventions:', error);
    await sequelize.close();
    process.exit(1);
  }
}

createTestConventions();

