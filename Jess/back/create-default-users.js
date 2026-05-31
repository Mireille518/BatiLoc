/**
 * Script pour créer les utilisateurs par défaut avec les matricules spécifiques
 * Matricules: 200000 (admin), 300000 (caissier), em-100900 (opérateur)
 * Utilisation: node create-default-users.js
 */
require('dotenv').config();
const sequelize = require('./connection/db');
const bcrypt = require('bcryptjs');
const { DataTypes } = require('sequelize');
const UserModel = require('./models/utilisateur')(sequelize, DataTypes);

async function createDefaultUsers() {
  try {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   CRÉATION DES UTILISATEURS PAR DÉFAUT             ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');

    // Connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');
    console.log('');

    // Définir les utilisateurs par défaut
    const defaultUsers = [
      {
        matricule: '200000',
        nom: 'Administrateur Principal',
        contact: '0320000003',
        email: 'admin@demo.local',
        mdp: 'azerty', // Mot de passe par défaut
        poste: 'administrateur'
      },
      {
        matricule: '300000',
        nom: 'Caissier',
        contact: '0320000002',
        email: 'caissier@demo.local',
        mdp: 'azerty', // Mot de passe par défaut
        poste: 'caissier'
      },
      {
        matricule: 'em-100900',
        nom: 'Opérateur de Saisie',
        contact: '0320000001',
        email: 'operateur@demo.local',
        mdp: 'azerty', // Mot de passe par défaut
        poste: 'opérateur de saisie'
      }
    ];

    console.log('👤 Création/Mise à jour des utilisateurs par défaut...');
    console.log('');

    for (const userData of defaultUsers) {
      try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await UserModel.findByPk(userData.matricule);

        if (existingUser) {
          // Mettre à jour l'utilisateur existant
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(userData.mdp, salt);

          await existingUser.update({
            nom: userData.nom,
            contact: userData.contact,
            email: userData.email,
            mdp: hashedPassword,
            poste: userData.poste.toLowerCase(),
            numConv: null
          });

          console.log(`   🔄 ${userData.poste.toUpperCase()}: ${userData.matricule} mis à jour`);
        } else {
          // Créer un nouvel utilisateur
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(userData.mdp, salt);

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
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`   ⚠️  ${userData.matricule}: Email ou contact déjà utilisé, mise à jour...`);
          // Essayer de mettre à jour en trouvant par email ou contact
          const userByEmail = await UserModel.findOne({
            where: { email: userData.email }
          });
          if (userByEmail) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.mdp, salt);
            await userByEmail.update({
              matricule: userData.matricule,
              nom: userData.nom,
              contact: userData.contact,
              mdp: hashedPassword,
              poste: userData.poste.toLowerCase(),
              numConv: null
            });
            console.log(`   🔄 ${userData.matricule} mis à jour via email`);
          }
        } else {
          console.error(`   ❌ Erreur pour ${userData.matricule}:`, error.message);
        }
      }
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   IDENTIFIANTS DE CONNEXION                        ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 ADMINISTRATEUR PRINCIPAL:');
    console.log('   Matricule: 200000');
    console.log('   Poste: administrateur');
    console.log('   Mot de passe: azerty');
    console.log('');
    console.log('💰 CAISSIER:');
    console.log('   Matricule: 300000');
    console.log('   Poste: caissier');
    console.log('   Mot de passe: azerty');
    console.log('');
    console.log('✍️  OPÉRATEUR DE SAISIE:');
    console.log('   Matricule: em-100900');
    console.log('   Poste: opérateur de saisie');
    console.log('   Mot de passe: azerty');
    console.log('');
    console.log('════════════════════════════════════════════════════');
    console.log('✅ CRÉATION TERMINÉE AVEC SUCCÈS!');
    console.log('════════════════════════════════════════════════════');
    console.log('');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR lors de la création:');
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

createDefaultUsers();

