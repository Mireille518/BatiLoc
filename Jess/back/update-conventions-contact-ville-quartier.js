// Script pour mettre à jour les conventions avec des contacts et ville/quartier depuis les bâtiments
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

async function updateConventions() {
  const transaction = await sequelize.transaction();
  try {
    console.log('🔄 Début de la mise à jour des conventions...\n');
    
    // Récupérer toutes les conventions
    const conventions = await Convention.findAll({ transaction });
    console.log(`📋 ${conventions.length} convention(s) trouvée(s)\n`);

    if (conventions.length === 0) {
      console.log('ℹ️  Aucune convention à mettre à jour');
      await transaction.commit();
      await sequelize.close();
      process.exit(0);
    }

    // Récupérer tous les bâtiments et locataires nécessaires
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

    let updatedCount = 0;
    let contactAdded = 0;
    let batimentUpdated = 0;

    for (let i = 0; i < conventions.length; i++) {
      const conv = conventions[i];
      const batiment = batimentsMap.get(conv.numBat);
      const locataire = locatairesMap.get(conv.codeCli);
      
      const convUpdates = {};
      const batUpdates = {};
      let hasConvUpdates = false;
      let hasBatUpdates = false;

      // 1. Ajouter un contact à la convention si absent ou "N/A"
      if (!conv.contact || conv.contact.trim() === '' || conv.contact === null || conv.contact === 'N/A') {
        // Utiliser un contact différent pour chaque convention
        const contactIndex = i % contactsMalagasy.length;
        convUpdates.contact = contactsMalagasy[contactIndex];
        hasConvUpdates = true;
        contactAdded++;
        console.log(`  📞 Convention #${conv.numConv} (${locataire?.nomcli || 'N/A'}) - Ajout contact: ${convUpdates.contact}`);
      }

      // 2. Mettre à jour ville et quartier du bâtiment si non renseignés
      if (batiment) {
        const currentVille = batiment.ville?.trim() || '';
        if (!currentVille || currentVille === '' || currentVille === 'Non renseignée' || currentVille === 'null') {
          // Définir une ville par défaut basée sur l'adresse ou Fianarantsoa
          batUpdates.ville = 'Fianarantsoa';
          hasBatUpdates = true;
          console.log(`  🏙️  Bâtiment #${batiment.numBat} - Ajout ville: ${batUpdates.ville}`);
        }
        
        const currentQuartier = batiment.quartier?.trim() || '';
        if (!currentQuartier || currentQuartier === '' || currentQuartier === 'Non renseigné' || currentQuartier === 'null') {
          // Définir un quartier par défaut
          const quartiers = ['Centre-ville', 'Ambalavao', 'Soanierana', 'Ankadifotsy', 'Mahamasina', 'Andoharanofotsy', 'Anosibe', 'Antanimena'];
          const quartierIndex = i % quartiers.length;
          batUpdates.quartier = quartiers[quartierIndex];
          hasBatUpdates = true;
          console.log(`  🏘️  Bâtiment #${batiment.numBat} - Ajout quartier: ${batUpdates.quartier}`);
        }
      }

      // Mettre à jour la convention si nécessaire
      if (hasConvUpdates) {
        await conv.update(convUpdates, { transaction });
        updatedCount++;
        console.log(`  ✅ Convention #${conv.numConv} mise à jour`);
      }

      // Mettre à jour le bâtiment si nécessaire
      if (hasBatUpdates) {
        await batiment.update(batUpdates, { transaction });
        batimentUpdated++;
        console.log(`  ✅ Bâtiment #${batiment.numBat} mis à jour`);
      }
    }

    await transaction.commit();

    console.log('\n📊 Résumé de la mise à jour:');
    console.log(`   - Conventions mises à jour: ${updatedCount}`);
    console.log(`   - Contacts ajoutés: ${contactAdded}`);
    console.log(`   - Bâtiments mis à jour (ville/quartier): ${batimentUpdated}`);
    console.log(`   - Total de conventions traitées: ${conventions.length}`);
    console.log('\n✅ Mise à jour terminée avec succès!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Erreur lors de la mise à jour:', error);
    await sequelize.close();
    process.exit(1);
  }
}

updateConventions();

