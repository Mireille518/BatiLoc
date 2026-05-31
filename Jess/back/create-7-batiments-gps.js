/**
 * Script pour créer 7 bâtiments avec coordonnées GPS
 * 3 bâtiments avec statut indisponible, 4 avec statut actif
 * 
 * Usage: node create-7-batiments-gps.js
 */

const sequelize = require('./connection/db');
const MbatimentModel = require('./models/mbatiment')(sequelize, require('sequelize').DataTypes);
const fs = require('fs');
const path = require('path');

// Coordonnées de base pour Fianarantsoa, Madagascar
const BASE_LATITUDE = -21.4536;
const BASE_LONGITUDE = 47.0856;

// Données des 7 bâtiments avec coordonnées GPS différentes
const batimentsData = [
  {
    numBat: 2001,
    adresse: 'Avenue Indépendance',
    ville: 'Fianarantsoa',
    quartier: 'Centre-ville',
    latitude: BASE_LATITUDE + 0.001, // Légèrement au nord
    longitude: BASE_LONGITUDE + 0.001, // Légèrement à l'est
    superficie: 250.5, // m²
    montant: 180000,
    statut: true, // Actif
    description: 'Bâtiment résidentiel moderne'
  },
  {
    numBat: 2002,
    adresse: 'Rue de la République',
    ville: 'Fianarantsoa',
    quartier: 'Quartier Sud',
    latitude: BASE_LATITUDE - 0.002, // Au sud
    longitude: BASE_LONGITUDE + 0.0005,
    superficie: 320.75, // m²
    montant: 220000,
    statut: false, // Indisponible
    description: 'Bâtiment en rénovation'
  },
  {
    numBat: 2003,
    adresse: 'Boulevard Tsiranana',
    ville: 'Fianarantsoa',
    quartier: 'Zone Est',
    latitude: BASE_LATITUDE + 0.003,
    longitude: BASE_LONGITUDE + 0.002,
    superficie: 180.25, // m²
    montant: 150000,
    statut: true, // Actif
    description: 'Appartement meublé'
  },
  {
    numBat: 2004,
    adresse: 'Route Nationale 7',
    ville: 'Fianarantsoa',
    quartier: 'Périphérie Nord',
    latitude: BASE_LATITUDE + 0.005,
    longitude: BASE_LONGITUDE - 0.001,
    superficie: 450.0, // m²
    montant: 280000,
    statut: false, // Indisponible
    description: 'Maison avec jardin'
  },
  {
    numBat: 2005,
    adresse: 'Avenue de la Gare',
    ville: 'Fianarantsoa',
    quartier: 'Quartier Gare',
    latitude: BASE_LATITUDE - 0.001,
    longitude: BASE_LONGITUDE - 0.002,
    superficie: 195.5, // m²
    montant: 165000,
    statut: true, // Actif
    description: 'Studio proche gare'
  },
  {
    numBat: 2006,
    adresse: 'Cité Universitaire',
    ville: 'Fianarantsoa',
    quartier: 'Campus',
    latitude: BASE_LATITUDE - 0.003,
    longitude: BASE_LONGITUDE + 0.003,
    superficie: 380.0, // m²
    montant: 240000,
    statut: false, // Indisponible
    description: 'Résidence étudiante'
  },
  {
    numBat: 2007,
    adresse: 'Zone Industrielle',
    ville: 'Fianarantsoa',
    quartier: 'Zone Ouest',
    latitude: BASE_LATITUDE + 0.0005,
    longitude: BASE_LONGITUDE - 0.003,
    superficie: 520.75, // m²
    montant: 300000,
    statut: true, // Actif
    description: 'Entrepôt commercial'
  }
];

// Fonction pour créer une image placeholder
function createPlaceholderImage() {
  // Créer une image PNG simple (1x1 pixel transparent)
  // En production, vous pourriez charger une vraie image
  const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  return placeholder;
}

async function createBatiments() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie\n');
    console.log('='.repeat(80));
    console.log('🏢 CRÉATION DE 7 BÂTIMENTS AVEC COORDONNÉES GPS\n');
    console.log('='.repeat(80));

    const transaction = await sequelize.transaction();

    try {
      let created = 0;
      let skipped = 0;

      for (const batData of batimentsData) {
        // Vérifier si le bâtiment existe déjà
        const existing = await MbatimentModel.findByPk(batData.numBat, { transaction });
        
        if (existing) {
          console.log(`⚠️  Bâtiment #${batData.numBat} existe déjà - ignoré`);
          skipped++;
          continue;
        }

        // Créer le bâtiment
        const batiment = await MbatimentModel.create({
          numBat: batData.numBat,
          image: createPlaceholderImage(),
          adresse: batData.adresse.substring(0, 20),
          ville: batData.ville,
          quartier: batData.quartier,
          latitude: batData.latitude,
          longitude: batData.longitude,
          superficie: batData.superficie,
          montant: batData.montant,
          statut: batData.statut
        }, { transaction });

        created++;
        const statutText = batData.statut ? '✅ Actif' : '❌ Indisponible';
        console.log(`\n✅ Bâtiment #${batiment.numBat} créé`);
        console.log(`   📍 Adresse: ${batData.adresse}`);
        console.log(`   🏙️  Ville: ${batData.ville} - ${batData.quartier}`);
        console.log(`   📐 Coordonnées: ${batData.latitude.toFixed(6)}, ${batData.longitude.toFixed(6)}`);
        console.log(`   📏 Superficie: ${batData.superficie} m²`);
        console.log(`   💰 Montant: ${batData.montant.toLocaleString()} Ar`);
        console.log(`   ${statutText}`);
        console.log(`   📝 ${batData.description}`);
      }

      await transaction.commit();

      console.log('\n' + '='.repeat(80));
      console.log(`\n📊 RÉSUMÉ:`);
      console.log(`   ✅ ${created} bâtiment(s) créé(s)`);
      console.log(`   ⚠️  ${skipped} bâtiment(s) ignoré(s) (déjà existants)`);
      console.log(`   📍 Tous les bâtiments ont des coordonnées GPS`);
      console.log(`   📏 Tous les bâtiments ont une superficie en m²`);
      console.log(`   ❌ 3 bâtiments avec statut indisponible`);
      console.log(`   ✅ 4 bâtiments avec statut actif`);
      console.log('\n✅ Script terminé avec succès!\n');

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Erreur lors de la création des bâtiments:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Exécuter le script
createBatiments();

