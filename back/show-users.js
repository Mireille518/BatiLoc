/**
 * Script pour afficher les informations des utilisateurs
 * Utilisation: node show-users.js
 */
require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');
const UserModel = require('./models/utilisateur')(sequelize, DataTypes);

async function showUsers() {
  try {
    await sequelize.authenticate();
    
    const users = await UserModel.findAll({
      attributes: ['matricule', 'nom', 'email', 'contact', 'poste', 'mdp'],
      order: [['matricule', 'ASC']]
    });

    console.log('\n👥 LISTE DES UTILISATEURS DANS LA BASE DE DONNÉES\n');
    console.log('='.repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. Utilisateur: ${user.nom}`);
      console.log(`   Matricule: ${user.matricule}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Contact: ${user.contact}`);
      console.log(`   Poste: ${user.poste}`);
      console.log(`   Mot de passe hashé: ${user.mdp ? 'Oui (bcrypt)' : 'Non défini'}`);
      console.log(`   Hash: ${user.mdp ? user.mdp.substring(0, 30) + '...' : 'N/A'}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 INFORMATIONS DE CONNEXION:');
    console.log('   - Pour vous connecter, utilisez:');
    console.log('     • Matricule (ex: 200000, 300000, ADMIN001, em-100900)');
    console.log('     • Poste (administrateur, caissier, opérateur de saisie)');
    console.log('     • Mot de passe (celui défini lors de l\'inscription)');
    console.log('\n   - Si vous ne connaissez pas le mot de passe, vous pouvez:');
    console.log('     • Créer un nouveau compte via l\'interface d\'inscription');
    console.log('     • Ou réinitialiser le mot de passe via phpMyAdmin\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await sequelize.close();
  }
}

showUsers();
