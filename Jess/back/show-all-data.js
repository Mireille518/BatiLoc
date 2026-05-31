/**
 * Script pour afficher toutes les données de la base de données
 * Utilisation: node show-all-data.js
 */
require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

// Chargement des modèles
const UserModel = require('./models/utilisateur')(sequelize, DataTypes);
const BatimentModel = require('./models/mbatiment')(sequelize, DataTypes);
const ConventionModel = require('./models/convention')(sequelize, DataTypes);
const FactureModel = require('./models/facture')(sequelize, DataTypes);
const LocataireModel = require('./models/locataire')(sequelize, DataTypes);

async function showAllData() {
  try {
    await sequelize.authenticate();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   TOUTES LES DONNÉES DE LA BASE DE DONNÉES                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`📊 Base de données: ${process.env.DB_NAME || 'batiment'}`);
    console.log(`📍 Serveur: ${process.env.DB_HOST || '127.0.0.1'}`);
    console.log('');

    // ============================================
    // UTILISATEURS
    // ============================================
    console.log('👥 UTILISATEURS');
    console.log('═'.repeat(60));
    const users = await UserModel.findAll({
      attributes: ['matricule', 'nom', 'email', 'contact', 'poste'],
      order: [['matricule', 'ASC']]
    });
    
    if (users.length === 0) {
      console.log('   Aucun utilisateur trouvé');
    } else {
      console.log(`   Total: ${users.length} utilisateur(s)\n`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.nom}`);
        console.log(`      Matricule: ${user.matricule}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Contact: ${user.contact}`);
        console.log(`      Poste: ${user.poste}`);
        console.log('');
      });
    }

    // ============================================
    // BÂTIMENTS
    // ============================================
    console.log('🏢 BÂTIMENTS');
    console.log('═'.repeat(60));
    const batiments = await BatimentModel.findAll({
      attributes: ['numBat', 'adresse', 'montant', 'statut'],
      order: [['numBat', 'ASC']]
    });
    
    if (batiments.length === 0) {
      console.log('   Aucun bâtiment trouvé');
    } else {
      console.log(`   Total: ${batiments.length} bâtiment(s)\n`);
      batiments.forEach((bat, index) => {
        console.log(`   ${index + 1}. Bâtiment #${bat.numBat}`);
        console.log(`      Adresse: ${bat.adresse}`);
        console.log(`      Montant: ${bat.montant?.toLocaleString('fr-FR') || 'N/A'} Ar`);
        console.log(`      Statut: ${bat.statut ? '✅ Actif' : '❌ Inactif'}`);
        console.log('');
      });
    }

    // ============================================
    // LOCATAIRES
    // ============================================
    console.log('👤 LOCATAIRES');
    console.log('═'.repeat(60));
    const locataires = await LocataireModel.findAll({
      attributes: ['codeCli', 'nomcli', 'cin', 'activite', 'adressecli'],
      order: [['codeCli', 'ASC']]
    });
    
    if (locataires.length === 0) {
      console.log('   Aucun locataire trouvé');
    } else {
      console.log(`   Total: ${locataires.length} locataire(s)\n`);
      locataires.forEach((loc, index) => {
        console.log(`   ${index + 1}. ${loc.nomcli}`);
        console.log(`      Code: ${loc.codeCli}`);
        console.log(`      CIN: ${loc.cin}`);
        console.log(`      Activité: ${loc.activite}`);
        console.log(`      Adresse: ${loc.adressecli}`);
        console.log('');
      });
    }

    // ============================================
    // CONVENTIONS
    // ============================================
    console.log('📄 CONVENTIONS');
    console.log('═'.repeat(60));
    const conventions = await ConventionModel.findAll({
      attributes: ['numConv', 'dateConv', 'statutConv', 'numBat', 'codeCli'],
      order: [['numConv', 'ASC']]
    });
    
    if (conventions.length === 0) {
      console.log('   Aucune convention trouvée');
    } else {
      console.log(`   Total: ${conventions.length} convention(s)\n`);
      conventions.forEach((conv, index) => {
        console.log(`   ${index + 1}. Convention #${conv.numConv}`);
        console.log(`      Date: ${conv.dateConv || 'N/A'}`);
        console.log(`      Statut: ${conv.statutConv ? '✅ Confirmée' : '⏳ En attente'}`);
        console.log(`      Bâtiment: #${conv.numBat}`);
        console.log(`      Locataire: #${conv.codeCli}`);
        console.log('');
      });
    }

    // ============================================
    // FACTURES
    // ============================================
    console.log('💰 FACTURES');
    console.log('═'.repeat(60));
    const factures = await FactureModel.findAll({
      attributes: ['numFact', 'dm', 'exercice', 'mois', 'numConv', 'statutPaiement'],
      order: [['numFact', 'ASC']]
    });
    
    if (factures.length === 0) {
      console.log('   Aucune facture trouvée');
    } else {
      console.log(`   Total: ${factures.length} facture(s)\n`);
      factures.forEach((fact, index) => {
        console.log(`   ${index + 1}. Facture #${fact.numFact}`);
        console.log(`      DM: ${fact.dm}`);
        console.log(`      Exercice: ${fact.exercice || 'N/A'}`);
        console.log(`      Mois: ${fact.mois || 'N/A'}`);
        console.log(`      Convention: #${fact.numConv}`);
        console.log(`      Statut paiement: ${fact.statutPaiement ? '✅ Payé' : '⏳ En attente'}`);
        console.log('');
      });
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    console.log('═'.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('═'.repeat(60));
    console.log(`   Utilisateurs: ${users.length}`);
    console.log(`   Bâtiments: ${batiments.length}`);
    console.log(`   Locataires: ${locataires.length}`);
    console.log(`   Conventions: ${conventions.length}`);
    console.log(`   Factures: ${factures.length}`);
    console.log('');
    console.log('💡 Pour accéder à la base de données:');
    console.log('   - phpMyAdmin: http://localhost/phpmyadmin');
    console.log('   - Base de données: batiment');
    console.log('   - Tables: utilisateur, mbatiment, locataire, convention, facture');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.original) {
      console.error(`   Code SQL: ${error.original.code}`);
      console.error(`   Message: ${error.original.sqlMessage}`);
    }
  } finally {
    await sequelize.close();
  }
}

showAllData();

