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

    const [conventions, batiments, locataires] = await Promise.all([
      Convention.findAll({ where: { numConv: { [Op.in]: numConvs } } }),
      Mbatiment.findAll({ where: { numBat: { [Op.in]: numBats } } }),
      Locataire.findAll({ where: { codeCli: { [Op.in]: codeClis } } })
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

// POST - Créer une facture (réservé au caissier)
router.post("/", requireRole('caissier', 'administrateur'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      numConv,
      mois,
      libelles
    } = req.body;

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

    // Générer un numéro de facture unique
    const lastFacture = await Facture.findOne({
      order: [["numFact", "DESC"]],
      transaction: t
    });
    const dm = lastFacture ? lastFacture.dm + 1 : 1;

    // Créer la facture
    const facture = await Facture.create({
      dm,
      exercice: new Date(),
      mois: `${mois}-01`, // Format DATEONLY
      codegare: 1, // À adapter selon votre logique
      depart: batiment?.adresse?.substring(0, 10) || 'FIANARANTSOA',
      destination: locataire?.adressecli?.substring(0, 10) || 'LOCATAIRE',
      libelles: libelles || `Loyer ${mois}`,
      numBat: convention.numBat,
      numConv: convention.numConv,
      codeCli: convention.codeCli
    }, { transaction: t });

    await t.commit();

    res.status(201).json({
      status: 201,
      message: "Facture créée avec succès",
      data: facture
    });
  } catch (err) {
    await (t.finished ? Promise.resolve() : t.rollback());
    console.error("Erreur POST facture:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

// PUT - Mettre à jour une facture (statut de paiement)
router.put("/:numFact", requireRole('caissier', 'administrateur'), async (req, res) => {
  try {
    const { numFact } = req.params;
    const { mois, libelles, statutPaiement } = req.body;

    const facture = await Facture.findByPk(numFact);
    if (!facture) {
      return res.status(404).json({
        status: 404,
        message: "Facture non trouvée"
      });
    }

    const updates = {};
    if (mois) updates.mois = mois;
    if (libelles) updates.libelles = libelles;

    await facture.update(updates);

    res.status(200).json({
      status: 200,
      message: "Facture mise à jour",
      data: facture
    });
  } catch (err) {
    console.error("Erreur PUT facture:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

// DELETE - Supprimer une facture
router.delete("/:numFact", requireRole('administrateur'), async (req, res) => {
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
    const facturesPayees = await Facture.count({ where: { ...where } }); // À adapter selon votre logique de statut

    res.status(200).json({
      status: 200,
      data: {
        totalFactures,
        facturesPayees,
        facturesEnAttente: totalFactures - facturesPayees
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

