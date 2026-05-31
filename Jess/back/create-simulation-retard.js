/**
 * Script de simulation - Création de données avec clients en retard de paiement
 * 
 * Ce script crée des données de simulation pour voir les changements de statut :
 * - Clients avec paiement du mois précédent (en retard)
 * - Clients avec paiement du mois actuel (à jour)
 * - Clients sans paiement (en retard)
 * 
 * Utilisation: node create-simulation-retard.js
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

async function createSimulation() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   SIMULATION - CLIENTS EN RETARD DE PAIEMENT              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Obtenir la date actuelle en heure Madagascar
    const currentYear = madagascarDate.getMadagascarYear();
    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentMonthYear = madagascarDate.getMadagascarMonthYear();
    
    // Calculer les mois précédents (1, 2, 3 mois en arrière)
    const getPreviousMonth = (monthsAgo) => {
      let month = currentMonth - monthsAgo;
      let year = currentYear;
      while (month <= 0) {
        month += 12;
        year -= 1;
      }
      return { year, month, monthYear: `${year}-${String(month).padStart(2, '0')}` };
    };
    
    const prev1Month = getPreviousMonth(1);
    const prev2Months = getPreviousMonth(2);
    const prev3Months = getPreviousMonth(3);
    
    console.log(`📅 Date actuelle (Madagascar UTC+3): ${currentMonthYear}`);
    console.log(`📅 Mois précédent (1 mois): ${prev1Month.monthYear}`);
    console.log(`📅 Mois précédent (2 mois): ${prev2Months.monthYear}`);
    console.log(`📅 Mois précédent (3 mois): ${prev3Months.monthYear}`);
    console.log('');
    
    // Récupérer les bâtiments et locataires existants
    console.log('🔄 Chargement des données existantes...');
    const batiments = await Mbatiment.findAll({ limit: 10, transaction });
    const locataires = await Locataire.findAll({ limit: 10, transaction });
    
    if (batiments.length < 5) {
      console.error('❌ Au moins 5 bâtiments sont nécessaires. Veuillez d\'abord créer des bâtiments.');
      await transaction.rollback();
      process.exit(1);
    }
    
    if (locataires.length < 5) {
      console.error('❌ Au moins 5 locataires sont nécessaires. Veuillez d\'abord créer des locataires.');
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
    
    const scenarios = [];
    
    console.log('📊 Création des scénarios de simulation:\n');
    console.log('─'.repeat(80));
    
    // SCÉNARIO 1: Client avec paiement du mois précédent (EN RETARD - 1 mois)
    console.log('🔴 SCÉNARIO 1: Client en retard de 1 mois');
    const conv1 = await Convention.create({
      lieu: batiments[0].adresse.substring(0, 10),
      dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
      statutConv: true, // Initialement Confirmé (mais devrait être En attente)
      numFact: null,
      numBat: batiments[0].numBat,
      codeCli: locataires[0].codeCli
    }, { transaction });
    
    const fact1 = await Facture.create({
      dm: nextDm++,
      exercice: madagascarDate.getMadagascarDate(),
      mois: `${prev1Month.monthYear}-01`,
      codegare: 1,
      depart: batiments[0].adresse ? batiments[0].adresse.substring(0, 10) : 'FIANARANTSOA',
      destination: locataires[0].adressecli ? locataires[0].adressecli.substring(0, 10) : 'LOCATAIRE',
      libelles: `Loyer ${prev1Month.monthYear}`,
      numBat: batiments[0].numBat,
      numConv: conv1.numConv,
      codeCli: locataires[0].codeCli,
      statutPaiement: true // PAYÉE mais mois précédent
    }, { transaction });
    
    scenarios.push({
      numConv: conv1.numConv,
      client: locataires[0].nomcli,
      dernierPaiement: prev1Month.monthYear,
      statutActuel: 'Confirmé',
      statutAttendu: 'En attente ⏳',
      raison: `Paiement de ${prev1Month.monthYear} ≠ mois actuel ${currentMonthYear}`
    });
    
    console.log(`   ✅ Convention #${conv1.numConv} - ${locataires[0].nomcli}`);
    console.log(`      Dernier paiement: ${prev1Month.monthYear} (PAYÉ)`);
    console.log(`      Statut actuel: Confirmé → Devrait être: En attente ⏳`);
    console.log(`      Raison: Retard de 1 mois`);
    console.log('');
    
    // SCÉNARIO 2: Client avec paiement de 2 mois en arrière (EN RETARD - 2 mois)
    console.log('🔴 SCÉNARIO 2: Client en retard de 2 mois');
    const conv2 = await Convention.create({
      lieu: batiments[1].adresse.substring(0, 10),
      dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
      statutConv: true, // Initialement Confirmé (mais devrait être En attente)
      numFact: null,
      numBat: batiments[1].numBat,
      codeCli: locataires[1].codeCli
    }, { transaction });
    
    const fact2 = await Facture.create({
      dm: nextDm++,
      exercice: madagascarDate.getMadagascarDate(),
      mois: `${prev2Months.monthYear}-01`,
      codegare: 1,
      depart: batiments[1].adresse ? batiments[1].adresse.substring(0, 10) : 'FIANARANTSOA',
      destination: locataires[1].adressecli ? locataires[1].adressecli.substring(0, 10) : 'LOCATAIRE',
      libelles: `Loyer ${prev2Months.monthYear}`,
      numBat: batiments[1].numBat,
      numConv: conv2.numConv,
      codeCli: locataires[1].codeCli,
      statutPaiement: true // PAYÉE mais 2 mois en arrière
    }, { transaction });
    
    scenarios.push({
      numConv: conv2.numConv,
      client: locataires[1].nomcli,
      dernierPaiement: prev2Months.monthYear,
      statutActuel: 'Confirmé',
      statutAttendu: 'En attente ⏳',
      raison: `Paiement de ${prev2Months.monthYear} ≠ mois actuel ${currentMonthYear}`
    });
    
    console.log(`   ✅ Convention #${conv2.numConv} - ${locataires[1].nomcli}`);
    console.log(`      Dernier paiement: ${prev2Months.monthYear} (PAYÉ)`);
    console.log(`      Statut actuel: Confirmé → Devrait être: En attente ⏳`);
    console.log(`      Raison: Retard de 2 mois`);
    console.log('');
    
    // SCÉNARIO 3: Client avec paiement de 3 mois en arrière (EN RETARD - 3 mois)
    console.log('🔴 SCÉNARIO 3: Client en retard de 3 mois');
    const conv3 = await Convention.create({
      lieu: batiments[2].adresse.substring(0, 10),
      dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
      statutConv: true, // Initialement Confirmé (mais devrait être En attente)
      numFact: null,
      numBat: batiments[2].numBat,
      codeCli: locataires[2].codeCli
    }, { transaction });
    
    const fact3 = await Facture.create({
      dm: nextDm++,
      exercice: madagascarDate.getMadagascarDate(),
      mois: `${prev3Months.monthYear}-01`,
      codegare: 1,
      depart: batiments[2].adresse ? batiments[2].adresse.substring(0, 10) : 'FIANARANTSOA',
      destination: locataires[2].adressecli ? locataires[2].adressecli.substring(0, 10) : 'LOCATAIRE',
      libelles: `Loyer ${prev3Months.monthYear}`,
      numBat: batiments[2].numBat,
      numConv: conv3.numConv,
      codeCli: locataires[2].codeCli,
      statutPaiement: true // PAYÉE mais 3 mois en arrière
    }, { transaction });
    
    scenarios.push({
      numConv: conv3.numConv,
      client: locataires[2].nomcli,
      dernierPaiement: prev3Months.monthYear,
      statutActuel: 'Confirmé',
      statutAttendu: 'En attente ⏳',
      raison: `Paiement de ${prev3Months.monthYear} ≠ mois actuel ${currentMonthYear}`
    });
    
    console.log(`   ✅ Convention #${conv3.numConv} - ${locataires[2].nomcli}`);
    console.log(`      Dernier paiement: ${prev3Months.monthYear} (PAYÉ)`);
    console.log(`      Statut actuel: Confirmé → Devrait être: En attente ⏳`);
    console.log(`      Raison: Retard de 3 mois`);
    console.log('');
    
    // SCÉNARIO 4: Client sans aucun paiement (EN RETARD)
    console.log('🔴 SCÉNARIO 4: Client sans aucun paiement');
    const conv4 = await Convention.create({
      lieu: batiments[3].adresse.substring(0, 10),
      dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
      statutConv: true, // Initialement Confirmé (mais devrait être En attente)
      numFact: null,
      numBat: batiments[3].numBat,
      codeCli: locataires[3].codeCli
    }, { transaction });
    
    // Créer une facture non payée
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
    
    scenarios.push({
      numConv: conv4.numConv,
      client: locataires[3].nomcli,
      dernierPaiement: 'Aucun',
      statutActuel: 'Confirmé',
      statutAttendu: 'En attente ⏳',
      raison: 'Aucun paiement trouvé'
    });
    
    console.log(`   ✅ Convention #${conv4.numConv} - ${locataires[3].nomcli}`);
    console.log(`      Dernier paiement: Aucun`);
    console.log(`      Statut actuel: Confirmé → Devrait être: En attente ⏳`);
    console.log(`      Raison: Aucun paiement`);
    console.log('');
    
    // SCÉNARIO 5: Client avec paiement du mois actuel (À JOUR)
    console.log('🟢 SCÉNARIO 5: Client à jour (paiement du mois actuel)');
    const conv5 = await Convention.create({
      lieu: batiments[4].adresse.substring(0, 10),
      dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
      statutConv: false, // Initialement En attente (mais devrait être Confirmé)
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
    
    scenarios.push({
      numConv: conv5.numConv,
      client: locataires[4].nomcli,
      dernierPaiement: currentMonthYear,
      statutActuel: 'En attente',
      statutAttendu: 'Confirmé ✅',
      raison: `Paiement du mois actuel (${currentMonthYear}) trouvé`
    });
    
    console.log(`   ✅ Convention #${conv5.numConv} - ${locataires[4].nomcli}`);
    console.log(`      Dernier paiement: ${currentMonthYear} (PAYÉ)`);
    console.log(`      Statut actuel: En attente → Devrait être: Confirmé ✅`);
    console.log(`      Raison: Paiement à jour`);
    console.log('');
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('📊 RÉSUMÉ DE LA SIMULATION:');
    console.log('');
    console.log('🔴 CLIENTS EN RETARD (devraient être "En attente"):');
    scenarios.filter(s => s.statutAttendu.includes('En attente')).forEach((s, i) => {
      console.log(`   ${i + 1}. Convention #${s.numConv} - ${s.client}`);
      console.log(`      Dernier paiement: ${s.dernierPaiement}`);
      console.log(`      ${s.raison}`);
    });
    console.log('');
    console.log('🟢 CLIENTS À JOUR (devraient être "Confirmé"):');
    scenarios.filter(s => s.statutAttendu.includes('Confirmé')).forEach((s, i) => {
      console.log(`   ${i + 1}. Convention #${s.numConv} - ${s.client}`);
      console.log(`      Dernier paiement: ${s.dernierPaiement}`);
      console.log(`      ${s.raison}`);
    });
    console.log('');
    console.log('─'.repeat(80));
    console.log('');
    console.log('💡 PROCHAINES ÉTAPES:');
    console.log('');
    console.log('1. Ouvrir l\'application web');
    console.log('2. Aller dans la section "Changements de statut"');
    console.log('3. Voir les 4 clients en retard qui nécessitent une mise à jour');
    console.log('4. Cliquer sur "Mettre à jour les statuts"');
    console.log('5. Vérifier que les statuts sont correctement mis à jour:');
    console.log('   - 4 clients en retard → "En attente" ⏳');
    console.log('   - 1 client à jour → "Confirmé" ✅');
    console.log('');
    console.log('OU exécuter la synchronisation automatique:');
    console.log('   node sync-statuses-automatic.js');
    console.log('');
    
    await transaction.commit();
    
    console.log('✅ Simulation créée avec succès!');
    console.log(`   ${scenarios.length} scénario(s) créé(s)`);
    console.log(`   ${scenarios.filter(s => s.statutAttendu.includes('En attente')).length} client(s) en retard`);
    console.log(`   ${scenarios.filter(s => s.statutAttendu.includes('Confirmé')).length} client(s) à jour`);
    console.log('');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (err) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    console.error('\n❌ Erreur lors de la création de la simulation:');
    console.error(err.message);
    console.error(err.stack);
    
    await sequelize.close();
    process.exit(1);
  }
}

// Exécuter le script
createSimulation();

