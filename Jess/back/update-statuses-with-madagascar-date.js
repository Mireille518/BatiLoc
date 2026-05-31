/**
 * Script pour charger et mettre à jour les statuts des conventions existantes
 * selon la nouvelle logique basée sur la date Madagascar (UTC+3)
 * 
 * Ce script applique la logique de vérification mensuelle :
 * - Compare le mois/année du dernier paiement avec le mois/année actuel (Madagascar)
 * - Met à jour le statut à "en attente" si le paiement du mois courant n'existe pas
 * - Gère le changement d'année automatiquement
 * 
 * Utilisation: node update-statuses-with-madagascar-date.js
 */

require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes, Op } = require('sequelize');
const madagascarDate = require('./utils/madagascarDate');

// Chargement des modèles
const Convention = require('./models/convention')(sequelize, DataTypes);
const Facture = require('./models/facture')(sequelize, DataTypes);

async function updateConventionStatuses() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   MISE À JOUR DES STATUTS AVEC DATE MADAGASCAR (UTC+3)     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Obtenir la date actuelle en heure Madagascar (UTC+3)
    const currentYear = madagascarDate.getMadagascarYear();
    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentMonthYear = madagascarDate.getMadagascarMonthYear();
    
    console.log(`📅 Date actuelle (Madagascar UTC+3): ${currentMonthYear}`);
    console.log(`   Année: ${currentYear}, Mois: ${String(currentMonth).padStart(2, '0')}`);
    console.log('');
    
    // Récupérer toutes les conventions
    console.log('🔄 Chargement des conventions existantes...');
    const conventions = await Convention.findAll({
      order: [['numConv', 'ASC']],
      transaction
    });
    
    console.log(`📋 ${conventions.length} convention(s) trouvée(s)\n`);
    
    if (conventions.length === 0) {
      console.log('ℹ️  Aucune convention à traiter');
      await transaction.commit();
      await sequelize.close();
      process.exit(0);
    }
    
    let updatedCount = 0;
    let checkedCount = 0;
    const details = [];
    
    console.log('📊 Analyse des statuts:\n');
    console.log('─'.repeat(80));
    
    // Pour chaque convention, vérifier le dernier paiement
    for (const convention of conventions) {
      checkedCount++;
      
      // Trouver la dernière facture payée pour cette convention
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
      
      // Si aucune facture payée n'existe, mettre le statut à "en attente"
      if (!lastPaidFacture) {
        if (convention.statutConv === true) {
          newStatut = false;
          reason = 'Aucun paiement trouvé';
        } else {
          reason = 'Aucun paiement (déjà en attente)';
        }
      } else {
        // Extraire le mois/année de la dernière facture payée
        const factureMois = new Date(lastPaidFacture.mois);
        const factureYear = factureMois.getFullYear();
        const factureMonth = factureMois.getMonth() + 1;
        const factureMonthYear = `${factureYear}-${String(factureMonth).padStart(2, '0')}`;
        
        // Comparer avec le mois/année actuel en heure Madagascar (comparaison mois/année uniquement)
        const isCurrentMonthPaid = (factureYear === currentYear && factureMonth === currentMonth);
        
        // Si le paiement du mois courant n'existe pas, mettre le statut à "en attente"
        if (!isCurrentMonthPaid) {
          if (convention.statutConv === true) {
            newStatut = false;
            reason = `Dernier paiement: ${factureMonthYear} ≠ mois actuel (${currentMonthYear})`;
          } else {
            reason = `Dernier paiement: ${factureMonthYear} ≠ mois actuel (déjà en attente)`;
          }
        } else {
          // Si le paiement du mois courant existe, s'assurer que le statut est "Confirmé"
          if (convention.statutConv === false) {
            newStatut = true;
            reason = `Paiement du mois actuel (${currentMonthYear}) trouvé`;
          } else {
            reason = `Paiement du mois actuel (${currentMonthYear}) - OK`;
          }
        }
      }
      
      // Mettre à jour si nécessaire
      if (previousStatut !== newStatut) {
        await convention.update({ statutConv: newStatut }, { transaction });
        updatedCount++;
        
        const statutLabel = newStatut ? 'Confirmé' : 'En attente';
        const previousLabel = previousStatut ? 'Confirmé' : 'En attente';
        
        console.log(`  ✅ Convention #${convention.numConv}`);
        console.log(`     ${previousLabel} → ${statutLabel}`);
        console.log(`     Raison: ${reason}`);
        console.log('');
        
        details.push({
          numConv: convention.numConv,
          previous: previousLabel,
          new: statutLabel,
          reason
        });
      } else {
        // Afficher les conventions qui n'ont pas changé (optionnel, commenté pour réduire le bruit)
        // console.log(`  ℹ️  Convention #${convention.numConv}: ${previousStatut ? 'Confirmé' : 'En attente'} - ${reason}`);
      }
    }
    
    console.log('─'.repeat(80));
    console.log('');
    console.log('📈 Résumé:');
    console.log(`   • Conventions vérifiées: ${checkedCount}`);
    console.log(`   • Statuts mis à jour: ${updatedCount}`);
    console.log(`   • Aucun changement: ${checkedCount - updatedCount}`);
    console.log('');
    
    if (updatedCount > 0) {
      console.log('📋 Détails des mises à jour:');
      details.forEach((detail, index) => {
        console.log(`   ${index + 1}. Convention #${detail.numConv}: ${detail.previous} → ${detail.new}`);
        console.log(`      ${detail.reason}`);
      });
      console.log('');
    }
    
    // Valider la transaction
    await transaction.commit();
    
    console.log('✅ Mise à jour terminée avec succès!');
    console.log('');
    console.log('💡 Note: Les statuts sont maintenant basés sur la date Madagascar (UTC+3)');
    console.log('   et seront mis à jour automatiquement au démarrage du serveur.');
    console.log('');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (err) {
    // Rollback en cas d'erreur
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    console.error('\n❌ Erreur lors de la mise à jour des statuts:');
    console.error(err.message);
    console.error(err.stack);
    
    await sequelize.close();
    process.exit(1);
  }
}

// Exécuter le script
updateConventionStatuses();

