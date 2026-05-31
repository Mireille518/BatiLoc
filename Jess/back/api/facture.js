const express = require("express");
const router = express.Router();
const sequelize = require("../connection/db");
const { DataTypes, Op } = require("sequelize");
const { requireRole } = require("../middleware/auth");
const madagascarDate = require("../utils/madagascarDate");

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

    // Recherche - Recherche dans N° FACTURE, CONVENTION et PÉRIODE
    if (q) {
      const searchConditions = [];
      const qTrimmed = q.trim();
      const isNumeric = !isNaN(qTrimmed) && qTrimmed !== '';
      
      // Recherche par N° FACTURE (numFact) et CONVENTION (numConv) si c'est un nombre
      if (isNumeric) {
        const num = Number(qTrimmed);
        searchConditions.push({ numFact: num });
        searchConditions.push({ numConv: num });
      }
      
      // Recherche par PÉRIODE (mois)
      // Format YYYY-MM ou YYYY-MM-DD
      if (qTrimmed.match(/^\d{4}-\d{2}(-\d{2})?$/)) {
        const dateStr = qTrimmed.length === 7 ? `${qTrimmed}-01` : qTrimmed;
        searchConditions.push({ mois: dateStr });
      }
      // Format MM/YYYY ou MM-YYYY
      else if (qTrimmed.match(/^\d{1,2}[\/\-]\d{4}$/)) {
        const [month, year] = qTrimmed.split(/[\/\-]/);
        const dateStr = `${year}-${month.padStart(2, '0')}-01`;
        searchConditions.push({ mois: dateStr });
      }
      // Recherche partielle dans le mois (année ou mois)
      else if (isNumeric) {
        const num = Number(qTrimmed);
        // Si c'est un nombre à 4 chiffres (année), chercher dans l'année
        if (num >= 2000 && num <= 2100) {
          searchConditions.push({ mois: { [Op.like]: `${num}-%` } });
        }
        // Si c'est un nombre à 1-2 chiffres (mois), chercher dans le mois
        else if (num >= 1 && num <= 12) {
          searchConditions.push({ mois: { [Op.like]: `%-${num.toString().padStart(2, '0')}-%` } });
        }
      }
      
      // Recherche dans libelles (conservée pour compatibilité)
      searchConditions.push({ libelles: { [Op.like]: `%${q}%` } });
      
      where[Op.or] = searchConditions;
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

// IMPORTANT: Les routes spécifiques doivent être définies AVANT les routes avec paramètres
// GET - Obtenir les changements de statut récents avec détails
router.get("/status-changes", requireRole('opérateur de saisie', 'redacteur', 'caissier', 'administrateur'), async (req, res) => {
  try {
    const madagascarDate = require("../utils/madagascarDate");
    const currentYear = madagascarDate.getMadagascarYear();
    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentMonthYear = madagascarDate.getMadagascarMonthYear();
    
    // Récupérer toutes les conventions
    const conventions = await Convention.findAll({
      order: [['numConv', 'ASC']]
    });
    
    const changes = [];
    
    for (const convention of conventions) {
      // Récupérer la dernière facture payée
      const lastPaidFacture = await Facture.findOne({
        where: {
          numConv: convention.numConv,
          statutPaiement: true
        },
        order: [['mois', 'DESC']]
      });
      
      let statusInfo = {
        numConv: convention.numConv,
        currentStatus: convention.statutConv ? 'Confirmé' : 'En attente',
        expectedStatus: null,
        lastPaymentMonth: null,
        currentMonth: currentMonthYear,
        needsUpdate: false,
        reason: ''
      };
      
      if (!lastPaidFacture) {
        statusInfo.expectedStatus = 'En attente';
        statusInfo.needsUpdate = convention.statutConv === true;
        statusInfo.reason = 'Aucun paiement trouvé';
      } else {
        const factureMois = new Date(lastPaidFacture.mois);
        const factureYear = factureMois.getFullYear();
        const factureMonth = factureMois.getMonth() + 1;
        const factureMonthYear = `${factureYear}-${String(factureMonth).padStart(2, '0')}`;
        
        statusInfo.lastPaymentMonth = factureMonthYear;
        
        // Comparer avec le mois/année actuel (gère le changement d'année)
        // Exemple: Décembre 2024 vs Janvier 2025 → En attente (année différente)
        const isCurrentMonthPaid = (factureYear === currentYear && factureMonth === currentMonth);
        
        if (isCurrentMonthPaid) {
          statusInfo.expectedStatus = 'Confirmé';
          statusInfo.needsUpdate = convention.statutConv === false;
          statusInfo.reason = `Paiement du mois actuel (${currentMonthYear}) trouvé`;
        } else {
          statusInfo.expectedStatus = 'En attente';
          statusInfo.needsUpdate = convention.statutConv === true;
          statusInfo.reason = `Dernier paiement: ${factureMonthYear} ≠ mois actuel (${currentMonthYear})`;
        }
      }
      
      // Récupérer les informations du locataire et du bâtiment
      const [locataire, batiment] = await Promise.all([
        Locataire.findByPk(convention.codeCli),
        Mbatiment.findByPk(convention.numBat)
      ]);
      
      statusInfo.locataire = locataire ? {
        nomcli: locataire.nomcli,
        codeCli: locataire.codeCli
      } : null;
      
      statusInfo.batiment = batiment ? {
        adresse: batiment.adresse,
        numBat: batiment.numBat
      } : null;
      
      changes.push(statusInfo);
    }
    
    // Filtrer pour ne montrer que ceux qui ont besoin d'être mis à jour
    const needsUpdate = changes.filter(c => c.needsUpdate);
    const allGood = changes.filter(c => !c.needsUpdate);
    
    console.log(`📊 Statuts récupérés: ${changes.length} total, ${needsUpdate.length} à mettre à jour, ${allGood.length} OK`);
    
    res.status(200).json({
      status: 200,
      message: "Changements de statut récupérés",
      data: {
        currentMonth: currentMonthYear,
        total: changes.length,
        needsUpdate: needsUpdate.length,
        allGood: allGood.length,
        changes: changes,
        summary: {
          toConfirm: needsUpdate.filter(c => c.expectedStatus === 'Confirmé').length,
          toPending: needsUpdate.filter(c => c.expectedStatus === 'En attente').length
        }
      }
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des changements de statut:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

// GET - Route pour déclencher manuellement la vérification des statuts
router.get("/check-statuses", requireRole('opérateur de saisie', 'redacteur', 'caissier', 'administrateur'), async (req, res) => {
  try {
    const result = await checkAndUpdateConventionStatuses();
    res.status(200).json({
      status: 200,
      message: "Vérification des statuts terminée",
      data: result
    });
  } catch (err) {
    console.error("Erreur lors de la vérification des statuts:", err);
    res.status(500).json({
      status: 500,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

// GET - Statistiques des factures (doit être avant /:numFact)
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

// GET - Détails d'une facture (route avec paramètre - doit être en dernier)
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
          exercice: madagascarDate.getMadagascarDate(),
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
// ⚠️ IMPORTANT :
// - Cette route met maintenant à jour le statut de la convention en utilisant
//   EXACTEMENT la même logique que checkAndUpdateConventionStatuses :
//   -> On regarde le DERNIER paiement (facture payée la plus récente)
//   -> On compare son mois/année avec le mois/année ACTUEL Madagascar (UTC+3)
//   -> Si paiement du mois actuel => statutConv = true (Confirmé)
//   -> Sinon ou aucun paiement => statutConv = false (En attente)
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
    // en recalculant le dernier paiement avec la MÊME logique que le moteur mensuel
    const convention = await Convention.findByPk(facture.numConv, { transaction: t });
    
    if (convention && statutPaiement !== undefined) {
      // Récupérer la dernière facture PAYÉE pour cette convention
      const lastPaidFacture = await Facture.findOne({
        where: {
          numConv: convention.numConv,
          statutPaiement: true
        },
        order: [['mois', 'DESC']],
        transaction: t
      });

      // Valeur actuelle du statut
      const previousStatutConv = !!convention.statutConv;

      let shouldBeConfirmed = false;

      if (lastPaidFacture) {
        // Date de la dernière facture payée
        const factureMois = new Date(lastPaidFacture.mois);
        const factureYear = factureMois.getFullYear();
        const factureMonth = factureMois.getMonth() + 1;

        // Date actuelle Madagascar (UTC+3)
        const currentYear = madagascarDate.getMadagascarYear();
        const currentMonth = madagascarDate.getMadagascarMonth();

        // Même logique que partout ailleurs dans le projet :
        // isCurrentMonthPaid = (factureYear === currentYear && factureMonth === currentMonth);
        // -> Gère automatiquement le changement d'année (décembre -> janvier, etc.)
        const isCurrentMonthPaid = (factureYear === currentYear && factureMonth === currentMonth);
        shouldBeConfirmed = isCurrentMonthPaid;

        console.log(
          `🔁 Recalcul statut convention ${convention.numConv} après paiement : ` +
          `dernier paiement ${factureYear}-${String(factureMonth).padStart(2, '0')} | ` +
          `mois actuel ${currentYear}-${String(currentMonth).padStart(2, '0')} | ` +
          `isCurrentMonthPaid=${isCurrentMonthPaid}`
        );
      } else {
        // Aucun paiement trouvé -> En attente
        shouldBeConfirmed = false;
        console.log(
          `🔁 Recalcul statut convention ${convention.numConv} après paiement : ` +
          `aucun paiement trouvé -> shouldBeConfirmed = false (En attente)`
        );
      }

      if (previousStatutConv !== shouldBeConfirmed) {
        await convention.update({ statutConv: shouldBeConfirmed }, { transaction: t });
        console.log(
          `✅ Statut de la convention ${convention.numConv} mis à jour (via PUT /factures): ` +
          `${previousStatutConv ? 'Confirmé' : 'En attente'} -> ${shouldBeConfirmed ? 'Confirmé' : 'En attente'}`
        );
      } else {
        console.log(
          `ℹ️ Statut de la convention ${convention.numConv} inchangé (via PUT /factures) : ` +
          `${previousStatutConv ? 'Confirmé' : 'En attente'}`
        );
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

// DELETE - Supprimer TOUTES les factures (réinitialisation complète)
// ⚠️ DANGEREUX : réservé à l'administrateur, par exemple pour remettre la
//     base à zéro avant une nouvelle démonstration.
router.delete("/all", requireRole('administrateur'), async (req, res) => {
  try {
    const deletedCount = await Facture.destroy({
      where: {}
    });

    console.log(`🗑️ Suppression de ${deletedCount} facture(s) (factures + paiements)`);

    return res.status(200).json({
      status: 200,
      message: `Toutes les factures ont été supprimées (${deletedCount} enregistrements).`,
      deleted: deletedCount
    });
  } catch (err) {
    console.error("Erreur DELETE toutes les factures:", err);
    return res.status(500).json({
      status: 500,
      message: "Erreur serveur lors de la suppression de toutes les factures",
      error: err.message
    });
  }
});

// Fonction pour vérifier et mettre à jour automatiquement les statuts des conventions
// en fonction du dernier paiement mensuel
// Utilise la date Madagascar (UTC+3) pour toutes les comparaisons
async function checkAndUpdateConventionStatuses() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Début de la vérification automatique des statuts des conventions...');
    
    // Obtenir la date actuelle en heure Madagascar (UTC+3)
    const currentYear = madagascarDate.getMadagascarYear();
    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentMonthYear = madagascarDate.getMadagascarMonthYear();
    
    console.log(`📅 Mois/année actuel (Madagascar UTC+3): ${currentMonthYear}`);
    
    // Récupérer toutes les conventions avec un verrou pour éviter les conflits
    const conventions = await Convention.findAll({
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    console.log(`📋 Nombre de conventions à vérifier: ${conventions.length}`);
    
    let updatedCount = 0;
    let checkedCount = 0;
    const updatedConventions = [];
    
    // Pour chaque convention, vérifier le dernier paiement
    for (const convention of conventions) {
      checkedCount++;
      
      // Recharger la convention pour avoir les dernières données
      await convention.reload({ transaction });
      
      // Trouver la dernière facture payée pour cette convention
      const lastPaidFacture = await Facture.findOne({
        where: {
          numConv: convention.numConv,
          statutPaiement: true
        },
        order: [['mois', 'DESC']],
        transaction
      });
      
      // Si aucune facture payée n'existe, mettre le statut à "en attente"
      if (!lastPaidFacture) {
        if (convention.statutConv === true) {
          await convention.update({ statutConv: false }, { transaction });
          console.log(
            `  ⚠️ Convention ${convention.numConv}: Aucun paiement trouvé → Statut mis à "En attente"`
          );
          updatedCount++;
          updatedConventions.push(convention.numConv);
        }
        continue;
      }
      
      // Extraire le mois/année de la dernière facture payée
      const factureMois = new Date(lastPaidFacture.mois);
      const factureYear = factureMois.getFullYear();
      const factureMonth = factureMois.getMonth() + 1;
      
      // Comparer avec le mois/année actuel en heure Madagascar (comparaison mois/année uniquement)
      // Gère correctement le changement d'année :
      // - Exemple 1: Décembre 2024 vs Janvier 2025 → En attente (année différente)
      // - Exemple 2: Novembre 2024 vs Décembre 2024 → En attente (mois différent, même année)
      // - Exemple 3: Décembre 2024 vs Décembre 2024 → Confirmé (même mois/année)
      const isCurrentMonthPaid = (factureYear === currentYear && factureMonth === currentMonth);
      
      // Si le paiement du mois courant n'existe pas, mettre le statut à "en attente"
      if (!isCurrentMonthPaid) {
        if (convention.statutConv === true) {
          await convention.update({ statutConv: false }, { transaction });
          console.log(
            `  ⚠️ Convention ${convention.numConv}: Dernier paiement ${factureYear}-${String(factureMonth).padStart(2, '0')} ` +
            `≠ mois actuel (${currentMonthYear}) → Statut mis à "En attente"`
          );
          updatedCount++;
          updatedConventions.push(convention.numConv);
        }
      } else {
        // Si le paiement du mois courant existe, s'assurer que le statut est "Confirmé"
        if (convention.statutConv === false) {
          await convention.update({ statutConv: true }, { transaction });
          console.log(
            `  ✅ Convention ${convention.numConv}: Paiement du mois actuel (${currentMonthYear}) trouvé → Statut mis à "Confirmé"`
          );
          updatedCount++;
          updatedConventions.push(convention.numConv);
        }
      }
    }
    
    // Commit de la transaction pour sauvegarder tous les changements
    await transaction.commit();
    console.log(`💾 Transaction commitée: ${updatedCount} statut(s) sauvegardé(s) en base de données`);
    
    console.log(
      `✅ Vérification terminée: ${checkedCount} conventions vérifiées, ${updatedCount} statuts mis à jour`
    );
    
    return {
      success: true,
      checked: checkedCount,
      updated: updatedCount,
      currentMonth: currentMonthYear,
      message: updatedCount > 0 
        ? `${updatedCount} statut(s) mis à jour avec succès`
        : `Tous les statuts sont déjà à jour (${checkedCount} convention(s) vérifiée(s))`
    };
  } catch (err) {
    console.error('❌ Erreur lors de la vérification automatique des statuts:', err);
    throw err;
  }
}

// Les routes /status-changes et /check-statuses sont déjà définies plus haut (avant /:numFact)
// Pas besoin de les redéfinir ici

module.exports = router;
module.exports.checkAndUpdateConventionStatuses = checkAndUpdateConventionStatuses;
