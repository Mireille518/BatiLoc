// Script pour vérifier et remplir TOUS les champs manquants
require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

const Convention = require('./models/convention')(sequelize, DataTypes);
const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);
const Locataire = require('./models/locataire')(sequelize, DataTypes);

// Liste de contacts malgaches réalistes
const contactsMalagasy = [
  '+261 34 12 345 67',
  '+261 32 11 223 44',
  '+261 33 14 256 78',
  '+261 38 10 987 65',
  '+261 34 56 789 01',
  '+261 32 98 765 43',
  '+261 33 21 456 78',
  '+261 34 87 654 32',
  '+261 32 45 678 90',
  '+261 33 76 543 21',
  '+261 34 23 456 78',
  '+261 32 67 890 12',
  '+261 33 45 678 90',
  '+261 34 89 012 34',
  '+261 32 34 567 89',
  '+261 33 90 123 45',
  '+261 34 56 789 01',
  '+261 32 78 901 23',
  '+261 33 12 345 67',
  '+261 34 90 123 45'
];

const quartiers = ['Centre-ville', 'Ambalavao', 'Soanierana', 'Ankadifotsy', 'Mahamasina', 'Andoharanofotsy', 'Anosibe', 'Antanimena', 'Anosy'];

async function fillAllData() {
  const transaction = await sequelize.transaction();
  try {
    console.log('🔄 Vérification et remplissage de toutes les données...\n');
    
    // Récupérer toutes les conventions
    const conventions = await Convention.findAll({ transaction });
    console.log(`📋 ${conventions.length} convention(s) trouvée(s)\n`);

    if (conventions.length === 0) {
      console.log('ℹ️  Aucune convention à traiter');
      await transaction.commit();
      await sequelize.close();
      process.exit(0);
    }

    // Récupérer tous les bâtiments et locataires
    const numBats = [...new Set(conventions.map(c => c.numBat))];
    const codeClis = [...new Set(conventions.map(c => c.codeCli))];
    
    const batiments = await Mbatiment.findAll({
      where: { numBat: numBats },
      transaction
    });
    const locataires = await Locataire.findAll({
      where: { codeCli: codeClis },
      transaction
    });

    // Créer des maps pour accès rapide
    const batimentsMap = new Map();
    batiments.forEach(b => batimentsMap.set(b.numBat, b));
    
    const locatairesMap = new Map();
    locataires.forEach(l => locatairesMap.set(l.codeCli, l));

    let convUpdated = 0;
    let batUpdated = 0;

    console.log('📊 Analyse des données:\n');

    for (let i = 0; i < conventions.length; i++) {
      const conv = conventions[i];
      const batiment = batimentsMap.get(conv.numBat);
      const locataire = locatairesMap.get(conv.codeCli);
      
      const convUpdates = {};
      const batUpdates = {};
      let hasConvUpdates = false;
      let hasBatUpdates = false;

      // 1. Contact - FORCER le remplissage
      const currentContact = (conv.contact || '').trim();
      if (!currentContact || currentContact === '' || currentContact === 'N/A' || currentContact === 'null') {
        const contactIndex = i % contactsMalagasy.length;
        convUpdates.contact = contactsMalagasy[contactIndex];
        hasConvUpdates = true;
        console.log(`  📞 Convention #${conv.numConv} (${locataire?.nomcli || 'N/A'}) - Contact: ${conv.contact || 'VIDE'} → ${convUpdates.contact}`);
      }

      // 2. Ville - FORCER le remplissage
      if (batiment) {
        const currentVille = (batiment.ville || '').trim();
        if (!currentVille || currentVille === '' || currentVille === 'Non renseignée' || currentVille === 'null') {
          batUpdates.ville = 'Fianarantsoa';
          hasBatUpdates = true;
          console.log(`  🏙️  Bâtiment #${batiment.numBat} - Ville: ${batiment.ville || 'VIDE'} → ${batUpdates.ville}`);
        }
        
        // 3. Quartier - FORCER le remplissage
        const currentQuartier = (batiment.quartier || '').trim();
        if (!currentQuartier || currentQuartier === '' || currentQuartier === 'Non renseigné' || currentQuartier === 'null') {
          const quartierIndex = i % quartiers.length;
          batUpdates.quartier = quartiers[quartierIndex];
          hasBatUpdates = true;
          console.log(`  🏘️  Bâtiment #${batiment.numBat} - Quartier: ${batiment.quartier || 'VIDE'} → ${batUpdates.quartier}`);
        }
      }

      // Mettre à jour
      if (hasConvUpdates) {
        await conv.update(convUpdates, { transaction });
        convUpdated++;
      }

      if (hasBatUpdates) {
        await batiment.update(batUpdates, { transaction });
        batUpdated++;
      }
    }

    await transaction.commit();

    console.log('\n📊 Résumé:');
    console.log(`   - Conventions mises à jour: ${convUpdated}`);
    console.log(`   - Bâtiments mis à jour: ${batUpdated}`);
    console.log(`   - Total traité: ${conventions.length}`);
    console.log('\n✅ Toutes les données sont maintenant complètes!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur:', error);
    await sequelize.close();
    process.exit(1);
  }
}

fillAllData();

