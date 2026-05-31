/**
 * Script pour réinitialiser les statuts des conventions pour la démonstration
 * 
 * Ce script remet les conventions dans un état où elles nécessitent une mise à jour,
 * permettant de refaire la démonstration à tout moment.
 * 
 * Utilisation: node reset-demo-statuses.js
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

async function resetDemoStatuses() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   RÉINITIALISATION DES STATUTS POUR DÉMONSTRATION         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Obtenir la date actuelle en heure Madagascar
    const currentYear = madagascarDate.getMadagascarYear();
    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentMonthYear = madagascarDate.getMadagascarMonthYear();
    
    // Calculer les mois précédents
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
    
    // Récupérer TOUTES les conventions disponibles pour la démonstration
    const allConventions = await Convention.findAll({
      limit: 50, // Augmenter pour avoir plus de données
      order: [['numConv', 'DESC']],
      transaction
    });
    
    console.log(`📋 ${allConventions.length} convention(s) trouvée(s)`);
    console.log('');
    
    // Récupérer le dernier dm
    const [dmResult] = await sequelize.query(
      'SELECT MAX(dm) as maxDm FROM facture',
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    let nextDm = (dmResult && dmResult.maxDm) ? dmResult.maxDm + 1 : 1;
    
    const resetConventions = [];
    let index = 0;
    
    console.log('🔄 RÉINITIALISATION DES STATUTS:');
    console.log('─'.repeat(80));
    
    // Fonction helper pour réinitialiser une convention
    const resetConvention = async (convention, moisPaiement, statutPaiement, description) => {
      // Récupérer le bâtiment et le locataire
      const [batiment, locataire] = await Promise.all([
        Mbatiment.findByPk(convention.numBat, { transaction }),
        Locataire.findByPk(convention.codeCli, { transaction })
      ]);
      
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
        await Facture.create({
          dm: nextDm++,
          exercice: madagascarDate.getMadagascarDate(),
          mois: `${moisPaiement}-01`,
          codegare: 1,
          depart: batiment && batiment.adresse ? batiment.adresse.substring(0, 10) : 'FIANARANTSOA',
          destination: locataire && locataire.adressecli ? locataire.adressecli.substring(0, 10) : 'LOCATAIRE',
          libelles: `Loyer ${moisPaiement}`,
          numBat: convention.numBat,
          numConv: convention.numConv,
          codeCli: convention.codeCli,
          statutPaiement: statutPaiement
        }, { transaction });
      } else {
        // Mettre à jour la facture existante
        await existingFacture.update({
          statutPaiement: statutPaiement
        }, { transaction });
      }
      
      // Mettre le statut à "Confirmé" (incorrect) pour les conventions en retard
      // ou "En attente" (incorrect) pour les conventions à jour
      const shouldBeConfirmed = statutPaiement && moisPaiement === currentMonthYear;
      const incorrectStatut = !shouldBeConfirmed; // Inverser pour créer une incohérence
      
      // FORCER le statut à true (Confirmé) pour les conventions en retard pour la démonstration
      // Cela permet de voir clairement le changement de "Confirmé" à "En attente"
      const statutPourDemo = shouldBeConfirmed ? false : true; // Toujours mettre "Confirmé" pour les retards
      
      await convention.update({
        statutConv: statutPourDemo
      }, { transaction });
      
      resetConventions.push({
        numConv: convention.numConv,
        client: locataire ? locataire.nomcli : 'N/A',
        description: description,
        statutActuel: statutPourDemo ? 'Confirmé' : 'En attente',
        statutAttendu: shouldBeConfirmed ? 'Confirmé' : 'En attente',
        dernierPaiement: moisPaiement
      });
      
      console.log(`   ✅ Convention #${convention.numConv} - ${locataire ? locataire.nomcli : 'N/A'} (${description})`);
    };
    
    // Réinitialiser PLUSIEURS conventions pour créer des scénarios de démonstration
    // Objectif: Avoir beaucoup de données avec statut "Confirmé" incorrect pour la démonstration
    
    // 5 conventions avec paiement du mois précédent (retard 1 mois)
    for (let i = 0; i < 5 && index < allConventions.length; i++) {
      await resetConvention(
        allConventions[index],
        prev1Month.monthYear,
        true,
        `Retard 1 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    // 5 conventions avec paiement de 2 mois en arrière (retard 2 mois)
    for (let i = 0; i < 5 && index < allConventions.length; i++) {
      await resetConvention(
        allConventions[index],
        prev2Months.monthYear,
        true,
        `Retard 2 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    // 5 conventions avec paiement de 3 mois en arrière (retard 3 mois)
    for (let i = 0; i < 5 && index < allConventions.length; i++) {
      await resetConvention(
        allConventions[index],
        prev3Months.monthYear,
        true,
        `Retard 3 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    // 5 conventions avec facture non payée du mois actuel
    for (let i = 0; i < 5 && index < allConventions.length; i++) {
      await resetConvention(
        allConventions[index],
        currentMonthYear,
        false,
        `Sans paiement - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    // Si on a encore des conventions, créer des retards de 4, 5, 6 mois pour plus de variété
    const prev4Months = getPreviousMonth(4);
    const prev5Months = getPreviousMonth(5);
    const prev6Months = getPreviousMonth(6);
    
    // 3 conventions avec retard de 4 mois
    for (let i = 0; i < 3 && index < allConventions.length; i++) {
      await resetConvention(
        allConventions[index],
        prev4Months.monthYear,
        true,
        `Retard 4 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    // 2 conventions avec retard de 5 mois
    for (let i = 0; i < 2 && index < allConventions.length; i++) {
      await resetConvention(
        allConventions[index],
        prev5Months.monthYear,
        true,
        `Retard 5 mois - Statut: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('📊 RÉSUMÉ DE LA RÉINITIALISATION:');
    console.log('');
    
    const enRetard = resetConventions.filter(c => c.statutAttendu === 'En attente').length;
    
    console.log(`   • ${resetConventions.length} convention(s) réinitialisée(s)`);
    console.log(`   • ${enRetard} convention(s) en retard (statut incorrect: Confirmé → devrait être En attente)`);
    console.log('');
    console.log('📝 CONVENTIONS RÉINITIALISÉES:');
    console.log('');
    
    resetConventions.forEach((conv, i) => {
      console.log(`   ${i + 1}. Convention #${conv.numConv} - ${conv.client}`);
      console.log(`      Statut actuel: ${conv.statutActuel} ❌`);
      console.log(`      Statut attendu: ${conv.statutAttendu} ✅`);
      console.log(`      Dernier paiement: ${conv.dernierPaiement}`);
      console.log('');
    });
    
    await transaction.commit();
    
    console.log('✅ Statuts réinitialisés avec succès!');
    console.log('');
    console.log('💡 MAINTENANT TU PEUX REFAIRE LA DÉMONSTRATION:');
    console.log('');
    console.log('1. Ouvrir l\'application web');
    console.log('2. Aller dans "Changements de statut"');
    console.log('3. Cliquer sur "Actualiser"');
    console.log(`4. Tu devrais voir ${enRetard} convention(s) nécessitant une mise à jour`);
    console.log('5. Cliquer sur "Mettre à jour les statuts"');
    console.log('6. Vérifier que les statuts sont corrigés automatiquement');
    console.log('');
    console.log('💾 Pour refaire la démonstration plus tard, exécute simplement:');
    console.log('   node reset-demo-statuses.js');
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

resetDemoStatuses();

