require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);
const Locataire = require('./models/locataire')(sequelize, DataTypes);
const Convention = require('./models/convention')(sequelize, DataTypes);

const today = new Date().toISOString().split('T')[0];

const samples = [
  {
    numBat: 1010,
    adresse: 'Rue de la Gare',
    ville: 'Fianarantsoa',
    quartier: 'Centre-ville',
    latitude: -21.4558,
    longitude: 47.0817,
    montant: 450000,
    statut: true,
    cin: '182903456',
    nomcli: 'Hery Ranarivelo',
    activite: 'Commerce',
    adressecli: 'Ravalo'
  },
  {
    numBat: 1020,
    adresse: 'Rue Analakely',
    ville: 'Fianarantsoa',
    quartier: 'Anosy',
    latitude: -21.4544,
    longitude: 47.0832,
    montant: 620000,
    statut: true,
    cin: '182903457',
    nomcli: 'Fanja Andrianasolo',
    activite: 'Hôtellerie',
    adressecli: 'Analakely'
  },
  {
    numBat: 1035,
    adresse: 'Avenue des Bubus',
    ville: 'Fianarantsoa',
    quartier: 'Ambalavao',
    latitude: -21.4631,
    longitude: 47.0736,
    montant: 380000,
    statut: false,
    cin: '182903458',
    nomcli: 'Andry Tahiana',
    activite: 'Services',
    adressecli: 'Tsarasand'
  }
];

async function seed() {
  try {
    await sequelize.authenticate();

    for (const sample of samples) {
      const payload = {
        numBat: sample.numBat,
        image: Buffer.from('seed'),
        adresse: sample.adresse,
        ville: sample.ville,
        quartier: sample.quartier,
        latitude: sample.latitude,
        longitude: sample.longitude,
        montant: sample.montant,
        statut: sample.statut
      };

      const [batiment] = await Mbatiment.upsert(payload, { returning: true });
      console.log(`Bâtiment ${sample.numBat} prêt (${sample.adresse}).`);

      const locPayload = {
        nomcli: sample.nomcli,
        datenais: '1993-07-12',
        lieunais: 'Fianarantsoa',
        pere: 'Rakotozafy',
        mere: 'Raharinjatovo',
        cin: sample.cin,
        delivcin: '2014-08-20',
        adressecli: sample.adressecli.substring(0, 10),
        activite: sample.activite
      };

      const [locataire] = await Locataire.findOrCreate({
        where: { cin: sample.cin },
        defaults: locPayload
      });

      const conventionExists = await Convention.findOne({
        where: {
          numBat: sample.numBat,
          codeCli: locataire.codeCli
        }
      });

      if (!conventionExists) {
        await Convention.create({
          lieu: sample.adresse.substring(0, 10).toUpperCase(),
          dateConv: today,
          statutConv: sample.statut,
          numFact: null,
          numBat: sample.numBat,
          codeCli: locataire.codeCli
        });
        console.log(`Convention générée pour ${sample.nomcli}.`);
      } else {
        console.log(`Convention existante pour ${sample.nomcli}, aucun doublon.`);
      }
    }

    await sequelize.close();
    console.log('✅ Données de démonstration prêtes.');
  } catch (error) {
    console.error('❌ Erreur lors de la génération des données de test:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

seed();

