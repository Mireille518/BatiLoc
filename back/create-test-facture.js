require('dotenv').config();
const sequelize = require('./connection/db');
const { DataTypes } = require('sequelize');

// Models
const Facture = require('./models/facture')(sequelize, DataTypes);
const Convention = require('./models/convention')(sequelize, DataTypes);
const Mbatiment = require('./models/mbatiment')(sequelize, DataTypes);
const Locataire = require('./models/locataire')(sequelize, DataTypes);

async function createTestFacture() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données réussie');

    // Récupérer une convention existante
    const convention = await Convention.findOne({
      order: [['numConv', 'DESC']]
    });

    if (!convention) {
      console.error('❌ Aucune convention trouvée. Veuillez d\'abord créer une convention.');
      process.exit(1);
    }

    console.log(`📋 Convention trouvée: #${convention.numConv}`);

    // Récupérer le bâtiment et le locataire
    const [batiment, locataire] = await Promise.all([
      Mbatiment.findByPk(convention.numBat),
      Locataire.findByPk(convention.codeCli)
    ]);

    if (!batiment) {
      console.error('❌ Bâtiment non trouvé');
      process.exit(1);
    }

    if (!locataire) {
      console.error('❌ Locataire non trouvé');
      process.exit(1);
    }

    console.log(`🏢 Bâtiment: #${batiment.numBat} - ${batiment.adresse}`);
    console.log(`👤 Locataire: ${locataire.nomcli}`);

    // Récupérer la dernière facture pour générer le dm
    // Utiliser une requête SQL directe pour éviter les problèmes de colonnes
    const [results] = await sequelize.query(
      'SELECT MAX(dm) as maxDm FROM facture',
      { type: sequelize.QueryTypes.SELECT }
    );
    const dm = (results && results.maxDm) ? results.maxDm + 1 : 1;

    // Créer une facture de test pour le mois actuel
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Vérifier si la colonne statutPaiement existe
    const [columns] = await sequelize.query(
      "SHOW COLUMNS FROM facture LIKE 'statutPaiement'"
    );
    const hasStatutPaiement = columns.length > 0;

    const factureData = {
      dm,
      exercice: new Date(),
      mois: `${currentMonth}-01`,
      codegare: 1,
      depart: batiment.adresse ? batiment.adresse.substring(0, 10) : 'FIANARANTSOA',
      destination: locataire.adressecli ? locataire.adressecli.substring(0, 10) : 'LOCATAIRE',
      libelles: `Loyer ${currentMonth}`,
      numBat: convention.numBat,
      numConv: convention.numConv,
      codeCli: convention.codeCli
    };

    // Ajouter statutPaiement seulement si la colonne existe
    if (hasStatutPaiement) {
      factureData.statutPaiement = false;
    }

    const facture = await Facture.create(factureData);

    console.log('\n✅ Facture de test créée avec succès !');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📄 Numéro de facture: #${facture.numFact}`);
    console.log(`📅 Mois: ${currentMonth}`);
    console.log(`👤 Client: ${locataire.nomcli}`);
    console.log(`💰 Montant: ${batiment.montant || 0} Ar`);
    console.log(`📋 Convention: #${convention.numConv}`);
    console.log(`💳 Statut: Non payée (peut être payée maintenant)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la création de la facture:', error);
    await sequelize.close();
    process.exit(1);
  }
}

createTestFacture();

