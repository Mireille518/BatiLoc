require('dotenv').config();
const sequelize = require('./connection/db');
const UserModel = require('./models/utilisateur')(sequelize, require('sequelize').DataTypes);

async function verifierUtilisateurs() {
  try {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   VÉRIFICATION DES UTILISATEURS DANS WAMP          ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');

    // Connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');
    console.log('');

    // Récupérer tous les utilisateurs
    const users = await UserModel.findAll({
      attributes: ['matricule', 'nom', 'contact', 'email', 'poste', 'numConv'],
      order: [['poste', 'ASC'], ['nom', 'ASC']]
    });

    if (users.length === 0) {
      console.log('⚠️  Aucun utilisateur trouvé dans la base de données');
      console.log('');
      console.log('💡 Pour créer des utilisateurs de test, exécutez:');
      console.log('   node reset-users.js');
    } else {
      console.log(`📊 Nombre total d'utilisateurs: ${users.length}`);
      console.log('');

      // Grouper par poste
      const parPoste = {};
      users.forEach(user => {
        const poste = user.poste || 'non défini';
        if (!parPoste[poste]) {
          parPoste[poste] = [];
        }
        parPoste[poste].push(user);
      });

      // Afficher par poste
      Object.keys(parPoste).sort().forEach(poste => {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📋 ${poste.toUpperCase()} (${parPoste[poste].length})`);
        console.log(`${'─'.repeat(60)}`);
        
        parPoste[poste].forEach((user, index) => {
          console.log(`${index + 1}. Matricule: ${user.matricule}`);
          console.log(`   Nom: ${user.nom}`);
          console.log(`   Email: ${user.email || 'non défini'}`);
          console.log(`   Contact: ${user.contact || 'non défini'}`);
          if (user.numConv) {
            console.log(`   Convention: ${user.numConv}`);
          }
          console.log('');
        });
      });

      // Afficher les identifiants de connexion
      console.log(`${'═'.repeat(60)}`);
      console.log('🔑 IDENTIFIANTS DE CONNEXION');
      console.log(`${'═'.repeat(60)}`);
      console.log('');
      
      users.forEach(user => {
        console.log(`📌 ${user.poste?.toUpperCase() || 'NON DÉFINI'}`);
        console.log(`   Matricule: ${user.matricule}`);
        console.log(`   Poste: ${user.poste || 'non défini'}`);
        console.log(`   Nom: ${user.nom}`);
        console.log('');
      });

      console.log('💡 Mot de passe par défaut: 123456');
      console.log('   (ou le mot de passe que vous avez défini)');
    }

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ ERREUR lors de la vérification:');
    console.error('   ' + error.message);
    console.error('');
    if (error.original) {
      console.error('Détails SQL:');
      console.error('   Code: ' + (error.original.code || 'N/A'));
      console.error('   Message: ' + (error.original.sqlMessage || error.original.message || 'N/A'));
    }
    await sequelize.close();
    process.exit(1);
  }
}

verifierUtilisateurs();

