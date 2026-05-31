/**
 * Script d'insertion de conventions de test avec données variées
 * Ce script crée des conventions pour tester toutes les fonctionnalités du projet
 * Utilisation: node insert-test-conventions.js
 */
require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

// Chargement des modèles
const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);
const Locataire = require('./models/locataire')(sequelize, DataTypes);
const Convention = require('./models/convention')(sequelize, DataTypes);

// Fonction pour obtenir l'année courante au format DATEONLY
// Retourne une date DATEONLY (YYYY-MM-DD) pour une année donnée
// en utilisant le même mois/jour que la date actuelle pour que la date soit "logique" (aujourd'hui ou déjà passée)
function getYearDateOnly(year) {
  const now = new Date();
  // mois indexé 0
  const month = now.getMonth();
  const day = Math.min(now.getDate(), 28); // éviter les problèmes de 29-30-31 pour février
  const d = new Date(year, month, day);
  return d.toISOString().slice(0, 10);
}

function getCurrentYearDateOnly() {
  return getYearDateOnly(new Date().getFullYear());
}

// Données de locataires de test (seront créés s'ils n'existent pas)
const locatairesTest = [
  {
    nomcli: 'RAKOTO Jean Marie',
    datenais: '1985-03-15',
    lieunais: 'Fianarantsoa',
    pere: 'RAKOTO Paul',
    mere: 'RASOA Marie',
    cin: '101234567890',
    delivcin: '2005-06-20',
    adressecli: 'Lot IVA123',
    activite: 'Commerçant'
  },
  {
    nomcli: 'RANDRIA Sophie',
    datenais: '1990-07-22',
    lieunais: 'Ambositra',
    pere: 'RANDRIA Michel',
    mere: 'RAVAO Jeanne',
    cin: '101234567891',
    delivcin: '2010-03-10',
    adressecli: 'Lot IIC456',
    activite: 'Enseignante'
  },
  {
    nomcli: 'RAHARIJAONA Pierre',
    datenais: '1982-11-05',
    lieunais: 'Ambalavao',
    pere: 'RAHARIJAONA Jean',
    mere: 'RASOAMANANA Louise',
    cin: '101234567892',
    delivcin: '2002-09-15',
    adressecli: 'Tanambao',
    activite: 'Fonctionnaire'
  },
  {
    nomcli: 'RASOANIRINA Nicole',
    datenais: '1988-05-18',
    lieunais: 'Fianarantsoa',
    pere: 'RASOANIRINA Georges',
    mere: 'RAKOTOMALALA Anne',
    cin: '101234567893',
    delivcin: '2007-12-08',
    adressecli: 'Mahazoari', // 9 caractères
    activite: 'Infirmière'
  },
  {
    nomcli: 'ANDRIANASOLO Daniel',
    datenais: '1975-09-30',
    lieunais: 'Manakara',
    pere: 'ANDRIANASOLO Thomas',
    mere: 'RAZAFINDRA Catherine',
    cin: '101234567894',
    delivcin: '1995-05-25',
    adressecli: 'Bvd Franc', // 9 caractères
    activite: 'Médecin'
  },
  {
    nomcli: 'RAJAONAH Hortense',
    datenais: '1992-01-12',
    lieunais: 'Fianarantsoa',
    pere: 'RAJAONAH Albert',
    mere: 'RAVELO Sylvie',
    cin: '101234567895',
    delivcin: '2010-02-14',
    adressecli: 'Ankadifot', // 9 caractères
    activite: 'Avocate'
  },
  {
    nomcli: 'RAKOTONDRAZAKA Claude',
    datenais: '1980-08-27',
    lieunais: 'Ihosy',
    pere: 'RAKOTONDRAZAKA François',
    mere: 'RASOLONJATOVO Martine',
    cin: '101234567896',
    delivcin: '2000-11-30',
    adressecli: 'RN7 Ihosy', // 9 caractères
    activite: 'Ingénieur'
  },
  {
    nomcli: 'RAMANANTSOA Elisabeth',
    datenais: '1987-12-03',
    lieunais: 'Fianarantsoa',
    pere: 'RAMANANTSOA Henri',
    mere: 'RABENATOANDRO Alice',
    cin: '101234567897',
    delivcin: '2006-07-19',
    adressecli: 'Andranome', // 9 caractères
    activite: 'Pharmacienne'
  },
  {
    nomcli: 'RAZAFIMAHATRATRA Marc',
    datenais: '1995-04-20',
    lieunais: 'Fianarantsoa',
    pere: 'RAZAFIMAHATRATRA Jean',
    mere: 'RASOAVOAHANGY Claire',
    cin: '101234567898',
    delivcin: '2013-08-12',
    adressecli: 'Sect Est', // Max 10 caractères
    activite: 'Étudiant'
  },
  {
    nomcli: 'RASOLOFONJANAHARY Patricia',
    datenais: '1989-10-08',
    lieunais: 'Ambalavao',
    pere: 'RASOLOFONJANAHARY Louis',
    mere: 'RAKOTOMALALA Julie',
    cin: '101234567899',
    delivcin: '2007-11-05',
    adressecli: 'Quart Sud', // Max 10 caractères
    activite: 'Comptable'
  }
];

async function insertTestConventions() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie\n');

    // 1. Vérifier/Créer les bâtiments
    console.log('📋 Vérification des bâtiments...');
    const batiments = await Mbatiment.findAll({
      order: [['numBat', 'ASC']]
    });

    if (batiments.length === 0) {
      console.log('⚠️  Aucun bâtiment trouvé. Création de bâtiments de test...');
      const batimentsTest = [
        { numBat: 1001, adresse: 'Rue Ravalomanda', montant: 150000, statut: true, image: Buffer.from('IMAGE_BATIMENT_1001') },
        { numBat: 1002, adresse: 'Avenue Rainibe', montant: 200000, statut: true, image: Buffer.from('IMAGE_BATIMENT_1002') },
        { numBat: 1003, adresse: 'Boulevard Ratsima', montant: 180000, statut: true, image: Buffer.from('IMAGE_BATIMENT_1003') },
        { numBat: 1004, adresse: 'Route Ambohima', montant: 250000, statut: true, image: Buffer.from('IMAGE_BATIMENT_1004') },
        { numBat: 1005, adresse: 'Cité Mahazo', montant: 175000, statut: true, image: Buffer.from('IMAGE_BATIMENT_1005') },
        { numBat: 1006, adresse: 'Quartier Ankadif', montant: 220000, statut: true, image: Buffer.from('IMAGE_BATIMENT_1006') },
        { numBat: 1007, adresse: 'Zone Betsileo', montant: 160000, statut: true, image: Buffer.from('IMAGE_BATIMENT_1007') },
        { numBat: 1008, adresse: 'Secteur Tsaraso', montant: 190000, statut: true, image: Buffer.from('IMAGE_BATIMENT_1008') }
      ];

      for (const batData of batimentsTest) {
        await Mbatiment.create(batData);
      }
      console.log(`✅ ${batimentsTest.length} bâtiment(s) créé(s)\n`);
      const batimentsReload = await Mbatiment.findAll({ order: [['numBat', 'ASC']] });
      batiments.push(...batimentsReload);
    } else {
      console.log(`✅ ${batiments.length} bâtiment(s) trouvé(s)\n`);
    }

    // 2. Vérifier/Créer les locataires
    console.log('👤 Vérification des locataires...');
    const locataires = [];
    for (const locData of locatairesTest) {
      let loc = await Locataire.findOne({ where: { cin: locData.cin } });
      if (!loc) {
        loc = await Locataire.create(locData);
        console.log(`   ✅ Créé: ${loc.nomcli} (CIN: ${loc.cin})`);
      } else {
        console.log(`   ⚠️  Existe déjà: ${loc.nomcli} (CIN: ${loc.cin})`);
      }
      locataires.push(loc);
    }
    console.log(`✅ ${locataires.length} locataire(s) disponible(s)\n`);

    // 3. Créer des conventions avec données variées
    console.log('📝 Création des conventions de test...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const currentYear = new Date().getFullYear();
    const conventionsCreated = [];
    
    // Configuration des conventions à créer
    const conventionsConfig = [
      // Conventions de l'année courante (confirmées)
      { batIndex: 0, locIndex: 0, year: currentYear, statut: true, description: 'Convention active - Année courante' },
      { batIndex: 1, locIndex: 1, year: currentYear, statut: true, description: 'Convention active - Année courante' },
      { batIndex: 2, locIndex: 2, year: currentYear, statut: true, description: 'Convention active - Année courante' },
      
      // Conventions de l'année courante (en attente)
      { batIndex: 3, locIndex: 3, year: currentYear, statut: false, description: 'Convention en attente - Année courante' },
      { batIndex: 4, locIndex: 4, year: currentYear, statut: false, description: 'Convention en attente - Année courante' },
      
      // Conventions de l'année précédente
      { batIndex: 0, locIndex: 5, year: currentYear - 1, statut: true, description: 'Convention active - Année précédente' },
      { batIndex: 1, locIndex: 6, year: currentYear - 1, statut: true, description: 'Convention active - Année précédente' },
      { batIndex: 2, locIndex: 7, year: currentYear - 1, statut: true, description: 'Convention active - Année précédente' },
      
      // Conventions de l'année précédente (en attente)
      { batIndex: 3, locIndex: 8, year: currentYear - 1, statut: false, description: 'Convention en attente - Année précédente' },
      
      // Conventions de l'année -2
      { batIndex: 4, locIndex: 9, year: currentYear - 2, statut: true, description: 'Convention active - Année -2' },
      { batIndex: 5, locIndex: 0, year: currentYear - 2, statut: true, description: 'Convention active - Année -2' },
      
      // Conventions supplémentaires pour varier les combinaisons
      { batIndex: 6, locIndex: 1, year: currentYear, statut: true, description: 'Convention active - Bâtiment 1007' },
      { batIndex: 7, locIndex: 2, year: currentYear, statut: true, description: 'Convention active - Bâtiment 1008' },
    ];

    for (const config of conventionsConfig) {
      // Vérifier les indices
      if (config.batIndex >= batiments.length || config.locIndex >= locataires.length) {
        console.log(`⚠️  Indices hors limites - ignoré: Bâtiment[${config.batIndex}], Locataire[${config.locIndex}]`);
        continue;
      }

      const batiment = batiments[config.batIndex];
      const locataire = locataires[config.locIndex];

      // Vérifier si une convention existe déjà pour cette combinaison
      const existingConv = await Convention.findOne({
        where: {
          numBat: batiment.numBat,
          codeCli: locataire.codeCli,
          dateConv: getYearDateOnly(config.year)
        }
      });

      if (existingConv) {
        console.log(`⚠️  Convention existe déjà: Bâtiment #${batiment.numBat} - Locataire ${locataire.nomcli} (${config.year})`);
        continue;
      }

      // Créer la convention
      // Le champ lieu est limité à 10 caractères
      const lieu = batiment.adresse.substring(0, 10).toUpperCase();
      const convention = await Convention.create({
        lieu: lieu,
        dateConv: getYearDateOnly(config.year),
        statutConv: config.statut,
        numFact: null, // Pas de facture associée au départ
        numBat: batiment.numBat,
        codeCli: locataire.codeCli
      });

      conventionsCreated.push(convention);
      console.log(`✅ Convention #${convention.numConv} créée`);
      console.log(`   🏢 Bâtiment: #${batiment.numBat} - ${batiment.adresse}`);
      console.log(`   👤 Locataire: ${locataire.nomcli} (CIN: ${locataire.cin})`);
      console.log(`   💰 Loyer: ${batiment.montant || 0} Ar`);
  console.log(`   📅 Date: ${getYearDateOnly(config.year)}`);
      console.log(`   📊 Statut: ${convention.statutConv ? '✅ Confirmé' : '⏳ En attente'}`);
      console.log(`   📝 ${config.description}`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✅ ${conventionsCreated.length} convention(s) créée(s) avec succès !\n`);

    if (conventionsCreated.length > 0) {
      console.log('📋 Résumé des conventions créées:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Statistiques par année
      const statsByYear = {};
      const statsByStatut = { confirmées: 0, enAttente: 0 };
      
      conventionsCreated.forEach(conv => {
        const year = conv.dateConv.substring(0, 4);
        statsByYear[year] = (statsByYear[year] || 0) + 1;
        if (conv.statutConv) {
          statsByStatut.confirmées++;
        } else {
          statsByStatut.enAttente++;
        }
      });

      console.log('\n📊 Statistiques par année:');
      Object.keys(statsByYear).sort().forEach(year => {
        console.log(`   ${year}: ${statsByYear[year]} convention(s)`);
      });

      console.log('\n📊 Statistiques par statut:');
      console.log(`   ✅ Confirmées: ${statsByStatut.confirmées}`);
      console.log(`   ⏳ En attente: ${statsByStatut.enAttente}`);

      console.log('\n📋 Liste des conventions:');
      conventionsCreated.forEach(conv => {
        console.log(`   - Convention #${conv.numConv} (${conv.dateConv.substring(0, 4)}) - ${conv.statutConv ? 'Confirmé' : 'En attente'}`);
      });

      console.log('\n💡 Vous pouvez maintenant:');
      console.log('   • Créer des factures pour ces conventions');
      console.log('   • Tester les fonctionnalités de recherche et filtrage');
      console.log('   • Tester les statistiques par année');
      console.log('   • Tester les modifications de conventions');
      console.log('');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de la création des conventions:', error);
    console.error('Détails:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    await sequelize.close();
    process.exit(1);
  }
}

// Exécuter le script
insertTestConventions();

