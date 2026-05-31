/**
 * Script pour créer des données de test pour tester la mise à jour des statuts
 * 
 * Ce script crée :
 * - Des conventions avec différents statuts
 * - Des factures avec différents mois de paiement (mois actuel, mois précédent, etc.)
 * - Certaines factures payées, d'autres non payées
 * 
 * Utilisation: node create-test-data-status-update.js
 */

require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');
const madagascarDate = require('./utils/madagascarDate');

// Models
const Facture = require('./models/facture')(sequelize, DataTypes);
const Convention = require('./models/convention')(sequelize, DataTypes);
const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);
const Locataire = require('./models/locataire')(sequelize, DataTypes);

async function createTestData() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   CRÉATION DE DONNÉES DE TEST POUR MISE À JOUR STATUTS     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Obtenir la date actuelle en heure Madagascar
    const currentYear = madagascarDate.getMadagascarYear();
    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentMonthYear = madagascarDate.getMadagascarMonthYear();
    
    // Calculer le mois précédent
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const previousMonthYear = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
    
    // Calculer le mois suivant
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonthYear = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    
    console.log(`📅 Date actuelle (Madagascar UTC+3): ${currentMonthYear}`);
    console.log(`📅 Mois précédent: ${previousMonthYear}`);
    console.log(`📅 Mois suivant: ${nextMonthYear}`);
    console.log('');
    
    // Récupérer les bâtiments et locataires existants
    console.log('🔄 Chargement des données existantes...');
    const batiments = await Mbatiment.findAll({ limit: 10, transaction });
    const locataires = await Locataire.findAll({ limit: 10, transaction });
    
    if (batiments.length === 0) {
      console.error('❌ Aucun bâtiment trouvé. Veuillez d\'abord créer des bâtiments.');
      await transaction.rollback();
      process.exit(1);
    }
    
    if (locataires.length === 0) {
      console.error('❌ Aucun locataire trouvé. Veuillez d\'abord créer des locataires.');
      await transaction.rollback();
      process.exit(1);
    }
    
    console.log(`✅ ${batiments.length} bâtiment(s) trouvé(s)`);
    console.log(`✅ ${locataires.length} locataire(s) trouvé(s)`);
    console.log('');
    
    // Récupérer le dernier dm pour les factures
    const [dmResult] = await sequelize.query(
      'SELECT MAX(dm) as maxDm FROM facture',
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    let nextDm = (dmResult && dmResult.maxDm) ? dmResult.maxDm + 1 : 1;
    
    const conventionsCreated = [];
    const facturesCreated = [];
    
    console.log('📊 Création des données de test:\n');
    console.log('─'.repeat(80));
    
    // Scénario 1: Convention avec paiement du mois actuel (devrait être Confirmé)
    if (batiments[0] && locataires[0]) {
      const conv1 = await Convention.create({
        lieu: batiments[0].adresse.substring(0, 10),
        dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
        statutConv: false, // Initialement en attente
        numFact: null,
        numBat: batiments[0].numBat,
        codeCli: locataires[0].codeCli
      }, { transaction });
      
      const fact1 = await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${currentMonthYear}-01`,
        codegare: 1,
        depart: batiments[0].adresse ? batiments[0].adresse.substring(0, 10) : 'FIANARANTSOA',
        destination: locataires[0].adressecli ? locataires[0].adressecli.substring(0, 10) : 'LOCATAIRE',
        libelles: `Loyer ${currentMonthYear}`,
        numBat: batiments[0].numBat,
        numConv: conv1.numConv,
        codeCli: locataires[0].codeCli,
        statutPaiement: true // PAYÉE - mois actuel
      }, { transaction });
      
      conventionsCreated.push({ conv: conv1, fact: fact1, scenario: 'Paiement mois actuel (→ Confirmé)' });
      console.log(`✅ Convention #${conv1.numConv} - Paiement ${currentMonthYear} (PAYÉ) → Devrait être Confirmé`);
    }
    
    // Scénario 2: Convention avec paiement du mois précédent (devrait être En attente)
    if (batiments[1] && locataires[1]) {
      const conv2 = await Convention.create({
        lieu: batiments[1].adresse.substring(0, 10),
        dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
        statutConv: true, // Initialement confirmé
        numFact: null,
        numBat: batiments[1].numBat,
        codeCli: locataires[1].codeCli
      }, { transaction });
      
      const fact2 = await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${previousMonthYear}-01`,
        codegare: 1,
        depart: batiments[1].adresse ? batiments[1].adresse.substring(0, 10) : 'FIANARANTSOA',
        destination: locataires[1].adressecli ? locataires[1].adressecli.substring(0, 10) : 'LOCATAIRE',
        libelles: `Loyer ${previousMonthYear}`,
        numBat: batiments[1].numBat,
        numConv: conv2.numConv,
        codeCli: locataires[1].codeCli,
        statutPaiement: true // PAYÉE - mais mois précédent
      }, { transaction });
      
      conventionsCreated.push({ conv: conv2, fact: fact2, scenario: 'Paiement mois précédent (→ En attente)' });
      console.log(`✅ Convention #${conv2.numConv} - Paiement ${previousMonthYear} (PAYÉ) → Devrait être En attente`);
    }
    
    // Scénario 3: Convention sans aucun paiement (devrait être En attente)
    if (batiments[2] && locataires[2]) {
      const conv3 = await Convention.create({
        lieu: batiments[2].adresse.substring(0, 10),
        dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
        statutConv: true, // Initialement confirmé (mais devrait changer)
        numFact: null,
        numBat: batiments[2].numBat,
        codeCli: locataires[2].codeCli
      }, { transaction });
      
      // Pas de facture payée
      const fact3 = await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${currentMonthYear}-01`,
        codegare: 1,
        depart: batiments[2].adresse ? batiments[2].adresse.substring(0, 10) : 'FIANARANTSOA',
        destination: locataires[2].adressecli ? locataires[2].adressecli.substring(0, 10) : 'LOCATAIRE',
        libelles: `Loyer ${currentMonthYear}`,
        numBat: batiments[2].numBat,
        numConv: conv3.numConv,
        codeCli: locataires[2].codeCli,
        statutPaiement: false // NON PAYÉE
      }, { transaction });
      
      conventionsCreated.push({ conv: conv3, fact: fact3, scenario: 'Aucun paiement (→ En attente)' });
      console.log(`✅ Convention #${conv3.numConv} - Aucun paiement → Devrait être En attente`);
    }
    
    // Scénario 4: Convention avec facture du mois actuel non payée (devrait être En attente)
    if (batiments[3] && locataires[3]) {
      const conv4 = await Convention.create({
        lieu: batiments[3].adresse.substring(0, 10),
        dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
        statutConv: false, // Déjà en attente
        numFact: null,
        numBat: batiments[3].numBat,
        codeCli: locataires[3].codeCli
      }, { transaction });
      
      const fact4 = await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${currentMonthYear}-01`,
        codegare: 1,
        depart: batiments[3].adresse ? batiments[3].adresse.substring(0, 10) : 'FIANARANTSOA',
        destination: locataires[3].adressecli ? locataires[3].adressecli.substring(0, 10) : 'LOCATAIRE',
        libelles: `Loyer ${currentMonthYear}`,
        numBat: batiments[3].numBat,
        numConv: conv4.numConv,
        codeCli: locataires[3].codeCli,
        statutPaiement: false // NON PAYÉE
      }, { transaction });
      
      conventionsCreated.push({ conv: conv4, fact: fact4, scenario: 'Facture mois actuel non payée (→ En attente)' });
      console.log(`✅ Convention #${conv4.numConv} - Facture ${currentMonthYear} (NON PAYÉE) → Devrait être En attente`);
    }
    
    // Scénario 5: Convention avec paiement du mois actuel mais statut incorrect (devrait être Confirmé)
    if (batiments[4] && locataires[4]) {
      const conv5 = await Convention.create({
        lieu: batiments[4].adresse.substring(0, 10),
        dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
        statutConv: false, // En attente mais devrait être Confirmé
        numFact: null,
        numBat: batiments[4].numBat,
        codeCli: locataires[4].codeCli
      }, { transaction });
      
      const fact5 = await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${currentMonthYear}-01`,
        codegare: 1,
        depart: batiments[4].adresse ? batiments[4].adresse.substring(0, 10) : 'FIANARANTSOA',
        destination: locataires[4].adressecli ? locataires[4].adressecli.substring(0, 10) : 'LOCATAIRE',
        libelles: `Loyer ${currentMonthYear}`,
        numBat: batiments[4].numBat,
        numConv: conv5.numConv,
        codeCli: locataires[4].codeCli,
        statutPaiement: true // PAYÉE - mois actuel
      }, { transaction });
      
      conventionsCreated.push({ conv: conv5, fact: fact5, scenario: 'Paiement mois actuel, statut incorrect (→ Confirmé)' });
      console.log(`✅ Convention #${conv5.numConv} - Paiement ${currentMonthYear} (PAYÉ) → Devrait être Confirmé`);
    }
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('📈 Résumé:');
    console.log(`   • Conventions créées: ${conventionsCreated.length}`);
    console.log(`   • Factures créées: ${conventionsCreated.length}`);
    console.log('');
    console.log('📋 Scénarios créés:');
    conventionsCreated.forEach((item, index) => {
      console.log(`   ${index + 1}. Convention #${item.conv.numConv} - ${item.scenario}`);
    });
    console.log('');
    console.log('💡 Prochaines étapes:');
    console.log('   1. Exécutez le script de mise à jour: node update-statuses-with-madagascar-date.js');
    console.log('   2. Ou utilisez l\'interface web dans la section "Changements de statut"');
    console.log('   3. Vérifiez que les statuts sont correctement mis à jour');
    console.log('');
    
    await transaction.commit();
    
    console.log('✅ Données de test créées avec succès!');
    console.log('');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (err) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    console.error('\n❌ Erreur lors de la création des données de test:');
    console.error(err.message);
    console.error(err.stack);
    
    await sequelize.close();
    process.exit(1);
  }
}

// Exécuter le script
createTestData();

