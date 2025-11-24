/**
 * Script d'insertion de données de test pour l'opérateur de saisie
 * Ce script crée des bâtiments, locataires et conventions de test
 * Utilisation: node seed-data-operateur.js
 */
require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

// Chargement des modèles
const MbatimentModel = require('./models/mbatiment')(sequelize, DataTypes);
const LocataireModel = require('./models/locataire')(sequelize, DataTypes);
const ConventionModel = require('./models/convention')(sequelize, DataTypes);

// Fonction pour générer une date aléatoire
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Fonction pour obtenir l'année courante au format DATEONLY
function getCurrentYearDateOnly() {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

// Données de test
const batimentsData = [
  {
    numBat: 1001,
    adresse: 'Rue Ravalomanda',
    montant: 150000,
    statut: true,
    // Image fictive (petit buffer)
    image: Buffer.from('IMAGE_BATIMENT_1001')
  },
  {
    numBat: 1002,
    adresse: 'Avenue Rainibe',
    montant: 200000,
    statut: true,
    image: Buffer.from('IMAGE_BATIMENT_1002')
  },
  {
    numBat: 1003,
    adresse: 'Boulevard Ratsima',
    montant: 180000,
    statut: true,
    image: Buffer.from('IMAGE_BATIMENT_1003')
  },
  {
    numBat: 1004,
    adresse: 'Route Ambohima',
    montant: 250000,
    statut: true,
    image: Buffer.from('IMAGE_BATIMENT_1004')
  },
  {
    numBat: 1005,
    adresse: 'Cité Mahazo',
    montant: 175000,
    statut: true,
    image: Buffer.from('IMAGE_BATIMENT_1005')
  },
  {
    numBat: 1006,
    adresse: 'Quartier Ankadif',
    montant: 220000,
    statut: false, // Bâtiment non disponible
    image: Buffer.from('IMAGE_BATIMENT_1006')
  },
  {
    numBat: 1007,
    adresse: 'Zone Betsileo',
    montant: 160000,
    statut: true,
    image: Buffer.from('IMAGE_BATIMENT_1007')
  },
  {
    numBat: 1008,
    adresse: 'Secteur Tsaraso',
    montant: 190000,
    statut: true,
    image: Buffer.from('IMAGE_BATIMENT_1008')
  }
];

const locatairesData = [
  {
    nomcli: 'RAKOTO Jean Marie',
    datenais: '1985-03-15',
    lieunais: 'Fianarantsoa',
    pere: 'RAKOTO Paul',
    mere: 'RASOA Marie',
    cin: '101234567890',
    delivcin: '2015-06-20',
    adressecli: 'Lot IVA123', // Max 10 caractères
    activite: 'Commerçant'
  },
  {
    nomcli: 'RANDRIA Sophie',
    datenais: '1990-07-22',
    lieunais: 'Ambositra',
    pere: 'RANDRIA Michel',
    mere: 'RAVAO Jeanne',
    cin: '101234567891',
    delivcin: '2018-03-10',
    adressecli: 'Lot IIC456', // Max 10 caractères
    activite: 'Enseignante'
  },
  {
    nomcli: 'RAHARIJAONA Pierre',
    datenais: '1982-11-05',
    lieunais: 'Ambalavao',
    pere: 'RAHARIJAONA Jean',
    mere: 'RASOAMANANA Louise',
    cin: '101234567892',
    delivcin: '2016-09-15',
    adressecli: 'Tanambao', // Max 10 caractères
    activite: 'Fonctionnaire'
  },
  {
    nomcli: 'RASOANIRINA Nicole',
    datenais: '1988-05-18',
    lieunais: 'Fianarantsoa',
    pere: 'RASOANIRINA Georges',
    mere: 'RAKOTOMALALA Anne',
    cin: '101234567893',
    delivcin: '2017-12-08',
    adressecli: 'Mahazoari', // Max 10 caractères
    activite: 'Infirmière'
  },
  {
    nomcli: 'ANDRIANASOLO Daniel',
    datenais: '1975-09-30',
    lieunais: 'Manakara',
    pere: 'ANDRIANASOLO Thomas',
    mere: 'RAZAFINDRA Catherine',
    cin: '101234567894',
    delivcin: '2014-05-25',
    adressecli: 'Bvd France', // Max 10 caractères
    activite: 'Médecin'
  },
  {
    nomcli: 'RAJAONAH Hortense',
    datenais: '1992-01-12',
    lieunais: 'Fianarantsoa',
    pere: 'RAJAONAH Albert',
    mere: 'RAVELO Sylvie',
    cin: '101234567895',
    delivcin: '2019-02-14',
    adressecli: 'Ankadifot', // Max 10 caractères
    activite: 'Avocate'
  },
  {
    nomcli: 'RAKOTONDRAZAKA Claude',
    datenais: '1980-08-27',
    lieunais: 'Ihosy',
    pere: 'RAKOTONDRAZAKA François',
    mere: 'RASOLONJATOVO Martine',
    cin: '101234567896',
    delivcin: '2015-11-30',
    adressecli: 'RN7 Ihosy', // Max 10 caractères
    activite: 'Ingénieur'
  },
  {
    nomcli: 'RAMANANTSOA Elisabeth',
    datenais: '1987-12-03',
    lieunais: 'Fianarantsoa',
    pere: 'RAMANANTSOA Henri',
    mere: 'RABENATOANDRO Alice',
    cin: '101234567897',
    delivcin: '2018-07-19',
    adressecli: 'Andranome', // Max 10 caractères
    activite: 'Pharmacienne'
  }
];

async function seedData() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n🌱 INSERTION DES DONNÉES DE TEST\n');
    console.log('='.repeat(80));

    // 1. Créer les bâtiments
    console.log('\n🏢 Création des bâtiments...');
    const batiments = [];
    for (const batData of batimentsData) {
      // Vérifier si le bâtiment existe déjà
      const existing = await MbatimentModel.findByPk(batData.numBat, { transaction });
      if (existing) {
        console.log(`   ⚠️  Bâtiment ${batData.numBat} existe déjà - ignoré`);
        batiments.push(existing);
      } else {
        const bat = await MbatimentModel.create(batData, { transaction });
        batiments.push(bat);
        console.log(`   ✅ Bâtiment ${bat.numBat} - ${bat.adresse} (${bat.montant} Ar)`);
      }
    }

    // 2. Créer les locataires
    console.log('\n👥 Création des locataires...');
    const locataires = [];
    for (const locData of locatairesData) {
      // Vérifier si le locataire existe déjà (par CIN)
      const existing = await LocataireModel.findOne({ 
        where: { cin: locData.cin },
        transaction 
      });
      if (existing) {
        console.log(`   ⚠️  Locataire ${locData.nomcli} (CIN: ${locData.cin}) existe déjà - ignoré`);
        locataires.push(existing);
      } else {
        const loc = await LocataireModel.create(locData, { transaction });
        locataires.push(loc);
        console.log(`   ✅ ${loc.nomcli} - ${loc.activite} (CIN: ${loc.cin})`);
      }
    }

    // 3. Créer des conventions (associer bâtiments et locataires)
    console.log('\n📄 Création des conventions...');
    const conventions = [];
    
    // Créer une convention pour chaque bâtiment disponible avec un locataire
    const conventionsData = [
      { batiment: batiments[0], locataire: locataires[0], statutConv: true },
      { batiment: batiments[1], locataire: locataires[1], statutConv: true },
      { batiment: batiments[2], locataire: locataires[2], statutConv: true },
      { batiment: batiments[3], locataire: locataires[3], statutConv: true },
      { batiment: batiments[4], locataire: locataires[4], statutConv: false }, // Convention annulée
      { batiment: batiments[6], locataire: locataires[5], statutConv: true },
      { batiment: batiments[7], locataire: locataires[6], statutConv: true },
    ];

    for (const convData of conventionsData) {
      // Vérifier si une convention existe déjà pour ce bâtiment
      const existing = await ConventionModel.findOne({
        where: { 
          numBat: convData.batiment.numBat,
          codeCli: convData.locataire.codeCli
        },
        transaction
      });

      if (existing) {
        console.log(`   ⚠️  Convention pour bâtiment ${convData.batiment.numBat} existe déjà - ignorée`);
        conventions.push(existing);
      } else {
        const conv = await ConventionModel.create({
          lieu: convData.batiment.adresse.substring(0, 10),
          dateConv: getCurrentYearDateOnly(),
          statutConv: convData.statutConv,
          numBat: convData.batiment.numBat,
          codeCli: convData.locataire.codeCli,
          numFact: null
        }, { transaction });
        conventions.push(conv);
        console.log(`   ✅ Convention ${conv.numConv} - ${convData.locataire.nomcli} → ${convData.batiment.adresse}`);
        console.log(`      Statut: ${convData.statutConv ? 'Active' : 'Annulée'}`);
      }
    }

    await transaction.commit();

    // Résumé
    console.log('\n' + '='.repeat(80));
    console.log('\n✨ DONNÉES INSÉRÉES AVEC SUCCÈS!\n');
    console.log(`📊 Résumé:`);
    console.log(`   - Bâtiments : ${batiments.length}`);
    console.log(`   - Locataires : ${locataires.length}`);
    console.log(`   - Conventions : ${conventions.length}`);
    console.log('\n💡 Conseil:');
    console.log('   Connectez-vous avec le compte "Opérateur de saisie" pour:');
    console.log('   - Voir les conventions existantes');
    console.log('   - Créer de nouvelles conventions');
    console.log('   - Modifier les conventions (max 2 fois)\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ERREUR lors de l\'insertion des données:\n');
    console.error(error.message);
    if (error.original) {
      console.error(`   Code SQL: ${error.original.code}`);
      console.error(`   Message: ${error.original.sqlMessage}\n`);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Exécuter le seed
console.log('\n🚀 Démarrage de l\'insertion des données de test...\n');
seedData();
