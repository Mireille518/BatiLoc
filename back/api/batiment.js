const express = require("express");
const router = express.Router();
const sequelize = require("../connection/db");
const { Op } = require("sequelize");
const MbatimentModel = require("../models/mbatiment")(sequelize, require("sequelize").DataTypes);
const multer = require("multer");
const path = require("path");
const { validateBatiment } = require("../middleware/validator");

// Configuration de multer pour stocker les images en mémoire
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Seules les images (jpeg, jpg, png, gif) sont autorisées"));
    }
  }
});

// READ - Obtenir tous les bâtiments avec pagination
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { q, statut } = req.query;

    const where = {};
    if (statut !== undefined) {
      where.statut = statut === 'true' || statut === true;
    }
    if (q) {
      where[Op.or] = [
        { numBat: !isNaN(q) ? Number(q) : null },
        { adresse: { [Op.like]: `%${q}%` } }
      ];
    }

    const { count, rows } = await MbatimentModel.findAndCountAll({
      where,
      limit,
      offset,
      order: [['numBat', 'DESC']]
    });
    
    // Convertir les images BLOB en base64 pour l'envoi
    const batimentsWithImages = rows.map(b => {
      const batiment = b.toJSON();
      if (batiment.image) {
        batiment.image = batiment.image.toString('base64');
      }
      return batiment;
    });

    res.status(200).json({
      message: "Bâtiments récupérés avec succès",
      status: 200,
      data: batimentsWithImages,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des bâtiments:', error);
    res.status(500).json({
      message: "Erreur lors de la récupération des bâtiments",
      status: 500,
      error: error.message
    });
  }
});

// READ - Obtenir un bâtiment par ID
router.get("/:numBat", async (req, res) => {
  try {
    const { numBat } = req.params;
    const batiment = await MbatimentModel.findByPk(numBat);

    if (!batiment) {
      return res.status(404).json({
        message: "Bâtiment non trouvé",
        status: 404
      });
    }

    const batimentData = batiment.toJSON();
    if (batimentData.image) {
      batimentData.image = batimentData.image.toString('base64');
    }

    res.status(200).json({
      message: "Bâtiment récupéré avec succès",
      status: 200,
      data: batimentData
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du bâtiment:', error);
    res.status(500).json({
      message: "Erreur lors de la récupération du bâtiment",
      status: 500,
      error: error.message
    });
  }
});

// CREATE - Créer un nouveau bâtiment
router.post("/", upload.single('image'), validateBatiment, async (req, res) => {
  try {
    const { numBat, adresse, montant, statut } = req.body;

    // Validation des champs
    if (!numBat || !adresse || !montant) {
      return res.status(400).json({
        message: "Veuillez remplir tous les champs obligatoires (numBat, adresse, montant)",
        status: 400
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Veuillez fournir une image",
        status: 400
      });
    }

    // Vérifier si le bâtiment existe déjà
    const existingBatiment = await MbatimentModel.findByPk(numBat);
    if (existingBatiment) {
      return res.status(409).json({
        message: "Un bâtiment avec ce numéro existe déjà",
        status: 409
      });
    }

    // Créer le bâtiment avec l'image en BLOB
    const newBatiment = await MbatimentModel.create({
      numBat: parseInt(numBat),
      image: req.file.buffer,
      adresse: adresse.substring(0, 20), // Limiter à 20 caractères
      montant: parseFloat(montant),
      statut: statut !== undefined ? (statut === 'true' || statut === true || statut === 1) : true
    });

    const batimentData = newBatiment.toJSON();
    if (batimentData.image) {
      batimentData.image = batimentData.image.toString('base64');
    }

    res.status(201).json({
      message: "Bâtiment créé avec succès",
      status: 201,
      data: batimentData
    });
  } catch (error) {
    console.error('Erreur lors de la création du bâtiment:', error);
    res.status(500).json({
      message: "Erreur lors de la création du bâtiment",
      status: 500,
      error: error.message
    });
  }
});

// UPDATE - Mettre à jour un bâtiment
router.put("/:numBat", upload.single('image'), async (req, res) => {
  try {
    const { numBat } = req.params;
    const { adresse, montant, statut } = req.body;

    // Trouver le bâtiment
    const batiment = await MbatimentModel.findByPk(numBat);
    if (!batiment) {
      return res.status(404).json({
        message: "Bâtiment non trouvé",
        status: 404
      });
    }

    // Préparer les données de mise à jour
    const updateData = {};
    if (adresse) updateData.adresse = adresse.substring(0, 20);
    if (montant !== undefined) updateData.montant = parseFloat(montant);
    if (statut !== undefined) {
      updateData.statut = (statut === 'true' || statut === true || statut === 1);
    }
    if (req.file) {
      updateData.image = req.file.buffer;
    }

    // Mettre à jour le bâtiment
    await batiment.update(updateData);

    // Récupérer le bâtiment mis à jour
    const updatedBatiment = await MbatimentModel.findByPk(numBat);
    const batimentData = updatedBatiment.toJSON();
    if (batimentData.image) {
      batimentData.image = batimentData.image.toString('base64');
    }

    res.status(200).json({
      message: "Bâtiment mis à jour avec succès",
      status: 200,
      data: batimentData
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du bâtiment:', error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour du bâtiment",
      status: 500,
      error: error.message
    });
  }
});

// DELETE - Supprimer un bâtiment
router.delete("/:numBat", async (req, res) => {
  try {
    const { numBat } = req.params;

    const batiment = await MbatimentModel.findByPk(numBat);
    if (!batiment) {
      return res.status(404).json({
        message: "Bâtiment non trouvé",
        status: 404
      });
    }

    await batiment.destroy();

    res.status(200).json({
      message: "Bâtiment supprimé avec succès",
      status: 200
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du bâtiment:', error);
    res.status(500).json({
      message: "Erreur lors de la suppression du bâtiment",
      status: 500,
      error: error.message
    });
  }
});

module.exports = router;


