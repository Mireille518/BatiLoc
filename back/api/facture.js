const express = require("express");
const router = express.Router();
const sequelize = require("../connection/db");
const { DataTypes, Op } = require("sequelize");
const { requireRole } = require("../middleware/auth");

// Models
const Facture = require("../models/facture")(sequelize, DataTypes);
const Convention = require("../models/convention")(sequelize, DataTypes);
const Mbatiment = require("../models/mbatiment")(sequelize, DataTypes);
const Locataire = require("../models/locataire")(sequelize, DataTypes);

// GET - Liste des factures avec pagination et recherche
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { q, statut, mois, numConv } = req.query;

    const where = {};
    if (numConv) where.numConv = numConv;
    if (mois) where.mois = mois;
    if (statut !== undefined) {
      where.statutPaiement = statut === 'true' || statut === true;
    }

    // Recherche
    if (q) {
      where[Op.or] = [
        { numFact: !isNaN(q) ? Number(q) : null },
        { libelles: { [Op.like]: `%${q}%` } }
      ];
    }

    // Récupérer les factures avec pagination
    const { count, rows } = await Facture.findAndCountAll({
      where,
      limit,
      offset,
      order: [["numFact", "DESC"]]
    });

    // Récupérer les conventions, bâtiments et locataires associés
    const numConvs = [...new Set(rows.map(f => f.numConv).filter(Boolean))];
    const numBats = [...new Set(rows.map(f => f.numBat).filter(Boolean))];
    const codeClis = [...new Set(rows.map(f => f.codeCli).filter(Boolean))];

    // Ne faire les requêtes que si les tableaux ne sont pas vides
    const [conventions, batiments, locataires] = await Promise.all([
      numConvs.length > 0 ? Convention.findAll({ where: { numConv: { [Op.in]: numConvs } } }) : Promise.resolve([]),
      numBats.length > 0 ? Mbatiment.findAll({ where: { numBat: { [Op.in]: numBats } } }) : Promise.resolve([]),
      codeClis.length > 0 ? Locataire.findAll({ where: { codeCli: { [Op.in]: codeClis } } }) : Promise.resolve([])
    ]);

    const conventionsMap = new Map(conventions.map(c => [c.numConv, c.toJSON()]));
    const batimentsMap = new Map(batiments.map(b => [b.numBat, b.toJSON()]));
    const locatairesMap = new Map(locataires.map(l => [l.codeCli, l.toJSON()]));

    // Enrichir les factures avec les données associées
    const enrichedRows = rows.map(f => {
      const facture = f.toJSON();
      const conv = conventionsMap.get(facture.numConv);
      return {
        ...facture,
        convention: conv || null,
        batiment: batimentsMap.get(facture.numBat) || null,
        locataire: locatairesMap.get(facture.codeCli) || null
      };
    });

    res.status(200).json({
      status: 200,
      message: "Factures récupérées",
      data: enrichedRows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error("Erreur GET factures:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

// GET - Détails d'une facture
router.get("/:numFact", async (req, res) => {
  try {
    const { numFact } = req.params;
    const facture = await Facture.findByPk(numFact);

    if (!facture) {
      return res.status(404).json({
        status: 404,
        message: "Facture non trouvée"
      });
    }

    // Récupérer les données associées
    const [convention, batiment, locataire] = await Promise.all([
      Convention.findByPk(facture.numConv),
      Mbatiment.findByPk(facture.numBat),
      Locataire.findByPk(facture.codeCli)
    ]);

    const factureData = facture.toJSON();
    factureData.convention = convention ? convention.toJSON() : null;
    factureData.batiment = batiment ? batiment.toJSON() : null;
    factureData.locataire = locataire ? locataire.toJSON() : null;

    res.status(200).json({
      status: 200,
      message: "Facture récupérée",
      data: factureData
    });
  } catch (err) {
    console.error("Erreur GET facture:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

// POST - Créer une facture (Système simplifié et fiable)
router.post("/", requireRole('caissier', 'administrateur'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { numConv, mois, libelles } = req.body;

    // Validation
    if (!numConv || !mois) {
      await t.rollback();
      return res.status(400).json({
        status: 400,
        message: "Champs obligatoires manquants (numConv, mois)"
      });
    }

    // Vérifier que la convention existe
    const convention = await Convention.findByPk(numConv, { transaction: t });
    if (!convention) {
      await t.rollback();
      return res.status(404).json({
        status: 404,
        message: "Convention non trouvée"
      });
    }

    // Récupérer le bâtiment et le locataire
    const [batiment, locataire] = await Promise.all([
      Mbatiment.findByPk(convention.numBat, { transaction: t }),
      Locataire.findByPk(convention.codeCli, { transaction: t })
    ]);

    if (!batiment || !locataire) {
      await t.rollback();
      return res.status(404).json({
        status: 404,
        message: "Bâtiment ou locataire non trouvé"
      });
    }

    // Générer un numéro de facture unique
    const lastFacture = await Facture.findOne({
      order: [["numFact", "DESC"]],
      transaction: t
    });
    const dm = lastFacture ? lastFacture.dm + 1 : 1;

    // Formater le mois (YYYY-MM -> YYYY-MM-01)
    const moisFormatted = mois.includes('-') && mois.split('-').length === 2 
      ? `${mois}-01` 
      : mois;
    const moisDate = new Date(moisFormatted);
    
    if (isNaN(moisDate.getTime())) {
      await t.rollback();
      return res.status(400).json({
        status: 400,
        message: `Format de mois invalide: ${mois}. Format attendu: YYYY-MM`
      });
    }

    // Préparer les données
    const departValue = batiment.adresse 
      ? (batiment.adresse.length > 10 ? batiment.adresse.substring(0, 10) : batiment.adresse.padEnd(10, ' '))
      : 'FIANARANTSOA';
    const destinationValue = locataire.adressecli
      ? (locataire.adressecli.length > 10 ? locataire.adressecli.substring(0, 10) : locataire.adressecli.padEnd(10, ' '))
      : 'LOCATAIRE';
    const libellesValue = libelles 
      ? (libelles.length > 100 ? libelles.substring(0, 100) : libelles)
      : `Loyer ${mois}`;

    // Créer la facture avec SQL brut (garantit que seules les colonnes existantes sont utilisées)
    await sequelize.query(
      `INSERT INTO facture (dm, exercice, mois, codegare, depart, destination, libelles, numBat, numConv, codeCli, statutPaiement) 
       VALUES (:dm, :exercice, :mois, :codegare, :depart, :destination, :libelles, :numBat, :numConv, :codeCli, :statutPaiement)`,
      {
        replacements: {
          dm,
          exercice: new Date(),
          mois: moisFormatted,
          codegare: 1,
          depart: departValue,
          destination: destinationValue,
          libelles: libellesValue,
          numBat: convention.numBat,
          numConv: convention.numConv,
          codeCli: convention.codeCli,
          statutPaiement: 0
        },
        transaction: t
      }
    );

    // Récupérer l'ID de la facture créée en utilisant LAST_INSERT_ID() dans la même transaction
    const [idResults] = await sequelize.query(
      'SELECT LAST_INSERT_ID() as insertId',
      { 
        transaction: t,
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    const numFact = idResults?.[0]?.insertId || idResults?.insertId;
    
    if (!numFact) {
      // Fallback: récupérer la dernière facture créée avec ce dm dans la transaction
      const lastFacture = await Facture.findOne({
        where: { dm },
        order: [["numFact", "DESC"]],
        transaction: t
      });
      
      if (!lastFacture) {
        await t.rollback();
        throw new Error('Impossible de récupérer l\'ID de la facture créée');
      }
      
      // Récupérer la facture complète
      const facture = await Facture.findByPk(lastFacture.numFact, { transaction: t });
      await t.commit();
      
      return res.status(201).json({
        status: 201,
        message: "Facture créée avec succès",
        data: facture.toJSON()
      });
    }
    
    // Récupérer la facture créée
    const facture = await Facture.findByPk(numFact, { transaction: t });
    
    if (!facture) {
      await t.rollback();
      throw new Error('Impossible de récupérer la facture créée');
    }

    await t.commit();

    res.status(201).json({
      status: 201,
      message: "Facture créée avec succès",
      data: facture.toJSON()
    });
  } catch (err) {
    await (t.finished ? Promise.resolve() : t.rollback());
    console.error("Erreur POST facture:", err);
    console.error("Stack trace:", err.stack);
    
    let errorMessage = "Erreur serveur";
    if (err.name === 'SequelizeValidationError') {
      errorMessage = "Erreur de validation: " + err.errors.map(e => e.message).join(', ');
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      errorMessage = "Une facture avec ce numéro existe déjà";
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
      errorMessage = "Référence invalide (bâtiment, convention ou locataire introuvable)";
    } else {
      errorMessage = err.message || "Erreur serveur";
    }
    
    res.status(500).json({
      status: 500,
      message: errorMessage,
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// PUT - Mettre à jour une facture (statut de paiement)
router.put("/:numFact", requireRole('caissier', 'administrateur'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { numFact } = req.params;
    const { statutPaiement, datePaiement } = req.body;

    const facture = await Facture.findByPk(numFact, { transaction: t });
    if (!facture) {
      await t.rollback();
      return res.status(404).json({
        status: 404,
        message: "Facture non trouvée"
      });
    }

    const updates = {};
    const oldStatutPaiement = facture.statutPaiement;
    
    if (statutPaiement !== undefined) {
      updates.statutPaiement = statutPaiement === true || statutPaiement === 'true';
    }

    await facture.update(updates, { transaction: t });

    // Mettre à jour automatiquement le statut de la convention
    const convention = await Convention.findByPk(facture.numConv, { transaction: t });
    
    if (convention && statutPaiement !== undefined) {
      if (updates.statutPaiement === true && oldStatutPaiement === false) {
        // Facture payée : passer de "En attente" à "Confirmé"
        if (convention.statutConv === false) {
          await convention.update({ statutConv: true }, { transaction: t });
          console.log(`✅ Statut de la convention ${convention.numConv} mis à jour: En attente -> Confirmé`);
        }
      } else if (updates.statutPaiement === false && oldStatutPaiement === true) {
        // Facture annulée (retour en arrière) : vérifier s'il reste des factures payées
        const facturesPayees = await Facture.count({
          where: {
            numConv: convention.numConv,
            statutPaiement: true
          },
          transaction: t
        });
        
        // Si aucune facture n'est payée, repasser à "En attente"
        if (facturesPayees === 0 && convention.statutConv === true) {
          await convention.update({ statutConv: false }, { transaction: t });
          console.log(`✅ Statut de la convention ${convention.numConv} mis à jour: Confirmé -> En attente (aucune facture payée)`);
        }
      }
    }

    await t.commit();

    // Recharger la facture pour avoir les données à jour
    await facture.reload();

    res.status(200).json({
      status: 200,
      message: "Facture mise à jour avec succès. Le statut de la convention a été mis à jour automatiquement.",
      data: facture.toJSON()
    });
  } catch (err) {
    await (t.finished ? Promise.resolve() : t.rollback());
    console.error("Erreur PUT facture:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

// DELETE - Supprimer une facture
router.delete("/:numFact", requireRole('caissier', 'administrateur'), async (req, res) => {
  try {
    const { numFact } = req.params;
    const facture = await Facture.findByPk(numFact);

    if (!facture) {
      return res.status(404).json({
        status: 404,
        message: "Facture non trouvée"
      });
    }

    await facture.destroy();

    res.status(200).json({
      status: 200,
      message: "Facture supprimée"
    });
  } catch (err) {
    console.error("Erreur DELETE facture:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

// GET - Statistiques des factures
router.get("/stats/summary", requireRole('caissier', 'administrateur'), async (req, res) => {
  try {
    const { mois, annee } = req.query;
    const where = {};
    
    if (mois && annee) {
      where.mois = `${annee}-${mois.padStart(2, '0')}-01`;
    }

    const totalFactures = await Facture.count({ where });
    const facturesPayees = await Facture.count({ 
      where: { 
        ...where, 
        statutPaiement: true 
      } 
    });

    // Calculer le montant total des factures
    const factures = await Facture.findAll({ 
      where,
      attributes: ['numBat']
    });

    const numBats = [...new Set(factures.map(f => f.numBat).filter(Boolean))];
    
    const batiments = numBats.length > 0 
      ? await Mbatiment.findAll({
          where: { numBat: { [Op.in]: numBats } },
          attributes: ['numBat', 'montant']
        })
      : [];

    const montantsMap = new Map(batiments.map(b => [b.numBat, b.montant || 0]));
    const montantTotal = factures.reduce((sum, f) => {
      return sum + (montantsMap.get(f.numBat) || 0);
    }, 0);

    res.status(200).json({
      status: 200,
      data: {
        totalFactures,
        facturesPayees,
        facturesEnAttente: totalFactures - facturesPayees,
        montantTotal
      }
    });
  } catch (err) {
    console.error("Erreur GET stats:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

module.exports = router;
