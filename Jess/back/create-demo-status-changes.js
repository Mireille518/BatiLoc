/**
 * Script pour créer des données de démonstration pour les changements de statut
 * 
 * Ce script crée des conventions avec des statuts "Confirmé" alors qu'elles ont
 * dépassé la limite de paiement, pour permettre la démonstration du changement
 * de statut via le bouton "Mettre à jour les statuts".
 * 
 * Usage: node create-demo-status-changes.js
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

async function createDemoStatusChanges() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   CRÉATION DE DONNÉES POUR CHANGEMENTS DE STATUT         ║');
    console.log('║   Données visibles dans "Changements de statut"          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentYear = madagascarDate.getMadagascarYear();
    const currentMonthYear = madagascarDate.getMadagascarMonthYear();

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
    const prev4Months = getPreviousMonth(4);
    const prev5Months = getPreviousMonth(5);
    const prev6Months = getPreviousMonth(6);

    console.log(`📅 Date actuelle (Madagascar UTC+3): ${currentMonthYear}`);
    console.log(`📅 Mois précédent (1 mois): ${prev1Month.monthYear}`);
    console.log(`📅 Mois précédent (2 mois): ${prev2Months.monthYear}`);
    console.log(`📅 Mois précédent (3 mois): ${prev3Months.monthYear}`);
    console.log(`📅 Mois précédent (4 mois): ${prev4Months.monthYear}`);
    console.log(`📅 Mois précédent (5 mois): ${prev5Months.monthYear}`);
    console.log(`📅 Mois précédent (6 mois): ${prev6Months.monthYear}\n`);

    // Récupérer TOUTES les conventions disponibles
    const allConventions = await Convention.findAll({
      limit: 100, // Prendre plus de conventions pour avoir plus de variété
      order: [['numConv', 'DESC']],
      transaction
    });

    if (allConventions.length === 0) {
      throw new Error('Aucune convention trouvée pour la création de données de démonstration.');
    }

    console.log(`📋 ${allConventions.length} convention(s) trouvée(s)\n`);

    // Obtenir le prochain numéro DM
    const [dmResult] = await sequelize.query(
      'SELECT MAX(dm) as maxDm FROM facture',
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    let nextDm = (dmResult && dmResult.maxDm) ? dmResult.maxDm + 1 : 1;

    const modifiedConventions = [];
    let index = 0;

    console.log('🔄 CRÉATION DES DONNÉES DE DÉMONSTRATION:');
    console.log('─'.repeat(80));

    const modifyConvention = async (convention, moisPaiement, statutPaiementFacture, description) => {
      const locataire = await Locataire.findByPk(convention.codeCli, { transaction });
      const batiment = await Mbatiment.findByPk(convention.numBat, { transaction });

      // Vérifier si une facture existe déjà pour cette convention ce mois-ci
      const existingFacture = await Facture.findOne({
        where: {
          numConv: convention.numConv,
          mois: `${moisPaiement}-01`
        },
        transaction
      });

      if (!existingFacture) {
        // Créer une nouvelle facture
        // Utiliser des valeurs courtes pour éviter les erreurs de longueur
        const departValue = batiment && batiment.adresse ? batiment.adresse.substring(0, 10) : 'FIANARANTSOA';
        const destinationValue = locataire && locataire.adressecli ? locataire.adressecli.substring(0, 10) : 'LOCATAIRE';
        
        await Facture.create({
          dm: nextDm++,
          exercice: madagascarDate.getMadagascarDate(),
          mois: `${moisPaiement}-01`,
          codegare: 1,
          depart: departValue,
          destination: destinationValue,
          libelles: `Loyer ${moisPaiement}`,
          numBat: convention.numBat,
          numConv: convention.numConv,
          codeCli: convention.codeCli,
          statutPaiement: statutPaiementFacture
        }, { transaction });
      } else {
        // Mettre à jour la facture existante
        await existingFacture.update({
          statutPaiement: statutPaiementFacture
        }, { transaction });
      }

      // Déterminer le statut attendu basé sur la logique métier
      const shouldBeConfirmed = statutPaiementFacture && moisPaiement === currentMonthYear;

      // Pour la démo, nous voulons que les conventions en retard aient un statut "Confirmé" (incorrect)
      // Cela créera une incohérence visible dans "Changements de statut"
      const statutPourDemo = shouldBeConfirmed ? false : true; // Inverser pour créer l'incohérence

      await convention.update({
        statutConv: statutPourDemo
      }, { transaction });

      modifiedConventions.push({
        numConv: convention.numConv,
        client: locataire ? locataire.nomcli : 'N/A',
        description: description,
        statutActuel: statutPourDemo ? 'Confirmé' : 'En attente',
        statutAttendu: shouldBeConfirmed ? 'Confirmé' : 'En attente',
        dernierPaiement: moisPaiement
      });

      console.log(`   ✅ Convention #${convention.numConv} - ${locataire ? locataire.nomcli : 'N/A'} (${description})`);
    };

    // Créer des données variées pour la démonstration
    // Objectif: Avoir beaucoup de données avec statut "Confirmé" incorrect

    // 6 conventions avec paiement du mois précédent (retard 1 mois)
    for (let i = 0; i < 6 && index < allConventions.length; i++) {
      await modifyConvention(
        allConventions[index],
        prev1Month.monthYear,
        true, // Payée le mois précédent
        `Retard 1 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }

    // 6 conventions avec paiement de 2 mois en arrière (retard 2 mois)
    for (let i = 0; i < 6 && index < allConventions.length; i++) {
      await modifyConvention(
        allConventions[index],
        prev2Months.monthYear,
        true, // Payée il y a 2 mois
        `Retard 2 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }

    // 5 conventions avec paiement de 3 mois en arrière (retard 3 mois)
    for (let i = 0; i < 5 && index < allConventions.length; i++) {
      await modifyConvention(
        allConventions[index],
        prev3Months.monthYear,
        true, // Payée il y a 3 mois
        `Retard 3 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }

    // 4 conventions avec paiement de 4 mois en arrière (retard 4 mois)
    for (let i = 0; i < 4 && index < allConventions.length; i++) {
      await modifyConvention(
        allConventions[index],
        prev4Months.monthYear,
        true, // Payée il y a 4 mois
        `Retard 4 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }

    // 3 conventions avec paiement de 5 mois en arrière (retard 5 mois)
    for (let i = 0; i < 3 && index < allConventions.length; i++) {
      await modifyConvention(
        allConventions[index],
        prev5Months.monthYear,
        true, // Payée il y a 5 mois
        `Retard 5 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }

    // 2 conventions avec paiement de 6 mois en arrière (retard 6 mois)
    for (let i = 0; i < 2 && index < allConventions.length; i++) {
      await modifyConvention(
        allConventions[index],
        prev6Months.monthYear,
        true, // Payée il y a 6 mois
        `Retard 6 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }

    // 4 conventions avec facture non payée du mois actuel
    for (let i = 0; i < 4 && index < allConventions.length; i++) {
      await modifyConvention(
        allConventions[index],
        currentMonthYear,
        false, // Non payée le mois actuel
        `Sans paiement - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }

    console.log('─'.repeat(80));
    console.log('\n📊 RÉSUMÉ DES DONNÉES CRÉÉES:\n');
    console.log(`   • ${modifiedConventions.length} convention(s) modifiée(s)`);
    const enRetardCount = modifiedConventions.filter(c => c.statutAttendu === 'En attente').length;
    const aJourCount = modifiedConventions.filter(c => c.statutAttendu === 'Confirmé').length;
    console.log(`   • ${enRetardCount} convention(s) en retard (statut incorrect: Confirmé → devrait être En attente)`);
    console.log(`   • ${aJourCount} convention(s) à jour (statut incorrect: En attente → devrait être Confirmé)\n`);

    console.log('📝 DÉTAILS DES CONVENTIONS MODIFIÉES:\n');
    modifiedConventions.forEach((c, i) => {
      console.log(`   ${i + 1}. Convention #${c.numConv} - ${c.client}`);
      console.log(`      Statut actuel: ${c.statutActuel} ${c.statutActuel === c.statutAttendu ? '✅' : '❌'}`);
      console.log(`      Statut attendu: ${c.statutAttendu} ${c.statutActuel === c.statutAttendu ? '❌' : '✅'}`);
      console.log(`      Dernier paiement: ${c.dernierPaiement}`);
      console.log(`      ${c.description}\n`);
    });

    await transaction.commit();
    console.log('✅ Données de démonstration créées avec succès!\n');

    console.log('💡 POUR LA DÉMONSTRATION:\n');
    console.log('1. Ouvrir l\'application web');
    console.log('2. Se connecter en tant que Rédacteur');
    console.log('3. Aller dans "Changements de statut"');
    console.log('4. Cliquer sur "Actualiser"');
    console.log(`5. Tu devrais voir ${enRetardCount} convention(s) nécessitant une mise à jour`);
    console.log('6. Cliquer sur "Mettre à jour les statuts"');
    console.log('7. Vérifier que les statuts sont corrigés automatiquement');
    console.log('8. La liste des changements devrait se vider après la mise à jour\n');

    console.log('👀 POUR ADMIN ET CAISSIER (lecture seule):\n');
    console.log('1. Se connecter en tant qu\'Admin ou Caissier');
    console.log('2. Aller dans "Changements de statut"');
    console.log('3. Cliquer sur "Actualiser"');
    console.log(`4. Tu devrais voir ${enRetardCount} convention(s) nécessitant une mise à jour`);
    console.log('5. Mais tu ne peux PAS cliquer sur "Mettre à jour les statuts" (lecture seule)\n');

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Erreur:', err.message);
    throw err;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  createDemoStatusChanges().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = { createDemoStatusChanges };

