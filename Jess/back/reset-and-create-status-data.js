/**
 * Script pour supprimer et recréer des données de test pour les changements de statut
 * 
 * Ce script :
 * 1. Supprime les données de simulation précédentes
 * 2. Crée de nouvelles données avec des clients en retard
 * 3. S'assure que les données sont correctement formatées pour l'affichage
 * 
 * Utilisation: node reset-and-create-status-data.js
 */

require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes, Op } = require('sequelize');
const madagascarDate = require('./utils/madagascarDate');

// Models
const Facture = require('./models/facture')(sequelize, DataTypes);
const Convention = require('./models/convention')(sequelize, DataTypes);
const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);
const Locataire = require('./models/locataire')(sequelize, DataTypes);

async function resetAndCreate() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   RÉINITIALISATION ET CRÉATION DE DONNÉES DE TEST         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Étape 1: Supprimer les données de simulation précédentes
    console.log('🗑️  Étape 1: Suppression des données de simulation précédentes...');
    console.log('─'.repeat(80));
    
    // Trouver les conventions créées récemment (avec dateConv de cette année)
    const currentYear = madagascarDate.getMadagascarYear();
    const currentYearDate = `${currentYear}-01-01`;
    
    const recentConventions = await Convention.findAll({
      where: {
        dateConv: {
          [Op.gte]: currentYearDate
        }
      },
      order: [['numConv', 'DESC']],
      limit: 10,
      transaction
    });
    
    if (recentConventions.length > 0) {
      const numConvs = recentConventions.map(c => c.numConv);
      console.log(`   📋 ${recentConventions.length} convention(s) trouvée(s) à supprimer`);
      
      // Supprimer les factures associées
      const deletedFactures = await Facture.destroy({
        where: {
          numConv: { [Op.in]: numConvs }
        },
        transaction
      });
      console.log(`   ✅ ${deletedFactures} facture(s) supprimée(s)`);
      
      // Supprimer les conventions
      const deletedConventions = await Convention.destroy({
        where: {
          numConv: { [Op.in]: numConvs }
        },
        transaction
      });
      console.log(`   ✅ ${deletedConventions} convention(s) supprimée(s)`);
    } else {
      console.log('   ℹ️  Aucune convention récente à supprimer');
    }
    
    console.log('');
    
    // Étape 2: Créer de nouvelles données de test
    console.log('🔄 Étape 2: Création de nouvelles données de test...');
    console.log('─'.repeat(80));
    
    // Obtenir la date actuelle en heure Madagascar
    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentMonthYear = madagascarDate.getMadagascarMonthYear();
    
    // Calculer les mois précédents
    const getPreviousMonth = (monthsAgo) => {
      let month = currentMonth - monthsAgo;
      let year = madagascarDate.getMadagascarYear();
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
    
    // Récupérer les bâtiments et locataires (plus pour créer plus de données)
    const batiments = await Mbatiment.findAll({ limit: 20, transaction });
    const locataires = await Locataire.findAll({ limit: 20, transaction });
    
    if (batiments.length < 10 || locataires.length < 10) {
      throw new Error('Au moins 10 bâtiments et 10 locataires sont nécessaires pour créer plus de données');
    }
    
    // Récupérer le dernier dm
    const [dmResult] = await sequelize.query(
      'SELECT MAX(dm) as maxDm FROM facture',
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    let nextDm = (dmResult && dmResult.maxDm) ? dmResult.maxDm + 1 : 1;
    
    const scenarios = [];
    let index = 0;
    
    // Fonction helper pour créer une convention
    const createConvention = async (batiment, locataire, statutConv, moisPaiement, statutPaiement, type, description) => {
      const conv = await Convention.create({
        lieu: batiment.adresse.substring(0, 10),
        dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
        statutConv: statutConv,
        numFact: null,
        numBat: batiment.numBat,
        codeCli: locataire.codeCli
      }, { transaction });
      
      await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${moisPaiement}-01`,
        codegare: 1,
        depart: batiment.adresse ? batiment.adresse.substring(0, 10) : 'FIANARANTSOA',
        destination: locataire.adressecli ? locataire.adressecli.substring(0, 10) : 'LOCATAIRE',
        libelles: `Loyer ${moisPaiement}`,
        numBat: batiment.numBat,
        numConv: conv.numConv,
        codeCli: locataire.codeCli,
        statutPaiement: statutPaiement
      }, { transaction });
      
      scenarios.push({ numConv: conv.numConv, client: locataire.nomcli, type: type });
      console.log(`   ✅ Convention #${conv.numConv} - ${locataire.nomcli} (${description})`);
      return conv;
    };
    
    // SCÉNARIOS EN RETARD (10 clients)
    console.log('🔴 CRÉATION DE CLIENTS EN RETARD:');
    
    // 3 clients en retard de 1 mois
    for (let i = 0; i < 3 && index < batiments.length && index < locataires.length; i++) {
      await createConvention(
        batiments[index], locataires[index], 
        true, prev1Month.monthYear, true, 
        'retard-1mois', 'Retard 1 mois'
      );
      index++;
    }
    
    // 3 clients en retard de 2 mois
    for (let i = 0; i < 3 && index < batiments.length && index < locataires.length; i++) {
      await createConvention(
        batiments[index], locataires[index], 
        true, prev2Months.monthYear, true, 
        'retard-2mois', 'Retard 2 mois'
      );
      index++;
    }
    
    // 2 clients en retard de 3 mois
    for (let i = 0; i < 2 && index < batiments.length && index < locataires.length; i++) {
      await createConvention(
        batiments[index], locataires[index], 
        true, prev3Months.monthYear, true, 
        'retard-3mois', 'Retard 3 mois'
      );
      index++;
    }
    
    // 2 clients sans paiement
    for (let i = 0; i < 2 && index < batiments.length && index < locataires.length; i++) {
      await createConvention(
        batiments[index], locataires[index], 
        true, currentMonthYear, false, 
        'sans-paiement', 'Sans paiement'
      );
      index++;
    }
    
    // SCÉNARIOS À JOUR (5 clients)
    console.log('');
    console.log('🟢 CRÉATION DE CLIENTS À JOUR:');
    
    // 5 clients à jour
    for (let i = 0; i < 5 && index < batiments.length && index < locataires.length; i++) {
      await createConvention(
        batiments[index], locataires[index], 
        false, currentMonthYear, true, 
        'a-jour', 'À jour'
      );
      index++;
    }
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('📊 RÉSUMÉ:');
    const enRetard = scenarios.filter(s => s.type.startsWith('retard') || s.type === 'sans-paiement').length;
    const aJour = scenarios.filter(s => s.type === 'a-jour').length;
    console.log(`   • ${scenarios.length} scénario(s) créé(s)`);
    console.log(`   • ${enRetard} client(s) en retard (devraient être "En attente")`);
    console.log(`   • ${aJour} client(s) à jour (devraient être "Confirmé")`);
    console.log('');
    
    await transaction.commit();
    
    console.log('✅ Données créées avec succès!');
    console.log('');
    console.log('💡 Maintenant:');
    console.log('   1. Actualise la page dans le navigateur');
    console.log('   2. Va dans "Changements de statut"');
    console.log('   3. Clique sur "Actualiser"');
    console.log('   4. Tu devrais voir 4 clients en retard et 1 client à jour');
    console.log('');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (err) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    console.error('\n❌ Erreur:', err.message);
    console.error(err.stack);
    
    await sequelize.close();
    process.exit(1);
  }
}

resetAndCreate();

