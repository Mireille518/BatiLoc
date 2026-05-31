require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);

/**
 * Liste d'exemples de bâtiments existants avec des coordonnées réalistes
 * (approximations pour Fianarantsoa). Ajuste les numBat/coordinates comme nécessaire.
 */
const updates = [
  { numBat: 1002, latitude: -21.4580, longitude: 47.0890 },
  { numBat: 1003, latitude: -21.4570, longitude: 47.0880 },
  { numBat: 1004, latitude: -21.4550, longitude: 47.0860 },
  { numBat: 1005, latitude: -21.4530, longitude: 47.0850 },
  { numBat: 1006, latitude: -21.4520, longitude: 47.0830 },
  { numBat: 1007, latitude: -21.4500, longitude: 47.0820 },
  { numBat: 1008, latitude: -21.4490, longitude: 47.0810 },
  { numBat: 1010, latitude: -21.4558, longitude: 47.0817 },
  { numBat: 1020, latitude: -21.4544, longitude: 47.0832 },
  { numBat: 1035, latitude: -21.4631, longitude: 47.0736 },
  { numBat: 1048, latitude: -21.4554, longitude: 47.0801 },
  { numBat: 1055, latitude: -21.4529, longitude: 47.0873 },
  { numBat: 1062, latitude: -21.4511, longitude: 47.0752 }
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connexion DB OK — mise à jour des coordonnées...');

    for (const update of updates) {
      const bat = await Mbatiment.findByPk(update.numBat);
      if (!bat) {
        console.warn(`⚠️  Bâtiment ${update.numBat} non trouvé, ignoré.`);
        continue;
      }
      await bat.update({
        latitude: update.latitude,
        longitude: update.longitude
      });
      console.log(`✓ Bâtiment ${update.numBat} mis à jour (${update.latitude}, ${update.longitude}).`);
    }

    await sequelize.close();
    console.log('Terminé — toutes les coordonnées mises à jour.');
  } catch (error) {
    console.error('Erreur lors de la mise à jour des coordonnées :', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

run();

