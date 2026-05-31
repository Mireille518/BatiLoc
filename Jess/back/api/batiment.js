const express = require("express");
const router = express.Router();
const sequelize = require("../connection/db");
const { Op } = require("sequelize");
const MbatimentModel = require("../models/mbatiment")(sequelize, require("sequelize").DataTypes);
const Convention = require("../models/convention")(sequelize, require("sequelize").DataTypes);
const multer = require("multer");
const path = require("path");
const { validateBatiment } = require("../middleware/validator");

const sanitizeStringField = (value, maxLength) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.substring(0, maxLength);
};

const parseCoordinateField = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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
    const { q, statut, available } = req.query;

    const where = {};
    if (statut !== undefined) {
      where.statut = statut === 'true' || statut === true;
    }
    // Recherche - Recherche dans N° Bâtiment, Adresse et Montant
    if (q) {
      const qTrimmed = q.trim();
      const isNumeric = !isNaN(qTrimmed) && qTrimmed !== '';
      const searchConditions = [];
      
      // Recherche par N° Bâtiment (numBat)
      if (isNumeric) {
        searchConditions.push({ numBat: Number(qTrimmed) });
      }
      
      // Recherche par Adresse
      searchConditions.push({ adresse: { [Op.like]: `%${qTrimmed}%` } });
      
      // Recherche par Montant (si c'est un nombre qui pourrait être un montant)
      if (isNumeric) {
        const num = Number(qTrimmed);
        // Si c'est un nombre qui pourrait être un montant (entre 1000 et 10000000)
        if (num >= 1000 && num <= 10000000) {
          searchConditions.push({ montant: num });
        }
      }
      
      where[Op.or] = searchConditions;
    }

    // Si le paramètre "available" est présent, filtrer les bâtiments déjà utilisés ET les bâtiments inactifs
    if (available === 'true' || available === true) {
      try {
        // Exclusion 1: Récupérer tous les numBat qui ont déjà une convention (peu importe le statut)
        const conventions = await Convention.findAll({
          attributes: ['numBat'],
          raw: true
        });
        
        console.log(`🔍 Recherche de bâtiments disponibles: ${conventions.length} convention(s) trouvée(s)`);
        
        // Extraire les numBat uniques qui ont déjà des conventions
        const excludedBatIds = [...new Set(conventions
          .map(c => c.numBat)
          .filter(numBat => numBat != null && numBat !== undefined)
        )];
        
        console.log(`🚫 Bâtiments exclus (déjà utilisés): ${excludedBatIds.length} - [${excludedBatIds.join(', ')}]`);
        
        // Exclusion 2: Les bâtiments inactifs (statut = false) ne doivent pas être allouables
        // Construire les conditions d'exclusion
        const exclusionConditions = [];
        
        // Exclure les bâtiments déjà utilisés
        if (excludedBatIds.length > 0) {
          exclusionConditions.push({ numBat: { [Op.notIn]: excludedBatIds } });
        }
        
        // Exclure les bâtiments inactifs (statut = false)
        exclusionConditions.push({ statut: true });
        
        // Combiner toutes les conditions d'exclusion
        if (exclusionConditions.length > 0) {
          // Si where contient déjà des conditions, les combiner avec Op.and
          if (Object.keys(where).length > 0) {
            const existingConditions = [];
            
            // Ajouter les conditions existantes (statut, Op.or, etc.)
            Object.keys(where).forEach(key => {
              if (key === Op.and) {
                existingConditions.push(...where[Op.and]);
              } else if (key === Op.or) {
                existingConditions.push({ [Op.or]: where[Op.or] });
              } else {
                existingConditions.push({ [key]: where[key] });
              }
            });
            
            // Ajouter toutes les conditions d'exclusion
            existingConditions.push(...exclusionConditions);
            
            // Réinitialiser where avec Op.and
            Object.keys(where).forEach(key => delete where[key]);
            where[Op.and] = existingConditions;
          } else {
            // Pas de conditions existantes, utiliser Op.and pour toutes les exclusions
            where[Op.and] = exclusionConditions;
          }
          console.log(`✅ Filtrage appliqué: exclus ${excludedBatIds.length} bâtiment(s) utilisés + tous les bâtiments inactifs`);
        } else {
          console.log('✅ Aucun bâtiment exclu - tous les bâtiments sont disponibles');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification des bâtiments utilisés:', error);
        // En cas d'erreur, ne pas filtrer pour éviter de bloquer la requête
      }
    }

    // Récupérer les bâtiments
    // Utiliser raw: false pour éviter les problèmes avec les colonnes qui n'existent pas encore
    let result;
    try {
      result = await MbatimentModel.findAndCountAll({
        where,
        limit,
        offset,
        order: [['numBat', 'DESC']],
        raw: false
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des bâtiments:', error);
      throw error;
    }
    const { count, rows } = result;
    
    // Récupérer tous les numBat qui ont des conventions actives (statutConv = true)
    const conventionsActives = await Convention.findAll({
      where: {
        statutConv: true
      },
      attributes: ['numBat'],
      raw: true
    });
    
    const batimentsAlloues = new Set(conventionsActives.map(c => c.numBat));
    
    // Convertir les images BLOB en base64 et ajouter le statut d'utilisation
    const batimentsWithImages = rows.map(b => {
      const batiment = b.toJSON();
      if (batiment.image) {
        batiment.image = batiment.image.toString('base64');
      }
      
      // Déterminer le statut d'utilisation
      // Si le bâtiment est inactif, il ne peut pas être libre ni alloué
      if (!batiment.statut) {
        batiment.statutUtilisation = 'indisponible';
        batiment.estLibre = false;
        batiment.estAlloue = false;
        batiment.estIndisponible = true;
      } else {
        // Si le bâtiment est actif, vérifier s'il est alloué
        const estAlloue = batimentsAlloues.has(batiment.numBat);
        batiment.statutUtilisation = estAlloue ? 'alloué' : 'libre';
        batiment.estLibre = !estAlloue;
        batiment.estAlloue = estAlloue;
        batiment.estIndisponible = false;
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
    const { numBat, adresse, montant, statut, ville, quartier, latitude, longitude, superficie } = req.body;
    const villeValue = sanitizeStringField(ville, 60);
    const quartierValue = sanitizeStringField(quartier, 60);
    const latitudeValue = parseCoordinateField(latitude);
    const longitudeValue = parseCoordinateField(longitude);
    const superficieValue = superficie !== undefined ? parseFloat(superficie) : null;

    // Validation des champs
    if (!numBat || !adresse || !montant) {
      return res.status(400).json({
        message: "Veuillez remplir tous les champs obligatoires (numBat, adresse, montant)",
        status: 400
      });
    }
    
    // Validation du statut
    const statutValue = statut !== undefined ? (statut === 'true' || statut === true || statut === 1) : true;

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
      ville: villeValue,
      quartier: quartierValue,
      latitude: latitudeValue,
      longitude: longitudeValue,
      superficie: superficieValue,
      montant: parseFloat(montant),
      statut: statutValue
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
    const { adresse, montant, statut, ville, quartier, latitude, longitude, superficie } = req.body;

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
    
    // Gérer le statut et le motif d'inactivité
    if (statut !== undefined) {
      const newStatutValue = (statut === 'true' || statut === true || statut === 1);
      updateData.statut = newStatutValue;
    }
    
    if (ville !== undefined) {
      updateData.ville = sanitizeStringField(ville, 60);
    }
    if (quartier !== undefined) {
      updateData.quartier = sanitizeStringField(quartier, 60);
    }
    if (latitude !== undefined) {
      updateData.latitude = parseCoordinateField(latitude);
    }
    if (longitude !== undefined) {
      updateData.longitude = parseCoordinateField(longitude);
    }
    if (superficie !== undefined) {
      const superficieValue = parseFloat(superficie);
      updateData.superficie = Number.isFinite(superficieValue) ? superficieValue : null;
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

// GET - Endpoint de diagnostic pour vérifier les bâtiments utilisés
router.get("/diagnostic/usage", async (req, res) => {
  try {
    // Récupérer tous les bâtiments
    const allBatiments = await MbatimentModel.findAll({
      attributes: ['numBat', 'adresse', 'montant', 'statut'],
      order: [['numBat', 'ASC']],
      raw: true
    });

    // Récupérer toutes les conventions avec les numBat utilisés
    const conventions = await Convention.findAll({
      attributes: ['numConv', 'numBat', 'codeCli', 'statutConv', 'dateConv'],
      raw: true
    });

    console.log(`📊 Diagnostic: ${allBatiments.length} bâtiment(s) total, ${conventions.length} convention(s) trouvée(s)`);

    // Créer des maps pour faciliter l'accès
    const batimentsMap = new Map();
    allBatiments.forEach(b => {
      batimentsMap.set(b.numBat, {
        numBat: b.numBat,
        adresse: b.adresse,
        montant: b.montant,
        statut: b.statut,
        utilisations: []
      });
    });

    // Associer les conventions aux bâtiments
    conventions.forEach(conv => {
      const batData = batimentsMap.get(conv.numBat);
      if (batData) {
        batData.utilisations.push({
          numConv: conv.numConv,
          codeCli: conv.codeCli,
          statutConv: conv.statutConv,
          dateConv: conv.dateConv
        });
      }
    });

    // Séparer les bâtiments utilisés et disponibles
    const batimentsUtilises = [];
    const batimentsDisponibles = [];

    batimentsMap.forEach((bat, numBat) => {
      if (bat.utilisations.length > 0) {
        batimentsUtilises.push(bat);
      } else {
        batimentsDisponibles.push({
          numBat: bat.numBat,
          adresse: bat.adresse,
          montant: bat.montant,
          statut: bat.statut
        });
      }
    });

    // Extraire la liste des numBat exclus
    const listeBatimentsExclus = batimentsUtilises.map(b => b.numBat).sort((a, b) => a - b);

    // Statistiques
    const stats = {
      total: allBatiments.length,
      utilises: batimentsUtilises.length,
      disponibles: batimentsDisponibles.length,
      tauxUtilisation: allBatiments.length > 0 
        ? ((batimentsUtilises.length / allBatiments.length) * 100).toFixed(2) + '%'
        : '0%'
    };

    console.log(`✅ Diagnostic terminé: ${stats.utilises} utilisé(s), ${stats.disponibles} disponible(s)`);
    console.log(`🚫 Bâtiments exclus: [${listeBatimentsExclus.join(', ')}]`);

    res.status(200).json({
      message: "Diagnostic des bâtiments récupéré avec succès",
      status: 200,
      stats,
      batimentsUtilises: batimentsUtilises.sort((a, b) => a.numBat - b.numBat),
      batimentsDisponibles: batimentsDisponibles.sort((a, b) => a.numBat - b.numBat),
      listeBatimentsExclus
    });
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic des bâtiments:', error);
    res.status(500).json({
      message: "Erreur lors du diagnostic des bâtiments",
      status: 500,
      error: error.message
    });
  }
});

// DELETE - Supprimer un bâtiment
router.delete("/:numBat", async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { numBat } = req.params;
    const { motif } = req.body; // Motif de suppression (obligatoire pour CAS 2 et 3)

    // Vérifier si le bâtiment existe
    const batiment = await MbatimentModel.findByPk(numBat, { transaction });
    if (!batiment) {
      await transaction.rollback();
      return res.status(404).json({
        message: "Bâtiment non trouvé",
        status: 404
      });
    }

    // Récupérer toutes les conventions liées à ce bâtiment
    const conventions = await Convention.findAll({
      where: { numBat: parseInt(numBat) },
      transaction
    });

    // CAS 1 : Le bâtiment a une convention EN COURS (statutConv = true)
    const conventionsEnCours = conventions.filter(conv => conv.statutConv === true);
    
    if (conventionsEnCours.length > 0) {
      // La suppression est interdite
      await transaction.rollback();
      
      // Créer une notification (on peut la logger pour l'instant)
      const notification = {
        type: 'suppression_batiment_bloquee',
        numBat: parseInt(numBat),
        message: `Suppression du bâtiment ${numBat} bloquée : bâtiment encore loué par un client`,
        date: new Date().toISOString(),
        conventionsActives: conventionsEnCours.map(c => c.numConv)
      };
      console.log('📢 Notification créée:', JSON.stringify(notification, null, 2));
      
      return res.status(409).json({
        message: "Impossible de supprimer : ce bâtiment est encore loué par un client.",
        status: 409,
        details: {
          numBat: parseInt(numBat),
          nombreConventionsActives: conventionsEnCours.length,
          conventionsActives: conventionsEnCours.map(c => c.numConv),
          notification: "Une notification a été créée pour informer qu'il faudra attendre la fin du contrat."
        }
      });
    }

    // CAS 2 et 3 : Le bâtiment n'a pas de convention en cours
    // Vérifier si un motif est fourni (obligatoire pour CAS 2 et 3)
    if (!motif || motif.trim() === '') {
      await transaction.rollback();
      return res.status(400).json({
        message: "Un motif de suppression est obligatoire",
        status: 400,
        details: {
          numBat: parseInt(numBat),
          aDesConventionsTerminees: conventions.length > 0
        }
      });
    }

    // CAS 2 : Le bâtiment avait une convention, mais elle est terminée
    // CAS 3 : Le bâtiment n'a jamais eu de convention
    // Dans les deux cas, on peut supprimer (le motif a été fourni)

    // Si le bâtiment a des conventions terminées, les supprimer aussi
    if (conventions.length > 0) {
      console.log(`🗑️ Suppression de ${conventions.length} convention(s) terminée(s) liée(s) au bâtiment ${numBat}`);
      console.log(`📝 Motif de suppression: ${motif}`);
      
      // Supprimer toutes les conventions liées à ce bâtiment
      // (Les factures seront supprimées automatiquement via CASCADE)
      for (const convention of conventions) {
        await convention.destroy({ transaction });
        console.log(`✅ Convention #${convention.numConv} supprimée`);
      }
    } else {
      console.log(`🗑️ Suppression du bâtiment ${numBat} (jamais eu de convention)`);
      console.log(`📝 Motif de suppression: ${motif}`);
    }

    // Supprimer le bâtiment
    await batiment.destroy({ transaction });

    // Commit de la transaction
    await transaction.commit();

    const message = conventions.length > 0
      ? `Bâtiment et ${conventions.length} convention(s) terminée(s) supprimé(s) avec succès`
      : "Bâtiment supprimé avec succès";

    res.status(200).json({
      message: message,
      status: 200,
      details: {
        numBat: parseInt(numBat),
        motif: motif,
        conventionsSupprimees: conventions.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la suppression du bâtiment:', error);
    res.status(500).json({
      message: "Erreur lors de la suppression du bâtiment",
      status: 500,
      error: error.message
    });
  }
});

module.exports = router;


