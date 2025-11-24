/**
 * Script de test de connexion à la base de données
 * Utilisation: node test-db-connection.js
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

async function testConnection() {
  console.log('\n🔍 Test de connexion à la base de données WAMP...\n');
  console.log('📋 Configuration:');
  console.log(`   - Host: ${process.env.DB_HOST || '127.0.0.1'}`);
  console.log(`   - Database: ${process.env.DB_NAME || 'batiment'}`);
  console.log(`   - User: ${process.env.DB_USER || 'root'}`);
  console.log(`   - Port: ${process.env.DB_PORT || '3306'}\n`);

  try {
    // Test de connexion
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie!\n');

    // Vérifier les tables existantes
    console.log('📊 Vérification des tables...\n');
    
    // Test utilisateurs
    const userCount = await UserModel.count();
    console.log(`   ✓ Table 'utilisateur': ${userCount} utilisateurs trouvés`);
    
    if (userCount > 0) {
      const users = await UserModel.findAll({
        attributes: ['matricule', 'nom', 'email', 'poste'],
        limit: 5
      });
      console.log('\n   👥 Exemples d\'utilisateurs:');
      users.forEach(user => {
        console.log(`      - ${user.matricule}: ${user.nom} (${user.poste})`);
      });
    }

    // Test bâtiments
    const batimentCount = await BatimentModel.count();
    console.log(`\n   ✓ Table 'mbatiment': ${batimentCount} bâtiments trouvés`);

    // Test conventions
    const conventionCount = await ConventionModel.count();
    console.log(`   ✓ Table 'convention': ${conventionCount} conventions trouvées`);

    // Test factures
    const factureCount = await FactureModel.count();
    console.log(`   ✓ Table 'facture': ${factureCount} factures trouvées`);

    // Test locataires
    const locataireCount = await LocataireModel.count();
    console.log(`   ✓ Table 'locataire': ${locataireCount} locataires trouvés`);

    console.log('\n✨ Toutes les tables sont accessibles!\n');
    console.log('🚀 Vous pouvez maintenant démarrer le serveur avec: npm start\n');

  } catch (error) {
    console.error('❌ Erreur de connexion:\n');
    
    if (error.original) {
      console.error(`   Code: ${error.original.code}`);
      console.error(`   Message: ${error.original.sqlMessage || error.original.message}\n`);
      
      // Messages d'aide selon l'erreur
      if (error.original.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('💡 Solutions possibles:');
        console.error('   1. Vérifiez le nom d\'utilisateur et mot de passe dans .env');
        console.error('   2. Vérifiez que MySQL/WAMP est démarré');
        console.error('   3. Vérifiez les permissions de l\'utilisateur MySQL\n');
      } else if (error.original.code === 'ER_BAD_DB_ERROR') {
        console.error('💡 Solutions possibles:');
        console.error('   1. La base de données "batiment" n\'existe pas');
        console.error('   2. Créez la base de données dans phpMyAdmin');
        console.error('   3. Ou changez DB_NAME dans .env\n');
      } else if (error.original.code === 'ECONNREFUSED') {
        console.error('💡 Solutions possibles:');
        console.error('   1. WAMP/MySQL n\'est pas démarré');
        console.error('   2. Vérifiez que l\'icône WAMP est verte');
        console.error('   3. Vérifiez le port MySQL (par défaut 3306)\n');
      }
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Exécuter le test
testConnection();
