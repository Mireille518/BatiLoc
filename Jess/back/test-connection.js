// Script de test de connexion
require('dotenv').config();
const sequelize = require('./connection/db');

console.log('🔍 Test de connexion à la base de données...');
console.log('Configuration:');
console.log('  DB_HOST:', process.env.DB_HOST || '127.0.0.1');
console.log('  DB_NAME:', process.env.DB_NAME || 'batiment');
console.log('  DB_USER:', process.env.DB_USER || 'root');
console.log('  DB_PASS:', process.env.DB_PASS ? '***' : '(vide)');
console.log('');

sequelize.authenticate()
  .then(() => {
    console.log('✅ Connexion réussie !');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion:', err.message);
    console.error('');
    console.error('💡 Solutions possibles:');
    console.error('  1. Vérifiez que MySQL est démarré');
    console.error('  2. Vérifiez les credentials dans .env');
    console.error('  3. Vérifiez que la base de données existe');
    console.error('  4. Créez la base si nécessaire: CREATE DATABASE batiment;');
    process.exit(1);
  });


