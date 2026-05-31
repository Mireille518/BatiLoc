require('dotenv').config();
const sequelize = require('./connection/db');
const bcrypt = require('bcryptjs');
const UserModel = require('./models/utilisateur')(sequelize, require('sequelize').DataTypes);

async function resetUsers() {
  try {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   RÉINITIALISATION DES UTILISATEURS                ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');

    // Connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');
    console.log('');

    // Supprimer tous les utilisateurs existants
    console.log('🗑️  Suppression de tous les utilisateurs existants...');
    const deletedCount = await UserModel.destroy({ where: {}, force: true });
    console.log(`   ${deletedCount} utilisateur(s) supprimé(s)`);
    console.log('');

    // Créer les nouveaux utilisateurs de test
    console.log('👤 Création des nouveaux utilisateurs de test...');
    console.log('');

    const users = [
      {
        matricule: 'ADMIN001',
        nom: 'Administrateur',
        contact: '0340000001',
        email: 'admin@batiment.com',
        mdp: '123456',
        poste: 'administrateur'
      },
      {
        matricule: 'CAIS001',
        nom: 'Caissier Test',
        contact: '0340000002',
        email: 'caissier@batiment.com',
        mdp: '123456',
        poste: 'caissier'
      },
      {
        matricule: 'OPER001',
        nom: 'Opérateur Test',
        contact: '0340000003',
        email: 'operateur@batiment.com',
        mdp: '123456',
        poste: 'opérateur de saisie'
      }
    ];

    for (const userData of users) {
      // Hasher le mot de passe
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.mdp, salt);

      // Créer l'utilisateur
      await UserModel.create({
        matricule: userData.matricule,
        nom: userData.nom,
        contact: userData.contact,
        email: userData.email,
        mdp: hashedPassword,
        poste: userData.poste.toLowerCase(),
        numConv: null
      });

      console.log(`   ✅ ${userData.poste.toUpperCase()}: ${userData.matricule} créé`);
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   IDENTIFIANTS DE CONNEXION                        ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 ADMINISTRATEUR:');
    console.log('   Matricule: ADMIN001');
    console.log('   Poste: Administrateur');
    console.log('   Mot de passe: 123456');
    console.log('');
    console.log('💰 CAISSIER:');
    console.log('   Matricule: CAIS001');
    console.log('   Poste: Caissier');
    console.log('   Mot de passe: 123456');
    console.log('');
    console.log('✍️  OPÉRATEUR:');
    console.log('   Matricule: OPER001');
    console.log('   Poste: Opérateur de saisie');
    console.log('   Mot de passe: 123456');
    console.log('');
    console.log('════════════════════════════════════════════════════');
    console.log('✅ RÉINITIALISATION TERMINÉE AVEC SUCCÈS!');
    console.log('════════════════════════════════════════════════════');
    console.log('');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR lors de la réinitialisation:');
    console.error('   ' + error.message);
    console.error('');
    if (error.stack) {
      console.error('Détails:');
      console.error(error.stack);
    }
    await sequelize.close();
    process.exit(1);
  }
}

resetUsers();

