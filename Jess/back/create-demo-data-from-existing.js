/**
 * Script pour créer des données de démonstration à partir des conventions existantes
 * 
 * Ce script modifie des conventions existantes pour qu'elles nécessitent une mise à jour :
 * - Met des statuts "Confirmé" sur des conventions qui devraient être "En attente"
 * - Crée des factures avec des paiements de mois précédents
 * - Permet de démontrer le système de mise à jour automatique des statuts
 * 
 * Utilisation: node create-demo-data-from-existing.js
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

async function createDemoData() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   CRÉATION DE DONNÉES DE DÉMONSTRATION                    ║');
    console.log('║   À partir des conventions existantes                    ║');
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
    
    // Récupérer les conventions existantes (exclure celles créées récemment pour la démo)
    const existingConventions = await Convention.findAll({
      where: {
        dateConv: {
          [Op.lt]: `${currentYear}-01-01` // Conventions d'avant cette année
        }
      },
      limit: 15,
      order: [['numConv', 'DESC']],
      transaction
    });
    
    if (existingConventions.length < 10) {
      console.log('⚠️  Moins de 10 conventions existantes trouvées. Création de données supplémentaires...');
      // Si pas assez, prendre toutes les conventions disponibles
      const allConventions = await Convention.findAll({
        limit: 15,
        order: [['numConv', 'DESC']],
        transaction
      });
      existingConventions.length = 0;
      existingConventions.push(...allConventions);
    }
    
    console.log(`📋 ${existingConventions.length} convention(s) existante(s) trouvée(s)`);
    console.log('');
    
    // Récupérer le dernier dm
    const [dmResult] = await sequelize.query(
      'SELECT MAX(dm) as maxDm FROM facture',
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    let nextDm = (dmResult && dmResult.maxDm) ? dmResult.maxDm + 1 : 1;
    
    const modifiedConventions = [];
    let index = 0;
    
    console.log('🔄 MODIFICATION DES CONVENTIONS EXISTANTES:');
    console.log('─'.repeat(80));
    
    // Fonction helper pour modifier une convention
    const modifyConvention = async (convention, moisPaiement, statutPaiement, description) => {
      // Vérifier si une facture existe déjà pour cette convention ce mois-ci
      const existingFacture = await Facture.findOne({
        where: {
          numConv: convention.numConv,
          mois: `${moisPaiement}-01`
        },
        transaction
      });
      
      // Récupérer le bâtiment et le locataire pour les adresses
      const [batiment, locataire] = await Promise.all([
        Mbatiment.findByPk(convention.numBat, { transaction }),
        Locataire.findByPk(convention.codeCli, { transaction })
      ]);
      
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
      
      // Modifier le statut de la convention pour qu'il soit incorrect
      // Si le paiement est d'un mois précédent ou non payé, mettre statutConv à true (Confirmé - incorrect)
      // Si le paiement est du mois actuel, mettre statutConv à false (En attente - incorrect)
      const shouldBeConfirmed = statutPaiement && moisPaiement === currentMonthYear;
      const incorrectStatut = !shouldBeConfirmed; // Inverser pour créer une incohérence
      
      await convention.update({
        statutConv: incorrectStatut
      }, { transaction });
      modifiedConventions.push({
        numConv: convention.numConv,
        client: locataire ? locataire.nomcli : 'N/A',
        description: description,
        statutActuel: incorrectStatut ? 'Confirmé' : 'En attente',
        statutAttendu: shouldBeConfirmed ? 'Confirmé' : 'En attente',
        dernierPaiement: moisPaiement
      });
      
      console.log(`   ✅ Convention #${convention.numConv} - ${locataire ? locataire.nomcli : 'N/A'} (${description})`);
    };
    
    // Modifier 10 conventions existantes pour créer des scénarios de démonstration
    
    // 3 conventions avec paiement du mois précédent (devraient être "En attente" mais sont "Confirmé")
    for (let i = 0; i < 3 && index < existingConventions.length; i++) {
      await modifyConvention(
        existingConventions[index],
        prev1Month.monthYear,
        true,
        `Retard 1 mois - Statut incorrect: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    // 3 conventions avec paiement de 2 mois en arrière
    for (let i = 0; i < 3 && index < existingConventions.length; i++) {
      await modifyConvention(
        existingConventions[index],
        prev2Months.monthYear,
        true,
        `Retard 2 mois - Statut incorrect: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    // 2 conventions avec paiement de 3 mois en arrière
    for (let i = 0; i < 2 && index < existingConventions.length; i++) {
      await modifyConvention(
        existingConventions[index],
        prev3Months.monthYear,
        true,
        `Retard 3 mois - Statut incorrect: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    // 2 conventions avec facture non payée du mois actuel
    for (let i = 0; i < 2 && index < existingConventions.length; i++) {
      await modifyConvention(
        existingConventions[index],
        currentMonthYear,
        false,
        `Sans paiement - Statut incorrect: Confirmé (devrait être En attente)`
      );
      index++;
    }
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('📊 RÉSUMÉ DES MODIFICATIONS:');
    console.log('');
    
    const enRetard = modifiedConventions.filter(c => c.statutAttendu === 'En attente').length;
    const aJour = modifiedConventions.filter(c => c.statutAttendu === 'Confirmé').length;
    
    console.log(`   • ${modifiedConventions.length} convention(s) modifiée(s)`);
    console.log(`   • ${enRetard} convention(s) en retard (statut incorrect: Confirmé → devrait être En attente)`);
    console.log(`   • ${aJour} convention(s) à jour (statut incorrect: En attente → devrait être Confirmé)`);
    console.log('');
    console.log('📝 DÉTAILS DES CONVENTIONS MODIFIÉES:');
    console.log('');
    
    modifiedConventions.forEach((conv, i) => {
      console.log(`   ${i + 1}. Convention #${conv.numConv} - ${conv.client}`);
      console.log(`      Statut actuel: ${conv.statutActuel} ❌`);
      console.log(`      Statut attendu: ${conv.statutAttendu} ✅`);
      console.log(`      Dernier paiement: ${conv.dernierPaiement}`);
      console.log(`      ${conv.description}`);
      console.log('');
    });
    
    await transaction.commit();
    
    console.log('✅ Données de démonstration créées avec succès!');
    console.log('');
    console.log('💡 POUR LA DÉMONSTRATION:');
    console.log('');
    console.log('1. Ouvrir l\'application web');
    console.log('2. Aller dans "Changements de statut"');
    console.log('3. Cliquer sur "Actualiser"');
    console.log(`4. Tu devrais voir ${enRetard} convention(s) nécessitant une mise à jour`);
    console.log('5. Cliquer sur "Mettre à jour les statuts"');
    console.log('6. Vérifier que les statuts sont corrigés automatiquement');
    console.log('7. Aller dans "Conventions" pour voir les changements');
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

createDemoData();

