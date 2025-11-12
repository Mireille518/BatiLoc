const express = require("express");
const router = express.Router();
const sequelize = require("../connection/db");
const { DataTypes, Op } = require("sequelize");

// Models
const Convention = require("../models/convention")(sequelize, DataTypes);
const Mbatiment = require("../models/mbatiment")(sequelize, DataTypes);
const Locataire = require("../models/locataire")(sequelize, DataTypes);

// Helper: current year as a DateOnly (YYYY-01-01)
function getCurrentYearDateOnly() {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

// GET list with optional search, pagination and filters
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { q, statut, numBat, annee } = req.query;
    
    const where = {};
    const locWhere = {};
    const batWhere = {};

    // Filtres
    if (statut !== undefined) {
      where.statutConv = statut === 'true' || statut === true;
    }
    if (numBat) {
      where.numBat = Number(numBat);
    }
    if (annee) {
      where.dateConv = { [Op.like]: `${annee}%` };
    }

    // Recherche
    if (q) {
      if (!isNaN(Number(q))) {
        where.numConv = Number(q);
        batWhere.numBat = Number(q);
      }
      locWhere[Op.or] = [
        { nomcli: { [Op.like]: `%${q}%` } },
        { cin: { [Op.like]: `%${q}%` } }
      ];
    }

    // Basic manual joins with pagination
    const { count, rows } = await Convention.findAndCountAll({
      where,
      limit,
      offset,
      order: [["numConv", "DESC"]]
    });

    const batimentsById = new Map();
    const locatairesById = new Map();

    // prefetch related entities
    const numBats = [...new Set(rows.map(r => r.numBat))];
    const codeClis = [...new Set(rows.map(r => r.codeCli))];

    const [bats, locs] = await Promise.all([
      Mbatiment.findAll({ where: batWhere.numBat ? { numBat: batWhere.numBat } : { numBat: { [Op.in]: numBats } } }),
      Locataire.findAll({ where: locWhere[Op.or] ? locWhere : { codeCli: { [Op.in]: codeClis } } })
    ]);

    bats.forEach(b => batimentsById.set(b.numBat, b.toJSON()));
    locs.forEach(l => locatairesById.set(l.codeCli, l.toJSON()));

    const data = rows.map(r => {
      const conv = r.toJSON();
      return {
        ...conv,
        batiment: batimentsById.get(conv.numBat) || null,
        locataire: locatairesById.get(conv.codeCli) || null,
      };
    });

    res.status(200).json({ 
      status: 200, 
      message: "Conventions récupérées", 
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error("Erreur GET conventions:", err);
    res.status(500).json({ status: 500, message: "Erreur serveur", error: err.message });
  }
});

// POST create convention (creates/updates locataire if CIN exists)
router.post("/", require("../middleware/validator").validateConvention, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      // step 1 - batiment
      numBat, adresse, montant,
      // step 2 - locataire
      nomcli, datenais, lieunais, pere, mere, cin, delivcin, adressecli, activite,
      // optional
      statutConv
    } = req.body;

    if (!numBat || !adresse || montant === undefined || montant === null) {
      await t.rollback();
      return res.status(400).json({ status: 400, message: "Champs bâtiment manquants" });
    }
    if (!nomcli || !datenais || !lieunais || !pere || !mere || !cin || !delivcin || !adressecli || !activite) {
      await t.rollback();
      return res.status(400).json({ status: 400, message: "Champs locataire manquants" });
    }

    const bat = await Mbatiment.findByPk(numBat, { transaction: t });
    if (!bat) {
      await t.rollback();
      return res.status(404).json({ status: 404, message: "Bâtiment introuvable" });
    }

    // Harmonise adresse (max 20 pour correspondre à l'UI) et montant
    const normalizedAdresse = String(adresse).substring(0, 20);
    const normalizedMontant = Number.parseFloat(montant);

    // Met à jour le bâtiment avec les infos saisies si nécessaire
    await bat.update({ adresse: normalizedAdresse, montant: normalizedMontant }, { transaction: t });

    // Trouve ou crée le locataire par CIN
    let loc = await Locataire.findOne({ where: { cin }, transaction: t });
    if (!loc) {
      loc = await Locataire.create({
        nomcli,
        datenais,
        lieunais,
        pere,
        mere,
        cin,
        delivcin,
        adressecli,
        activite
      }, { transaction: t });
    } else {
      await loc.update({ nomcli, datenais, lieunais, pere, mere, delivcin, adressecli, activite }, { transaction: t });
    }

    // IMPORTANT: forcer numFact:null pour éviter une contrainte FK si la colonne a un défaut non nul en DB
    const created = await Convention.create({
      lieu: bat.adresse.substring(0, 10),
      dateConv: getCurrentYearDateOnly(),
      statutConv: !!statutConv,
      numBat: bat.numBat,
      codeCli: loc.codeCli,
      numFact: null
    }, { transaction: t });

    await t.commit();
    res.status(201).json({ status: 201, message: "Convention créée", data: created });
  } catch (err) {
    await (t.finished ? Promise.resolve() : t.rollback());
    console.error("Erreur POST convention:", err);
    res.status(500).json({ status: 500, message: "Erreur serveur", error: err.message });
  }
});

// PUT update convention (front devra contrôler max 2 modifs)
router.put("/:numConv", async (req, res) => {
  try {
    const { numConv } = req.params;
    const updates = {};
    const allowed = ["lieu", "numBat", "codeCli", "statutConv", "numFact"]; // dateConv reste l'année de création
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const conv = await Convention.findByPk(numConv);
    if (!conv) return res.status(404).json({ status: 404, message: "Convention non trouvée" });

    await conv.update(updates);
    res.status(200).json({ status: 200, message: "Convention mise à jour", data: conv });
  } catch (err) {
    console.error("Erreur PUT convention:", err);
    res.status(500).json({ status: 500, message: "Erreur serveur", error: err.message });
  }
});

// DELETE cancel convention
router.delete("/:numConv", async (req, res) => {
  try {
    const { numConv } = req.params;
    const conv = await Convention.findByPk(numConv);
    if (!conv) return res.status(404).json({ status: 404, message: "Convention non trouvée" });
    await conv.destroy();
    res.status(200).json({ status: 200, message: "Convention annulée" });
  } catch (err) {
    console.error("Erreur DELETE convention:", err);
    res.status(500).json({ status: 500, message: "Erreur serveur", error: err.message });
  }
});

module.exports = router;



