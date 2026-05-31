/**
 * Script de synchronisation automatique des statuts
 * 
 * Ce script :
 * 1. Modifie les données existantes pour créer des cas de test
 * 2. Synchronise automatiquement les statuts des conventions
 * 3. Met à jour les statuts pour les clients qui ont dépassé le mois de leur paiement
 * 
 * Utilisation: node sync-statuses-automatic.js
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

async function syncStatuses() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   SYNCHRONISATION AUTOMATIQUE DES STATUTS                  ║');
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
    
    console.log(`📅 Date actuelle (Madagascar UTC+3): ${currentMonthYear}`);
    console.log(`📅 Mois précédent: ${previousMonthYear}`);
    console.log('');
    
    // Étape 1: Modifier les données existantes pour créer des cas de test
    console.log('🔄 Étape 1: Modification des données existantes...');
    console.log('─'.repeat(80));
    
    const conventions = await Convention.findAll({
      limit: 10,
      order: [['numConv', 'ASC']],
      transaction
    });
    
    if (conventions.length === 0) {
      console.log('⚠️  Aucune convention trouvée. Création de données de test...');
      // Créer des données de test si aucune convention n'existe
      await createTestData(transaction);
      await transaction.commit();
      await sequelize.close();
      return;
    }
    
    console.log(`📋 ${conventions.length} convention(s) trouvée(s)`);
    console.log('');
    
    let modifiedCount = 0;
    const modifications = [];
    
    // Modifier les conventions existantes pour créer différents scénarios
    for (let i = 0; i < Math.min(conventions.length, 5); i++) {
      const convention = conventions[i];
      
      // Récupérer les factures existantes pour cette convention
      const factures = await Facture.findAll({
        where: { numConv: convention.numConv },
        order: [['mois', 'DESC']],
        transaction
      });
      
      let modification = null;
      
      if (i === 0 && factures.length > 0) {
        // Scénario 1: Mettre une facture du mois précédent comme payée (devrait être En attente)
        const facture = factures[0];
        if (facture.statutPaiement === false) {
          await facture.update({
            mois: `${previousMonthYear}-01`,
            statutPaiement: true
          }, { transaction });
          
          // Mettre le statut de la convention à Confirmé (incorrect, devrait être En attente)
          await convention.update({ statutConv: true }, { transaction });
          
          modification = {
            numConv: convention.numConv,
            action: 'Facture mois précédent payée, statut Confirmé (incorrect)',
            expected: 'En attente'
          };
        }
      } else if (i === 1 && factures.length > 0) {
        // Scénario 2: Créer une facture du mois actuel non payée
        const lastDm = await Facture.max('dm', { transaction }) || 0;
        const facture = await Facture.create({
          dm: lastDm + 1,
          exercice: madagascarDate.getMadagascarDate(),
          mois: `${currentMonthYear}-01`,
          codegare: 1,
          depart: 'FIANARANTSOA',
          destination: 'LOCATAIRE',
          libelles: `Loyer ${currentMonthYear}`,
          numBat: convention.numBat,
          numConv: convention.numConv,
          codeCli: convention.codeCli,
          statutPaiement: false // NON PAYÉE
        }, { transaction });
        
        // Mettre le statut à Confirmé (incorrect, devrait être En attente)
        await convention.update({ statutConv: true }, { transaction });
        
        modification = {
          numConv: convention.numConv,
          action: 'Facture mois actuel non payée, statut Confirmé (incorrect)',
          expected: 'En attente'
        };
      } else if (i === 2) {
        // Scénario 3: Supprimer toutes les factures payées (devrait être En attente)
        await Facture.update(
          { statutPaiement: false },
          { where: { numConv: convention.numConv, statutPaiement: true }, transaction }
        );
        
        // Mettre le statut à Confirmé (incorrect, devrait être En attente)
        await convention.update({ statutConv: true }, { transaction });
        
        modification = {
          numConv: convention.numConv,
          action: 'Toutes factures non payées, statut Confirmé (incorrect)',
          expected: 'En attente'
        };
      } else if (i === 3 && factures.length > 0) {
        // Scénario 4: Créer une facture du mois actuel payée
        const lastDm = await Facture.max('dm', { transaction }) || 0;
        const facture = await Facture.create({
          dm: lastDm + 1,
          exercice: madagascarDate.getMadagascarDate(),
          mois: `${currentMonthYear}-01`,
          codegare: 1,
          depart: 'FIANARANTSOA',
          destination: 'LOCATAIRE',
          libelles: `Loyer ${currentMonthYear}`,
          numBat: convention.numBat,
          numConv: convention.numConv,
          codeCli: convention.codeCli,
          statutPaiement: true // PAYÉE
        }, { transaction });
        
        // Mettre le statut à En attente (incorrect, devrait être Confirmé)
        await convention.update({ statutConv: false }, { transaction });
        
        modification = {
          numConv: convention.numConv,
          action: 'Facture mois actuel payée, statut En attente (incorrect)',
          expected: 'Confirmé'
        };
      } else if (i === 4) {
        // Scénario 5: Créer une facture du mois précédent payée
        const lastDm = await Facture.max('dm', { transaction }) || 0;
        const facture = await Facture.create({
          dm: lastDm + 1,
          exercice: madagascarDate.getMadagascarDate(),
          mois: `${previousMonthYear}-01`,
          codegare: 1,
          depart: 'FIANARANTSOA',
          destination: 'LOCATAIRE',
          libelles: `Loyer ${previousMonthYear}`,
          numBat: convention.numBat,
          numConv: convention.numConv,
          codeCli: convention.codeCli,
          statutPaiement: true // PAYÉE mais mois précédent
        }, { transaction });
        
        // Mettre le statut à Confirmé (incorrect, devrait être En attente)
        await convention.update({ statutConv: true }, { transaction });
        
        modification = {
          numConv: convention.numConv,
          action: 'Facture mois précédent payée, statut Confirmé (incorrect)',
          expected: 'En attente'
        };
      }
      
      if (modification) {
        modifications.push(modification);
        modifiedCount++;
        console.log(`  ✅ Convention #${modification.numConv}: ${modification.action}`);
        console.log(`     → Devrait être: ${modification.expected}`);
      }
    }
    
    console.log('─'.repeat(80));
    console.log(`\n📊 ${modifiedCount} convention(s) modifiée(s) pour créer des cas de test`);
    console.log('');
    
    // Étape 2: Synchronisation automatique des statuts
    console.log('🔄 Étape 2: Synchronisation automatique des statuts...');
    console.log('─'.repeat(80));
    
    const allConventions = await Convention.findAll({ transaction });
    let updatedCount = 0;
    let checkedCount = 0;
    
    for (const convention of allConventions) {
      checkedCount++;
      
      // Trouver la dernière facture payée
      const lastPaidFacture = await Facture.findOne({
        where: {
          numConv: convention.numConv,
          statutPaiement: true
        },
        order: [['mois', 'DESC']],
        transaction
      });
      
      const previousStatut = convention.statutConv;
      let newStatut = previousStatut;
      let reason = '';
      
      if (!lastPaidFacture) {
        // Aucun paiement → En attente
        newStatut = false;
        reason = 'Aucun paiement trouvé';
      } else {
        const factureMois = new Date(lastPaidFacture.mois);
        const factureYear = factureMois.getFullYear();
        const factureMonth = factureMois.getMonth() + 1;
        
        const isCurrentMonthPaid = (factureYear === currentYear && factureMonth === currentMonth);
        
        if (isCurrentMonthPaid) {
          // Paiement du mois actuel → Confirmé
          newStatut = true;
          reason = `Paiement du mois actuel (${currentMonthYear}) trouvé`;
        } else {
          // Paiement dépassé → En attente
          newStatut = false;
          reason = `Dernier paiement: ${factureYear}-${String(factureMonth).padStart(2, '0')} ≠ mois actuel (${currentMonthYear})`;
        }
      }
      
      // Mettre à jour si nécessaire
      if (previousStatut !== newStatut) {
        await convention.update({ statutConv: newStatut }, { transaction });
        updatedCount++;
        
        const statutLabel = newStatut ? 'Confirmé' : 'En attente';
        const previousLabel = previousStatut ? 'Confirmé' : 'En attente';
        
        console.log(`  ✅ Convention #${convention.numConv}: ${previousLabel} → ${statutLabel}`);
        console.log(`     Raison: ${reason}`);
      }
    }
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('📈 Résumé de la synchronisation:');
    console.log(`   • Conventions vérifiées: ${checkedCount}`);
    console.log(`   • Statuts mis à jour: ${updatedCount}`);
    console.log(`   • Aucun changement: ${checkedCount - updatedCount}`);
    console.log('');
    
    await transaction.commit();
    
    console.log('✅ Synchronisation terminée avec succès!');
    console.log('');
    console.log('💡 Les statuts sont maintenant synchronisés avec la date Madagascar (UTC+3)');
    console.log('   Les clients qui ont dépassé le mois de leur paiement sont maintenant "En attente"');
    console.log('');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (err) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    console.error('\n❌ Erreur lors de la synchronisation:');
    console.error(err.message);
    console.error(err.stack);
    
    await sequelize.close();
    process.exit(1);
  }
}

// Fonction pour créer des données de test si aucune convention n'existe
async function createTestData(transaction) {
  const batiments = await Mbatiment.findAll({ limit: 5, transaction });
  const locataires = await Locataire.findAll({ limit: 5, transaction });
  
  if (batiments.length === 0 || locataires.length === 0) {
    throw new Error('Aucun bâtiment ou locataire trouvé. Veuillez d\'abord créer des données.');
  }
  
  const currentYear = madagascarDate.getMadagascarYear();
  const currentMonth = madagascarDate.getMadagascarMonth();
  const currentMonthYear = madagascarDate.getMadagascarMonthYear();
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const previousMonthYear = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;
  
  let nextDm = 1;
  
  for (let i = 0; i < Math.min(batiments.length, locataires.length); i++) {
    const convention = await Convention.create({
      lieu: batiments[i].adresse.substring(0, 10),
      dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
      statutConv: i < 2, // Les 2 premières en Confirmé, les autres en attente
      numFact: null,
      numBat: batiments[i].numBat,
      codeCli: locataires[i].codeCli
    }, { transaction });
    
    // Créer des factures selon le scénario
    if (i === 0) {
      // Facture du mois précédent payée (devrait être En attente)
      await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${previousMonthYear}-01`,
        codegare: 1,
        depart: batiments[i].adresse.substring(0, 10),
        destination: locataires[i].adressecli.substring(0, 10),
        libelles: `Loyer ${previousMonthYear}`,
        numBat: batiments[i].numBat,
        numConv: convention.numConv,
        codeCli: locataires[i].codeCli,
        statutPaiement: true
      }, { transaction });
    } else if (i === 1) {
      // Facture du mois actuel payée (devrait être Confirmé)
      await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${currentMonthYear}-01`,
        codegare: 1,
        depart: batiments[i].adresse.substring(0, 10),
        destination: locataires[i].adressecli.substring(0, 10),
        libelles: `Loyer ${currentMonthYear}`,
        numBat: batiments[i].numBat,
        numConv: convention.numConv,
        codeCli: locataires[i].codeCli,
        statutPaiement: true
      }, { transaction });
    } else {
      // Pas de facture payée (devrait être En attente)
      await Facture.create({
        dm: nextDm++,
        exercice: madagascarDate.getMadagascarDate(),
        mois: `${currentMonthYear}-01`,
        codegare: 1,
        depart: batiments[i].adresse.substring(0, 10),
        destination: locataires[i].adressecli.substring(0, 10),
        libelles: `Loyer ${currentMonthYear}`,
        numBat: batiments[i].numBat,
        numConv: convention.numConv,
        codeCli: locataires[i].codeCli,
        statutPaiement: false
      }, { transaction });
    }
  }
}

// Exécuter le script
syncStatuses();

