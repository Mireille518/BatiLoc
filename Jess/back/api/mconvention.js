const express = require("express");
const router = express.Router();
const sequelize = require("../connection/db");
const { DataTypes, Op } = require("sequelize");
const madagascarDate = require("../utils/madagascarDate");

// Models
const Convention = require("../models/convention")(sequelize, DataTypes);
const Mbatiment = require("../models/mbatiment")(sequelize, DataTypes);
const Locataire = require("../models/locataire")(sequelize, DataTypes);
const Facture = require("../models/facture")(sequelize, DataTypes);

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

    // Recherche - Recherche dans N° Convention, Client, Date et Montant
    if (q) {
      const qTrimmed = q.trim();
      const isNumeric = !isNaN(qTrimmed) && qTrimmed !== '';
      
      // Recherche par N° Convention (numConv)
      if (isNumeric) {
        where.numConv = Number(qTrimmed);
        batWhere.numBat = Number(qTrimmed);
      }
      
      // Recherche par Client (nomcli, cin)
      locWhere[Op.or] = [
        { nomcli: { [Op.like]: `%${qTrimmed}%` } },
        { cin: { [Op.like]: `%${qTrimmed}%` } }
      ];
      
      // Recherche par Date (dateConv)
      // Format YYYY-MM-DD ou YYYY-MM
      if (qTrimmed.match(/^\d{4}-\d{2}(-\d{2})?$/)) {
        where.dateConv = { [Op.like]: `${qTrimmed.substring(0, 7)}%` };
      }
      // Format DD/MM/YYYY ou MM/YYYY
      else if (qTrimmed.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{4}$/)) {
        const parts = qTrimmed.split(/[\/\-]/);
        if (parts.length === 3) {
          const [day, month, year] = parts;
          where.dateConv = { [Op.like]: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}%` };
        } else if (parts.length === 2) {
          const [month, year] = parts;
          where.dateConv = { [Op.like]: `${year}-${month.padStart(2, '0')}%` };
        }
      }
      // Recherche par année seule
      else if (isNumeric) {
        const num = Number(qTrimmed);
        if (num >= 2000 && num <= 2100) {
          where.dateConv = { [Op.like]: `${num}%` };
        }
      }
      
      // Recherche par Montant (via batiment.montant)
      // Si c'est un nombre qui pourrait être un montant, filtrer d'abord les bâtiments
      if (isNumeric) {
        const num = Number(qTrimmed);
        // Si c'est un nombre qui pourrait être un montant (entre 1000 et 10000000)
        if (num >= 1000 && num <= 10000000) {
          const batsByMontant = await Mbatiment.findAll({ 
            where: { montant: num },
            attributes: ['numBat']
          });
          const numBatsByMontant = batsByMontant.map(b => b.numBat);
          // Filtrer les conventions par ces bâtiments
          if (numBatsByMontant.length > 0) {
            where.numBat = { [Op.in]: numBatsByMontant };
          } else {
            // Aucun bâtiment trouvé avec ce montant, retourner vide
            return res.status(200).json({ 
              status: 200, 
              message: "Conventions récupérées", 
              data: [],
              pagination: {
                page,
                limit,
                total: 0,
                pages: 0
              }
            });
          }
        }
      }
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

    // NOTE: Le recalcul automatique des statuts a été désactivé pour permettre la démonstration
    // Les statuts sont maintenant mis à jour uniquement via :
    // 1. Le bouton "Mettre à jour les statuts" dans le menu "Changements de statut"
    // 2. La fonction automatique checkAndUpdateConventionStatuses() (au démarrage et toutes les heures)
    // 
    // Cela permet de garder les statuts "Confirmé" (incorrect) créés pour la démonstration
    // jusqu'à ce que l'utilisateur clique explicitement sur "Mettre à jour les statuts"
    
    // Ancien code de recalcul automatique (désactivé) :
    // const numConvs = rows.map(r => r.numConv);
    // if (numConvs.length > 0) {
    //   const madagascarDate = require("../utils/madagascarDate");
    //   const currentYear = madagascarDate.getMadagascarYear();
    //   const currentMonth = madagascarDate.getMadagascarMonth();
    //   
    //   await Promise.all(rows.map(async (conv) => {
    //     const lastPaidFacture = await Facture.findOne({
    //       where: {
    //         numConv: conv.numConv,
    //         statutPaiement: true
    //       },
    //       order: [['mois', 'DESC']]
    //     });
    //     
    //     let shouldBeConfirmed = false;
    //     
    //     if (lastPaidFacture) {
    //       const factureMois = new Date(lastPaidFacture.mois);
    //       const factureYear = factureMois.getFullYear();
    //       const factureMonth = factureMois.getMonth() + 1;
    //       shouldBeConfirmed = (factureYear === currentYear && factureMonth === currentMonth);
    //     }
    //     
    //     if (conv.statutConv !== shouldBeConfirmed) {
    //       await conv.update({ statutConv: shouldBeConfirmed });
    //       conv.statutConv = shouldBeConfirmed;
    //     }
    //   }));
    // }

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
      // S'assurer que le champ contact existe (peut être undefined si la colonne n'existe pas encore)
      const contact = conv.contact || null;
      const batiment = batimentsById.get(conv.numBat);
      
      return {
        ...conv,
        contact: contact,
        batiment: batiment ? {
          ...batiment,
          // S'assurer que ville et quartier sont bien présents
          ville: batiment.ville || null,
          quartier: batiment.quartier || null
        } : null,
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

// GET - Conventions disponibles pour création de facture
// Retourne uniquement les conventions "En attente" (statutConv = false) qui n'ont pas encore de facture
router.get("/available-for-invoice", async (req, res) => {
  try {
    // Récupérer toutes les conventions "En attente" (statutConv = false)
    // Ces conventions sont en retard et doivent recevoir une nouvelle facture
    const conventions = await Convention.findAll({
      where: {
        statutConv: false // Seulement "En attente"
      },
      order: [["numConv", "DESC"]]
    });

    // Si aucune convention en attente, retourner tout de suite
    if (conventions.length === 0) {
      return res.status(200).json({
        status: 200,
        message: "Aucune convention en attente disponible pour création de facture",
        data: []
      });
    }

    // On ne doit PAS exclure une convention juste parce qu'elle a déjà
    // une facture ancienne. On veut seulement éviter de dupliquer la
    // facture du MOIS ACTUEL.
    //
    // → On cherche donc uniquement les factures du mois actuel Madagascar (UTC+3)
    //    pour ces conventions.
    const currentYear = madagascarDate.getMadagascarYear();
    const currentMonth = madagascarDate.getMadagascarMonth();
    const currentMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const currentMonthStr = currentMonthDate.toISOString().split('T')[0]; // YYYY-MM-01

    // Récupérer les factures du mois actuel pour ces conventions
    const numConvs = conventions.map(c => c.numConv);
    const facturesMoisActuel = await Facture.findAll({
      where: { 
        numConv: { [Op.in]: numConvs },
        mois: currentMonthStr
      },
      attributes: ['numConv']
    });

    // Créer un Set des numConvs qui ont DÉJÀ une facture pour le mois actuel
    const conventionsAvecFactureMoisActuel = new Set(facturesMoisActuel.map(f => f.numConv));

    // Filtrer les conventions qui n'ont PAS encore de facture pour le mois actuel
    const conventionsDisponibles = conventions.filter(
      c => !conventionsAvecFactureMoisActuel.has(c.numConv)
    );

    // Récupérer les bâtiments et locataires associés
    const numBats = [...new Set(conventionsDisponibles.map(c => c.numBat))];
    const codeClis = [...new Set(conventionsDisponibles.map(c => c.codeCli))];

    const [batiments, locataires] = await Promise.all([
      numBats.length > 0 ? Mbatiment.findAll({ where: { numBat: { [Op.in]: numBats } } }) : Promise.resolve([]),
      codeClis.length > 0 ? Locataire.findAll({ where: { codeCli: { [Op.in]: codeClis } } }) : Promise.resolve([])
    ]);

    const batimentsMap = new Map(batiments.map(b => [b.numBat, b.toJSON()]));
    const locatairesMap = new Map(locataires.map(l => [l.codeCli, l.toJSON()]));

    // Enrichir les conventions avec les données associées
    const data = conventionsDisponibles.map(c => {
      const conv = c.toJSON();
      return {
        ...conv,
        batiment: batimentsMap.get(conv.numBat) || null,
        locataire: locatairesMap.get(conv.codeCli) || null
      };
    });

    res.status(200).json({
      status: 200,
      message: "Conventions disponibles pour création de facture",
      data
    });
  } catch (err) {
    console.error("Erreur GET conventions disponibles:", err);
    res.status(500).json({ 
      status: 500, 
      message: "Erreur serveur", 
      error: err.message 
    });
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
      statutConv, contact
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
    // Utiliser la date Madagascar (UTC+3) pour la date de convention
    const created = await Convention.create({
      lieu: bat.adresse.substring(0, 10),
      dateConv: madagascarDate.getMadagascarCurrentYearDateOnly(),
      statutConv: !!statutConv,
      numBat: bat.numBat,
      codeCli: loc.codeCli,
      numFact: null,
      contact: contact ? String(contact).substring(0, 20) : null
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
  const t = await sequelize.transaction();
  try {
    const { numConv } = req.params;
    const {
      // step 1 - batiment
      numBat, adresse, montant,
      // step 2 - locataire
      nomcli, datenais, lieunais, pere, mere, cin, delivcin, adressecli, activite,
      // optional
      statutConv, contact
    } = req.body;

    const conv = await Convention.findByPk(numConv, { transaction: t });
    if (!conv) {
      await t.rollback();
      return res.status(404).json({ status: 404, message: "Convention non trouvée" });
    }

    // Mettre à jour le bâtiment si les informations sont fournies
    if (numBat !== undefined || adresse !== undefined || montant !== undefined) {
      const batId = numBat || conv.numBat;
      const bat = await Mbatiment.findByPk(batId, { transaction: t });
      
      if (bat) {
        const batUpdates = {};
        if (adresse !== undefined) {
          batUpdates.adresse = String(adresse).substring(0, 20);
        }
        if (montant !== undefined) {
          batUpdates.montant = Number.parseFloat(montant);
        }
        if (Object.keys(batUpdates).length > 0) {
          await bat.update(batUpdates, { transaction: t });
        }
      }
    }

    // Mettre à jour le locataire si les informations sont fournies
    if (nomcli !== undefined || datenais !== undefined || lieunais !== undefined || 
        pere !== undefined || mere !== undefined || cin !== undefined || 
        delivcin !== undefined || adressecli !== undefined || activite !== undefined) {
      
      const loc = await Locataire.findByPk(conv.codeCli, { transaction: t });
      
      if (loc) {
        const locUpdates = {};
        if (nomcli !== undefined) locUpdates.nomcli = nomcli;
        if (datenais !== undefined) locUpdates.datenais = datenais;
        if (lieunais !== undefined) locUpdates.lieunais = lieunais;
        if (pere !== undefined) locUpdates.pere = pere;
        if (mere !== undefined) locUpdates.mere = mere;
        if (cin !== undefined) locUpdates.cin = cin;
        if (delivcin !== undefined) locUpdates.delivcin = delivcin;
        if (adressecli !== undefined) locUpdates.adressecli = adressecli;
        if (activite !== undefined) locUpdates.activite = activite;
        
        if (Object.keys(locUpdates).length > 0) {
          await loc.update(locUpdates, { transaction: t });
        }
      }
    }

    // Mettre à jour la convention elle-même
    const convUpdates = {};
    if (statutConv !== undefined) convUpdates.statutConv = !!statutConv;
    if (contact !== undefined) convUpdates.contact = contact ? String(contact).substring(0, 20) : null;
    if (numBat !== undefined) {
      convUpdates.numBat = Number(numBat);
      // Mettre à jour le lieu si le bâtiment change
      const newBat = await Mbatiment.findByPk(numBat, { transaction: t });
      if (newBat) {
        convUpdates.lieu = newBat.adresse.substring(0, 10);
      }
    }
    
    if (Object.keys(convUpdates).length > 0) {
      await conv.update(convUpdates, { transaction: t });
    }

    await t.commit();
    
    // Récupérer les données mises à jour avec les relations (en dehors de la transaction)
    const updatedConv = await Convention.findByPk(numConv);
    if (!updatedConv) {
      return res.status(404).json({ status: 404, message: "Convention non trouvée après mise à jour" });
    }
    
    const [batiment, locataire] = await Promise.all([
      Mbatiment.findByPk(updatedConv.numBat),
      Locataire.findByPk(updatedConv.codeCli)
    ]);

    const responseData = {
      ...updatedConv.toJSON(),
      batiment: batiment ? batiment.toJSON() : null,
      locataire: locataire ? locataire.toJSON() : null
    };

    console.log('Convention mise à jour:', {
      numConv: responseData.numConv,
      batiment: responseData.batiment?.adresse,
      locataire: responseData.locataire?.nomcli
    });

    res.status(200).json({ 
      status: 200, 
      message: "Convention mise à jour avec succès", 
      data: responseData
    });
  } catch (err) {
    await (t.finished ? Promise.resolve() : t.rollback());
    console.error("Erreur PUT convention:", err);
    res.status(500).json({ status: 500, message: "Erreur serveur", error: err.message });
  }
});

// DELETE cancel convention
router.delete("/:numConv", async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const numConv = parseInt(req.params.numConv);
    if (isNaN(numConv)) {
      if (!t.finished) {
        await t.rollback();
      }
      return res.status(400).json({ status: 400, message: "Numéro de convention invalide" });
    }

    console.log('🗑️ Tentative de suppression de la convention:', numConv);
    
    const conv = await Convention.findByPk(numConv, { transaction: t });
    if (!conv) {
      if (!t.finished) {
        await t.rollback();
      }
      console.log('❌ Convention non trouvée:', numConv);
      return res.status(404).json({ status: 404, message: "Convention non trouvée" });
    }

    // Vérifier si la convention est "en attente" (statutConv = false)
    // Les conventions en attente ne peuvent pas être supprimées
    if (conv.statutConv === false) {
      await t.rollback();
      
      // Créer une notification (on peut la logger pour l'instant)
      const notification = {
        type: 'suppression_convention_bloquee',
        numConv: numConv,
        message: `Suppression de la convention ${numConv} bloquée : convention encore en attente`,
        date: new Date().toISOString()
      };
      console.log('📢 Notification créée:', JSON.stringify(notification, null, 2));
      
      return res.status(409).json({
        message: "Impossible de supprimer : cette convention est encore en attente.",
        status: 409,
        details: {
          numConv: numConv,
          statutConv: false,
          statutLibelle: "En attente",
          notification: "Une notification a été créée pour informer qu'il faut d'abord valider ou rejeter la convention."
        }
      });
    }

    // Charger les modèles
    const Facture = require("../models/facture")(sequelize, DataTypes);
    const Utilisateur = require("../models/utilisateur")(sequelize, DataTypes);
    
    // Compter les factures associées
    const countFactures = await Facture.count({ 
      where: { numConv: numConv },
      transaction: t 
    });
    
    if (countFactures > 0) {
      console.log(`⚠️ Suppression de ${countFactures} facture(s) associée(s) à la convention ${numConv}`);
      
      // Supprimer toutes les factures associées en une seule requête SQL (plus efficace)
      await sequelize.query(
        `DELETE FROM facture WHERE numConv = :numConv`,
        {
          replacements: { numConv: numConv },
          type: sequelize.QueryTypes.DELETE,
          transaction: t
        }
      );
      console.log(`  ✓ ${countFactures} facture(s) supprimée(s)`);
    }

    // Mettre à jour les utilisateurs associés (mettre numConv à null au lieu de supprimer)
    const utilisateursAssocies = await Utilisateur.findAll({ 
      where: { numConv: numConv },
      transaction: t 
    });
    
    if (utilisateursAssocies.length > 0) {
      console.log(`⚠️ Mise à jour de ${utilisateursAssocies.length} utilisateur(s) associé(s) à la convention ${numConv}`);
      
      // Mettre à jour les utilisateurs pour retirer la référence à la convention
      for (const utilisateur of utilisateursAssocies) {
        await utilisateur.update({ numConv: null }, { transaction: t });
        console.log(`  ✓ Utilisateur ${utilisateur.matricule} mis à jour`);
      }
    }

    // Supprimer la convention
    await conv.destroy({ transaction: t });
    
    // Construire le message de réponse avant le commit
    let message = "Convention supprimée avec succès";
    const details = [];
    
    if (countFactures > 0) {
      details.push(`${countFactures} facture(s) supprimée(s)`);
    }
    
    if (utilisateursAssocies.length > 0) {
      details.push(`${utilisateursAssocies.length} utilisateur(s) mis à jour`);
    }
    
    if (details.length > 0) {
      message = `Convention supprimée avec succès (${details.join(', ')})`;
    }
    
    // Valider la transaction
    await t.commit();
    
    console.log('✅ Convention supprimée avec succès:', numConv);
    
    res.status(200).json({ 
      status: 200, 
      message: message,
      facturesSupprimees: countFactures,
      utilisateursMisAJour: utilisateursAssocies.length
    });
  } catch (err) {
    // Vérifier si la transaction est encore active avant de faire le rollback
    if (!t.finished) {
      await t.rollback();
    }
    console.error("❌ Erreur DELETE convention:", err);
    
    // Gérer les erreurs de contrainte de clé étrangère
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        status: 400, 
        message: "Impossible de supprimer la convention car elle est référencée par d'autres données" 
      });
    }
    
    res.status(500).json({ status: 500, message: "Erreur serveur", error: err.message });
  }
});

module.exports = router;



