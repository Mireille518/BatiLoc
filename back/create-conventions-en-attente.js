/**
 * Script pour créer des conventions avec le statut "En attente" pour tous
 * Utilisation: node create-conventions-en-attente.js
 */
require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

// Chargement des modèles
const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);
const Locataire = require('./models/locataire')(sequelize, DataTypes);
const Convention = require('./models/convention')(sequelize, DataTypes);

// Fonction pour obtenir l'année courante au format DATEONLY
function getCurrentYearDateOnly() {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

async function createConventionsEnAttente() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie\n');

    // Récupérer tous les bâtiments
    const batiments = await Mbatiment.findAll({
      order: [['numBat', 'ASC']]
    });

    if (batiments.length === 0) {
      console.error('❌ Aucun bâtiment trouvé. Veuillez d\'abord créer des bâtiments.');
      process.exit(1);
    }

    console.log(`📋 ${batiments.length} bâtiment(s) trouvé(s)\n`);

    // Récupérer tous les locataires
    const locataires = await Locataire.findAll({
      order: [['codeCli', 'ASC']]
    });

    if (locataires.length === 0) {
      console.error('❌ Aucun locataire trouvé. Veuillez d\'abord créer des locataires.');
      process.exit(1);
    }

    console.log(`👤 ${locataires.length} locataire(s) trouvé(s)\n`);

    // Créer des conventions avec statut "En attente" pour tous
    const currentYear = getCurrentYearDateOnly();
    const conventionsCreated = [];
    const maxConventions = Math.min(batiments.length, locataires.length, 20); // Limiter à 20 pour éviter trop de données

    console.log('📝 Création des conventions avec statut "En attente"...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (let i = 0; i < maxConventions; i++) {
      const batiment = batiments[i % batiments.length];
      const locataire = locataires[i % locataires.length];

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

      // Créer la convention avec statut "En attente" (statutConv = false)
      const convention = await Convention.create({
        lieu: 'FIANARANTS', // Limité à 10 caractères
        dateConv: currentYear,
        statutConv: false, // TOUS en attente
        numFact: null, // Pas de facture associée
        numBat: batiment.numBat,
        codeCli: locataire.codeCli
      });

      conventionsCreated.push(convention);
      console.log(`✅ Convention #${convention.numConv} créée - Statut: ⏳ En attente`);
      console.log(`   🏢 Bâtiment: #${batiment.numBat} - ${batiment.adresse}`);
      console.log(`   👤 Locataire: ${locataire.nomcli} (CIN: ${locataire.cin})`);
      console.log(`   💰 Loyer: ${batiment.montant || 0} Ar`);
      console.log(`   📅 Date: ${currentYear}`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✅ ${conventionsCreated.length} convention(s) créée(s) avec le statut "En attente" !\n`);

    if (conventionsCreated.length > 0) {
      console.log('📋 Résumé des conventions créées:');
      conventionsCreated.forEach(conv => {
        console.log(`   - Convention #${conv.numConv} - ⏳ En attente`);
      });
      console.log('\n💡 Toutes les conventions sont en statut "En attente".');
      console.log('💡 Vous pouvez maintenant créer des factures pour ces conventions.\n');
    }

    // Statistiques
    const totalConventions = await Convention.count();
    const conventionsEnAttente = await Convention.count({
      where: { statutConv: false }
    });
    const conventionsConfirmees = await Convention.count({
      where: { statutConv: true }
    });

    console.log('📊 Statistiques globales:');
    console.log(`   📋 Total conventions: ${totalConventions}`);
    console.log(`   ⏳ En attente: ${conventionsEnAttente}`);
    console.log(`   ✅ Confirmées: ${conventionsConfirmees}\n`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la création des conventions:', error);
    await sequelize.close();
    process.exit(1);
  }
}

createConventionsEnAttente();

